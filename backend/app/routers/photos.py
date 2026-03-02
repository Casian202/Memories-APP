"""
Photo routes.
"""
import os
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles

from app.database import get_db
from app.models.user import User
from app.models.photo import Photo, Collage
from app.schemas.event import PhotoResponse
from app.services.photo_service import PhotoService
from app.services.event_service import EventService
from app.utils.security import get_current_user, get_admin_user
from app.utils.image_processor import validate_media, is_video, generate_filename
from app.config import settings

router = APIRouter()


# ---- Chunked Upload Endpoints ----
# These allow mobile clients to upload large files in small pieces
# which works around Cloudflare Tunnel's upload size limits

@router.post("/events/{event_id}/upload/init")
async def init_chunked_upload(
    event_id: int,
    filename: str = Form(...),
    file_size: int = Form(...),
    content_type: str = Form(...),
    total_chunks: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize a chunked upload session for large files."""
    # Check event exists
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evenimentul nu a fost găsit")
    
    # Validate content type
    if not validate_media(content_type):
        raise HTTPException(status_code=400, detail=f"Tip fișier nepermis: {content_type}")
    
    # Check file size
    max_size = settings.MAX_UPLOAD_SIZE * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"Fișier prea mare. Maxim {settings.MAX_UPLOAD_SIZE}MB")
    
    # Generate upload ID and temp directory
    upload_id = str(uuid.uuid4())
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp", upload_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save upload metadata
    meta = {
        "upload_id": upload_id,
        "event_id": event_id,
        "user_id": current_user.id,
        "original_filename": filename,
        "content_type": content_type,
        "file_size": file_size,
        "total_chunks": total_chunks,
        "received_chunks": [],
    }
    meta_path = os.path.join(temp_dir, "meta.json")
    async with aiofiles.open(meta_path, "w") as f:
        await f.write(json.dumps(meta))
    
    return {"upload_id": upload_id, "message": "Upload inițializat"}


@router.post("/events/{event_id}/upload/{upload_id}/chunk")
async def upload_chunk(
    event_id: int,
    upload_id: str,
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a single chunk of a file."""
    # Validate upload_id format (prevent path traversal)
    try:
        uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload_id")
    
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp", upload_id)
    meta_path = os.path.join(temp_dir, "meta.json")
    
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Upload session nu există sau a expirat")
    
    # Read metadata
    async with aiofiles.open(meta_path, "r") as f:
        meta = json.loads(await f.read())
    
    if meta["event_id"] != event_id:
        raise HTTPException(status_code=400, detail="Event ID nu se potrivește")
    
    # Save chunk
    chunk_path = os.path.join(temp_dir, f"chunk_{chunk_index:06d}")
    content = await chunk.read()
    async with aiofiles.open(chunk_path, "wb") as f:
        await f.write(content)
    
    # Update metadata
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


@router.post("/events/{event_id}/upload/{upload_id}/complete")
async def complete_chunked_upload(
    event_id: int,
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assemble chunks and finalize the upload."""
    # Validate upload_id format
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
    
    if meta["event_id"] != event_id:
        raise HTTPException(status_code=400, detail="Event ID nu se potrivește")
    
    received = len(meta["received_chunks"])
    total = meta["total_chunks"]
    if received < total:
        raise HTTPException(status_code=400, detail=f"Lipsesc chunk-uri: {received}/{total}")
    
    # Generate final filename
    final_filename = generate_filename(meta["original_filename"])
    subfolder = f"events/{event_id}"
    final_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(final_dir, exist_ok=True)
    final_path = os.path.join(final_dir, final_filename)
    
    # Assemble chunks into final file
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
    
    # Clean up temp directory
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)
    
    # Determine media type
    content_type = meta["content_type"]
    media_type = "video" if is_video(content_type) else "image"
    
    # If it's an image, process it (resize etc.)
    if media_type == "image":
        from app.utils.image_processor import process_image, save_image
        async with aiofiles.open(final_path, "rb") as f:
            raw_data = await f.read()
        try:
            processed, width, height = await process_image(raw_data, meta["original_filename"])
            # Overwrite with processed image
            async with aiofiles.open(final_path, "wb") as f:
                await f.write(processed)
            total_size = len(processed)
        except Exception:
            width, height = None, None
    else:
        width, height = None, None
    
    rel_path = os.path.join(subfolder, final_filename)
    
    # Check if video needs transcoding (will be done in background)
    transcode_needed = False
    if media_type == "video":
        from app.utils.image_processor import needs_transcoding
        transcode_needed = needs_transcoding(rel_path)
    
    # Save to database
    photo = Photo(
        event_id=event_id,
        filename=final_filename,
        original_filename=meta["original_filename"],
        file_path=rel_path,
        file_size=total_size,
        mime_type=content_type if media_type == "video" else "image/jpeg",
        media_type=media_type,
        transcoding_status="pending" if transcode_needed else None,
        width=width,
        height=height,
        is_cover=False,
        uploaded_by=current_user.id
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    
    # Start background transcoding if needed
    if transcode_needed:
        from app.services.transcode_service import start_background_transcode
        start_background_transcode(photo.id, rel_path, subfolder)
    
    return {
        "message": "Fișier încărcat cu succes",
        "photo": PhotoResponse.from_orm(photo)
    }


# ---- Standard Upload Endpoints ----


@router.post("/events/{event_id}/photos")
async def upload_photos(
    event_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload photos/videos to an event."""
    # Check event exists
    event = await EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evenimentul nu a fost găsit"
        )
    
    photos = await PhotoService.upload_photos(db, event_id, files, current_user.id)
    return {
        "message": f"{len(photos)} fișiere încărcate cu succes",
        "photos": [PhotoResponse.from_orm(p) for p in photos]
    }


@router.get("/events/{event_id}/photos", response_model=List[PhotoResponse])
async def get_event_photos(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all photos/videos for an event."""
    photos = await PhotoService.get_event_photos(db, event_id)
    return [PhotoResponse.from_orm(p) for p in photos]


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