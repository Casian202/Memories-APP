"""
Photo and Collage models.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Photo(Base):
    """Photo model for event photos."""
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    media_type = Column(String(10), default="image")  # "image" or "video"
    transcoding_status = Column(String(20), nullable=True)  # null, pending, processing, done, failed
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_cover = Column(Boolean, default=False)
    is_in_collage = Column(Boolean, default=False)
    collage_position = Column(Integer, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="photos", foreign_keys=[event_id])
    uploader = relationship("User", back_populates="photos_uploaded")

    def __repr__(self):
        return f"<Photo(id={self.id}, filename='{self.filename}', event_id={self.event_id})>"


class Collage(Base):
    """Collage model for generated photo collages."""
    __tablename__ = "collages"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String(100), nullable=True)
    layout_type = Column(String(20), default="grid")  # grid, strip, overlap, polaroid
    photo_ids = Column(Text, nullable=True)  # JSON array of photo IDs
    generated_path = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="collages")
    creator = relationship("User", back_populates="collages_created")

    def __repr__(self):
        return f"<Collage(id={self.id}, name='{self.name}', layout_type='{self.layout_type}')>"