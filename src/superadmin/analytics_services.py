from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# ANALYTICS & INSIGHTS SERVICES
# ============================================================================

def get_platform_analytics(db) -> Dict[str, Any]:
    """Get analytics data for SuperAdmin dashboard"""
    try:
        with db.get_cursor() as cursor:
            # Regional distribution - FIXED to use city_id joins
            cursor.execute("""
                SELECT 
                    r.province,
                    COUNT(DISTINCT cl.id) as clinic_count,
                    COUNT(DISTINCT d.id) as doctor_count,
                    COUNT(DISTINCT p.id) as patient_count
                FROM regions r
                LEFT JOIN cities ct ON r.id = ct.region_id
                LEFT JOIN clinics cl ON ct.id = cl.city_id AND cl.status = 'active'
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                GROUP BY r.province
                ORDER BY clinic_count DESC
            """)
            
            regional_distribution = cursor.fetchall()
            
            # Top performing companies
            cursor.execute("""
                SELECT 
                    c.id,
                    c.name,
                    COUNT(DISTINCT cl.id) as clinic_count,
                    COUNT(DISTINCT d.id) as doctor_count,
                    COUNT(DISTINCT p.id) as patient_count,
                    COUNT(DISTINCT ap.id) as total_appointments,
                    ROUND(
                        CASE 
                            WHEN COUNT(DISTINCT ap.id) > 0 
                            THEN (COUNT(DISTINCT ap.id) FILTER (WHERE ap.status = 'completed')::DECIMAL / COUNT(DISTINCT ap.id)) * 100
                            ELSE 0 
                        END, 
                    2) as performance_score
                FROM companies c
                LEFT JOIN clinics cl ON c.id = cl.company_id AND cl.status = 'active'
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                LEFT JOIN appointments ap ON d.id = ap.doctor_id
                LEFT JOIN patients p ON ap.patient_id = p.id
                WHERE c.status = 'active'
                GROUP BY c.id, c.name
                ORDER BY performance_score DESC, total_appointments DESC
                LIMIT 10
            """)
            
            top_companies = cursor.fetchall()
            
            return {
                "success": True,
                "regional_distribution": regional_distribution,
                "top_companies": top_companies
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    