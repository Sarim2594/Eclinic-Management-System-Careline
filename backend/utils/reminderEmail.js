const nodemailer = require('nodemailer');
const { query } = require('../db');
require('dotenv').config();

// ============================================================================
// DOCTOR LATE REMINDER EMAIL SYSTEM
// Fires when a doctor's shift has started but they haven't logged in
// (is_active = FALSE during scheduled shift hours)
// ============================================================================

// Configure with your SMTP credentials in .env:
//   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Find doctors whose shift has started but are not active,
 * and who have waiting patients — then email their admin.
 */
async function checkAndSendLateReminders() {
  try {
    // Find doctors: shift started, not active, have waiting patients
    const result = await query(`
      SELECT
        d.id          AS doctor_id,
        d.name        AS doctor_name,
        cl.name       AS clinic_name,
        u.email       AS doctor_email,
        COUNT(a.id)   AS waiting_count,
        av.start_time,
        av.day_of_week
      FROM doctors d
      JOIN availability_schedules av ON av.doctor_id = d.id
      JOIN clinics cl ON d.clinic_id = cl.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN appointments a ON a.doctor_id = d.id AND a.status = 'waiting'
      WHERE
        av.is_active = FALSE
        AND av.day_of_week % 7 = EXTRACT(DOW FROM CURRENT_DATE)
        AND av.start_time <= CURRENT_TIME
        AND av.start_time >= (CURRENT_TIME - INTERVAL '30 minutes')
        AND d.status = 'active'
      GROUP BY d.id, d.name, cl.name, u.email, av.start_time, av.day_of_week
      HAVING COUNT(a.id) > 0
    `);

    for (const doc of result.rows) {
      // Get the admin(s) responsible for this doctor's region
      const adminResult = await query(`
        SELECT u.email AS admin_email, ad.name AS admin_name
        FROM admins ad
        JOIN users u ON ad.user_id = u.id
        JOIN admin_regions ar ON ar.admin_id = ad.id
        JOIN clinics cl ON cl.company_id = ad.company_id
        JOIN cities ci ON cl.city_id = ci.id
        WHERE cl.id = (SELECT clinic_id FROM doctors WHERE id = $1)
          AND ar.region_id = ci.region_id
        LIMIT 1
      `, [doc.doctor_id]);

      if (adminResult.rows.length === 0) continue;
      const admin = adminResult.rows[0];

      await transporter.sendMail({
        from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to:      admin.admin_email,
        subject: `⚠️ Doctor Late Alert — ${doc.doctor_name} has not checked in`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #e10f28; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">⚠️ Doctor Late Alert</h2>
            </div>
            <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
              <p>Dear <strong>${admin.admin_name}</strong>,</p>
              <p>
                <strong>Dr. ${doc.doctor_name}</strong> was scheduled to start at
                <strong>${doc.start_time}</strong> at <strong>${doc.clinic_name}</strong>
                but has <strong>not logged in yet</strong>.
              </p>
              <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #dc2626;">
                  <strong>${doc.waiting_count}</strong> patient(s) are currently waiting.
                </p>
              </div>
              <p>Please contact the doctor or arrange for patient transfer if needed.</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                This is an automated reminder from the CareLine Clinic Management System.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`[reminderEmail] Sent late alert for Dr. ${doc.doctor_name} to ${admin.admin_email}`);

      // Also create an in-app notification
      await query(`
        INSERT INTO notifications (type, recipient_type, recipient_id, doctor_id, title, message)
        SELECT 'doctor_late', 'admin', ad.id, $1,
               $2,
               $3
        FROM admins ad
        JOIN users u ON ad.user_id = u.id
        WHERE u.email = $4
      `, [
        doc.doctor_id,
        `Dr. ${doc.doctor_name} has not checked in`,
        `Dr. ${doc.doctor_name} at ${doc.clinic_name} was due at ${doc.start_time} and has ${doc.waiting_count} patients waiting.`,
        admin.admin_email,
      ]);
    }
  } catch (err) {
    console.error('[reminderEmail] Error:', err.message);
  }
}

module.exports = { checkAndSendLateReminders };