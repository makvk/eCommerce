# Разбор бэкенда ECommerceStore

Смотрел с позиции «мне писать фронт против этого API». Ниже — что мешало, что сломано
и что стоит поправить. Сначала блокеры, потом важное, потом придирки.

Сразу про хорошее, чтобы был контекст: архитектура выбрана нормальная и выдержана.
Слои Domain / Application / Infrastructure / Api не протекают, зависимости смотрят внутрь,
MediatR + vertical slice по фичам — читается легко, каждую фичу видно целиком в одном файле.
Домен богатый: инварианты живут в сущностях (`Order.AddItem`, `Product.UpdatePrice`),
приватные конструкторы для EF, `Money`/`Address`/`FullName` как value objects через
`ComplexProperty` — это заметно выше среднего уровня учебного проекта. Пароли через BCrypt,
цены `decimal(18,2)`, даты `timestamptz`, `PriceAtPurchase` зафиксирована в заказе — базовые
вещи, на которых обычно горят, сделаны правильно.

Проблемы ниже — это не «всё плохо», а конкретный список того, что отделяет проект от рабочего.

---

## Блокеры

### 1. Баланс невозможно пополнить — заказ нельзя оформить в принципе

`Customer` создаётся с `Balance = Money.Zero()`. Метод `UpToBalance` есть, но наружу
он не выведен: во всём API нет ни одного эндпоинта, который увеличивает баланс.
А `CreateOrder.Handler` требует `amount <= userBalance.Amount`.

Итог: новый пользователь **никогда** не сможет оформить заказ. Основной сценарий магазина
не проходится вообще. Это первое, что надо чинить.

```csharp
// ECommerce.Application/Features/Profile/TopUpBalance.cs
public class TopUpBalance
{
    public record Command(decimal Amount) : IRequest;

    public class CommandValidator : AbstractValidator<Command>
    {
        public CommandValidator() => RuleFor(x => x.Amount).GreaterThan(0);
    }

    public class Handler(IEDbContext db, ICurrentUserService currentUser)
        : IRequestHandler<Command>
    {
        public async Task Handle(Command request, CancellationToken ct)
        {
            if (!Guid.TryParse(currentUser.UserId, out var userId))
                throw new UnauthorizedAccessException();

            var user = await db.Customers.FirstOrDefaultAsync(c => c.Id == userId, ct)
                ?? throw new NotFoundException("Customer not found");

            user.UpToBalance(request.Amount);
            await db.SaveChangesAsync(ct);
        }
    }
}
```

Плюс `[HttpPost("balance")]` в `ProfileController`. Для учебного проекта — просто зачисление,
без платёжки. Фронт под это уже готов: на странице профиля есть блок баланса, кнопка
пополнения встанет туда в одну строку.

### 2. Не настроен CORS — браузер не может обратиться к API

В `Program.cs` нет ни `AddCors`, ни `UseCors`. Любой фронт с другого порта получит
заблокированный запрос ещё до того, как дойдёт до контроллера.

Я обошёл это dev-прокси в `vite.config.ts` (браузер ходит на `localhost:5173`, Vite
проксирует на `5269` — same-origin, CORS не участвует). Для разработки этого достаточно,
но на проде фронт будет на другом домене, и без CORS работать не будет.

```csharp
// DependencyInjection.cs
services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins(configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Program.cs — строго до UseAuthentication
app.UseCors("frontend");
```

`AllowAnyOrigin()` не ставь: с `Authorization`-заголовком браузер его всё равно отклонит.

### 3. Все ошибки домена превращаются в 500

`ExceptionHandlingMiddleware` разбирает только `ValidationException`. Всё остальное падает
в `HandleGenericExceptionAsync` → **500**. То есть:

| Ситуация | Сейчас | Должно быть |
|---|---|---|
| Товар не найден (`NotFoundException`) | 500 | 404 |
| Корзина пуста (`BadRequestException`) | 500 | 400 |
| Не хватает денег | 500 | 400 |
| Неверный пароль | 500 | 401 |
| Email занят | 500 | 409 |

Отдельно про логин: `Login.Handler` кидает голый `throw new Exception("User not found")`.
Голый `Exception` в бизнес-логике — это то, за что бьют по рукам: его нельзя поймать
избирательно, и он неотличим от «база упала».

Фронт из-за этого не может отличить «неверный пароль» от «сервер лёг» по коду ответа —
приходится вытаскивать текст из `details`, а `details` есть только в DEBUG. В релизе
пользователь увидит «Internal server error» вместо «неверный пароль».

```csharp
catch (Exception ex)
{
    var (status, title) = ex switch
    {
        ValidationException          => (400, "Validation failed"),
        BadRequestException          => (400, ex.Message),
        UnauthorizedAccessException  => (401, "Unauthorized"),
        NotFoundException            => (404, ex.Message),
        ConflictException            => (409, ex.Message),
        _                            => (500, "Internal server error occurred.")
    };
    // ... один ProblemDetails на все случаи
}
```

