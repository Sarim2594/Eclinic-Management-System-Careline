const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db');
const { requireFields, assertEmail, assertPhone } = require('../utils/validators');

const CURRENT_DAY_SQL = `CASE
  WHEN EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER = 0 THEN 7
  ELSE EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER
END`;
const ONLINE_WINDOW_SQL = `CURRENT_TIMESTAMP - INTERVAL '45 seconds'`;
const { hashPassword } = require('../utils/passwords');

router.use((req, res, next) => {
  req.scope = {
    admin_id: req.auth.admin_id,
    company_id: req.auth.company_id,
  };
  next();
});

async function getAccessibleClinic(adminId, companyId, clinicId) {
  const result = await query(
    `SELECT cl.*, ci.region_id, ci.name AS city_name, r.province, r.sub_region
     FROM clinics cl
     JOIN cities ci ON cl.city_id = ci.id
     JOIN regions r ON ci.region_id = r.id
     WHERE cl.id = $1
       AND cl.company_id = $2
       AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
    [clinicId, companyId, adminId]
  );
  return result.rows[0] || null;
}

async function getAccessibleDoctor(adminId, companyId, doctorId) {
  const result = await query(
    `SELECT d.*, cl.company_id, cl.city_id, ci.region_id
     FROM doctors d
     JOIN clinics cl ON d.clinic_id = cl.id
     JOIN cities ci ON cl.city_id = ci.id
     WHERE d.id = $1
       AND cl.company_id = $2
       AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
    [doctorId, companyId, adminId]
  );
  return result.rows[0] || null;
}

async function getAccessibleReceptionist(adminId, companyId, receptionistId) {
  const result = await query(
    `SELECT r.*, cl.company_id, cl.city_id, ci.region_id
     FROM receptionists r
     JOIN clinics cl ON r.clinic_id = cl.id
     JOIN cities ci ON cl.city_id = ci.id
     WHERE r.id = $1
       AND cl.company_id = $2
       AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
    [receptionistId, companyId, adminId]
  );
  return result.rows[0] || null;
}

router.get('/statistics', async (req, res) => {
  const { company_id, admin_id } = req.scope;
  try {
    let regionJoin = '';
    let regionFilter = '';
    const params = [];

    if (admin_id) {
      params.push(admin_id);
      regionJoin = 'JOIN cities ci ON cl.city_id = ci.id';
      regionFilter = `AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    if (company_id) {
      params.push(company_id);
      regionFilter += ` AND cl.company_id = $${params.length}`;
    }

    const baseJoin = admin_id ? regionJoin : 'JOIN cities ci ON cl.city_id = ci.id';
    const filters = regionFilter;

    const [clRes, docRes, recRes, apptRes, queueRes] = await Promise.all([
      query(`SELECT COUNT(DISTINCT cl.id) AS cnt FROM clinics cl ${baseJoin} WHERE cl.status = 'active' ${filters}`, params),
      query(`SELECT COUNT(DISTINCT d.id) AS cnt FROM doctors d JOIN clinics cl ON d.clinic_id = cl.id ${baseJoin} WHERE 1 = 1 ${filters}`, params),
      query(`SELECT COUNT(DISTINCT r.id) AS cnt FROM receptionists r JOIN clinics cl ON r.clinic_id = cl.id ${baseJoin} WHERE 1 = 1 ${filters}`, params),
      query(`SELECT COUNT(DISTINCT a.id) AS cnt FROM appointments a JOIN clinics cl ON a.clinic_id = cl.id ${baseJoin} WHERE 1 = 1 ${filters}`, params),
      query(`SELECT COUNT(DISTINCT a.id) AS cnt FROM appointments a JOIN clinics cl ON a.clinic_id = cl.id ${baseJoin} WHERE a.status = 'waiting' ${filters}`, params),
    ]);

    res.json({
      total_clinics: parseInt(clRes.rows[0].cnt, 10),
      total_doctors: parseInt(docRes.rows[0].cnt, 10),
      total_receptionists: parseInt(recRes.rows[0].cnt, 10),
      total_appointments: parseInt(apptRes.rows[0].cnt, 10),
      total_patients: parseInt(apptRes.rows[0].cnt, 10),
      active_queue: parseInt(queueRes.rows[0].cnt, 10),
    });
  } catch (err) {
    console.error('[admin/statistics]', err.message);
    res.status(500).json({ detail: err.message });
  }
});

