from fastapi import APIRouter, HTTPException, status, Request, Path
from typing import Optional
import json
import traceback

# --- IMPORT MODELS ---
from src.doctor.models import DiagnosisSubmit, VitalsRecord, PastPatientsResponse

# --- IMPORT SERVICE LAYERS ---
from src.doctor.patient_services import get_waiting_patients_list, get_diagnosed_patients_list, get_patient_history
from src.doctor.treatment_services import record_patient_vitals, submit_patient_diagnosis
from src.doctor.status_services import set_doctor_status_inactive

router = APIRouter()

# ============================================================================
# 1. PATIENT DATA
# ============================================================================

@router.get("/{doctor_id}/waiting-patients")
async def get_waiting_patients(request: Request, doctor_id: int = Path(...)):
    """Get all waiting patients (appointments) for a doctor"""
    try:
        db = request.app.state.db
        return get_waiting_patients_list(db, doctor_id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{doctor_id}/past-patients", response_model=PastPatientsResponse)
async def get_diagnosed_patients(request: Request, doctor_id: int = Path(...)):
    """Get list of unique patients this doctor has treated"""
    try:
        db = request.app.state.db
        return get_diagnosed_patients_list(db, doctor_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/patient/{patient_id}/history")
async def get_patient_appointment_history(request: Request, patient_id: int = Path(...)):
    """Get complete appointment history for a patient"""
    try:
        db = request.app.state.db
        return get_patient_history(db, patient_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ============================================================================
# 2. TREATMENT & VITALS (Write)
# ============================================================================

@router.put('/record-vitals/{patient_id}')
async def record_vitals(request: Request, patient_id: int, vitals: VitalsRecord):
    """Record patient vital readings in their latest active appointment"""
    try:
        db = request.app.state.db
        return record_patient_vitals(db, patient_id, vitals)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Internal server error: {str(e)}')

@router.post("/submit-diagnosis")
async def submit_diagnosis(request: Request, diagnosis_data: DiagnosisSubmit):
    """Submit diagnosis and prescription for an appointment"""
    try:
        db = request.app.state.db
        return submit_patient_diagnosis(db, diagnosis_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

# ============================================================================
# 3. STATUS MANAGEMENT
# ============================================================================

@router.put("/set-inactive/{doctor_id}")
async def set_doctor_inactive(request: Request, doctor_id: int):
    """Set doctor status to inactive on logout"""
    try:
        db = request.app.state.db
        return set_doctor_status_inactive(db, doctor_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Internal server error: {str(e)}')