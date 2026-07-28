# ECommerce — фронтенд

React 19 + TypeScript + Vite + Tailwind v4 + [shadcn/ui](https://ui.shadcn.com).
Данные — TanStack Query, роутинг — React Router, тосты — sonner.

## Запуск

### С моком API (ничего больше не нужно)

```bash
npm install
npm run mock     # поднимает фейковый API на :5269
npm run dev      # фронт на :5173
```

Мок (`mock-server.mjs`) повторяет контракты настоящего API один-в-один, включая форматы
ошибок. Данные в памяти, сбрасываются при перезапуске. Регистрируешь любой аккаунт —
получаешь стартовый баланс 150 000 ₽, и весь флоу проходится целиком.

### С настоящим бэкендом

Пошагово — в [`../RUNBOOK.md`](../RUNBOOK.md) (там же про миграции, которые не
накатываются автоматически, и про пополнение баланса через SQL). Коротко:

```bash
cd ../backend && make db-up
dotnet ef database update --project src/ECommerce.Infrastructure --startup-project src/ECommerce.Api
dotnet run --project src/ECommerce.Api
```

Vite проксирует `/api`, `/get-test-admin-token` и `/health` на `http://localhost:5269`
(см. `vite.config.ts`). Прокси нужен потому, что **в API не настроен CORS** — подробнее
в `../REVIEW.md`, п. 2. Другой адрес бэкенда: `VITE_API_TARGET=http://localhost:8000 npm run dev`.

## Что умеет

| Страница | Эндпоинты |
|---|---|
| Каталог `/` | `GET /api/products` — поиск, сортировка, фильтр по наличию (на клиенте) |
| Товар `/products/:id` | `GET /api/products/{id}`, `POST /api/cart/items` |
| Корзина `/cart` | `GET/DELETE /api/cart`, `PATCH/DELETE /api/cart/items` |
| Оформление `/checkout` | `POST /api/orders` — с разбором ошибок FluentValidation по полям |
| Заказы `/orders`, `/orders/:id` | `GET /api/orders`, `PATCH /api/orders/{id}/cancel` |
| Профиль `/profile` | `GET /api/profile`, `PATCH /api/profile/change-currency` |
| Вход / регистрация | `POST /api/auth/login`, `/register` |
| Админка `/admin` | CRUD товаров, `GET /api/admin/orders` (все заказы, фильтр по статусу, пагинация), переходы статусов заказа |

Админка включается в меню профиля («Войти как админ») — дёргает `GET /get-test-admin-token`,
который есть только в DEBUG-сборке бэкенда. Админский токен хранится отдельно от
пользовательского, так что можно одновременно быть покупателем и админом.

## Структура

```
src/
  api/
    types.ts       # типы, зеркалящие C#-record'ы бэкенда
    client.ts      # fetch-обёртка: JWT, разбор трёх форматов ошибок, 204
    endpoints.ts   # по функции на эндпоинт, с комментариями о поведении API
  hooks/queries.ts # TanStack Query: ключи, инвалидация, тосты на ошибки
  context/         # AuthContext — токен, claims, авто-разлогин по exp
  components/ui/   # shadcn/ui, не трогать руками — генерируется CLI
  components/      # Header, Layout, StatusBadge, ProductImage, EmptyState
  pages/           # по странице на маршрут
  lib/             # format.ts (деньги, даты, статусы), jwt.ts, utils.ts
```

## Известные ограничения — все со стороны API

Отмечены комментариями в коде со ссылкой на пункт `../REVIEW.md`:

- **Баланс нельзя пополнить** — эндпоинта нет, у нового аккаунта 0 ₽ и заказ не пройдёт.
  Против настоящего бэкенда оформление упрётся в «недостаточно средств». Мок это обходит,
  выдавая стартовый баланс.
- **Каталог грузится целиком** — пагинации в API нет, поиск и сортировка на клиенте.

Исправлено (было актуально раньше, см. историю `REVIEW.md`):

- ~~Картинок у товаров нет~~ — `PUT /api/products/{id}/image` (Admin, `multipart/form-data`)
  грузит файл в MinIO и сохраняет публичный URL в `Product.ImageUrl`; `DELETE .../image` удаляет.
  Управляется из вкладки «Товары» в админке, `ProductImage` рисует градиентный плейсхолдер,
  пока картинки нет.
- ~~Админка не видит чужие заказы~~ — теперь `GET /api/admin/orders` отдаёт заказы всех
  покупателей с фильтром по статусу/покупателю и пагинацией; вкладка «Заказы» в админке
  использует именно его.
- ~~Ошибки логина приезжают как 500~~ — `ExceptionHandlingMiddleware` теперь мапит все
  доменные исключения на правильные коды (400/401/403/404/409/503), тело — единый
  ProblemDetails с полем `detail`.

## Команды

```bash
npm run dev        # дев-сервер
npm run build      # tsc -b && vite build
npm run typecheck  # только проверка типов
npm run mock       # мок API на :5269
```
