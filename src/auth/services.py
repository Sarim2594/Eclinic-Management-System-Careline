import hashlib
from fastapi import HTTPException
from typing import Optional, Dict, Any, List # Added imports for better type hints

# ============================================================================
# Core Authentication Functions
# ============================================================================

def hash_password(password: str) -> str:
    """Hashes the plain password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_and_profile_data(db, username_or_email: str, password_hash: str) -> Dict[str, Any]:
    """
    Authenticates the user and retrieves their full profile details based on role.
    
    This function was extracted directly from the login_helper in the old main.py.
    """
    with db.get_cursor() as cursor:
        # 1. AUTHENTICATE BASE USER
        cursor.execute("""
            SELECT id, username, email, role 
            FROM users 
            WHERE (username = %s OR email = %s) AND password = %s
        """, (username_or_email, username_or_email, password_hash))
        
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")        
        
        response_data = {
            "success": True,
            "role": user['role'],
            "user_id": user['id'],
            "username": user['username'],
            "email": user['email'],
        }
        
        user_id = user['id']
        role = user['role']

        # 2. FETCH ROLE-SPECIFIC PROFILE DATA
        
        if role == 'superadmin':
            cursor.execute("SELECT id, name FROM superadmins WHERE user_id = %s", (user_id,))
            profile = cursor.fetchone()
            if profile:
                response_data['superadmin_id'] = profile['id']
                response_data['name'] = profile['name']
            else:
                raise HTTPException(status_code=404, detail="SuperAdmin profile not found")

        elif role == 'doctor':
            cursor.execute("SELECT id, clinic_id, name FROM doctors WHERE user_id = %s", (user_id,))
            profile = cursor.fetchone()
            if profile:
                response_data['doctor_id'] = profile['id']
                response_data['clinic_id'] = profile['clinic_id']
                response_data['name'] = profile['name']
                
                # Set doctor status to active on login (Business Logic)
                cursor.execute("""
                    UPDATE availability_schedules
                    SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE doctor_id = %s 
                    AND day_of_week %% 7 = EXTRACT(DOW FROM CURRENT_DATE)
                    AND (
                        (start_time <= end_time AND CURRENT_TIME BETWEEN start_time AND end_time)
                        OR
                        (start_time > end_time AND (CURRENT_TIME >= start_time OR CURRENT_TIME <= end_time))
                    );
                    """, (profile['id'],))
            else:
                raise HTTPException(status_code=404, detail="Doctor profile not found")
                
        elif user['role'] == 'receptionist':
            cursor.execute("""
                SELECT id, clinic_id, name 
                FROM receptionists 
                WHERE user_id = %s
            """, (user_id,))
            
            profile = cursor.fetchone()
            if profile:
                response_data['receptionist_id'] = profile['id']
                response_data['clinic_id'] = profile['clinic_id']
                response_data['name'] = profile['name']
            else:
                raise HTTPException(status_code=404, detail="Receptionist profile not found")
                
        elif user['role'] == 'admin':
            cursor.execute("""
                SELECT a.id, a.name, a.company_id, c.name as company_name
                FROM admins a
                JOIN companies c ON a.company_id = c.id
                WHERE a.user_id = %s
            """, (user_id,))
            
            profile = cursor.fetchone()
            if profile:
                response_data['admin_id'] = profile['id']
                response_data['name'] = profile['name']
                response_data['company_id'] = profile['company_id']
                response_data['company_name'] = profile['company_name']
            else:
                raise HTTPException(status_code=404, detail="Admin profile not found")
        
        # 3. RETURN FULL RESPONSE
        return response_data