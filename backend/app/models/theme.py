"""
Theme, AppSetting, AuditLog, and Session models.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Theme(Base):
    """Theme model for UI themes (predefined and custom)."""
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Main colors
    primary_color = Column(String(7), nullable=False)  # hex color
    secondary_color = Column(String(7), nullable=False)
    accent_color = Column(String(7), nullable=True)
    background_color = Column(String(7), nullable=False)
    text_color = Column(String(7), nullable=False)
    card_background = Column(String(7), nullable=True)
    
    # Fonts
    font_heading = Column(String(100), nullable=True)
    font_body = Column(String(100), nullable=True)
    
    # Styles
    border_radius = Column(Integer, default=8)
    custom_css = Column(Text, nullable=True)
    
    # Seasonal
    is_seasonal = Column(Boolean, default=False)
    seasonal_start_month = Column(Integer, nullable=True)
    seasonal_start_day = Column(Integer, nullable=True)
    seasonal_end_month = Column(Integer, nullable=True)
    seasonal_end_day = Column(Integer, nullable=True)
    
    # Event triggers
    trigger_event_type = Column(String(50), nullable=True)  # birthday_her, birthday_him, anniversary, valentine, christmas, new_year, vacation_ski, vacation_beach
    
    # Metadata
    preview_image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False)
    is_system = Column(Boolean, default=True)  # system themes cannot be deleted
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Theme(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class AppSetting(Base):
    """Application settings model."""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AppSetting(key='{self.key}', value='{self.value}')>"


class AuditLog(Base):
    """Audit log for tracking sensitive actions."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)  # JSON
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}')>"


class Session(Base):
    """Session model for JWT tokens."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id})>"