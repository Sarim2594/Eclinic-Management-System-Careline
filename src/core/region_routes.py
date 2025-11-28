from fastapi import APIRouter, HTTPException, status, Path
from fastapi.requests import Request
from src.core.region_services import lookup_province_and_region, get_all_geographical_regions, get_cities_in_a_region, get_cities_for_clinic_creation
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
    
@router.get("/api/regions/{region_id}/cities")
async def get_cities_for_region(region_id: int, request: Request):
    """Get all cities in a specific region"""
    try:
        db = request.app.state.db
        return get_cities_in_a_region(db, region_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/cities/all")
async def get_all_cities(request: Request):
    """Get all cities with their region information"""
    try:
        db = request.app.state.db
        return get_cities_for_clinic_creation(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
