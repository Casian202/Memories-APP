"""
Motivation model for daily motivational messages.
"""
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Motivation(Base):
    """Motivation model for daily motivational messages between partners."""
    __tablename__ = "motivations"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    sender = relationship("User", back_populates="motivations_sent", foreign_keys=[from_user_id])
    recipient = relationship("User", back_populates="motivations_received", foreign_keys=[to_user_id])

    def __repr__(self):
        return f"<Motivation(id={self.id}, from_user_id={self.from_user_id}, to_user_id={self.to_user_id})>"