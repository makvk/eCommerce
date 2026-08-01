# Notifications (FastAPI)

Сервис уведомлений о заказах для ECommerceStore.

.NET API после успешного `CreateOrder` вызывает:

`POST /v1/events/order-created`

Повтор с тем же `event_id` идемпотентен (unique constraint).

## Эндпоинты

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | liveness |
| POST | `/v1/events/order-created` | принять событие заказа (202) |
| GET | `/v1/notifications?customer_id=` | список уведомлений |
| PATCH | `/v1/notifications/{id}/read` | пометить прочитанным |

## Локальный запуск

```bash
cd notifications
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Postgres на :5433
docker compose up -d notifications-db

export DATABASE_URL=postgresql+asyncpg://postgres:your_pass@localhost:5433/notifications_db
uvicorn app.main:app --reload --port 8100
```

## Тесты

```bash
cd notifications
pip install -e ".[dev]"
pytest
```

Тесты используют in-memory SQLite и не требуют Docker.

## Интеграция с .NET

В `appsettings.Development.json`:

```json
"Notifications": {
  "Enabled": true,
  "BaseUrl": "http://localhost:8100"
}
```

Ошибки доставки не откатывают заказ (best-effort HTTP). Следующий шаг зрелости — outbox.
