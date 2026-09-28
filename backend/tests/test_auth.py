from datetime import UTC, datetime, timedelta

import jwt

from app.config import get_settings
from tests.conftest import ADMIN, USER, login


def test_login_with_username_or_email(client):
    by_name = login(client, ADMIN[0], ADMIN[2])
    assert by_name.status_code == 200
    body = by_name.json()
    assert body["tokenType"] == "Bearer" and body["accessToken"] and body["refreshToken"]
    assert body["expiresOn"] > datetime.now(UTC).timestamp()

    assert login(client, ADMIN[1].upper(), ADMIN[2]).status_code == 200


def test_wrong_password_and_unknown_user_look_the_same(client):
    wrong = login(client, ADMIN[0], "nope-nope")
    unknown = login(client, "ghost", "nope-nope")
    assert wrong.status_code == unknown.status_code == 400
    assert wrong.json()["message"] == unknown.json()["message"] == "Invalid username or password"


def test_account_locks_after_repeated_failures(client):
    for _ in range(get_settings().max_failed_logins):
        login(client, USER[0], "wrong-password")
    assert login(client, USER[0], USER[2]).status_code == 423


def test_protected_endpoint_requires_valid_token(client):
    assert client.get("/master/api/Login/userinfo").status_code == 401
    bad = client.get("/master/api/Login/userinfo", headers={"Authorization": "Bearer garbage"})
    assert bad.status_code == 401
    assert "token" in bad.json()["message"].lower()  # UI keys its forced logout off this word


def test_expired_token_rejected(client):
    s = get_settings()
    expired = jwt.encode(
        {"sub": "1", "iss": s.jwt_issuer, "type": "access",
         "exp": int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())},
        s.jwt_secret, algorithm=s.jwt_algorithm,
    )
    r = client.get("/master/api/Login/userinfo", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401 and r.json()["message"] == "Token expired"


def test_refresh_rotates_and_detects_reuse(client):
    first = login(client, USER[0], USER[2]).json()["refreshToken"]
    rotated = client.post("/master/auth/refresh", json={"refreshToken": first})
    assert rotated.status_code == 200
    second = rotated.json()["refreshToken"]

    # Replaying the used token is rejected and revokes the whole family.
    assert client.post("/master/auth/refresh", json={"refreshToken": first}).status_code == 401
    assert client.post("/master/auth/refresh", json={"refreshToken": second}).status_code == 401


def test_logout_revokes_refresh_token(client, user_headers):
    refresh = login(client, USER[0], USER[2]).json()["refreshToken"]
    out = client.put("/master/api/AdManagement/sign-out", json={"refreshToken": refresh}, headers=user_headers)
    assert out.status_code == 200 and out.json()["status"] is True
    assert client.post("/master/auth/refresh", json={"refreshToken": refresh}).status_code == 401


def test_change_password(client, user_headers):
    r = client.post("/master/auth/change-password", headers=user_headers,
                    json={"currentPassword": USER[2], "newPassword": "Brand#New123"})
    assert r.status_code == 200
    assert login(client, USER[0], USER[2]).status_code == 400
    assert login(client, USER[0], "Brand#New123").status_code == 200


def test_inactive_user_cannot_login(client, admin_headers):
    jdoe_id = client.get("/master/api/AdManagement/ad-users", headers=admin_headers).json()[0]["regId"]
    client.post("/UserManagement/api/UserManagement/update_user_type", headers=admin_headers,
                json={"userId": jdoe_id, "userTypeId": 47, "previousUserTypeId": 46})
    assert login(client, USER[0], USER[2]).status_code == 403


def test_admin_creates_account(client, admin_headers, user_headers):
    payload = {"username": "new1", "email": "new1@example.com", "password": "Pass#12345", "displayName": "New One"}
    assert client.post("/master/auth/accounts", json=payload, headers=user_headers).status_code == 403
    assert client.post("/master/auth/accounts", json=payload, headers=admin_headers).status_code == 200
    assert client.post("/master/auth/accounts", json=payload, headers=admin_headers).status_code == 409
    assert login(client, "new1", "Pass#12345").status_code == 200
