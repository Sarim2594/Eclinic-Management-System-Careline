const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ============================================================================
// ROUTE IMPORTS
// Replaces: all app.include_router() calls in main.py
// ============================================================================
const authRoutes        = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const bulletinRoutes    = require('./routes/bulletins');
const clinicRoutes      = require('./routes/clinics');
const regionRoutes      = require('./routes/regions');
const adminRoutes       = require('./routes/admin');
const doctorRoutes      = require('./routes/doctor');
const receptionistRoutes = require('./routes/receptionist');
const superadminRoutes  = require('./routes/superadmin');
const { checkAndSendLateReminders } = require('./utils/reminderEmail');

const app = express();

// ============================================================================
// MIDDLEWARE
// Replaces: app.add_middleware(CORSMiddleware, ...) in main.py
// ============================================================================
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================================
// ROUTES
// Replaces: app.include_router(..., prefix="/api/...") calls in main.py
// All original API prefixes are preserved exactly.
// ============================================================================
app.use('/api/auth',         authRoutes);
app.use('/api',              notificationRoutes);   // /api/notifications/...
app.use('/api',              bulletinRoutes);        // /api/bulletins/...
app.use('/api',              clinicRoutes);          // /api/clinics/...
app.use('/api',              regionRoutes);          // /api/regions/..., /api/cities/...
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/doctor',       doctorRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/superadmin',   superadminRoutes);

// ============================================================================
// HEALTH CHECK / DEBUG
// Replaces: /_debug/db-stats endpoint in main.py
// ============================================================================
app.get('/_debug/db-stats', async (req, res) => {
  const { query } = require('./db');
  try {
    const patients     = await query('SELECT COUNT(*) AS cnt FROM patients');
    const appointments = await query('SELECT COUNT(*) AS cnt FROM appointments');
    res.json({
      patients:     parseInt(patients.rows[0].cnt),
      appointments: parseInt(appointments.rows[0].cnt),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ detail: err.message || 'Internal Server Error' });
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.APP_PORT || 5000;
const HOST = process.env.APP_HOST || 'localhost';
// Run late-doctor check every 10 minutes
setInterval(checkAndSendLateReminders, 10 * 60 * 1000);
// Also run once on startup (after 30 seconds to let DB settle)
setTimeout(checkAndSendLateReminders, 30 * 1000);

app.listen(PORT, HOST, () => {
  console.log(`\n🌐 CareLine API running at http://${HOST}:${PORT}`);
  console.log(`🔗 React frontend should run on http://localhost:3000\n`);
});
