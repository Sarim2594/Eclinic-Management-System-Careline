from fastapi import HTTPException, status
from src.superadmin.models import CompanyCreate, CompanyStatusUpdate
from typing import Dict, Any

# ============================================================================
# COMPANY MANAGEMENT SERVICES
# ============================================================================

def register_new_company(db, company: CompanyCreate) -> Dict[str, Any]:
    """Registers a new company with subscription details"""
    with db.get_cursor() as cursor:
        # Check uniqueness
        cursor.execute("""
            SELECT id FROM companies 
            WHERE email = %s OR registration_number = %s
        """, (company.email, company.registration_number))
        
        if cursor.fetchone():
            raise HTTPException(
                status_code=400, 
                detail="Company with this email or registration number already exists"
            )
        
        # Insert company with new fields
        cursor.execute("""
            INSERT INTO companies (name, email, contact, registration_number, address, 
                                  subscription_plan, max_clinics, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
            RETURNING id
        """, (company.name, company.email, company.contact, 
              company.registration_number, company.address,
              company.subscription_plan, company.max_clinics))
        
        company_id = cursor.fetchone()['id']
        
        return {
            "success": True,
            "message": f"Company '{company.name}' registered successfully",
            "company_id": company_id
        }

def update_company_status(db, company_id: int, status_update: CompanyStatusUpdate) -> Dict[str, Any]:
    """Activates or deactivates a company."""
    if status_update.status not in ['active', 'inactive']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be 'active' or 'inactive'")
    
    with db.get_cursor() as cursor:
        cursor.execute("""
            UPDATE companies 
            SET status = %s 
            WHERE id = %s
            RETURNING name
        """, (status_update.status, company_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        
        return {
            "success": True,
            "message": f"Company '{result['name']}' {status_update.status}d successfully"
        }

def get_clinics_by_company(db, company_id: int) -> Dict[str, Any]:
    """Get all clinics for a company with region details"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    cl.id,
                    cl.name,
                    cl.location,
                    ct.name as city,
                    r.province,
                    r.sub_region,
                    COUNT(DISTINCT d.id) as doctor_count
                FROM clinics cl
                JOIN cities ct ON cl.city_id = ct.id
                JOIN regions r ON ct.region_id = r.id
                LEFT JOIN doctors d ON cl.id = d.clinic_id AND d.status = 'active'
                WHERE cl.company_id = %s AND cl.status = 'active'
                GROUP BY cl.id, cl.name, cl.location, ct.name, r.province, r.sub_region
                ORDER BY r.province, r.sub_region, cl.name
            """, (company_id,))
            
            clinics = cursor.fetchall()
            
            return {
                "success": True,
                "clinics": clinics
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))