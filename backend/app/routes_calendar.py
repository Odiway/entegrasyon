from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import CalendarEvent, User
from app.schemas import CalendarEventCreate, CalendarEventUpdate
from app.auth import require_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/events")
async def list_events(
    month: int | None = None,
    year: int | None = None,
    event_type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(CalendarEvent)
    if event_type:
        q = q.where(CalendarEvent.event_type == event_type)
    if status:
        q = q.where(CalendarEvent.status == status)
    q = q.order_by(CalendarEvent.start_date)
    result = await db.execute(q)
    return [
        {c.name: getattr(e, c.name) for c in CalendarEvent.__table__.columns}
        for e in result.scalars().all()
    ]


@router.post("/events")
async def create_event(
    data: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    event = CalendarEvent(**data.model_dump(), created_by=user.full_name)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return {c.name: getattr(event, c.name) for c in CalendarEvent.__table__.columns}


@router.patch("/events/{event_id}")
async def update_event(
    event_id: int,
    data: CalendarEventUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    event = await db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(event, field, val)
    await db.commit()
    return {"ok": True}


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    event = await db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    await db.delete(event)
    await db.commit()
    return {"ok": True}
