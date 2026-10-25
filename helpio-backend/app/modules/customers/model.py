from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UtcDateTime, str_enum, utc_now


class AddressLabel(StrEnum):
    HOME = "home"
    WORK = "work"
    OTHER = "other"


class CustomerAddress(Base):
    """A saved place to send pros to. The full address line stays private until a pro is hired."""

    __tablename__ = "customer_addresses"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[AddressLabel] = mapped_column(str_enum(AddressLabel), nullable=False)
    address_line: Mapped[str | None] = mapped_column(Text, nullable=True)
    area_name: Mapped[str] = mapped_column(String(80), nullable=False)
    pincode: Mapped[str] = mapped_column(String(6), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
