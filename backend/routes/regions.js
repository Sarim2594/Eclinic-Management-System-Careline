const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ============================================================================
// REGIONS ROUTES
// Replaces: src/core/region_routes.py + region_services.py
// ============================================================================

/** GET /api/regions/lookup/:city */
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

/** GET /api/regions/all - All provinces, sub-regions, cities */
router.get('/regions/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id AS region_id, r.province, r.sub_region,
              json_agg(json_build_object('id', ci.id, 'name', ci.name) ORDER BY ci.name) AS cities
       FROM regions r
       LEFT JOIN cities ci ON ci.region_id = r.id
       GROUP BY r.id, r.province, r.sub_region
       ORDER BY r.province, r.sub_region`
    );
    res.json({ regions: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/regions/:region_id/cities */
router.get('/regions/:region_id/cities', async (req, res) => {
  const { region_id } = req.params;
  try {
    const result = await query(
      'SELECT id, name FROM cities WHERE region_id = $1 ORDER BY name',
      [region_id]
    );
    res.json({ cities: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/** GET /api/cities/all */
router.get('/cities/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT ci.id, ci.name, r.id AS region_id, r.province, r.sub_region
       FROM cities ci
       JOIN regions r ON ci.region_id = r.id
       ORDER BY r.province, r.sub_region, ci.name`
    );
    res.json({ cities: result.rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
