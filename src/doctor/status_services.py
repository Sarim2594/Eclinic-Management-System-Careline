from fastapi import HTTPException, status
from typing import Dict, Any
from src.admin.doctor_offline_services import notify_doctor_offline
import logging

def set_doctor_status_inactive(db, doctor_id: int) -> Dict[str, Any]:
    """Sets a doctor's availability to inactive and notifies admin of offline status."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            UPDATE availability_schedules 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE doctor_id = %s AND day_of_week %% 7 = EXTRACT(DOW FROM CURRENT_DATE)
        """, (doctor_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Failed to update doctor status')

        # Get doctor's clinic to send offline notification
        cursor.execute("SELECT clinic_id FROM doctors WHERE id = %s", (doctor_id,))
        doctor_info = cursor.fetchone()
        
        if doctor_info:
            try:
                notify_doctor_offline(db, doctor_id, doctor_info['clinic_id'])
            except Exception as e:
                # Log but don't fail the logout
                logging.exception(f"Could not send offline notification for doctor {doctor_id}")

        return {'success': True, 'message': 'Doctor status set to inactive'}