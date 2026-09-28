"""Notifications (in-app + outbound queue), mail templates, generic attachments, agencies, logs."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import GEN_UUID, JSON, AuditMixin, BigId, user_fk

# --------------------------------------------------------------------------- notifications


class Notification(AuditMixin, Base):
    """In-app notification shown in the notification drawer. Orion: master.notification."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    notified_to_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE", index=True)
    notified_by_id: Mapped[uuid.UUID | None] = user_fk()
    type: Mapped[str] = mapped_column(String(50), default="", server_default="")
    message: Mapped[str | None] = mapped_column(String(4000))
    status: Mapped[int | None] = mapped_column(Integer)  # read / unread


class OutboundMessage(Base):
    """Queued e-mail / push message with retries. Orion: notification.notification."""

    __tablename__ = "outbound_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4, server_default=GEN_UUID)
    type: Mapped[str | None] = mapped_column(String(50))
    recipient: Mapped[str | None] = mapped_column(Text)
    subject: Mapped[str | None] = mapped_column(Text)
    message: Mapped[str | None] = mapped_column(Text)
    message_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str | None] = mapped_column(String(20), index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    max_retries: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OutboundMessageLog(Base):
    """One delivery attempt. Orion: notification.notification_log."""

    __tablename__ = "outbound_message_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("outbound_messages.id", ondelete="CASCADE"), index=True)
    attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str | None] = mapped_column(String(20))
    error: Mapped[str | None] = mapped_column(Text)


class MailTemplate(AuditMixin, Base):
    """Orion: master.mailtemplate."""

    __tablename__ = "mail_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template_type: Mapped[str] = mapped_column(String(250), unique=True)
    subject: Mapped[str] = mapped_column(Text, default="", server_default="")
    template: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(250))
    from_email: Mapped[str | None] = mapped_column(String(250))
    to_email: Mapped[str | None] = mapped_column(Text)
    cc_email: Mapped[str | None] = mapped_column(Text)


class MailRecipient(AuditMixin, Base):
    """Fixed to/cc users for a mail type. Orion: master.mail_sender_list."""

    __tablename__ = "mail_recipients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mail_type: Mapped[str | None] = mapped_column(String(100), index=True)
    to_user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE")
    cc_user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE")


# --------------------------------------------------------------------------- attachments


class Attachment(AuditMixin, Base):
    """Generic uploaded file linked to any module row. Orion: attachments.attachment."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    module: Mapped[str] = mapped_column(String(100), index=True)
    reference_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    reference_id_1: Mapped[int | None] = mapped_column(BigInteger)
    reference_id_2: Mapped[int | None] = mapped_column(BigInteger)
    file_name: Mapped[str] = mapped_column(Text)
    file_type: Mapped[str] = mapped_column(String(200))
    file_size: Mapped[int] = mapped_column(BigInteger)
    blob_name: Mapped[str] = mapped_column(Text)
    blob_uri: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --------------------------------------------------------------------------- agencies


class Agency(AuditMixin, Base):
    """Partner agency that places orders. Orion: master.agency."""

    __tablename__ = "agencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(250))
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"))


class AgencyPackage(AuditMixin, Base):
    """Orion: master.agency_package."""

    __tablename__ = "agency_packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))


class AgencyRegistration(AuditMixin, Base):
    """Agency staff sign-up request and its approval.

    Orion: users.agency_user. The login itself is a row in `users` (linked via user_id
    once approved); Orion's separate password column is not carried over.
    """

    __tablename__ = "agency_registrations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4, server_default=GEN_UUID)
    agency_id: Mapped[int] = mapped_column(ForeignKey("agencies.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="SET NULL", index=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone_number: Mapped[str | None] = mapped_column(String(20))
    country_id: Mapped[int | None] = mapped_column(ForeignKey("countries.id"))
    approval_status: Mapped[str | None] = mapped_column(String(20))  # Orion is_approval
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_id: Mapped[uuid.UUID | None] = user_fk()
    remarks: Mapped[str | None] = mapped_column(String(4000))
    mail_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --------------------------------------------------------------------------- logs


class AppLog(Base):
    """Server-side error/info log. Orion: public.logdetail (+ public.sslogs)."""

    __tablename__ = "app_logs"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    level: Mapped[str | None] = mapped_column(String(20), index=True)
    message: Mapped[str | None] = mapped_column(Text)
    exception: Mapped[str | None] = mapped_column(Text)
    stack_trace: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = user_fk()
    input_data: Mapped[dict | None] = mapped_column(JSON)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserActivity(Base):
    """Audit trail of user actions on tickets. Orion: users.usertracking."""

    __tablename__ = "user_activity"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE", index=True)
    action: Mapped[str] = mapped_column(Text)
    ticket_ref: Mapped[str | None] = mapped_column(Text)
    ticket_type: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
