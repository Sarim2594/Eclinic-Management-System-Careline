from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, timedelta, time

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ClinicCreate(BaseModel):
    name: str
    location: str
    company_id: int
    
class ReceptionistCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    contact: str
    clinic_id: int

class DoctorCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    license_number: str
    contact: str
    clinic_id: int
    startTimes: List[Optional[str]]
    endTimes: List[Optional[str]]

class BulletinPost(BaseModel):
    admin_id: int
    title: str
    message: str

class DoctorTransfer(BaseModel):
    doctor_id: int
    new_clinic_id: int

class AvailabilityUpdate(BaseModel):
    day_of_week: int
    startTime: Optional[str]
    endTime: Optional[str]

# Note: PasswordChangeRequest and ContactChangeRequest are already in request_models.py