router.get('/receptionists', async (req, res) => {
  const { company_id, admin_id } = req.scope;
  try {
    let sql = `
      SELECT r.*, u.username, u.email,
             cl.name AS clinic_name,
             ci.name AS city_name
      FROM receptionists r
      JOIN users u ON r.user_id = u.id
      JOIN clinics cl ON r.clinic_id = cl.id
      JOIN cities ci ON cl.city_id = ci.id
      WHERE 1 = 1
    `;
    const params = [];
    if (company_id) {
      params.push(company_id);
      sql += ` AND cl.company_id = $${params.length}`;
    }
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    sql += ' ORDER BY r.name';
    const result = await query(sql, params);
    res.json({ receptionists: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/doctors', async (req, res) => {
  const { company_id, admin_id } = req.scope;
  try {
    let sql = `
      SELECT d.*, u.username, u.email,
             cl.name AS clinic_name,
             cl.city_id,
             s.name AS specialization,
             ci.name AS city_name,
             r.id AS region_id,
             r.province,
             r.sub_region,
             schedule.start_time AS scheduled_start_time,
             schedule.end_time AS scheduled_end_time,
             u.last_seen_at,
             CASE
               WHEN COALESCE(schedule.is_active, FALSE) = FALSE THEN 'scheduled_break'
               WHEN u.last_seen_at IS NOT NULL AND u.last_seen_at >= ${ONLINE_WINDOW_SQL} THEN 'online'
               ELSE 'offline'
             END AS availability_status,
             CASE
               WHEN COALESCE(schedule.is_active, FALSE) = FALSE THEN 'Scheduled break'
               WHEN u.last_seen_at IS NOT NULL AND u.last_seen_at >= ${ONLINE_WINDOW_SQL} THEN 'Doctor is online'
               ELSE 'Offline'
             END AS availability_label,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'waiting') AS current_queue,
             (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'completed') AS attended
      FROM doctors d
      JOIN app_users u ON d.user_id = u.id
      JOIN clinics cl ON d.clinic_id = cl.id
      LEFT JOIN specializations s ON d.specialization_id = s.id
      JOIN cities ci ON cl.city_id = ci.id
      JOIN regions r ON ci.region_id = r.id
      LEFT JOIN LATERAL (
        SELECT
          av.start_time,
          av.end_time,
          av.is_active
        FROM availability_schedules av
        WHERE av.doctor_id = d.id
          AND av.day_of_week = ${CURRENT_DAY_SQL}
        LIMIT 1
      ) schedule ON TRUE
      WHERE 1 = 1
    `;
    const params = [];
    if (company_id) {
      params.push(company_id);
      sql += ` AND cl.company_id = $${params.length}`;
    }
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    sql += ' ORDER BY d.name';
    const result = await query(sql, params);
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/clinics-breakdown', async (req, res) => {
  const { company_id, admin_id } = req.scope;
  try {
    let sql = `
      SELECT cl.id, cl.name, cl.status, cl.location, cl.city_id, cl.operating_hours,
             ci.name AS city_name,
             r.province,
             r.sub_region,
             COUNT(DISTINCT d.id) AS doctor_count,
             COUNT(DISTINCT rec.id) AS receptionist_count,
             COUNT(DISTINCT CASE WHEN a.status = 'waiting' THEN a.id END) AS waiting_count,
             COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) AS patient_count
      FROM clinics cl
      JOIN cities ci ON cl.city_id = ci.id
      JOIN regions r ON ci.region_id = r.id
      LEFT JOIN doctors d ON d.clinic_id = cl.id
      LEFT JOIN receptionists rec ON rec.clinic_id = cl.id
      LEFT JOIN appointments a ON a.clinic_id = cl.id
      WHERE cl.status = 'active'
    `;
    const params = [];
    if (company_id) {
      params.push(company_id);
      sql += ` AND cl.company_id = $${params.length}`;
    }
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    sql += ' GROUP BY cl.id, ci.name, r.province, r.sub_region ORDER BY cl.name';
    const result = await query(sql, params);
    res.json({ clinics: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/available-doctors', async (req, res) => {
  const { admin_id, company_id } = req.scope;
  try {
    const result = await query(
      `SELECT DISTINCT ON (d.id)
              d.*, cl.name AS clinic_name,
              av.start_time AS shift_start,
              av.end_time AS shift_end,
              av.day_of_week,
              TRUE AS currently_on_shift,
              CONCAT(
                'Logged in on ',
                TO_CHAR(la.logged_in_at AT TIME ZONE 'Asia/Karachi', 'DD Mon YYYY HH12:MI AM'),
                ' • Available now'
              ) AS availability_note,
              u.last_seen_at,
              la.logged_in_at AS last_logged_in_at,
              (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND a.status = 'waiting') AS current_queue
       FROM doctors d
       JOIN app_users u ON d.user_id = u.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       JOIN availability_schedules av ON av.doctor_id = d.id AND av.is_active = TRUE
       JOIN LATERAL (
         SELECT MAX(logged_in_at) AS logged_in_at
         FROM login_audit
         WHERE user_id = d.user_id
           AND role = 'doctor'
       ) la ON la.logged_in_at IS NOT NULL
       WHERE d.status = 'active'
         AND u.last_seen_at IS NOT NULL
         AND u.last_seen_at >= ${ONLINE_WINDOW_SQL}
         AND cl.company_id = $1
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)
       ORDER BY d.id, la.logged_in_at DESC, d.name`,
      [company_id, admin_id]
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/unavailable-doctors', async (req, res) => {
  const { admin_id } = req.scope;
  try {
    let sql = `
      SELECT d.*, cl.name AS clinic_name,
             dur.start_datetime AS unavailable_from,
             dur.end_datetime AS unavailable_until,
             dur.reason
      FROM doctors d
      JOIN clinics cl ON d.clinic_id = cl.id
      JOIN cities ci ON cl.city_id = ci.id
      LEFT JOIN doctor_unavailability_requests dur
        ON dur.doctor_id = d.id
       AND dur.status = 'approved'
       AND dur.start_datetime <= NOW()
       AND dur.end_datetime >= NOW()
      WHERE d.status = 'inactive'
    `;
    const params = [];
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    const result = await query(sql, params);
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/create-receptionist', async (req, res) => {
  const { username, email, password, name, contact, clinic_id } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ username, email, password, name, contact, clinic_id }, [
      'username',
      'email',
      'password',
      'name',
      'contact',
      'clinic_id',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(403).json({ detail: 'You can only assign receptionists to clinics in your scope' });
    }

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
         VALUES ($1, $2, $3, 'receptionist')
         RETURNING id, username, email`,
        [username.trim(), email.trim().toLowerCase(), await hashPassword(password)]
      );

      const receptionistRes = await client.query(
        `INSERT INTO receptionists (user_id, clinic_id, name, contact)
         VALUES ($1, $2, $3, $4)
         RETURNING id, clinic_id, name, contact, status`,
        [userRes.rows[0].id, clinic_id, name.trim(), contact.trim()]
      );

      return {
        user_id: userRes.rows[0].id,
        receptionist_id: receptionistRes.rows[0].id,
        receptionist: {
          ...receptionistRes.rows[0],
          username: userRes.rows[0].username,
          email: userRes.rows[0].email,
          clinic_name: clinic.name,
          city_name: clinic.city_name,
        },
      };
    });

    res.json({ success: true, ...result, message: 'Receptionist created successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/receptionist/:receptionist_id', async (req, res) => {
  const { receptionist_id } = req.params;
  const { name, username, email, contact, clinic_id } = req.body || {};
  const { admin_id, company_id } = req.scope;

  try {
    requireFields({ name, username, email, contact, clinic_id }, [
      'name',
      'username',
      'email',
      'contact',
      'clinic_id',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const receptionist = await getAccessibleReceptionist(admin_id, company_id, receptionist_id);
    if (!receptionist) {
      return res.status(404).json({ detail: 'Receptionist not found in your scope' });
    }

    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(403).json({ detail: 'You can only assign receptionists to clinics in your scope' });
    }

    const duplicateUser = await query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
      [username.trim(), email.trim().toLowerCase(), receptionist.user_id]
    );
    if (duplicateUser.rows.length > 0) {
      return res.status(400).json({ detail: 'Username or email already exists' });
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE users
         SET username = $1,
             email = $2
         WHERE id = $3`,
        [username.trim(), email.trim().toLowerCase(), receptionist.user_id]
      );

      await client.query(
        `UPDATE receptionists
         SET name = $1,
             contact = $2,
             clinic_id = $3
         WHERE id = $4`,
        [name.trim(), contact.trim(), clinic_id, receptionist_id]
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/receptionist/:receptionist_id/status', async (req, res) => {
  const { receptionist_id } = req.params;
  const { status } = req.body || {};
  const { admin_id, company_id } = req.scope;

  try {
    requireFields({ status }, ['status']);
    const receptionist = await getAccessibleReceptionist(admin_id, company_id, receptionist_id);
    if (!receptionist) {
      return res.status(404).json({ detail: 'Receptionist not found in your scope' });
    }

    const result = await query(
      `UPDATE receptionists
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, receptionist_id]
    );
    res.json({ success: true, receptionist: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/create-doctor', async (req, res) => {
  const {
    username,
    email,
    password,
    name,
    contact,
    clinic_id,
    license_number,
    specialization_id,
    startTimes,
    endTimes,
  } = req.body || {};
  const { admin_id, company_id } = req.scope;

  try {
    requireFields({ username, email, password, name, contact, clinic_id, license_number }, [
      'username',
      'email',
      'password',
      'name',
      'contact',
      'clinic_id',
      'license_number',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(403).json({ detail: 'You can only assign doctors to clinics in your scope' });
    }

    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'Username or email already exists' });
    }

    const licenseCheck = await query(
      'SELECT id FROM doctors WHERE license_number = $1',
      [license_number.trim()]
    );
    if (licenseCheck.rows.length > 0) {
      return res.status(400).json({ detail: 'License number already exists' });
    }

    const result = await transaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (username, email, password, role)
         VALUES ($1, $2, $3, 'doctor')
         RETURNING id`,
        [username.trim(), email.trim().toLowerCase(), await hashPassword(password)]
      );

      const doctorRes = await client.query(
        `INSERT INTO doctors (user_id, clinic_id, name, specialization_id, license_number, contact)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userRes.rows[0].id, clinic_id, name.trim(), specialization_id || null, license_number.trim(), contact.trim()]
      );

      for (let index = 0; index < 7; index += 1) {
        await client.query(
          `INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time, is_active)
           VALUES ($1, $2, $3, $4, FALSE)`,
          [doctorRes.rows[0].id, index + 1, startTimes?.[index] || null, endTimes?.[index] || null]
        );
      }

      return { user_id: userRes.rows[0].id, doctor_id: doctorRes.rows[0].id };
    });

    res.json({ success: true, ...result, message: 'Doctor created successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/doctor/:doctor_id', async (req, res) => {
  const { doctor_id } = req.params;
  const { name, username, email, contact, specialization_id, license_number, clinic_id } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ name, username, email, contact, clinic_id }, [
      'name',
      'username',
      'email',
      'contact',
      'clinic_id',
    ]);
    assertEmail(email);
    assertPhone(contact);

    const doctor = await getAccessibleDoctor(admin_id, company_id, doctor_id);
    if (!doctor) {
      return res.status(404).json({ detail: 'Doctor not found in your scope' });
    }

    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(403).json({ detail: 'You can only assign doctors to clinics in your scope' });
    }

    const duplicateUser = await query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
      [username.trim(), email.trim().toLowerCase(), doctor.user_id]
    );
    if (duplicateUser.rows.length > 0) {
      return res.status(400).json({ detail: 'Username or email already exists' });
    }

    if (license_number) {
      const duplicateLicense = await query(
        'SELECT id FROM doctors WHERE license_number = $1 AND id <> $2',
        [license_number.trim(), doctor_id]
      );
      if (duplicateLicense.rows.length > 0) {
        return res.status(400).json({ detail: 'License number already exists' });
      }
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE users
         SET username = $1,
             email = $2
         WHERE id = $3`,
        [username.trim(), email.trim().toLowerCase(), doctor.user_id]
      );

      await client.query(
        `UPDATE doctors
         SET name = $1,
             contact = $2,
             specialization_id = $3,
             license_number = COALESCE($4, license_number),
             clinic_id = $5
         WHERE id = $6`,
        [name.trim(), contact.trim(), specialization_id || null, license_number ? license_number.trim() : null, clinic_id, doctor_id]
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/doctor/:doctor_id/status', async (req, res) => {
  const { doctor_id } = req.params;
  const { status } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ status }, ['status']);
    const doctor = await getAccessibleDoctor(admin_id, company_id, doctor_id);
    if (!doctor) {
      return res.status(404).json({ detail: 'Doctor not found in your scope' });
    }
    const result = await query(
      'UPDATE doctors SET status = $1 WHERE id = $2 RETURNING *',
      [status, doctor_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Doctor not found' });
    }

    if (status === 'inactive') {
      await query(
        `UPDATE availability_schedules
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE doctor_id = $1`,
        [doctor_id]
      );
    }

    res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/create-clinic', async (req, res) => {
  const { name, location, city_id, operating_hours = {} } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ company_id, name, location, city_id }, ['company_id', 'name', 'location', 'city_id']);
    const cityCheck = await query(
      `SELECT ci.id
       FROM cities ci
       WHERE ci.id = $1
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)`,
      [city_id, admin_id]
    );
    if (cityCheck.rows.length === 0) {
      return res.status(403).json({ detail: 'You can only create clinics in your assigned regions' });
    }
    const result = await query(
      `INSERT INTO clinics (company_id, name, location, city_id, operating_hours)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [company_id, name.trim(), location.trim(), city_id, JSON.stringify(operating_hours || {})]
    );
    res.json({ success: true, clinic: result.rows[0], clinic_id: result.rows[0].id });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.put('/clinic/:clinic_id', async (req, res) => {
  const { clinic_id } = req.params;
  const { name, location, city_id, status, operating_hours = {} } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ name, location, city_id }, ['name', 'location', 'city_id']);
    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(404).json({ detail: 'Clinic not found in your scope' });
    }
    const cityCheck = await query(
      `SELECT ci.id
       FROM cities ci
       WHERE ci.id = $1
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)`,
      [city_id, admin_id]
    );
    if (cityCheck.rows.length === 0) {
      return res.status(403).json({ detail: 'You can only assign clinics to regions in your scope' });
    }
    const result = await query(
      `UPDATE clinics
       SET name = $1,
           location = $2,
           city_id = $3,
           status = COALESCE($4, status),
           operating_hours = $5
       WHERE id = $6
       RETURNING *`,
      [name.trim(), location.trim(), city_id, status || null, JSON.stringify(operating_hours || {}), clinic_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Clinic not found' });
    }
    res.json({ success: true, clinic: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.post('/transfer-doctor', async (req, res) => {
  const { doctor_id, new_clinic_id } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    const doctor = await getAccessibleDoctor(admin_id, company_id, doctor_id);
    const clinic = await getAccessibleClinic(admin_id, company_id, new_clinic_id);
    if (!doctor || !clinic) {
      return res.status(403).json({ detail: 'Doctor and clinic must both be in your scope' });
    }
    const result = await query(
      'UPDATE doctors SET clinic_id = $1 WHERE id = $2 RETURNING *',
      [new_clinic_id, doctor_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Doctor not found' });
    }
    res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/update-availability/:doctor_id', async (req, res) => {
  const { doctor_id } = req.params;
  const { day_of_week, startTime, endTime } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    const doctor = await getAccessibleDoctor(admin_id, company_id, doctor_id);
    if (!doctor) {
      return res.status(404).json({ detail: 'Doctor not found in your scope' });
    }
    const result = await query(
      `UPDATE availability_schedules
       SET start_time = $1,
           end_time = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $3 AND day_of_week = $4
       RETURNING *`,
      [startTime || null, endTime || null, doctor_id, day_of_week]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Schedule entry not found' });
    }
    res.json({ success: true, schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/monitor-doctors', async (req, res) => {
  const { admin_id, company_id } = req.scope;
  try {
    const result = await query(
      `SELECT d.id, d.name, d.status, cl.name AS clinic_name,
              COUNT(a.id) FILTER (WHERE a.status = 'waiting') AS queue_length
       FROM doctors d
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       LEFT JOIN appointments a ON a.doctor_id = d.id
       WHERE cl.company_id = $1
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)
       GROUP BY d.id, d.name, d.status, cl.name
       ORDER BY queue_length DESC`,
      [company_id, admin_id]
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/appointments', async (req, res) => {
  const { admin_id, company_id } = req.scope;
  const { clinic_id, status } = req.query;
  try {
    let sql = `
      SELECT a.*, p.name AS patient_name, p.contact AS patient_contact,
             d.name AS doctor_name, cl.name AS clinic_name, ci.name AS city_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN clinics cl ON a.clinic_id = cl.id
      JOIN cities ci ON cl.city_id = ci.id
      WHERE 1 = 1
    `;
    const params = [];
    if (company_id) {
      params.push(company_id);
      sql += ` AND cl.company_id = $${params.length}`;
    }
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $${params.length})`;
    }
    if (clinic_id) {
      const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
      if (!clinic) {
        return res.status(403).json({ detail: 'Clinic not found in your scope' });
      }
      params.push(clinic_id);
      sql += ` AND a.clinic_id = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    sql += ' ORDER BY a.created_at DESC';
    const result = await query(sql, params);
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/post-bulletin', async (req, res) => {
  const { title, message } = req.body || {};
  const { admin_id } = req.scope;
  try {
    const adminRes = await query('SELECT company_id FROM admins WHERE id = $1', [admin_id]);
    if (adminRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Admin not found' });
    }

    const result = await query(
      `INSERT INTO bulletins (company_id, title, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [adminRes.rows[0].company_id, title, message]
    );
    res.json({ success: true, bulletin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete('/delete-bulletin/:bulletin_id', async (req, res) => {
  const { bulletin_id } = req.params;
  const { admin_id } = req.scope;
  try {
    const check = await query(
      `SELECT b.id
       FROM bulletins b
       JOIN admins a ON b.company_id = a.company_id
       WHERE b.id = $1 AND a.id = $2`,
      [bulletin_id, admin_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ detail: 'Unauthorized or bulletin not found' });
    }
    await query('UPDATE bulletins SET active = FALSE WHERE id = $1', [bulletin_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/request-password-change', async (req, res) => {
  const { new_password } = req.body || {};
  const { admin_id } = req.scope;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id, request_type, requested_data)
       VALUES ($1, 'password_reset', $2)`,
      [admin_id, new_password]
    );
    res.json({ success: true, message: 'Password change request submitted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/request-contact-change', async (req, res) => {
  const { new_contact } = req.body || {};
  const { admin_id } = req.scope;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id, request_type, requested_data)
       VALUES ($1, 'contact_change', $2)`,
      [admin_id, new_contact]
    );
    res.json({ success: true, message: 'Contact change request submitted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/request-general-query', async (req, res) => {
  const { query: queryText, reason } = req.body || {};
  const { admin_id } = req.scope;
  try {
    await query(
      `INSERT INTO admin_change_requests (admin_id, request_type, requested_data, reason)
       VALUES ($1, 'general_query', $2, $3)`,
      [admin_id, queryText, reason]
    );
    res.json({ success: true, message: 'Query submitted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/doctor-unavailability-requests', async (req, res) => {
  const { admin_id } = req.scope;

  try {
    const result = await query(
      `SELECT dur.*, d.name AS doctor_name, cl.name AS clinic_name, rec.name AS receptionist_name
       FROM doctor_unavailability_requests dur
       JOIN doctors d ON dur.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       LEFT JOIN receptionists rec ON dur.receptionist_id = rec.id
       WHERE dur.status = 'pending'
         AND COALESCE(dur.receptionist_status, 'pending') = 'forwarded'
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $1)
       ORDER BY dur.created_at DESC`,
      [admin_id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/unavailability-request/:request_id/approve', async (req, res) => {
  const { request_id } = req.params;
  const { admin_comment = '' } = req.query;
  const { admin_id, company_id } = req.scope;
  try {
    const access = await query(
      `SELECT dur.id
       FROM doctor_unavailability_requests dur
       JOIN doctors d ON dur.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       WHERE dur.id = $1
         AND cl.company_id = $2
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
      [request_id, company_id, admin_id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ detail: 'Request not found in your scope' });
    }
    const result = await query(
      `UPDATE doctor_unavailability_requests
       SET status = 'approved',
           admin_reviewer_id = $2,
           admin_comment = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [admin_comment, admin_id, request_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/unavailability-request/:request_id/reject', async (req, res) => {
  const { request_id } = req.params;
  const { reason = '' } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    const access = await query(
      `SELECT dur.id
       FROM doctor_unavailability_requests dur
       JOIN doctors d ON dur.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       WHERE dur.id = $1
         AND cl.company_id = $2
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
      [request_id, company_id, admin_id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ detail: 'Request not found in your scope' });
    }
    const result = await query(
      `UPDATE doctor_unavailability_requests
       SET status = 'rejected',
           admin_reviewer_id = $2,
           admin_comment = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reason, admin_id, request_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/doctor-region-change-requests', async (req, res) => {
  const { admin_id } = req.scope;

  try {
    const result = await query(
      `SELECT drcr.*, d.name AS doctor_name, cl.name AS clinic_name,
              rr.province, rr.sub_region
       FROM doctor_region_change_requests drcr
       JOIN doctors d ON drcr.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       JOIN regions rr ON drcr.requested_region_id = rr.id
       WHERE drcr.status = 'pending'
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $1)
       ORDER BY drcr.created_at DESC`,
      [admin_id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/doctor-region-change-request/:request_id/review', async (req, res) => {
  const { request_id } = req.params;
  const { status, reviewer_comment = '' } = req.body || {};
  const { admin_id, company_id } = req.scope;
  try {
    requireFields({ status }, ['status']);
    const access = await query(
      `SELECT drcr.id
       FROM doctor_region_change_requests drcr
       JOIN doctors d ON drcr.doctor_id = d.id
       JOIN clinics cl ON d.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       WHERE drcr.id = $1
         AND cl.company_id = $2
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $3)`,
      [request_id, company_id, admin_id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ detail: 'Request not found in your scope' });
    }
    const result = await query(
      `UPDATE doctor_region_change_requests
       SET status = $1,
           admin_reviewer_id = $3,
           reviewer_comment = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewer_comment, admin_id, request_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Request not found' });
    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/complaints', async (req, res) => {
  const { admin_id } = req.scope;
  const { status = 'all' } = req.query;

  try {
    const params = [admin_id];
    let sql = `
      SELECT cc.*, cl.name AS clinic_name, p.name AS patient_name, r.name AS receptionist_name,
             resolver.name AS resolved_by_receptionist_name
      FROM clinic_complaints cc
      JOIN clinics cl ON cc.clinic_id = cl.id
      JOIN cities ci ON cl.city_id = ci.id
      LEFT JOIN patients p ON cc.patient_id = p.id
      LEFT JOIN receptionists r ON cc.receptionist_id = r.id
      LEFT JOIN receptionists resolver ON cc.resolved_by_receptionist_id = resolver.id
      WHERE ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $1)
    `;
    if (status !== 'all') {
      params.push(status);
      sql += ` AND cc.status = $${params.length}`;
    }
    sql += ' ORDER BY cc.created_at DESC';
    const result = await query(sql, params);
    res.json({ complaints: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put('/complaint/:complaint_id/status', async (req, res) => {
  const { complaint_id } = req.params;
  const { status, resolution_note = '' } = req.body || {};
  const { admin_id } = req.scope;
  try {
    requireFields({ status }, ['status']);
    const access = await query(
      `SELECT cc.id
       FROM clinic_complaints cc
       JOIN clinics cl ON cc.clinic_id = cl.id
       JOIN cities ci ON cl.city_id = ci.id
       WHERE cc.id = $1
         AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)`,
      [complaint_id, admin_id]
    );
    if (access.rows.length === 0) {
      return res.status(404).json({ detail: 'Complaint not found in your scope' });
    }
    const result = await query(
      `UPDATE complaints
       SET status = $1,
           resolution_note = $2,
           resolved_by_role = 'admin',
           resolved_by_admin_id = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, resolution_note, complaint_id, admin_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Complaint not found' });
    }
    res.json({ success: true, complaint: result.rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});

router.get('/cities', async (req, res) => {
  const { admin_id } = req.scope;
  try {
    let sql = `
      SELECT ci.id, ci.name, r.id AS region_id, r.province, r.sub_region
      FROM cities ci
      JOIN regions r ON ci.region_id = r.id
      WHERE 1 = 1
    `;
    const params = [admin_id];
    sql += ` AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $1)`;
    sql += ' ORDER BY r.province, r.sub_region, ci.name';
    const result = await query(sql, params);

    const grouped = {};
    result.rows.forEach((row) => {
      if (!grouped[row.province]) grouped[row.province] = {};
      if (!grouped[row.province][row.sub_region]) grouped[row.province][row.sub_region] = [];
      grouped[row.province][row.sub_region].push({ id: row.id, name: row.name });
    });

    res.json({ cities: result.rows, grouped });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/doctor-schedule', async (req, res) => {
  const { doctor_id } = req.query;
  const { admin_id, company_id } = req.scope;
  try {
    const doctor = await getAccessibleDoctor(admin_id, company_id, doctor_id);
    if (!doctor) {
      return res.status(404).json({ detail: 'Doctor not found in your scope' });
    }
    const result = await query(
      'SELECT * FROM availability_schedules WHERE doctor_id = $1 ORDER BY day_of_week',
      [doctor_id]
    );
    res.json({ schedule: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/specializations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM specializations ORDER BY name');
    res.json({ specializations: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/clinic/:clinic_id/available-doctors', async (req, res) => {
  const { clinic_id } = req.params;
  const { admin_id, company_id } = req.scope;
  try {
    const clinic = await getAccessibleClinic(admin_id, company_id, clinic_id);
    if (!clinic) {
      return res.status(404).json({ detail: 'Clinic not found in your scope' });
    }
    const result = await query(
      `SELECT d.*
       FROM doctors d
       JOIN availability_schedules av ON av.doctor_id = d.id
       WHERE d.clinic_id = $1
         AND av.is_active = TRUE
         AND d.status = 'active'`,
      [clinic_id]
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/transfer-patients', async (req, res) => {
  const { from_doctor_id, to_doctor_id } = req.query;
  const { admin_id, company_id } = req.scope;
  try {
    const fromDoctor = await getAccessibleDoctor(admin_id, company_id, from_doctor_id);
    const toDoctor = await getAccessibleDoctor(admin_id, company_id, to_doctor_id);
    if (!fromDoctor || !toDoctor) {
      return res.status(403).json({ detail: 'Both doctors must be in your scope' });
    }
    const result = await query(
      `UPDATE appointments
       SET doctor_id = $1
       WHERE doctor_id = $2 AND status = 'waiting'
       RETURNING id`,
      [to_doctor_id, from_doctor_id]
    );
    res.json({ success: true, transferred: result.rows.length });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/reports', async (req, res) => {
  const { admin_id, company_id } = req.scope;

  try {
    const [performance, appointmentSummary, complaintSummary] = await Promise.all([
      query(
        `SELECT cl.id, cl.name, cl.status,
                COUNT(DISTINCT d.id) AS doctor_count,
                COUNT(DISTINCT rec.id) AS receptionist_count,
                COUNT(DISTINCT CASE WHEN a.status = 'waiting' THEN a.id END) AS waiting_count,
                COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) AS completed_count,
                COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END) AS cancelled_count
         FROM clinics cl
         JOIN cities ci ON cl.city_id = ci.id
         LEFT JOIN doctors d ON d.clinic_id = cl.id
         LEFT JOIN receptionists rec ON rec.clinic_id = cl.id
         LEFT JOIN appointments a ON a.clinic_id = cl.id
         WHERE cl.company_id = $1
           AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)
         GROUP BY cl.id
         ORDER BY cl.name`,
        [company_id, admin_id]
      ),
      query(
        `SELECT cl.id AS clinic_id, cl.name AS clinic_name, a.status, COUNT(*) AS total
         FROM appointments a
         JOIN clinics cl ON a.clinic_id = cl.id
         JOIN cities ci ON cl.city_id = ci.id
         WHERE cl.company_id = $1
           AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)
         GROUP BY cl.id, cl.name, a.status
         ORDER BY cl.name, a.status`,
        [company_id, admin_id]
      ),
      query(
        `SELECT cl.id AS clinic_id, cl.name AS clinic_name, cc.status, COUNT(*) AS total
         FROM clinic_complaints cc
         JOIN clinics cl ON cc.clinic_id = cl.id
         JOIN cities ci ON cl.city_id = ci.id
         WHERE cl.company_id = $1
           AND ci.region_id IN (SELECT region_id FROM admin_regions WHERE admin_id = $2)
         GROUP BY cl.id, cl.name, cc.status
         ORDER BY cl.name, cc.status`,
        [company_id, admin_id]
      ),
    ]);

    res.json({
      performance: performance.rows,
      appointment_summary: appointmentSummary.rows,
      complaint_summary: complaintSummary.rows,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
