"""
Surprise schemas for request/response validation.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, date, time
from enum import Enum


class SurpriseType(str, Enum):
    """Surprise types."""
    PHOTO = "photo"
    MESSAGE = "message"
    GIFT_LINK = "gift_link"
    VIDEO = "video"


class RevealType(str, Enum):
    """Reveal condition types."""
    DATE = "date"
    CLICKS = "clicks"
    BOTH = "both"


class SurpriseBase(BaseModel):
    """Base surprise schema."""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    surprise_type: SurpriseType = SurpriseType.PHOTO
    message: Optional[str] = None
    reveal_type: RevealType = RevealType.DATE
    reveal_date: Optional[date] = None
    reveal_time: Optional[time] = None
    reveal_clicks: int = Field(default=1, ge=1, le=100)
    click_cooldown: int = Field(default=500, ge=100, le=5000)


class SurpriseCreate(SurpriseBase):
    """Schema for creating a surprise."""
    to_user_id: Optional[int] = None
    
    @validator('reveal_date', always=True)
    def validate_reveal_conditions(cls, v, values):
        reveal_type = values.get('reveal_type')
        if reveal_type in [RevealType.DATE, RevealType.BOTH] and not v:
            raise ValueError('reveal_date este necesar când reveal_type este "date" sau "both"')
        return v


class SurpriseUpdate(BaseModel):
    """Schema for updating a surprise."""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    message: Optional[str] = None
    reveal_type: Optional[RevealType] = None
    reveal_date: Optional[date] = None
    reveal_time: Optional[time] = None
    reveal_clicks: Optional[int] = Field(None, ge=1, le=100)


class SurpriseClick(BaseModel):
    """Schema for registering a click on a surprise."""
    pass


class SurpriseReveal(BaseModel):
    """Schema for revealing a surprise."""
    pass


class SurpriseResponse(SurpriseBase):
    """Schema for surprise response."""
    id: int
    from_user_id: int
    to_user_id: int
    content_path: Optional[str]
    current_clicks: int
    is_revealed: bool
    revealed_at: Optional[datetime]
    last_click_at: Optional[datetime]
    created_at: datetime
    
    # Computed fields for frontend
    can_reveal: bool = False
    progress_percentage: float = 0.0
    from_user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class SurpriseMysteryCard(BaseModel):
    """Schema for mystery card display (before reveal)."""
    id: int
    from_user_id: int
    surprise_type: SurpriseType
    reveal_type: RevealType
    reveal_date: Optional[date]
    reveal_clicks: Optional[int]
    current_clicks: int
    is_revealed: bool
    can_reveal: bool
    progress_percentage: float
    
    class Config:
        from_attributes = True


class SurpriseListResponse(BaseModel):
    """Schema for surprise list response."""
    surprises: list[SurpriseResponse]
    total: int