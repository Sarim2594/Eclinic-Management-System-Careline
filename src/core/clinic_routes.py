from fastapi import APIRouter, HTTPException, status, Path
from fastapi.requests import Request
from src.core.clinic_services import get_all_active_clinics, get_company_by_clinic_id
import traceback
from typing import Optional

router = APIRouter()

@router.get("/clinics")
async def get_clinics_endpoint(request: Request, company_id: Optional[int] = None, admin_id: Optional[int] = None):
    """Get all active clinics; optionally filter by company and admin regions."""
    try:
        db = request.app.state.db
        return get_all_active_clinics(db, company_id, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/clinic/{clinic_id}/company")
async def get_clinic_company_endpoint(request: Request, clinic_id: int = Path(...)):
    """Get the company_id for a specific clinic."""
    try:
        db = request.app.state.db
        return get_company_by_clinic_id(db, clinic_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))