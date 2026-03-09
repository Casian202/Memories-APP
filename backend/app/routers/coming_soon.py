"""
Coming Soon page routes.
"""
import os
import uuid
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles

from app.database import get_db
from app.models.user import User
from app.models.coming_soon import ComingSoonPhoto
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
from app.utils.image_processor import validate_media, is_video, generate_filename
from app.config import settings

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
                "media_type": getattr(p, 'media_type', 'image') or 'image',
                "transcoding_status": getattr(p, 'transcoding_status', None),
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
        "message": f"{len(photos)} fișiere încărcate cu succes",
        "photos": [
            {
                "id": p.id,
                "page_id": p.page_id,
                "filename": p.filename,
                "original_filename": p.original_filename,
                "file_path": p.file_path,
                "file_size": p.file_size,
                "media_type": getattr(p, 'media_type', 'image') or 'image',
                "transcoding_status": getattr(p, 'transcoding_status', None),
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


# ---- Chunked Upload Endpoints for Coming Soon ----

@router.post("/{page_id}/upload/init")
async def init_chunked_upload(
    page_id: int,
    filename: str = Form(...),
    file_size: int = Form(...),
    content_type: str = Form(...),
    total_chunks: int = Form(...),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize a chunked upload session for large files."""
    page = await ComingSoonService.get_page_by_id(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Pagina nu a fost găsită")

    if not validate_media(content_type):
        raise HTTPException(status_code=400, detail=f"Tip fișier nepermis: {content_type}")

    max_size = 500 * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail="Fișier prea mare. Maxim 500MB")

    upload_id = str(uuid.uuid4())
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp", upload_id)
    os.makedirs(temp_dir, exist_ok=True)

    meta = {
        "upload_id": upload_id,
        "page_id": page_id,
        "user_id": current_user.id,
        "original_filename": filename,
        "content_type": content_type,
        "file_size": file_size,
        "total_chunks": total_chunks,
        "received_chunks": [],
        "type": "coming_soon",
    }
    meta_path = os.path.join(temp_dir, "meta.json")
    async with aiofiles.open(meta_path, "w") as f:
        await f.write(json.dumps(meta))

    return {"upload_id": upload_id, "message": "Upload inițializat"}


@router.post("/{page_id}/upload/{upload_id}/chunk")
async def upload_chunk(
    page_id: int,
    upload_id: str,
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a single chunk of a file."""
    try:
        uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp", upload_id)
    meta_path = os.path.join(temp_dir, "meta.json")

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Upload session nu există sau a expirat")

    async with aiofiles.open(meta_path, "r") as f:
        meta = json.loads(await f.read())

    if meta["page_id"] != page_id:
        raise HTTPException(status_code=400, detail="Page ID nu se potrivește")

    chunk_path = os.path.join(temp_dir, f"chunk_{chunk_index:06d}")
    content = await chunk.read()
    async with aiofiles.open(chunk_path, "wb") as f:
        await f.write(content)

    if chunk_index not in meta["received_chunks"]:
        meta["received_chunks"].append(chunk_index)
        meta["received_chunks"].sort()
    async with aiofiles.open(meta_path, "w") as f:
        await f.write(json.dumps(meta))

    received = len(meta["received_chunks"])
    total = meta["total_chunks"]

    return {
        "chunk_index": chunk_index,
        "received": received,
        "total": total,
        "complete": received >= total
    }


@router.post("/{page_id}/upload/{upload_id}/complete")
async def complete_chunked_upload(
    page_id: int,
    upload_id: str,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Assemble chunks and finalize the upload."""
    try:
        uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp", upload_id)
    meta_path = os.path.join(temp_dir, "meta.json")

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Upload session nu există")

    async with aiofiles.open(meta_path, "r") as f:
        meta = json.loads(await f.read())

    if meta["page_id"] != page_id:
        raise HTTPException(status_code=400, detail="Page ID nu se potrivește")

    received = len(meta["received_chunks"])
    total = meta["total_chunks"]
    if received < total:
        raise HTTPException(status_code=400, detail=f"Lipsesc chunk-uri: {received}/{total}")

    final_filename = generate_filename(meta["original_filename"])
    subfolder = f"coming_soon/{page_id}"
    final_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(final_dir, exist_ok=True)
    final_path = os.path.join(final_dir, final_filename)

    # Assemble chunks
    total_size = 0
    async with aiofiles.open(final_path, "wb") as out_f:
        for i in range(total):
            chunk_path = os.path.join(temp_dir, f"chunk_{i:06d}")
            if not os.path.exists(chunk_path):
                raise HTTPException(status_code=400, detail=f"Chunk {i} lipsește")
            async with aiofiles.open(chunk_path, "rb") as chunk_f:
                data = await chunk_f.read()
                total_size += len(data)
                await out_f.write(data)

    # Clean up temp
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

    content_type = meta["content_type"]
    media_type = "video" if is_video(content_type) else "image"

    if media_type == "image":
        from app.utils.image_processor import process_image
        async with aiofiles.open(final_path, "rb") as f:
            raw_data = await f.read()
        try:
            processed, width, height = await process_image(raw_data, meta["original_filename"])
            async with aiofiles.open(final_path, "wb") as f:
                await f.write(processed)
            total_size = len(processed)
        except Exception:
            pass

    rel_path = os.path.join(subfolder, final_filename)

    transcode_needed = False
    if media_type == "video":
        from app.utils.image_processor import needs_transcoding
        transcode_needed = needs_transcoding(rel_path)

    # Get next sort order
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(ComingSoonPhoto)
        .where(ComingSoonPhoto.page_id == page_id)
        .order_by(ComingSoonPhoto.sort_order.desc())
        .limit(1)
    )
    last = result.scalars().first()
    sort_order = (last.sort_order + 1) if last else 0

    photo = ComingSoonPhoto(
        page_id=page_id,
        filename=final_filename,
        original_filename=meta["original_filename"],
        file_path=rel_path,
        file_size=total_size,
        mime_type=content_type if media_type == "video" else "image/jpeg",
        media_type=media_type,
        transcoding_status="pending" if transcode_needed else ("done" if media_type == "video" else None),
        sort_order=sort_order,
        uploaded_by=current_user.id
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    if transcode_needed:
        from app.services.transcode_service import start_coming_soon_background_transcode
        start_coming_soon_background_transcode(photo.id, rel_path, subfolder)

    return {
        "message": "Fișier încărcat cu succes",
        "photo": {
            "id": photo.id,
            "page_id": photo.page_id,
            "filename": photo.filename,
            "original_filename": photo.original_filename,
            "file_path": photo.file_path,
            "file_size": photo.file_size,
            "media_type": photo.media_type,
            "transcoding_status": photo.transcoding_status,
            "sort_order": photo.sort_order,
        }
    }
