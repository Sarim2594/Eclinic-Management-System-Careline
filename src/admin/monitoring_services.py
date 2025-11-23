import traceback
from fastapi import HTTPException, status
from src.admin.models import AvailabilityUpdate
from utils.reminder_email import send_reminder_email
from datetime import datetime, timedelta, time
from typing import Dict, Any

# ============================================================================
# MONITORING & SCHEDULING SERVICES
# ============================================================================

def update_doctor_availability(db, doctor_id: int, data: AvailabilityUpdate) -> Dict[str, Any]:
    """Updates a doctor's availability for a specific day."""
    with db.get_cursor() as cursor:
        # 1. Verify doctor exists
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Update schedule
        cursor.execute("""
            UPDATE availability_schedules
            SET start_time = %s, end_time = %s, updated_at = CURRENT_TIMESTAMP
            WHERE doctor_id = %s AND day_of_week = %s
        """, (data.startTime, data.endTime, doctor_id, data.day_of_week))
        
        modified_count = cursor.rowcount
        
        return {
            "success": True,
            "message": f"Updated {modified_count} availability schedules"
        }

def run_doctor_monitoring(db) -> Dict[str, Any]:
    """Checks for doctors who are about to start their shift and sends reminders."""
    try:
        doctors = None
        with db.get_cursor() as cursor:
            # Query for doctors who are inactive but have a shift today
            cursor.execute("""
                SELECT a.start_time, d.name, u.email, d.contact 
                FROM availability_schedules a 
                JOIN doctors d ON a.doctor_id = d.id 
                JOIN users u ON u.id = d.user_id 
                WHERE a.is_active = false
                AND a.day_of_week = EXTRACT(DOW FROM NOW());
            """)
            doctors = cursor.fetchall()
            
        now = datetime.now()
        success = False # Tracks if any email was successfully sent

        for doctor in doctors:
            # Handle time format conversion (extracted from admin.py)
            start_time_obj = None
            if isinstance(doctor['start_time'], str):
                try:
                    start_time_obj = datetime.strptime(doctor['start_time'], "%H:%M:%S").time()
                except ValueError:
                    start_time_obj = datetime.strptime(doctor['start_time'], "%H:%M").time()
            elif isinstance(doctor['start_time'], time):
                start_time_obj = doctor['start_time']
            else:
                continue

            start_dt = datetime.combine(now.date(), start_time_obj)
            diff = start_dt - now

            # Send reminder if within next 15 minutes OR next 5 minutes
            if timedelta(minutes=0) <= diff <= timedelta(minutes=15):
                success = send_reminder_email(doctor['email'], doctor['name'], start_dt.strftime("%I:%M %p"))
            
            # Note: The original code double-checked for 5 minutes, which is redundant 
            # if the 15-minute check is executed, but we'll respect the original logic's intent.
            if timedelta(minutes=0) <= diff <= timedelta(minutes=5):
                success = send_reminder_email(doctor['email'], doctor['name'], start_dt.strftime("%I:%M %p"))
        
        return {"success": success}

    except Exception as e:
        print("❌ ERROR in run_doctor_monitoring:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")