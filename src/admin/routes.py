from fastapi import APIRouter, HTTPException, status, Request
from typing import Optional
import traceback
from fastapi.requests import Request

from src.admin.models import ClinicCreate, ReceptionistCreate, DoctorCreate, DoctorTransfer, AvailabilityUpdate, BulletinPost
from src.admin.request_models import PasswordChangeRequest, ContactChangeRequest, GeneralQueryRequest

from src.admin.report_services import get_system_statistics, get_all_receptionists, get_available_doctors_for_admin, get_unavailable_doctors_for_admin, get_all_doctors
from src.admin.report_services import get_cities_for_admin, get_all_specializations
from src.admin.staff_services import create_receptionist_account, create_doctor_account
from src.admin.clinic_services import create_new_clinic, transfer_doctor_to_clinic
from src.admin.bulletin_services import post_new_bulletin, deactivate_bulletin
from src.admin.monitoring_services import update_doctor_availability, run_doctor_monitoring, get_pending_unavailability_requests, approve_unavailability_request, reject_unavailability_request
from src.admin.request_services import submit_password_change_request, submit_contact_change_request, submit_general_query
from src.admin.doctor_offline_services import transfer_patients_to_doctor, get_available_doctors_for_clinic

router = APIRouter()

# ============================================================================
# 1. REPORTS & STATS
# ============================================================================

@router.get("/statistics")
async def get_statistics(request: Request, company_id: Optional[int] = None, admin_id: Optional[int] = None):
    """Get comprehensive system statistics, optionally filtered by admin's regions if admin_id provided"""
    try:
        db = request.app.state.db
        return get_system_statistics(db, company_id, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/receptionists")
async def get_receptionists(request: Request, company_id: Optional[int] = None, admin_id: Optional[int] = None):
    """Get all receptionist accounts, optionally filtered by admin's regions if admin_id provided"""
    try:
        db = request.app.state.db
        return get_all_receptionists(db, company_id, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/doctors")
async def get_doctors(request:Request, company_id: Optional[int] = None, admin_id: Optional[int] = None):
    """Get all doctors, optionally filtered by company and/or admin's regions"""
    try:
        db = request.app.state.db
        return get_all_doctors(db, company_id, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/available-doctors")
async def get_available_doctors(request: Request):
    """Get all doctors who have at least one day with availability set"""
    try:
        db = request.app.state.db
        return get_available_doctors_for_admin(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/unavailable-doctors")
async def get_unavailable_doctors(request: Request, admin_id: Optional[int] = None):
    """Get doctors whose shift has started but is_active=false, filtered by admin's regions if admin_id provided"""
    try:
        db = request.app.state.db
        return get_unavailable_doctors_for_admin(db, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 2. STAFF CREATION
# ============================================================================

@router.post("/create-receptionist")
async def create_receptionist(receptionist: ReceptionistCreate, request: Request):
    """Create a new receptionist account"""
    try:
        db = request.app.state.db
        return create_receptionist_account(db, receptionist)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/create-doctor")
async def create_doctor(doctor: DoctorCreate, request: Request):
    """Create a new doctor account"""
    try:
        db = request.app.state.db
        return create_doctor_account(db, doctor)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 3. CLINIC MANAGEMENT
# ============================================================================

@router.post("/create-clinic")
async def create_clinic(clinic: ClinicCreate, request: Request):
    """Create a new clinic"""
    try:
        db = request.app.state.db
        return create_new_clinic(db, clinic)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/transfer-doctor")
async def transfer_doctor(transfer: DoctorTransfer, request: Request):
    """Transfer doctor to another clinic"""
    try:
        db = request.app.state.db
        return transfer_doctor_to_clinic(db, transfer)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 4. SCHEDULING & MONITORING
# ============================================================================

@router.put("/update-availability/{doctor_id}")
async def update_availability(doctor_id: int, data: AvailabilityUpdate, request: Request):
    """Update doctor's availability hours for a specific day"""
    try:
        db = request.app.state.db
        return update_doctor_availability(db, doctor_id, data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/monitor-doctors")
async def monitor_doctors(request: Request):
    """Monitor all doctors and their current queue lengths (background task logic)"""
    try:
        db = request.app.state.db
        return run_doctor_monitoring(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 5. BULLETIN MANAGEMENT
# ============================================================================

@router.post("/post-bulletin")
async def post_bulletin(bulletin: BulletinPost, request: Request):
    """Post a new bulletin for the admin's company"""
    try:
        db = request.app.state.db
        return post_new_bulletin(db, bulletin)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/delete-bulletin/{bulletin_id}")
async def delete_bulletin(bulletin_id: int, admin_id: int, request: Request):
    """Delete a bulletin (only if it belongs to admin's company)"""
    try:
        db = request.app.state.db
        return deactivate_bulletin(db, bulletin_id, admin_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 5. Change Requests
# ============================================================================

@router.post("/request-password-change")
async def request_password_change(change_request: PasswordChangeRequest, request: Request):
    """Submit a password change request to SuperAdmin"""
    try:
        db = request.app.state.db
        return submit_password_change_request(db, change_request)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/request-contact-change")
async def request_contact_change(change_request: ContactChangeRequest, request: Request):
    """Submit a contact change request to SuperAdmin"""
    try:
        db = request.app.state.db
        return submit_contact_change_request(db, change_request)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/request-general-query")
async def request_general_query(query_request: GeneralQueryRequest, request: Request):
    """Submit a general query/message to SuperAdmin"""
    try:
        db = request.app.state.db
        return submit_general_query(db, query_request)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 6. Doctor Unavailability Management
# ============================================================================

@router.get("/doctor-unavailability-requests")
async def get_unavailability_requests(request: Request, admin_id: int):
    """Get all pending unavailability requests for admin's region doctors"""
    try:
        db = request.app.state.db
        return get_pending_unavailability_requests(db, admin_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/cities")
async def get_cities(request: Request, admin_id: Optional[int] = None):
    """Return cities grouped by province/sub_region. Optionally filter by admin_id."""
    try:
        db = request.app.state.db
        return get_cities_for_admin(db, admin_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/specializations")
async def get_specializations(request: Request):
    """Return all available doctor specializations"""
    try:
        db = request.app.state.db
        return get_all_specializations(db)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/unavailability-request/{request_id}/approve")
async def approve_unavailability(request_id: int, request: Request, admin_id: int, admin_comment: str = ""):
    """Admin approves a doctor's unavailability request"""
    try:
        db = request.app.state.db
        return approve_unavailability_request(db, request_id, admin_id, admin_comment)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/unavailability-request/{request_id}/reject")
async def reject_unavailability(request_id: int, request: Request, admin_id: int, data: dict):
    """Admin rejects a doctor's unavailability request"""
    try:
        db = request.app.state.db
        return reject_unavailability_request(db, request_id, admin_id, data.get('reason', ''))
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================================================
# 7. Doctor Offline Management
# ============================================================================

@router.get("/clinic/{clinic_id}/available-doctors")
async def get_available_doctors_for_transfer(request: Request, clinic_id: int):
    """Get available doctors in a clinic for patient transfers"""
    try:
        db = request.app.state.db
        return get_available_doctors_for_clinic(db, clinic_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/transfer-patients")
async def transfer_patients(request: Request, from_doctor_id: int, to_doctor_id: int):
    """Transfer all waiting patients from one doctor to another"""
    try:
        db = request.app.state.db
        return transfer_patients_to_doctor(db, from_doctor_id, to_doctor_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

