from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Notification
from app.infrastructure.db import get_session
from app.schemas import NotificationOut, NotificationsPage, OrderCreatedEvent

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/v1/events/order-created", status_code=status.HTTP_202_ACCEPTED)
async def order_created(
    payload: OrderCreatedEvent,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    existing = await session.scalar(
        select(Notification).where(Notification.event_id == payload.event_id)
    )
    if existing is not None:
        return {"status": "duplicate", "notification_id": str(existing.id)}

    notification = Notification(
        event_id=payload.event_id,
        order_id=payload.order_id,
        customer_id=payload.customer_id,
        total=payload.total,
        currency=payload.currency.upper(),
        message=f"Order {payload.order_id} created for {payload.total} {payload.currency.upper()}",
    )
    session.add(notification)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        existing = await session.scalar(
            select(Notification).where(Notification.event_id == payload.event_id)
        )
        if existing is None:
            raise
        return {"status": "duplicate", "notification_id": str(existing.id)}

    await session.refresh(notification)
    return {"status": "accepted", "notification_id": str(notification.id)}


@router.get("/v1/notifications", response_model=NotificationsPage)
async def list_notifications(
    customer_id: UUID = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> NotificationsPage:
    base = select(Notification).where(Notification.customer_id == customer_id)
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = (
        await session.scalars(
            base.order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return NotificationsPage(
        items=[NotificationOut.model_validate(row) for row in rows],
        total_count=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/v1/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> NotificationOut:
    notification = await session.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    await session.commit()
    await session.refresh(notification)
    return NotificationOut.model_validate(notification)
