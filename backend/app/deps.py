import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.constants import USER_TYPE_ADMIN, USER_TYPE_INACTIVE
from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> HTTPException:
    # The frontend only force-logs-out on 401s whose message mentions token/jwt/expired,
    # so keep those words in auth failures.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _unauthorized("Missing bearer token")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expired")
    except (jwt.PyJWTError, ValueError):
        # ValueError: tokens issued before the switch to UUID user ids.
        raise _unauthorized("Invalid token")

    user = db.get(User, user_id)
    if user is None or not user.is_active or user.user_type_id == USER_TYPE_INACTIVE:
        raise _unauthorized("Token user is inactive or unknown")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def is_admin(user: User) -> bool:
    return user.is_super_admin or user.user_type_id == USER_TYPE_ADMIN


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
