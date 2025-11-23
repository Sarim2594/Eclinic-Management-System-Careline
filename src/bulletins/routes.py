from fastapi import APIRouter, HTTPException, status, Path
from fastapi.requests import Request
from src.bulletins.services import get_all_bulletins, get_bulletins_by_admin_id, get_bulletins_by_company_id
import traceback

router = APIRouter()

@router.get("/bulletins")
async def get_bulletins_endpoint(request: Request):
    """Get all active bulletins for the entire system."""
    try:
        db = request.app.state.db
        return get_all_bulletins(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.get("/bulletins/admin/{admin_id}")
async def get_admin_bulletins_endpoint(request: Request, admin_id: int = Path(...)):
    """Get bulletins for an admin's company only."""
    try:
        db = request.app.state.db
        return get_bulletins_by_admin_id(db, admin_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.get("/bulletins/company/{company_id}")
async def get_company_bulletins_endpoint(request: Request, company_id: int = Path(...)):
    """Get all active bulletins for a specific company."""
    try:
        db = request.app.state.db
        return get_bulletins_by_company_id(db, company_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))