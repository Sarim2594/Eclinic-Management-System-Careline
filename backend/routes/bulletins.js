const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ============================================================================
// BULLETINS ROUTES
// Replaces: src/bulletins/routes.py + services.py
// ============================================================================

/** GET /api/bulletins - All active bulletins */
router.get('/bulletins', async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, c.name AS company_name
       FROM bulletins b
       JOIN companies c ON b.company_id = c.id
       WHERE b.active = TRUE
       ORDER BY b.created_at DESC`
    );
    res.json({ bulletins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/bulletins/admin/:admin_id - Bulletins for admin's company */
router.get('/bulletins/admin/:admin_id', async (req, res) => {
  const { admin_id } = req.params;
  try {
    const adminResult = await query(
      'SELECT company_id FROM admins WHERE id = $1',
      [admin_id]
    );
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Admin not found' });
    }
    const company_id = adminResult.rows[0].company_id;
    const result = await query(
      `SELECT * FROM bulletins WHERE company_id = $1 AND active = TRUE ORDER BY created_at DESC`,
      [company_id]
    );
    res.json({ bulletins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/bulletins/company/:company_id - Bulletins for a company */
router.get('/bulletins/company/:company_id', async (req, res) => {
  const { company_id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM bulletins WHERE company_id = $1 AND active = TRUE ORDER BY created_at DESC`,
      [company_id]
    );
    res.json({ bulletins: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
