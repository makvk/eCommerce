# ECommerce.Api

Backend интернет-магазина на ASP.NET Core (.NET 10): Clean Architecture, CQRS (MediatR), PostgreSQL, Redis, MinIO, JWT.

## Слои

| Проект | Назначение |
|--------|------------|
| `ECommerce.Domain` | Сущности, value objects, инварианты |
| `ECommerce.Application` | Use case'ы (MediatR), интерфейсы, валидация |
| `ECommerce.Infrastructure` | EF Core, Redis, JWT, MinIO, HTTP-клиенты |
| `ECommerce.Api` | Controllers, middleware, composition root |

## Быстрый старт (локально)

```bash
# 1. Postgres + Redis + MinIO
cd backend && make db-up
# или: docker compose up -d ecommerce-db ecommerce-cache ecommerce-minio

# 2. Миграции применяются при старте API (StartupSeeder).
#    При необходимости вручную:
dotnet ef database update --project src/ECommerce.Infrastructure --startup-project src/ECommerce.Api

# 3. API (профиль Development подставляет секреты из appsettings.Development.json)
dotnet run --project src/ECommerce.Api
```

Health: `GET http://localhost:5269/health` → `{"status":"ok",...}`

Swagger/Scalar (Development): `http://localhost:5269/scalar/v1`

## Секреты

В `appsettings.json` секреты пустые. Для локальной разработки значения лежат в `appsettings.Development.json`.
В проде задавайте через env / user-secrets:

- `JwtSettings__Secret`
- `ConnectionStrings__DefaultConnection`
- `ConnectionStrings__Redis`
- `AdminSeed__Password`
- `MinioSettings__AccessKey` / `MinioSettings__SecretKey`

## Админ

При старте сидится пользователь из `AdminSeed` (по умолчанию `admin@ecommerce.local` / `Admin123!` в Development).

В DEBUG также доступен `GET /get-test-admin-token`.

## Основные эндпоинты

| Method | Path | Роль |
|--------|------|------|
| POST | `/api/auth/register` | anon |
| POST | `/api/auth/login` | anon |
| GET | `/api/products` | anon |
| GET/POST/PATCH/DELETE | `/api/cart/...` | Customer |
| POST | `/api/orders` | Customer |
| PATCH | `/api/orders/{id}/cancel` | Customer |
| POST | `/api/profile/balance` | Customer |
| CRUD | `/api/admin/products` | Admin |
| GET/PATCH | `/api/admin/orders` | Admin |
| GET | `/health` | anon |

## Уведомления (FastAPI)

После создания заказа API шлёт `POST {Notifications:BaseUrl}/v1/events/order-created`.
Включение: `Notifications__Enabled=true`. Ошибки уведомлений не откатывают заказ (см. сервис в `/notifications`).

## Тесты

```bash
cd backend
dotnet test
```

Unit-тесты домена не требуют Docker. Integration-тесты поднимают Postgres/Redis через Testcontainers.

## Docker Compose (весь стек API)

```bash
cd backend
docker compose up --build
```

API: `http://localhost:8000/health`