И заведи `InvalidCredentialsException : Exception` вместо голого `Exception` в `Login`.
`ConflictException` у тебя уже объявлен, но не используется нигде — `Register` кидает
`BadRequestException` на занятый email, хотя это ровно 409.

### 4. Админ не может получить список заказов

`GET /api/orders` фильтрует по `CustomerId` текущего пользователя. Эндпоинта «все заказы»
нет. При этом есть три админских перехода статуса (`/processing`, `/shipped`, `/delivered`),
которые принимают `orderId`.

Получается: админ может менять статус заказа, но **не может узнать, какие заказы существуют**.
Админка нерабочая by design. Нужен `GET /api/admin/orders` с фильтром по статусу и пагинацией.

Во фронте я на этом месте оставил честную заглушку: вкладка «Заказы» в админке показывает
только собственные заказы и предупреждение, что эндпоинта нет.

### 5. `ImageUrl` нельзя выставить через API

У `Product` есть поле `ImageUrl`, под него сделана миграция `AddProductImageUrl`.
Но ни `AddProduct.Command`, ни `UpdateProduct.CommandDto` его не принимают, и
`Product.UpdateDetails` его не трогает. Записать туда значение можно только руками в БД.

Итог: у всех товаров `imageUrl = null`. Магазин без картинок. Я нарисовал детерминированные
градиентные плейсхолдеры (по хешу `id`), выглядит прилично — но это костыль вместо фото.

Добавь `string? ImageUrl` в обе команды и в `UpdateDetails`.

---

## Важное

### 6. Каталог без пагинации, поиска и фильтров

`GetProducts.Query` — пустой record, хендлер делает `.ToListAsync()` по всей таблице.
На 50 товарах ок, на 50 000 — сервер отдаёт мегабайты, фронт умирает.

Сейчас поиск и сортировка у меня на клиенте (`src/pages/Catalog.tsx`) — это временно
и честно помечено комментарием. Нужно:

```csharp
public record Query(
    string? Search = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    bool? InStockOnly = null,
    string? SortBy = null,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<ProductDto>>;
```

`[FromQuery]` в контроллере уже стоит, менять его не придётся.

### 7. `Status` уезжает на клиент числом

`Status : byte`, `JsonStringEnumConverter` не зарегистрирован → в JSON приезжает `0`..`4`.
Клиент вынужден хардкодить соответствие цифр статусам, и любая вставка нового значения
в середину enum молча ломает фронт. Забавно, что в БД ты хранишь строку
(`HasConversion<string>()`) — то есть в базе правильно, а наружу отдаёшь цифру.

```csharp
services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

Фронт у меня понимает оба формата (`normalizeStatus` в `src/lib/format.ts`), так что
менять можно безболезненно.

### 8. `AddProduct.Handler` вложен внутрь `CommandValidator`

```csharp
public class CommandValidator : AbstractValidator<Command>
{
    public CommandValidator(...) { ... }

    public class Handler(...) : IRequestHandler<Command, Guid>   // ← внутри валидатора
}
```

Скобка закрыта не там. Работает случайно: MediatR сканирует сборку и находит вложенные
типы независимо от глубины. Но читается как ошибка и ей является — во всех остальных
фичах `Handler` лежит рядом с `Validator`. Вынеси на уровень выше.

### 9. Конфиг валют не считывается

`CurrencyOptions.DefaultCurrency`, а в `appsettings.json` ключ называется `BaseCurrency`:

```json
"CurrencySettings": {
  "BaseCurrency": "RUB",        ← не биндится ни на что
  "SupportedCurrencies": [...]
}
```

`DefaultCurrency` остаётся дефолтным `"RUB"` из инициализатора свойства. Совпало с тем,
что ты и хотел, поэтому баг незаметен — но поменяешь `BaseCurrency` на `USD`, и ничего
не произойдёт. Переименуй ключ в `DefaultCurrency`.

Заодно: `AddProduct` требует `Price.Currency == DefaultCurrency`, а `UpdateProduct` —
`SupportedCurrencies.Contains(c)`. Создать можно только в рублях, обновить — в любой валюте.
Несогласованно; я бы оставил жёсткое правило «цены только в базовой валюте» в обоих местах.

### 10. `CreateOrder` не в транзакции — склад уходит в минус

Хендлер проверяет `product.StockQuantity < item.Quantity`, потом уменьшает остаток,
потом сохраняет. Два параллельных заказа на последний товар оба пройдут проверку.
Плюс `AddOrderAsync` внутри себя вызывает `SaveChangesAsync`, а следом идёт ещё один
`SaveChangesAsync` — это две отдельные транзакции: заказ уже создан, а списание баланса
может не сохраниться.

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
// ... вся логика, один SaveChangesAsync в конце
await tx.CommitAsync(ct);
```

