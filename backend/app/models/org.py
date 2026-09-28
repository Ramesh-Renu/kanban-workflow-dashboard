"""Organisation structure: departments, locations, languages, shifts, reporting lines."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import AuditMixin


class Organization(AuditMixin, Base):
    """Orion: master.organization."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Department(AuditMixin, Base):
    """Orion: master.department (the IOD / design / QA ... teams a card flows through)."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class WorkspaceDepartment(AuditMixin, Base):
    """Which departments work in a workspace. Orion: master.work_space_department."""

    __tablename__ = "workspace_departments"
    __table_args__ = (UniqueConstraint("workspace_id", "department_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))


class DepartmentBoard(AuditMixin, Base):
    """Which boards a department owns. Orion: board.departmentboard."""

    __tablename__ = "department_boards"
    __table_args__ = (UniqueConstraint("department_id", "board_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))


class UserDepartment(AuditMixin, Base):
    """Orion: users.userdepartment."""

    __tablename__ = "user_departments"
    __table_args__ = (UniqueConstraint("user_id", "department_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))


class RolePermission(AuditMixin, Base):
    """Permission matrix: what a board role may do, optionally per department. Orion: master.rolesetting."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "department_id", "permission", "action"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    permission: Mapped[str] = mapped_column(String(100))  # feature, e.g. "Order ticket"
    action: Mapped[str] = mapped_column(String(50))  # e.g. "Create", "Edit", "Delete"
    is_allowed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class UserManager(AuditMixin, Base):
    """Reporting line: user reports to manager. Orion: users.reportmanager."""

    __tablename__ = "user_managers"
    __table_args__ = (UniqueConstraint("user_id", "manager_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    manager_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)


class Shift(AuditMixin, Base):
    """Orion: master.shift."""

    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    start_time: Mapped[str] = mapped_column(String(10))  # "HH:MM", same format as users.shift_from
    end_time: Mapped[str] = mapped_column(String(10))


class Location(AuditMixin, Base):
    """Orion: master.location."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class UserLocation(AuditMixin, Base):
    """Orion: users.userlocation."""

    __tablename__ = "user_locations"
    __table_args__ = (UniqueConstraint("user_id", "location_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"))


class Language(AuditMixin, Base):
    """Languages staff work in. Orion: master.language."""

    __tablename__ = "languages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))


class UserLanguage(AuditMixin, Base):
    """Orion: users.userlanguage."""

    __tablename__ = "user_languages"
    __table_args__ = (UniqueConstraint("user_id", "language_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.id", ondelete="CASCADE"))


class UserCountry(AuditMixin, Base):
    """Countries / regions a user covers. Orion: users.usercountryregion."""

    __tablename__ = "user_countries"
    __table_args__ = (UniqueConstraint("user_id", "country_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id", ondelete="CASCADE"))
