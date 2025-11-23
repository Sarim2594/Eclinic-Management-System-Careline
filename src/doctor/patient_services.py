from fastapi import HTTPException, status
from typing import Dict, Any, List
from datetime import datetime

# ============================================================================
# PATIENT DATA SERVICES
# ============================================================================

def get_waiting_patients_list(db, doctor_id: int) -> Dict[str, Any]:
    """Retrieves all waiting appointments for a specific doctor."""
    with db.get_cursor() as cursor:
        # 1. Verify doctor exists
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Get waiting appointments with patient details
        cursor.execute("""
            SELECT 
                a.id, a.patient_id, p.name, p.age, p.gender, p.contact, a.ticket_no, a.vitals, a.created_at,
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

def get_diagnosed_patients_list(db, doctor_id: int) -> Dict[str, Any]:
    """Retrieves list of unique patients this doctor has completed an appointment for."""
    with db.get_cursor() as cursor:
        # 1. Verify doctor exists
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Get unique patients with their latest diagnosis date
        cursor.execute("""
            WITH LatestAppointments AS (
                SELECT DISTINCT ON (patient_id)
                    patient_id, ended_at
                FROM appointments
                WHERE doctor_id = %s AND status = 'completed'
                ORDER BY patient_id, ended_at DESC
            )
            SELECT 
                p.id, p.name, p.age, p.gender, p.contact,
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

def get_patient_history(db, patient_id: int) -> Dict[str, Any]:
    """Retrieves patient basic info and their complete appointment history."""
    with db.get_cursor() as cursor:
        # 1. Get patient basic info
        cursor.execute("SELECT id, name, age, gender, contact FROM patients WHERE id = %s", (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # 2. Get all completed appointments
        cursor.execute("""
            SELECT 
                a.id as appointment_id, d.name as doctor_name, a.diagnosis, a.prescription, a.notes, a.vitals,
                TO_CHAR(a.ended_at, 'YYYY-MM-DD HH12:MI AM') as diagnosed_date, a.ticket_no
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.patient_id = %s AND a.status = 'completed'
            ORDER BY a.ended_at DESC
        """, (patient_id,))
        
        history = cursor.fetchall()
        
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