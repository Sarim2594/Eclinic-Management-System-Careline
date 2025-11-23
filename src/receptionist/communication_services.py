from fastapi import HTTPException, status
from src.receptionist.models import EmailRequest
from typing import Dict, Any, List
import os
import smtplib
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

load_dotenv()
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# ============================================================================
# REPORTING & EMAIL SERVICES
# ============================================================================

def get_all_completed_diagnoses(db) -> Dict[str, Any]:
    """Fetches list of all completed diagnoses for reporting."""
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

def send_diagnosis_email(request: EmailRequest) -> Dict[str, Any]:
    """Sends the diagnosis report as an HTML email."""
    try:
        message = MIMEMultipart("alternative")
        message["From"] = EMAIL_USER
        message["To"] = request.email
        message["Subject"] = f"Diagnosis Report - {request.patient_name}"

        html_part = MIMEText(request.html, "html")
        message.attach(html_part)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, request.email, message.as_string())

        return {"success": True, "message": "Email sent successfully"}

    except Exception as e:
        print("EMAIL ERROR:", e)
        # Note: You might want to log the full traceback here instead of just printing.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Email delivery failed: {str(e)}")
