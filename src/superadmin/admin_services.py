from fastapi import HTTPException, status
from src.superadmin.models import AdminCreate, AdminRegionsUpdate
from typing import Dict, Any, List
import hashlib
import json # Used for JSON loads in region update

# ============================================================================
# ADMIN MANAGEMENT SERVICES
# ============================================================================

def get_all_admins_with_details(db) -> Dict[str, Any]:
    """Retrieves all admins with their associated company and region count."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT 
                a.id, a.name, a.contact, a.created_at, u.username, u.email,
                c.id as company_id, c.name as company_name,
                COUNT(ar.id) as region_count
            FROM admins a
            JOIN users u ON a.user_id = u.id
            JOIN companies c ON a.company_id = c.id
            LEFT JOIN admin_regions ar ON a.id = ar.admin_id
            GROUP BY a.id, u.username, u.email, c.id, c.name
            ORDER BY a.created_at DESC
        """)
        admins = cursor.fetchall()
        
        return {"success": True, "admins": admins}

def create_new_admin(db, admin: AdminCreate) -> Dict[str, Any]:
    """Creates a new Admin account, user record, and assigns regions."""
    with db.get_cursor() as cursor:
        # 1. Check if company exists
        cursor.execute("SELECT id FROM companies WHERE id = %s", (admin.company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
        
        # 2. Check if username or email already exists
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (admin.username, admin.email))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")
        
        # 3. Create user account
        password_hash = hashlib.sha256(admin.password.encode()).hexdigest()
        cursor.execute("INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, 'admin') RETURNING id", 
                       (admin.username, admin.email, password_hash))
        user_id = cursor.fetchone()['id']
        
        # 4. Create admin profile
        cursor.execute("INSERT INTO admins (user_id, company_id, name, contact) VALUES (%s, %s, %s, %s) RETURNING id", 
                       (user_id, admin.company_id, admin.name, admin.contact))
        admin_id = cursor.fetchone()['id']
        
        # 5. Insert region assignments
        if admin.assigned_regions:
            region_data = [(admin_id, region) for region in admin.assigned_regions]
            cursor.executemany("INSERT INTO admin_regions (admin_id, region) VALUES (%s, %s)", region_data)
        
        return {
            "success": True,
            "message": f"Admin '{admin.name}' created successfully",
            "admin_id": admin_id,
            "regions_assigned": len(admin.assigned_regions)
        }

def get_admin_assigned_regions(db, admin_id: int) -> Dict[str, Any]:
    """Retrieves the region keys assigned to a specific admin."""
    with db.get_cursor() as cursor:
        cursor.execute("SELECT region FROM admin_regions WHERE admin_id = %s ORDER BY region", (admin_id,))
        regions = cursor.fetchall()
        
        return {"success": True, "assigned_regions": [r['region'] for r in regions]}

def update_admin_assigned_regions(db, admin_id: int, regions_update: AdminRegionsUpdate) -> Dict[str, Any]:
    """Overwrites the region assignments for an existing admin."""
    with db.get_cursor() as cursor:
        # 1. Check if admin exists
        cursor.execute("SELECT id FROM admins WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # 2. Delete existing regions
        cursor.execute("DELETE FROM admin_regions WHERE admin_id = %s", (admin_id,))
        
        # 3. Insert new regions
        if regions_update.assigned_regions:
            region_data = [(admin_id, region) for region in regions_update.assigned_regions]
            cursor.executemany("INSERT INTO admin_regions (admin_id, region) VALUES (%s, %s)", region_data)
        
        return {
            "success": True,
            "message": "Admin regions updated successfully",
            "regions_assigned": len(regions_update.assigned_regions)
        }

def update_admin_contact_number(db, admin_id: int, contact: str) -> Dict[str, Any]:
    """Updates the contact number for an admin profile."""
    if not contact:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact number is required")
    
    with db.get_cursor() as cursor:
        cursor.execute("UPDATE admins SET contact = %s WHERE id = %s RETURNING name", (contact, admin_id))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        return {"success": True, "message": f"Contact updated for {result['name']}"}

def delete_admin_account(db, admin_id: int) -> Dict[str, Any]:
    """Deletes an admin account and cascades to associated records."""
    with db.get_cursor() as cursor:
        # Get user_id before deleting admin
        cursor.execute("SELECT user_id, name FROM admins WHERE id = %s", (admin_id,))
        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        
        # Delete user (should cascade delete admin and admin_regions)
        cursor.execute("DELETE FROM users WHERE id = %s", (admin['user_id'],))
        
        return {"success": True, "message": f"Admin '{admin['name']}' deleted successfully"}