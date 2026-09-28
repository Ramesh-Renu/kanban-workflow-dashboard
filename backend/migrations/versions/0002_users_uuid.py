"""users.id integer -> UUID (Orion RegId style), keeping every row and reference.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-28

Each column that references users.id gets a new column filled through a join on the
old key, then the old column and its constraints are swapped out. Existing access
tokens (which carry the integer id) stop working; refresh tokens keep working, so
signed-in users are renewed transparently.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, column, ON DELETE, NOT NULL, indexed)
USER_REFS = [
    ("refresh_tokens", "user_id", "CASCADE", True, True),
    ("workspaces", "created_by_id", "SET NULL", False, False),
    ("user_board_permissions", "user_id", "CASCADE", True, True),
    ("user_board_permissions", "granted_by_id", "SET NULL", False, False),
    ("user_app_permissions", "user_id", "CASCADE", True, True),
    ("user_app_permissions", "granted_by_id", "SET NULL", False, False),
]
# Unique constraints that include a user column (dropped together with it).
USER_UNIQUES = [
    ("user_board_permissions", ("user_id", "board_id")),
    ("user_app_permissions", ("user_id", "app_id")),
]


def _swap_user_key(new_type: str, new_default: str, restore_0001_ondelete: bool = False) -> None:
    op.execute(f"ALTER TABLE users ADD COLUMN new_id {new_type} {new_default}")

    for table, col, _, _, _ in USER_REFS:
        op.execute(f"ALTER TABLE {table} ADD COLUMN {col}_new {new_type.split()[0].replace('SERIAL', 'integer')}")
        op.execute(f"UPDATE {table} t SET {col}_new = u.new_id FROM users u WHERE t.{col} = u.id")
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {table}_{col}_fkey")

    for table, cols in USER_UNIQUES:
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {table}_{'_'.join(cols)}_key")

    for table, col, _, not_null, _ in USER_REFS:
        op.execute(f"ALTER TABLE {table} DROP COLUMN {col}")
        op.execute(f"ALTER TABLE {table} RENAME COLUMN {col}_new TO {col}")
        if not_null:
            op.execute(f"ALTER TABLE {table} ALTER COLUMN {col} SET NOT NULL")

    op.execute("ALTER TABLE users DROP CONSTRAINT users_pkey")
    op.execute("ALTER TABLE users DROP COLUMN id")
    op.execute("ALTER TABLE users RENAME COLUMN new_id TO id")
    op.execute("ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id)")

    for table, col, ondelete, _, indexed in USER_REFS:
        if restore_0001_ondelete and ondelete == "SET NULL":
            ondelete = "NO ACTION"  # 0001 had no ON DELETE on audit references
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT {table}_{col}_fkey "
            f"FOREIGN KEY ({col}) REFERENCES users (id) ON DELETE {ondelete}"
        )
        if indexed:
            op.execute(f"CREATE INDEX ix_{table}_{col} ON {table} ({col})")

    for table, cols in USER_UNIQUES:
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {table}_{'_'.join(cols)}_key UNIQUE ({', '.join(cols)})")


def upgrade() -> None:
    _swap_user_key("uuid", "NOT NULL DEFAULT gen_random_uuid()")


def downgrade() -> None:
    # SERIAL numbers the existing rows 1..n and becomes the new integer key.
    _swap_user_key("SERIAL", "", restore_0001_ondelete=True)
    op.execute("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users))")
