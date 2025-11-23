from pydantic import BaseModel
from typing import Optional, List

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class DiagnosisSubmit(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    diagnosis: str
    prescription: str
    notes: Optional[str] = ""

class VitalsRecord(BaseModel):
    blood_pressure: str
    heart_rate: float
    temperature: float
    bmi: float
    blood_oxygen: float
    weight: float
    height: float
    
# Define the structure returned by get_diagnosed_patients_list
class PastPatient(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    contact: str
    diagnosed_date: str # Comes from the TO_CHAR formatting

class PastPatientsResponse(BaseModel):
    success: bool
    count: int
    patients: List[PastPatient]