const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../db');

// ============================================================================
// AUTH ROUTES
// Replaces: src/auth/routes.py + src/auth/services.py
// Original endpoint: POST /api/auth/login
// ============================================================================

/**
 * Hash password using SHA256.
 * Replaces: hash_password() in auth/services.py
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * POST /api/auth/login
 * Replaces: login_endpoint() in auth/routes.py
 * and get_user_and_profile_data() in auth/services.py
 */
router.post('/login', async (req, res) => {
  const { username_or_email, password } = req.body;

  if (!username_or_email || !password) {
    return res.status(400).json({ detail: 'username_or_email and password are required' });
  }

  try {
    const passwordHash = hashPassword(password);

    // 1. Authenticate base user
    const userResult = await query(
      `SELECT id, username, email, role
       FROM users
       WHERE (username = $1 OR email = $1) AND password = $2`,
      [username_or_email, passwordHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const responseData = {
      success: true,
      role: user.role,
      user_id: user.id,
      username: user.username,
      email: user.email,
    };

    // 2. Fetch role-specific profile data
    if (user.role === 'superadmin') {
      const profile = await query(
        'SELECT id, name FROM superadmins WHERE user_id = $1',
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'SuperAdmin profile not found' });
      responseData.superadmin_id = profile.rows[0].id;
      responseData.name = profile.rows[0].name;

    } else if (user.role === 'doctor') {
      const profile = await query(
        'SELECT id, clinic_id, name FROM doctors WHERE user_id = $1',
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Doctor profile not found' });
      responseData.doctor_id  = profile.rows[0].id;
      responseData.clinic_id  = profile.rows[0].clinic_id;
      responseData.name       = profile.rows[0].name;

      // Set doctor availability active on login (business logic preserved)
      await query(
        `UPDATE availability_schedules
         SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE doctor_id = $1
           AND day_of_week % 7 = EXTRACT(DOW FROM CURRENT_DATE)
           AND (
             (start_time <= end_time AND CURRENT_TIME BETWEEN start_time AND end_time)
             OR
             (start_time > end_time AND (CURRENT_TIME >= start_time OR CURRENT_TIME <= end_time))
           )`,
        [profile.rows[0].id]
      );

    } else if (user.role === 'receptionist') {
      const profile = await query(
        'SELECT id, clinic_id, name FROM receptionists WHERE user_id = $1',
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Receptionist profile not found' });
      responseData.receptionist_id = profile.rows[0].id;
      responseData.clinic_id       = profile.rows[0].clinic_id;
      responseData.name            = profile.rows[0].name;

    } else if (user.role === 'admin') {
      const profile = await query(
        `SELECT a.id, a.name, a.company_id, c.name AS company_name
         FROM admins a
         JOIN companies c ON a.company_id = c.id
         WHERE a.user_id = $1`,
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Admin profile not found' });
      responseData.admin_id     = profile.rows[0].id;
      responseData.name         = profile.rows[0].name;
      responseData.company_id   = profile.rows[0].company_id;
      responseData.company_name = profile.rows[0].company_name;
    }

    res.json(responseData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: `Internal Server Error: ${err.message}` });
  }
});

module.exports = router;
