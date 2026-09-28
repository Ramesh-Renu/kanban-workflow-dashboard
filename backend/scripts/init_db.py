"""Migrate the schema to the latest revision and seed master data. Safe to run repeatedly.

    python -m scripts.init_db                      # alembic upgrade head + seed
    python -m scripts.init_db --admin-username admin --admin-email admin@example.com
    python -m scripts.init_db --sql > db/schema.sql  # print DDL only, touch nothing

Schema changes live in migrations/ (Alembic); never edit tables by hand.
"""

import argparse
import getpass
import os
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import create_mock_engine, inspect, select, text
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registers tables on Base.metadata)
from app.constants import USER_TYPE_ADMIN, USER_TYPE_INACTIVE, USER_TYPE_USER
from app.database import Base, engine
from app.models import App, Country, Designation, Role, StatusMaster, Team, User
from app.security import hash_password

STATUS_SEED = [
    # (status_id, type, code, name, sort)
    (USER_TYPE_ADMIN, "USERROLE", "ADM", "Admin", 1),
    (USER_TYPE_USER, "USERROLE", "USR", "User", 2),
    (USER_TYPE_INACTIVE, "USERROLE", "INA", "Inactive", 3),
    (59, "WORKFLOWTYPE", "TOOL", "Tool", 1),
    (60, "WORKFLOWTYPE", "TASK", "Task", 2),
    (70, "TASKPRIORITY", "LOW", "Low", 1),
    (71, "TASKPRIORITY", "MEDIUM", "Medium", 2),
    (72, "TASKPRIORITY", "HIGH", "High", 3),
    (73, "TASKPRIORITY", "CRITICAL", "Critical", 4),
]

ROLE_SEED = [(1, "LEAD", "Lead"), (2, "MEMBER", "Member"), (3, "VIEWER", "Viewer")]

APP_SEED = [
    (114, "TASKMANAGEMENT", "Task Management"),
    (115, "KNOWLEDGEBASE", "Knowledge base"),
    (116, "KIMAI", "Kimai"),
    (117, "LMS", "LMS"),
    (118, "INFOZO", "Infozo"),
    (119, "OPIFEX", "Opifex"),
    (120, "AUTOIAT", "AutoIAT"),
]

COUNTRY_SEED = [
    ("India", "IN"), ("Philippines", "PH"), ("Estonia", "EE"), ("Argentina", "AR"),
    ("Denmark", "DK"), ("Sweden", "SE"), ("Vietnam", "VN"), ("United Kingdom", "GB"),
]

TEAM_SEED = ["Support", "Development", "Design", "QA"]
DESIGNATION_SEED = ["Engineer", "Senior Engineer", "Team Lead", "Manager"]


def print_ddl() -> None:
    def dump(sql, *_, **__):
        print(str(sql.compile(dialect=mock.dialect)).strip() + ";\n")

    mock = create_mock_engine("postgresql+psycopg://", dump)
    Base.metadata.create_all(mock, checkfirst=False)


def migrate() -> None:
    """alembic upgrade head. A DB created before Alembic existed (tables built by
    create_all, no alembic_version) is first marked as revision 0001, which is exactly
    that schema, so the later revisions apply on top of it instead of failing."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "migrations"))
    tables = set(inspect(engine).get_table_names())
    if "users" in tables and "alembic_version" not in tables:
        print("Existing pre-Alembic schema found; stamping it as revision 0001.")
        command.stamp(cfg, "0001")
    command.upgrade(cfg, "head")


def seed(db: Session) -> None:
    for status_id, type_, code, name, sort in STATUS_SEED:
        if db.get(StatusMaster, status_id) is None:
            db.add(StatusMaster(status_id=status_id, type=type_, code=code, name=name, sort_order=sort))
    for role_id, code, name in ROLE_SEED:
        if db.get(Role, role_id) is None:
            db.add(Role(id=role_id, code=code, name=name))
    for app_id, code, name in APP_SEED:
        if db.get(App, app_id) is None:
            db.add(App(id=app_id, code=code, name=name))
    for name, code in COUNTRY_SEED:
        if db.scalar(select(Country).where(Country.name == name)) is None:
            db.add(Country(name=name, code=code))
    for name in TEAM_SEED:
        if db.scalar(select(Team).where(Team.name == name)) is None:
            db.add(Team(name=name))
    for name in DESIGNATION_SEED:
        if db.scalar(select(Designation).where(Designation.name == name)) is None:
            db.add(Designation(name=name))
    db.commit()


def fix_sequences(db: Session) -> None:
    """Seeds insert explicit ids; move serial sequences past them."""
    for table in ("status_master", "roles"):
        pk = "status_id" if table == "status_master" else "id"
        db.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), "
                f"(SELECT COALESCE(MAX({pk}), 1) FROM {table}))"
            )
        )
    db.commit()


def ensure_super_admin(db: Session, username: str, email: str, password: str, display_name: str) -> None:
    existing = db.scalar(select(User).where(User.username == username))
    if existing:
        print(f"Super admin '{username}' already exists — left unchanged.")
        return
    db.add(
        User(
            username=username,
            email=email.lower(),
            password_hash=hash_password(password),
            display_name=display_name,
            job_title="Administrator",
            is_super_admin=True,
            user_type_id=USER_TYPE_ADMIN,
            has_profile=True,
        )
    )
    db.commit()
    print(f"Created super admin '{username}'.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sql", action="store_true", help="print CREATE TABLE statements and exit")
    parser.add_argument("--admin-username", default=os.getenv("ADMIN_USERNAME"))
    parser.add_argument("--admin-email", default=os.getenv("ADMIN_EMAIL"))
    parser.add_argument("--admin-name", default=os.getenv("ADMIN_DISPLAY_NAME", "Administrator"))
    args = parser.parse_args()

    if args.sql:
        print_ddl()
        return

    migrate()
    print("Schema up to date.")
    with Session(engine) as db:
        seed(db)
        fix_sequences(db)
        print("Master data seeded.")

        if args.admin_username:
            password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Super admin password: ")
            if len(password) < 8:
                sys.exit("Password must be at least 8 characters.")
            ensure_super_admin(db, args.admin_username, args.admin_email or f"{args.admin_username}@localhost",
                               password, args.admin_name)


if __name__ == "__main__":
    main()
