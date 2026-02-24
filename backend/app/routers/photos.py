"""
Photo routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.photo import Photo, Collage
from app.services.photo_service import PhotoService
from app.services.event_service import EventService
from app.utils.security import get_current_user, get_admin_user

router = APIRouter()


@router.post("/events/{event_id}/photos")
async def upload_photos(
    event_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload photos to an event."""
    # Check event exists
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    
    photos = await PhotoService.upload_photos(db, event_id, files, current_user.id)
    return {"message": f"{len(photos)} foto-uri încărcate cu succes", "photos": photos}


@router.get("/events/{event_id}/photos")
async def get_event_photos(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all photos for an event."""
    photos = await PhotoService.get_event_photos(db, event_id)
    return photos


@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a photo."""
    photo = await PhotoService.get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foto-ul nu a fost găsit"
        )
    
    await PhotoService.delete_photo(db, photo)
    return {"message": "Foto-ul a fost șters cu succes"}


@router.put("/photos/{photo_id}/cover")
async def set_photo_as_cover(
    photo_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Set a photo as event cover (admin only)."""
    photo = await PhotoService.get_photo_by_id(db, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foto-ul nu a fost găsit"
        )
    
    photo = await PhotoService.set_as_cover(db, photo)
    return {"message": "Foto-ul a fost setat ca copertă", "photo": photo}


@router.post("/collages")
async def create_collage(
    event_id: int = Form(...),
    photo_ids: str = Form(...),
    layout_type: str = Form("grid"),
    name: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a collage from selected photos."""
    import json
    
    try:
        photo_ids_list = json.loads(photo_ids)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format invalid pentru photo_ids"
        )
    
    collage = await PhotoService.create_collage(
        db, event_id, photo_ids_list, layout_type, name, current_user.id
    )
    return {"message": "Colajul a fost creat", "collage": collage}


@router.get("/collages/{event_id}")
async def get_collages(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all collages for an event."""
    collages = await PhotoService.get_collages(db, event_id)
    return collages


@router.delete("/collages/{collage_id}")
async def delete_collage(
    collage_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a collage."""
    from sqlalchemy import select
    from app.models.photo import Collage
    
    result = await db.execute(select(Collage).where(Collage.id == collage_id))
    collage = result.scalar_one_or_none()
    
    if not collage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colajul nu a fost găsit"
        )
    
    await PhotoService.delete_collage(db, collage)
    return {"message": "Colajul a fost șters cu succes"}