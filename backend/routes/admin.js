const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, transaction } = require('../db');

const hashPassword = (p) => crypto.createHash('sha256').update(p).digest('hex');

// ============================================================================
// ADMIN ROUTES — all missing fields fixed
// ============================================================================

// ── 1. DASHBOARD & STATS ─────────────────────────────────────────────────────

/** GET /api/admin/statistics */
router.get('/statistics', async (req, res) => {
  const { company_id, admin_id } = req.query;
  try {
    let regionJoin   = '';
    let regionFilter = '';
    const params = [];

    if (admin_id) {
      params.push(admin_id);
      regionJoin   = `JOIN cities ci ON cl.city_id = ci.id`;
      regionFilter = `AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    if (company_id) {
      params.push(company_id);
      regionFilter += ` AND cl.company_id = $${params.length}`;
    }

    const baseJoin = admin_id ? regionJoin : `JOIN cities ci ON cl.city_id = ci.id`;
    const filt = regionFilter;

    const [clRes, docRes, recRes, apptRes, queueRes] = await Promise.all([
      query(`SELECT COUNT(DISTINCT cl.id) AS cnt FROM clinics cl ${baseJoin} WHERE cl.status='active' ${filt}`, params),
      query(`SELECT COUNT(DISTINCT d.id)  AS cnt FROM doctors d JOIN clinics cl ON d.clinic_id=cl.id ${baseJoin} WHERE 1=1 ${filt}`, params),
      query(`SELECT COUNT(DISTINCT r.id)  AS cnt FROM receptionists r JOIN clinics cl ON r.clinic_id=cl.id ${baseJoin} WHERE 1=1 ${filt}`, params),
      query(`SELECT COUNT(DISTINCT a.id)  AS cnt FROM appointments a JOIN clinics cl ON a.clinic_id=cl.id ${baseJoin} WHERE 1=1 ${filt}`, params),
      query(`SELECT COUNT(DISTINCT a.id)  AS cnt FROM appointments a JOIN clinics cl ON a.clinic_id=cl.id ${baseJoin} WHERE a.status='waiting' ${filt}`, params),
    ]);

    res.json({
      total_clinics:       parseInt(clRes.rows[0].cnt),
      total_doctors:       parseInt(docRes.rows[0].cnt),
      total_receptionists: parseInt(recRes.rows[0].cnt),
      total_appointments:  parseInt(apptRes.rows[0].cnt),
      // For dashboard stat cards
      total_patients: parseInt(apptRes.rows[0].cnt),
      active_queue:   parseInt(queueRes.rows[0].cnt),
    });
  } catch (err) {
    console.error('[admin/statistics]', err.message);
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/receptionists — includes username + email via users JOIN */
router.get('/receptionists', async (req, res) => {
  const { company_id, admin_id } = req.query;
  try {
    let sql = `
      SELECT r.*, u.username, u.email,
             cl.name AS clinic_name,
             ci.name AS city_name
      FROM receptionists r
      JOIN users   u  ON r.user_id   = u.id
      JOIN clinics cl ON r.clinic_id = cl.id
      JOIN cities  ci ON cl.city_id  = ci.id
      WHERE 1=1
    `;
    const params = [];
    if (company_id) { params.push(company_id); sql += ` AND cl.company_id = $${params.length}`; }
    if (admin_id)   { params.push(admin_id);   sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`; }
    sql += ' ORDER BY r.name';
    const result = await query(sql, params);
    res.json({ receptionists: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/doctors — includes username + email via users JOIN */
router.get('/doctors', async (req, res) => {
  const { company_id, admin_id } = req.query;
  try {
    let sql = `
      SELECT d.*, u.username, u.email,
             cl.name  AS clinic_name,
             s.name   AS specialization,
             ci.name  AS city_name,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'waiting')  AS current_queue,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'completed') AS attended
      FROM doctors  d
      JOIN users     u  ON d.user_id      = u.id
      JOIN clinics   cl ON d.clinic_id    = cl.id
      LEFT JOIN specializations s ON d.specialization_id = s.id
      JOIN cities    ci ON cl.city_id     = ci.id
      WHERE 1=1
    `;
    const params = [];
    if (company_id) { params.push(company_id); sql += ` AND cl.company_id = $${params.length}`; }
    if (admin_id)   { params.push(admin_id);   sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`; }
    sql += ' ORDER BY d.name';
    const result = await query(sql, params);
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/clinics-breakdown — clinic stats for dashboard table */
router.get('/clinics-breakdown', async (req, res) => {
  const { company_id, admin_id } = req.query;
  try {
    let sql = `
      SELECT cl.id, cl.name, cl.status,
             ci.name AS city_name,
             COUNT(DISTINCT d.id)  AS doctor_count,
             COUNT(DISTINCT r.id)  AS receptionist_count,
             COUNT(DISTINCT CASE WHEN a.status = 'waiting'   THEN a.id END) AS waiting_count,
             COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) AS patient_count
      FROM clinics cl
      JOIN cities ci ON cl.city_id = ci.id
      LEFT JOIN doctors       d ON d.clinic_id = cl.id
      LEFT JOIN receptionists r ON r.clinic_id = cl.id
      LEFT JOIN appointments  a ON a.clinic_id = cl.id
      WHERE cl.status = 'active'
    `;
    const params = [];
    if (company_id) { params.push(company_id); sql += ` AND cl.company_id = $${params.length}`; }
    if (admin_id)   { params.push(admin_id);   sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`; }
    sql += ' GROUP BY cl.id, cl.name, cl.status, ci.name ORDER BY cl.name';
    const result = await query(sql, params);
    res.json({ clinics: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/available-doctors */
router.get('/available-doctors', async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, cl.name AS clinic_name,
              av.end_time AS shift_end,
              (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'waiting') AS current_queue
       FROM doctors d
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN availability_schedules av ON av.doctor_id = d.id
       WHERE av.is_active = TRUE
         AND av.day_of_week % 7 = EXTRACT(DOW FROM CURRENT_DATE)
       ORDER BY d.name`
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/unavailable-doctors */
router.get('/unavailable-doctors', async (req, res) => {
  const { admin_id } = req.query;
  try {
    let sql = `
      SELECT d.*, cl.name AS clinic_name,
             dur.start_datetime AS unavailable_from,
             dur.end_datetime   AS unavailable_until,
             dur.reason
      FROM doctors d
      JOIN clinics cl ON d.clinic_id = cl.id
      JOIN cities  ci ON cl.city_id  = ci.id
      LEFT JOIN doctor_unavailability_requests dur
        ON dur.doctor_id = d.id AND dur.status = 'approved'
           AND dur.start_datetime <= NOW() AND dur.end_datetime >= NOW()
      WHERE d.status = 'inactive'
    `;
    const params = [];
    if (admin_id) { params.push(admin_id); sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`; }
    const result = await query(sql, params);
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── 2. STAFF CREATION ────────────────────────────────────────────────────────

/** POST /api/admin/create-receptionist */
router.post('/create-receptionist', async (req, res) => {
  const { username, email, password, name, contact, clinic_id } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ detail: 'Username or email already exists' });

    const result = await transaction(async (client) => {
      const uRes = await client.query(
        `INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,'receptionist') RETURNING id`,
        [username, email, hashPassword(password)]
      );
      const rRes = await client.query(
        `INSERT INTO receptionists (user_id,clinic_id,name,contact) VALUES ($1,$2,$3,$4) RETURNING id`,
        [uRes.rows[0].id, clinic_id, name, contact]
      );
      return { user_id: uRes.rows[0].id, receptionist_id: rRes.rows[0].id };
    });
    res.json({ success: true, ...result, message: 'Receptionist created successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** POST /api/admin/create-doctor */
router.post('/create-doctor', async (req, res) => {
  const { username, email, password, name, contact, clinic_id,
          license_number, specialization_id, startTimes, endTimes } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ detail: 'Username or email already exists' });

    const licCheck = await query('SELECT id FROM doctors WHERE license_number=$1', [license_number]);
    if (licCheck.rows.length > 0)
      return res.status(400).json({ detail: 'License number already exists' });

    const result = await transaction(async (client) => {
      const uRes = await client.query(
        `INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,'doctor') RETURNING id`,
        [username, email, hashPassword(password)]
      );
      const dRes = await client.query(
        `INSERT INTO doctors (user_id,clinic_id,name,specialization_id,license_number,contact)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [uRes.rows[0].id, clinic_id, name, specialization_id, license_number, contact]
      );
      const doctor_id = dRes.rows[0].id;

      // Insert availability for each day
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      for (let i = 0; i < 7; i++) {
        const start = startTimes?.[i] || null;
        const end   = endTimes?.[i]   || null;
        await client.query(
          `INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time, is_active)
           VALUES ($1, $2, $3, $4, FALSE)`,
          [doctor_id, i + 1, start, end]
        );
      }
      return { user_id: uRes.rows[0].id, doctor_id };
    });
    res.json({ success: true, ...result, message: 'Doctor created successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── 3. CLINIC MANAGEMENT ─────────────────────────────────────────────────────

/** POST /api/admin/create-clinic */
router.post('/create-clinic', async (req, res) => {
  const { company_id, name, location, city_id } = req.body;
  try {
    const result = await query(
      `INSERT INTO clinics (company_id,name,location,city_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [company_id, name, location, city_id]
    );
    res.json({ success: true, clinic: result.rows[0], clinic_id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** POST /api/admin/transfer-doctor */
router.post('/transfer-doctor', async (req, res) => {
  const { doctor_id, new_clinic_id } = req.body;
  try {
    const result = await query(
      `UPDATE doctors SET clinic_id=$1 WHERE id=$2 RETURNING *`,
      [new_clinic_id, doctor_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ detail: 'Doctor not found' });
    res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── 4. SCHEDULING & MONITORING ───────────────────────────────────────────────

/** PUT /api/admin/update-availability/:doctor_id */
router.put('/update-availability/:doctor_id', async (req, res) => {
  const { doctor_id } = req.params;
  const { day_of_week, startTime, endTime } = req.body;
  try {
    const result = await query(
      `UPDATE availability_schedules
       SET start_time=$1, end_time=$2, updated_at=CURRENT_TIMESTAMP
       WHERE doctor_id=$3 AND day_of_week=$4
       RETURNING *`,
      [startTime || null, endTime || null, doctor_id, day_of_week]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ detail: 'Schedule entry not found' });
    res.json({ success: true, schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/admin/monitor-doctors */
router.get('/monitor-doctors', async (req, res) => {
  try {
    const result = await query(
      `SELECT d.id, d.name, d.status, cl.name AS clinic_name,
              COUNT(a.id) FILTER (WHERE a.status='waiting') AS queue_length
       FROM doctors d
       JOIN clinics cl ON d.clinic_id = cl.id
       LEFT JOIN appointments a ON a.doctor_id = d.id
       GROUP BY d.id, d.name, d.status, cl.name
       ORDER BY queue_length DESC`
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── 5. BULLETIN MANAGEMENT ───────────────────────────────────────────────────

/** POST /api/admin/post-bulletin */
router.post('/post-bulletin', async (req, res) => {
  const { admin_id, title, message } = req.body;
  try {
    // Get company_id from admin
    const adminRes = await query('SELECT company_id FROM admins WHERE id=$1', [admin_id]);
    if (adminRes.rows.length === 0)
      return res.status(404).json({ detail: 'Admin not found' });
    const company_id = adminRes.rows[0].company_id;

    const result = await query(
      `INSERT INTO bulletins (company_id,title,message) VALUES ($1,$2,$3) RETURNING *`,
      [company_id, title, message]
    );
    res.json({ success: true, bulletin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** DELETE /api/admin/delete-bulletin/:bulletin_id */
router.delete('/delete-bulletin/:bulletin_id', async (req, res) => {
  const { bulletin_id } = req.params;
  const { admin_id } = req.query;
  try {
    const check = await query(
      `SELECT b.id FROM bulletins b
       JOIN admins a ON b.company_id = a.company_id
       WHERE b.id=$1 AND a.id=$2`,
      [bulletin_id, admin_id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ detail: 'Unauthorized or bulletin not found' });
    await query(`UPDATE bulletins SET active=FALSE WHERE id=$1`, [bulletin_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── 6. CHANGE REQUESTS ───────────────────────────────────────────────────────

router.post('/request-password-change', async (req, res) => {
  const { admin_id, new_password } = req.body;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id,request_type,requested_data) VALUES ($1,'password_reset',$2)`,
      [admin_id, new_password]
    );
    res.json({ success: true, message: 'Password change request submitted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/request-contact-change', async (req, res) => {
  const { admin_id, new_contact } = req.body;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id,request_type,requested_data) VALUES ($1,'contact_change',$2)`,
      [admin_id, new_contact]
    );
    res.json({ success: true, message: 'Contact change request submitted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/request-general-query', async (req, res) => {
  const { admin_id, query: queryText, reason } = req.body;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id,request_type,requested_data,reason) VALUES ($1,'general_query',$2,$3)`,
      [admin_id, queryText, reason]
    );
    res.json({ success: true, message: 'Query submitted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ── 7. UNAVAILABILITY ────────────────────────────────────────────────────────

router.get('/doctor-unavailability-requests', async (req, res) => {
  const { admin_id } = req.query;
  if (!admin_id) return res.status(400).json({ detail: 'admin_id required' });
  try {
    const result = await query(
      `SELECT dur.*, d.name AS doctor_name, cl.name AS clinic_name
       FROM doctor_unavailability_requests dur
       JOIN doctors  d  ON dur.doctor_id  = d.id
       JOIN clinics  cl ON d.clinic_id    = cl.id
       JOIN cities   ci ON cl.city_id     = ci.id
       WHERE dur.status = 'pending'
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id=$1)
       ORDER BY dur.created_at DESC`,
      [admin_id]
    );
    res.json({ requests: result.rows });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.put('/unavailability-request/:request_id/approve', async (req, res) => {
  const { request_id } = req.params;
  const { admin_comment = '' } = req.query;
  try {
    const result = await query(
      `UPDATE doctor_unavailability_requests
       SET status='approved', admin_comment=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 RETURNING *`,
      [admin_comment, request_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    res.json({ success: true, request: result.rows[0] });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.put('/unavailability-request/:request_id/reject', async (req, res) => {
  const { request_id } = req.params;
  const { reason = '' } = req.body;
  try {
    const result = await query(
      `UPDATE doctor_unavailability_requests
       SET status='rejected', admin_comment=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 RETURNING *`,
      [reason, request_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ── 8. UTILITIES ─────────────────────────────────────────────────────────────

router.get('/cities', async (req, res) => {
  const { admin_id } = req.query;
  try {
    let sql = `
      SELECT ci.id, ci.name, r.id AS region_id, r.province, r.sub_region
      FROM cities ci JOIN regions r ON ci.region_id = r.id WHERE 1=1
    `;
    const params = [];
    if (admin_id) { params.push(admin_id); sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id=$${params.length})`; }
    sql += ' ORDER BY r.province, r.sub_region, ci.name';
    const result = await query(sql, params);

    // Also return grouped format for dropdowns
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.province]) grouped[row.province] = {};
      if (!grouped[row.province][row.sub_region]) grouped[row.province][row.sub_region] = [];
      grouped[row.province][row.sub_region].push({ id: row.id, name: row.name });
    });

    res.json({ cities: result.rows, grouped });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/doctor-schedule', async (req, res) => {
  const { doctor_id } = req.query;
  try {
    const result = await query(
      `SELECT * FROM availability_schedules WHERE doctor_id=$1 ORDER BY day_of_week`,
      [doctor_id]
    );
    res.json({ schedule: result.rows });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/specializations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM specializations ORDER BY name');
    res.json({ specializations: result.rows });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/clinic/:clinic_id/available-doctors', async (req, res) => {
  const { clinic_id } = req.params;
  try {
    const result = await query(
      `SELECT d.* FROM doctors d
       JOIN availability_schedules av ON av.doctor_id = d.id
       WHERE d.clinic_id=$1 AND av.is_active=TRUE AND d.status='active'`,
      [clinic_id]
    );
    res.json({ doctors: result.rows });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/transfer-patients', async (req, res) => {
  const { from_doctor_id, to_doctor_id } = req.query;
  try {
    const result = await query(
      `UPDATE appointments SET doctor_id=$1 WHERE doctor_id=$2 AND status='waiting' RETURNING id`,
      [to_doctor_id, from_doctor_id]
    );
    res.json({ success: true, transferred: result.rows.length });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;