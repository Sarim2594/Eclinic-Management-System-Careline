from fastapi import HTTPException, status
from typing import Dict, Any

def get_all_bulletins(db) -> Dict[str, Any]:
    """Retrieves all active bulletins with company names."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT b.id, b.title, b.message, b.created_at, b.company_id, c.name as company_name
            FROM bulletins b
            JOIN companies c ON b.company_id = c.id
            WHERE b.active = TRUE 
            ORDER BY b.created_at DESC
        """)
        
        bulletins = cursor.fetchall()
        
        return {
            "success": True,
            "count": len(bulletins),
            "bulletins": bulletins
        }

def get_bulletins_by_admin_id(db, admin_id: int) -> Dict[str, Any]:
    """Retrieves all active bulletins for a specific Admin's company."""
    with db.get_cursor() as cursor:
        # Get admin's company_id
        cursor.execute("SELECT company_id FROM admins WHERE id = %s", (admin_id,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # Delegate to the company-specific function, passing db
        return get_bulletins_by_company_id(db, admin['company_id'])

def get_bulletins_by_company_id(db, company_id: int) -> Dict[str, Any]:
    """Retrieves all active bulletins for a specific company ID."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT id, title, message, created_at 
            FROM bulletins 
            WHERE company_id = %s AND active = TRUE 
            ORDER BY created_at DESC
        """, (company_id,))
        
        bulletins = cursor.fetchall()
        
        return {
            "success": True,
            "count": len(bulletins),
            "bulletins": bulletins
        }