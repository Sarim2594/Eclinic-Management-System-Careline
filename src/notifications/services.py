from fastapi import HTTPException, status
from typing import Dict, Any, List, Optional
import traceback

def _get_admin_cities_by_id(db, admin_id: int) -> List[str]:
    """Retrieves a list of city names covered by a specific Admin's regions."""
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

def get_notifications(db, role: str, user_id: Optional[int] = None):
    """Get notifications with efficient region-based filtering"""
    try:
        with db.get_cursor() as cursor:
            if role == 'superadmin':
                cursor.execute("""
                    SELECT id, type, title, message, created_at
                    FROM notifications
                    WHERE recipient_type = 'superadmin' AND read = FALSE
                    ORDER BY created_at DESC
                    LIMIT 50
                """)
            
            elif role == 'admin' and user_id:
                # Include notifications targeted by region (admin_regions) OR directly addressed to this admin via recipient_id
                # Debug: log admin notification fetch
                print(f"[notifications] fetching for admin_id={user_id}")
                cursor.execute("""
                    SELECT DISTINCT n.id, n.type, n.title, n.message, n.created_at, n.clinic_name
                    FROM notifications n
                    LEFT JOIN clinics cl ON n.clinic_id = cl.id
                    LEFT JOIN cities ct ON cl.city_id = ct.id
                    LEFT JOIN regions r ON ct.region_id = r.id
                    LEFT JOIN admin_regions ar ON r.id = ar.region_id
                    WHERE n.recipient_type = 'admin'
                      AND n.read = FALSE
                      AND (ar.admin_id = %s OR n.recipient_id = %s)
                    ORDER BY n.created_at DESC
                    LIMIT 50
                """, (user_id, user_id))
                rows = cursor.fetchall()
                print(f"[notifications] fetched {len(rows)} rows for admin_id={user_id}")
                # return early using fetched rows
                return {
                    "success": True,
                    "count": len(rows),
                    "notifications": rows
                }
            
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
            else:
                raise HTTPException(status_code=400, detail="Invalid role or missing user_id")
            
            notifications = cursor.fetchall()
            
            return {
                "success": True,
                "count": len(notifications),
                "notifications": notifications
            }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
            cursor.execute("UPDATE notifications SET read = TRUE WHERE recipient_type = 'superadmin' AND read = FALSE")

        elif role == 'admin' and user_id:
            # Mark notifications directly addressed to this admin
            cursor.execute("UPDATE notifications SET read = TRUE WHERE recipient_type = 'admin' AND recipient_id = %s AND read = FALSE", (user_id,))

            # Also mark region-based notifications for this admin (by clinic -> city -> region -> admin_regions)
            cursor.execute("""
                UPDATE notifications
                SET read = TRUE
                WHERE recipient_type = 'admin' AND read = FALSE
                  AND clinic_id IN (
                      SELECT cl.id FROM clinics cl
                      JOIN cities ct ON cl.city_id = ct.id
                      JOIN regions r ON ct.region_id = r.id
                      JOIN admin_regions ar ON r.id = ar.region_id
                      WHERE ar.admin_id = %s
                  )
            """, (user_id,))

        elif role in ['doctor', 'receptionist'] and user_id:
            cursor.execute("UPDATE notifications SET read = TRUE WHERE recipient_type = %s AND recipient_id = %s AND read = FALSE", (role, user_id))

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parameters")

        return {"success": True, "message": f"Marked {cursor.rowcount} notifications as read"}