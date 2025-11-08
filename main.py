import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.requests import Request
from contextlib import asynccontextmanager
from pydantic import BaseModel
import hashlib
import traceback
import os
from dotenv import load_dotenv

# Import database and routers
from database import Database
from reception import router as reception_router
from doctor import router as doctor_router
from admin import router as admin_router

load_dotenv()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    try:
        db.initialize_test_data()
    except Exception as e:
        print(f"Error during test data initialization: {e}")
        traceback.print_exc()
    
    yield
    
    # Cleanup
    db.close()

app = FastAPI(
    title="CareLine",
    description="E-Clinic Management System (3NF with PostgreSQL)",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()
app.state.db = db

# Include routers
app.include_router(reception_router, prefix="/api/receptionist", tags=["Receptionist"])
app.include_router(doctor_router, prefix="/api/doctor", tags=["Doctor"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# ============================================================================
# BROWSER REQUESTS
# ============================================================================

@app.get("/favicon.ico")
async def favicon():
    return Response(content=b"", media_type="image/x-icon")

@app.get("/.well-known/{path:path}")
async def well_known(path: str):
    return Response(status_code=204)

@app.get("/sourceMap/{path:path}")
async def source_map(path: str):
    return Response(status_code=204)

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.post("/api/auth/login")
def login_helper(credentials: LoginRequest, response: Response):
    """Authenticate user with username/email and password and set secure cookie"""
    try:
        password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT id, username, email, role 
                FROM users 
                WHERE (username = %s OR email = %s) AND password = %s
            """, (credentials.username_or_email, credentials.username_or_email, password_hash))
            
            user = cursor.fetchone()
            
            if not user:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # Determine the user's home URL for the redirect
            role = user['role']
            redirect_url = f"/{role}"   
            
            user_cookie_data = f"id={credentials.username_or_email.split("@")[0]}&role={role}"
            response.set_cookie(
                key="session", 
                value=user_cookie_data,
                secure=True, 
                path="/",
                httponly=True, 
                samesite="lax", 
                max_age=3600 # 1 hour
            )
            
            response_data = {
                "success": True,
                "role": user['role'],
                "user_id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "redirect_url": redirect_url
            }
            
            user_id = user['id']

            if user['role'] == 'doctor':
                cursor.execute("""
                    SELECT id, clinic_id, name 
                    FROM doctors 
                    WHERE user_id = %s
                """, (user_id,))
                
                doctor = cursor.fetchone()
                if doctor:
                    response_data['doctor_id'] = doctor['id']
                    response_data['clinic_id'] = doctor['clinic_id']
                    response_data['name'] = doctor['name']
                else:
                    raise HTTPException(status_code=404, detail="Doctor profile not found")
                
                # Set doctor status to active on login
                cursor.execute("""
                    UPDATE availability_schedules
                    SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE doctor_id = %s
                """, (doctor['id'],))
            
            elif user['role'] == 'receptionist':
                cursor.execute("""
                    SELECT id, clinic_id, name 
                    FROM receptionists 
                    WHERE user_id = %s
                """, (user_id,))
                
                receptionist = cursor.fetchone()
                if receptionist:
                    response_data['receptionist_id'] = receptionist['id']
                    response_data['clinic_id'] = receptionist['clinic_id']
                    response_data['name'] = receptionist['name']
                else:
                    raise HTTPException(status_code=404, detail="Receptionist profile not found")
                    
            elif user['role'] == 'admin':
                cursor.execute("""
                    SELECT id, name 
                    FROM admins 
                    WHERE user_id = %s
                """, (user_id,))
                
                admin = cursor.fetchone()
                if admin:
                    response_data['admin_id'] = admin['id']
                    response_data['name'] = admin['name']
                else:
                    raise HTTPException(status_code=404, detail="Admin profile not found")
            
            return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/api/bulletins")
async def get_bulletins():
    """Get all active bulletins"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT id, title, message, created_at 
                FROM bulletins 
                WHERE active = TRUE 
                ORDER BY created_at DESC
            """)
            
            bulletins = cursor.fetchall()
            
            return {
                "success": True,
                "count": len(bulletins),
                "bulletins": bulletins
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clinics")
async def get_clinics():
    """Get all clinics"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id,
                    c.name,
                    c.location,
                    c.status,
                    COUNT(d.id) FILTER (WHERE d.status = 'active') as total_doctors
                FROM clinics c
                LEFT JOIN doctors d ON c.id = d.clinic_id
                WHERE c.status = 'active'
                GROUP BY c.id, c.name, c.location, c.status
                ORDER BY c.name
            """)
            
            clinics = cursor.fetchall()
            
            return {
                "success": True,
                "clinics": clinics
            }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notifications/{role}/{user_id}")
async def get_user_notifications(role: str, user_id: Optional[int] = None):
    """Get notifications for specific user role"""
    try:
        with db.get_cursor() as cursor:
            if role == 'admin':
                # Get unread admin notifications (any admin can see)
                cursor.execute("""
                    SELECT id, type, title, message, created_at, clinic_name
                    FROM notifications
                    WHERE recipient_type = 'admin' AND read = FALSE
                    ORDER BY created_at DESC
                    LIMIT 50
                """)
            elif role == 'doctor' and user_id:
                # Get notifications for specific doctor
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
                # Get notifications for specific receptionist
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

@app.put("/api/notifications/mark-read/{notification_id}")
async def mark_notification_read(notification_id: int):
    """Mark a notification as read"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                UPDATE notifications 
                SET read = TRUE 
                WHERE id = %s
            """, (notification_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found")
            
            return {
                "success": True,
                "message": "Notification marked as read"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/notifications/mark-all-read/{role}/{user_id}")
async def mark_all_notifications_read(role: str, user_id: Optional[int] = None):
    """Mark all notifications as read for a user"""
    try:
        with db.get_cursor() as cursor:
            if role == 'admin':
                cursor.execute("""
                    UPDATE notifications 
                    SET read = TRUE 
                    WHERE recipient_type = 'admin' AND read = FALSE
                """)
            elif role in ['doctor', 'receptionist'] and user_id:
                cursor.execute("""
                    UPDATE notifications 
                    SET read = TRUE 
                    WHERE recipient_type = %s 
                    AND recipient_id = %s 
                    AND read = FALSE
                """, (role, user_id))
            else:
                raise HTTPException(status_code=400, detail="Invalid parameters")
            
            return {
                "success": True,
                "message": f"Marked {cursor.rowcount} notifications as read"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# FRONTEND HTML
# ============================================================================

def serve_html(file_name: str):
    """Helper function to serve an HTML file"""
    try:
        with open(f"templates/{file_name}", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content=f"<h1>Frontend not found: {file_name}</h1>", 
            status_code=404
        )

@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
async def get_login_page():
    # We will let login.js handle redirecting if already logged in
    return serve_html("login.html")


@app.get("/admin", response_class=HTMLResponse)
async def get_admin_page():
    return serve_html("admin.html")

@app.get("/doctor", response_class=HTMLResponse)
async def get_doctor_page():
    return serve_html("doctor.html")

@app.get("/receptionist", response_class=HTMLResponse)
async def get_receptionist_page():
    return serve_html("receptionist.html")

# ============================================================================
# FRONTEND JAVASCRIPT
# ============================================================================

def serve_js(file_name: str):
    """Helper function to serve a JS file"""
    try:
        return FileResponse(f"static/{file_name}", media_type="application/javascript")
    except FileNotFoundError:
        return Response(
            content=f"// JS file not found: {file_name}", 
            media_type="application/javascript", 
            status_code=404
        )

@app.get("/static/login.js")
async def get_login_js():
    return serve_js("login.js")

@app.get("/static/shared.js")
async def get_shared_js():
    return serve_js("shared.js")

@app.get("/static/admin.js")
async def get_admin_js():
    return serve_js("admin.js")

@app.get("/static/doctor.js")
async def get_doctor_js():
    return serve_js("doctor.js")

@app.get("/static/receptionist.js")
async def get_receptionist_js():
    return serve_js("receptionist.js")


# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n🌐 Website: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("\n" + "="*60 + "\n")
    
    uvicorn.run(
        app, 
        host=os.getenv('APP_HOST'), 
        port=int(os.getenv('APP_PORT'))
    )