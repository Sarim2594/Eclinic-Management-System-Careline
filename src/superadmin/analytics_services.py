from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# ANALYTICS & INSIGHTS SERVICES
# ============================================================================

def get_platform_analytics(db) -> Dict[str, Any]:
    """Calculates and retrieves top performing companies and regional distribution."""
    with db.get_cursor() as cursor:
        # Get top performing companies
        cursor.execute("""
            SELECT 
                c.id, c.name,
                COUNT(DISTINCT cl.id) as clinic_count,
                COUNT(DISTINCT d.id) as doctor_count,
                COUNT(DISTINCT ap.id) as total_appointments,
                ROUND(
                    CAST(
                        (COUNT(DISTINCT cl.id)::float * 20 + 
                         COUNT(DISTINCT d.id)::float * 30 + 
                         COUNT(DISTINCT ap.id)::float * 50) / 100 
                    AS numeric), 
                    2
                ) as performance_score
            FROM companies c
            LEFT JOIN clinics cl ON c.id = cl.company_id
            LEFT JOIN doctors d ON cl.id = d.clinic_id
            LEFT JOIN appointments ap ON d.id = ap.doctor_id
            WHERE c.status = 'active'
            GROUP BY c.id, c.name
            ORDER BY performance_score DESC
            LIMIT 10
        """)
        top_companies = cursor.fetchall()
        
        # Get regional distribution
        cursor.execute("""
            SELECT 
                pr.province,
                COUNT(DISTINCT cl.id) as clinic_count,
                COUNT(DISTINCT d.id) as doctor_count
            FROM pakistan_regions pr
            LEFT JOIN clinics cl ON pr.city = cl.city
            LEFT JOIN doctors d ON cl.id = d.clinic_id
            GROUP BY pr.province
            ORDER BY clinic_count DESC
        """)
        regional_distribution = cursor.fetchall()
        
        return {
            "success": True,
            "top_companies": top_companies,
            "regional_distribution": regional_distribution
        }