from fastapi import HTTPException
from typing import Dict, Any, List
from datetime import datetime

# ============================================================================
# REPORTING & STATISTICS SERVICES
# ============================================================================

def get_system_statistics(db) -> Dict[str, Any]:
    """Retrieves comprehensive system statistics and breakdowns."""
    try:
        with db.get_cursor() as cursor:
            # --- Overall stats ---
            cursor.execute("SELECT COUNT(*) as count FROM clinics")
            total_clinics = cursor.fetchone()['count']
            # ... (rest of overall stats queries) ...
            cursor.execute("SELECT COUNT(*) as count FROM doctors WHERE status = 'active'")
            total_doctors = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM patients")
            total_patients = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'waiting'")
            active_appointments = cursor.fetchone()['count']
            
            # --- Per-clinic stats ---
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
            
            # --- Doctor performance ---
            # ... (doctor performance query) ...
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
            
            # --- Average waiting time (today) ---
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
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
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def get_all_receptionists(db) -> Dict[str, Any]:
    """Retrieves all receptionist accounts."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                r.id, r.name, r.contact, r.clinic_id, u.username, u.email,
                c.name as clinic_name, r.created_at
            FROM receptionists r
            JOIN users u ON r.user_id = u.id
            JOIN clinics c ON r.clinic_id = c.id
            ORDER BY r.created_at DESC
        """)
        receptionists = cursor.fetchall()
    
        return {"success": True, "receptionists": receptionists}


def get_available_doctors_for_admin(db) -> Dict[str, Any]:
    """Retrieves list of active doctors with current queue length and end time."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            WITH ActiveDoctorsSchedule AS (
                SELECT doctor_id, end_time FROM availability_schedules WHERE is_active = TRUE 
            ),
            DoctorQueueCount AS (
                SELECT doctor_id, COUNT(id) AS queue_count FROM appointments
                WHERE status = 'waiting' GROUP BY doctor_id
            )
            SELECT d.name, c.name AS clinic_name,
                   COALESCE(q.queue_count, 0) AS currently_waiting, s.end_time
            FROM doctors d
            JOIN clinics c ON d.clinic_id = c.id
            INNER JOIN ActiveDoctorsSchedule s ON d.id = s.doctor_id 
            LEFT JOIN DoctorQueueCount q ON d.id = q.doctor_id
            ORDER BY currently_waiting ASC, d.name ASC;
        """)
        doctors = cursor.fetchall()
    
        return {"success": True, "available_doctors": doctors}