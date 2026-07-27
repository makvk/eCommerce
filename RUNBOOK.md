# Ранбук: фронт + настоящий бэкенд

Как поднять всё вместе и пройти полный сценарий магазина против реального API.

**Мок здесь не участвует.** `npm run dev` ходит в твой .NET — Vite проксирует
`/api`, `/get-test-admin-token` и `/health` на `http://localhost:5269`. Для браузера
это тот же origin, поэтому отсутствие CORS не мешает; запросы настоящие,
данные из Postgres и Redis.

---

## Что нужно один раз

```bash
dotnet tool install --global dotnet-ef
```

Проверь, что стоят .NET 10 SDK, Docker и Node 20+:

```bash
dotnet --version && docker --version && node -v
```

---

## Запуск

### 1. Postgres и Redis

```bash
cd backend && make db-up
```

Поднимает `ecommerce-postgres` (:5432) и `ecommerce-redis` (:6379).
Не используй `make run` — он первым делом делает `docker compose down` и гасит
контейнеры, включая Redis.

### 2. Накатить миграции

**Это обязательно.** В `Program.cs` нет `Database.Migrate()`, схема сама не создастся —
без этого шага любой запрос упадёт с `relation "catalog.Products" does not exist`.

```bash
dotnet ef database update --project backend/src/ECommerce.Infrastructure --startup-project backend/src/ECommerce.Api
```

Повторять после каждой новой миграции.

### 3. API

```bash
dotnet run --project backend/src/ECommerce.Api
```

Поднимется на `http://localhost:5269` (профиль `http` из `launchSettings.json`).
Сборка по умолчанию Debug — это важно, иначе не будет `/get-test-admin-token`
и админка не включится.

Проверка:

```bash
curl -s http://localhost:5269/health
```

Должно вернуться `{"status":"ok","message":"ok"}`.

### 4. Фронт

```bash
cd frontend && npm install && npm run dev
```

Открывай `http://localhost:5173`.

Если API слушает другой порт (например, в докере — 8000):

```bash
VITE_API_TARGET=http://localhost:8000 npm run dev
```

---

## Первый прогон

Каталог будет пустым, а баланс нулевым — база чистая. Порядок такой.

### 1. Зарегистрироваться

`http://localhost:5173/register`. Пароль от 8 символов — это требование
`Register.CommandValidator`, фронт его дублирует.

### 2. Включить админку и добавить товары

Меню профиля (аватар справа сверху) → **«Войти как админ»**. Фронт дёрнет
`GET /get-test-admin-token` и положит админский токен отдельно от пользовательского,
так что покупателем ты быть не перестанешь.

Дальше `/admin` → вкладка «Товары» → «Добавить товар». Цена только в рублях —
этого требует `AddProduct.CommandValidator`.

Картинки не задавай: `ImageUrl` не принимается командами создания и обновления
(`REVIEW.md`, п. 5), фронт нарисует градиентные плейсхолдеры.

### 3. Пополнить баланс через SQL

Эндпоинта пополнения в API нет (`REVIEW.md`, п. 1), а `CreateOrder` требует денег
на счету. Пока не добавишь `TopUpBalance` — только руками в базе:

```bash
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce_db -c 'UPDATE customer."Customers" SET "Balance_Amount" = 500000;'
```

Это пополнит всех — на локальной базе обычно то, что нужно. Если надо конкретному
пользователю, заходи в psql и делай там (кавычки в одну строку через `docker exec`
неудобно экранировать):

```bash
docker exec -it ecommerce-postgres psql -U postgres -d ecommerce_db
```

```sql
UPDATE customer."Customers" SET "Balance_Amount" = 500000 WHERE "Email" = 'vitalik@example.com';
```

Обнови страницу профиля — баланс подтянется.

### 4. Пройти сценарий

Каталог → «В корзину» → `/cart` → «Оформить заказ» → адрес → «Оплатить с баланса».
Дальше `/orders`: заказ создан, баланс списан, остатки на складе уменьшились.

Смена статуса — в `/admin`, вкладка «Заказы»: `Создан → В обработке → Отправлен → Доставлен`.
Порядок жёсткий, перепрыгнуть ступень нельзя (`TakeOrderInProcess` и соседи проверяют
текущий статус). Отмена возвращает и товары на склад, и деньги на баланс.

---

## Если что-то не так

| Симптом | Причина | Что делать |
|---|---|---|
| «Не удалось связаться с API» | Бэкенд не запущен или на другом порту | `curl localhost:5269/health`, при другом порту — `VITE_API_TARGET` |
| `relation ... does not exist` | Миграции не накатаны | Шаг 2 |
| Каталог пуст | Товаров в базе нет | Добавить через админку |
| «Войти как админ» → ошибка | Release-сборка, `DevelopmentController` вырезан `#if DEBUG` | Запускать без `-c Release` |
| Логин: 500 вместо 401 | Так работает `Login.Handler` — голый `Exception` | Текст причины фронт достаёт из `details`, это `REVIEW.md` п. 3 |
| Внезапный 401 через час | JWT живёт 60 минут, refresh нет | Перелогиниться |
| 500 на `GET /api/cart` | Redis не поднят, либо курсы валют не загружены | `docker ps`, и см. следующую строку |
| 500 после смены валюты на не-рублёвую | `CurrencyUpdateWorker` не сходил на cbr.ru (нет сети или ещё не отработал) | Нужен интернет при старте API; `REVIEW.md` п. 11 |
| Заказ: `Amount X is greater than current amount` | Баланс меньше суммы | Шаг 3 |
| Заказ: `Cart is empty` | Корзина в Redis протухла или Redis перезапущен без тома | Добавить товары заново |

Логи API смотри в терминале, где запущен `dotnet run`; логи базы — `make db-logs`.

---

## Полный докер (опционально)

`docker compose up` поднимет и API на `:8000`, но сервис `ecommerce-api` в
`docker-compose.yaml` не зависит от Redis и не получает строку подключения к нему —
возьмётся `host.docker.internal:6379` из `appsettings.json`, который на Linux не резолвится,
и корзина отвалится. Почини это (`REVIEW.md`, «Мелочи») либо запускай API локально
через `dotnet run`, как выше.

---

## Сброс базы

```bash
cd backend && docker compose down -v
```

`-v` сносит и тома, то есть данные Postgres и Redis. Дальше с шага 1.

---

## Без бэкенда вообще

Если нужно просто посмотреть или покрутить UI — есть мок, повторяющий контракты
один-в-один, с данными в памяти и стартовым балансом:

```bash
cd frontend && npm run mock
```

Подробности — в `frontend/README.md`.
