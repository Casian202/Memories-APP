"""
User model.
"""
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class User(Base):
    """User model - maximum 2 users for the couple."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    avatar_path = Column(String(255))
    birthday = Column(Date, nullable=True)
    is_admin = Column(Boolean, default=False)
    force_password_change = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    events_created = relationship("Event", back_populates="creator", foreign_keys="Event.created_by")
    photos_uploaded = relationship("Photo", back_populates="uploader")
    surprises_sent = relationship("Surprise", back_populates="sender", foreign_keys="Surprise.from_user_id")
    surprises_received = relationship("Surprise", back_populates="recipient", foreign_keys="Surprise.to_user_id")
    motivations_sent = relationship("Motivation", back_populates="sender", foreign_keys="Motivation.from_user_id")
    motivations_received = relationship("Motivation", back_populates="recipient", foreign_keys="Motivation.to_user_id")
    messages_sent = relationship("DailyMessage", back_populates="sender", foreign_keys="DailyMessage.from_user_id")
    messages_received = relationship("DailyMessage", back_populates="recipient", foreign_keys="DailyMessage.to_user_id")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    collages_created = relationship("Collage", back_populates="creator")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', display_name='{self.display_name}')>"