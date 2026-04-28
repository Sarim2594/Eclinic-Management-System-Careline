const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { query, transaction } = require('../db');
const { requireFields, assertEmail, assertPhone } = require('../utils/validators');
const { hashPassword } = require('../utils/passwords');

async function generateRegistrationNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const value = `CL-${year}-${random}`;
    const existing = await query(
      'SELECT id FROM companies WHERE registration_number = $1',
      [value]
    );
    if (existing.rows.length === 0) return value;
  }

  const error = new Error('Failed to generate a unique registration number');
  error.status = 500;
  throw error;
}

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
      total_companies: parseInt(companies.rows[0].cnt, 10),
      total_admins: parseInt(admins.rows[0].cnt, 10),
      total_clinics: parseInt(clinics.rows[0].cnt, 10),
      total_doctors: parseInt(doctors.rows[0].cnt, 10),
      total_patients: parseInt(patients.rows[0].cnt, 10),
      total_appointments: parseInt(appointments.rows[0].cnt, 10),
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/company-registration-number', async (req, res) => {
  try {
    const registration_number = await generateRegistrationNumber();
    res.json({ registration_number });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/companies', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              COUNT(DISTINCT cl.id) AS clinic_count,
              COUNT(DISTINCT a.id) AS admin_count,
              COUNT(DISTINCT d.id) AS doctor_count,
              COUNT(DISTINCT ap.patient_id) AS patient_count
       FROM companies c
       LEFT JOIN clinics cl ON cl.company_id = c.id
       LEFT JOIN admins a ON a.company_id = c.id
       LEFT JOIN doctors d ON d.clinic_id = cl.id
       LEFT JOIN appointments ap ON ap.clinic_id = cl.id
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
      `SELECT cl.*, ci.name AS city_name, r.province, r.sub_region
       FROM clinics cl
       JOIN cities ci ON cl.city_id = ci.id
       JOIN regions r ON ci.region_id = r.id
       WHERE cl.company_id = $1
       ORDER BY cl.name`,
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
      `SELECT a.*, u.username, u.email,
              json_agg(json_build_object(
                'region_id', r.id,
                'province', r.province,
                'sub_region', r.sub_region
              )) FILTER (WHERE r.id IS NOT NULL) AS regions
       FROM admins a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN admin_regions ar ON ar.admin_id = a.id
       LEFT JOIN regions r ON r.id = ar.region_id
       WHERE a.company_id = $1
       GROUP BY a.id, u.username, u.email
       ORDER BY a.name`,
      [company_id]
    );
    res.json({ admins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/register-company', async (req, res) => {
  const payload = req.body || {};

  try {
    requireFields(payload, ['name', 'email', 'contact', 'address', 'subscription_plan']);
    assertEmail(payload.email);
    assertPhone(payload.contact);

    const registration_number = payload.registration_number || await generateRegistrationNumber();
    const existing = await query(
      'SELECT id FROM companies WHERE email = $1 OR registration_number = $2',
      [payload.email, registration_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'Company with this email or registration number already exists' });
    }

    const result = await query(
      `INSERT INTO companies (name, email, contact, registration_number, address, subscription_plan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.name.trim(),
        payload.email.trim().toLowerCase(),
        payload.contact.trim(),
        registration_number,
        payload.address.trim(),
        payload.subscription_plan,
      ]
    );

    res.json({
      success: true,
      company: result.rows[0],
      registration_number,
      message: 'Company registered successfully',
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/company/:company_id', async (req, res) => {
  const { company_id } = req.params;
  const { name, email, contact, address, subscription_plan } = req.body || {};

  try {
    requireFields({ name, email, contact, address, subscription_plan }, [
      'name',
      'email',
      'contact',
      'address',
      'subscription_plan',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const duplicate = await query(
      'SELECT id FROM companies WHERE email = $1 AND id <> $2',
      [email.trim().toLowerCase(), company_id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ detail: 'Another company already uses this email address' });
    }

    const result = await query(
      `UPDATE companies
       SET name = $1,
           email = $2,
           contact = $3,
           address = $4,
           subscription_plan = $5
       WHERE id = $6
       RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), contact.trim(), address.trim(), subscription_plan, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Company not found' });
    }

    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/company/:company_id/status', async (req, res) => {
  const { company_id } = req.params;
  const { status } = req.body;
  try {
    const result = await query(
      'UPDATE companies SET status = $1 WHERE id = $2 RETURNING *',
      [status, company_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Company not found' });
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.username, u.email, c.name AS company_name,
              json_agg(json_build_object(
                'region_id', r.id,
                'province', r.province,
                'sub_region', r.sub_region
              )) FILTER (WHERE r.id IS NOT NULL) AS regions
       FROM admins a
       JOIN users u ON a.user_id = u.id
       JOIN companies c ON a.company_id = c.id
       LEFT JOIN admin_regions ar ON ar.admin_id = a.id
       LEFT JOIN regions r ON r.id = ar.region_id
       GROUP BY a.id, u.username, u.email, c.name
       ORDER BY a.name`
    );
    res.json({ admins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/create-admin', async (req, res) => {
  const { username, email, password, name, contact, company_id, region_ids = [] } = req.body || {};

  try {
    requireFields({ username, email, password, name, contact, company_id }, [
      'username',
      'email',
      'password',
      'name',
      'contact',
      'company_id',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'Username or email already exists' });
    }

    const result = await transaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (username, email, password, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id`,
        [username.trim(), email.trim().toLowerCase(), await hashPassword(password)]
      );

      const adminRes = await client.query(
        `INSERT INTO admins (user_id, company_id, name, contact)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userRes.rows[0].id, company_id, name.trim(), contact.trim()]
      );

      for (const regionId of region_ids) {
        await client.query(
          'INSERT INTO admin_regions (admin_id, region_id) VALUES ($1, $2)',
          [adminRes.rows[0].id, regionId]
        );
      }

      return {
        user_id: userRes.rows[0].id,
        admin: adminRes.rows[0],
      };
    });

    res.json({ success: true, ...result, message: 'Admin created successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/admin/:admin_id', async (req, res) => {
  const { admin_id } = req.params;
  const { name, username, contact } = req.body || {};

  try {
    requireFields({ name, username }, ['name', 'username']);
    if (contact) assertPhone(contact);

    const adminRes = await query(
      'SELECT user_id FROM admins WHERE id = $1',
      [admin_id]
    );
    if (adminRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Admin not found' });
    }

    const duplicate = await query(
      'SELECT id FROM users WHERE username = $1 AND id <> $2',
      [username.trim(), adminRes.rows[0].user_id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ detail: 'Username already exists' });
    }

    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET username = $1 WHERE id = $2',
        [username.trim(), adminRes.rows[0].user_id]
      );

      await client.query(
        `UPDATE admins
         SET name = $1,
             contact = COALESCE($2, contact)
         WHERE id = $3`,
        [name.trim(), contact ? contact.trim() : null, admin_id]
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/admin/:admin_id/regions', async (req, res) => {
  const { admin_id } = req.params;
  try {
    const result = await query(
      `SELECT r.*
       FROM regions r
       JOIN admin_regions ar ON ar.region_id = r.id
       WHERE ar.admin_id = $1`,
      [admin_id]
    );
    res.json({ regions: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/admin/:admin_id/regions', async (req, res) => {
  const { admin_id } = req.params;
  const { region_ids = [] } = req.body || {};
  try {
    await transaction(async (client) => {
      await client.query('DELETE FROM admin_regions WHERE admin_id = $1', [admin_id]);
      for (const regionId of region_ids) {
        await client.query(
          'INSERT INTO admin_regions (admin_id, region_id) VALUES ($1, $2)',
          [admin_id, regionId]
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
  const { contact } = req.body || {};
  try {
    const result = await query(
      'UPDATE admins SET contact = $1 WHERE id = $2 RETURNING *',
      [contact, admin_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Admin not found' });
    res.json({ success: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete('/admin/:admin_id', async (req, res) => {
  const { admin_id } = req.params;
  try {
    const adminRes = await query('SELECT user_id FROM admins WHERE id = $1', [admin_id]);
    if (adminRes.rows.length === 0) return res.status(404).json({ detail: 'Admin not found' });

    await query('DELETE FROM users WHERE id = $1', [adminRes.rows[0].user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const [byCompany, byRegion, monthly] = await Promise.all([
      query(
        `SELECT c.name AS company,
                COUNT(DISTINCT cl.id) AS total_clinics,
                COUNT(DISTINCT d.id) AS total_doctors,
                COUNT(DISTINCT p.id) AS total_patients,
                COUNT(DISTINCT a.id) AS appointments
         FROM companies c
         LEFT JOIN clinics cl ON cl.company_id = c.id
         LEFT JOIN doctors d ON d.clinic_id = cl.id
         LEFT JOIN appointments a ON a.clinic_id = cl.id
         LEFT JOIN patients p ON p.id = a.patient_id
         GROUP BY c.id
         ORDER BY appointments DESC`
      ),
      query(
        `SELECT r.province, r.sub_region,
                COUNT(DISTINCT a.id) AS appointments
         FROM regions r
         LEFT JOIN cities ci ON ci.region_id = r.id
         LEFT JOIN clinics cl ON cl.city_id = ci.id
         LEFT JOIN appointments a ON a.clinic_id = cl.id
         GROUP BY r.id
         ORDER BY appointments DESC`
      ),
      query(
        `SELECT DATE_TRUNC('month', created_at) AS month,
                COUNT(*) AS appointments
         FROM appointments
         WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY month
         ORDER BY month`
      ),
    ]);

    res.json({
      by_company: byCompany.rows,
      by_region: byRegion.rows,
      monthly_trend: monthly.rows,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/complaints', async (req, res) => {
  const { status = 'all' } = req.query;

  try {
    const params = [];
    let sql = `
      SELECT cc.*, cl.name AS clinic_name, c.name AS company_name,
             p.name AS patient_name, creator.name AS receptionist_name,
             resolver.name AS resolved_by_receptionist_name
      FROM clinic_complaints cc
      JOIN clinics cl ON cc.clinic_id = cl.id
      JOIN companies c ON cl.company_id = c.id
      LEFT JOIN patients p ON cc.patient_id = p.id
      LEFT JOIN receptionists creator ON cc.receptionist_id = creator.id
      LEFT JOIN receptionists resolver ON cc.resolved_by_receptionist_id = resolver.id
      WHERE 1 = 1
    `;
    if (status !== 'all') {
      params.push(status);
      sql += ` AND cc.status = $${params.length}`;
    }
    sql += ' ORDER BY cc.updated_at DESC, cc.created_at DESC';
    const result = await query(sql, params);
    res.json({ complaints: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/complaint/:complaint_id/status', async (req, res) => {
  const { complaint_id } = req.params;
  const { status, resolution_note = '' } = req.body || {};

  try {
    requireFields({ status }, ['status']);
    const result = await query(
      `UPDATE clinic_complaints
       SET status = $1,
           resolution_note = $2,
           resolved_by_role = 'superadmin',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, resolution_note, complaint_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Complaint not found' });
    }
    res.json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/system-usability', async (req, res) => {
  try {
    const [recentLogins, roleLogins, unreadNotifications, activeEntities] = await Promise.all([
      query(
        `SELECT DATE(logged_in_at) AS login_date, COUNT(*) AS logins
         FROM login_audit
         WHERE logged_in_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(logged_in_at)
         ORDER BY login_date`
      ),
      query(
        `SELECT role, COUNT(*) AS logins
         FROM login_audit
         WHERE logged_in_at >= NOW() - INTERVAL '30 days'
         GROUP BY role
         ORDER BY role`
      ),
      query(
        `SELECT recipient_type, COUNT(*) AS unread
         FROM notifications
         WHERE read = FALSE
         GROUP BY recipient_type
         ORDER BY recipient_type`
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM companies WHERE status = 'active') AS active_companies,
           (SELECT COUNT(*) FROM clinics WHERE status = 'active') AS active_clinics,
           (SELECT COUNT(*) FROM doctors WHERE status = 'active') AS active_doctors,
           (SELECT COUNT(*) FROM receptionists WHERE status = 'active') AS active_receptionists`
      ),
    ]);

    res.json({
      recent_logins: recentLogins.rows,
      role_logins: roleLogins.rows,
      unread_notifications: unreadNotifications.rows,
      active_entities: activeEntities.rows[0] || {},
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
       JOIN admins a ON cr.admin_id = a.id
       JOIN companies c ON a.company_id = c.id
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
    const requestRes = await query(
      'SELECT * FROM admin_change_requests WHERE id = $1',
      [request_id]
    );
    if (requestRes.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });

    const changeRequest = requestRes.rows[0];
    if (changeRequest.request_type === 'password_reset') {
      const adminRes = await query('SELECT user_id FROM admins WHERE id = $1', [changeRequest.admin_id]);
      await query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [await hashPassword(changeRequest.requested_data), adminRes.rows[0].user_id]
      );
    } else if (changeRequest.request_type === 'contact_change') {
      await query(
        'UPDATE admins SET contact = $1 WHERE id = $2',
        [changeRequest.requested_data, changeRequest.admin_id]
      );
    }

    await query(
      `UPDATE admin_change_requests
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [request_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/change-request/:request_id/reject', async (req, res) => {
  const { request_id } = req.params;
  const { reason = 'No reason provided' } = req.body || {};
  try {
    await query(
      `UPDATE admin_change_requests
       SET status = 'rejected',
           rejection_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
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
       FROM cities ci
       JOIN regions r ON ci.region_id = r.id
       WHERE LOWER(ci.name) = LOWER($1)`,
      [city]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: `City '${city}' not found` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/regions/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id AS region_id,
              r.province,
              r.sub_region,
              json_agg(json_build_object('id', ci.id, 'name', ci.name) ORDER BY ci.name)
                FILTER (WHERE ci.id IS NOT NULL) AS cities
       FROM regions r
       LEFT JOIN cities ci ON ci.region_id = r.id
       GROUP BY r.id
       ORDER BY r.province, r.sub_region`
    );

    const grouped = {};
    result.rows.forEach((region) => {
      if (!grouped[region.province]) grouped[region.province] = [];
      grouped[region.province].push({
        id: region.region_id,
        sub_region: region.sub_region,
        cities: region.cities || [],
      });
    });

    res.json({ success: true, regions: result.rows, grouped });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
