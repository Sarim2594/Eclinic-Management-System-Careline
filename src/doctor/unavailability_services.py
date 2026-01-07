from fastapi import HTTPException, status
from typing import Dict, Any, List
from datetime import datetime

# ============================================================================
# DOCTOR UNAVAILABILITY REQUEST SERVICES
# ============================================================================

def request_unavailability(db, doctor_id: int, start_datetime: str, end_datetime: str, reason: str) -> Dict[str, Any]:
    """Doctor submits a request for unavailability in advance."""
    try:
        # Parse and validate datetimes
        start_dt = datetime.fromisoformat(start_datetime)
        end_dt = datetime.fromisoformat(end_datetime)
        
        if end_dt <= start_dt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="End time must be after start time")
        
        if not reason or len(reason.strip()) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="Reason is required")
        
        with db.get_cursor() as cursor:
            # Verify doctor exists
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
            
            # Insert unavailability request
            cursor.execute("""
                INSERT INTO doctor_unavailability_requests 
                (doctor_id, start_datetime, end_datetime, reason, status)
                VALUES (%s, %s, %s, %s, 'pending')
                RETURNING id, status, created_at
            """, (doctor_id, start_dt, end_dt, reason.strip()))
            
            result = cursor.fetchone()
            
            return {
                "success": True,
                "message": "Unavailability request submitted. Awaiting admin approval.",
                "request_id": result['id'],
                "status": result['status']
            }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                          detail=f"Invalid datetime format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=str(e))


def get_doctor_unavailability_requests(db, doctor_id: int) -> Dict[str, Any]:
    """Get all unavailability requests for a doctor."""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id,
                    start_datetime,
                    end_datetime,
                    reason,
                    status,
                    admin_comment,
                    created_at
                FROM doctor_unavailability_requests
                WHERE doctor_id = %s
                ORDER BY created_at DESC
            """, (doctor_id,))
            
            requests = cursor.fetchall()
            
            return {
                "success": True,
                "requests": requests or []
            }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=str(e))
