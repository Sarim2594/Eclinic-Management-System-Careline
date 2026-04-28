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
  const authUserId = req.auth?.superadmin_id || req.auth?.admin_id || req.auth?.doctor_id || req.auth?.receptionist_id || null;

  try {
    if (role !== req.auth?.role) {
      return res.status(403).json({ detail: 'You can only read notifications for your own role' });
    }

    let result;
    if (role === 'superadmin') {
      result = await query(
        `SELECT * FROM notifications
         WHERE recipient_type = 'superadmin'
         ORDER BY created_at DESC`
      );
    } else {
      if (!authUserId) {
        return res.status(400).json({ detail: 'user_id is required for non-superadmin roles' });
      }
      result = await query(
        `SELECT * FROM notifications
         WHERE recipient_type = $1 AND recipient_id = $2
         ORDER BY created_at DESC`,
        [role, authUserId]
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
  const recipientId = req.auth?.superadmin_id || req.auth?.admin_id || req.auth?.doctor_id || req.auth?.receptionist_id || null;
  try {
    let result;
    if (req.auth?.role === 'superadmin') {
      result = await query(
        `UPDATE notifications
         SET read = TRUE
         WHERE id = $1 AND recipient_type = 'superadmin'
         RETURNING *`,
        [notification_id]
      );
    } else {
      result = await query(
        `UPDATE notifications
         SET read = TRUE
         WHERE id = $1 AND recipient_type = $2 AND recipient_id = $3
         RETURNING *`,
        [notification_id, req.auth.role, recipientId]
      );
    }
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
  const authUserId = req.auth?.superadmin_id || req.auth?.admin_id || req.auth?.doctor_id || req.auth?.receptionist_id || null;

  try {
    if (role !== req.auth?.role) {
      return res.status(403).json({ detail: 'You can only update notifications for your own role' });
    }

    if (role === 'superadmin') {
      await query(
        `UPDATE notifications SET read = TRUE WHERE recipient_type = 'superadmin'`
      );
    } else {
      if (!authUserId) {
        return res.status(400).json({ detail: 'user_id is required for non-superadmin roles' });
      }
      await query(
        `UPDATE notifications SET read = TRUE
         WHERE recipient_type = $1 AND recipient_id = $2`,
        [role, authUserId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
