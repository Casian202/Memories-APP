"""
Coming Soon page model.
Admin can create a special page that shows "În curând" until a reveal date,
then switches to showing its real name. Contains photos for slideshow and floating quotes.
"""
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, date

from app.database import Base


class ComingSoonPage(Base):
    """Coming Soon / Reveal page model."""
    __tablename__ = "coming_soon_pages"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String(100), default="În curând")  # shown before reveal
    real_name = Column(String(200), nullable=False)  # shown after reveal
    description = Column(Text, nullable=True)
    reveal_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)  # only one active at a time
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    photos = relationship("ComingSoonPhoto", back_populates="page", cascade="all, delete-orphan", order_by="ComingSoonPhoto.sort_order")
    quotes = relationship("ComingSoonQuote", back_populates="page", cascade="all, delete-orphan", order_by="ComingSoonQuote.sort_order")

    @property
    def is_revealed(self):
        """Check if the reveal date has passed."""
        return date.today() >= self.reveal_date

    @property
    def current_name(self):
        """Return display_name before reveal, real_name after."""
        return self.real_name if self.is_revealed else self.display_name

    def __repr__(self):
        return f"<ComingSoonPage(id={self.id}, real_name='{self.real_name}', reveal={self.reveal_date})>"


class ComingSoonPhoto(Base):
    """Photos for Coming Soon slideshow."""
    __tablename__ = "coming_soon_photos"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("coming_soon_pages.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    page = relationship("ComingSoonPage", back_populates="photos")

    def __repr__(self):
        return f"<ComingSoonPhoto(id={self.id}, page_id={self.page_id})>"


class ComingSoonQuote(Base):
    """Floating quotes for Coming Soon page."""
    __tablename__ = "coming_soon_quotes"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("coming_soon_pages.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    author = Column(String(200), nullable=True)  # optional attribution
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    page = relationship("ComingSoonPage", back_populates="quotes")

    def __repr__(self):
        return f"<ComingSoonQuote(id={self.id}, text='{self.text[:30]}...')>"
