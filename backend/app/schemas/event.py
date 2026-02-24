"""
Event schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, time
from enum import Enum


class EventType(str, Enum):
    """Event types."""
    DATE_NIGHT = "date_night"
    VACATION = "vacation"
    ANNIVERSARY = "anniversary"
    BIRTHDAY = "birthday"
    OTHER = "other"


class EventStatus(str, Enum):
    """Event status."""
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PhotoResponse(BaseModel):
    """Schema for photo response."""
    id: int
    filename: str
    original_filename: Optional[str]
    file_path: str
    file_size: Optional[int]
    mime_type: Optional[str]
    width: Optional[int]
    height: Optional[int]
    is_cover: bool
    uploaded_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class EventBase(BaseModel):
    """Base event schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    event_date: date
    event_time: Optional[time] = None
    end_date: Optional[date] = None
    event_type: EventType = EventType.OTHER


class EventCreate(EventBase):
    """Schema for creating an event."""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an event."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    end_date: Optional[date] = None
    event_type: Optional[EventType] = None
    status: Optional[EventStatus] = None
    cover_photo_id: Optional[int] = None


class EventResponse(EventBase):
    """Schema for event response."""
    id: int
    status: EventStatus
    cover_photo_id: Optional[int]
    cover_photo: Optional[PhotoResponse] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    photos: List[PhotoResponse] = []
    photo_count: int = 0
    
    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """Schema for event list response with pagination."""
    events: List[EventResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class EventWithPhotos(EventResponse):
    """Schema for event with full photo details."""
    photos: List[PhotoResponse] = []