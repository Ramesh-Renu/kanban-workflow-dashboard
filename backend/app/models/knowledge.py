"""Knowledge base: bases → folder tree → attachments / links / issues, plus access rights."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, false, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import GEN_UUID, JSON, AuditMixin

VECTOR_PENDING = text("'Pending'")


class KnowledgeBase(AuditMixin, Base):
    """Orion: knowledgebase.knowledgebase_master."""

    __tablename__ = "kb_bases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String(2000))
    is_helpdesk: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class KbFolder(AuditMixin, Base):
    """Folder tree inside a knowledge base. Orion: knowledgebase.knowledgebase_folders."""

    __tablename__ = "kb_folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kb_id: Mapped[int] = mapped_column(ForeignKey("kb_bases.id", ondelete="RESTRICT"), index=True)
    parent_folder_id: Mapped[int | None] = mapped_column(ForeignKey("kb_folders.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String(2000))
    # False for folders created by the Freshdesk sync.
    is_manual: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class KbAttachment(AuditMixin, Base):
    """Orion: knowledgebase.knowledgebase_attachments."""

    __tablename__ = "kb_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, default=uuid.uuid4, server_default=GEN_UUID)
    folder_id: Mapped[int] = mapped_column(ForeignKey("kb_folders.id", ondelete="RESTRICT"), index=True)
    document_name: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(String(2000))
    file_type: Mapped[str | None] = mapped_column(String(50))
    file_name: Mapped[str | None] = mapped_column(String(500))
    file_url: Mapped[str | None] = mapped_column(Text)
    vector_processing_status: Mapped[str] = mapped_column(String(20), default="Pending", server_default=VECTOR_PENDING)


class KbLink(AuditMixin, Base):
    """Orion: knowledgebase.knowledgebase_links."""

    __tablename__ = "kb_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    folder_id: Mapped[int] = mapped_column(ForeignKey("kb_folders.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(2000))
    description: Mapped[str | None] = mapped_column(String(2000))


class KbIssue(AuditMixin, Base):
    """A support issue (e.g. synced from Freshdesk). Orion: knowledgebase.knowledgebase_issues."""

    __tablename__ = "kb_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, default=uuid.uuid4, server_default=GEN_UUID)
    kb_id: Mapped[int] = mapped_column(ForeignKey("kb_bases.id", ondelete="RESTRICT"), index=True)
    folder_id: Mapped[int] = mapped_column(ForeignKey("kb_folders.id", ondelete="RESTRICT"), index=True)
    parent_folder_id: Mapped[int | None] = mapped_column(ForeignKey("kb_folders.id", ondelete="RESTRICT"))
    freshdesk_ticket: Mapped[str | None] = mapped_column(Text)
    issue_name: Mapped[str] = mapped_column(Text)
    issue_json: Mapped[dict] = mapped_column(JSON)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    vector_processing_status: Mapped[str] = mapped_column(String(20), default="Pending", server_default=VECTOR_PENDING)


class UserKbPermission(AuditMixin, Base):
    """Orion: knowledgebase.user_knowledgebase_permission."""

    __tablename__ = "user_kb_permissions"
    __table_args__ = (UniqueConstraint("user_id", "kb_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kb_id: Mapped[int] = mapped_column(ForeignKey("kb_bases.id", ondelete="CASCADE"))
    action_id: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # access level
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

