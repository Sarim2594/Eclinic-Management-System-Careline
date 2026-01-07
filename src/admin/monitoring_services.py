import traceback
from fastapi import HTTPException, status
import logging
from src.admin.models import AvailabilityUpdate
from utils.reminder_email import send_reminder_email
from datetime import datetime, timedelta, time
from typing import Dict, Any

def update_doctor_availability(db, doctor_id: int, data: AvailabilityUpdate) -> Dict[str, Any]:
    """Update doctor availability for a specific day."""
    with db.get_cursor() as cursor:
        # 1. Verify doctor exists
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
        
        # 2. Update schedule
        cursor.execute("""
            UPDATE availability_schedules
            SET start_time = %s, end_time = %s, updated_at = CURRENT_TIMESTAMP
            WHERE doctor_id = %s AND day_of_week = %s
        """, (data.startTime, data.endTime, doctor_id, data.day_of_week))
        
        modified_count = cursor.rowcount
        
        return {
            "success": True,
            "message": f"Updated {modified_count} availability schedules"
        }

def run_doctor_monitoring(db) -> Dict[str, Any]:
    """Run monitoring: send shift reminders and report missed shifts to admins."""
    try:
        doctors = None
        with db.get_cursor() as cursor:
            # Query for doctors who are inactive but have a shift today
            cursor.execute("""
                SELECT a.start_time, d.id, d.name, u.email, d.contact, d.clinic_id
                FROM availability_schedules a 
                JOIN doctors d ON a.doctor_id = d.id 
                JOIN users u ON u.id = d.user_id 
                WHERE a.is_active = false
                AND a.day_of_week = EXTRACT(DOW FROM NOW());
            """)
            doctors = cursor.fetchall()
            
        now = datetime.now()
        success = False # Tracks if any email was successfully sent
        missed_shift_count = 0

        for doctor in doctors:
            # Handle time format conversion (extracted from admin.py)
            start_time_obj = None
            if isinstance(doctor['start_time'], str):
                try:
                    start_time_obj = datetime.strptime(doctor['start_time'], "%H:%M:%S").time()
                except ValueError:
                    start_time_obj = datetime.strptime(doctor['start_time'], "%H:%M").time()
            elif isinstance(doctor['start_time'], time):
                start_time_obj = doctor['start_time']
            else:
                continue

            start_dt = datetime.combine(now.date(), start_time_obj)
            diff = start_dt - now

            # Send reminder 15 minutes before shift start (within 15-16 minute window)
            if timedelta(minutes=14) < diff <= timedelta(minutes=15):
                success = send_reminder_email(doctor['email'], doctor['name'], start_dt.strftime("%I:%M %p"))
            
            # Send reminder 5 minutes before shift start (within 4-5 minute window)
            if timedelta(minutes=4) < diff <= timedelta(minutes=5):
                success = send_reminder_email(doctor['email'], doctor['name'], start_dt.strftime("%I:%M %p"))
            
            # Check if shift start time has passed and doctor didn't log in
            # (unless they have an APPROVED unavailability request)
            if diff < timedelta(minutes=0):  # Shift start time has passed
                shift_date = now.date()
                
                # Check for APPROVED unavailability request for this time
                with db.get_cursor() as cursor:
                    cursor.execute("""
                        SELECT dur.id, dur.start_datetime, dur.end_datetime
                        FROM doctor_unavailability_requests dur
                        WHERE dur.doctor_id = %s
                        AND dur.status = 'approved'
                        AND dur.start_datetime <= %s
                        AND dur.end_datetime >= %s
                    """, (doctor['id'], now, now))
                    
                    approved_unavailability = cursor.fetchone()
                
                # If doctor has APPROVED unavailability, don't notify (they're excused)
                if approved_unavailability is not None:
                    # Doctor has valid excuse, skip notification
                    continue
                
                # Doctor missed shift without approved unavailability
                # (either no request, or request is pending/rejected)
                # Use a transactional SELECT ... FOR UPDATE to avoid race conditions
                with db.get_cursor() as cursor:
                    # Lock or create the notification tracking row for this specific shift
                    cursor.execute("""
                        SELECT id, admin_notified FROM doctor_unavailability_notification
                        WHERE doctor_id = %s
                        AND shift_date = %s
                        AND shift_start_time = %s
                        FOR UPDATE
                    """, (doctor['id'], shift_date, start_time_obj))

                    notification_record = cursor.fetchone()

                    if notification_record is None:
                        # Insert tracking row and lock it (we are in transaction)
                        cursor.execute("""
                            INSERT INTO doctor_unavailability_notification
                            (doctor_id, shift_date, shift_start_time, admin_notified)
                            VALUES (%s, %s, %s, false)
                            RETURNING id, admin_notified
                        """, (doctor['id'], shift_date, start_time_obj))
                        notification_record = cursor.fetchone()

                    # If already notified by another worker/process, skip
                    if notification_record and notification_record.get('admin_notified'):
                        continue

                    # Get admin(s) for this doctor's clinic region (distinct)
                    cursor.execute("""
                        SELECT DISTINCT a.id
                        FROM admins a
                        JOIN admin_regions ar ON a.id = ar.admin_id
                        JOIN clinics c ON c.id = %s
                        JOIN cities cy ON c.city_id = cy.id
                        -- only notify admins who belong to the same company as the clinic
                        WHERE cy.region_id = ar.region_id
                          AND a.company_id = c.company_id
                    """, (doctor['clinic_id'],))
                    admins = cursor.fetchall()

                    # Insert a notification per admin (if any) and capture last notification id.
                    # Use a per-admin tracking row to ensure idempotence across runs/processes.
                    notification_id = None
                    for admin in admins:
                        # Try to create an admin-specific tracking row; if it already exists, skip
                        cursor.execute("""
                            INSERT INTO doctor_unavailability_admin_notification
                            (admin_id, doctor_id, shift_date, shift_start_time)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (admin_id, doctor_id, shift_date, shift_start_time) DO NOTHING
                            RETURNING id
                        """, (admin['id'], doctor['id'], shift_date, start_time_obj))

                        inserted = cursor.fetchone()
                        if not inserted:
                            # This admin has already been recorded for this missed shift; skip
                            continue

                        # No recent notification recorded for this admin; insert notification
                        cursor.execute("""
                            INSERT INTO notifications 
                            (recipient_type, recipient_id, type, clinic_id, 
                             title, message, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                            RETURNING id
                        """, (
                            'admin',
                            admin['id'],
                            'doctor_missed_shift',
                            doctor['clinic_id'],
                            'Doctor Missed Shift',
                            f"Doctor {doctor['name']} did not log in for their {start_dt.strftime('%I:%M %p')} shift"
                        ))
                        notif = cursor.fetchone()
                        notification_id = notif['id'] if notif else notification_id

                        # Link the admin-tracking row to this notification
                        if notification_id:
                            cursor.execute("""
                                UPDATE doctor_unavailability_admin_notification
                                SET notification_id = %s, created_at = CURRENT_TIMESTAMP
                                WHERE admin_id = %s AND doctor_id = %s AND shift_date = %s AND shift_start_time = %s
                            """, (notification_id, admin['id'], doctor['id'], shift_date, start_time_obj))

                    if admins and notification_id:
                        # Mark as notified and update tracking record atomically
                        cursor.execute("""
                            UPDATE doctor_unavailability_notification
                            SET admin_notified = true, notification_id = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE doctor_id = %s
                            AND shift_date = %s
                            AND shift_start_time = %s
                        """, (notification_id, doctor['id'], shift_date, start_time_obj))

                        # Increment missed shifts count
                        cursor.execute("""
                            UPDATE doctors
                            SET missed_shifts_count = missed_shifts_count + 1
                            WHERE id = %s
                        """, (doctor['id'],))
                        missed_shift_count += 1
        
        return {
            "success": success,
            "reminders_sent": success,
            "missed_shifts_reported": missed_shift_count
        }

    except Exception as e:
        logging.exception("Error in run_doctor_monitoring")
        return {
            "success": False,
            "reminders_sent": 0,
            "missed_shifts_reported": 0
        }


