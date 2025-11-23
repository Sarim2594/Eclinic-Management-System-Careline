import hashlib
import traceback
from fastapi import HTTPException, status
from src.admin.models import ReceptionistCreate, DoctorCreate
from typing import Dict, Any

# ============================================================================
# STAFF CREATION SERVICES
# ============================================================================

def create_receptionist_account(db, receptionist: ReceptionistCreate) -> Dict[str, Any]:
    """Handles creation of user and receptionist profile."""
    with db.get_cursor() as cursor:
        # 1. Check if username/email already exists
        cursor.execute("""
            SELECT id FROM users WHERE username = %s OR email = %s
        """, (receptionist.username, receptionist.email))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")
        
        # 2. Check if clinic exists
        cursor.execute("SELECT id FROM clinics WHERE id = %s", (receptionist.clinic_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")
        
        # 3. Create user account
        password_hash = hashlib.sha256(receptionist.password.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO users (username, email, password, role)
            VALUES (%s, %s, %s, 'receptionist')
            RETURNING id
        """, (receptionist.username, receptionist.email, password_hash))
        user_id = cursor.fetchone()['id']
        
        # 4. Create receptionist profile
        cursor.execute("""
            INSERT INTO receptionists (user_id, clinic_id, name, contact)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (user_id, receptionist.clinic_id, receptionist.name, receptionist.contact))
        receptionist_id = cursor.fetchone()['id']
        
        return {
            "success": True,
            "user_id": user_id,
            "receptionist_id": receptionist_id,
            "message": "Receptionist account created successfully"
        }

def create_doctor_account(db, doctor: DoctorCreate) -> Dict[str, Any]:
    """Handles creation of user, doctor profile, and availability schedules."""
    with db.get_cursor() as cursor:
        # 1. Check if username/email already exists
        cursor.execute("""
            SELECT id FROM users WHERE username = %s OR email = %s
        """, (doctor.username, doctor.email))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")
        
        # 2. Check if license number already exists
        cursor.execute("SELECT id FROM doctors WHERE license_number = %s", (doctor.license_number,))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License number already exists")
        
        # 3. Check if clinic exists
        cursor.execute("SELECT id FROM clinics WHERE id = %s", (doctor.clinic_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")
        
        # 4. Create user account
        password_hash = hashlib.sha256(doctor.password.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO users (username, email, password, role)
            VALUES (%s, %s, %s, 'doctor')
            RETURNING id
        """, (doctor.username, doctor.email, password_hash))
        user_id = cursor.fetchone()['id']
        
        # 5. Create doctor profile
        cursor.execute("""
            INSERT INTO doctors (user_id, clinic_id, name, license_number, contact)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, doctor.clinic_id, doctor.name, doctor.license_number, doctor.contact))
        doctor_id = cursor.fetchone()['id']
        
        # 6. Insert availability schedules
        for day in range(1, 8):  # Monday=1 to Sunday=7
            cursor.execute("""
                INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time)
                VALUES (%s, %s, %s, %s)
            """, (doctor_id, day, doctor.startTimes[day-1], doctor.endTimes[day-1]))
        
        return {
            "success": True,
            "doctor_id": doctor_id,
            "user_id": user_id,
            "message": "Doctor account created successfully"
        }