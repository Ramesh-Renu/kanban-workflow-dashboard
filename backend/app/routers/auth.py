import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.constants import USER_TYPE_INACTIVE, USER_TYPE_USER
from app.database import get_db
from app.deps import get_current_user, get_optional_user, is_admin, require_admin
from app.models import RefreshToken, User
from app.schemas import (
    ChangePasswordRequest,
    CreateAccountRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
)
from app.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from app.serializers import build_user_details, user_info

router = APIRouter(tags=["auth"])

INVALID_CREDENTIALS = "Invalid username or password"
_DUMMY_HASH = hash_password("timing-equaliser")


def _issue_tokens(db: Session, user: User, request: Request) -> dict:
    access, exp = create_access_token(user.id, user.username, is_admin(user))
    raw_refresh, refresh_hash, refresh_exp = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_exp,
            user_agent=(request.headers.get("user-agent") or "")[:500],
        )
    )
    db.commit()
    return {
        "status": True,
        "tokenType": "Bearer",
        "accessToken": access,
        "expiresOn": exp,
        "refreshToken": raw_refresh,
        "refreshExpiresOn": int(refresh_exp.timestamp()),
    }


@router.post("/master/auth/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    ident = body.username.strip().lower()
    user = db.scalar(
        select(User).where(or_(func.lower(User.username) == ident, func.lower(User.email) == ident))
    )
    now = datetime.now(UTC)

    if user is None:
        # Spend the same time as a real check so usernames can't be probed by timing.
        verify_password(body.password, _DUMMY_HASH)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_CREDENTIALS)

    if user.locked_until and user.locked_until > now:
        raise HTTPException(status.HTTP_423_LOCKED, "Account temporarily locked. Try again later.")

    if not verify_password(body.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= settings.max_failed_logins:
            user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
            user.failed_login_count = 0
        db.commit()
        # 400 (not 401) so the UI's "session expired" interceptor does not fire on the login page.
        raise HTTPException(status.HTTP_400_BAD_REQUEST, INVALID_CREDENTIALS)

    if not user.is_active or user.user_type_id == USER_TYPE_INACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account is inactive. Contact an administrator.")

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    return _issue_tokens(db, user, request)


@router.post("/master/auth/refresh")
def refresh(body: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    now = datetime.now(UTC)
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(body.refreshToken)))
    if record is None or record.expires_at <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token expired or invalid")

    if record.revoked_at is not None:
        # A revoked token being replayed means it may have leaked: kill every session of this user.
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == record.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token expired or invalid")

    user = db.get(User, record.user_id)
    if user is None or not user.is_active or user.user_type_id == USER_TYPE_INACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token user is inactive")

    record.revoked_at = now  # rotate: each refresh token is single-use
    return _issue_tokens(db, user, request)


@router.put("/master/api/AdManagement/sign-out")
@router.post("/master/auth/logout")
def logout(
    body: LogoutRequest | None = Body(default=None),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Revoke the given refresh token, or every session of the caller when none is given.

    Works without a valid access token so an expired session can still sign out cleanly.
    """
    query = update(RefreshToken).where(RefreshToken.revoked_at.is_(None))
    if body and body.refreshToken:
        query = query.where(RefreshToken.token_hash == hash_refresh_token(body.refreshToken))
    elif user is not None:
        query = query.where(RefreshToken.user_id == user.id)
    else:
        return {"status": True, "message": "Signed out"}
    db.execute(query.values(revoked_at=datetime.now(UTC)))
    db.commit()
    return {"status": True, "message": "Signed out"}


@router.post("/master/auth/change-password")
def change_password(
    body: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not verify_password(body.currentPassword, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.password_hash = hash_password(body.newPassword)
    user.password_changed_at = datetime.now(UTC)
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
    return {"status": True, "message": "Password changed. Please sign in again."}


# ---------------------------------------------------------------- account admin


@router.post("/master/auth/accounts")
def create_account(body: CreateAccountRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if body.isSuperAdmin and not admin.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super admin can create super admins")
    exists = db.scalar(
        select(User.id).where(
            or_(func.lower(User.username) == body.username.lower(), func.lower(User.email) == body.email.lower())
        )
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username or email already exists")
    user = User(
        username=body.username.strip(),
        email=body.email.strip().lower(),
        password_hash=hash_password(body.password),
        display_name=body.displayName.strip(),
        job_title=body.jobTitle,
        is_super_admin=body.isSuperAdmin,
        user_type_id=USER_TYPE_USER,
    )
    db.add(user)
    db.commit()
    return {"status": True, "message": "Account created", "data": user_info(user)}


@router.post("/master/auth/reset-password")
def reset_password(body: ResetPasswordRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, body.userId)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.is_super_admin and not admin.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super admin can reset a super admin")
    user.password_hash = hash_password(body.newPassword)
    user.password_changed_at = datetime.now(UTC)
    user.failed_login_count = 0
    user.locked_until = None
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
    return {"status": True, "message": "Password reset"}


# ---------------------------------------------------------------- current user


@router.get("/master/api/Login/userinfo")
def userinfo(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_details(db, user)


@router.get("/master/api/Login/userdetail/{user_id}")
def userdetail(user_id: uuid.UUID, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return build_user_details(db, target)


@router.put("/master/api/AdManagement/ad-user-photosync")
def photo_sync(_: User = Depends(get_current_user)):
    # Photos came from Azure AD; with DB login there is nothing to sync.
    return {"status": True, "message": "Nothing to sync", "data": []}
