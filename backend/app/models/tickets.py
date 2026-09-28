"""Customers, tickets (orders / main tasks) and subtasks (tools) — the Kanban cards.

Orion names: a *ticket* is an order/main task (tickets.ticket); a *subtask* is a tool
line on that order that moves through boards (tickets.tool_detail).
Id-list columns (`*_ids`) are integer arrays exactly as in Orion; they hold ids from
status_master / lookup tables and are not FK-enforced.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, false, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._base import JSON, AuditMixin, BigId, IntArray, user_fk

# --------------------------------------------------------------------------- customers


class Customer(AuditMixin, Base):
    """Orion: customers.customer."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ref_id: Mapped[int | None] = mapped_column(Integer, index=True)  # id in the external customer master
    code: Mapped[str | None] = mapped_column(String(20), index=True)
    company_name: Mapped[str | None] = mapped_column(String(800))
    phone_no: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(250))
    website: Mapped[str | None] = mapped_column(String(1000))
    translation_approval: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(String(2000))
    note: Mapped[str | None] = mapped_column(String(4000))
    common_data: Mapped[dict | None] = mapped_column(JSON)
    markets: Mapped[dict | None] = mapped_column(JSON)
    languages: Mapped[dict | None] = mapped_column(JSON)
    existing_subscription_type_id: Mapped[int | None] = mapped_column(ForeignKey("subscription_types.id"))
    existing_subscription_name: Mapped[str | None] = mapped_column(String(800))
    subscription_type_id: Mapped[int | None] = mapped_column(ForeignKey("subscription_types.id"))
    existing_tool_data: Mapped[dict | None] = mapped_column(JSON)
    tool_center_link: Mapped[str | None] = mapped_column(String(5000))


class CustomerOrder(AuditMixin, Base):
    """Orion: customers.customer_order."""

    __tablename__ = "customer_orders"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id", ondelete="SET NULL"), index=True)
    order_no: Mapped[str | None] = mapped_column(Text)


# --------------------------------------------------------------------------- tickets


class CommentType(AuditMixin, Base):
    """Orion: tickets.comments_type."""

    __tablename__ = "comment_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))


class Ticket(AuditMixin, Base):
    """An order / main task. Orion: tickets.ticket."""

    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_no: Mapped[str | None] = mapped_column(String(200), index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    ticket_type: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), index=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"), index=True)
    added_by_id: Mapped[uuid.UUID | None] = user_fk()
    assigned_to_id: Mapped[uuid.UUID | None] = user_fk(index=True)
    position: Mapped[int | None] = mapped_column(Integer)
    created_title: Mapped[str | None] = mapped_column(Text, server_default=text("'Created by'"))

    order_ref: Mapped[str | None] = mapped_column(String(4000))  # Orion order_id (free text)
    order_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    expected_delivery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subscription_type_id: Mapped[int | None] = mapped_column(ForeignKey("subscription_types.id"))
    order_value: Mapped[int | None] = mapped_column(Integer)
    start_up_fee: Mapped[int | None] = mapped_column(Integer)

    is_ipo: Mapped[bool | None] = mapped_column(Boolean)
    is_new_customer: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_proceed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_process_order: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    process_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    isin: Mapped[str | None] = mapped_column(String(20))
    symbol: Mapped[str | None] = mapped_column(String(50))

    order_category_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    order_type_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    order_value_type_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    start_up_fee_type_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    primary_market_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    redesign_category_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    upsell_category_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    priority_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    industry_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    order_label_ids: Mapped[list[int] | None] = mapped_column(IntArray)


