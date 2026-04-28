const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireFields } = require('../utils/validators');

const PATIENT_ID_SQL = `CONCAT('PT-', LPAD(p.id::text, 6, '0'))`;

router.use((req, res, next) => {
  req.scope = {
    doctor_id: req.auth.doctor_id,
    clinic_id: req.auth.clinic_id,
  };
  next();
});

router.post('/submit-diagnosis', async (req, res) => {
  const { appointment_id, diagnosis, prescription, notes, vitals = {} } = req.body || {};
  const { doctor_id } = req.scope;

  try {
    requireFields({ appointment_id, diagnosis, prescription }, ['appointment_id', 'diagnosis', 'prescription']);
    const validationError = validateVitals(vitals);
    if (validationError) {
      return res.status(400).json({ detail: validationError });
    }

    const result = await query(
      `UPDATE appointments
       SET vitals = $1,
           diagnosis = $2,
           prescription = $3,
           notes = $4,
           status = 'completed',
           ended_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND doctor_id = $6
       RETURNING *`,
      [JSON.stringify(vitals), diagnosis.trim(), prescription.trim(), notes || '', appointment_id, doctor_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Appointment not found for this doctor' });

    const appointmentContext = await query(
      `SELECT a.id, a.clinic_id, a.patient_id, p.name AS patient_name, cl.name AS clinic_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN clinics cl ON a.clinic_id = cl.id
       WHERE a.id = $1`,
      [appointment_id]
    );

    if (appointmentContext.rows[0]) {
      const clinicReceptionists = await query(
        `SELECT id
         FROM receptionists
         WHERE clinic_id = $1 AND status = 'active'`,
        [appointmentContext.rows[0].clinic_id]
      );

      for (const receptionist of clinicReceptionists.rows) {
        await query(
          `INSERT INTO notifications (type, recipient_type, recipient_id, patient_id, doctor_id, clinic_id, clinic_name, title, message)
           VALUES ($1, 'receptionist', $2, $3, $4, $5, $6, $7, $8)`,
          [
            'diagnosis_completed',
            receptionist.id,
            appointmentContext.rows[0].patient_id,
            doctor_id,
            appointmentContext.rows[0].clinic_id,
            appointmentContext.rows[0].clinic_name,
            'Diagnosis completed',
            `Dr. consultation is complete for ${appointmentContext.rows[0].patient_name}. The diagnosis summary is ready in appointments.`,
          ]
        );
      }
    }

    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || 'Unable to complete the consultation right now.' });
  }
});

