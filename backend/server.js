const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const bulletinRoutes = require('./routes/bulletins');
const clinicRoutes = require('./routes/clinics');
const regionRoutes = require('./routes/regions');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctor');
const receptionistRoutes = require('./routes/receptionist');
const superadminRoutes = require('./routes/superadmin');
const { checkAndSendLateReminders } = require('./utils/reminderEmail');
const { requireAuth, requireRole } = require('./middleware/auth');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin is not allowed'));
  },
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, notificationRoutes);
app.use('/api', requireAuth, bulletinRoutes);
app.use('/api', requireAuth, clinicRoutes);
app.use('/api', requireAuth, regionRoutes);
app.use('/api/receptionist', requireAuth, requireRole('receptionist'), receptionistRoutes);
app.use('/api/doctor', requireAuth, requireRole('doctor'), doctorRoutes);
app.use('/api/admin', requireAuth, requireRole('admin'), adminRoutes);
app.use('/api/superadmin', requireAuth, requireRole('superadmin'), superadminRoutes);

app.get('/_debug/db-stats', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { query } = require('./db');
  try {
    const patients = await query('SELECT COUNT(*) AS cnt FROM patients');
    const appointments = await query('SELECT COUNT(*) AS cnt FROM appointments');
    res.json({
      patients: parseInt(patients.rows[0].cnt, 10),
      appointments: parseInt(appointments.rows[0].cnt, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ detail: err.message || 'Internal Server Error' });
});

const PORT = process.env.APP_PORT || 5000;
const HOST = process.env.APP_HOST || '0.0.0.0';

async function startServer() {
  setInterval(checkAndSendLateReminders, 10 * 60 * 1000);
  setTimeout(checkAndSendLateReminders, 30 * 1000);

  app.listen(PORT, HOST, () => {
    console.log(`\nCareLine API running at http://${HOST}:${PORT}`);
    console.log(`React frontend should run on http://localhost:3000\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
