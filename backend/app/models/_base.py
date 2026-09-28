"""Shared column types and mixins for every table.

Orion convention kept: soft delete via `is_active`, plus who/when audit columns.
Differences from Orion: audit users are real FKs (Orion stored them as free text),
and timestamps are timezone-aware.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Uuid, func, text, true
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

IntArray = ARRAY(Integer)
JSON = JSONB
BigId = BigInteger


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ActiveMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())


class AuditMixin(TimestampMixin, ActiveMixin):
    """is_active + created/updated at + created/updated by (users.id)."""

    @declared_attr
    def created_by_id(cls) -> Mapped[uuid.UUID | None]:
        return mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))

    @declared_attr
    def updated_by_id(cls) -> Mapped[uuid.UUID | None]:
        return mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))


def user_fk(ondelete: str = "SET NULL", **kw):
    """A nullable reference to users.id."""
    return mapped_column(Uuid, ForeignKey("users.id", ondelete=ondelete), **kw)


GEN_UUID = text("gen_random_uuid()")
