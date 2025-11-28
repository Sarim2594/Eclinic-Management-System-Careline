from fastapi import HTTPException, status
from src.admin.models import ClinicCreate, DoctorTransfer
from typing import Dict, Any

# ============================================================================
# CLINIC MANAGEMENT SERVICES (Extracted from admin.py)
# ============================================================================

def create_new_clinic(db, clinic: ClinicCreate) -> Dict[str, Any]:
    """Creates a new clinic with proper region validation"""
    with db.get_cursor() as cursor:
        # 1. Verify company exists and check clinic limit
        cursor.execute("""
            SELECT c.max_clinics, COUNT(cl.id) as current_clinics
            FROM companies c
            LEFT JOIN clinics cl ON c.id = cl.company_id AND cl.status = 'active'
            WHERE c.id = %s
            GROUP BY c.id, c.max_clinics
        """, (clinic.company_id,))
        
        company_data = cursor.fetchone()
        if not company_data:
            raise HTTPException(status_code=404, detail="Company not found")
        
        if company_data['current_clinics'] >= company_data['max_clinics']:
            raise HTTPException(
                status_code=400, 
                detail=f"Clinic limit reached. Maximum {company_data['max_clinics']} clinics allowed."
            )
        
        # 2. Look up city_id from city name
        cursor.execute("""
            SELECT id FROM cities WHERE name = %s
        """, (clinic.city_name,))
        
        city = cursor.fetchone()
        if not city:
            raise HTTPException(
                status_code=400, 
                detail=f"City '{clinic.city_name}' not found in database"
            )
        
        # 3. Insert clinic
        cursor.execute("""
            INSERT INTO clinics (company_id, name, location, city_id)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (clinic.company_id, clinic.name, clinic.location, city['id']))
        
        clinic_id = cursor.fetchone()['id']
        
        return {
            "success": True,
            "clinic_id": clinic_id,
            "message": "Clinic created successfully"
        }

def transfer_doctor_to_clinic(db, transfer: DoctorTransfer) -> Dict[str, Any]:
    """Transfers a doctor to a new clinic, checking for active appointments first."""
    with db.get_cursor() as cursor:
        # 1. Verify doctor exists
        cursor.execute("SELECT id, name FROM doctors WHERE id = %s", (transfer.doctor_id,))
        doctor = cursor.fetchone()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Verify new clinic exists
        cursor.execute("SELECT id, name FROM clinics WHERE id = %s", (transfer.new_clinic_id,))
        new_clinic = cursor.fetchone()
        if not new_clinic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New clinic not found")
        
        # 3. Check for active appointments
        cursor.execute("""
            SELECT COUNT(*) as count FROM appointments 
            WHERE doctor_id = %s AND status = 'waiting'
        """, (transfer.doctor_id,))
        active_appointments = cursor.fetchone()['count']
        
        if active_appointments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transfer doctor with {active_appointments} active appointments"
            )
        
        # 4. Update doctor's clinic
        cursor.execute("UPDATE doctors SET clinic_id = %s WHERE id = %s", 
                       (transfer.new_clinic_id, transfer.doctor_id))
        
        # 5. Send notification to the doctor
        cursor.execute("""
                INSERT INTO notifications (
                    recipient_type, recipient_id, type, title, message
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                'doctor',
                transfer.doctor_id,
                'transfer_doctor',
                'Transfer Successful',
                f"You have been transferred to clinic {new_clinic['name']}."
            ))
        
        return {
            "success": True,
            "message": f"Dr. {doctor['name']} transferred successfully"
        }