И проверку остатка лучше делать атомарно — `ExecuteUpdateAsync` с условием
`StockQuantity >= quantity` и проверкой числа затронутых строк.

Заодно: методы `AddOrderAsync` / `AddProductAsync` / `AddCustomerAsync`, вызывающие
`SaveChangesAsync` внутри, — это то, что мешает управлять транзакциями снаружи.
`IEDbContext` лучше оставить чистым (`DbSet` + `SaveChangesAsync`), а `Add` вызывать
в хендлере.

### 11. `ConvertCurrencyService` падает на старте и на неизвестной валюте

Курсы лежат в Redis, кладёт их `CurrencyUpdateWorker`. Пока воркер не отработал
(или ЦБ недоступен — а он ходит по HTTP без ретраев), `GetStringAsync` вернёт null
и полетит `throw new Exception("No currency rates")` → **500 на `GET /api/cart`**
у всех пользователей с не-рублёвой валютой.

Плюс `rates[oldBalance.Currency]` — индексатор словаря. Валюты нет в ответе ЦБ →
`KeyNotFoundException` → 500.

Что нужно: сид курсов при старте (не ждать первого тика воркера), `TryGetValue`
вместо индексатора, фолбэк на последние известные курсы и осмысленная ошибка вместо
голого `Exception`. Интервал в 12 часов для курсов ЦБ великоват — они меняются раз в сутки,
но старт приложения не должен зависеть от расписания.

### 12. Роль зашита в «Customer», админ — только через DEBUG-эндпоинт

`Register` всегда выдаёт `"Customer"` (строкой, в трёх местах по коду). Единственный способ
получить админа — `GET /get-test-admin-token` под `#if DEBUG`. В релизной сборке админ
не существует вообще.

Минимум: константы вместо строковых литералов ролей и поле `Role` в `Customer`.
Дальше — сид первого админа при старте.

### 13. JWT на 60 минут без refresh

Токен протухает через час, пользователь молча выпадает в 401 посреди оформления заказа.
Refresh-токена нет. Во фронте я сделал упреждающий разлогин по `exp` (чтобы не ловить
внезапные 401), но это лечение симптома.

---

## Мелочи

- **Секрет JWT в `appsettings.json` в гите.** Для учебного проекта переживаемо, но привычка
  плохая — вынеси в user-secrets или переменные окружения. Пароль от Postgres там же.
- **`docker-compose.yaml`:** сервис `ecommerce-api` не зависит от `ecommerce-cache`
  и не получает строку подключения к Redis. Внутри контейнера возьмётся
  `host.docker.internal:6379` из `appsettings.json`, который на Linux не резолвится.
  Добавь `depends_on: ecommerce-cache` и `ConnectionStrings__Redis=ecommerce-cache:6379`.
- **`#if DEBUG` для адреса Redis** в `DependencyInjection.cs` — конфигурация,
  зашитая в код через директиву компилятора. Это работа `appsettings.Development.json`.
- **`ValidationBehavior` вызывает синхронный `Validate`** вместо `ValidateAsync` —
  в асинхронном пайплайне блокирует поток. Ещё он лежит в папке `Security`, хотя
  к безопасности отношения не имеет.
- **`GetProducts` / `GetProductById` возвращают доменные сущности наружу.** Везде остальные
  фичи используют DTO — здесь протекает модель. Любое поле, добавленное в `Product`,
  автоматически уедет клиенту.
- **Email не нормализуется при регистрации.** Уникальный индекс регистрозависимый,
  `Vasya@mail.ru` и `vasya@mail.ru` — два разных аккаунта. `.ToLowerInvariant()` при сохранении.
- **Опечатки в именах:** папка `Modles` → `Models`, `exsistingItem` → `existingItem`,
  `IEDbContext` (что такое `E`?). Мелочь, но глаз цепляется.
- **`RemoveCartItem`** маршрут `DELETE /api/cart/items/{id}`, где `id` — это `productId`.
  Назови параметр честно: `{productId}`.
- **Тестов нет ни одного.** При такой чистой архитектуре хендлеры тестируются тривиально
  (InMemory-провайдер + мок `ICurrentUserService`). `CreateOrder` и `CancelOrder` стоят
  тестов в первую очередь — там деньги и остатки.
- **`/health` внутри `#if DEBUG`** — health-check нужен именно в проде, для оркестратора.

---

## Что я бы сделал в таком порядке

1. Пополнение баланса (**без этого магазин не работает**)
2. Маппинг исключений на HTTP-коды + нормальная ошибка логина
3. CORS
4. `JsonStringEnumConverter`
5. Транзакция в `CreateOrder`
6. Пагинация и поиск в каталоге
7. `ImageUrl` в командах товара
8. Админский список заказов
9. Тесты на `CreateOrder` / `CancelOrder`

Первые четыре — это день работы, и после них проект перестаёт быть «почти рабочим».
