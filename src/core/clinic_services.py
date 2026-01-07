from fastapi import HTTPException, status
from typing import Dict, Any

def get_all_active_clinics(db, company_id=None, admin_id: int = None) -> Dict[str, Any]:
    """Get all clinics with city and region information.
    Optionally filter by company and/or admin's assigned regions.
    """
    try:
        with db.get_cursor() as cursor:
            region_ids = None
            if admin_id:
                cursor.execute("""
                    SELECT ARRAY_AGG(region_id) as region_ids
                    FROM admin_regions
                    WHERE admin_id = %s
                """, (admin_id,))
                res = cursor.fetchone()
                region_ids = res['region_ids'] or [] if res else []
                if not region_ids:
                    return {"success": True, "clinics": []}

            params = []
            where_clauses = ["c.status = 'active'"]

            if company_id:
                where_clauses.append("c.company_id = %s")
                params.append(company_id)

            if region_ids is not None:
                where_clauses.append("cy.region_id = ANY(%s)")
                params.append(region_ids)

            where_clause = " AND ".join(where_clauses)

            cursor.execute(f"""
                SELECT 
                    c.id,
                    c.name,
                    c.location,
                    ct.name as city,
                    c.status,
                    COUNT(d.id) FILTER (WHERE d.status = 'active') as total_doctors
                FROM clinics c
                LEFT JOIN cities ct ON c.city_id = ct.id
                LEFT JOIN cities cy ON c.city_id = cy.id
                LEFT JOIN doctors d ON c.id = d.clinic_id
                WHERE {where_clause}
                GROUP BY c.id, c.name, c.location, ct.name, c.status
                ORDER BY c.name
            """, tuple(params) if params else None)

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