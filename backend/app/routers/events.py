"""
Event routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.schemas.event import (
    EventCreate, EventUpdate, EventResponse, EventListResponse, EventType, EventStatus
)
from app.services.event_service import EventService
from app.utils.security import get_current_user, get_admin_user
from app.utils.date_helpers import get_relationship_time

router = APIRouter()


@router.get("", response_model=EventListResponse)
async def get_events(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of events."""
    events, total = await EventService.get_events(
        db, current_user.id, page, per_page, event_type, status, search
    )
    
    return EventListResponse(
        events=[EventResponse.from_orm(e) for e in events],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.get("/upcoming")
async def get_upcoming_events(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming events for dashboard."""
    events = await EventService.get_upcoming_events(db, limit)
    return [EventResponse.from_orm(e) for e in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single event by ID."""
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    return EventResponse.from_orm(event)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new event (admin only)."""
    event = await EventService.create_event(db, event_data, current_user.id)
    return EventResponse.from_orm(event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an event (admin only)."""
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    
    event = await EventService.update_event(db, event, event_data)
    return EventResponse.from_orm(event)


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an event (admin only)."""
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    
    await EventService.delete_event(db, event)
    return {"message": "Evenimentul a fost șters cu succes"}


@router.put("/{event_id}/cover/{photo_id}")
async def set_cover_photo(
    event_id: int,
    photo_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Set cover photo for event (admin only)."""
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    
    try:
        event = await EventService.set_cover_photo(db, event, photo_id)
        return {"message": "Foto de copertă actualizată", "event": EventResponse.from_orm(event)}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )