"""Customer branding guidelines captured per order."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import JSON, AuditMixin, BigId


class BrandingSection(AuditMixin, Base):
    """One section of a customer's branding guideline. Orion: tickets.ticket_customer_branding."""

    __tablename__ = "branding_sections"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    section_name: Mapped[str | None] = mapped_column(String(200))
    version: Mapped[str | None] = mapped_column(String(10))
    branding_json: Mapped[dict] = mapped_column(JSON)


class BrandingAttachment(AuditMixin, Base):
    """Orion: tickets.ticket_customer_branding_attachment."""

    __tablename__ = "branding_attachments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("branding_sections.id", ondelete="CASCADE"), index=True)
    file_type: Mapped[str | None] = mapped_column(String(200))
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(2000))
    blob_name: Mapped[str] = mapped_column(String(200))
    blob_uri: Mapped[str] = mapped_column(String(2000))


class BrandingExtraction(AuditMixin, Base):
    """Result of scraping a customer website for brand guidelines. Orion: ..._branding_extraction."""

    __tablename__ = "branding_extractions"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    source_type: Mapped[str] = mapped_column(String(50))
    source_url: Mapped[str | None] = mapped_column(String(2000))
    job_id: Mapped[str | None] = mapped_column(String(100), index=True)
    extract_details: Mapped[dict] = mapped_column(JSON)


class BrandingFeedback(AuditMixin, Base):
    """Orion: tickets.ticket_customer_branding_feedback."""

    __tablename__ = "branding_feedback"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("branding_sections.id", ondelete="CASCADE"), index=True)
    feedback: Mapped[str | None] = mapped_column(String(3000))


class BrandingNote(AuditMixin, Base):
    """Orion: tickets.ticket_customer_branding_notes."""

    __tablename__ = "branding_notes"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    guideline_notes: Mapped[str | None] = mapped_column(String(5000))

