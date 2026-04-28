const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db');
const { requireFields, assertEmail, assertPhone, assertCnic } = require('../utils/validators');
const { sendAppEmail } = require('../utils/emailTransport');

const PATIENT_ID_SQL = `CONCAT('PT-', LPAD(p.id::text, 6, '0'))`;

router.use((req, res, next) => {
  req.scope = {
    receptionist_id: req.auth.receptionist_id,
    clinic_id: req.auth.clinic_id,
  };
  next();
});

function formatPatientRegistrationNumber(patientId) {
  return `PT-${String(patientId).padStart(6, '0')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDiagnosisVitals(vitals) {
  const values = vitals && typeof vitals === 'object' ? vitals : {};
  return [
    ['Temperature', values.temperature ? `${values.temperature} F` : 'Not recorded'],
    ['Blood Pressure', values.blood_pressure || 'Not recorded'],
    ['Pulse Rate', values.pulse_rate ? `${values.pulse_rate} bpm` : 'Not recorded'],
    ['Height', values.height ? `${values.height} cm` : 'Not recorded'],
    ['Weight', values.weight ? `${values.weight} kg` : 'Not recorded'],
    ['Blood Oxygen', values.blood_oxygen ? `${values.blood_oxygen}%` : 'Not recorded'],
    ['Blood Sugar Level', values.blood_sugar_level ? `${values.blood_sugar_level} mg/dL` : 'Not recorded'],
  ];
}

function getCompanyDisplayName(companyName) {
  const trimmed = `${companyName || ''}`.trim();
  return trimmed || 'Clinic';
}

function buildDiagnosisEmailHtml(appointment) {
  const companyName = getCompanyDisplayName(appointment.company_name);
  const vitalsMarkup = formatDiagnosisVitals(appointment.vitals)
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 0; color:#6b7280; font-size:13px; width:42%;">${escapeHtml(label)}</td>
        <td style="padding:8px 0; color:#111827; font-size:13px; font-weight:600;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px; color:#111827;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:18px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fff1f2,#fee2e2); padding:20px 24px; border-bottom:1px solid #fecdd3;">
          <h1 style="margin:0; color:#b91c1c; font-size:24px;">${escapeHtml(companyName)} Diagnosis Summary</h1>
          <p style="margin:8px 0 0; color:#4b5563; font-size:13px;">Ticket #${escapeHtml(appointment.ticket_no || '-')} • Patient ID ${escapeHtml(appointment.patient_registration_number || formatPatientRegistrationNumber(appointment.patient_id))}</p>
        </div>
        <div style="padding:22px 24px;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:18px;">
            <tr>
              <td style="padding:8px 0; color:#6b7280; font-size:13px;">Patient</td>
              <td style="padding:8px 0; color:#111827; font-size:14px; font-weight:600;">${escapeHtml(appointment.patient_name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280; font-size:13px;">Doctor</td>
              <td style="padding:8px 0; color:#111827; font-size:14px; font-weight:600;">Dr. ${escapeHtml(appointment.doctor_name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280; font-size:13px;">Company</td>
              <td style="padding:8px 0; color:#111827; font-size:14px; font-weight:600;">${escapeHtml(companyName)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280; font-size:13px;">Contact</td>
              <td style="padding:8px 0; color:#111827; font-size:14px; font-weight:600;">${escapeHtml(appointment.patient_contact || '-')}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280; font-size:13px;">Completed On</td>
              <td style="padding:8px 0; color:#111827; font-size:14px; font-weight:600;">${escapeHtml(new Date(appointment.ended_at || appointment.created_at).toLocaleString())}</td>
            </tr>
          </table>

          <div style="border:1px solid #e5e7eb; border-radius:14px; padding:16px; margin-bottom:14px;">
            <h2 style="margin:0 0 10px; font-size:16px;">Diagnosis</h2>
            <p style="margin:0; white-space:pre-wrap; line-height:1.5; font-size:14px;">${escapeHtml(appointment.diagnosis || 'No diagnosis recorded.')}</p>
          </div>

          <div style="border:1px solid #e5e7eb; border-radius:14px; padding:16px; margin-bottom:14px;">
            <h2 style="margin:0 0 10px; font-size:16px;">Recorded Vitals</h2>
            <table style="width:100%; border-collapse:collapse;">${vitalsMarkup}</table>
          </div>

          <div style="border:1px solid #e5e7eb; border-radius:14px; padding:16px; margin-bottom:14px;">
            <h2 style="margin:0 0 10px; font-size:16px;">Prescription</h2>
            <p style="margin:0; white-space:pre-wrap; line-height:1.5; font-size:14px;">${escapeHtml(appointment.prescription || 'No prescription recorded.')}</p>
          </div>

          <div style="border:1px solid #e5e7eb; border-radius:14px; padding:16px;">
            <h2 style="margin:0 0 10px; font-size:16px;">Doctor Notes</h2>
            <p style="margin:0; white-space:pre-wrap; line-height:1.5; font-size:14px;">${escapeHtml(appointment.notes || 'No additional notes recorded.')}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function findPatientById(client, patientId) {
  const result = await client.query(
    `SELECT p.*, ${PATIENT_ID_SQL} AS registration_number
     FROM patients p
     WHERE p.id = $1`,
    [patientId]
  );
  return result.rows[0] || null;
}

async function createClinicAppointment(client, clinicId, patientId) {
  const duplicateAppointment = await client.query(
    `SELECT a.id, a.ticket_no, p.name AS patient_name, d.name AS doctor_name,
            ${PATIENT_ID_SQL} AS patient_registration_number
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     JOIN doctors d ON a.doctor_id = d.id
     WHERE a.clinic_id = $1
       AND a.patient_id = $2
       AND a.status = 'waiting'
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [clinicId, patientId]
  );
  if (duplicateAppointment.rows.length > 0) {
    const error = new Error(
      `This patient already has an active queue ticket (#${duplicateAppointment.rows[0].ticket_no}) with Dr. ${duplicateAppointment.rows[0].doctor_name}.`
    );
    error.status = 400;
    throw error;
  }

  const doctorRes = await client.query(
    `SELECT d.id, d.name
     FROM doctors d
     JOIN app_users u ON d.user_id = u.id
     JOIN availability_schedules av ON av.doctor_id = d.id
     WHERE d.clinic_id = $1
       AND d.status = 'active'
       AND av.is_active = TRUE
       AND u.last_seen_at IS NOT NULL
       AND u.last_seen_at >= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
     ORDER BY (
       SELECT COUNT(*)
       FROM appointments a
       WHERE a.doctor_id = d.id AND a.status = 'waiting'
     ) ASC,
     d.name ASC
     LIMIT 1`,
    [clinicId]
  );

  if (doctorRes.rows.length === 0) {
    const error = new Error('No doctors are currently online and available at this clinic');
    error.status = 404;
    throw error;
  }

  const ticketRes = await client.query(
    `SELECT COALESCE(MAX(ticket_no), 0) + 1 AS next_ticket
     FROM appointments_core
     WHERE clinic_id = $1
       AND queue_date = CURRENT_DATE`,
    [clinicId]
  );

  const appointmentRes = await client.query(
    `INSERT INTO appointments (patient_id, doctor_id, clinic_id, ticket_no, status)
     VALUES ($1, $2, $3, $4, 'waiting')
     RETURNING *`,
    [patientId, doctorRes.rows[0].id, clinicId, ticketRes.rows[0].next_ticket]
  );

  const appointmentDetails = await client.query(
    `SELECT a.*, p.name AS patient_name, p.contact AS patient_contact,
            p.email AS patient_email,
            ${PATIENT_ID_SQL} AS patient_registration_number,
            d.name AS doctor_name,
            cl.name AS clinic_name,
            co.name AS company_name
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     JOIN doctors d ON a.doctor_id = d.id
     JOIN clinics cl ON a.clinic_id = cl.id
     JOIN companies co ON cl.company_id = co.id
     WHERE a.id = $1`,
    [appointmentRes.rows[0].id]
  );

  return appointmentDetails.rows[0];
}

