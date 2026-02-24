"""
Photo service for managing event photos.
"""
import os
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile, HTTPException, status

from app.models.photo import Photo, Collage
from app.utils.image_processor import (
    validate_image,
    generate_filename,
    process_image,
    save_image
)
from app.config import settings


class PhotoService:
    """Service for managing photos."""
    
    @staticmethod
    async def upload_photos(
        db: AsyncSession,
        event_id: int,
        files: List[UploadFile],
        user_id: int
    ) -> List[Photo]:
        """Upload multiple photos for an event."""
        uploaded_photos = []
        
        for file in files:
            # Validate file type
            if not validate_image(file.content_type):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tip fișier nepermis: {file.content_type}"
                )
            
            # Read file content
            content = await file.read()
            
            # Check file size (max 50MB before processing)
            if len(content) > 50 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fișier prea mare. Maxim 50MB"
                )
            
            # Process image
            try:
                processed, width, height = await process_image(
                    content,
                    file.filename
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Eroare la procesarea imaginii: {str(e)}"
                )
            
            # Generate filename and save
            filename = generate_filename(file.filename)
            subfolder = f"events/{event_id}"
            
            file_path = await save_image(processed, filename, subfolder)
            
            # Create photo record
            photo = Photo(
                event_id=event_id,
                filename=filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=len(processed),
                mime_type="image/jpeg",
                width=width,
                height=height,
                is_cover=False,
                uploaded_by=user_id
            )
            
            db.add(photo)
            uploaded_photos.append(photo)
        
        await db.commit()
        
        for photo in uploaded_photos:
            await db.refresh(photo)
        
        return uploaded_photos
    
    @staticmethod
    async def get_event_photos(
        db: AsyncSession,
        event_id: int
    ) -> List[Photo]:
        """Get all photos for an event."""
        query = select(Photo).where(
            Photo.event_id == event_id
        ).order_by(Photo.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_photo_by_id(db: AsyncSession, photo_id: int) -> Optional[Photo]:
        """Get a photo by ID."""
        query = select(Photo).where(Photo.id == photo_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_photo(db: AsyncSession, photo: Photo) -> None:
        """Delete a photo."""
        # Delete file from disk
        file_path = os.path.join(settings.UPLOAD_DIR, photo.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        await db.delete(photo)
        await db.commit()
    
    @staticmethod
    async def set_as_cover(db: AsyncSession, photo: Photo) -> Photo:
        """Set a photo as cover for its event."""
        # Re-query the photo to ensure it's attached to the current session
        db_photo = await PhotoService.get_photo_by_id(db, photo.id)
        if not db_photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Foto nu a fost găsită"
            )

        # Unset previous cover
        query = select(Photo).where(
            Photo.event_id == db_photo.event_id,
            Photo.is_cover == True
        )
        result = await db.execute(query)
        previous_cover = result.scalar_one_or_none()

        if previous_cover:
            previous_cover.is_cover = False

        db_photo.is_cover = True
        await db.commit()
        await db.refresh(db_photo)

        return db_photo
    
    @staticmethod
    async def create_collage(
        db: AsyncSession,
        event_id: int,
        photo_ids: List[int],
        layout_type: str,
        name: Optional[str],
        user_id: int
    ) -> Collage:
        """Create a collage from selected photos."""
        import json
        
        collage = Collage(
            event_id=event_id,
            name=name or f"Collage {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            layout_type=layout_type,
            photo_ids=json.dumps(photo_ids),
            created_by=user_id
        )
        
        db.add(collage)
        await db.commit()
        await db.refresh(collage)
        
        return collage
    
    @staticmethod
    async def get_collages(db: AsyncSession, event_id: int) -> List[Collage]:
        """Get all collages for an event."""
        query = select(Collage).where(
            Collage.event_id == event_id
        ).order_by(Collage.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def delete_collage(db: AsyncSession, collage: Collage) -> None:
        """Delete a collage."""
        # Delete generated file if exists
        if collage.generated_path:
            file_path = os.path.join(settings.UPLOAD_DIR, collage.generated_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        await db.delete(collage)
        await db.commit()