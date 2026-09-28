"""Create a login account (username + password) from the command line.

    python -m scripts.create_user jdoe jdoe@example.com "John Doe" [--admin] [--super-admin]

The password is read from the USER_PASSWORD env var or prompted for.
Admins still add the account to Orion (team, workspace boards) from Settings → Users.
"""

import argparse
import getpass
import os
import sys

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.constants import USER_TYPE_ADMIN, USER_TYPE_USER
from app.database import engine
from app.models import User
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("username")
    parser.add_argument("email")
    parser.add_argument("display_name")
    parser.add_argument("--job-title")
    parser.add_argument("--admin", action="store_true", help="user type Admin (can manage users/workspaces)")
    parser.add_argument("--super-admin", action="store_true")
    args = parser.parse_args()

    password = os.getenv("USER_PASSWORD") or getpass.getpass("Password: ")
    if len(password) < 8:
        sys.exit("Password must be at least 8 characters.")

    with Session(engine) as db:
        clash = db.scalar(
            select(User.id).where(
                or_(func.lower(User.username) == args.username.lower(), func.lower(User.email) == args.email.lower())
            )
        )
        if clash:
            sys.exit("Username or email already exists.")
        admin = args.admin or args.super_admin
        db.add(
            User(
                username=args.username,
                email=args.email.lower(),
                password_hash=hash_password(password),
                display_name=args.display_name,
                job_title=args.job_title,
                is_super_admin=args.super_admin,
                user_type_id=USER_TYPE_ADMIN if admin else USER_TYPE_USER,
                has_profile=admin,
            )
        )
        db.commit()
    print(f"Created user '{args.username}'.")


if __name__ == "__main__":
    main()
