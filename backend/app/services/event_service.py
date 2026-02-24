"""
Event service for managing events/memories.
"""
from datetime import datetime, date
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.models.event import Event, EventType, EventStatus
from app.models.photo import Photo
from app.schemas.event import EventCreate, EventUpdate, EventResponse


class EventService:
    """Service for managing events."""
    
    @staticmethod
    async def get_events(
        db: AsyncSession,
        user_id: int,
        page: int = 1,
        per_page: int = 10,
        event_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Event], int]:
        """Get paginated list of events."""
        query = select(Event).options(selectinload(Event.photos))
        
        # Filters
        if event_type:
            query = query.where(Event.event_type == event_type)
        if status:
            query = query.where(Event.status == status)
        if search:
            query = query.where(
                or_(
                    Event.title.ilike(f"%{search}%"),
                    Event.description.ilike(f"%{search}%"),
                    Event.location.ilike(f"%{search}%")
                )
            )
        
        # Count total
        count_query = select(Event)
        if event_type:
            count_query = count_query.where(Event.event_type == event_type)
        if status:
            count_query = count_query.where(Event.status == status)
        if search:
            count_query = count_query.where(
                or_(
                    Event.title.ilike(f"%{search}%"),
                    Event.description.ilike(f"%{search}%"),
                    Event.location.ilike(f"%{search}%")
                )
            )
        
        total_result = await db.execute(count_query)
        total = len(total_result.scalars().all())
        
        # Paginate
        query = query.order_by(desc(Event.event_date))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await db.execute(query)
        events = result.scalars().all()
        
        return events, total
    
    @staticmethod
    async def get_upcoming_events(
        db: AsyncSession,
        limit: int = 5
    ) -> List[Event]:
        """Get upcoming events for dashboard."""
        today = date.today()
        
        query = select(Event).options(
            selectinload(Event.photos)
        ).where(
            Event.event_date >= today,
            Event.status == EventStatus.UPCOMING.value
        ).order_by(Event.event_date).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_event_by_id(db: AsyncSession, event_id: int) -> Optional[Event]:
        """Get a single event by ID with photos."""
        query = select(Event).options(
            selectinload(Event.photos),
            selectinload(Event.cover_photo)
        ).where(Event.id == event_id)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_event(
        db: AsyncSession,
        event_data: EventCreate,
        user_id: int
    ) -> Event:
        """Create a new event."""
        event = Event(
            title=event_data.title,
            description=event_data.description,
            location=event_data.location,
            event_date=event_data.event_date,
            event_time=event_data.event_time,
            end_date=event_data.end_date,
            event_type=event_data.event_type.value,
            status=EventStatus.UPCOMING.value,
            created_by=user_id
        )
        
        db.add(event)
        await db.commit()
        
        # Re-fetch with relationships loaded to avoid MissingGreenlet
        result = await db.execute(
            select(Event).options(
                selectinload(Event.photos)
            ).where(Event.id == event.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def update_event(
        db: AsyncSession,
        event: Event,
        event_data: EventUpdate
    ) -> Event:
        """Update an event."""
        # Re-query the event to ensure it's attached to the current session
        db_event = await EventService.get_event_by_id(db, event.id)
        if not db_event:
            raise ValueError("Evenimentul nu a fost găsit")

        update_data = event_data.dict(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                if field == "event_type" and hasattr(value, 'value'):
                    setattr(db_event, field, value.value)
                elif field == "status" and hasattr(value, 'value'):
                    setattr(db_event, field, value.value)
                else:
                    setattr(db_event, field, value)

        db_event.updated_at = datetime.utcnow()
        await db.commit()

        # Re-fetch with relationships loaded
        return await EventService.get_event_by_id(db, db_event.id)
    
    @staticmethod
    async def delete_event(db: AsyncSession, event: Event) -> None:
        """Delete an event and its photos."""
        await db.delete(event)
        await db.commit()
    
    @staticmethod
    async def set_cover_photo(
        db: AsyncSession,
        event: Event,
        photo_id: int
    ) -> Event:
        """Set a photo as the event cover."""
        # Re-query the event to ensure it's attached to the current session
        db_event = await EventService.get_event_by_id(db, event.id)
        if not db_event:
            raise ValueError("Evenimentul nu a fost găsit")

        # Verify photo belongs to event
        query = select(Photo).where(
            Photo.id == photo_id,
            Photo.event_id == db_event.id
        )
        result = await db.execute(query)
        photo = result.scalar_one_or_none()

        if not photo:
            raise ValueError("Foto nu aparține acestui eveniment")

        # Unset previous cover
        if db_event.cover_photo_id:
            prev_query = select(Photo).where(Photo.id == db_event.cover_photo_id)
            prev_result = await db.execute(prev_query)
            prev_photo = prev_result.scalar_one_or_none()
            if prev_photo:
                prev_photo.is_cover = False

        # Set new cover
        photo.is_cover = True
        db_event.cover_photo_id = photo_id

        await db.commit()
        await db.refresh(db_event)

        return db_event