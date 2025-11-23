from fastapi import APIRouter, HTTPException, status, Path
from fastapi.requests import Request
from src.core.clinic_services import get_all_active_clinics, get_company_by_clinic_id
import traceback

router = APIRouter()

@router.get("/clinics")
async def get_clinics_endpoint(request: Request):
    """Get all active clinics."""
    try:
        db = request.app.state.db
        return get_all_active_clinics(db)
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