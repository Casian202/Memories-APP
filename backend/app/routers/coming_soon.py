"""
Coming Soon page routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.coming_soon import (
    ComingSoonPageCreate,
    ComingSoonPageUpdate,
    ComingSoonPageResponse,
    ComingSoonQuoteCreate,
    ComingSoonQuoteResponse,
    ComingSoonPhotoResponse,
    ComingSoonNavInfo,
)
from app.services.coming_soon_service import ComingSoonService
from app.utils.security import get_current_user, get_admin_user

router = APIRouter()


def _page_to_dict(page):
    """Convert a ComingSoonPage ORM object to a safe dict for response."""
    return {
        "id": page.id,
        "display_name": page.display_name,
        "real_name": page.real_name,
        "description": page.description,
        "reveal_date": str(page.reveal_date) if page.reveal_date else None,
        "is_active": page.is_active,
        "is_revealed": page.is_revealed,
        "current_name": page.current_name,
        "created_by": page.created_by,
        "created_at": page.created_at.isoformat() if page.created_at else None,
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
        "map_enabled": page.map_enabled or False,
        "map_destination_lat": page.map_destination_lat,
        "map_destination_lng": page.map_destination_lng,
        "map_destination_name": page.map_destination_name,
        "map_waypoints_json": page.map_waypoints_json,
        "map_message": page.map_message,
        "photos": [
            {
                "id": p.id,
                "page_id": p.page_id,
                "filename": p.filename,
                "original_filename": p.original_filename,
                "file_path": p.file_path,
                "file_size": p.file_size,
                "mime_type": p.mime_type,
                "sort_order": p.sort_order,
                "uploaded_by": p.uploaded_by,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in (page.photos or [])
        ],
        "quotes": [
            {
                "id": q.id,
                "page_id": q.page_id,
                "text": q.text,
                "author": q.author,
                "sort_order": q.sort_order,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in (page.quotes or [])
        ],
    }


@router.get("/nav-info")
async def get_nav_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get minimal info for navigation — returns all active pages as a list."""
    info = await ComingSoonService.get_nav_info(db)
    if not info:
        return []
    return info


@router.get("/active")
async def get_active_page(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the currently active Coming Soon page."""
    page = await ComingSoonService.get_active_page(db)
    if not page:
        return None
    result = _page_to_dict(page)
    # Non-admin users cannot see content of unrevealed pages (except map data)
    if not current_user.is_admin and not page.is_revealed:
        result["photos"] = []
        result["quotes"] = []
        result["description"] = None
        # Map data remains visible so the user can follow the route
    return result


@router.get("")
async def get_all_pages(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all Coming Soon pages (admin only)."""
    pages = await ComingSoonService.get_all_pages(db)
    return [_page_to_dict(p) for p in pages]


@router.get("/{page_id}")
async def get_page(
    page_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific Coming Soon page."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    result = _page_to_dict(page)
    # Non-admin users cannot see content of unrevealed pages (except map data)
    if not current_user.is_admin and not page.is_revealed:
        result["photos"] = []
        result["quotes"] = []
        result["description"] = None
        # Map data remains visible so the user can follow the route
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_page(
    data: ComingSoonPageCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new Coming Soon page (admin only). Deactivates existing ones."""
    page = await ComingSoonService.create_page(db, data, current_user.id)
    return _page_to_dict(page)


@router.put("/{page_id}")
async def update_page(
    page_id: int,
    data: ComingSoonPageUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a Coming Soon page (admin only)."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    page = await ComingSoonService.update_page(db, page, data)
    return _page_to_dict(page)


@router.delete("/{page_id}")
async def delete_page(
    page_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a Coming Soon page (admin only)."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    await ComingSoonService.delete_page(db, page)
    return {"message": "Pagina a fost ștearsă"}


@router.post("/{page_id}/toggle-active")
async def toggle_page_active(
    page_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle active status of a Coming Soon page (admin only)."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    from app.schemas.coming_soon import ComingSoonPageUpdate
    update_data = ComingSoonPageUpdate(is_active=not page.is_active)
    page = await ComingSoonService.update_page(db, page, update_data)
    return _page_to_dict(page)


# Photo management

@router.post("/{page_id}/photos")
async def upload_photos(
    page_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload photos for slideshow (admin only)."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    photos = await ComingSoonService.upload_photos(db, page_id, files, current_user.id)
    return {
        "message": f"{len(photos)} foto-uri încărcate cu succes",
        "photos": [
            {
                "id": p.id,
                "page_id": p.page_id,
                "filename": p.filename,
                "original_filename": p.original_filename,
                "file_path": p.file_path,
                "file_size": p.file_size,
                "sort_order": p.sort_order,
            }
            for p in photos
        ]
    }


@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a Coming Soon photo (admin only)."""
    await ComingSoonService.delete_photo(db, photo_id)
    return {"message": "Foto-ul a fost șters"}


# Quote management

@router.post("/{page_id}/quotes")
async def add_quote(
    page_id: int,
    data: ComingSoonQuoteCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a quote to a page (admin only)."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagina nu a fost găsită"
        )
    quote = await ComingSoonService.add_quote(db, page_id, data)
    return {
        "id": quote.id,
        "page_id": quote.page_id,
        "text": quote.text,
        "author": quote.author,
        "sort_order": quote.sort_order,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
    }


@router.delete("/quotes/{quote_id}")
async def delete_quote(
    quote_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a quote (admin only)."""
    await ComingSoonService.delete_quote(db, quote_id)
    return {"message": "Citatul a fost șters"}
