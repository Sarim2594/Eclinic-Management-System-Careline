from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# DASHBOARD & HIGH-LEVEL STATS SERVICES
# ============================================================================

def get_system_dashboard_data(db) -> Dict[str, Any]:
    """Retrieves all high-level statistics and company breakdowns for the dashboard."""
    with db.get_cursor() as cursor:
        # Get overview statistics
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM companies) as total_companies,
                (SELECT COUNT(*) FROM admins) as total_admins,
                (SELECT COUNT(*) FROM clinics) as total_clinics,
                (SELECT COUNT(*) FROM doctors) as total_doctors,
                (SELECT COUNT(*) FROM patients) as total_patients
        """)
        overview = cursor.fetchone()
        
        # Get company breakdown with statistics
        cursor.execute("""
            SELECT 
                c.id, c.name, c.email, c.contact, c.address, c.status, c.created_at,
                COUNT(DISTINCT a.id) as admin_count,
                COUNT(DISTINCT cl.id) as clinic_count,
                COUNT(DISTINCT d.id) as doctor_count,
                COUNT(DISTINCT ap.patient_id) as patient_count 
            FROM companies c
            LEFT JOIN admins a ON c.id = a.company_id
            LEFT JOIN clinics cl ON c.id = cl.company_id
            LEFT JOIN doctors d ON cl.id = d.clinic_id
            LEFT JOIN appointments ap ON d.id = ap.doctor_id
            GROUP BY c.id
            ORDER BY c.name
        """)
        companies = cursor.fetchall()
        
        return {
            "success": True,
            **overview, # Unpacks the overview dictionary
            "companies": companies
        }

def get_all_companies_with_stats(db) -> Dict[str, Any]:
    """Retrieves all companies, similar to dashboard but focused on company list management."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                c.id, c.name, c.email, c.contact, c.registration_number, c.address, c.status, c.created_at,
                COUNT(DISTINCT a.id) as admin_count,
                COUNT(DISTINCT cl.id) as clinic_count,
                COUNT(DISTINCT d.id) as doctor_count,
                COUNT(DISTINCT ap.patient_id) as patient_count 
            FROM companies c
            LEFT JOIN admins a ON c.id = a.company_id
            LEFT JOIN clinics cl ON c.id = cl.company_id
            LEFT JOIN doctors d ON cl.id = d.clinic_id
            LEFT JOIN appointments ap ON d.id = ap.doctor_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """)
        companies = cursor.fetchall()
        
        return {"success": True, "companies": companies}