# ============================================================================
# ADMIN UNAVAILABILITY REQUEST MANAGEMENT
# ============================================================================

def get_pending_unavailability_requests(db, admin_id: int) -> Dict[str, Any]:
    """Get all pending unavailability requests for admin's region doctors."""
    try:
        with db.get_cursor() as cursor:
            # Get admin's company and regions
            cursor.execute("""
                SELECT a.id, a.company_id, ARRAY_AGG(ar.region_id) as region_ids
                FROM admins a
                LEFT JOIN admin_regions ar ON a.id = ar.admin_id
                WHERE a.id = %s
                GROUP BY a.id, a.company_id
            """, (admin_id,))
            
            admin_info = cursor.fetchone()
            if not admin_info:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
            
            region_ids = admin_info['region_ids'] or []
            
            # Get pending unavailability requests for doctors in admin's regions
            if not region_ids or None in region_ids:
                # No regions assigned, return empty
                requests = []
            else:
                cursor.execute("""
                    SELECT 
                        dur.id,
                        dur.doctor_id,
                        d.name as doctor_name,
                        c.name as clinic_name,
                        CONCAT(r.province, ' > ', r.sub_region) as region_name,
                        dur.start_datetime,
                        dur.end_datetime,
                        dur.reason,
                        dur.status,
                        dur.created_at
                    FROM doctor_unavailability_requests dur
                    JOIN doctors d ON dur.doctor_id = d.id
                    JOIN clinics c ON d.clinic_id = c.id
                    JOIN cities cy ON c.city_id = cy.id
                    JOIN regions r ON cy.region_id = r.id
                    WHERE dur.status = 'pending' 
                      AND cy.region_id = ANY(%s)
                    ORDER BY dur.created_at DESC
                """, (region_ids,))
                requests = cursor.fetchall()
            
            return {
                "success": True,
                "requests": requests or []
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=str(e))


