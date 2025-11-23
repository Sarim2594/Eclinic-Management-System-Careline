from fastapi import APIRouter, HTTPException, status, Request
from src.receptionist.models import PatientCreate, EmailRequest
from src.receptionist.patient_services import register_new_patient_and_assign_doctor
from src.receptionist.communication_services import get_all_completed_diagnoses, send_diagnosis_email
import traceback

router = APIRouter()

# ============================================================================
# 1. PATIENT REGISTRATION & ASSIGNMENT
# ============================================================================

@router.post('/register-patient')
async def register_patient_endpoint(patient: PatientCreate, request: Request):
    """Register a new patient and auto-assign doctor"""
    try:
        db = request.app.state.db
        return register_new_patient_and_assign_doctor(db, patient)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Internal server error: {str(e)}')

# ============================================================================
# 2. REPORTING & COMMUNICATION
# ============================================================================

@router.get('/get-diagnoses')
async def get_diagnoses_endpoint(request: Request):
    """Fetch list of all completed diagnoses"""
    try:
        db = request.app.state.db
        return get_all_completed_diagnoses(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Internal server error: {str(e)}')

@router.post("/email-diagnosis")
async def email_diagnosis_html_endpoint(request: EmailRequest):
    """Send diagnosis report via email."""
    try:
        return send_diagnosis_email(request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Internal server error: {str(e)}')