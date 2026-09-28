from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Board, BoardLabel, StatusMaster, User, Workspace
from app.schemas import BoardUpsertRequest, DeleteWorkspaceBoardRequest, WorkspaceUpsertRequest
from app.serializers import workspace_dict

router = APIRouter(tags=["workspaces"])


def _active_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    ws = db.get(Workspace, workspace_id)
    if ws is None or not ws.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    return ws


@router.get("/master/api/Workspace/getworkspacewithboards")
def workspaces_with_boards(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspaces = db.scalars(
        select(Workspace)
        .where(Workspace.is_active.is_(True))
        .order_by(Workspace.id)
        .options(selectinload(Workspace.boards).selectinload(Board.labels))
    ).unique().all()
    return [workspace_dict(ws) for ws in workspaces]


@router.get("/master/api/Workspace/getallworkspace")
def all_workspaces(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspaces = db.scalars(select(Workspace).where(Workspace.is_active.is_(True)).order_by(Workspace.name)).unique()
    return [
        {"work_space_id": ws.id, "workspaceId": ws.id, "name": ws.name, "workflowType": ws.workflow_type_id}
        for ws in workspaces
    ]


@router.get("/master/api/BoardManagement/boards")
def all_boards(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    boards = db.scalars(
        select(Board).join(Workspace).where(Board.is_active.is_(True), Workspace.is_active.is_(True)).order_by(Board.id)
    )
    return [
        {
            "boardID": b.id,
            "boardId": b.id,
            "name": b.name,
            "code": b.code,
            "work_space_id": b.workspace_id,
            "workspaceId": b.workspace_id,
        }
        for b in boards
    ]


@router.post("/master/api/Workspace/addupdateworkspace")
def upsert_workspace(body: WorkspaceUpsertRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if body.workflowType is not None:
        wf = db.get(StatusMaster, body.workflowType)
        if wf is None or wf.type != "WORKFLOWTYPE":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid workflow type")

    if body.workspaceId:
        ws = _active_workspace_or_404(db, body.workspaceId)
        ws.name = body.name.strip()
        if body.workflowType is not None:
            ws.workflow_type_id = body.workflowType
        message = "Workspace updated successfully"
    else:
        ws = Workspace(name=body.name.strip(), workflow_type_id=body.workflowType, created_by_id=admin.id)
        db.add(ws)
        message = "Workspace created successfully"
    db.commit()
    return {"status": True, "message": message, "data": {"workspaceId": ws.id}}


@router.post("/master/api/BoardManagement/addupdateboard")
def upsert_board(body: BoardUpsertRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _active_workspace_or_404(db, body.workSpaceId)

    if body.boardId:
        board = db.get(Board, body.boardId)
        if board is None or not board.is_active or board.workspace_id != body.workSpaceId:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Board not found")
        board.name = body.boardName.strip()
        message = "Board updated successfully"
    else:
        board = Board(workspace_id=body.workSpaceId, name=body.boardName.strip(), type=body.type)
        db.add(board)
        message = "Board created successfully"
    db.flush()

    deleted_ids = {
        int(d.get("labelId") or d.get("label_id") or 0) if isinstance(d, dict) else int(d)
        for d in body.deletedLabels
    }
    existing = {lbl.id: lbl for lbl in board.labels}
    for lbl_id in deleted_ids:
        if lbl_id in existing:
            db.delete(existing.pop(lbl_id))

    for index, item in enumerate(body.labels, start=1):
        if not item.name.strip():
            continue
        position = item.position or index
        label = existing.get(item.labelId or 0)
        if label is None:
            board.labels.append(BoardLabel(name=item.name.strip(), color_code=item.color_Code, position=position))
        else:
            label.name, label.color_code, label.position = item.name.strip(), item.color_Code, position

    db.commit()
    return {"status": True, "message": message, "data": {"boardId": board.id}}


@router.delete("/master/api/Workspace/deleteworkspaceboard")
@router.post("/master/api/Workspace/deleteworkspaceboard")
def delete_workspace_board(
    body: DeleteWorkspaceBoardRequest = Body(...), _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Soft delete, so history (tasks, permissions) stays intact."""
    if body.type.lower() == "workspace":
        ws = _active_workspace_or_404(db, body.workSpaceId or 0)
        ws.is_active = False
        for board in db.scalars(select(Board).where(Board.workspace_id == ws.id)):
            board.is_active = False
        message = "Workspace deleted successfully"
    else:
        board = db.get(Board, body.boardId or 0)
        if board is None or not board.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Board not found")
        board.is_active = False
        message = "Board deleted successfully"
    db.commit()
    return {"status": True, "message": message}
