import datetime

# ============================================================================
# DOCTOR AVAILABILITY HELPER
# ============================================================================

def is_doctor_available(doctor_id: int, db) -> bool:
    """Check if doctor is available based on current day and time"""
    now = datetime.datetime.now()
    current_day = now.isoweekday()
    current_time = now.time()
    
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT start_time, end_time 
            FROM availability_schedules 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = TRUE
        """, (doctor_id, current_day))
        
        schedule = cursor.fetchone()
        
        if not schedule:
            return False
        
        start_time = schedule['start_time']
        end_time = schedule['end_time']
        
        if start_time <= end_time:
            return start_time <= current_time <= end_time
        else:
            # Overnight shift
            return current_time >= start_time or current_time <= end_time