router.post('/request-unavailability', async (req, res) => {
  const { start_datetime, end_datetime, reason } = req.body || {};
  const { doctor_id } = req.scope;

  try {
    requireFields({ doctor_id, start_datetime, end_datetime, reason }, ['doctor_id', 'start_datetime', 'end_datetime', 'reason']);
    const result = await query(
      `INSERT INTO doctor_unavailability_requests (doctor_id, start_datetime, end_datetime, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [doctor_id, start_datetime, end_datetime, reason]
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/request-region-change', async (req, res) => {
  const { requested_region_id, reason = '' } = req.body || {};
  const { doctor_id } = req.scope;

  try {
    requireFields({ doctor_id, requested_region_id, reason }, ['doctor_id', 'requested_region_id', 'reason']);
    const result = await query(
      `INSERT INTO doctor_region_change_requests (doctor_id, requested_region_id, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [doctor_id, requested_region_id, reason]
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/patient/:patient_id/history', async (req, res) => {
  const { patient_id } = req.params;
  const { doctor_id } = req.scope;

  try {
    const access = await query(
      `SELECT 1
       FROM appointments
       WHERE patient_id = $1 AND doctor_id = $2
       LIMIT 1`,
      [patient_id, doctor_id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ detail: 'Patient history not found for this doctor' });
    }

    const result = await query(
      `SELECT a.*, d.name AS doctor_name, cl.name AS clinic_name,
              p.name AS patient_name, p.age AS patient_age, p.gender AS patient_gender,
              p.contact AS patient_contact, p.cnic AS patient_cnic,
              ${PATIENT_ID_SQL} AS patient_registration_number,
              p.address AS patient_address, p.nationality AS patient_nationality
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN clinics cl ON a.clinic_id = cl.id
       JOIN patients p ON a.patient_id = p.id
       WHERE a.patient_id = $1
         AND a.doctor_id = $2
         AND a.status = 'completed'
       ORDER BY a.created_at DESC`,
      [patient_id, doctor_id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/:doctor_id/waiting-patients', async (req, res) => {
  const { doctor_id } = req.scope;

  try {
    const result = await query(
      `SELECT a.*, p.id AS patient_id,
              p.name AS patient_name, p.age AS patient_age, p.gender AS patient_gender,
              p.contact AS patient_contact, p.cnic AS patient_cnic,
              ${PATIENT_ID_SQL} AS patient_registration_number,
              p.address AS patient_address,
              p.father_name AS patient_father_name, p.marital_status AS patient_marital_status
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1 AND a.status = 'waiting'
       ORDER BY a.created_at ASC`,
      [doctor_id]
    );
    res.json({ patients: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/:doctor_id/upcoming-appointments', async (req, res) => {
  const { doctor_id } = req.scope;

  try {
    const result = await query(
      `SELECT a.*, p.name AS patient_name, p.contact AS patient_contact,
              ${PATIENT_ID_SQL} AS patient_registration_number,
              cl.name AS clinic_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN clinics cl ON a.clinic_id = cl.id
       WHERE a.doctor_id = $1 AND a.status = 'waiting'
       ORDER BY a.created_at ASC`,
      [doctor_id]
    );
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/:doctor_id/past-patients', async (req, res) => {
  const { doctor_id } = req.scope;

  try {
    const result = await query(
      `SELECT DISTINCT ON (p.id)
         p.id, p.name, p.age, p.gender, p.contact, p.cnic,
         ${PATIENT_ID_SQL} AS registration_number,
         a.created_at AS last_visit,
         a.diagnosis,
         a.id AS appointment_id
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1 AND a.status = 'completed'
       ORDER BY p.id, a.created_at DESC`,
      [doctor_id]
    );
    res.json({ patients: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/record-vitals/:patient_id', async (req, res) => {
  const { patient_id } = req.params;
  const vitals = req.body || {};
  const { doctor_id } = req.scope;

  try {
    const validationError = validateVitals(vitals);
    if (validationError) {
      return res.status(400).json({ detail: validationError });
    }

    const result = await query(
      `UPDATE appointments
       SET vitals = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $2 AND doctor_id = $3 AND status = 'waiting'
       RETURNING *`,
      [JSON.stringify(vitals), patient_id, doctor_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'No active appointment found for this patient under this doctor' });
    }
    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/:doctor_id/set-inactive', async (req, res) => {
  const { doctor_id } = req.scope;
  try {
    await query('UPDATE doctors SET status = \'inactive\' WHERE id = $1', [doctor_id]);
    await query(
      `UPDATE availability_schedules
       SET is_active = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $1`,
      [doctor_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/:doctor_id/unavailability-requests', async (req, res) => {
  const { doctor_id } = req.scope;
  try {
    const result = await query(
      `SELECT *
       FROM doctor_unavailability_requests
       WHERE doctor_id = $1
       ORDER BY created_at DESC`,
      [doctor_id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/:doctor_id/region-change-requests', async (req, res) => {
  const { doctor_id } = req.scope;
  try {
    const result = await query(
      `SELECT drcr.*, r.province, r.sub_region
       FROM doctor_region_change_requests drcr
       JOIN regions r ON drcr.requested_region_id = r.id
       WHERE drcr.doctor_id = $1
       ORDER BY drcr.created_at DESC`,
      [doctor_id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

function validateVitals(vitals) {
  const requiredKeys = [
    'temperature',
    'blood_pressure',
    'pulse_rate',
    'height',
    'weight',
    'blood_oxygen',
    'blood_sugar_level',
  ];

  for (const key of requiredKeys) {
    if (vitals[key] === undefined || vitals[key] === null || `${vitals[key]}`.trim() === '') {
      return `${key.replaceAll('_', ' ')} is required`;
    }
  }

  const temperature = toNumber(vitals.temperature);
  const pulseRate = toNumber(vitals.pulse_rate);
  const height = toNumber(vitals.height);
  const weight = toNumber(vitals.weight);
  const bloodOxygen = toNumber(vitals.blood_oxygen);
  const bloodSugar = toNumber(vitals.blood_sugar_level);

  if (temperature === null || temperature < 90 || temperature > 110) {
    return 'Temperature must be between 90 and 110 F';
  }
  const bloodPressureError = getBloodPressureError(vitals.blood_pressure);
  if (bloodPressureError) {
    return bloodPressureError;
  }
  if (pulseRate === null || pulseRate < 30 || pulseRate > 220) {
    return 'Pulse rate must be between 30 and 220 bpm';
  }
  if (height === null || height < 30 || height > 260) {
    return 'Height must be between 30 and 260 cm';
  }
  if (weight === null || weight < 1 || weight > 400) {
    return 'Weight must be between 1 and 400 kg';
  }
  if (bloodOxygen === null || bloodOxygen < 50 || bloodOxygen > 100) {
    return 'Blood oxygen must be between 50 and 100%';
  }
  if (bloodSugar === null || bloodSugar < 20 || bloodSugar > 600) {
    return 'Blood sugar level must be between 20 and 600 mg/dL';
  }

  return null;
}

function getBloodPressureError(value) {
  const match = `${value || ''}`.trim().match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return 'Use blood pressure format like 120/80';
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (systolic <= diastolic) {
    return 'The top blood pressure number should be higher than the bottom number';
  }
  if (systolic < 70 || systolic > 250 || diastolic < 40 || diastolic > 150) {
    return 'Blood pressure looks out of range. Enter a realistic reading like 120/80';
  }
  return null;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = router;
