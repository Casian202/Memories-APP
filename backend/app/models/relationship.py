"""
Relationship model for the couple.
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Relationship(Base):
    """Relationship model - stores the couple's relationship info."""
    __tablename__ = "relationship"

    id = Column(Integer, primary_key=True, index=True)
    partner1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relationship_name = Column(String(100))
    start_date = Column(Date, nullable=False)
    anniversary_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    partner1 = relationship("User", foreign_keys=[partner1_id])
    partner2 = relationship("User", foreign_keys=[partner2_id])

    def __repr__(self):
        return f"<Relationship(id={self.id}, name='{self.relationship_name}', start_date={self.start_date})>"