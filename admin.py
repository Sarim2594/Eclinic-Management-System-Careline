import datetime
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, field_validator
from typing import Optional, List
import traceback
import hashlib
import re

router = APIRouter()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ClinicCreate(BaseModel):
    name: str
    location: str
    
class ReceptionistCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    contact: str
    clinic_id: int
    
    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v

    @field_validator('contact')
    @classmethod
    def validate_contact(cls, v):
        if not re.match(r'^\+92\d{10}$', v):
            raise ValueError('Contact must be in format: +92XXXXXXXXXX')
        return v

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
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v

    @field_validator('contact')
    @classmethod
    def validate_contact(cls, v):
        if not re.match(r'^\+92\d{10}$', v):
            raise ValueError('Contact must be in format: +92XXXXXXXXXX')
        return v

class BulletinCreate(BaseModel):
    title: str
    message: str

class DoctorTransfer(BaseModel):
    doctor_id: int
    new_clinic_id: int

class AvailabilityUpdate(BaseModel):
    day_of_week: int
    startTime: Optional[str]
    endTime: Optional[str]

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.get("/statistics")
async def get_statistics(request: Request):
    """Get comprehensive system statistics (3NF)"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Overall stats
            cursor.execute("SELECT COUNT(*) as count FROM clinics")
            total_clinics = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM doctors WHERE status = 'active'")
            total_doctors = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM patients")
            total_patients = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'waiting'")
            active_appointments = cursor.fetchone()['count']
            
            # Per-clinic stats
            cursor.execute("""
                SELECT 
                    c.id as clinic_id,
                    c.name,
                    c.location,
                    COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'active') as total_doctors,
                    COUNT(DISTINCT a.patient_id) as total_patients,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'waiting') as waiting_patients
                FROM clinics c
                LEFT JOIN doctors d ON c.id = d.clinic_id
                LEFT JOIN appointments a ON c.id = a.clinic_id
                GROUP BY c.id, c.name, c.location
                ORDER BY c.name
            """)
            
            clinic_stats = cursor.fetchall()
            
            # Doctor performance
            cursor.execute("""
                SELECT 
                    d.id as doctor_id,
                    d.name,
                    u.username,
                    u.email,
                    d.clinic_id,
                    c.name as clinic_name,
                    COUNT(a.id) FILTER (WHERE a.status = 'completed') as total_attended,
                    COUNT(a.id) FILTER (WHERE a.status = 'waiting') as currently_waiting
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                JOIN clinics c ON d.clinic_id = c.id
                LEFT JOIN appointments a ON d.id = a.doctor_id
                WHERE d.status = 'active'
                GROUP BY d.id, d.name, u.username, u.email, d.clinic_id, c.name
                ORDER BY d.name
            """)
            
            doctor_stats = cursor.fetchall()
            
            # Average waiting time (today)
            today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            cursor.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at))/60) as avg_minutes
                FROM appointments
                WHERE status = 'completed' AND ended_at >= %s
            """, (today_start,))
            
            result = cursor.fetchone()
            avg_wait_minutes = int(result['avg_minutes']) if result['avg_minutes'] else 0
            
            return {
                "success": True,
                "overview": {
                    "total_clinics": total_clinics,
                    "total_doctors": total_doctors,
                    "total_patients": total_patients,
                    "active_appointments": active_appointments,
                    "avg_wait_minutes": avg_wait_minutes
                },
                "clinic_breakdown": clinic_stats,
                "doctor_performance": doctor_stats
            }
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/receptionists")
async def get_receptionists(request: Request):
    """Get all receptionist accounts (3NF)"""
    db = request.app.state.db
    
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    r.id,
                    r.name,
                    r.contact,
                    r.clinic_id,
                    u.username,
                    u.email,
                    c.name as clinic_name,
                    r.created_at
                FROM receptionists r
                JOIN users u ON r.user_id = u.id
                JOIN clinics c ON r.clinic_id = c.id
                ORDER BY r.created_at DESC
            """)
            
            receptionists = cursor.fetchall()
        
            return {
                "success": True,
                "receptionists": receptionists
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-clinic")
async def create_clinic(clinic: ClinicCreate, request: Request):
    """Create a new clinic (3NF with auto-increment PK)"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO clinics (name, location)
                VALUES (%s, %s)
                RETURNING id
            """, (clinic.name, clinic.location))
            
            clinic_id = cursor.fetchone()['id']
            
            return {
                "success": True,
                "clinic_id": clinic_id,
                "message": "Clinic created successfully"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/create-receptionist")
async def create_receptionist(receptionist: ReceptionistCreate, request: Request):
    """Create a new receptionist account (3NF with auto-increment PK)"""
    db = request.app.state.db
    
    try:
        with db.get_cursor() as cursor:
            # Check if username/email already exists
            cursor.execute("""
                SELECT id FROM users 
                WHERE username = %s OR email = %s
            """, (receptionist.username, receptionist.email))
            
            existing = cursor.fetchone()
            
            if existing:
                raise HTTPException(status_code=400, detail="Username or email already exists")
            
            # Check if clinic exists
            cursor.execute("SELECT id FROM clinics WHERE id = %s", (receptionist.clinic_id,))
            clinic = cursor.fetchone()
            
            if not clinic:
                raise HTTPException(status_code=404, detail="Clinic not found")
            
            # Create user account
            password_hash = hashlib.sha256(receptionist.password.encode()).hexdigest()
            cursor.execute("""
                INSERT INTO users (username, email, password, role)
                VALUES (%s, %s, %s, 'receptionist')
                RETURNING id
            """, (receptionist.username, receptionist.email, password_hash))
            
            user_id = cursor.fetchone()['id']
            
            # Create receptionist profile
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
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-doctor")
async def create_doctor(doctor: DoctorCreate, request: Request):
    """Create a new doctor account (3NF with auto-increment PK)"""
    db = request.app.state.db
    
    try:
        with db.get_cursor() as cursor:
            # Check if username/email already exists
            
            cursor.execute("""
                SELECT id FROM users 
                WHERE username = %s OR email = %s
            """, (doctor.username, doctor.email))
            
            existing_user = cursor.fetchone()
            
            if existing_user:
                raise HTTPException(status_code=400, detail="Username or email already exists")
            
            # Check if license number already exists
            cursor.execute("""
                SELECT id FROM doctors WHERE license_number = %s
            """, (doctor.license_number,))
            
            existing_doctor = cursor.fetchone()
            
            if existing_doctor:
                raise HTTPException(status_code=400, detail="License number already exists")
            
            # Check if clinic exists
            cursor.execute("SELECT id FROM clinics WHERE id = %s", (doctor.clinic_id,))
            clinic = cursor.fetchone()
            
            if not clinic:
                raise HTTPException(status_code=404, detail="Clinic not found")
            
            # Create user account
            password_hash = hashlib.sha256(doctor.password.encode()).hexdigest()
            cursor.execute("""
                INSERT INTO users (username, email, password, role)
                VALUES (%s, %s, %s, 'doctor')
                RETURNING id
            """, (doctor.username, doctor.email, password_hash))
            
            user_id = cursor.fetchone()['id']
            
            # Create doctor profile
            cursor.execute("""
                INSERT INTO doctors (user_id, clinic_id, name, license_number, contact)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (user_id, doctor.clinic_id, doctor.name, doctor.license_number, 
                  doctor.contact))
            
            doctor_id = cursor.fetchone()['id']
            
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
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update-availability/{doctor_id}")
async def update_availability(doctor_id: int, data: AvailabilityUpdate, request: Request):
    """Update doctor's availability hours for all their schedules (3NF)"""
    db = request.app.state.db
    
    try:
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            cursor.execute("""
                UPDATE availability_schedules
                SET start_time = %s, end_time = %s, updated_at = CURRENT_TIMESTAMP
                WHERE doctor_id = %s 
                AND day_of_week = %s
            """, (data.startTime, data.endTime, doctor_id, data.day_of_week))
            
            modified_count = cursor.rowcount
            
            return {
                "success": True,
                "message": f"Updated {modified_count} availability schedules"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/transfer-doctor")
async def transfer_doctor(transfer: DoctorTransfer, request: Request):
    """Transfer doctor to another clinic (3NF)"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id, name FROM doctors WHERE id = %s", (transfer.doctor_id,))
            doctor = cursor.fetchone()
            
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Verify new clinic exists
            cursor.execute("SELECT id FROM clinics WHERE id = %s", (transfer.new_clinic_id,))
            new_clinic = cursor.fetchone()
            
            if not new_clinic:
                raise HTTPException(status_code=404, detail="New clinic not found")
            
            # Check for active appointments
            cursor.execute("""
                SELECT COUNT(*) as count FROM appointments 
                WHERE doctor_id = %s AND status = 'waiting'
            """, (transfer.doctor_id,))
            
            active_appointments = cursor.fetchone()['count']
            
            if active_appointments > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot transfer doctor with {active_appointments} active appointments"
                )
            
            # Update doctor's clinic
            cursor.execute("""
                UPDATE doctors 
                SET clinic_id = %s
                WHERE id = %s
            """, (transfer.new_clinic_id, transfer.doctor_id))
            
            # Get clinic name for notification
            cursor.execute("SELECT name FROM clinics WHERE id = %s", (transfer.new_clinic_id,))
            clinic_name = cursor.fetchone()
            
            # Send notification to the doctor
            cursor.execute("""
                    INSERT INTO notifications (
                        recipient_type, 
                        recipient_id,
                        type, 
                        title,
                        message
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    'doctor',
                    transfer.doctor_id,
                    'transfer_doctor',
                    'Transfer Successful',
                    f"You have been transferred to clinic {clinic_name}"
                ))
            
            return {
                "success": True,
                "message": f"Dr. {doctor['name']} transferred successfully"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/post-bulletin")
async def post_bulletin(bulletin: BulletinCreate, request: Request):
    """Post a health bulletin/alert"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO bulletins (title, message)
                VALUES (%s, %s)
                RETURNING id
            """, (bulletin.title, bulletin.message))
            
            bulletin_id = cursor.fetchone()['id']
            
            return {
                "success": True,
                "bulletin_id": bulletin_id,
                "message": "Bulletin posted successfully"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/notifications")
async def get_notifications(request: Request):
    """Get all unread admin notifications"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT id, type, clinic_id, clinic_name, message, created_at
                FROM notifications
                WHERE type = 'no_doctors_available' AND read = FALSE
                ORDER BY created_at DESC
            """)
            
            notifications = cursor.fetchall()
            
            return {
                "success": True,
                "count": len(notifications),
                "notifications": notifications
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/mark-notification-read/{notification_id}")
async def mark_notification_read(notification_id: int, request: Request):
    """Mark a notification as read"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                UPDATE notifications 
                SET read = TRUE 
                WHERE id = %s
            """, (notification_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            return {
                "success": True,
                "message": "Notification marked as read"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")