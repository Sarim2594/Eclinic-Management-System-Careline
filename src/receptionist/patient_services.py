import datetime
import random
from fastapi import HTTPException, status
from src.receptionist.models import PatientCreate
from src.receptionist.availability_services import is_doctor_available
from typing import Dict, Any

# ============================================================================
# PATIENT FLOW & ASSIGNMENT SERVICES
# ============================================================================

def register_new_patient_and_assign_doctor(db, patient: PatientCreate) -> Dict[str, Any]:
    """Handles patient creation/lookup, availability check, doctor assignment, and notification."""
    try:
        with db.get_cursor() as cursor:
            # 1. Validate clinic exists
            # include company_id and city_id so we can target company admins for notifications
            cursor.execute("SELECT id, name, company_id, city_id FROM clinics WHERE id = %s", (patient.clinic_id,))
            clinic = cursor.fetchone()
            if not clinic:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Clinic not found')

            # 2. Get active doctors at this clinic
            cursor.execute("SELECT id, name FROM doctors WHERE clinic_id = %s AND status = 'active'", (patient.clinic_id,))
            doctors = cursor.fetchall()
            
            # 3. Check for currently available doctors using the helper service
            available_doctors = []
            for doctor in doctors:
                if is_doctor_available(doctor['id'], db):
                    available_doctors.append(doctor)
            
            # 4. Handle doctor unavailability scenarios (and notification to Admin)
            if not doctors:
                message = f'No doctors available at the selected clinic. Patient {patient.name} could not be registered.'
                title = 'No Doctors Available'
                # Notify only admins who manage the region of this clinic
                notified_admin_ids = []
                # Determine region_id for the clinic via its city
                region_id = None
                if clinic.get('city_id'):
                    cursor.execute("SELECT region_id FROM cities WHERE id = %s", (clinic['city_id'],))
                    city_row = cursor.fetchone()
                    if city_row:
                        region_id = city_row.get('region_id')

                if region_id:
                    cursor.execute(
                        """SELECT a.id FROM admins a JOIN admin_regions ar ON a.id = ar.admin_id
                           WHERE a.company_id = %s AND ar.region_id = %s""",
                        (clinic['company_id'], region_id)
                    )
                    admins = cursor.fetchall()
                else:
                    admins = []

                if admins:
                    for a in admins:
                        cursor.execute(
                            """INSERT INTO notifications (recipient_type, recipient_id, type, clinic_id, clinic_name, title, message) VALUES (%s, %s, %s, %s, %s, %s, %s) """,
                            ('admin', a['id'], 'no_doctors_available', patient.clinic_id, clinic['name'], title, message)
                        )
                        notified_admin_ids.append(a['id'])
                    # Debug log: which admins were notified
                    print(f"[notifications] no_doctors_available inserted for admin_ids={notified_admin_ids}, clinic_id={patient.clinic_id}")
                else:
                    # Fallback: create a general admin-level notification without recipient_id is invalid per constraint,
                    # so insert as a superadmin notification so the platform operators still see it.
                    cursor.execute(
                        """INSERT INTO notifications (recipient_type, type, clinic_id, clinic_name, title, message) VALUES (%s, %s, %s, %s, %s, %s) """,
                        ('superadmin', 'no_doctors_available', patient.clinic_id, clinic['name'], title, message)
                    )
                return {'success': False, 'detail': "No doctors available at the selected clinic. Please try again after a few minutes."}
            
            if not available_doctors:
                message = f'No doctors currently available at {clinic["name"]} during operating hours. Patient {patient.name} attempted registration.'
                title = 'No Doctors Currently Available'
                # Notify only admins who manage the region of this clinic
                notified_admin_ids = []
                region_id = None
                if clinic.get('city_id'):
                    cursor.execute("SELECT region_id FROM cities WHERE id = %s", (clinic['city_id'],))
                    city_row = cursor.fetchone()
                    if city_row:
                        region_id = city_row.get('region_id')

                if region_id:
                    cursor.execute(
                        """SELECT a.id FROM admins a JOIN admin_regions ar ON a.id = ar.admin_id
                           WHERE a.company_id = %s AND ar.region_id = %s""",
                        (clinic['company_id'], region_id)
                    )
                    admins = cursor.fetchall()
                else:
                    admins = []

                if admins:
                    for a in admins:
                        cursor.execute(
                            """INSERT INTO notifications (recipient_type, recipient_id, type, clinic_id, clinic_name, title, message) VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                            ('admin', a['id'], 'no_doctors_currently_available', patient.clinic_id, clinic['name'], title, message)
                        )
                        notified_admin_ids.append(a['id'])
                    print(f"[notifications] no_doctors_currently_available inserted for admin_ids={notified_admin_ids}, clinic_id={patient.clinic_id}")
                else:
                    cursor.execute(
                        """INSERT INTO notifications (recipient_type, type, clinic_id, clinic_name, title, message) VALUES (%s, %s, %s, %s, %s, %s)""",
                        ('superadmin', 'no_doctors_currently_available', patient.clinic_id, clinic['name'], title, message)
                    )
                return {'success': False, 'detail': "No doctors are currently available at the selected clinic. Please try again after a few minutes."}

            # 5. Generate ticket number
            today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE clinic_id = %s AND created_at >= %s", (patient.clinic_id, today_start))
            ticket_count = cursor.fetchone()['count']
            ticket_no = ticket_count + 1

            # 6. Assign doctor with least waiting patients
            doctor_loads = []
            for doctor in available_doctors:
                cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE doctor_id = %s AND status = 'waiting'", (doctor['id'],))
                waiting_count = cursor.fetchone()['count']
                doctor_loads.append({'doctor_id': doctor['id'], 'doctor_name': doctor['name'], 'waiting_count': waiting_count})

            min_load = min(dl['waiting_count'] for dl in doctor_loads)
            candidates = [dl for dl in doctor_loads if dl['waiting_count'] == min_load]
            selected = random.choice(candidates)
            
            patient_id_to_use = patient.mr
            message_prefix = 'Patient registered'
            
            # 7. Check if patient already exists
            cursor.execute("SELECT id FROM patients WHERE id = %s", (patient.mr,))
            existing_patient = cursor.fetchone()
            
            if existing_patient:
                patient_id_to_use = existing_patient['id']
                message_prefix = 'Patient already registered. Appointment created'
            else:
                # 8. Create new patient
                cursor.execute("""
                    INSERT INTO patients (id, name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (patient.mr, patient.name, patient.age, patient.gender, patient.father_name, patient.marital_status, patient.contact, patient.email, patient.address, patient.cnic, patient.occupation, patient.nationality))

            # 9. Create appointment
            cursor.execute("""
                INSERT INTO appointments (patient_id, doctor_id, clinic_id, ticket_no, status)
                VALUES (%s, %s, %s, %s, 'waiting')
                RETURNING id
            """, (patient_id_to_use, selected['doctor_id'], patient.clinic_id, ticket_no))

            # 10. Notify the assigned doctor
            cursor.execute("""
                INSERT INTO notifications (recipient_type, recipient_id, patient_id, type, title, message)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, ('doctor', selected['doctor_id'], patient_id_to_use, 'new_patient', 'New Patient Assigned',
                f'New patient {patient.name} (Ticket #{ticket_no}) has been assigned to you.'))

            return {
                'success': True,
                'patient_id': patient_id_to_use,
                'ticket_no': ticket_no,
                'doctor_name': selected['doctor_name'],
                'clinic_name': clinic['name'],
                'queue_position': selected['waiting_count'] + 1,
                'message': f'{message_prefix} successfully',
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))