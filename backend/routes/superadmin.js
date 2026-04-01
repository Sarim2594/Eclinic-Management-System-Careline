const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, transaction } = require('../db');

const hashPassword = (p) => crypto.createHash('sha256').update(p).digest('hex');

// ============================================================================
// SUPERADMIN ROUTES — all missing fields fixed
// ============================================================================

/** GET /api/superadmin/dashboard — fixed to include all 4 stats */
router.get('/dashboard', async (req, res) => {
  try {
    const [companies, admins, clinics, doctors, patients, appointments] = await Promise.all([
      query('SELECT COUNT(*) AS cnt FROM companies'),
      query('SELECT COUNT(*) AS cnt FROM admins'),
      query('SELECT COUNT(*) AS cnt FROM clinics'),
      query('SELECT COUNT(*) AS cnt FROM doctors'),
      query('SELECT COUNT(*) AS cnt FROM patients'),
      query('SELECT COUNT(*) AS cnt FROM appointments'),
    ]);
    res.json({
      total_companies:    parseInt(companies.rows[0].cnt),
      total_admins:       parseInt(admins.rows[0].cnt),
      total_clinics:      parseInt(clinics.rows[0].cnt),
      total_doctors:      parseInt(doctors.rows[0].cnt),
      total_patients:     parseInt(patients.rows[0].cnt),
      total_appointments: parseInt(appointments.rows[0].cnt),
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/superadmin/companies — includes admin_count + clinic_count */
router.get('/companies', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              COUNT(DISTINCT cl.id) AS clinic_count,
              COUNT(DISTINCT a.id)  AS admin_count
       FROM companies c
       LEFT JOIN clinics cl ON cl.company_id = c.id
       LEFT JOIN admins  a  ON a.company_id  = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ companies: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/company/:company_id/clinics', async (req, res) => {
  const { company_id } = req.params;
  try {
    const result = await query(
      `SELECT cl.*, ci.name AS city_name, r.province
       FROM clinics cl
       JOIN cities  ci ON cl.city_id  = ci.id
       JOIN regions r  ON ci.region_id = r.id
       WHERE cl.company_id=$1 ORDER BY cl.name`,
      [company_id]
    );
    res.json({ clinics: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/company/:company_id/admins-with-regions', async (req, res) => {
  const { company_id } = req.params;
  try {
    const result = await query(
      `SELECT a.*,
              json_agg(json_build_object(
                'region_id', r.id, 'province', r.province, 'sub_region', r.sub_region
              )) FILTER (WHERE r.id IS NOT NULL) AS regions
       FROM admins a
       LEFT JOIN admin_regions ar ON ar.admin_id = a.id
       LEFT JOIN regions r        ON r.id = ar.region_id
       WHERE a.company_id=$1
       GROUP BY a.id ORDER BY a.name`,
      [company_id]
    );
    res.json({ admins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/register-company', async (req, res) => {
  const { name, email, contact, registration_number, address, subscription_plan } = req.body;
  try {
    const existing = await query(
      'SELECT id FROM companies WHERE email=$1 OR registration_number=$2',
      [email, registration_number]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ detail: 'Company with this email or registration number already exists' });
    const result = await query(
      `INSERT INTO companies (name,email,contact,registration_number,address,subscription_plan)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, email, contact, registration_number, address, subscription_plan]
    );
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/company/:company_id/status', async (req, res) => {
  const { company_id } = req.params;
  const { status } = req.body;
  try {
    const result = await query(
      `UPDATE companies SET status=$1 WHERE id=$2 RETURNING *`,
      [status, company_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Company not found' });
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/superadmin/admins — includes username + email via users JOIN */
router.get('/admins', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.username, u.email, c.name AS company_name,
              json_agg(json_build_object(
                'region_id', r.id, 'province', r.province, 'sub_region', r.sub_region
              )) FILTER (WHERE r.id IS NOT NULL) AS regions
       FROM admins    a
       JOIN users     u  ON a.user_id    = u.id
       JOIN companies c  ON a.company_id = c.id
       LEFT JOIN admin_regions ar ON ar.admin_id  = a.id
       LEFT JOIN regions       r  ON r.id = ar.region_id
       GROUP BY a.id, u.username, u.email, c.name
       ORDER BY a.name`
    );
    res.json({ admins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/create-admin', async (req, res) => {
  const { username, email, password, name, contact, company_id, region_ids = [] } = req.body;
  try {
    const result = await transaction(async (client) => {
      const uRes = await client.query(
        `INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,'admin') RETURNING id`,
        [username, email, hashPassword(password)]
      );
      const aRes = await client.query(
        `INSERT INTO admins (user_id,company_id,name,contact) VALUES ($1,$2,$3,$4) RETURNING id`,
        [uRes.rows[0].id, company_id, name, contact]
      );
      const admin_id = aRes.rows[0].id;
      for (const region_id of region_ids) {
        await client.query(
          'INSERT INTO admin_regions (admin_id,region_id) VALUES ($1,$2)',
          [admin_id, region_id]
        );
      }
      return { user_id: uRes.rows[0].id, admin_id };
    });
    res.json({ success: true, ...result, message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/admin/:admin_id/regions', async (req, res) => {
  const { admin_id } = req.params;
  try {
    const result = await query(
      `SELECT r.* FROM regions r
       JOIN admin_regions ar ON ar.region_id = r.id
       WHERE ar.admin_id=$1`,
      [admin_id]
    );
    res.json({ regions: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/admin/:admin_id/regions', async (req, res) => {
  const { admin_id } = req.params;
  const { region_ids = [] } = req.body;
  try {
    await transaction(async (client) => {
      await client.query('DELETE FROM admin_regions WHERE admin_id=$1', [admin_id]);
      for (const region_id of region_ids) {
        await client.query(
          'INSERT INTO admin_regions (admin_id,region_id) VALUES ($1,$2)',
          [admin_id, region_id]
        );
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/admin/:admin_id/contact', async (req, res) => {
  const { admin_id } = req.params;
  const { contact } = req.body;
  try {
    const result = await query(
      'UPDATE admins SET contact=$1 WHERE id=$2 RETURNING *',
      [contact, admin_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Admin not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete('/admin/:admin_id', async (req, res) => {
  const { admin_id } = req.params;
  try {
    const aRes = await query('SELECT user_id FROM admins WHERE id=$1', [admin_id]);
    if (aRes.rows.length === 0) return res.status(404).json({ detail: 'Admin not found' });
    // Deleting the user cascades to the admins row via FK
    await query('DELETE FROM users WHERE id=$1', [aRes.rows[0].user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/superadmin/analytics — fixed column aliases */
router.get('/analytics', async (req, res) => {
  try {
    const [byCompany, byRegion, monthly] = await Promise.all([
      query(
        `SELECT c.name AS company,
                COUNT(DISTINCT cl.id) AS total_clinics,
                COUNT(DISTINCT d.id)  AS total_doctors,
                COUNT(DISTINCT p.id)  AS total_patients,
                COUNT(DISTINCT a.id)  AS appointments
         FROM companies c
         LEFT JOIN clinics      cl ON cl.company_id = c.id
         LEFT JOIN doctors       d ON d.clinic_id   = cl.id
         LEFT JOIN appointments  a ON a.clinic_id   = cl.id
         LEFT JOIN patients      p ON p.id = a.patient_id
         GROUP BY c.id ORDER BY appointments DESC`
      ),
      query(
        `SELECT r.province, r.sub_region,
                COUNT(DISTINCT a.id) AS appointments
         FROM regions r
         LEFT JOIN cities      ci ON ci.region_id = r.id
         LEFT JOIN clinics     cl ON cl.city_id   = ci.id
         LEFT JOIN appointments a ON a.clinic_id  = cl.id
         GROUP BY r.id ORDER BY appointments DESC`
      ),
      query(
        `SELECT DATE_TRUNC('month', created_at) AS month,
                COUNT(*) AS appointments
         FROM appointments
         WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY month ORDER BY month`
      ),
    ]);
    res.json({
      by_company:     byCompany.rows,
      by_region:      byRegion.rows,
      monthly_trend:  monthly.rows,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/change-requests', async (req, res) => {
  try {
    const result = await query(
      `SELECT cr.*, a.name AS admin_name, c.name AS company_name
       FROM admin_change_requests cr
       JOIN admins    a ON cr.admin_id   = a.id
       JOIN companies c ON a.company_id  = c.id
       WHERE cr.status = 'pending'
       ORDER BY cr.created_at DESC`
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/change-request/:request_id/approve', async (req, res) => {
  const { request_id } = req.params;
  try {
    const crRes = await query('SELECT * FROM admin_change_requests WHERE id=$1', [request_id]);
    if (crRes.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    const cr = crRes.rows[0];

    if (cr.request_type === 'password_reset') {
      const aRes = await query('SELECT user_id FROM admins WHERE id=$1', [cr.admin_id]);
      await query('UPDATE users SET password=$1 WHERE id=$2', [hashPassword(cr.requested_data), aRes.rows[0].user_id]);
    } else if (cr.request_type === 'contact_change') {
      await query('UPDATE admins SET contact=$1 WHERE id=$2', [cr.requested_data, cr.admin_id]);
    }

    await query(
      `UPDATE admin_change_requests SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [request_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/change-request/:request_id/reject', async (req, res) => {
  const { request_id } = req.params;
  const { reason = 'No reason provided' } = req.body;
  try {
    await query(
      `UPDATE admin_change_requests
       SET status='rejected', rejection_reason=$1, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2`,
      [reason, request_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/regions/lookup/:city', async (req, res) => {
  const { city } = req.params;
  try {
    const result = await query(
      `SELECT r.province, r.sub_region, ci.name AS city
       FROM cities ci JOIN regions r ON ci.region_id = r.id
       WHERE LOWER(ci.name) = LOWER($1)`,
      [city]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ detail: `City '${city}' not found` });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/regions/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id AS region_id, r.province, r.sub_region,
              json_agg(json_build_object('id', ci.id, 'name', ci.name) ORDER BY ci.name) AS cities
       FROM regions r
       LEFT JOIN cities ci ON ci.region_id = r.id
       GROUP BY r.id ORDER BY r.province, r.sub_region`
    );

    // Also return grouped format { Province: [{id, sub_region}] }
    const grouped = {};
    result.rows.forEach(r => {
      if (!grouped[r.province]) grouped[r.province] = [];
      grouped[r.province].push({ id: r.region_id, sub_region: r.sub_region, cities: r.cities });
    });

    res.json({ regions: result.rows, grouped, success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;