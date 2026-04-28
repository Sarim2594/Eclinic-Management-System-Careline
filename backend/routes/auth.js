const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { signAuthToken, verifyAuthToken } = require('../utils/authToken');
const { verifyPassword } = require('../utils/passwords');

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map();

// ============================================================================
// AUTH ROUTES
// Replaces: src/auth/routes.py + src/auth/services.py
// Original endpoint: POST /api/auth/login
// ============================================================================

const getAttemptKey = (req, usernameOrEmail) => `${req.ip || 'unknown'}:${String(usernameOrEmail || '').trim().toLowerCase()}`;

function registerFailedAttempt(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.expiresAt <= now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
  loginAttempts.set(key, current);
}

function clearFailedAttempts(key) {
  loginAttempts.delete(key);
}

function isRateLimited(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current) return false;
  if (current.expiresAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return current.count >= LOGIN_MAX_ATTEMPTS;
}

/**
 * POST /api/auth/login
 * Replaces: login_endpoint() in auth/routes.py
 * and get_user_and_profile_data() in auth/services.py
 */
router.post('/login', async (req, res) => {
  const { username_or_email, password } = req.body;
  const attemptKey = getAttemptKey(req, username_or_email);

  if (!username_or_email || !password) {
    return res.status(400).json({ detail: 'username_or_email and password are required' });
  }

  if (isRateLimited(attemptKey)) {
    return res.status(429).json({ detail: 'Too many failed login attempts. Please wait a few minutes and try again.' });
  }

  try {
    // 1. Authenticate base user
    const userResult = await query(
      `SELECT id, username, email, role, status, password_hash
       FROM app_users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [username_or_email]
    );

    if (userResult.rows.length === 0) {
      registerFailedAttempt(attemptKey);
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      registerFailedAttempt(attemptKey);
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      registerFailedAttempt(attemptKey);
      return res.status(403).json({ detail: 'This user account is inactive' });
    }

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
        `SELECT d.id, d.clinic_id, d.name, d.status, cl.status AS clinic_status
         FROM doctors d
         JOIN clinics cl ON d.clinic_id = cl.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Doctor profile not found' });
      if (profile.rows[0].status !== 'active' || profile.rows[0].clinic_status !== 'active') {
        registerFailedAttempt(attemptKey);
        return res.status(403).json({ detail: 'This doctor account is inactive' });
      }
      responseData.doctor_id  = profile.rows[0].id;
      responseData.clinic_id  = profile.rows[0].clinic_id;
      responseData.name       = profile.rows[0].name;

    } else if (user.role === 'receptionist') {
      const profile = await query(
        `SELECT r.id, r.clinic_id, r.name, r.status, cl.status AS clinic_status
         FROM receptionists r
         JOIN clinics cl ON r.clinic_id = cl.id
         WHERE r.user_id = $1`,
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Receptionist profile not found' });
      if (profile.rows[0].status !== 'active' || profile.rows[0].clinic_status !== 'active') {
        registerFailedAttempt(attemptKey);
        return res.status(403).json({ detail: 'This receptionist account is inactive' });
      }
      responseData.receptionist_id = profile.rows[0].id;
      responseData.clinic_id       = profile.rows[0].clinic_id;
      responseData.name            = profile.rows[0].name;

    } else if (user.role === 'admin') {
      const profile = await query(
        `SELECT a.id, a.name, a.company_id, c.name AS company_name, c.status AS company_status
         FROM admins a
         JOIN companies c ON a.company_id = c.id
         WHERE a.user_id = $1`,
        [user.id]
      );
      if (profile.rows.length === 0) return res.status(404).json({ detail: 'Admin profile not found' });
      if (profile.rows[0].company_status !== 'active') {
        registerFailedAttempt(attemptKey);
        return res.status(403).json({ detail: 'This admin account is inactive because the company is inactive' });
      }
      responseData.admin_id     = profile.rows[0].id;
      responseData.name         = profile.rows[0].name;
      responseData.company_id   = profile.rows[0].company_id;
      responseData.company_name = profile.rows[0].company_name;
    }

    responseData.token = signAuthToken({
      role: responseData.role,
      user_id: responseData.user_id,
      username: responseData.username,
      email: responseData.email,
      superadmin_id: responseData.superadmin_id || null,
      admin_id: responseData.admin_id || null,
      company_id: responseData.company_id || null,
      doctor_id: responseData.doctor_id || null,
      receptionist_id: responseData.receptionist_id || null,
      clinic_id: responseData.clinic_id || null,
      name: responseData.name || null,
    });

    await query(
      `UPDATE app_users
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [responseData.user_id]
    );

    await query(
      `INSERT INTO login_audit (user_id, role)
       VALUES ($1, $2)`,
      [responseData.user_id, responseData.role]
    );

    clearFailedAttempts(attemptKey);

    res.json(responseData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: `Internal Server Error: ${err.message}` });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await query(
      `UPDATE app_users
       SET last_seen_at = NULL
       WHERE id = $1`,
      [req.auth.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: `Internal Server Error: ${err.message}` });
  }
});

router.post('/presence/ping', requireAuth, async (req, res) => {
  res.json({ success: true });
});

router.post('/presence/offline', async (req, res) => {
  const authorization = req.headers.authorization || '';
  const [, bearerToken] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  const token = bearerToken || req.body?.token;

  try {
    const auth = verifyAuthToken(token);
    await query(
      `UPDATE app_users
       SET last_seen_at = NULL
       WHERE id = $1`,
      [auth.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 401).json({ detail: err.message });
  }
});

module.exports = router;
