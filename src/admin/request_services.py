from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# Core Functions
# ============================================================================

def submit_password_change_request(db, admin_id: int, new_password: str, reason: str) -> Dict[str, Any]:
    """Submits a password change request as a notification to SuperAdmin."""
    with db.get_cursor() as cursor:
        # Verify admin exists and get their company
        cursor.execute("""
            SELECT a.id, a.name, u.email, a.company_id, c.name as company_name
            FROM admins a
            JOIN users u ON a.user_id = u.id
            JOIN companies c ON a.company_id = c.id
            WHERE a.id = %s
        """, (admin_id,))
        
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # Create notification for superadmin
        cursor.execute("""
            INSERT INTO notifications 
            (recipient_type, type, title, message, created_at)
            VALUES 
            ('superadmin', 'password_change_request', %s, %s, CURRENT_TIMESTAMP)
        """, (
            f"Password Change Request - {admin['name']}",
            f"Admin {admin['name']} ({admin['email']}) from {admin['company_name']} has requested a password change. Reason: {reason}"
        ))
        
        return {"success": True, "message": "Password change request submitted to SuperAdmin"}

def submit_contact_change_request(db, admin_id: int, new_contact: str, reason: str) -> Dict[str, Any]:
    """Submits a contact change request as a notification to SuperAdmin."""
    with db.get_cursor() as cursor:
        # Verify admin exists and get their company
        cursor.execute("""
            SELECT a.id, a.name, u.email, a.contact as current_contact, 
                   a.company_id, c.name as company_name
            FROM admins a
            JOIN users u ON a.user_id = u.id
            JOIN companies c ON a.company_id = c.id
            WHERE a.id = %s
        """, (admin_id,))
        
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # Create notification for superadmin
        cursor.execute("""
            INSERT INTO notifications 
            (recipient_type, type, title, message, created_at)
            VALUES 
            ('superadmin', 'contact_change_request', %s, %s, CURRENT_TIMESTAMP)
        """, (
            f"Contact Change Request - {admin['name']}",
            f"Admin {admin['name']} ({admin['email']}) from {admin['company_name']} has requested to change contact from {admin['current_contact']} to {new_contact}. Reason: {reason}"
        ))
        
        return {"success": True, "message": "Contact change request submitted to SuperAdmin"}