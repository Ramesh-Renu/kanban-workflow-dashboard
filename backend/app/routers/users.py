import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.constants import USER_TYPE_ADMIN, USER_TYPE_INACTIVE, USER_TYPE_USER
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import (
    App,
    Board,
    Designation,
    Team,
    User,
    UserAppPermission,
    UserBoardPermission,
)
from app.schemas import (
    AddUserRequest,
    AppPermissionRequest,
    BoardPermissionRequest,
    UpdateUserTypeRequest,
    UserListRequest,
)
from app.serializers import user_brief, user_info, user_row

router = APIRouter(tags=["users"])

VALID_USER_TYPES = {USER_TYPE_ADMIN, USER_TYPE_USER, USER_TYPE_INACTIVE}
SORT_COLUMNS = {
    "name": User.display_name,
    "displayname": User.display_name,
    "email": User.email,
    "team": Team.name,
    "designation": Designation.name,
    "created": User.created_at,
}


def _as_list(value) -> list[int]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _get_user_or_404(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("/master/api/AdManagement/ad-users")
def directory_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Accounts that can be added to Orion (replaces the Azure AD directory lookup)."""
    users = db.scalars(select(User).where(User.has_profile.is_(False)).order_by(User.display_name)).all()
    return [user_info(u) for u in users]


@router.post("/UserManagement/api/UserManagement/get-user-list")
def get_user_list(body: UserListRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    query = (
        select(User)
        .outerjoin(Team, User.team_id == Team.id)
        .outerjoin(Designation, User.designation_id == Designation.id)
        .where(User.has_profile.is_(True))
    )
    if body.userType is not None:
        query = query.where(User.user_type_id == body.userType)
    if body.searchTxt:
        like = f"%{body.searchTxt.strip().lower()}%"
        query = query.where(
            or_(func.lower(User.display_name).like(like), func.lower(User.email).like(like),
                func.lower(User.username).like(like))
        )
    if teams := _as_list(body.team):
        query = query.where(User.team_id.in_(teams))
    if countries := _as_list(body.country):
        query = query.where(User.country_id.in_(countries))
    if designations := _as_list(body.designation):
        query = query.where(User.designation_id.in_(designations))
    boards = _as_list(body.board)
    workspaces = _as_list(body.workspace)
    if boards or workspaces:
        perm = select(UserBoardPermission.user_id).join(Board, Board.id == UserBoardPermission.board_id)
        if boards:
            perm = perm.where(Board.id.in_(boards))
        if workspaces:
            perm = perm.where(Board.workspace_id.in_(workspaces))
        query = query.where(User.id.in_(perm))

    total = db.scalar(select(func.count()).select_from(query.subquery()))

    sort_col = SORT_COLUMNS.get((body.sortBy or "name").lower(), User.display_name)
    sort_col = sort_col.desc() if (body.sortOrder or "").lower() == "desc" else sort_col.asc()
    page_size = max(1, min(body.pageSize or 10, 500))
    users = db.scalars(
        query.order_by(sort_col.nulls_last(), User.id)
        .offset(max(body.pageOffset, 0) * page_size)
        .limit(page_size)
        .options(selectinload(User.board_permissions).selectinload(UserBoardPermission.board))
    ).unique().all()

    return {"userItems": [user_row(u) for u in users], "totalCount": total, "pageSize": page_size,
            "pageOffset": body.pageOffset}


@router.post("/UserManagement/api/UserManagement/add-user")
def add_user(body: AddUserRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, body.userId)
    if body.userTypeId not in VALID_USER_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user type")

    team_id = body.teamId
    if body.isNewTeam and body.teamName:
        team = db.scalar(select(Team).where(func.lower(Team.name) == body.teamName.strip().lower()))
        if team is None:
            team = Team(name=body.teamName.strip())
            db.add(team)
            db.flush()
        team_id = team.id

    designation_id = body.designationId
    if body.isNewDesignation and body.designationName:
        des = db.scalar(
            select(Designation).where(func.lower(Designation.name) == body.designationName.strip().lower())
        )
        if des is None:
            des = Designation(name=body.designationName.strip())
            db.add(des)
            db.flush()
        designation_id = des.id

    is_edit = user.has_profile
    user.team_id = team_id or None
    user.designation_id = designation_id or None
    user.country_id = body.countryId or None
    user.user_type_id = body.userTypeId
    user.is_active = body.userTypeId != USER_TYPE_INACTIVE
    user.has_profile = True
    if body.shiftTime:
        user.shift_from, user.shift_to = body.shiftTime.from_, body.shiftTime.to
    db.commit()
    return {"status": True, "message": "User updated successfully" if is_edit else "User added successfully",
            "data": {"userProfileId": user.id}}


@router.post("/UserManagement/api/UserManagement/update_user_type")
def update_user_type(body: UpdateUserTypeRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _get_user_or_404(db, body.userId)
    if body.userTypeId not in VALID_USER_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user type")
    if user.id == admin.id and body.userTypeId != USER_TYPE_ADMIN and not admin.is_super_admin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own admin access")
    if user.is_super_admin and not admin.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super admin can change a super admin")
    user.user_type_id = body.userTypeId
    user.is_active = body.userTypeId != USER_TYPE_INACTIVE
    db.commit()
    message = {
        USER_TYPE_ADMIN: "User moved to Admin",
        USER_TYPE_USER: "User moved to General users",
        USER_TYPE_INACTIVE: "User deactivated",
    }[body.userTypeId]
    return {"status": True, "message": message}


# ---------------------------------------------------------------- board permissions


def _board_permission_dict(p: UserBoardPermission) -> dict:
    return {
        "user_board_permission_id": p.id,
        "userBoardPermissionId": p.id,
        "userId": p.user_id,
        "boardId": p.board_id,
        "boardID": p.board_id,
        "boardName": p.board.name,
        "name": p.board.name,
        "workspaceId": p.board.workspace_id,
        "work_space_id": p.board.workspace_id,
        "workspaceName": p.board.workspace.name,
        "roleId": p.role_id,
        "roleName": p.role.name if p.role else None,
    }


@router.get("/UserManagement/api/UserManagement/get_user_board_permission/{user_id}")
def get_user_board_permission(user_id: uuid.UUID, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _get_user_or_404(db, user_id)
    perms = db.scalars(
        select(UserBoardPermission).where(UserBoardPermission.user_id == user_id).order_by(UserBoardPermission.id)
    ).all()
    return [_board_permission_dict(p) for p in perms if p.board.is_active]


@router.post("/UserManagement/api/UserManagement/add_user_board_permission")
def add_user_board_permission(
    body: BoardPermissionRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    _get_user_or_404(db, body.userId)

    # The UI deletes by sending an existing id with boardId=null.
    if body.boardId is None:
        perm = db.get(UserBoardPermission, body.userBoardPermissionId or 0)
        if perm is None or perm.user_id != body.userId:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Permission not found")
        db.delete(perm)
        db.commit()
        return {"status": True, "message": "Board permission removed"}

    board = db.get(Board, body.boardId)
    if board is None or not board.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Board not found")

    perm = db.scalar(
        select(UserBoardPermission).where(
            UserBoardPermission.user_id == body.userId, UserBoardPermission.board_id == body.boardId
        )
    )
    if perm is None:
        perm = UserBoardPermission(user_id=body.userId, board_id=body.boardId, granted_by_id=admin.id)
        db.add(perm)
    perm.role_id = body.roleId or None
    db.commit()
    return {"status": True, "message": "User Board Added"}


# ---------------------------------------------------------------- app permissions


@router.get("/UserManagement/api/UserManagement/get_user_app_permission/{user_id}")
def get_user_app_permission(user_id: uuid.UUID, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user_or_404(db, user_id)
    perms = db.scalars(
        select(UserAppPermission).where(UserAppPermission.user_id == user_id).order_by(UserAppPermission.app_id)
    ).all()
    return {
        "status": True,
        "data": [
            {
                "userAppPermissionId": p.id,
                "appId": p.app_id,
                "appCode": p.app.code,
                "appName": p.app.name,
                "permission": p.permission,
                "grantedBy": user_brief(p.granted_by),
                "grantedOn": p.granted_on.isoformat() if p.granted_on else "",
            }
            for p in perms
        ],
    }


@router.post("/UserManagement/api/UserManagement/add_user_app_permission")
def add_user_app_permission(
    body: AppPermissionRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)
):
    _get_user_or_404(db, body.userId)
    if db.get(App, body.appId) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "App not found")
    perm = db.scalar(
        select(UserAppPermission).where(
            UserAppPermission.user_id == body.userId, UserAppPermission.app_id == body.appId
        )
    )
    if perm is None:
        perm = UserAppPermission(user_id=body.userId, app_id=body.appId)
        db.add(perm)
    perm.permission = 1 if body.permission else 0
    perm.granted_by_id = admin.id
    db.commit()
    return {"status": True, "message": "App permission saved"}
