from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrderCreatedEvent(BaseModel):
    event_id: UUID
    order_id: UUID
    customer_id: UUID
    total: Decimal
    currency: str = Field(min_length=3, max_length=3)


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    order_id: UUID
    customer_id: UUID
    total: Decimal
    currency: str
    message: str
    is_read: bool
    created_at: datetime


class NotificationsPage(BaseModel):
    items: list[NotificationOut]
    total_count: int
    page: int
    page_size: int
