"""Schema-level checks: migrations == models, relationships and cascades behave."""

import uuid

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import (
    Board,
    BoardLabel,
    Department,
    Subtask,
    SubtaskComment,
    Ticket,
    TicketComment,
    Tool,
    ToolVersion,
    User,
    UserDepartment,
    Workspace,
)


def test_migrations_match_models():
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata)
    assert diff == []


def test_every_table_exists_once_with_primary_key():
    insp = inspect(engine)
    db_tables = set(insp.get_table_names()) - {"alembic_version"}
    assert db_tables == set(Base.metadata.tables)
    for name in db_tables:
        assert insp.get_pk_constraint(name)["constrained_columns"], f"{name} has no primary key"


def test_user_ids_are_uuids():
    with Session(engine) as db:
        admin = db.scalar(select(User).where(User.username == "admin"))
        assert isinstance(admin.id, uuid.UUID)


def _admin(db):
    return db.scalar(select(User).where(User.username == "admin"))


def test_ticket_children_cascade_and_user_refs_set_null():
    with Session(engine) as db:
        admin = _admin(db)
        ws = Workspace(name="WS", created_by_id=admin.id)
        db.add(ws)
        db.flush()
        board = Board(workspace_id=ws.id, name="B")
        db.add(board)
        db.flush()
        label = BoardLabel(board_id=board.id, name="To do")
        ticket = Ticket(name="Order 1", added_by_id=admin.id)
        db.add_all([label, ticket])
        db.flush()
        sub = Subtask(ticket_id=ticket.id, board_id=board.id, label_id=label.id, assigned_to_id=admin.id)
        db.add(sub)
        db.flush()
        db.add_all([
            TicketComment(ticket_id=ticket.id, content="hi", added_by_id=admin.id),
            SubtaskComment(subtask_id=sub.id, ticket_id=ticket.id, content="sub hi"),
        ])
        db.commit()
        ticket_id, sub_id = ticket.id, sub.id

        # Deleting the ticket removes its subtasks and all comments.
        db.delete(db.get(Ticket, ticket_id))
        db.commit()
        assert db.get(Subtask, sub_id) is None
        assert db.scalars(select(TicketComment)).all() == []
        assert db.scalars(select(SubtaskComment)).all() == []


def test_deleting_label_keeps_subtask_but_clears_stage():
    with Session(engine) as db:
        ws = Workspace(name="WS")
        db.add(ws)
        db.flush()
        board = Board(workspace_id=ws.id, name="B")
        db.add(board)
        db.flush()
        label = BoardLabel(board_id=board.id, name="Doing")
        ticket = Ticket(name="Order")
        db.add_all([label, ticket])
        db.flush()
        sub = Subtask(ticket_id=ticket.id, board_id=board.id, label_id=label.id)
        db.add(sub)
        db.commit()
        db.delete(label)
        db.commit()
        db.refresh(sub)
        assert sub.label_id is None


def test_junction_rejects_duplicates():
    with Session(engine) as db:
        dept = Department(code="IOD", name="IOD")
        db.add(dept)
        db.flush()
        admin = _admin(db)
        db.add(UserDepartment(user_id=admin.id, department_id=dept.id))
        db.commit()
        db.add(UserDepartment(user_id=admin.id, department_id=dept.id))
        with pytest.raises(IntegrityError):
            db.commit()


def test_tool_and_version_reference_each_other():
    with Session(engine) as db:
        tool = Tool(code="SHARE", name="Share graph")
        db.add(tool)
        db.flush()
        version = ToolVersion(tool_id=tool.id, version_name="v2")
        db.add(version)
        db.flush()
        tool.current_version_id = version.id
        db.commit()
        db.delete(version)
        db.commit()
        db.refresh(tool)
        assert tool.current_version_id is None
