"""
Coming Soon page service for managing the special reveal pages.
"""
import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from fastapi import UploadFile, HTTPException, status

from app.models.coming_soon import ComingSoonPage, ComingSoonPhoto, ComingSoonQuote
from app.schemas.coming_soon import ComingSoonPageCreate, ComingSoonPageUpdate, ComingSoonQuoteCreate
from app.utils.image_processor import validate_image, generate_filename, process_image, save_image
from app.config import settings


class ComingSoonService:
    """Service for managing Coming Soon pages."""

    @staticmethod
    async def get_active_page(db: AsyncSession) -> Optional[ComingSoonPage]:
        """Get the currently active Coming Soon page with photos and quotes."""
        result = await db.execute(
            select(ComingSoonPage)
            .where(ComingSoonPage.is_active == True)
            .options(
                selectinload(ComingSoonPage.photos),
                selectinload(ComingSoonPage.quotes)
            )
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def get_page_by_id(db: AsyncSession, page_id: int) -> Optional[ComingSoonPage]:
        """Get a page by ID with photos and quotes."""
        result = await db.execute(
            select(ComingSoonPage)
            .where(ComingSoonPage.id == page_id)
            .options(
                selectinload(ComingSoonPage.photos),
                selectinload(ComingSoonPage.quotes)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def get_all_pages(db: AsyncSession) -> List[ComingSoonPage]:
        """Get all Coming Soon pages."""
        result = await db.execute(
            select(ComingSoonPage)
            .options(
                selectinload(ComingSoonPage.photos),
                selectinload(ComingSoonPage.quotes)
            )
            .order_by(ComingSoonPage.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_page(db: AsyncSession, data: ComingSoonPageCreate, user_id: int) -> ComingSoonPage:
        """Create a new Coming Soon page. Deactivates any existing active pages."""
        # Deactivate existing active pages
        await db.execute(
            update(ComingSoonPage).where(ComingSoonPage.is_active == True).values(is_active=False)
        )

        page = ComingSoonPage(
            display_name=data.display_name,
            real_name=data.real_name,
            description=data.description,
            reveal_date=data.reveal_date,
            is_active=True,
            created_by=user_id
        )
        db.add(page)
        await db.commit()
        await db.refresh(page)

        # Reload with relationships
        return await ComingSoonService.get_page_by_id(db, page.id)

    @staticmethod
    async def update_page(db: AsyncSession, page: ComingSoonPage, data: ComingSoonPageUpdate) -> ComingSoonPage:
        """Update a Coming Soon page."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(page, key, value)
        page.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(page)
        return await ComingSoonService.get_page_by_id(db, page.id)

    @staticmethod
    async def delete_page(db: AsyncSession, page: ComingSoonPage) -> None:
        """Delete a Coming Soon page and its photos/quotes."""
        # Delete photo files
        for photo in page.photos:
            photo_path = os.path.join(settings.upload_dir, photo.file_path)
            if os.path.exists(photo_path):
                os.remove(photo_path)
        
        await db.delete(page)
        await db.commit()

    @staticmethod
    async def upload_photos(
        db: AsyncSession,
        page_id: int,
        files: List[UploadFile],
        user_id: int
    ) -> List[ComingSoonPhoto]:
        """Upload photos for slideshow."""
        uploaded = []

        # Get current max sort order
        result = await db.execute(
            select(ComingSoonPhoto)
            .where(ComingSoonPhoto.page_id == page_id)
            .order_by(ComingSoonPhoto.sort_order.desc())
            .limit(1)
        )
        last = result.scalars().first()
        sort_order = (last.sort_order + 1) if last else 0

        for file in files:
            if not validate_image(file.content_type):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tip fișier nepermis: {file.content_type}"
                )

            content = await file.read()
            if len(content) > 50 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fișier prea mare. Maxim 50MB"
                )

            try:
                processed, width, height = await process_image(content, file.filename)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Eroare la procesarea imaginii: {str(e)}"
                )

            filename = generate_filename(file.filename)
            subfolder = f"coming_soon/{page_id}"
            file_path = await save_image(processed, filename, subfolder)

            photo = ComingSoonPhoto(
                page_id=page_id,
                filename=filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=len(processed),
                mime_type="image/jpeg",
                sort_order=sort_order,
                uploaded_by=user_id
            )
            db.add(photo)
            uploaded.append(photo)
            sort_order += 1

        await db.commit()
        for p in uploaded:
            await db.refresh(p)
        return uploaded

    @staticmethod
    async def delete_photo(db: AsyncSession, photo_id: int) -> None:
        """Delete a Coming Soon photo."""
        result = await db.execute(
            select(ComingSoonPhoto).where(ComingSoonPhoto.id == photo_id)
        )
        photo = result.scalars().first()
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Foto-ul nu a fost găsit"
            )

        # Delete file
        photo_path = os.path.join(settings.upload_dir, photo.file_path)
        if os.path.exists(photo_path):
            os.remove(photo_path)

        await db.delete(photo)
        await db.commit()

    @staticmethod
    async def add_quote(db: AsyncSession, page_id: int, data: ComingSoonQuoteCreate) -> ComingSoonQuote:
        """Add a quote to a page."""
        quote = ComingSoonQuote(
            page_id=page_id,
            text=data.text,
            author=data.author,
            sort_order=data.sort_order
        )
        db.add(quote)
        await db.commit()
        await db.refresh(quote)
        return quote

    @staticmethod
    async def delete_quote(db: AsyncSession, quote_id: int) -> None:
        """Delete a quote."""
        result = await db.execute(
            select(ComingSoonQuote).where(ComingSoonQuote.id == quote_id)
        )
        quote = result.scalars().first()
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Citatul nu a fost găsit"
            )
        await db.delete(quote)
        await db.commit()

    @staticmethod
    async def get_nav_info(db: AsyncSession) -> Optional[dict]:
        """Get minimal info for navigation display."""
        page = await ComingSoonService.get_active_page(db)
        if not page:
            return None
        return {
            "id": page.id,
            "current_name": page.current_name,
            "is_revealed": page.is_revealed,
            "is_active": page.is_active,
            "has_content": len(page.photos) > 0 or len(page.quotes) > 0
        }
