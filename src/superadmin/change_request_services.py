from fastapi import HTTPException, status
from typing import Dict, Any
import hashlib
import json

# ============================================================================
# ADMIN CHANGE REQUEST SERVICES
# ============================================================================

def get_pending_change_requests(db) -> Dict[str, Any]:
    """Retrieves all pending Admin change requests with contextual details."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                acr.id, acr.admin_id, acr.request_type, acr.requested_data, acr.reason, acr.status, acr.created_at,
                a.name as admin_name, a.contact as admin_contact, u.email as admin_email,
                c.name as company_name
            FROM admin_change_requests acr
            JOIN admins a ON acr.admin_id = a.id
            JOIN users u ON a.user_id = u.id
            JOIN companies c ON a.company_id = c.id
            WHERE acr.status = 'pending'
            ORDER BY acr.created_at DESC
        """)
        requests = cursor.fetchall()
        
        return {"success": True, "requests": requests}

def approve_admin_change_request(db, request_id: int) -> Dict[str, Any]:
    """Approves a pending change request and applies the update."""
    with db.get_cursor() as cursor:
        # 1. Get request details
        cursor.execute("""
            SELECT admin_id, request_type, requested_data
            FROM admin_change_requests
            WHERE id = %s AND status = 'pending'
        """, (request_id,))
        
        change_request = cursor.fetchone()
        if not change_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already processed")
        
        admin_id = change_request['admin_id']
        request_type = change_request['request_type']
        requested_data = change_request['requested_data']
        
        # 2. Process based on request type
        if request_type == 'password_reset':
            new_password_hash = hashlib.sha256(requested_data.encode()).hexdigest()
            cursor.execute("UPDATE users SET password = %s WHERE id = (SELECT user_id FROM admins WHERE id = %s)", 
                           (new_password_hash, admin_id))
            
        elif request_type == 'contact_change':
            cursor.execute("UPDATE admins SET contact = %s WHERE id = %s", (requested_data, admin_id))
            
        elif request_type == 'regions_change':
            new_regions = json.loads(requested_data)
            cursor.execute("DELETE FROM admin_regions WHERE admin_id = %s", (admin_id,))
            if new_regions:
                region_data = [(admin_id, region) for region in new_regions]
                cursor.executemany("INSERT INTO admin_regions (admin_id, region) VALUES (%s, %s)", region_data)
        
        # 3. Mark request as approved
        cursor.execute("UPDATE admin_change_requests SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = %s", (request_id,))
        
        return {"success": True, "message": "Change request approved and applied successfully"}

def reject_admin_change_request(db, request_id: int, reason: str) -> Dict[str, Any]:
    """Rejects a pending change request."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            UPDATE admin_change_requests
            SET status = 'rejected', rejection_reason = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND status = 'pending'
            RETURNING id
        """, (reason, request_id))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found or already processed")
        
        return {"success": True, "message": "Change request rejected"}