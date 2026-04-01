const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ============================================================================
// NOTIFICATIONS ROUTES
// Replaces: src/notifications/routes.py + services.py
// ============================================================================

/**
 * GET /api/notifications/:role
 * Query param: user_id (required for non-superadmin)
 */
router.get('/notifications/:role', async (req, res) => {
  const { role } = req.params;
  const user_id = req.query.user_id ? parseInt(req.query.user_id) : null;

  try {
    let result;
    if (role === 'superadmin') {
      result = await query(
        `SELECT * FROM notifications
         WHERE recipient_type = 'superadmin'
         ORDER BY created_at DESC`
      );
    } else {
      if (!user_id) {
        return res.status(400).json({ detail: 'user_id is required for non-superadmin roles' });
      }
      result = await query(
        `SELECT * FROM notifications
         WHERE recipient_type = $1 AND recipient_id = $2
         ORDER BY created_at DESC`,
        [role, user_id]
      );
    }
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: err.message });
  }
});

/**
 * PUT /api/notifications/mark-read/:notification_id
 */
router.put('/notifications/mark-read/:notification_id', async (req, res) => {
  const { notification_id } = req.params;
  try {
    const result = await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *`,
      [notification_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Notification not found' });
    }
    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * PUT /api/notifications/mark-all-read/:role
 * Query param: user_id
 */
router.put('/notifications/mark-all-read/:role', async (req, res) => {
  const { role } = req.params;
  const user_id = req.query.user_id ? parseInt(req.query.user_id) : null;

  try {
    if (role === 'superadmin') {
      await query(
        `UPDATE notifications SET read = TRUE WHERE recipient_type = 'superadmin'`
      );
    } else {
      if (!user_id) {
        return res.status(400).json({ detail: 'user_id is required for non-superadmin roles' });
      }
      await query(
        `UPDATE notifications SET read = TRUE
         WHERE recipient_type = $1 AND recipient_id = $2`,
        [role, user_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