class TicketCompany(AuditMixin, Base):
    """Company details captured on an order. Orion: tickets.ticket_company."""

    __tablename__ = "ticket_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    website_link: Mapped[str | None] = mapped_column(Text)
    is_ipo: Mapped[bool | None] = mapped_column(Boolean)
    ipo_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    headquarters_address: Mapped[str | None] = mapped_column(Text)
    ir_address: Mapped[str | None] = mapped_column(Text)
    is_same_as_address: Mapped[bool | None] = mapped_column(Boolean)
    industry_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    region_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    country_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    language_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    instrument_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    currency_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    other_data: Mapped[dict | None] = mapped_column(JSON)
    contact_info: Mapped[dict | None] = mapped_column(JSON)
    branding_guidelines_details: Mapped[dict | None] = mapped_column(JSON)


class TicketAssignee(AuditMixin, Base):
    """Orion: tickets.ticket_assignee."""

    __tablename__ = "ticket_assignees"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE", index=True)
    assignee_type: Mapped[str | None] = mapped_column(String(50))
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TicketComment(AuditMixin, Base):
    """Orion: tickets.ticket_comments."""

    __tablename__ = "ticket_comments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("comment_types.id"))
    content: Mapped[str | None] = mapped_column(Text)
    added_by_id: Mapped[uuid.UUID | None] = user_fk()


class TicketAttachment(AuditMixin, Base):
    """Orion: tickets.ticket_attachment."""

    __tablename__ = "ticket_attachments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    comment_id: Mapped[int | None] = mapped_column(ForeignKey("ticket_comments.id", ondelete="CASCADE"), index=True)
    file_type: Mapped[str | None] = mapped_column(String(200))
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(2000))
    blob_name: Mapped[str | None] = mapped_column(Text)


class TicketHistory(AuditMixin, Base):
    """Change history snapshots. Orion: tickets.ticket_history."""

    __tablename__ = "ticket_history"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("workspaces.id", ondelete="SET NULL"))
    history_data: Mapped[dict | None] = mapped_column(JSON)


class TicketStatusLog(Base):
    """Every status change of a ticket. Orion: tickets.ticket_status."""

    __tablename__ = "ticket_status_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    created_by_id: Mapped[uuid.UUID | None] = user_fk()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TicketStageLog(AuditMixin, Base):
    """Every board/stage move of a ticket.

    Orion: tickets.ticket_status_track + tickets.ticket_board_tracker (same events, merged).
    """

    __tablename__ = "ticket_stage_log"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"))
    label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="SET NULL"))
    previous_label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="SET NULL"))
    moved_by_id: Mapped[uuid.UUID | None] = user_fk()
    moved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    remarks: Mapped[str | None] = mapped_column(String(4000))


class TicketWorkLog(AuditMixin, Base):
    """Time worked on a ticket per department. Orion: tickets.ticket_work_log."""

    __tablename__ = "ticket_work_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    assignee_id: Mapped[uuid.UUID | None] = user_fk()
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --------------------------------------------------------------------------- subtasks (tools)


class Subtask(AuditMixin, Base):
    """A tool line on an order that moves through boards. Orion: tickets.tool_detail."""

    __tablename__ = "subtasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    code: Mapped[str | None] = mapped_column(String(200), index=True)  # Orion ticket_tool_code
    name: Mapped[str | None] = mapped_column(String(200))  # Orion sub_task_name
    tool_id: Mapped[int | None] = mapped_column(ForeignKey("tools.id"))
    subscription_type_id: Mapped[int | None] = mapped_column(ForeignKey("subscription_types.id"))
    workflow_id: Mapped[int | None] = mapped_column(ForeignKey("workflows.id", ondelete="SET NULL"))
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"), index=True)
    label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="SET NULL"), index=True)
    status_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    order_type_id: Mapped[int | None] = mapped_column(ForeignKey("status_master.status_id"))
    added_by_id: Mapped[uuid.UUID | None] = user_fk()
    assigned_to_id: Mapped[uuid.UUID | None] = user_fk(index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    position: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    requirement: Mapped[dict | None] = mapped_column(JSON)  # Orion tool_requirement
    data: Mapped[dict | None] = mapped_column(JSON)  # Orion tool_data
    check_list: Mapped[list | None] = mapped_column(JSON, server_default=text("'[]'::jsonb"))
    priority_ids: Mapped[list[int] | None] = mapped_column(IntArray)
    free_flow_label_ids: Mapped[list[int] | None] = mapped_column(IntArray)


class SubtaskLink(AuditMixin, Base):
    """Links / files attached to a subtask's info panel. Orion: tickets.ticket_tool_info."""

    __tablename__ = "subtask_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))  # "link" | "attachment"
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(Text)
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(2000))
    blob_name: Mapped[str | None] = mapped_column(Text)
    blob_uri: Mapped[str | None] = mapped_column(Text)


