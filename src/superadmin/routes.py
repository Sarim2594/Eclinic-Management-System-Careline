from fastapi import APIRouter, HTTPException, status, Request, Path
from typing import Optional
import traceback

# --- IMPORT MODELS ---
from src.superadmin.models import CompanyCreate, AdminCreate, AdminRegionsUpdate, CompanyStatusUpdate

# --- IMPORT SERVICE LAYERS ---
from src.superadmin.dashboard_services import get_system_dashboard_data, get_all_companies_with_stats
from src.superadmin.company_services import register_new_company, update_company_status, get_clinics_by_company
from src.superadmin.admin_services import (
    get_all_admins_with_details, create_new_admin, get_admin_assigned_regions, 
    update_admin_assigned_regions, update_admin_contact_number, delete_admin_account
)
from src.superadmin.analytics_services import get_platform_analytics
from src.superadmin.change_request_services import get_pending_change_requests, approve_admin_change_request, reject_admin_change_request
from src.core.region_services import lookup_province_and_region, get_all_geographical_regions

router = APIRouter()

# ============================================================================
# 1. DASHBOARD & COMPANY READS
# ============================================================================

@router.get("/dashboard")
async def get_dashboard(request: Request):
    """Get superadmin dashboard statistics"""
    try:
        db = request.app.state.db
        return get_system_dashboard_data(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/companies")
async def get_all_companies(request: Request):
    """Get all companies with their statistics"""
    try:
        db = request.app.state.db
        return get_all_companies_with_stats(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/company/{company_id}/clinics")
async def get_company_clinics(request: Request, company_id: int = Path(...)):
    """Get all clinics for a specific company"""
    try:
        db = request.app.state.db
        return get_clinics_by_company(db, company_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 2. COMPANY MANAGEMENT (Write)
# ============================================================================

@router.post("/register-company")
async def register_company(request: Request, company: CompanyCreate):
    """Register a new company"""
    try:
        db = request.app.state.db
        return register_new_company(db, company)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/company/{company_id}/status")
async def toggle_company_status(request: Request, company_id: int, status_update: CompanyStatusUpdate):
    """Activate or deactivate a company"""
    try:
        db = request.app.state.db
        return update_company_status(db, company_id, status_update)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 3. ADMIN MANAGEMENT (CRUD)
# ============================================================================

@router.get("/admins")
async def get_all_admins(request: Request):
    """Get all admins with their company and region information"""
    try:
        db = request.app.state.db
        return get_all_admins_with_details(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/create-admin")
async def create_admin(request: Request, admin: AdminCreate):
    """Create a new admin account with region assignments"""
    try:
        db = request.app.state.db
        return create_new_admin(db, admin)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/{admin_id}/regions")
async def get_admin_regions(request: Request, admin_id: int):
    """Get assigned regions for an admin"""
    try:
        db = request.app.state.db
        return get_admin_assigned_regions(db, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/admin/{admin_id}/regions")
async def update_admin_regions(request: Request, admin_id: int, regions_update: AdminRegionsUpdate):
    """Update region assignments for an admin"""
    try:
        db = request.app.state.db
        return update_admin_assigned_regions(db, admin_id, regions_update)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/admin/{admin_id}/contact")
async def update_admin_contact(request: Request, admin_id: int, contact_data: dict):
    """Update admin contact number"""
    try:
        db = request.app.state.db
        contact = contact_data.get('contact')
        return update_admin_contact_number(db, admin_id, contact)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/admin/{admin_id}")
async def delete_admin(request: Request, admin_id: int):
    """Delete an admin account"""
    try:
        db = request.app.state.db
        return delete_admin_account(db, admin_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 4. ANALYTICS
# ============================================================================

@router.get("/analytics")
async def get_analytics(request: Request):
    """Get platform analytics and insights"""
    try:
        db = request.app.state.db
        return get_platform_analytics(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 5. ADMIN CHANGE REQUESTS
# ============================================================================

@router.get("/change-requests")
async def get_change_requests(request: Request):
    """Get all pending admin change requests"""
    try:
        db = request.app.state.db
        return get_pending_change_requests(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/change-request/{request_id}/approve")
async def approve_change_request(request: Request, request_id: int):
    """Approve an admin change request"""
    try:
        db = request.app.state.db
        return approve_admin_change_request(db, request_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/change-request/{request_id}/reject")
async def reject_change_request(request: Request, request_id: int, rejection_data: dict):
    """Reject an admin change request"""
    try:
        db = request.app.state.db
        reason = rejection_data.get('reason', 'No reason provided')
        return reject_admin_change_request(db, request_id, reason)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 6. REGION UTILITIES (Global)
# ============================================================================

@router.get("/regions/lookup/{city}")
async def lookup_city_region(request: Request, city: str):
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