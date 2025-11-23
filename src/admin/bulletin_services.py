from fastapi import HTTPException, status
from src.admin.models import BulletinPost
from typing import Dict, Any

# ============================================================================
# BULLETIN MANAGEMENT SERVICES
# ============================================================================

def post_new_bulletin(db, bulletin: BulletinPost) -> Dict[str, Any]:
    """Posts a new company-specific bulletin."""
    with db.get_cursor() as cursor:
        # 1. Get admin's company_id
        cursor.execute("SELECT company_id FROM admins WHERE id = %s", (bulletin.admin_id,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # 2. Insert bulletin
        cursor.execute("""
            INSERT INTO bulletins (company_id, title, message, active)
            VALUES (%s, %s, %s, TRUE)
            RETURNING id
        """, (admin['company_id'], bulletin.title, bulletin.message))
        
        bulletin_id = cursor.fetchone()['id']
        
        return {
            "success": True,
            "message": "Bulletin posted successfully",
            "bulletin_id": bulletin_id
        }

def deactivate_bulletin(db, bulletin_id: int, admin_id: int) -> Dict[str, Any]:
    """Deletes/deactivates a bulletin if it belongs to the Admin's company."""
    with db.get_cursor() as cursor:
        # 1. Get admin's company_id
        cursor.execute("SELECT company_id FROM admins WHERE id = %s", (admin_id,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # 2. Deactivate bulletin only if it belongs to admin's company
        cursor.execute("""
            UPDATE bulletins 
            SET active = FALSE 
            WHERE id = %s AND company_id = %s
            RETURNING id
        """, (bulletin_id, admin['company_id']))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Bulletin not found or doesn't belong to your company"
            )
        
        return {"success": True, "message": "Bulletin deleted successfully"}