import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import traceback
import os
from dotenv import load_dotenv

# --- CORE IMPORTS (Your DB connection is here) ---
from database import Database

# --- IMPORTS FOR NEW MODULAR ROUTERS (All required files) ---
from src.auth.routes import router as auth_router
from src.notifications.routes import router as notification_router
from src.bulletins.routes import router as bulletin_router 
from src.core.clinic_routes import router as clinic_router
from src.core.region_routes import router as region_router

from src.admin.routes import router as admin_router        
from src.doctor.routes import router as doctor_router
from src.receptionist.routes import router as reception_router
from src.superadmin.routes import router as superadmin_router

load_dotenv()

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

db = Database()

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
    description="E-Clinic Management System",
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

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/templates", StaticFiles(directory="templates"), name="templates")

# Store the database object in app state so it can be accessed by request handlers
app.state.db = db

# Include ALL Modular Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])

# Routers moved from the old main.py file
app.include_router(notification_router, prefix="/api", tags=["Notifications"])
app.include_router(bulletin_router, prefix="/api", tags=["Bulletins"])
app.include_router(clinic_router, prefix="/api", tags=["Clinics"])

# The Core Region Utilities (moved from SuperAdmin)
app.include_router(region_router, prefix="/api", tags=["Regions"]) 

# Original Role Routers (Ensure they now point to the files in src/)
app.include_router(reception_router, prefix="/api/receptionist", tags=["Receptionist"])
app.include_router(doctor_router, prefix="/api/doctor", tags=["Doctor"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(superadmin_router, prefix="/api/superadmin", tags=["SuperAdmin"])


# ============================================================================
# BROWSER REQUESTS (Unchanged)
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
# FRONTEND HTML (Unchanged)
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def get_frontend():
    """Serve the frontend HTML"""
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>Frontend not found. Please ensure templates/index.html exists.</h1>", 
            status_code=404
        )

# ============================================================================
# RUN APPLICATION (Unchanged)
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