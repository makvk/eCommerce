import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.domain.models import Base
from app.infrastructure.db import get_session
from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session

    with patch("app.main.init_db", new_callable=AsyncMock):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_order_created_is_idempotent(client: AsyncClient) -> None:
    event_id = uuid.uuid4()
    payload = {
        "event_id": str(event_id),
        "order_id": str(uuid.uuid4()),
        "customer_id": str(uuid.uuid4()),
        "total": "1500.50",
        "currency": "RUB",
    }

    first = await client.post("/v1/events/order-created", json=payload)
    second = await client.post("/v1/events/order-created", json=payload)

    assert first.status_code == 202
    assert first.json()["status"] == "accepted"
    assert second.status_code == 202
    assert second.json()["status"] == "duplicate"
    assert first.json()["notification_id"] == second.json()["notification_id"]


@pytest.mark.asyncio
async def test_list_and_mark_read(client: AsyncClient) -> None:
    customer_id = uuid.uuid4()
    payload = {
        "event_id": str(uuid.uuid4()),
        "order_id": str(uuid.uuid4()),
        "customer_id": str(customer_id),
        "total": str(Decimal("99.00")),
        "currency": "USD",
    }
    created = await client.post("/v1/events/order-created", json=payload)
    notification_id = created.json()["notification_id"]

    listed = await client.get("/v1/notifications", params={"customer_id": str(customer_id)})
    assert listed.status_code == 200
    body = listed.json()
    assert body["total_count"] == 1
    assert body["items"][0]["is_read"] is False

    marked = await client.patch(f"/v1/notifications/{notification_id}/read")
    assert marked.status_code == 200
    assert marked.json()["is_read"] is True
