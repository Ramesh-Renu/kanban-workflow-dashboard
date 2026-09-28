"""Core tables: users & auth, lookups, workspaces, boards, permissions.

Orion equivalents are noted per table (see backend/db/ORION_KANBAN_SCHEMA_ANALYSIS.md).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._base import GEN_UUID, JSON, AuditMixin, TimestampMixin

# --------------------------------------------------------------------------- lookups


class StatusMaster(Base):
    """Generic lookup served by `status-type?type=<TYPE>`. Orion: master.status_code_master."""

    __tablename__ = "status_master"
    __table_args__ = (UniqueConstraint("type", "code"),)

    status_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(50), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    colour_code: Mapped[str | None] = mapped_column(String(20))
    background_colour: Mapped[str | None] = mapped_column(String(20))
    # Groups child statuses under a parent code (Orion parent_code).
    parent_code: Mapped[str | None] = mapped_column(String(50))


class Region(AuditMixin, Base):
    """Orion: master.region."""

    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Team(AuditMixin, Base):
    """Orion: master.team."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Designation(AuditMixin, Base):
    """Orion: master.designation."""

    __tablename__ = "designations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100), unique=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))


class Country(AuditMixin, Base):
    """Orion: master.country_detail + master.country (merged — Orion kept two copies)."""

    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    code: Mapped[str] = mapped_column(String(3))
    dial_code: Mapped[str | None] = mapped_column(String(10))
    currency_code: Mapped[str | None] = mapped_column(String(10))
    region_id: Mapped[int | None] = mapped_column(ForeignKey("regions.id", ondelete="SET NULL"))


class Role(AuditMixin, Base):
    """Board-level role (what a user may do inside a board). Orion: master.role."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class App(AuditMixin, Base):
    """Application Hub apps (ids match APPLICATION_HUB_APPS.permissionAppId). Orion: master.app_master."""

    __tablename__ = "apps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    prod_url: Mapped[str | None] = mapped_column(String(500))
    preprod_url: Mapped[str | None] = mapped_column(String(500))
    testing_url: Mapped[str | None] = mapped_column(String(500))
    logo_path: Mapped[str | None] = mapped_column(String(1000))
    colour_code: Mapped[str | None] = mapped_column(String(20))


# --------------------------------------------------------------------------- users & auth


class User(TimestampMixin, Base):
    """Orion: users.registereduser + users.userprofile (one row per person)."""

    __tablename__ = "users"

    # UUID like Orion's RegId, so Orion users can be imported with the same ids.
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4, server_default=GEN_UUID)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(200))
    given_name: Mapped[str | None] = mapped_column(String(100))
    surname: Mapped[str | None] = mapped_column(String(100))
    job_title: Mapped[str | None] = mapped_column(String(200))
    employee_id: Mapped[str | None] = mapped_column(String(50))
    mobile_phone: Mapped[str | None] = mapped_column(String(50))
    office_location: Mapped[str | None] = mapped_column(String(200))
    preferred_language: Mapped[str | None] = mapped_column(String(20))
    photo_url: Mapped[str | None] = mapped_column(String(1000))

    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # References status_master rows of type USERROLE (45 Admin / 46 User / 47 Inactive).
    user_type_id: Mapped[int] = mapped_column(ForeignKey("status_master.status_id"))
    previous_user_type_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    # True once an admin has added the user to Orion (team/designation/etc. set).
    has_profile: Mapped[bool] = mapped_column(Boolean, default=False)

    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    designation_id: Mapped[int | None] = mapped_column(ForeignKey("designations.id"))
    country_id: Mapped[int | None] = mapped_column(ForeignKey("countries.id"))
    default_workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="SET NULL", use_alter=True)
    )
    shift_from: Mapped[str | None] = mapped_column(String(10))
    shift_to: Mapped[str | None] = mapped_column(String(10))
    # Saved Kanban filters (Orion userprofile.main_board_filter / sub_board_filter).
    main_board_filter: Mapped[dict | None] = mapped_column(JSON)
    sub_board_filter: Mapped[dict | None] = mapped_column(JSON)

    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user_type: Mapped[StatusMaster] = relationship(foreign_keys=[user_type_id], lazy="joined")
    team: Mapped[Team | None] = relationship(foreign_keys=[team_id], lazy="joined")
    designation: Mapped[Designation | None] = relationship(foreign_keys=[designation_id], lazy="joined")
    country: Mapped[Country | None] = relationship(foreign_keys=[country_id], lazy="joined")
    board_permissions: Mapped[list["UserBoardPermission"]] = relationship(
        back_populates="user", foreign_keys="UserBoardPermission.user_id", cascade="all, delete-orphan"
    )
    app_permissions: Mapped[list["UserAppPermission"]] = relationship(
        back_populates="user", foreign_keys="UserAppPermission.user_id", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Only a SHA-256 hash of the token is stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[str | None] = mapped_column(String(500))


# --------------------------------------------------------------------------- workspaces & boards


class Workspace(AuditMixin, Base):
    """Orion: master.work_space_master."""

    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str | None] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(200))
    # References status_master rows of type WORKFLOWTYPE.
    workflow_type_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))

    created_by: Mapped[User | None] = relationship(foreign_keys="Workspace.created_by_id", lazy="joined")
    # Active boards only; write through Board.workspace_id.
    boards: Mapped[list["Board"]] = relationship(
        order_by="Board.id",
        primaryjoin="and_(Workspace.id == Board.workspace_id, Board.is_active == True)",
        viewonly=True,
    )


class Board(AuditMixin, Base):
    """Orion: board.board."""

    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), index=True)
    # Sub-task boards point at the main (order) board they belong to.
    main_board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str | None] = mapped_column(String(50))
    type: Mapped[str] = mapped_column(String(50), default="subtask")

    workspace: Mapped[Workspace] = relationship(foreign_keys=[workspace_id])
    labels: Mapped[list["BoardLabel"]] = relationship(
        back_populates="board", order_by="BoardLabel.position", cascade="all, delete-orphan"
    )


class BoardLabel(AuditMixin, Base):
    """A stage / column of a board. Orion: board.boardstatus."""

    __tablename__ = "board_labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    code: Mapped[str | None] = mapped_column(String(250))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    color_code: Mapped[str | None] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer, default=0)
    wip_limit: Mapped[int | None] = mapped_column(Integer)
    is_expanded: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Stage new cards land in / stages that can be moved to / the "done" stage.
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_move_state: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_final_stage: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    board: Mapped[Board] = relationship(back_populates="labels")


# --------------------------------------------------------------------------- permissions


class UserBoardPermission(Base):
    """Orion: users.user_board_permission (+ userboard, user_default_board folded in)."""

    __tablename__ = "user_board_permissions"
    __table_args__ = (UniqueConstraint("user_id", "board_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    role_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id"))
    # The user's default board within that board's workspace.
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    granted_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="board_permissions", foreign_keys=[user_id])
    board: Mapped[Board] = relationship(lazy="joined")
    role: Mapped[Role | None] = relationship(lazy="joined")


class UserAppPermission(Base):
    """Orion: users.user_app_permission."""

    __tablename__ = "user_app_permissions"
    __table_args__ = (UniqueConstraint("user_id", "app_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    app_id: Mapped[int] = mapped_column(ForeignKey("apps.id"))
    permission: Mapped[int] = mapped_column(Integer, default=1)
    granted_by_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    granted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="app_permissions", foreign_keys=[user_id])
    app: Mapped[App] = relationship(lazy="joined")
    granted_by: Mapped[User | None] = relationship(foreign_keys=[granted_by_id], lazy="joined")

