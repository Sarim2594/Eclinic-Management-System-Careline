const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ============================================================================
// DOCTOR ROUTES
// IMPORTANT: Static paths (/patient/:id, /request-unavailability, /submit-diagnosis)
// MUST be defined BEFORE dynamic paths (/:doctor_id/...) to avoid Express
// matching the static segment as a doctor_id parameter.
// ============================================================================

// ── STATIC ROUTES FIRST ──────────────────────────────────────────────────────

/** POST /api/doctor/submit-diagnosis */
router.post('/submit-diagnosis', async (req, res) => {
  const { appointment_id, diagnosis, prescription, notes } = req.body;
  try {
    const result = await query(
      `UPDATE appointments
       SET diagnosis = $1, prescription = $2, notes = $3,
           status = 'completed', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [diagnosis, prescription, notes, appointment_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ detail: 'Appointment not found' });
    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** POST /api/doctor/request-unavailability */
router.post('/request-unavailability', async (req, res) => {
  const { doctor_id, start_datetime, end_datetime, reason } = req.body;
  try {
    const result = await query(
      `INSERT INTO doctor_unavailability_requests (doctor_id, start_datetime, end_datetime, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [doctor_id, start_datetime, end_datetime, reason]
    );
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /api/doctor/patient/:patient_id/history
 * MUST be before /:doctor_id routes — otherwise Express reads "patient" as doctor_id
 */
router.get('/patient/:patient_id/history', async (req, res) => {
  const { patient_id } = req.params;
  try {
    const result = await query(
      `SELECT
         a.*,
         d.name        AS doctor_name,
         cl.name       AS clinic_name,
         p.name        AS patient_name,
         p.age         AS patient_age,
         p.gender      AS patient_gender,
         p.contact     AS patient_contact,
         p.cnic        AS patient_cnic,
         p.address     AS patient_address,
         p.nationality AS patient_nationality
       FROM appointments a
       JOIN doctors  d  ON a.doctor_id  = d.id
       JOIN clinics  cl ON a.clinic_id  = cl.id
       JOIN patients p  ON a.patient_id = p.id
       WHERE a.patient_id = $1
       ORDER BY a.created_at DESC`,
      [patient_id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error('[doctor/patient/history]', err.message);
    res.status(500).json({ detail: err.message });
  }
});

// ── DYNAMIC ROUTES AFTER ─────────────────────────────────────────────────────

/** GET /api/doctor/:doctor_id/waiting-patients */
router.get('/:doctor_id/waiting-patients', async (req, res) => {
  const { doctor_id } = req.params;
  try {
    const result = await query(
      `SELECT
         a.*,
         p.name    AS patient_name,
         p.age     AS patient_age,
         p.gender  AS patient_gender,
         p.contact AS patient_contact,
         p.cnic    AS patient_cnic,
         p.address AS patient_address,
         p.father_name AS patient_father_name,
         p.marital_status AS patient_marital_status
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

/** GET /api/doctor/:doctor_id/past-patients */
router.get('/:doctor_id/past-patients', async (req, res) => {
  const { doctor_id } = req.params;
  try {
    const result = await query(
      `SELECT DISTINCT ON (p.id)
         p.id, p.name, p.age, p.gender, p.contact, p.cnic,
         a.created_at AS last_visit,
         a.diagnosis,
         a.id         AS appointment_id
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

/** PUT /api/doctor/record-vitals/:patient_id */
router.put('/record-vitals/:patient_id', async (req, res) => {
  const { patient_id } = req.params;
  const vitals = req.body;
  try {
    const result = await query(
      `UPDATE appointments
       SET vitals = $1, updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $2 AND status = 'waiting'
       RETURNING *`,
      [JSON.stringify(vitals), patient_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ detail: 'No active appointment found for this patient' });
    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** PUT /api/doctor/:doctor_id/set-inactive */
router.put('/:doctor_id/set-inactive', async (req, res) => {
  const { doctor_id } = req.params;
  try {
    await query(`UPDATE doctors SET status = 'inactive' WHERE id = $1`, [doctor_id]);
    await query(
      `UPDATE availability_schedules SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $1`,
      [doctor_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/doctor/:doctor_id/unavailability-requests */
router.get('/:doctor_id/unavailability-requests', async (req, res) => {
  const { doctor_id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM doctor_unavailability_requests
       WHERE doctor_id = $1
       ORDER BY created_at DESC`,
      [doctor_id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;