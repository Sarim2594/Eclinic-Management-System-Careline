from fastapi import HTTPException, status
from typing import Dict, Any

# ============================================================================
# STATUS MANAGEMENT SERVICES
# ============================================================================

def set_doctor_status_inactive(db, doctor_id: int) -> Dict[str, Any]:
    """Sets a doctor's schedule status to inactive upon logout for the current day."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            UPDATE availability_schedules 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE doctor_id = %s AND day_of_week %% 7 = EXTRACT(DOW FROM CURRENT_DATE)
        """, (doctor_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Failed to update doctor status')

        return {'success': True, 'message': 'Doctor status set to inactive successfully'}