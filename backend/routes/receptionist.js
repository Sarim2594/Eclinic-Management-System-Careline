const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db');

// ============================================================================
// RECEPTIONIST ROUTES
// Replaces: src/receptionist/routes.py + all receptionist service files
// ============================================================================

/** POST /api/receptionist/register-patient */
router.post('/register-patient', async (req, res) => {
  const { name, age, gender, father_name, marital_status, contact, email,
          address, cnic, occupation, nationality, clinic_id } = req.body;
  try {
    // Check for duplicate contact/email/cnic
    const existing = await query(
      'SELECT id FROM patients WHERE contact = $1 OR email = $2 OR cnic = $3',
      [contact, email, cnic]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'Patient with this contact, email, or CNIC already exists' });
    }

    const result = await transaction(async (client) => {
      // 1. Register patient
      const patientRes = await client.query(
        `INSERT INTO patients (name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality]
      );
      const patient_id = patientRes.rows[0].id;

      // 2. Find an available active doctor at this clinic
      const doctorRes = await client.query(
        `SELECT d.id FROM doctors d
         JOIN availability_schedules av ON av.doctor_id = d.id
         WHERE d.clinic_id = $1
           AND d.status = 'active'
           AND av.is_active = TRUE
           AND av.day_of_week % 7 = EXTRACT(DOW FROM CURRENT_DATE)
         ORDER BY (
           SELECT COUNT(*) FROM appointments a
           WHERE a.doctor_id = d.id AND a.status = 'waiting'
         ) ASC
         LIMIT 1`,
        [clinic_id]
      );

      if (doctorRes.rows.length === 0) {
        throw { status: 404, message: 'No available doctors at this clinic' };
      }

      const doctor_id = doctorRes.rows[0].id;

      // 3. Get next ticket number
      const ticketRes = await client.query(
        `SELECT COALESCE(MAX(ticket_no), 0) + 1 AS next_ticket
         FROM appointments WHERE clinic_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [clinic_id]
      );
      const ticket_no = ticketRes.rows[0].next_ticket;

      // 4. Create appointment
      const apptRes = await client.query(
        `INSERT INTO appointments (patient_id, doctor_id, clinic_id, ticket_no, status)
         VALUES ($1, $2, $3, $4, 'waiting') RETURNING *`,
        [patient_id, doctor_id, clinic_id, ticket_no]
      );

      return { patient_id, appointment: apptRes.rows[0] };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ detail: err.message });
    console.error(err);
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/receptionist/get-diagnoses */
router.get('/get-diagnoses', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, p.name AS patient_name, p.email AS patient_email,
              p.contact AS patient_contact, d.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.status = 'completed' AND a.diagnosis != ''
       ORDER BY a.ended_at DESC`
    );
    res.json({ diagnoses: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** POST /api/receptionist/email-diagnosis */
router.post('/email-diagnosis', async (req, res) => {
  const { appointment_id, patient_email } = req.body;
  // NOTE: Email sending logic requires nodemailer setup.
  // This stub preserves the endpoint signature from the original Python code.
  // Configure nodemailer with your SMTP credentials to enable actual sending.
  try {
    const result = await query(
      `SELECT a.*, p.name AS patient_name, p.email, d.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = $1`,
      [appointment_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Appointment not found' });

    // TODO: Add nodemailer here to send diagnosis email
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({...});

    res.json({ success: true, message: 'Email sent (stub - configure nodemailer to enable)' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
