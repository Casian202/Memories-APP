"""
Event model for memories.
"""
from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class EventType(str, enum.Enum):
    """Event types."""
    DATE_NIGHT = "date_night"
    VACATION = "vacation"
    ANNIVERSARY = "anniversary"
    BIRTHDAY = "birthday"
    OTHER = "other"


class EventStatus(str, enum.Enum):
    """Event status."""
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Event(Base):
    """Event model for memories."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    event_date = Column(Date, nullable=False, index=True)
    event_time = Column(Time, nullable=True)
    end_date = Column(Date, nullable=True)
    event_type = Column(String(50), default=EventType.OTHER.value)
    status = Column(String(20), default=EventStatus.UPCOMING.value)
    cover_photo_id = Column(Integer, ForeignKey("photos.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="events_created", foreign_keys=[created_by])
    photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan", foreign_keys="Photo.event_id")
    cover_photo = relationship("Photo", foreign_keys=[cover_photo_id], post_update=True)
    collages = relationship("Collage", back_populates="event", cascade="all, delete-orphan")

    @property
    def photo_count(self):
        """Return the number of photos for this event."""
        try:
            return len(self.photos)
        except Exception:
            return 0

    def __repr__(self):
        return f"<Event(id={self.id}, title='{self.title}', date={self.event_date})>"