def approve_unavailability_request(db, request_id: int, admin_id: int, admin_comment: str = "") -> Dict[str, Any]:
    """Admin approves a doctor's unavailability request."""
    try:
        with db.get_cursor() as cursor:
            # Verify admin can approve this request (in same region)
            cursor.execute("""
                SELECT dur.id, dur.doctor_id, dur.status
                FROM doctor_unavailability_requests dur
                JOIN doctors d ON dur.doctor_id = d.id
                JOIN clinics c ON d.clinic_id = c.id
                JOIN cities cy ON c.city_id = cy.id
                JOIN admin_regions ar ON cy.region_id = ar.region_id
                WHERE dur.id = %s AND ar.admin_id = %s
            """, (request_id, admin_id))
            
            req = cursor.fetchone()
            if not req:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                                  detail="You don't have permission to approve this request")
            
            if req['status'] != 'pending':
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                  detail=f"Request is already {req['status']}")
            
            # Update request status
            cursor.execute("""
                UPDATE doctor_unavailability_requests
                SET status = 'approved', admin_comment = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, doctor_id, start_datetime, end_datetime
            """, (admin_comment.strip() if admin_comment else None, request_id))
            
            result = cursor.fetchone()
            
            # Create notification for doctor
            cursor.execute("""
                INSERT INTO notifications 
                (recipient_type, recipient_id, title, message, type, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, ('doctor', result['doctor_id'], 
                  'Unavailability Approved',
                  f"Your unavailability request from {result['start_datetime']} to {result['end_datetime']} has been approved.",
                  'unavailability_approved'))
            
            return {
                "success": True,
                "message": "Unavailability request approved"
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=str(e))


def reject_unavailability_request(db, request_id: int, admin_id: int, reason: str) -> Dict[str, Any]:
    """Admin rejects a doctor's unavailability request."""
    try:
        if not reason or len(reason.strip()) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="Rejection reason is required")
        
        with db.get_cursor() as cursor:
            # Verify admin can reject this request
            cursor.execute("""
                SELECT dur.id, dur.doctor_id, dur.status
                FROM doctor_unavailability_requests dur
                JOIN doctors d ON dur.doctor_id = d.id
                JOIN clinics c ON d.clinic_id = c.id
                JOIN cities cy ON c.city_id = cy.id
                JOIN admin_regions ar ON cy.region_id = ar.region_id
                WHERE dur.id = %s AND ar.admin_id = %s
            """, (request_id, admin_id))
            
            req = cursor.fetchone()
            if not req:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                                  detail="You don't have permission to reject this request")
            
            if req['status'] != 'pending':
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                  detail=f"Request is already {req['status']}")
            
            # Update request status
            cursor.execute("""
                UPDATE doctor_unavailability_requests
                SET status = 'rejected', admin_comment = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, doctor_id
            """, (reason.strip(), request_id))
            
            result = cursor.fetchone()
            
            # Create notification for doctor
            cursor.execute("""
                INSERT INTO notifications 
                (recipient_type, recipient_id, title, message, type, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, ('doctor', result['doctor_id'], 
                  'Unavailability Rejected',
                  f'Your unavailability request has been rejected. Reason: {reason.strip()}',
                  'unavailability_rejected'))
            
            return {
                "success": True,
                "message": "Unavailability request rejected"
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=str(e))
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")