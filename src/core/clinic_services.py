from fastapi import HTTPException, status
from typing import Dict, Any

def get_all_active_clinics(db) -> Dict[str, Any]:
    """Retrieves all active clinics with doctor count."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                c.id, c.name, c.location, c.city, c.status,
                COUNT(d.id) FILTER (WHERE d.status = 'active') as total_doctors
            FROM clinics c
            LEFT JOIN doctors d ON c.id = d.clinic_id
            WHERE c.status = 'active'
            GROUP BY c.id, c.name, c.location, c.city, c.status
            ORDER BY c.name
        """)
        
        clinics = cursor.fetchall()
        
        return {"success": True, "clinics": clinics}

def get_company_by_clinic_id(db, clinic_id: int) -> Dict[str, Any]:
    """Retrieves the company details associated with a given clinic."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT c.company_id, co.name as company_name
            FROM clinics c
            JOIN companies co ON c.company_id = co.id
            WHERE c.id = %s
        """, (clinic_id,))
        
        clinic = cursor.fetchone()
        
        if not clinic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")
        
        return {
            "success": True,
            "company_id": clinic['company_id'],
            "company_name": clinic['company_name']
        }