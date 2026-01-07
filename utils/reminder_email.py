import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from dotenv import load_dotenv
import os
import logging
import traceback

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

def send_reminder_email(recipient_email: str, doctor_name: str, start_time: str):
    """Send reminder email to doctor with session start time."""
    try:
        # Load and render the email template
        with open(os.path.join(os.path.dirname(__file__), "reminder_template.html"), "r", encoding="utf-8") as f:
            template_str = f.read()

        template = Template(template_str)
        html_content = template.render(doctor_name=doctor_name, start_time=start_time)

        # Construct the email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "⏰ Appointment Reminder - Your Session Starts Soon"
        msg["From"] = EMAIL_USER
        msg["To"] = recipient_email
        msg.attach(MIMEText(html_content, "html"))

        # Send email securely via SMTP
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=20) as server:
            server.starttls()

            server.login(EMAIL_USER, EMAIL_PASS)

            server.send_message(msg)

        return True

    except Exception as e:
        logging.exception("Error sending reminder email")
        return False
