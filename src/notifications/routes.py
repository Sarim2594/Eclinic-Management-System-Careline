from fastapi import APIRouter, HTTPException, status, Path, Query
from fastapi.requests import Request
from src.notifications.services import get_notifications, mark_notification_as_read, mark_all_notifications_as_read
from typing import Optional
import traceback

router = APIRouter()

@router.get("/notifications/{role}")
async def get_user_notifications_endpoint(
    request: Request,
    role: str = Path(..., description="Role (e.g., superadmin, doctor)"), 
    user_id: Optional[int] = Query(None, description="User ID (required for non-SuperAdmin roles)")
):
    """Get notifications for specific user role."""
    try:
        db = request.app.state.db
        return get_notifications(db, role, user_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/notifications/mark-read/{notification_id}")
async def mark_notification_read_endpoint(notification_id: int, request: Request):
    """Mark a notification as read."""
    try:
        db = request.app.state.db
        return mark_notification_as_read(db, notification_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/notifications/mark-all-read/{role}")
async def mark_all_notifications_read_endpoint(
    request: Request,
    role: str = Path(..., description="Role (e.g., superadmin, doctor)"), 
    user_id: Optional[int] = Query(None, description="User ID (required for non-SuperAdmin roles)")
):
    """Mark all notifications as read for a user."""
    try:
        db = request.app.state.db
        return mark_all_notifications_as_read(db, role, user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))