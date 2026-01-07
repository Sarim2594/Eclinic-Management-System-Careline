from fastapi import HTTPException, status
from typing import Dict, Any
from datetime import datetime

def notify_doctor_offline(db, doctor_id: int, clinic_id: int) -> Dict[str, Any]:
    """Notify admins and collect waiting patients when a doctor goes offline."""
    try:
        with db.get_cursor() as cursor:
            # Get doctor info
            cursor.execute("""
                SELECT d.name, d.id FROM doctors d WHERE d.id = %s
            """, (doctor_id,))
            doctor = cursor.fetchone()
            if not doctor:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

            # Get waiting patients for this doctor
            cursor.execute("""
                SELECT id, patient_id FROM appointments 
                WHERE doctor_id = %s AND status = 'waiting'
            """, (doctor_id,))
            waiting_patients = cursor.fetchall()
            patient_count = len(waiting_patients) if waiting_patients else 0

            # Get clinic admin(s)
            cursor.execute("""
                SELECT DISTINCT a.id FROM admins a
                JOIN admin_regions ar ON a.id = ar.admin_id
                JOIN clinics c ON c.id = %s
                JOIN cities cy ON c.city_id = cy.id
                WHERE cy.region_id = ar.region_id
            """, (clinic_id,))
            admins = cursor.fetchall()

            # Create urgent notification for each admin (without priority column)
            for admin in admins:
                cursor.execute("""
                    INSERT INTO notifications 
                    (recipient_type, recipient_id, type, clinic_id, 
                     title, message, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """, (
                    'admin',
                    admin['id'],
                    'doctor_offline',
                    clinic_id,
                    '🚨 URGENT: Doctor Went Offline',
                    f"Doctor {doctor['name']} is offline. {patient_count} patient(s) waiting for transfer. Immediate action required!"
                ))

            return {
                "success": True,
                "doctor_id": doctor_id,
                "doctor_name": doctor['name'],
                "clinic_id": clinic_id,
                "waiting_patients_count": patient_count,
                "admins_notified": len(admins),
                "waiting_patients": waiting_patients
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


def transfer_patients_to_doctor(db, from_doctor_id: int, to_doctor_id: int) -> Dict[str, Any]:
    """Transfer all waiting patients from one doctor to another."""
    try:
        with db.get_cursor() as cursor:
            # Validate both doctors exist
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (from_doctor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source doctor not found")
            
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (to_doctor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination doctor not found")

            # Transfer all waiting appointments
            cursor.execute("""
                UPDATE appointments 
                SET doctor_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE doctor_id = %s AND status = 'waiting'
            """, (to_doctor_id, from_doctor_id))
            
            transferred_count = cursor.rowcount

            return {
                "success": True,
                "transferred_count": transferred_count,
                "from_doctor_id": from_doctor_id,
                "to_doctor_id": to_doctor_id
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


def get_available_doctors_for_clinic(db, clinic_id: int) -> Dict[str, Any]:
    """Return available active doctors in a clinic, ordered by queue size."""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT d.id, d.name, COUNT(ap.id) as current_queue
                FROM doctors d
                LEFT JOIN appointments ap ON d.id = ap.doctor_id AND ap.status = 'waiting'
                WHERE d.clinic_id = %s AND d.status = 'active'
                GROUP BY d.id, d.name
                ORDER BY current_queue ASC, d.name ASC
            """, (clinic_id,))
            
            doctors = cursor.fetchall()
            return {
                "success": True,
                "available_doctors": doctors
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
