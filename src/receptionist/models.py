from pydantic import BaseModel, field_validator
from typing import Optional

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PatientCreate(BaseModel):
    mr: int
    name: str
    age: int
    gender: str
    father_name: str
    marital_status: str
    contact: str
    email: str
    address: str
    cnic: str
    occupation: Optional[str]
    nationality: str
    clinic_id: int

class VitalsModel(BaseModel):
    blood_pressure: str
    heart_rate: float
    temperature: float
    blood_oxygen: float
    weight: float
    height: float
    bmi: float

class DiagnosisDataModel(BaseModel):
    appointment_id: int
    patient_id: int
    patient_mr: str
    patient_name: str
    age: int
    gender: str
    contact: str
    father_name: str
    marital_status: str
    cnic: str
    address: str
    occupation: Optional[str] = "-"
    nationality: str
    doctor_name: str
    diagnosed_date: str
    vitals: VitalsModel
    diagnosis: str
    prescription: str
    notes: Optional[str] = "-"
    clinic_name: str

class EmailRequest(BaseModel):
    email: str
    patient_name: str
    html: str