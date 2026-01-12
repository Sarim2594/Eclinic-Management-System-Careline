from fastapi import HTTPException
from typing import Dict, Any
from datetime import datetime

def get_admin_regions(db, admin_id: int) -> Dict[str, Any]:
    """Get admin's assigned regions"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    ar.region_id,
                    r.province,
                    r.sub_region,
                    CONCAT(r.province, ' > ', r.sub_region) as full_name
                FROM admin_regions ar
                JOIN regions r ON ar.region_id = r.id
                WHERE ar.admin_id = %s
                ORDER BY r.province, r.sub_region
            """, (admin_id,))
            
            regions = cursor.fetchall()
            return {
                "success": True,
                "regions": regions or []
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_system_statistics(db, company_id, admin_id: int = None) -> Dict[str, Any]:
    """Get system statistics: clinics, doctors, patients, appointments.
    If admin_id provided, filter by admin's regions only."""
    try:
        with db.get_cursor() as cursor:
            # Build filter conditions
            filters = ["cl.status = 'active'"]
            params = []
            
            if company_id:
                filters.append("cl.company_id = %s")
                params.append(company_id)
            
            # If admin_id provided, get their regions and filter by those
            region_ids = []
            if admin_id:
                cursor.execute("""
                    SELECT ARRAY_AGG(region_id) as region_ids
                    FROM admin_regions
                    WHERE admin_id = %s
                """, (admin_id,))
                result = cursor.fetchone()
                region_ids = result['region_ids'] or [] if result else []
                
                if region_ids:
                    filters.append("cy.region_id = ANY(%s)")
                    params.append(region_ids)
                else:
                    # Admin has no regions assigned, return empty results
                    return {
                        "success": True,
                        "regions": [],
                        "overview": None,
                        "clinic_breakdown": [],
                        "doctor_performance": []
                    }
            
            where_clause = " AND ".join(filters)
            
            cursor.execute(f"""
                SELECT 
                    COUNT(DISTINCT cl.id) as total_clinics,
                    COUNT(DISTINCT d.id) as total_doctors,
                    COUNT(DISTINCT p.id) as total_patients,
                    COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'waiting') as active_appointments
                FROM clinics cl
                LEFT JOIN cities cy ON cl.city_id = cy.id
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                WHERE {where_clause}
            """, params)
            
            overview = cursor.fetchone()
            
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
                LEFT JOIN cities cy ON cl.city_id = cy.id
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                WHERE {where_clause}
                GROUP BY cl.id, cl.name, ct.name
                ORDER BY cl.name
            """, params)
            
            clinic_breakdown = cursor.fetchall()
            
            cursor.execute(f"""
                SELECT 
                    d.id as doctor_id,
                    d.name,
                    u.username,
                    u.email,
                    cl.name as clinic_name,
                    ct.name as city,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as total_attended,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'waiting') as currently_waiting,
                    d.missed_shifts_count
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                JOIN clinics cl ON d.clinic_id = cl.id
                LEFT JOIN cities ct ON cl.city_id = ct.id
                LEFT JOIN cities cy ON cl.city_id = cy.id
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                WHERE d.status = 'active' AND {where_clause}
                GROUP BY d.id, d.name, u.username, u.email, cl.name, ct.name, d.missed_shifts_count
                ORDER BY cl.name, d.name
            """, params)
            
            doctor_performance = cursor.fetchall()
            
            # Get admin's regions if admin_id provided
            regions = []
            if admin_id:
                cursor.execute("""
                    SELECT 
                        ar.region_id,
                        r.province,
                        r.sub_region,
                        CONCAT(r.province, ' > ', r.sub_region) as full_name
                    FROM admin_regions ar
                    JOIN regions r ON ar.region_id = r.id
                    WHERE ar.admin_id = %s
                    ORDER BY r.province, r.sub_region
                """, (admin_id,))
                regions = cursor.fetchall()
            
            return {
                "success": True,
                "regions": regions,
                "overview": overview,
                "clinic_breakdown": clinic_breakdown,
                "doctor_performance": doctor_performance
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_receptionists(db, company_id, admin_id: int = None) -> Dict[str, Any]:
    """Retrieve all receptionists with clinic information.
    If admin_id provided, filter by admin's regions only."""
    try:
        with db.get_cursor() as cursor:
            filters = ["cl.status = 'active'"]
            params = []
            
            if company_id:
                filters.append("cl.company_id = %s")
                params.append(company_id)
            
            # If admin_id provided, filter by their regions
            if admin_id:
                cursor.execute("""
                    SELECT ARRAY_AGG(region_id) as region_ids
                    FROM admin_regions
                    WHERE admin_id = %s
                """, (admin_id,))
                result = cursor.fetchone()
                region_ids = result['region_ids'] or [] if result else []
                
                if region_ids:
                    filters.append("cy.region_id = ANY(%s)")
                    params.append(region_ids)
                else:
                    return {"success": True, "receptionists": []}
            
            where_clause = " AND ".join(filters)
            
            cursor.execute(f"""
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
                LEFT JOIN cities cy ON cl.city_id = cy.id
                WHERE {where_clause}
                ORDER BY cl.name, r.name
            """, params)
            
            receptionists = cursor.fetchall()
            
            return {
                "success": True,
                "receptionists": receptionists
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_all_doctors(db, company_id, admin_id: int = None) -> Dict[str, Any]:
    """Get all doctors, optionally filtered by company and/or admin's regions"""
    try:
        with db.get_cursor() as cursor:
            filters = ["d.status = 'active' AND cl.status = 'active'"]
            params = []
            
            if company_id:
                filters.append("cl.company_id = %s")
                params.append(company_id)
            
            # If admin_id provided, filter by their regions
            if admin_id:
                cursor.execute("""
                    SELECT ARRAY_AGG(region_id) as region_ids
                    FROM admin_regions
                    WHERE admin_id = %s
                """, (admin_id,))
                result = cursor.fetchone()
                region_ids = result['region_ids'] or [] if result else []
                
                if region_ids:
                    filters.append("cy.region_id = ANY(%s)")
                    params.append(region_ids)
                else:
                    return {"success": True, "doctors": []}
            
            where_clause = " AND ".join(filters)
            
            # Filter by company
            cursor.execute(f"""
                SELECT 
                    d.id as doctor_id,
                    d.name,
                    u.username,
                    u.email,
                    cl.name as clinic_name,
                    ct.name as city,
                    d.specialization_id,
                    s.name as specialization,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as total_attended,
                    COUNT(ap.id) FILTER (WHERE ap.status = 'waiting') as currently_waiting
                FROM doctors d
                JOIN users u ON d.user_id = u.id
                JOIN clinics cl ON d.clinic_id = cl.id
                LEFT JOIN specializations s ON d.specialization_id = s.id
                LEFT JOIN cities ct ON cl.city_id = ct.id
                LEFT JOIN cities cy ON cl.city_id = cy.id
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                WHERE {where_clause}
                GROUP BY d.id, d.name, u.username, u.email, cl.name, ct.name, d.specialization_id, s.name
                ORDER BY cl.name, d.name
            """, params)
            
            doctors = cursor.fetchall()
            
            return {
                "success": True,
                "doctors": doctors
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_cities_for_admin(db, admin_id: int = None) -> Dict[str, Any]:
    """Return cities grouped by province and sub_region. If admin_id provided,
    only include cities in regions assigned to that admin."""
    try:
        with db.get_cursor() as cursor:
            params = []
            where_clause = ""

            if admin_id:
                cursor.execute("""
                    SELECT ARRAY_AGG(region_id) as region_ids
                    FROM admin_regions
                    WHERE admin_id = %s
                """, (admin_id,))
                result = cursor.fetchone()
                region_ids = result['region_ids'] or [] if result else []

                if not region_ids:
                    return {"success": True, "grouped": {}}

                where_clause = "WHERE cy.region_id = ANY(%s)"
                params.append(region_ids)

            cursor.execute(f"""
                SELECT ct.id as city_id, ct.name as city_name, r.province, r.sub_region
                FROM cities ct
                JOIN regions r ON ct.region_id = r.id
                LEFT JOIN cities cy ON ct.id = cy.id
                {where_clause}
                ORDER BY r.province, r.sub_region, ct.name
            """, params)

            rows = cursor.fetchall()

            grouped = {}
            for row in rows:
                prov = row['province'] or 'Unknown'
                sub = row['sub_region'] or ''
                if prov not in grouped:
                    grouped[prov] = {}
                if sub not in grouped[prov]:
                    grouped[prov][sub] = []
                grouped[prov][sub].append({"id": row['city_id'], "name": row['city_name']})

            return {"success": True, "grouped": grouped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_specializations(db) -> Dict[str, Any]:
    """Return all specializations ordered by name"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("SELECT id, name FROM specializations ORDER BY name")
            specs = cursor.fetchall()
            return {"success": True, "specializations": specs}
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

def get_doctor_schedule(db, doctor_id: int) -> Dict[str, Any]:
    """Return availability schedule entries for a doctor ordered by day_of_week."""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT day_of_week, start_time, end_time, is_active
                FROM availability_schedules
                WHERE doctor_id = %s
                ORDER BY day_of_week ASC
            """, (doctor_id,))
            rows = cursor.fetchall() or []

            # Map ISO day numbers (1=Mon .. 7=Sun) to names
            day_names = {1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'}
            schedule = []
            for r in rows:
                dow = r.get('day_of_week')
                schedule.append({
                    'day_of_week': int(dow) if dow is not None else None,
                    'day_name': day_names.get(int(dow), str(dow)) if dow is not None else '',
                    'start_time': r.get('start_time'),
                    'end_time': r.get('end_time'),
                    'is_active': bool(r.get('is_active'))
                })

            return {"success": True, "schedule": schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_unavailable_doctors_for_admin(db, admin_id: int = None) -> Dict[str, Any]:
    """List doctors whose scheduled shift started but are inactive."""
    with db.get_cursor() as cursor:
        if admin_id:
            # Get admin's assigned regions
            cursor.execute("""
                SELECT ARRAY_AGG(region_id) as region_ids
                FROM admin_regions
                WHERE admin_id = %s
            """, (admin_id,))
            admin_info = cursor.fetchone()
            region_ids = admin_info['region_ids'] or [] if admin_info else []
            
            # Only query if admin has assigned regions
            if not region_ids or None in region_ids:
                return {"success": True, "unavailable_doctors": []}
            
            cursor.execute("""
                SELECT
                    d.id,
                    d.name,
                    c.name AS clinic_name,
                    s.start_time,
                    s.end_time,
                    COALESCE(dur.reason, '-') as reason
                FROM availability_schedules s
                JOIN doctors d ON s.doctor_id = d.id
                JOIN clinics c ON d.clinic_id = c.id
                JOIN cities cy ON c.city_id = cy.id
                LEFT JOIN doctor_unavailability_requests dur ON d.id = dur.doctor_id
                    AND dur.status = 'approved'
                    AND dur.start_datetime <= CURRENT_TIMESTAMP
                    AND dur.end_datetime >= CURRENT_TIMESTAMP
                WHERE s.day_of_week = EXTRACT(ISODOW FROM now())::int
                  AND s.is_active = FALSE
                  AND s.start_time <= CURRENT_TIME
                  AND (s.end_time IS NULL OR s.end_time >= CURRENT_TIME)
                  AND cy.region_id = ANY(%s)
                ORDER BY d.name ASC
            """, (region_ids,))
        else:
            # No admin_id: return all unavailable doctors
            cursor.execute("""
                SELECT
                    d.id,
                    d.name,
                    c.name AS clinic_name,
                    s.start_time,
                    s.end_time,
                    COALESCE(dur.reason, '-') as reason
                FROM availability_schedules s
                JOIN doctors d ON s.doctor_id = d.id
                JOIN clinics c ON d.clinic_id = c.id
                LEFT JOIN doctor_unavailability_requests dur ON d.id = dur.doctor_id
                    AND dur.status = 'approved'
                    AND dur.start_datetime <= CURRENT_TIMESTAMP
                    AND dur.end_datetime >= CURRENT_TIMESTAMP
                WHERE s.day_of_week = EXTRACT(ISODOW FROM now())::int
                  AND s.is_active = FALSE
                  AND s.start_time <= CURRENT_TIME
                  AND (s.end_time IS NULL OR s.end_time >= CURRENT_TIME)
                ORDER BY d.name ASC
            """)
        
        doctors = cursor.fetchall()
        return {"success": True, "unavailable_doctors": doctors}