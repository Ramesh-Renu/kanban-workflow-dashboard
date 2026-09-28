from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import App, Country, Designation, Role, StatusMaster, Team

router = APIRouter(tags=["masters"], dependencies=[Depends(get_current_user)])


@router.get("/OrderTicketing/api/OrderTicketManagement/status-type")
def status_type(type: str = Query(...), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StatusMaster)
        .where(StatusMaster.type == type.upper(), StatusMaster.is_active.is_(True))
        .order_by(StatusMaster.sort_order, StatusMaster.status_id)
    )
    return [{"status_id": r.status_id, "code": r.code, "name": r.name, "type": r.type} for r in rows]


@router.get("/master/api/Team/getallteam")
def teams(db: Session = Depends(get_db)):
    return [{"team_id": t.id, "name": t.name} for t in db.scalars(select(Team).order_by(Team.name))]


@router.get("/master/api/Desgination/designations")
def designations(db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name} for d in db.scalars(select(Designation).order_by(Designation.name))]


@router.get("/master/api/CountryDetail/getallcountrydetail")
def countries(db: Session = Depends(get_db)):
    return [
        {"country_id": c.id, "name": c.name, "code": c.code}
        for c in db.scalars(select(Country).order_by(Country.name))
    ]


@router.get("/master/api/Role/roles")
def roles(db: Session = Depends(get_db)):
    return [{"roleId": r.id, "id": r.id, "code": r.code, "name": r.name} for r in db.scalars(select(Role).order_by(Role.id))]


@router.get("/master/api/AppMaster/apps")
def apps(db: Session = Depends(get_db)):
    return [
        {"appId": a.id, "id": a.id, "appCode": a.code, "code": a.code, "name": a.name, "appName": a.name}
        for a in db.scalars(select(App).order_by(App.id))
    ]
