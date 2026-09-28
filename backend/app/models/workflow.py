"""Workflow configuration: flows, stage templates & transitions, SLAs, workspace settings."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, false
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import GEN_UUID, JSON, AuditMixin


class Workflow(AuditMixin, Base):
    """A reusable flow graph (nodes/edges in flow_details). Orion: board.flow."""

    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    unique_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, default=uuid.uuid4, server_default=GEN_UUID)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    flow_details: Mapped[dict | None] = mapped_column(JSON)
    workflow_type_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)


class ToolWorkflow(AuditMixin, Base):
    """Default workflow for a tool. Orion: board.tool_flow."""

    __tablename__ = "tool_workflows"
    __table_args__ = (UniqueConstraint("tool_id", "workflow_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"))


class StageTemplate(AuditMixin, Base):
    """Standard stages a department's boards start with. Orion: master.board_status_master."""

    __tablename__ = "stage_templates"
    __table_args__ = (UniqueConstraint("department_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(250))
    name: Mapped[str] = mapped_column(String(250))
    color_code: Mapped[str | None] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_move_state: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class StageTransition(Base):
    """Allowed stage moves (within or across departments).

    Orion: board.board_status_workflow + master.board_status_movements (same data, merged).
    """

    __tablename__ = "stage_transitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    target_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    source_stage_code: Mapped[str] = mapped_column(String(250))
    target_stage_code: Mapped[str] = mapped_column(String(250))
    # Only allow the move when the card came from this stage (Orion source_prv_label_code).
    previous_stage_code: Mapped[str | None] = mapped_column(String(250))


class ToolStageSla(AuditMixin, Base):
    """Time allowed per stage for a tool. Orion: master.tool_stage_sla."""

    __tablename__ = "tool_stage_slas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="CASCADE"))
    sla_ranges: Mapped[dict | None] = mapped_column(JSON)


class WorkspaceFlag(AuditMixin, Base):
    """Per-workspace flags, e.g. free-flow labels. Orion: master.common_flag."""

    __tablename__ = "workspace_flags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    type: Mapped[str | None] = mapped_column(String(100))
    type_name: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)


class AppConfiguration(AuditMixin, Base):
    """Named JSON settings, e.g. dashboard health formulas. Orion: master.master_configuration."""

    __tablename__ = "app_configuration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(200))
    value: Mapped[dict | None] = mapped_column(JSON)


class OrderLabel(AuditMixin, Base):
    """Labels that can be put on an order. Orion: master.label."""

    __tablename__ = "order_labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(1000))
    color_code: Mapped[str | None] = mapped_column(String(50))
