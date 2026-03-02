"""
Video streaming routes with Range request support.
"""
import os
import mimetypes
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse, FileResponse
from app.config import settings

router = APIRouter()

# Additional video MIME types
MIME_MAP = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".3gp": "video/3gpp",
    ".3g2": "video/3gpp2",
    ".m4v": "video/x-m4v",
    ".mpeg": "video/mpeg",
    ".ogv": "video/ogg",
    ".wmv": "video/x-ms-wmv",
    ".ts": "video/MP2T",
}


def get_mime_type(file_path: str) -> str:
    """Get MIME type for a file."""
    ext = os.path.splitext(file_path)[1].lower()
    return MIME_MAP.get(ext, mimetypes.guess_type(file_path)[0] or "application/octet-stream")


@router.get("/video/{file_path:path}")
async def stream_video(file_path: str, request: Request):
    """
    Stream a video file with Range request support.
    This enables proper video playback on all browsers and devices.
    """
    # Sanitize path - prevent directory traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    
    full_path = os.path.join(settings.UPLOAD_DIR, file_path)
    
    if not os.path.isfile(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    file_size = os.path.getsize(full_path)
    content_type = get_mime_type(full_path)
    
    # Check for Range header
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse range header: "bytes=start-end"
        try:
            range_spec = range_header.strip().lower()
            if not range_spec.startswith("bytes="):
                raise ValueError("Invalid range format")
            
            range_val = range_spec[6:]
            parts = range_val.split("-")
            
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
            
            # Validate range
            if start >= file_size or start < 0:
                raise HTTPException(
                    status_code=416,
                    detail="Range not satisfiable",
                    headers={"Content-Range": f"bytes */{file_size}"}
                )
            
            if end >= file_size:
                end = file_size - 1
            
            content_length = end - start + 1
            
            # Stream the requested range
            async def range_generator():
                chunk_size = 1024 * 1024  # 1MB chunks
                with open(full_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            return StreamingResponse(
                range_generator(),
                status_code=206,
                media_type=content_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Content-Length": str(content_length),
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Allow-Origin": "*",
                },
            )
        except (ValueError, IndexError):
            # If range parsing fails, serve full file
            pass
    
    # No Range header - serve full file
    async def full_generator():
        chunk_size = 1024 * 1024  # 1MB chunks
        with open(full_path, "rb") as f:
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                yield data
    
    return StreamingResponse(
        full_generator(),
        media_type=content_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        },
    )
