from fastapi import HTTPException, status
from src.superadmin.models import AdminCreate, AdminRegionsUpdate
from typing import Dict, Any, List
import hashlib
import traceback
import json # Used for JSON loads in region update

# ============================================================================
# ADMIN MANAGEMENT SERVICES
# ============================================================================

def get_all_admins_with_details(db: int) -> Dict[str, Any]:
    """Get all admins across all companies"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    a.id,
                    a.name,
                    u.username,
                    u.email,
                    a.company_id,
                    c.name as company_name,
                    COUNT(ar.region_id) as region_count
                FROM admins a
                JOIN users u ON a.user_id = u.id
                JOIN companies c ON a.company_id = c.id
                LEFT JOIN admin_regions ar ON a.id = ar.admin_id
                GROUP BY a.id, a.name, u.username, u.email, a.company_id, c.name
                ORDER BY c.name, a.name
            """)
            
            admins = cursor.fetchall()
            
            return {
                "success": True,
                "admins": admins
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def get_admins_by_company(db, company_id: int) -> Dict[str, Any]:
    """Get all admins for a company with their assigned regions"""
    try:
        with db.get_cursor() as cursor:
            # Get admins - FIX: use u.username not a.username
            cursor.execute("""
                SELECT a.id, a.name, u.username, u.email,
                       COUNT(ar.region_id) as region_count
                FROM admins a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN admin_regions ar ON a.id = ar.admin_id
                WHERE a.company_id = %s
                GROUP BY a.id, a.name, u.username, u.email
                ORDER BY a.name
            """, (company_id,))
            
            admins = cursor.fetchall()
            
            # For each admin, get their regions with full details
            for admin in admins:
                cursor.execute("""
                    SELECT r.id, r.province, r.sub_region
                    FROM admin_regions ar
                    JOIN regions r ON ar.region_id = r.id
                    WHERE ar.admin_id = %s
                    ORDER BY r.province, r.sub_region
                """, (admin['id'],))
                
                regions = cursor.fetchall()
                admin['regions'] = regions
            
            return {
                "success": True,
                "admins": admins
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def create_new_admin(db, admin: AdminCreate) -> Dict[str, Any]:
    """Creates admin account with region_id assignments"""
    with db.get_cursor() as cursor:
        # 1. Verify company exists
        cursor.execute("SELECT id FROM companies WHERE id = %s", (admin.company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")
        
        # 2. Verify all region_ids exist
        if admin.assigned_region_ids:
            cursor.execute("""
                SELECT id FROM regions WHERE id = ANY(%s)
            """, (admin.assigned_region_ids,))
            
            found_regions = [r['id'] for r in cursor.fetchall()]
            if len(found_regions) != len(admin.assigned_region_ids):
                raise HTTPException(
                    status_code=400, 
                    detail="One or more region IDs are invalid"
                )
        
        # 3. Check username/email uniqueness
        cursor.execute("""
            SELECT id FROM users WHERE username = %s OR email = %s
        """, (admin.username, admin.email))
        if cursor.fetchone():
            raise HTTPException(
                status_code=400, 
                detail="Username or email already exists"
            )
        
        # 4. Create user account
        password_hash = hashlib.sha256(admin.password.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO users (username, email, password, role) 
            VALUES (%s, %s, %s, 'admin') 
            RETURNING id
        """, (admin.username, admin.email, password_hash))
        user_id = cursor.fetchone()['id']
        
        # 5. Create admin profile
        cursor.execute("""
            INSERT INTO admins (user_id, company_id, name, contact) 
            VALUES (%s, %s, %s, %s) 
            RETURNING id
        """, (user_id, admin.company_id, admin.name, admin.contact))
        admin_id = cursor.fetchone()['id']
        
        # 6. Insert region assignments using region_ids
        if admin.assigned_region_ids:
            region_data = [(admin_id, region_id) for region_id in admin.assigned_region_ids]
            cursor.executemany("""
                INSERT INTO admin_regions (admin_id, region_id) 
                VALUES (%s, %s)
            """, region_data)
        
        return {
            "success": True,
            "message": f"Admin '{admin.name}' created successfully",
            "admin_id": admin_id,
            "regions_assigned": len(admin.assigned_region_ids)
        }

def get_admin_assigned_regions(db, admin_id: int) -> Dict[str, Any]:
    """Get admin's assigned regions with full details"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT r.id, r.province, r.sub_region
                FROM admin_regions ar
                JOIN regions r ON ar.region_id = r.id
                WHERE ar.admin_id = %s
                ORDER BY r.province, r.sub_region
            """, (admin_id,))
            
            regions = cursor.fetchall()
            
            return {
                "success": True,
                "assigned_regions": regions
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def update_admin_assigned_regions(db, admin_id: int, update: AdminRegionsUpdate) -> Dict[str, Any]:
    """Update admin's assigned regions"""
    try:
        with db.get_cursor() as cursor:
            # Verify admin exists
            cursor.execute("SELECT id FROM admins WHERE id = %s", (admin_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Admin not found")
            
            # Verify all region_ids exist
            if update.assigned_region_ids:
                cursor.execute("""
                    SELECT id FROM regions WHERE id = ANY(%s)
                """, (update.assigned_region_ids,))
                
                found = [r['id'] for r in cursor.fetchall()]
                if len(found) != len(update.assigned_region_ids):
                    raise HTTPException(
                        status_code=400, 
                        detail="One or more region IDs are invalid"
                    )
            
            # Delete existing assignments
            cursor.execute("""
                DELETE FROM admin_regions WHERE admin_id = %s
            """, (admin_id,))
            
            # Insert new assignments
            if update.assigned_region_ids:
                region_data = [(admin_id, rid) for rid in update.assigned_region_ids]
                cursor.executemany("""
                    INSERT INTO admin_regions (admin_id, region_id) 
                    VALUES (%s, %s)
                """, region_data)
            
            return {
                "success": True,
                "message": "Admin regions updated successfully",
                "regions_assigned": len(update.assigned_region_ids)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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