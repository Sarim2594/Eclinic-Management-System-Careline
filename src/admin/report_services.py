from fastapi import HTTPException
from typing import Dict, Any, List
from datetime import datetime

# ============================================================================
# REPORTING & STATISTICS SERVICES
# ============================================================================

def get_system_statistics(db, company_id) -> Dict[str, Any]:
    """Get statistics for admin dashboard"""
    try:
        with db.get_cursor() as cursor:
            # Add WHERE clause if company_id provided
            company_filter = "WHERE cl.company_id = %s" if company_id else ""
            params = [company_id] if company_id else []
            
            # Get overview statistics
            cursor.execute(f"""
                SELECT 
                    COUNT(DISTINCT cl.id) as total_clinics,
                    COUNT(DISTINCT d.id) as total_doctors,
                    COUNT(DISTINCT p.id) as total_patients,
                    COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'waiting') as active_appointments
                FROM clinics cl
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                {company_filter} AND cl.status = 'active'
            """, params)
            
            overview = cursor.fetchone()
            
            # Get clinic breakdown
            cursor.execute(f"""
                SELECT 
                    cl.id,
                    cl.name,
                    ct.name as city,
                    COUNT(DISTINCT d.id) as total_doctors,
                    COUNT(DISTINCT p.id) as total_patients,
                    COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'waiting') as waiting_patients
                FROM clinics cl
                LEFT JOIN cities ct ON cl.city_id = ct.id
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                {company_filter} AND cl.status = 'active'
                GROUP BY cl.id, cl.name, ct.name
                ORDER BY cl.name
            """, params)
            
            clinic_breakdown = cursor.fetchall()
            
            # Get doctor performance
            cursor.execute(f"""
                SELECT 
                    d.id as doctor_id,
                    d.name,
                    u.username,
                    u.email,
                    cl.name as clinic_name,
                    ct.name as city,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as total_attended,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'waiting') as currently_waiting
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                JOIN clinics cl ON d.clinic_id = cl.id
                LEFT JOIN cities ct ON cl.city_id = ct.id
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                WHERE d.status = 'active' {"AND cl.company_id = %s" if company_id else ""}
                GROUP BY d.id, d.name, u.username, u.email, cl.name, ct.name
                ORDER BY cl.name, d.name
            """, params)
            
            doctor_performance = cursor.fetchall()
            
            return {
                "success": True,
                "overview": overview,
                "clinic_breakdown": clinic_breakdown,
                "doctor_performance": doctor_performance
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_all_receptionists(db, company_id) -> Dict[str, Any]:
    """Get all receptionists with clinic information"""
    try:
        with db.get_cursor() as cursor:
            if company_id:
                # Filter by company
                cursor.execute("""
                    SELECT 
                        r.id,
                        r.name,
                        u.username,
                        u.email,
                        r.contact,
                        cl.name as clinic_name,
                        ct.name as city
                    FROM receptionists r
                    JOIN users u ON r.user_id = u.id
                    JOIN clinics cl ON r.clinic_id = cl.id
                    LEFT JOIN cities ct ON cl.city_id = ct.id
                    WHERE cl.company_id = %s AND cl.status = 'active'
                    ORDER BY cl.name, r.name
                """, (company_id,))
            else:
                # All receptionists
                cursor.execute("""
                    SELECT 
                        r.id,
                        r.name,
                        u.username,
                        u.email,
                        r.contact,
                        cl.name as clinic_name,
                        ct.name as city
                    FROM receptionists r
                    JOIN users u ON r.user_id = u.id
                    JOIN clinics cl ON r.clinic_id = cl.id
                    LEFT JOIN cities ct ON cl.city_id = ct.id
                    ORDER BY cl.name, r.name
                """)
            
            receptionists = cursor.fetchall()
            
            return {
                "success": True,
                "receptionists": receptionists
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_all_doctors(db, company_id) -> Dict[str, Any]:
    try:
        with db.get_cursor() as cursor:
            if company_id:
                # Filter by company
                cursor.execute("""
                    SELECT 
                        d.id as doctor_id,
                        d.name,
                        u.username,
                        u.email,
                        cl.name as clinic_name,
                        ct.name as city,
                        COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as total_attended,
                        COUNT(ap.id) FILTER (WHERE ap.status = 'waiting') as currently_waiting
                    FROM doctors d
                    JOIN users u ON d.user_id = u.id
                    JOIN clinics cl ON d.clinic_id = cl.id
                    LEFT JOIN cities ct ON cl.city_id = ct.id
                    LEFT JOIN appointments ap ON d.id = ap.doctor_id
                    WHERE d.status = 'active' AND cl.company_id = %s AND cl.status = 'active'
                    GROUP BY d.id, d.name, u.username, u.email, cl.name, ct.name
                    ORDER BY cl.name, d.name
                """, (company_id,))
            else:
                # All doctors
                cursor.execute("""
                    SELECT 
                        d.id as doctor_id,
                        d.name,
                        u.username,
                        u.email,
                        cl.name as clinic_name,
                        ct.name as city,
                        COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as total_attended,
                        COUNT(ap.id) FILTER (WHERE ap.status = 'waiting') as currently_waiting
                    FROM doctors d
                    JOIN users u ON d.user_id = u.id
                    JOIN clinics cl ON d.clinic_id = cl.id
                    LEFT JOIN cities ct ON cl.city_id = ct.id
                    LEFT JOIN appointments ap ON d.id = ap.doctor_id
                    WHERE d.status = 'active'
                    GROUP BY d.id, d.name, u.username, u.email, cl.name, ct.name
                    ORDER BY cl.name, d.name
                """)
            
            doctors = cursor.fetchall()
            
            return {
                "success": True,
                "doctors": doctors
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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