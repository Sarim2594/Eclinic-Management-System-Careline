from fastapi import HTTPException, status
from typing import Dict, Any

def get_all_active_clinics(db, company_id) -> Dict[str, Any]:
    """"Get all clinics with city and region information, optionally filtered by company"""
    try:
        with db.get_cursor() as cursor:
            if company_id:
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.name,
                        c.location,
                        ct.name as city,
                        c.status,
                        COUNT(d.id) FILTER (WHERE d.status = 'active') as total_doctors
                    FROM clinics c
                    LEFT JOIN cities ct ON c.city_id = ct.id
                    LEFT JOIN doctors d ON c.id = d.clinic_id
                    WHERE c.status = 'active' AND c.company_id = %s
                    GROUP BY c.id, c.name, c.location, ct.name, c.status
                    ORDER BY c.name
                """, (company_id,))
            else:
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.name,
                        c.location,
                        ct.name as city,
                        c.status,
                        COUNT(d.id) FILTER (WHERE d.status = 'active') as total_doctors
                    FROM clinics c
                    LEFT JOIN cities ct ON c.city_id = ct.id
                    LEFT JOIN doctors d ON c.id = d.clinic_id
                    WHERE c.status = 'active'
                    GROUP BY c.id, c.name, c.location, ct.name, c.status
                    ORDER BY c.name
                """)
            
            clinics = cursor.fetchall()
            
            return {
                "success": True,
                "clinics": clinics
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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