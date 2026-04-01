const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ============================================================================
// CLINICS ROUTES
// Replaces: src/core/clinic_routes.py + clinic_services.py
// ============================================================================

/** GET /api/clinics - All active clinics, optional filters by company_id or admin_id */
router.get('/clinics', async (req, res) => {
  const { company_id, admin_id } = req.query;
  try {
    let sql = `
      SELECT cl.*, c.name AS company_name, ci.name AS city_name, r.province, r.sub_region
      FROM clinics cl
      JOIN companies c  ON cl.company_id = c.id
      JOIN cities ci    ON cl.city_id = ci.id
      JOIN regions r    ON ci.region_id = r.id
      WHERE cl.status = 'active'
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      sql += ` AND cl.company_id = $${params.length}`;
    }

    if (admin_id) {
      params.push(admin_id);
      sql += `
        AND ci.region_id IN (
          SELECT region_id FROM admin_regions WHERE admin_id = $${params.length}
        )
      `;
    }

    sql += ' ORDER BY cl.name';
    const result = await query(sql, params);
    res.json({ clinics: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/clinic/:clinic_id/company - Get company for a clinic */
router.get('/clinic/:clinic_id/company', async (req, res) => {
  const { clinic_id } = req.params;
  try {
    const result = await query(
      'SELECT company_id FROM clinics WHERE id = $1',
      [clinic_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Clinic not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
