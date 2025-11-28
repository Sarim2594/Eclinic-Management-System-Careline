from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# DASHBOARD & HIGH-LEVEL STATS SERVICES
# ============================================================================

def get_system_dashboard_data(db) -> Dict[str, Any]:
    """Get dashboard statistics for SuperAdmin"""
    try:
        with db.get_cursor() as cursor:
            # Get total counts
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM companies WHERE status = 'active') as total_companies,
                    (SELECT COUNT(*) FROM admins) as total_admins,
                    (SELECT COUNT(*) FROM clinics WHERE status = 'active') as total_clinics,
                    (SELECT COUNT(*) FROM doctors WHERE status = 'active') as total_doctors
            """)
            
            totals = cursor.fetchone()
            
            # Get company breakdown
            cursor.execute("""
                SELECT 
                    c.id,
                    c.name,
                    c.email,
                    c.contact,
                    c.registration_number,
                    c.address,
                    c.subscription_plan,
                    c.max_clinics,
                    c.status,
                    c.created_at,
                    COUNT(DISTINCT a.id) as admin_count,
                    COUNT(DISTINCT cl.id) as clinic_count,
                    COUNT(DISTINCT d.id) as doctor_count,
                    COUNT(DISTINCT p.id) as patient_count
                FROM companies c
                LEFT JOIN admins a ON c.id = a.company_id
                LEFT JOIN clinics cl ON c.id = cl.company_id AND cl.status = 'active'
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                GROUP BY c.id, c.name, c.email, c.contact, c.registration_number, 
                         c.address, c.subscription_plan, c.max_clinics, c.status, c.created_at
                ORDER BY c.name
            """)
            
            companies = cursor.fetchall()
            
            return {
                "success": True,
                "total_companies": totals['total_companies'],
                "total_admins": totals['total_admins'],
                "total_clinics": totals['total_clinics'],
                "total_doctors": totals['total_doctors'],
                "companies": companies
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_all_companies_with_stats(db) -> Dict[str, Any]:
    """Get all companies with statistics"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id,
                    c.name,
                    c.email,
                    c.contact,
                    c.registration_number,
                    c.address,
                    c.subscription_plan,
                    c.max_clinics,
                    c.status,
                    c.created_at,
                    COUNT(DISTINCT a.id) as admin_count,
                    COUNT(DISTINCT cl.id) as clinic_count,
                    COUNT(DISTINCT d.id) as doctor_count,
                    COUNT(DISTINCT p.id) as patient_count
                FROM companies c
                LEFT JOIN admins a ON c.id = a.company_id
                LEFT JOIN clinics cl ON c.id = cl.company_id AND cl.status = 'active'
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                GROUP BY c.id
                ORDER BY c.name
            """)
            
            companies = cursor.fetchall()
            
            return {
                "success": True,
                "companies": companies
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    