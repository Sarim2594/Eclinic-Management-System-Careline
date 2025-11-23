from fastapi import APIRouter, HTTPException, status, Path
from fastapi.requests import Request
from src.core.region_services import lookup_province_and_region, get_all_geographical_regions
import traceback

# Define the router object here
router = APIRouter()

# ============================================================================
# REGION UTILITIES ENDPOINTS
# ============================================================================

@router.get("/regions/lookup/{city}")
async def lookup_city_region(city: str, request: Request):
    """Get province and sub-region for a city"""
    try:
        db = request.app.state.db
        return lookup_province_and_region(db, city)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/regions/all")
async def get_all_regions(request: Request):
    """Get all provinces, sub-regions, and cities"""
    try:
        db = request.app.state.db
        return get_all_geographical_regions(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))