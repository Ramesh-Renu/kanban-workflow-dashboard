"""Turn ORM rows into the JSON shapes the React app already consumes.

Field names (mixed camelCase / snake_case) intentionally mirror the legacy .NET API.
"""

from collections import OrderedDict

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants import USER_TYPE_CODES
from app.deps import is_admin
from app.models import Board, User, UserAppPermission, UserBoardPermission, Workspace


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def user_brief(user: User | None) -> dict | None:
    if user is None:
        return None
    return {"regId": user.id, "name": user.display_name, "mail": user.email}


def user_info(user: User) -> dict:
    return {
        "regId": user.id,
        "userName": user.username,
        "displayName": user.display_name,
        "mail": user.email,
        "jobTitle": user.job_title,
        "givenName": user.given_name,
        "surname": user.surname,
        "employeeId": user.employee_id,
        "photoUrl": user.photo_url,
        "isSuperAdmin": user.is_super_admin,
    }


def label_dict(label) -> dict:
    return {
        "labelId": label.id,
        "label_id": label.id,
        "name": label.name,
        "code": label.code,
        "description": label.description,
        "color_Code": label.color_code,
        "position": label.position,
        "wipLimit": label.wip_limit,
        "isExpand": label.is_expanded,
        "isDefault": label.is_default,
        "isMoveState": label.is_move_state,
        "isFinalStage": label.is_final_stage,
    }


def board_dict(board: Board) -> dict:
    return {
        "boardId": board.id,
        "boardID": board.id,
        "name": board.name,
        "boardName": board.name,
        "code": board.code,
        "boardCode": board.code,
        "type": board.type,
        "mainBoardId": board.main_board_id,
        "work_space_id": board.workspace_id,
        "workspaceId": board.workspace_id,
        "labels": [label_dict(lbl) for lbl in board.labels],
    }


def workspace_dict(ws: Workspace) -> dict:
    """Shape used by Settings → Workspace (getworkspacewithboards)."""
    return {
        "workspaceId": ws.id,
        "work_space_id": ws.id,
        "name": ws.name,
        "code": ws.code,
        "workflowType": ws.workflow_type_id,
        "created_Date": _iso(ws.created_at),
        "createdDate": _iso(ws.created_at),
        "user_Info": [user_brief(ws.created_by)] if ws.created_by else [],
        "boards": [board_dict(b) for b in ws.boards],
    }


def _workspace_dto(ws: Workspace, boards: list[Board], is_default: bool, default_board_id: int | None) -> dict:
    """Shape used by auth.details.workspaceDTO (sidenav, switcher, dashboards)."""
    if default_board_id not in {b.id for b in boards}:
        default_board_id = boards[0].id if boards else None
    board_list = [
        {**board_dict(b), "isDefault": b.id == default_board_id, "is_board_default": b.id == default_board_id}
        for b in boards
    ]
    return {
        "work_space_id": ws.id,
        "workspaceId": ws.id,
        "name": ws.name,
        "workspace_name": ws.name,
        "code": ws.code,
        "workflowType": ws.workflow_type_id,
        "isDefault": is_default,
        "is_workspace_default": is_default,
        "boardIds": [b.id for b in boards],
        "board_ids": [b.id for b in boards],
        "boardList": board_list,
    }


def build_user_details(db: Session, user: User) -> dict:
    """Payload for GET /master/api/Login/userinfo (stored as auth.details in the UI)."""
    admin = is_admin(user)

    perms = db.scalars(
        select(UserBoardPermission)
        .where(UserBoardPermission.user_id == user.id)
        .options(selectinload(UserBoardPermission.board).selectinload(Board.labels))
    ).all()
    perm_by_board = {p.board_id: p for p in perms if p.board.is_active}

    if admin:
        workspaces = db.scalars(
            select(Workspace).where(Workspace.is_active.is_(True)).order_by(Workspace.id)
        ).unique().all()
        ws_boards = [(ws, list(ws.boards)) for ws in workspaces]
    else:
        grouped: OrderedDict[int, tuple[Workspace, list[Board]]] = OrderedDict()
        for perm in sorted(perm_by_board.values(), key=lambda p: (p.board.workspace_id, p.board_id)):
            ws = perm.board.workspace
            if not ws.is_active:
                continue
            grouped.setdefault(ws.id, (ws, []))[1].append(perm.board)
        ws_boards = list(grouped.values())

    # Saved defaults win; otherwise the first workspace / first board.
    ws_ids = [ws.id for ws, _ in ws_boards]
    default_ws_id = user.default_workspace_id if user.default_workspace_id in ws_ids else (ws_ids[0] if ws_ids else None)
    default_board_by_ws = {p.board.workspace_id: p.board_id for p in perm_by_board.values() if p.is_default}
    workspace_dto = [
        _workspace_dto(ws, boards, ws.id == default_ws_id, default_board_by_ws.get(ws.id)) for ws, boards in ws_boards
    ]

    role_detail = []
    for ws, boards in ws_boards:
        role_detail.append(
            {
                "workspaceId": ws.id,
                "work_space_id": ws.id,
                "workspaceName": ws.name,
                "workflowType": ws.workflow_type_id,
                "boards": [
                    {
                        "boardId": b.id,
                        "boardCode": b.code,
                        "boardName": b.name,
                        "roleId": perm_by_board[b.id].role_id if b.id in perm_by_board else None,
                        "roleName": (
                            perm_by_board[b.id].role.name
                            if b.id in perm_by_board and perm_by_board[b.id].role
                            else ("Admin" if admin else None)
                        ),
                    }
                    for b in boards
                ],
            }
        )

    app_perms = db.scalars(
        select(UserAppPermission).where(
            UserAppPermission.user_id == user.id, UserAppPermission.permission == 1
        )
    ).all()

    return {
        **user_info(user),
        "is_active": user.is_active,
        "user_type": user.user_type_id,
        "user_type_code": USER_TYPE_CODES.get(user.user_type_id),
        "team": user.team.name if user.team else None,
        "designation": user.designation.name if user.designation else None,
        "workspaceDTO": workspace_dto,
        "userRoleResponseDetail": role_detail,
        "userBoardIds": [b.id for _, boards in ws_boards for b in boards],
        # Super admins see every hub app; everyone else only what was granted.
        "appPermission": None
        if user.is_super_admin
        else [{"appId": p.app_id, "appCode": p.app.code, "appName": p.app.name} for p in app_perms],
    }


def user_row(user: User) -> dict:
    """Row for the Settings → Users tables (get-user-list)."""
    boards = [p.board for p in user.board_permissions if p.board.is_active]
    workspaces = OrderedDict()
    for b in boards:
        workspaces.setdefault(b.workspace_id, {"work_space_id": b.workspace_id, "name": b.workspace.name})
    return {
        "userProfileId": user.id,
        "userInfo": user_info(user),
        "userType": user.user_type_id,
        "user_type_code": USER_TYPE_CODES.get(user.user_type_id),
        "team": [{"team_id": user.team.id, "name": user.team.name}] if user.team else [],
        "teamId": user.team_id,
        "designation": [{"id": user.designation.id, "name": user.designation.name}] if user.designation else [],
        "designationId": user.designation_id,
        "country": [{"country_id": user.country.id, "name": user.country.name}] if user.country else [],
        "countryId": user.country_id,
        "shiftTime": {"from": user.shift_from or "", "to": user.shift_to or ""},
        "workspace": list(workspaces.values()),
        "board": [{"boardID": b.id, "name": b.name} for b in boards],
        "lastLoginAt": _iso(user.last_login_at),
    }
