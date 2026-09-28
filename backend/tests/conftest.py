"""Tests run against a real PostgreSQL database (DATABASE_URL), which they wipe.

The schema is built once per run through the Alembic migrations (so the migrations
themselves are exercised); each test then starts from empty tables plus seed data.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.constants import USER_TYPE_USER
from app.database import Base, engine
from app.main import app
from app.models import User
from app.security import hash_password
from scripts.init_db import ensure_super_admin, fix_sequences, migrate, seed

ADMIN = ("admin", "admin@example.com", "Admin#12345")
USER = ("jdoe", "jdoe@example.com", "User#12345")


@pytest.fixture(scope="session", autouse=True)
def migrated_schema():
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    migrate()
    yield


@pytest.fixture(autouse=True)
def fresh_db(migrated_schema):
    tables = ", ".join(f'"{name}"' for name in Base.metadata.tables)  # CASCADE handles order
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    with Session(engine) as db:
        seed(db)
        fix_sequences(db)
        ensure_super_admin(db, ADMIN[0], ADMIN[1], ADMIN[2], "Admin User")
        db.add(User(username=USER[0], email=USER[1], password_hash=hash_password(USER[2]),
                    display_name="John Doe", user_type_id=USER_TYPE_USER))
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def login(client, username, password):
    return client.post("/master/auth/login", json={"username": username, "password": password})


@pytest.fixture
def admin_headers(client):
    token = login(client, ADMIN[0], ADMIN[2]).json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(client):
    token = login(client, USER[0], USER[2]).json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}