class SubtaskStageLog(AuditMixin, Base):
    """Every board/stage a subtask passes through. Orion: tickets.tool_board_log."""

    __tablename__ = "subtask_stage_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"))
    label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="SET NULL"))
    moved_by_id: Mapped[uuid.UUID | None] = user_fk()
    moved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    action_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)  # groups moves done in one action
    is_moved: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class SubtaskAssignee(AuditMixin, Base):
    """Who worked a subtask in a given stage. Orion: tickets.tool_assignee."""

    __tablename__ = "subtask_assignees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stage_log_id: Mapped[int] = mapped_column(ForeignKey("subtask_stage_log.id", ondelete="CASCADE"), index=True)
    board_id: Mapped[int | None] = mapped_column(ForeignKey("boards.id", ondelete="SET NULL"))
    label_id: Mapped[int | None] = mapped_column(ForeignKey("board_labels.id", ondelete="SET NULL"))
    user_id: Mapped[uuid.UUID | None] = user_fk(ondelete="CASCADE", index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    unassigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_unassigned: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    sequence: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class SubtaskWorkLog(AuditMixin, Base):
    """Start/stop time entries of an assignee. Orion: tickets.tool_work_log."""

    __tablename__ = "subtask_work_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignee_id: Mapped[int] = mapped_column(ForeignKey("subtask_assignees.id", ondelete="CASCADE"), index=True)
    moved_by_id: Mapped[uuid.UUID | None] = user_fk()
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    type: Mapped[int | None] = mapped_column(Integer)
    remarks: Mapped[str | None] = mapped_column(Text)


class SubtaskComment(AuditMixin, Base):
    """Orion: tickets.tool_comments."""

    __tablename__ = "subtask_comments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("comment_types.id"))
    content: Mapped[str | None] = mapped_column(Text)
    added_by_id: Mapped[uuid.UUID | None] = user_fk()


class SubtaskAttachment(AuditMixin, Base):
    """Orion: tickets.tool_attachment."""

    __tablename__ = "subtask_attachments"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    subtask_id: Mapped[int | None] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    comment_id: Mapped[int | None] = mapped_column(ForeignKey("subtask_comments.id", ondelete="CASCADE"))
    file_type: Mapped[str | None] = mapped_column(String(200))
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(2000))
    blob_name: Mapped[str | None] = mapped_column(Text)


class SubtaskDeleteReason(AuditMixin, Base):
    """Why a subtask was removed. Orion: tickets.tool_delete_reason."""

    __tablename__ = "subtask_delete_reasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    reason_id: Mapped[int] = mapped_column(ForeignKey("status_master.status_id"))  # type DELETETOOL
    description: Mapped[str | None] = mapped_column(Text)


class SubtaskDueDateLog(AuditMixin, Base):
    """Due-date changes with a reason. Orion: tickets.tool_duedate_log."""

    __tablename__ = "subtask_due_date_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, default=0)


class SubtaskHistory(AuditMixin, Base):
    """Orion: tickets.tool_history."""

    __tablename__ = "subtask_history"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    subtask_id: Mapped[int] = mapped_column(ForeignKey("subtasks.id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("workspaces.id", ondelete="SET NULL"))
    history_data: Mapped[dict | None] = mapped_column(JSON)

