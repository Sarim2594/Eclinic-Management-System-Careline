from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# Core Functions
# ============================================================================

def submit_password_change_request(db, request) -> Dict[str, Any]:
    """Submits a password change request as a notification to SuperAdmin."""
    try:
        with db.get_cursor() as cursor:
            # Verify admin exists and get their company
            cursor.execute("""
                SELECT a.id, a.name, u.email, a.company_id, c.name as company_name
                FROM admins a
                JOIN users u ON a.user_id = u.id
                JOIN companies c ON a.company_id = c.id
                WHERE a.id = %s
            """, (request.admin_id,))
            
            admin = cursor.fetchone()
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            # Hash the new password for storage in request
            import hashlib
            password_hash = hashlib.sha256(request.new_password.encode()).hexdigest()
            # Prevent duplicate pending requests (idempotency)
            cursor.execute("""
                SELECT id FROM admin_change_requests
                WHERE admin_id = %s AND request_type = 'password_reset' AND status = 'pending'
                LIMIT 1
            """, (request.admin_id,))
            existing = cursor.fetchone()
            if existing:
                return {
                    "success": True,
                    "message": "A pending password change request already exists"
                }

            # Store the change request
            cursor.execute("""
                INSERT INTO admin_change_requests 
                (admin_id, request_type, requested_data, reason, status)
                VALUES (%s, 'password_reset', %s, %s, 'pending')
            """, (request.admin_id, password_hash, request.reason))
            
            # Create notification for superadmin
            cursor.execute("""
                INSERT INTO notifications 
                (type, recipient_type, title, message, created_at)
                VALUES 
                ('password_change_request', 'superadmin', %s, %s, CURRENT_TIMESTAMP)
            """, (
                f"Password Change Request - {admin['name']}",
                f"Admin {admin['name']} ({admin['email']}) from {admin['company_name']} has requested a password change. Reason: {request.reason}"
            ))
            
            return {
                "success": True,
                "message": "Password change request submitted to SuperAdmin"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def submit_contact_change_request(db, request) -> Dict[str, Any]:
    """Submit a contact change request to SuperAdmin"""
    try:
        with db.get_cursor() as cursor:
            # Verify admin exists and get their company
            cursor.execute("""
                SELECT a.id, a.name, u.email, a.contact as current_contact, 
                       a.company_id, c.name as company_name
                FROM admins a
                JOIN users u ON a.user_id = u.id
                JOIN companies c ON a.company_id = c.id
                WHERE a.id = %s
            """, (request.admin_id,))
            
            admin = cursor.fetchone()
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            # Store the change request
            # Prevent duplicate pending contact-change requests
            cursor.execute("""
                SELECT id FROM admin_change_requests
                WHERE admin_id = %s AND request_type = 'contact_change' AND status = 'pending'
                LIMIT 1
            """, (request.admin_id,))
            existing = cursor.fetchone()
            if existing:
                return {
                    "success": True,
                    "message": "A pending contact change request already exists"
                }

            cursor.execute("""
                INSERT INTO admin_change_requests 
                (admin_id, request_type, requested_data, reason, status)
                VALUES (%s, 'contact_change', %s, %s, 'pending')
            """, (request.admin_id, request.new_contact, request.reason))
            
            # Create notification for superadmin
            cursor.execute("""
                INSERT INTO notifications 
                (type, recipient_type, title, message, created_at)
                VALUES 
                ('contact_change_request', 'superadmin', %s, %s, CURRENT_TIMESTAMP)
            """, (
                f"Contact Change Request - {admin['name']}",
                f"Admin {admin['name']} ({admin['email']}) from {admin['company_name']} has requested to change contact from {admin['current_contact']} to {request.new_contact}. Reason: {request.reason}"
            ))
            
            return {
                "success": True,
                "message": "Contact change request submitted to SuperAdmin"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def submit_general_query(db, request) -> Dict[str, Any]:
    """Submit a general query/message to SuperAdmin"""
    try:
        with db.get_cursor() as cursor:
            # Verify admin exists and get their company
            cursor.execute("""
                SELECT a.id, a.name, u.email, a.company_id, c.name as company_name
                FROM admins a
                JOIN users u ON a.user_id = u.id
                JOIN companies c ON a.company_id = c.id
                WHERE a.id = %s
            """, (request.admin_id,))
            
            admin = cursor.fetchone()
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            
            # Store the query as a general_query request and save the text in `reason`
            cursor.execute("""
                INSERT INTO admin_change_requests 
                (admin_id, request_type, requested_data, reason, status)
                VALUES (%s, 'general_query', %s, %s, 'pending')
            """, (request.admin_id, request.query, request.query))
            
            # Create notification for superadmin
            cursor.execute("""
                INSERT INTO notifications 
                (type, recipient_type, title, message, created_at)
                VALUES 
                ('general_query_request', 'superadmin', %s, %s, CURRENT_TIMESTAMP)
            """, (
                f"General Query - {admin['name']}",
                f"Admin {admin['name']} ({admin['email']}) from {admin['company_name']} has submitted a query: {request.query}"
            ))
            
            return {
                "success": True,
                "message": "Query submitted to SuperAdmin"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    