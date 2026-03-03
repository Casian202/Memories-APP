"""
Coming Soon page schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class ComingSoonQuoteBase(BaseModel):
    """Base quote schema."""
    text: str = Field(..., min_length=1, max_length=1000)
    author: Optional[str] = Field(None, max_length=200)
    sort_order: int = 0


class ComingSoonQuoteCreate(ComingSoonQuoteBase):
    """Schema for creating a quote."""
    pass


class ComingSoonQuoteResponse(ComingSoonQuoteBase):
    """Schema for quote response."""
    id: int
    page_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ComingSoonPhotoResponse(BaseModel):
    """Schema for photo response."""
    id: int
    page_id: int
    filename: str
    original_filename: Optional[str]
    file_path: str
    file_size: Optional[int]
    mime_type: Optional[str]
    sort_order: int
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class ComingSoonPageBase(BaseModel):
    """Base page schema."""
    display_name: str = Field(default="În curând", max_length=100)
    real_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    reveal_date: date


class ComingSoonPageCreate(ComingSoonPageBase):
    """Schema for creating a page."""
    pass


class ComingSoonPageUpdate(BaseModel):
    """Schema for updating a page."""
    display_name: Optional[str] = Field(None, max_length=100)
    real_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    reveal_date: Optional[date] = None
    is_active: Optional[bool] = None
    map_enabled: Optional[bool] = None
    map_destination_lat: Optional[float] = None
    map_destination_lng: Optional[float] = None
    map_destination_name: Optional[str] = Field(None, max_length=200)
    map_waypoints_json: Optional[str] = None
    map_message: Optional[str] = None


class ComingSoonPageResponse(ComingSoonPageBase):
    """Schema for page response."""
    id: int
    is_active: bool
    is_revealed: bool
    current_name: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    photos: List[ComingSoonPhotoResponse] = []
    quotes: List[ComingSoonQuoteResponse] = []
    map_enabled: bool = False
    map_destination_lat: Optional[float] = None
    map_destination_lng: Optional[float] = None
    map_destination_name: Optional[str] = None
    map_waypoints_json: Optional[str] = None
    map_message: Optional[str] = None

    class Config:
        from_attributes = True


class ComingSoonNavInfo(BaseModel):
    """Minimal info for navigation - what name to show."""
    id: int
    current_name: str
    is_revealed: bool
    is_active: bool
    has_content: bool = False
