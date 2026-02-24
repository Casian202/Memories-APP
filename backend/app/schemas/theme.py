"""
Theme schemas for request/response validation.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re


class ThemeBase(BaseModel):
    """Base theme schema."""
    name: str = Field(..., min_length=1, max_length=50)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    
    # Colors
    primary_color: str = Field(..., min_length=7, max_length=7)
    secondary_color: str = Field(..., min_length=7, max_length=7)
    accent_color: Optional[str] = Field(None, min_length=7, max_length=7)
    background_color: str = Field(..., min_length=7, max_length=7)
    text_color: str = Field(..., min_length=7, max_length=7)
    card_background: Optional[str] = Field(None, min_length=7, max_length=7)
    
    # Fonts
    font_heading: Optional[str] = Field(None, max_length=100)
    font_body: Optional[str] = Field(None, max_length=100)
    
    # Styles
    border_radius: int = Field(default=8, ge=0, le=24)
    custom_css: Optional[str] = None
    
    # Seasonal
    is_seasonal: bool = False
    seasonal_start_month: Optional[int] = Field(None, ge=1, le=12)
    seasonal_start_day: Optional[int] = Field(None, ge=1, le=31)
    seasonal_end_month: Optional[int] = Field(None, ge=1, le=12)
    seasonal_end_day: Optional[int] = Field(None, ge=1, le=31)
    
    # Event trigger
    trigger_event_type: Optional[str] = None
    
    @validator('primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color', 'card_background')
    def validate_hex_color(cls, v):
        if v is None:
            return v
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Culoarea trebuie să fie în format hex (#RRGGBB)')
        return v.upper()
    
    @validator('slug')
    def validate_slug(cls, v):
        if not re.match(r'^[a-z0-9_-]+$', v):
            raise ValueError('Slug poate conține doar litere mici, numere, underscore și cratimă')
        return v.lower()


class ThemeCreate(ThemeBase):
    """Schema for creating a theme."""
    preview_image: Optional[str] = None


class ThemeUpdate(BaseModel):
    """Schema for updating a theme."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    primary_color: Optional[str] = Field(None, min_length=7, max_length=7)
    secondary_color: Optional[str] = Field(None, min_length=7, max_length=7)
    accent_color: Optional[str] = Field(None, min_length=7, max_length=7)
    background_color: Optional[str] = Field(None, min_length=7, max_length=7)
    text_color: Optional[str] = Field(None, min_length=7, max_length=7)
    card_background: Optional[str] = Field(None, min_length=7, max_length=7)
    font_heading: Optional[str] = None
    font_body: Optional[str] = None
    border_radius: Optional[int] = Field(None, ge=0, le=24)
    custom_css: Optional[str] = None
    is_seasonal: Optional[bool] = None
    seasonal_start_month: Optional[int] = Field(None, ge=1, le=12)
    seasonal_start_day: Optional[int] = Field(None, ge=1, le=31)
    seasonal_end_month: Optional[int] = Field(None, ge=1, le=12)
    seasonal_end_day: Optional[int] = Field(None, ge=1, le=31)
    trigger_event_type: Optional[str] = None
    preview_image: Optional[str] = None


class ThemeResponse(ThemeBase):
    """Schema for theme response."""
    id: int
    preview_image: Optional[str]
    is_active: bool
    is_system: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ThemeListResponse(BaseModel):
    """Schema for theme list response."""
    themes: list[ThemeResponse]
    active_theme: Optional[ThemeResponse] = None
    total: int


class RelationshipBase(BaseModel):
    """Base relationship schema."""
    relationship_name: Optional[str] = Field(None, max_length=100)
    start_date: datetime
    anniversary_date: Optional[datetime] = None


class RelationshipCreate(RelationshipBase):
    """Schema for creating a relationship."""
    partner1_id: int
    partner2_id: int


class RelationshipUpdate(BaseModel):
    """Schema for updating a relationship."""
    relationship_name: Optional[str] = Field(None, max_length=100)
    start_date: Optional[datetime] = None
    anniversary_date: Optional[datetime] = None


class RelationshipResponse(RelationshipBase):
    """Schema for relationship response."""
    id: int
    partner1_id: int
    partner2_id: int
    created_at: datetime
    
    # Computed fields
    days_together: int = 0
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    
    class Config:
        from_attributes = True