"""Fix DB record for event 6 video after transcoding."""
import asyncio
import os
from app.database import async_session
from sqlalchemy import select
from app.models.photo import Photo


async def fix():
    async with async_session() as db:
        result = await db.execute(
            select(Photo).where(Photo.file_path.like("%d6cf3c1c%"))
        )
        photos = result.scalars().all()
        for p in photos:
            print(f"Found: id={p.id} path={p.file_path} mime={p.mime_type}")
            p.file_path = "events/6/d6cf3c1c-0403-4e0b-9bac-a153f27e4969.mp4"
            p.mime_type = "video/mp4"
            new_path = os.path.join("/data/photos", p.file_path)
            if os.path.exists(new_path):
                p.file_size = os.path.getsize(new_path)
                print(f"Updated: path={p.file_path} size={p.file_size}")
        await db.commit()
        print("Done")


if __name__ == "__main__":
    asyncio.run(fix())
