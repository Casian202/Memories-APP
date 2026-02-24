"""
Surprise model.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Surprise(Base):
    """Surprise model for surprises between partners."""
    __tablename__ = "surprises"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    surprise_type = Column(String(30), default="photo")  # photo, message, gift_link, video
    content_path = Column(String(500), nullable=True)  # path to file
    message = Column(Text, nullable=True)
    
    # Reveal conditions
    reveal_type = Column(String(20), default="date")  # date, clicks, both
    reveal_date = Column(Date, nullable=True)
    reveal_time = Column(Time, nullable=True)
    reveal_clicks = Column(Integer, default=1)  # number of clicks needed
    current_clicks = Column(Integer, default=0)
    
    # Status
    is_revealed = Column(Boolean, default=False)
    revealed_at = Column(DateTime, nullable=True)
    notification_dismissed = Column(Boolean, default=False)
    
    # Security
    click_cooldown = Column(Integer, default=500)  # ms between clicks
    last_click_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", back_populates="surprises_sent", foreign_keys=[from_user_id])
    recipient = relationship("User", back_populates="surprises_received", foreign_keys=[to_user_id])

    @property
    def from_user_name(self):
        """Get the sender's display name."""
        try:
            if self.sender:
                return self.sender.display_name or self.sender.username
        except Exception:
            pass
        return "Partener"

    def __repr__(self):
        return f"<Surprise(id={self.id}, title='{self.title}', type='{self.surprise_type}', revealed={self.is_revealed})>"