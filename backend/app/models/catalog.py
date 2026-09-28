"""Product catalogue: tools, versions, templates, subscriptions and the lookups around them."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import JSON, AuditMixin, user_fk


class ToolCategory(AuditMixin, Base):
    """Orion: master.toolcategory."""

    __tablename__ = "tool_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class ToolStatus(AuditMixin, Base):
    """Lifecycle status of a tool. Orion: master.status."""

    __tablename__ = "tool_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Tool(AuditMixin, Base):
    """A product/tool that can be ordered. Orion: master.tool."""

    __tablename__ = "tools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(250))
    about: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    key_highlight: Mapped[str | None] = mapped_column(Text)
    primary_owner_id: Mapped[uuid.UUID | None] = user_fk()
    secondary_owner_id: Mapped[uuid.UUID | None] = user_fk()
    status_id: Mapped[int | None] = mapped_column(ForeignKey("tool_statuses.id"))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("tool_categories.id"))
    current_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("tool_versions.id", ondelete="SET NULL", use_alter=True)
    )
    is_dependency_required: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_analyse_dependency: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_tsr_dependency: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_update_team_dependency: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_data_dependency_priority: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class ToolVersion(AuditMixin, Base):
    """Orion: master.toolversion."""

    __tablename__ = "tool_versions"
    __table_args__ = (UniqueConstraint("tool_id", "version_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    version_name: Mapped[str] = mapped_column(String(100))


class ToolTemplateMaster(AuditMixin, Base):
    """Requirement form template (JSON schema). Orion: master.tool_template_master."""

    __tablename__ = "tool_template_masters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    template: Mapped[dict | None] = mapped_column(JSON)
    version: Mapped[str | None] = mapped_column(String(50))
    template_type: Mapped[str | None] = mapped_column(String(50))


class ToolTemplate(AuditMixin, Base):
    """Which template a tool uses. Orion: master.tool_template."""

    __tablename__ = "tool_templates"
    __table_args__ = (UniqueConstraint("tool_id", "template_master_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    template_master_id: Mapped[int] = mapped_column(ForeignKey("tool_template_masters.id", ondelete="CASCADE"))


class Platform(AuditMixin, Base):
    """Orion: master.platform."""

    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))


class ToolPlatform(AuditMixin, Base):
    """Orion: users.toolplatform."""

    __tablename__ = "tool_platforms"
    __table_args__ = (UniqueConstraint("tool_id", "platform_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id", ondelete="CASCADE"))


class Currency(AuditMixin, Base):
    """Orion: master.currency."""

    __tablename__ = "currencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class SubscriptionType(AuditMixin, Base):
    """Orion: master.subscriptiontype."""

    __tablename__ = "subscription_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100))
    complete_price: Mapped[float | None] = mapped_column(Numeric(14, 2))
    onetime_price: Mapped[float | None] = mapped_column(Numeric(14, 2))
    currency_id: Mapped[int | None] = mapped_column(ForeignKey("currencies.id"))


class ToolSubscription(AuditMixin, Base):
    """Subscriptions a tool is sold under. Orion: users.toolsubscription."""

    __tablename__ = "tool_subscriptions"
    __table_args__ = (UniqueConstraint("tool_id", "subscription_type_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    subscription_type_id: Mapped[int] = mapped_column(ForeignKey("subscription_types.id", ondelete="CASCADE"))


class ToolCountry(AuditMixin, Base):
    """Countries a tool is offered in. Orion: users.toolcountryregion."""

    __tablename__ = "tool_countries"
    __table_args__ = (UniqueConstraint("tool_id", "country_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id", ondelete="CASCADE"))


class UserTool(AuditMixin, Base):
    """Tools a user is skilled in / responsible for. Orion: users.usertool."""

    __tablename__ = "user_tools"
    __table_args__ = (UniqueConstraint("user_id", "tool_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"))


class Package(AuditMixin, Base):
    """Orion: master.package."""

    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class FontFamily(AuditMixin, Base):
    """Orion: master.fontfamily."""

    __tablename__ = "font_families"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(500), unique=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class Color(AuditMixin, Base):
    """Orion: master.corecolor."""

    __tablename__ = "colors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(250))


class Tag(AuditMixin, Base):
    """Orion: master."Tag"."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class CustomerLanguage(Base):
    """Languages a customer site can be delivered in. Orion: master.customer_language."""

    __tablename__ = "customer_languages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    name: Mapped[str] = mapped_column(String(50))
    available_euroland: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class CustomerMarket(Base):
    """Stock markets. Orion: master.customer_market."""

    __tablename__ = "customer_markets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    europe_market_number: Mapped[int | None] = mapped_column(SmallInteger)


class TimeZone(AuditMixin, Base):
    """Orion: master.time_zone_detail."""

    __tablename__ = "time_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500))
    utc_offset: Mapped[str | None] = mapped_column(String(20))
