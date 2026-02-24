"""
API routers package.
"""
from fastapi import APIRouter
from app.routers import auth, events, photos, surprises, motivations, messages, themes, admin, settings, coming_soon, notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(photos.router, prefix="", tags=["photos"])
api_router.include_router(surprises.router, prefix="/surprises", tags=["surprises"])
api_router.include_router(coming_soon.router, prefix="/coming-soon", tags=["coming-soon"])
api_router.include_router(motivations.router, prefix="/motivations", tags=["motivations"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(themes.router, prefix="/themes", tags=["themes"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
