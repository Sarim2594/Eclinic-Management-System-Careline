import datetime
import random
import io
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from fastapi import APIRouter, UploadFile, Form
from pydantic import BaseModel, field_validator

import os
import smtplib
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    _HAS_PDF = True
except Exception:
    _HAS_PDF = False

router = APIRouter()

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# ============================================================================
# PYDANTIC MODELS WITH VALIDATION
# ============================================================================

class PatientCreate(BaseModel):
    mr: int
    name: str
    age: int
    gender: str
    father_name: str
    marital_status: str
    contact: str
    email: str
    address: str
    cnic: str
    occupation: Optional[str]
    nationality: str
    clinic_id: int

class VitalsModel(BaseModel):
    blood_pressure: str
    heart_rate: float
    temperature: float
    blood_oxygen: float
    weight: float
    height: float
    bmi: float

class DiagnosisDataModel(BaseModel):
    appointment_id: int
    patient_id: int
    patient_mr: str
    patient_name: str
    age: int
    gender: str
    contact: str
    father_name: str
    marital_status: str
    cnic: str
    address: str
    occupation: Optional[str] = "-"
    nationality: str
    doctor_name: str
    diagnosed_date: str
    vitals: VitalsModel
    diagnosis: str
    prescription: str
    notes: Optional[str] = "-"
    clinic_name: str

class EmailRequest(BaseModel):
    email: str
    patient_name: str
    html: str
    
# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def is_doctor_available(doctor_id: int, db) -> bool:
    """Check if doctor is available based on current day and time"""
    now = datetime.datetime.now()
    current_day = now.isoweekday()  # Monday=1, Sunday=7
    current_time = now.time()
    
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT start_time, end_time 
            FROM availability_schedules 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = TRUE
        """, (doctor_id, current_day))
        
        schedule = cursor.fetchone()
        
        if not schedule:
            return False
        
        start_time = schedule['start_time']
        end_time = schedule['end_time']
        
        if start_time <= end_time:
            return start_time <= current_time <= end_time
        else:
            # Overnight shift
            return current_time >= start_time or current_time <= end_time

# ============================================================================
# RECEPTIONIST ENDPOINTS
# ============================================================================

@router.post('/register-patient')
async def register_patient(patient: PatientCreate, request: Request):
    """Register a new patient and auto-assign doctor"""
    try:
        db = request.app.state.db

        with db.get_cursor() as cursor:
            # Validate clinic exists
            cursor.execute("SELECT id, name FROM clinics WHERE id = %s", (patient.clinic_id,))
            clinic = cursor.fetchone()
            
            if not clinic:
                raise HTTPException(status_code=404, detail='Clinic not found')

            # Get active doctors at this clinic
            cursor.execute("""
                SELECT id, name FROM doctors 
                WHERE clinic_id = %s AND status = 'active'
            """, (patient.clinic_id,))
            
            doctors = cursor.fetchall()
            
            if not doctors:
                # Notify admin
                cursor.execute("""
                    INSERT INTO notifications (
                        recipient_type,
                        recipient_id,
                        type, 
                        clinic_id, 
                        clinic_name, 
                        title,
                        message
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    'admin',
                    None,  # NULL for admin - any admin can see
                    'no_doctors_available',
                    patient.clinic_id,
                    clinic['name'],
                    'No Doctors Available',
                    f'No doctors available at {clinic["name"]}. Patient {patient.name} could not be registered.'
                ))
                
                return {
                    'success': False,
                    'detail': "No doctors available at the selected clinic. Please try again after a few minutes."
                }

            # Check which doctors are currently available
            available_doctors = []
            for doctor in doctors:
                if is_doctor_available(doctor['id'], db):
                    available_doctors.append(doctor)
            
            if not available_doctors:
                # Notify admin
                cursor.execute("""
                    INSERT INTO notifications (
                        recipient_type,
                        recipient_id,
                        type, 
                        clinic_id, 
                        clinic_name, 
                        title,
                        message
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    'admin',
                    None,  # NULL for admin - any admin can see
                    'no_doctors_available',
                    patient.clinic_id,
                    clinic['name'],
                    'No Doctors Currently Available',
                    f'No doctors currently available at {clinic["name"]} during operating hours. Patient {patient.name} attempted registration.'
                ))
                
                return {
                    'success': False,
                    'detail': "No doctors are currently available at the selected clinic. Please try again after a few minutes."
                }

            # Generate ticket number (today's count + 1)
            today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            cursor.execute("""
                SELECT COUNT(*) as count FROM appointments 
                WHERE clinic_id = %s AND created_at >= %s
            """, (patient.clinic_id, today_start))
            
            ticket_count = cursor.fetchone()['count']
            ticket_no = ticket_count + 1

            # Assign doctor with least waiting patients
            doctor_loads = []
            for doctor in available_doctors:
                cursor.execute("""
                    SELECT COUNT(*) as count FROM appointments 
                    WHERE doctor_id = %s AND status = 'waiting'
                """, (doctor['id'],))
                
                waiting_count = cursor.fetchone()['count']
                doctor_loads.append({
                    'doctor_id': doctor['id'],
                    'doctor_name': doctor['name'],
                    'waiting_count': waiting_count
                })

            min_load = min(dl['waiting_count'] for dl in doctor_loads)
            candidates = [dl for dl in doctor_loads if dl['waiting_count'] == min_load]
            selected = random.choice(candidates)

            # Check if patient already exists
            cursor.execute("SELECT id FROM patients WHERE id = %s", (patient.mr,))
            existing_patient = cursor.fetchone()
            
            if existing_patient:
                # Create appointment for existing patient
                cursor.execute("""
                    INSERT INTO appointments 
                    (patient_id, doctor_id, clinic_id, ticket_no, status)
                    VALUES (%s, %s, %s, %s, 'waiting')
                    RETURNING id
                """, (existing_patient['id'], selected['doctor_id'], patient.clinic_id, ticket_no))
                
                cursor.execute("""
                    INSERT INTO notifications (
                        recipient_type,
                        recipient_id,
                        patient_id,
                        type,
                        title,
                        message
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    'doctor',
                    selected['doctor_id'],
                    existing_patient['id'],
                    'new_patient',
                    'New Patient Assigned',
                    f'New patient {patient.name} (Ticket #{ticket_no}) has been assigned to you.'
                ))
                
                return {
                    'success': True,
                    'patient_id': existing_patient['id'],
                    'ticket_no': ticket_no,
                    'doctor_name': selected['doctor_name'],
                    'clinic_name': clinic['name'],
                    'queue_position': selected['waiting_count'] + 1,
                    'message': 'Patient already registered. Appointment created successfully',
                }

            # Create new patient
            cursor.execute("""
                INSERT INTO patients (id, name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (patient.mr, patient.name, patient.age, patient.gender, patient.father_name, patient.marital_status, patient.contact, patient.email, patient.address, patient.cnic, patient.occupation, patient.nationality))

            # Create appointment
            cursor.execute("""
                INSERT INTO appointments 
                (patient_id, doctor_id, clinic_id, ticket_no, status)
                VALUES (%s, %s, %s, %s, 'waiting')
                RETURNING id
            """, (patient.mr, selected['doctor_id'], patient.clinic_id, ticket_no))

            cursor.execute("""
                INSERT INTO notifications (
                    recipient_type,
                    recipient_id,
                    patient_id,
                    type,
                    title,
                    message
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                'doctor',
                selected['doctor_id'],
                patient.mr,
                'new_patient',
                'New Patient Assigned',
                f'New patient {patient.name} (Ticket #{ticket_no}) has been assigned to you.'
            ))

            return {
                'success': True,
                'patient_id': patient.mr,
                'ticket_no': ticket_no,
                'doctor_name': selected['doctor_name'],
                'clinic_name': clinic['name'],
                'queue_position': selected['waiting_count'] + 1,
                'message': 'Patient registered and doctor assigned successfully',
            }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get('/get-diagnoses')
async def get_diagnoses(request: Request):
    """Fetch list of diagnoses"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            cursor.execute("""
                           SELECT a.id as appointment_id, a.patient_id as patient_mr, p.name as patient_name, p.age, p.gender, p.father_name, p.contact, p.marital_status, p.email, p.address, p.cnic, p.occupation, p.nationality, d.name as doctor_name, a.vitals, a.diagnosis, a.prescription, a.notes, a.updated_at as diagnosed_date
                           FROM appointments a
                           JOIN patients p ON a.patient_id = p.id
                           JOIN doctors d ON a.doctor_id = d.id
                           WHERE a.status = 'completed'
                           """)
            diagnoses = cursor.fetchall()
            return { "success": True, "diagnoses": diagnoses }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

class EmailRequest(BaseModel):
    email: str
    patient_name: str
    html: str


@router.post("/email-diagnosis")
async def email_diagnosis_html(request: EmailRequest):
    try:
        message = MIMEMultipart("alternative")
        message["From"] = EMAIL_USER
        message["To"] = request.email
        message["Subject"] = f"Diagnosis Report - {request.patient_name}"

        # HTML replaces entire email body
        html_part = MIMEText(request.html, "html")
        message.attach(html_part)

        # Send
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, request.email, message.as_string())

        return {"success": True}

    except Exception as e:
        print("EMAIL ERROR:", e)
        return {"success": False, "error": str(e)}

