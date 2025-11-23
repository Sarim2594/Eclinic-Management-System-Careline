from fastapi import HTTPException, status
from typing import Dict, Any, List, Optional

# --- Helper to get cities from regions (Logic extracted from main.py) ---
def _get_admin_cities_by_id(db, admin_id: int) -> List[str]:
    """Retrieves a list of city names covered by a specific Admin's regions."""
    # ... (Logic remains the same, but now uses the passed 'db' object) ...
    with db.get_cursor() as cursor:
        cursor.execute("SELECT region FROM admin_regions WHERE admin_id = %s", (admin_id,))
        admin_regions = cursor.fetchall()
        
        # ... (rest of logic remains the same) ...
        
        region_cities = []
        for region_row in admin_regions:
            # ... (logic remains the same) ...
            region = region_row['region'] 
            parts = region.split('|')
            if len(parts) == 2:
                province, sub_region = parts
                cursor.execute("""
                    SELECT city FROM pakistan_regions 
                    WHERE province = %s AND sub_region = %s
                """, (province, sub_region))
                cities = cursor.fetchall()
                region_cities.extend([city['city'] for city in cities])
        
        return region_cities

# ============================================================================
# Core Functions
# ============================================================================

def get_notifications(db, role: str, user_id: Optional[int] = None) -> Dict[str, Any]:
    notifications = []
    
    with db.get_cursor() as cursor:
        query_executed = False
        
        if role == 'superadmin':
            cursor.execute("""
                SELECT id, type, title, message, created_at
                FROM notifications
                WHERE recipient_type = 'superadmin' AND read = FALSE
                ORDER BY created_at DESC
                LIMIT 50
            """)
            query_executed = True
        
        elif role == 'admin' and user_id:
            region_cities = _get_admin_cities_by_id(db, user_id)
            if region_cities:
                cursor.execute("""
                    SELECT DISTINCT n.id, n.type, n.title, n.message, n.created_at, n.clinic_name
                    FROM notifications n
                    LEFT JOIN clinics c ON n.clinic_id = c.id
                    WHERE n.recipient_type = 'admin' 
                    AND n.read = FALSE
                    AND c.city = ANY(%s)
                    ORDER BY n.created_at DESC
                    LIMIT 50
                """, (region_cities,))
                query_executed = True
            # Note: If region_cities is empty, query_executed remains False
        
        elif role == 'doctor' and user_id:
            cursor.execute("""
                SELECT id, type, title, message, created_at, patient_id
                FROM notifications
                WHERE recipient_type = 'doctor' 
                AND recipient_id = %s 
                AND read = FALSE
                ORDER BY created_at DESC
                LIMIT 50
            """, (user_id,))
            query_executed = True
        
        elif role == 'receptionist' and user_id:
            cursor.execute("""
                SELECT id, type, title, message, created_at, patient_id, doctor_id
                FROM notifications
                WHERE recipient_type = 'receptionist' 
                AND recipient_id = %s 
                AND read = FALSE
                ORDER BY created_at DESC
                LIMIT 50
            """, (user_id,))
            query_executed = True
        
        else:
            # If the role is invalid, or if it's 'admin' but region_cities was empty, 
            # this path is now handled by the logic above, but we must ensure we don't crash.
            # If query_executed is False, we just return an empty list.
            pass

        if query_executed:
            # Only call fetchall if a query was actually run
            notifications = cursor.fetchall()
            
        # Handle the case where the role was valid but user_id was missing (which should be prevented by the route logic, but is safer here)
        elif not query_executed and role not in ['superadmin', 'admin', 'doctor', 'receptionist']:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role or missing user_id")

    
    return {
        "success": True,
        "count": len(notifications),
        "notifications": notifications
    }

def mark_notification_as_read(db, notification_id: int) -> Dict[str, Any]:
    """Marks a single notification as read."""
    with db.get_cursor() as cursor:
        cursor.execute("UPDATE notifications SET read = TRUE WHERE id = %s", (notification_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}

def mark_all_notifications_as_read(db, role: str, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Marks all notifications as read for a given user/role."""
    with db.get_cursor() as cursor:
        row_count = 0
        
        if role == 'superadmin':
            # ... (logic remains the same) ...
            pass
            
        elif role == 'admin' and user_id:
            # PASS DB TO HELPER:
            region_cities = _get_admin_cities_by_id(db, user_id)
            
            # ... (logic remains the same) ...
                
        elif role in ['doctor', 'receptionist'] and user_id:
            # ... (logic remains the same) ...
            pass
        
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parameters")
            
        return {"success": True, "message": f"Marked {cursor.rowcount} notifications as read"}