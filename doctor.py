import datetime
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter()

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

# ============================================================================
# DOCTOR ENDPOINTS
# ============================================================================

@router.get("/{doctor_id}/waiting-patients")
async def get_waiting_patients(doctor_id: int, request: Request):
    """Get all waiting patients (appointments) for a doctor"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Get waiting appointments with patient details
            cursor.execute("""
                SELECT 
                    a.id,
                    a.patient_id,
                    p.name,
                    p.age,
                    p.gender,
                    p.contact,
                    a.ticket_no,
                    a.vitals,
                    a.created_at,
                    EXTRACT(EPOCH FROM (NOW() - a.created_at))/60 as waiting_minutes
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.doctor_id = %s AND a.status = 'waiting'
                ORDER BY a.created_at ASC
            """, (doctor_id,))
            
            appointments = cursor.fetchall()
            
            waiting_list = []
            for appt in appointments:
                combined_record = {
                    "id": appt['id'],
                    "patient_id": appt['patient_id'],
                    "name": appt['name'],
                    "age": appt['age'],
                    "gender": appt['gender'],
                    "contact": appt['contact'],
                    "ticket_no": appt['ticket_no'],
                    "vitals": appt['vitals'] if appt['vitals'] else {},
                    "waiting_minutes": int(appt['waiting_minutes']),
                    "created_at": appt['created_at'].isoformat()
                }
                waiting_list.append(combined_record)

            return {
                "success": True,
                "count": len(waiting_list),
                "patients": waiting_list
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_waiting_patients: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{doctor_id}/past-patients")
async def get_diagnosed_patients(doctor_id: int, request: Request):
    """Get list of unique patients this doctor has treated"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Get unique patients with their latest diagnosis
            cursor.execute("""
                WITH LatestAppointments AS (
                    SELECT DISTINCT ON (patient_id)
                        patient_id,
                        diagnosis,
                        prescription,
                        notes,
                        vitals,
                        ended_at
                    FROM appointments
                    WHERE doctor_id = %s AND status = 'completed'
                    ORDER BY patient_id, ended_at DESC
                )
                SELECT 
                    p.id,
                    p.name,
                    p.age,
                    p.gender,
                    p.contact,
                    TO_CHAR(la.ended_at, 'YYYY-MM-DD HH12:MI AM') as diagnosed_date
                FROM patients p
                JOIN LatestAppointments la ON p.id = la.patient_id
                ORDER BY la.ended_at DESC
            """, (doctor_id,))
            
            diagnosed_patients = cursor.fetchall()
            
            return {
                "success": True,
                "count": len(diagnosed_patients),
                "patients": diagnosed_patients
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/patient/{patient_id}/history")
async def get_patient_appointment_history(patient_id: int, request: Request):
    """Get complete appointment history for a patient"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Get patient basic info
            cursor.execute("""
                SELECT id, name, age, gender, contact 
                FROM patients 
                WHERE id = %s
            """, (patient_id,))
            
            patient = cursor.fetchone()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found")
            
            # Get all completed appointments with doctor details
            cursor.execute("""
                SELECT 
                    a.id as appointment_id,
                    d.name as doctor_name,
                    TO_CHAR(a.ended_at, 'YYYY-MM-DD HH12:MI AM') as diagnosed_date,
                    a.ticket_no,
                    a.vitals,
                    a.diagnosis,
                    a.prescription,
                    a.notes
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = %s AND a.status = 'completed'
                ORDER BY a.ended_at DESC
            """, (patient_id,))
            
            history = cursor.fetchall()
            
            # Format history records
            formatted_history = []
            for record in history:
                formatted_history.append({
                    "appointment_id": record['appointment_id'],
                    "doctor_name": record['doctor_name'],
                    "diagnosed_date": record['diagnosed_date'] if record['diagnosed_date'] else 'N/A',
                    "ticket_no": record['ticket_no'],
                    "vitals": record['vitals'] if record['vitals'] else {},
                    "diagnosis": record['diagnosis'] if record['diagnosis'] else 'No diagnosis recorded.',
                    "prescription": record['prescription'] if record['prescription'] else 'No prescription recorded.',
                    "notes": record['notes'] if record['notes'] else 'N/A',
                })
            
            patient_basic = {
                "id": patient['id'],
                "name": patient['name'],
                "age": patient['age'],
                "gender": patient['gender'],
                "contact": patient['contact']
            }
            
            return {
                "success": True,
                "patient": patient_basic,
                "history": formatted_history
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put('/record-vitals/{patient_id}')
async def record_vitals(patient_id: int, vitals: VitalsRecord, request: Request):
    """Record patient vital readings in their latest active appointment"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Find the latest active appointment for this patient
            cursor.execute("""
                SELECT id FROM appointments 
                WHERE patient_id = %s AND status = 'waiting'
                ORDER BY created_at DESC
                LIMIT 1
            """, (patient_id,))
            
            active_appointment = cursor.fetchone()

            if not active_appointment:
                raise HTTPException(
                    status_code=404, 
                    detail='No active appointment found for this patient'
                )
            
            vitals_dict = vitals.model_dump()
            
            # Update the appointment with vitals
            cursor.execute("""
                UPDATE appointments 
                SET vitals = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (json.dumps(vitals_dict), active_appointment['id']))
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=400, 
                    detail='Failed to update vitals in appointment record'
                )

            return {
                'success': True, 
                'message': 'Vitals recorded successfully'
            }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.post("/submit-diagnosis")
async def submit_diagnosis(diagnosis_data: DiagnosisSubmit, request: Request):
    """Submit diagnosis and prescription for an appointment"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Verify patient exists
            cursor.execute("SELECT id FROM patients WHERE id = %s", (diagnosis_data.patient_id,))
            patient = cursor.fetchone()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found")
            
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (diagnosis_data.doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Find and verify the specific appointment
            cursor.execute("""
                SELECT id, doctor_id FROM appointments WHERE id = %s
            """, (diagnosis_data.appointment_id,))
            
            appointment = cursor.fetchone()
            
            if not appointment:
                raise HTTPException(status_code=404, detail="Appointment not found")
                
            if appointment['doctor_id'] != diagnosis_data.doctor_id:
                raise HTTPException(
                    status_code=403, 
                    detail="This appointment is not assigned to you"
                )
            
            # Update appointment with diagnosis
            cursor.execute("""
                UPDATE appointments 
                SET diagnosis = %s,
                    prescription = %s,
                    notes = %s,
                    status = 'completed',
                    ended_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                diagnosis_data.diagnosis,
                diagnosis_data.prescription,
                diagnosis_data.notes,
                diagnosis_data.appointment_id
            ))
            
            # Get the receptionist who registered this appointment
            cursor.execute("""
                SELECT r.id, r.name, a.ticket_no
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN receptionists r ON r.clinic_id = a.clinic_id
                WHERE a.id = %s
                LIMIT 1
            """, (diagnosis_data.appointment_id,))

            receptionist_info = cursor.fetchone()

            if receptionist_info:
                # Create notification for the specific receptionist
                cursor.execute("""
                    INSERT INTO notifications (
                        recipient_type, 
                        recipient_id, 
                        patient_id,
                        doctor_id,
                        type, 
                        title,
                        message
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    'receptionist',
                    receptionist_info['id'],
                    diagnosis_data.patient_id,
                    diagnosis_data.doctor_id,
                    'diagnosis_complete',
                    'Diagnosis Complete',
                    f"Ticket #{receptionist_info['ticket_no']} diagnosis has been completed. Patient can collect prescription."
                ))
            
            return {
                "success": True,
                "message": "Diagnosis submitted successfully"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
@router.put("/set-inactive/{doctor_id}")
async def set_doctor_inactive(doctor_id: int, request: Request):
    """Set doctor status to inactive on logout"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Update doctor status to inactive
            cursor.execute("""
                UPDATE availability_schedules 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE doctor_id = %s
            """, (doctor_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=400, 
                    detail='Failed to update doctor status'
                )

            return {
                'success': True, 
                'message': 'Doctor status set to inactive successfully'
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')