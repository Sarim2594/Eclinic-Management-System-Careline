import datetime
import random
import io
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, field_validator
from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, black, lightgrey

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    _HAS_PDF = True
except Exception:
    _HAS_PDF = False

router = APIRouter()

# ============================================================================
# PYDANTIC MODELS WITH VALIDATION
# ============================================================================

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    contact: str
    clinic_id: int

    @field_validator('contact')
    @classmethod
    def validate_contact(cls, v):
        if not re.match(r'^\+92\d{10}$', v):
            raise ValueError('Contact must be in format: +92XXXXXXXXXX')
        return v

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if v < 0 or v > 150:
            raise ValueError('Age must be between 0 and 150')
        return v

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

def generate_ticket_text(patient_id: int, ticket_no: int, patient_name: str, clinic_name: str, doctor_name: str):
    """Generate simple text ticket"""
    ticket_text = f"""
Clinic: {clinic_name}

QUEUE NUMBER: {ticket_no:03d}

Patient: {patient_name}
Patient ID: {patient_id}
Doctor: {doctor_name}
Time: {datetime.datetime.now().strftime('%I:%M %p')}
Date: {datetime.datetime.now().strftime('%d-%m-%Y')}

Please wait for your number to be called.
"""
    return ticket_text

def generate_ticket_pdf(patient_id: int, ticket_no: int, patient_name: str, clinic_name: str, doctor_name: str):
    """Generate PDF ticket or fallback to text"""
    buffer = io.BytesIO()
    if not _HAS_PDF:
        txt = generate_ticket_text(patient_id, ticket_no, patient_name, clinic_name, doctor_name)
        buffer.write(txt.encode())
        buffer.seek(0)
        return buffer

    try:
        PAGE_WIDTH, PAGE_HEIGHT = 80 * mm, 120 * mm
        p = canvas.Canvas(buffer, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

        # Watermark
        p.saveState()
        p.setFont("Helvetica-Bold", 26)
        p.setFillColor(Color(0.9, 0.9, 0.9, alpha=0.6))
        p.translate(PAGE_WIDTH / 2, PAGE_HEIGHT / 2)
        p.rotate(45)
        p.drawCentredString(0, 0, "CareLine")
        p.restoreState()

        # Border
        p.setStrokeColor(lightgrey)
        p.rect(5 * mm, 5 * mm, PAGE_WIDTH - 10 * mm, PAGE_HEIGHT - 10 * mm, stroke=True, fill=False)

        # Ticket Number
        p.setFont("Helvetica-Bold", 36)
        p.setFillColor(black)
        p.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 40 * mm, f"{ticket_no}")

        # Divider
        p.setLineWidth(1)
        p.line(10 * mm, PAGE_HEIGHT - 45 * mm, PAGE_WIDTH - 10 * mm, PAGE_HEIGHT - 45 * mm)

        # Patient Info
        p.setFont("Helvetica", 12)
        p.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 55 * mm, f"{patient_name}")
        p.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 62 * mm, f"ID: {patient_id}")

        # Time
        p.setFont("Helvetica-Oblique", 10)
        p.setFillColorRGB(0.3, 0.3, 0.3)
        p.drawCentredString(
            PAGE_WIDTH / 2,
            PAGE_HEIGHT - 75 * mm,
            f"Time: {datetime.datetime.now().strftime('%d-%m-%y %I:%M %p')}"
        )

        # Footer
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(PAGE_WIDTH / 2, 10 * mm, "Please wait for your turn")

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer
    except Exception:
        txt = generate_ticket_text(patient_id, ticket_no, patient_name, clinic_name, doctor_name)
        buffer = io.BytesIO()
        buffer.write(txt.encode())
        buffer.seek(0)
        return buffer

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
            cursor.execute("SELECT id FROM patients WHERE contact = %s", (patient.contact,))
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
                INSERT INTO patients (name, age, gender, contact)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (patient.name, patient.age, patient.gender, patient.contact))
            
            patient_id = cursor.fetchone()['id']

            # Create appointment
            cursor.execute("""
                INSERT INTO appointments 
                (patient_id, doctor_id, clinic_id, ticket_no, status)
                VALUES (%s, %s, %s, %s, 'waiting')
                RETURNING id
            """, (patient_id, selected['doctor_id'], patient.clinic_id, ticket_no))

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
                patient_id,
                'new_patient',
                'New Patient Assigned',
                f'New patient {patient.name} (Ticket #{ticket_no}) has been assigned to you.'
            ))

            return {
                'success': True,
                'patient_id': patient_id,
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

@router.get('/download-ticket/{patient_id}')
async def download_ticket(patient_id: int, request: Request):
    """Generate and download patient ticket as PDF"""
    try:
        db = request.app.state.db
        
        with db.get_cursor() as cursor:
            # Get patient
            cursor.execute("SELECT id, name FROM patients WHERE id = %s", (patient_id,))
            patient = cursor.fetchone()
            
            if not patient:
                raise HTTPException(status_code=404, detail='Patient not found')

            # Get latest waiting appointment
            cursor.execute("""
                SELECT a.id, a.ticket_no, a.clinic_id, a.doctor_id
                FROM appointments a
                WHERE a.patient_id = %s AND a.status = 'waiting'
                ORDER BY a.created_at DESC
                LIMIT 1
            """, (patient_id,))
            
            appointment = cursor.fetchone()
            
            if not appointment:
                raise HTTPException(
                    status_code=404, 
                    detail='No active appointment found for this patient'
                )

            # Get clinic and doctor details
            cursor.execute("SELECT name FROM clinics WHERE id = %s", (appointment['clinic_id'],))
            clinic = cursor.fetchone()
            
            cursor.execute("SELECT name FROM doctors WHERE id = %s", (appointment['doctor_id'],))
            doctor = cursor.fetchone()

            pdf_buffer = generate_ticket_pdf(
                patient_id=patient_id,
                ticket_no=appointment['ticket_no'],
                patient_name=patient['name'],
                clinic_name=clinic['name'] if clinic else '',
                doctor_name=doctor['name'] if doctor else ''
            )

            if not _HAS_PDF:
                return Response(
                    content=pdf_buffer.getvalue(), 
                    media_type='text/plain', 
                    headers={
                        'Content-Disposition': f'attachment; filename=ticket_{appointment["ticket_no"]}.txt'
                    }
                )

            return StreamingResponse(
                pdf_buffer, 
                media_type='application/pdf', 
                headers={
                    'Content-Disposition': f'attachment; filename=ticket_{appointment["ticket_no"]}.pdf'
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')