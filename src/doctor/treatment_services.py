import json
from fastapi import HTTPException, status
from src.doctor.models import DiagnosisSubmit, VitalsRecord
from typing import Dict, Any

# ============================================================================
# TREATMENT & VITALS SERVICES
# ============================================================================

def record_patient_vitals(db, patient_id: int, vitals: VitalsRecord) -> Dict[str, Any]:
    """Records vital readings into the patient's latest active appointment."""
    with db.get_cursor() as cursor:
        # 1. Find the latest active appointment for this patient
        cursor.execute("""
            SELECT id FROM appointments 
            WHERE patient_id = %s AND status = 'waiting'
            ORDER BY created_at DESC
            LIMIT 1
        """, (patient_id,))
        
        active_appointment = cursor.fetchone()

        if not active_appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No active appointment found for this patient')
        
        vitals_dict = vitals.model_dump()
        
        # 2. Update the appointment with vitals
        cursor.execute("""
            UPDATE appointments 
            SET vitals = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (json.dumps(vitals_dict), active_appointment['id']))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Failed to update vitals in appointment record')

        return {'success': True, 'message': 'Vitals recorded successfully'}

def submit_patient_diagnosis(db, diagnosis_data: DiagnosisSubmit) -> Dict[str, Any]:
    """Submits final diagnosis and prescription, completing the appointment."""
    with db.get_cursor() as cursor:
        # 1. Verify patient and doctor exist
        cursor.execute("SELECT id FROM patients WHERE id = %s", (diagnosis_data.patient_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (diagnosis_data.doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Find and verify the specific appointment is assigned to this doctor
        cursor.execute("SELECT id, doctor_id FROM appointments WHERE id = %s", (diagnosis_data.appointment_id,))
        appointment = cursor.fetchone()
        
        if not appointment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        if appointment['doctor_id'] != diagnosis_data.doctor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This appointment is not assigned to you")
        
        # 3. Update appointment with diagnosis and set status to 'completed'
        cursor.execute("""
            UPDATE appointments 
            SET diagnosis = %s, prescription = %s, notes = %s, status = 'completed',
                ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (diagnosis_data.diagnosis, diagnosis_data.prescription, diagnosis_data.notes, diagnosis_data.appointment_id))
        
        # 4. Notify the responsible receptionist
        cursor.execute("""
            SELECT r.id, r.name, a.ticket_no
            FROM appointments a
            JOIN receptionists r ON r.clinic_id = a.clinic_id
            WHERE a.id = %s
            LIMIT 1
        """, (diagnosis_data.appointment_id,))

        receptionist_info = cursor.fetchone()

        if receptionist_info:
            cursor.execute("""
                INSERT INTO notifications (
                    recipient_type, recipient_id, patient_id, doctor_id, type, title, message
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                'receptionist', receptionist_info['id'], diagnosis_data.patient_id, diagnosis_data.doctor_id,
                'diagnosis_complete', 'Diagnosis Complete',
                f"Ticket #{receptionist_info['ticket_no']} diagnosis has been completed. Patient can collect prescription."
            ))
        
        return {"success": True, "message": "Diagnosis submitted successfully"}