router.post('/register-patient', async (req, res) => {
  const payload = req.body || {};
  const {
    name,
    age,
    gender,
    father_name,
    marital_status,
    contact,
    email,
    address,
    cnic,
    occupation,
    nationality,
  } = payload;
  const { clinic_id } = req.scope;

  try {
    requireFields(
      { ...payload, clinic_id },
      ['name', 'age', 'gender', 'father_name', 'marital_status', 'contact', 'email', 'address', 'cnic', 'nationality', 'clinic_id']
    );
    assertEmail(email);
    assertPhone(contact);
    assertCnic(cnic);

    const existing = await query(
      `SELECT id,
              ${PATIENT_ID_SQL} AS registration_number
       FROM patients p
       WHERE contact = $1 OR email = $2 OR cnic = $3`,
      [contact, email, cnic]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        detail: `Patient already exists. Search and book using patient ID ${existing.rows[0].registration_number}.`,
      });
    }

    const result = await transaction(async (client) => {
      const patientRes = await client.query(
        `INSERT INTO patients (name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality]
      );
      const patient = {
        ...patientRes.rows[0],
        registration_number: formatPatientRegistrationNumber(patientRes.rows[0].id),
      };
      const appointment = await createClinicAppointment(client, clinic_id, patientRes.rows[0].id);

      return { patient, appointment };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/book-appointment', async (req, res) => {
  const { patient_id } = req.body || {};
  const { clinic_id } = req.scope;

  try {
    requireFields({ patient_id }, ['patient_id']);

    const result = await transaction(async (client) => {
      const patient = await findPatientById(client, patient_id);
      if (!patient) {
        const error = new Error('Patient not found');
        error.status = 404;
        throw error;
      }

      const appointment = await createClinicAppointment(client, clinic_id, patient_id);
      return { patient, appointment };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/patients', async (req, res) => {
  const { query: search = '' } = req.query;

  try {
    const params = [];
    let sql = `
      SELECT p.*,
             ${PATIENT_ID_SQL} AS registration_number,
             latest_visit.last_visit,
             latest_visit.last_clinic_name,
             latest_visit.last_company_name
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT a.created_at AS last_visit, cl.name AS last_clinic_name, co.name AS last_company_name
        FROM appointments a
        JOIN clinics cl ON a.clinic_id = cl.id
        JOIN companies co ON cl.company_id = co.id
        WHERE a.patient_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 1
      ) latest_visit ON TRUE
      WHERE 1 = 1
    `;

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(p.name) LIKE $${params.length}
        OR LOWER(p.contact) LIKE $${params.length}
        OR LOWER(p.email) LIKE $${params.length}
        OR LOWER(p.cnic) LIKE $${params.length}
        OR CAST(p.id AS TEXT) LIKE $${params.length}
        OR LOWER(${PATIENT_ID_SQL}) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY p.updated_at DESC, p.name';
    const result = await query(sql, params);
    res.json({ patients: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/patient/:patient_id', async (req, res) => {
  const { patient_id } = req.params;
  const payload = req.body || {};
  const {
    name,
    age,
    gender,
    father_name,
    marital_status,
    contact,
    email,
    address,
    cnic,
    occupation,
    nationality,
  } = payload;
  const { clinic_id } = req.scope;

  try {
    requireFields(payload, ['name', 'age', 'gender', 'father_name', 'marital_status', 'contact', 'email', 'address', 'cnic', 'nationality']);
    assertEmail(email);
    assertPhone(contact);
    assertCnic(cnic);

    const patient = await query('SELECT id FROM patients WHERE id = $1', [patient_id]);
    if (patient.rows.length === 0) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const duplicate = await query(
      `SELECT id
       FROM patients
       WHERE id <> $1 AND (contact = $2 OR email = $3 OR cnic = $4)`,
      [patient_id, contact, email, cnic]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ detail: 'Another patient already uses this contact, email, or CNIC' });
    }

    const result = await query(
      `UPDATE patients
       SET name = $1,
           age = $2,
           gender = $3,
           father_name = $4,
           marital_status = $5,
           contact = $6,
           email = $7,
           address = $8,
           cnic = $9,
           occupation = $10,
           nationality = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality, patient_id]
    );
    res.json({ success: true, patient: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/appointments', async (req, res) => {
  const { status = 'all' } = req.query;
  const { clinic_id } = req.scope;

  try {
    const params = [clinic_id];
    let sql = `
      SELECT a.*, p.name AS patient_name, p.contact AS patient_contact,
             p.email AS patient_email,
             ${PATIENT_ID_SQL} AS patient_registration_number,
             d.name AS doctor_name,
             cl.name AS clinic_name,
             co.name AS company_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN clinics cl ON a.clinic_id = cl.id
      JOIN companies co ON cl.company_id = co.id
      WHERE a.clinic_id = $1
    `;
    if (status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    sql += ' ORDER BY a.created_at DESC';
    const result = await query(sql, params);
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/get-diagnoses', async (req, res) => {
  const { clinic_id } = req.scope;

  try {
    const result = await query(
      `SELECT a.*, p.name AS patient_name, p.email AS patient_email,
             p.contact AS patient_contact, d.name AS doctor_name,
             cl.name AS clinic_name, co.name AS company_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN clinics cl ON a.clinic_id = cl.id
      JOIN companies co ON cl.company_id = co.id
      WHERE a.status = 'completed' AND a.diagnosis <> '' AND a.clinic_id = $1
      ORDER BY a.ended_at DESC`,
      [clinic_id]
    );
    res.json({ diagnoses: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/email-diagnosis', async (req, res) => {
  const { appointment_id } = req.body || {};
  const { clinic_id } = req.scope;

  try {
    const result = await query(
      `SELECT a.*, p.name AS patient_name, p.email, p.contact AS patient_contact,
              ${PATIENT_ID_SQL} AS patient_registration_number,
              d.name AS doctor_name,
              cl.name AS clinic_name,
              co.name AS company_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN clinics cl ON a.clinic_id = cl.id
       JOIN companies co ON cl.company_id = co.id
       WHERE a.id = $1 AND a.clinic_id = $2`,
      [appointment_id, clinic_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Appointment not found in your clinic' });

    const appointment = result.rows[0];
    if (!appointment.email) {
      return res.status(400).json({ detail: 'This patient does not have an email address saved' });
    }
    if (appointment.status !== 'completed' || !appointment.diagnosis) {
      return res.status(400).json({ detail: 'The diagnosis summary is only available after consultation is completed' });
    }

    await sendAppEmail({
      to: appointment.email,
      subject: `${getCompanyDisplayName(appointment.company_name)} Diagnosis Summary - Ticket #${appointment.ticket_no}`,
      html: buildDiagnosisEmailHtml(appointment),
    });

    res.json({ success: true, message: `Diagnosis summary sent to ${appointment.email}` });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/complaints', async (req, res) => {
  const { status = 'all' } = req.query;
  const { clinic_id } = req.scope;

  try {
    const params = [clinic_id];
    let sql = `
      SELECT cc.*, p.name AS patient_name, r.name AS receptionist_name,
             resolver.name AS resolved_by_receptionist_name
      FROM clinic_complaints cc
      LEFT JOIN patients p ON cc.patient_id = p.id
      LEFT JOIN receptionists r ON cc.receptionist_id = r.id
      LEFT JOIN receptionists resolver ON cc.resolved_by_receptionist_id = resolver.id
      WHERE cc.clinic_id = $1
    `;
    if (status !== 'all') {
      params.push(status);
      sql += ` AND cc.status = $${params.length}`;
    }
    sql += ' ORDER BY cc.created_at DESC';
    const result = await query(sql, params);
    res.json({ complaints: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/complaints', async (req, res) => {
  const { patient_id = null, complaint_type = 'general', title, description } = req.body || {};
  const { clinic_id, receptionist_id } = req.scope;

  try {
    requireFields({ clinic_id, title, description }, ['clinic_id', 'title', 'description']);
    const result = await query(
      `INSERT INTO clinic_complaints (clinic_id, patient_id, receptionist_id, complaint_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clinic_id, patient_id, receptionist_id, complaint_type, title, description]
    );
    res.json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/complaints/:complaint_id/status', async (req, res) => {
  const { complaint_id } = req.params;
  const { status, resolution_note = '', escalated_to_admin = false, escalation_note = '' } = req.body || {};
  const { clinic_id, receptionist_id } = req.scope;

  try {
    requireFields({ status }, ['status']);
    const complaint = await query(
      'SELECT id, title FROM clinic_complaints WHERE id = $1 AND clinic_id = $2',
      [complaint_id, clinic_id]
    );
    if (complaint.rows.length === 0) {
      return res.status(404).json({ detail: 'Complaint not found in your clinic' });
    }

    const result = await query(
      `UPDATE clinic_complaints
       SET status = $1,
           resolution_note = $2,
           resolved_by_role = 'receptionist',
           resolved_by_receptionist_id = $3,
           escalated_to_admin = $4,
           escalated_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE escalated_at END,
           escalation_note = CASE WHEN $4 THEN $5 ELSE escalation_note END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [status, resolution_note, receptionist_id, escalated_to_admin, escalation_note || null, complaint_id]
    );

    if (escalated_to_admin) {
      const admins = await query(
        `SELECT a.id
         FROM admins a
         JOIN admin_regions ar ON a.id = ar.admin_id
         JOIN clinics cl ON cl.company_id = a.company_id
         JOIN cities ci ON cl.city_id = ci.id
         WHERE cl.id = $1 AND ar.region_id = ci.region_id`,
        [clinic_id]
      );

      for (const admin of admins.rows) {
        await query(
          `INSERT INTO notifications (type, recipient_type, recipient_id, clinic_id, receptionist_id, title, message)
           VALUES ($1, 'admin', $2, $3, $4, $5, $6)`,
          [
            'complaint_escalated',
            admin.id,
            clinic_id,
            receptionist_id,
            'Complaint escalated by receptionist',
            escalation_note || `Complaint "${complaint.rows[0].title}" was escalated for admin review.`,
          ]
        );
      }
    }

    res.json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/doctor-unavailability-requests', async (req, res) => {
  const { status = 'all' } = req.query;
  const { clinic_id } = req.scope;

  try {
    const params = [clinic_id];
    let sql = `
      SELECT dur.*, d.name AS doctor_name
      FROM doctor_unavailability_requests dur
      JOIN doctors d ON dur.doctor_id = d.id
      WHERE d.clinic_id = $1
    `;
    if (status !== 'all') {
      params.push(status);
      sql += ` AND dur.status = $${params.length}`;
    }
    sql += ' ORDER BY dur.created_at DESC';
    const result = await query(sql, params);
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/unavailability-request/:request_id/forward', async (req, res) => {
  const { request_id } = req.params;
  const { receptionist_comment = '' } = req.body || {};
  const { clinic_id, receptionist_id } = req.scope;

  try {
    const requestResult = await query(
      `SELECT dur.id, dur.reason, d.id AS doctor_id, d.name AS doctor_name, cl.name AS clinic_name, ci.region_id
       FROM doctor_unavailability_requests dur
       JOIN doctors d ON dur.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       WHERE dur.id = $1 AND cl.id = $2`,
      [request_id, clinic_id]
    );
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Request not found in your clinic' });
    }

    const result = await query(
      `UPDATE doctor_unavailability_requests
       SET receptionist_status = 'forwarded',
           receptionist_comment = $1,
           receptionist_id = $2,
           forwarded_to_admin_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [receptionist_comment, receptionist_id, request_id]
    );

    const admins = await query(
      `SELECT a.id
       FROM admins a
       JOIN admin_regions ar ON a.id = ar.admin_id
       JOIN doctors d ON d.id = $1
       JOIN clinics cl ON d.clinic_id = cl.id
       WHERE a.company_id = cl.company_id
         AND ar.region_id = (SELECT ci.region_id FROM cities ci WHERE ci.id = cl.city_id)`,
      [requestResult.rows[0].doctor_id]
    );

    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (type, recipient_type, recipient_id, doctor_id, receptionist_id, clinic_id, clinic_name, title, message)
         VALUES ($1, 'admin', $2, $3, $4, $5, $6, $7, $8)`,
        [
          'doctor_unavailability_forwarded',
          admin.id,
          requestResult.rows[0].doctor_id,
          receptionist_id,
          clinic_id,
          requestResult.rows[0].clinic_name,
          'Doctor unavailability needs approval',
          receptionist_comment || `${requestResult.rows[0].doctor_name}'s request was reviewed by the receptionist and is ready for admin confirmation.`,
        ]
      );
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

module.exports = router;
