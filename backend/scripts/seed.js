const { pool, transaction } = require('../db');
const { hashPassword } = require('../utils/passwords');

const REGION_ROWS = [
  [1, 'Punjab', 'Central Punjab'],
  [2, 'Punjab', 'Potohar Region'],
  [3, 'Punjab', 'Western Punjab'],
  [4, 'Punjab', 'Southern Punjab'],
  [5, 'Punjab', 'Eastern Punjab'],
  [6, 'Sindh', 'Upper Sindh'],
  [7, 'Sindh', 'Lower Sindh'],
  [8, 'Sindh', 'Central Sindh'],
  [9, 'Sindh', 'Thar Region'],
  [10, 'Khyber Pakhtunkhwa', 'Northern KP'],
  [11, 'Khyber Pakhtunkhwa', 'Central KP'],
  [12, 'Khyber Pakhtunkhwa', 'Southern KP'],
  [13, 'Khyber Pakhtunkhwa', 'Ex-FATA Areas'],
  [14, 'Balochistan', 'Central Balochistan'],
  [15, 'Balochistan', 'Northern Balochistan'],
  [16, 'Balochistan', 'Eastern Balochistan'],
  [17, 'Balochistan', 'Western Balochistan'],
  [18, 'Balochistan', 'Makran Region'],
  [19, 'Gilgit-Baltistan & AJK', 'Gilgit Division'],
  [20, 'Gilgit-Baltistan & AJK', 'AJK Central'],
  [21, 'Gilgit-Baltistan & AJK', 'Baltistan Region'],
];

const CITY_ROWS = [
  [1, 'Lahore', 1], [2, 'Faisalabad', 1], [3, 'Kasur', 1], [4, 'Okara', 1], [5, 'Sheikhupura', 1],
  [6, 'Nankana Sahib', 1], [7, 'Chiniot', 1], [8, 'Jhang', 1], [9, 'Toba Tek Singh', 1], [10, 'Rawalpindi', 2],
  [11, 'Islamabad', 2], [12, 'Attock', 2], [13, 'Chakwal', 2], [14, 'Jhelum', 2], [15, 'Sargodha', 3],
  [16, 'Mianwali', 3], [17, 'Khushab', 3], [18, 'Bhakkar', 3], [19, 'Multan', 4], [20, 'Bahawalpur', 4],
  [21, 'Bahawalnagar', 4], [22, 'DG Khan', 4], [23, 'Muzaffargarh', 4], [24, 'Rahim Yar Khan', 4], [25, 'Gujranwala', 5],
  [26, 'Sialkot', 5], [27, 'Gujrat', 5], [28, 'Narowal', 5], [29, 'Hafizabad', 5], [30, 'Sukkur', 6],
  [31, 'Larkana', 6], [32, 'Khairpur', 6], [33, 'Shikarpur', 6], [34, 'Jacobabad', 6], [35, 'Karachi', 7],
  [36, 'Hyderabad', 7], [37, 'Thatta', 7], [38, 'Badin', 7], [39, 'Nawabshah', 8], [40, 'Sanghar', 8],
  [41, 'Dadu', 8], [42, 'Jamshoro', 8], [43, 'Mithi', 9], [44, 'Tharparkar', 9], [45, 'Umerkot', 9],
  [46, 'Mirpur Khas', 9], [47, 'Abbottabad', 10], [48, 'Mansehra', 10], [49, 'Swat', 10], [50, 'Mingora', 10],
  [51, 'Chitral', 10], [52, 'Peshawar', 11], [53, 'Mardan', 11], [54, 'Charsadda', 11], [55, 'Nowshera', 11],
  [56, 'Swabi', 11], [57, 'Kohat', 12], [58, 'Bannu', 12], [59, 'Dera Ismail Khan', 12], [60, 'Khyber', 13],
  [61, 'Parachinar', 13], [62, 'Miramshah', 13], [63, 'Wana', 13], [64, 'Quetta', 14], [65, 'Pishin', 14],
  [66, 'Ziarat', 14], [67, 'Mastung', 14], [68, 'Zhob', 15], [69, 'Loralai', 15], [70, 'Killa Saifullah', 15],
  [71, 'Sibi', 16], [72, 'Dera Bugti', 16], [73, 'Kohlu', 16], [74, 'Chagai', 17], [75, 'Nushki', 17],
  [76, 'Kharan', 17], [77, 'Gwadar', 18], [78, 'Turbat', 18], [79, 'Kech', 18], [80, 'Panjgur', 18],
  [81, 'Lasbela', 18], [82, 'Gilgit', 19], [83, 'Hunza', 19], [84, 'Skardu', 19], [85, 'Muzaffarabad', 20],
  [86, 'Mirpur', 20], [87, 'Rawalakot', 20], [88, 'Khaplu', 21], [89, 'Shigar', 21],
];

const SPECIALIZATION_ROWS = [
  [1, 'General Practitioner'],
  [2, 'Pediatrics'],
  [3, 'Cardiology'],
  [4, 'Dermatology'],
  [5, 'Gynecology'],
  [6, 'Orthopedics'],
  [7, 'ENT'],
  [8, 'Neurology'],
];

const DEFAULT_OPERATING_HOURS = {
  Monday: { open: '09:00', close: '17:00' },
  Tuesday: { open: '09:00', close: '17:00' },
  Wednesday: { open: '09:00', close: '17:00' },
  Thursday: { open: '09:00', close: '17:00' },
  Friday: { open: '09:00', close: '17:00' },
  Saturday: { open: '10:00', close: '14:00' },
  Sunday: { open: '10:00', close: '14:00' },
};

async function insertUser(client, { username, email, password, role, status = 'active' }) {
  const result = await client.query(
    `INSERT INTO app_users (username, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [username, email.toLowerCase(), await hashPassword(password), role, status]
  );
  return result.rows[0];
}

async function seed() {
  await transaction(async (client) => {
    const regionIdMap = new Map();
    for (const [legacyId, province, subRegion] of REGION_ROWS) {
      const result = await client.query(
        `INSERT INTO regions (province, sub_region)
         VALUES ($1, $2)
         RETURNING id`,
        [province, subRegion]
      );
      regionIdMap.set(legacyId, result.rows[0].id);
    }

    const cityIdMap = new Map();
    for (const [legacyId, name, legacyRegionId] of CITY_ROWS) {
      const result = await client.query(
        `INSERT INTO cities (name, region_id)
         VALUES ($1, $2)
         RETURNING id`,
        [name, regionIdMap.get(legacyRegionId)]
      );
      cityIdMap.set(legacyId, result.rows[0].id);
    }

    const specializationIdMap = new Map();
    for (const [legacyId, name] of SPECIALIZATION_ROWS) {
      const result = await client.query(
        `INSERT INTO specializations (name)
         VALUES ($1)
         RETURNING id`,
        [name]
      );
      specializationIdMap.set(legacyId, result.rows[0].id);
    }

    const superUser = await insertUser(client, {
      username: 'muhammad.yasir',
      email: 'muhammad.yasir@careline.local',
      password: 'super123',
      role: 'superadmin',
    });
    const superadmin = await client.query(
      `INSERT INTO superadmins (user_id, name, contact)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [superUser.id, 'Muhammad Yasir', '03001234567']
    );

    const company = await client.query(
      `INSERT INTO companies (name, email, contact, registration_number, address, subscription_plan, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        'CareLine Demo Company',
        'demo.company@careline.local',
        '03007654321',
        'CL-2026-DEMO01',
        '1 Demo Avenue, Lahore',
        'purchase',
      ]
    );

    const adminUser = await insertUser(client, {
      username: 'sarim.khan',
      email: 'sarim.khan@careline.local',
      password: 'admin123',
      role: 'admin',
    });
    const admin = await client.query(
      `INSERT INTO admins (user_id, company_id, name, contact)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [adminUser.id, company.rows[0].id, 'Sarim Khan', '03001112222']
    );

    for (const regionLegacyId of [1, 2]) {
      await client.query(
        `INSERT INTO admin_regions (admin_id, region_id)
         VALUES ($1, $2)`,
        [admin.rows[0].id, regionIdMap.get(regionLegacyId)]
      );
    }

    const clinic = await client.query(
      `INSERT INTO clinics (company_id, city_id, name, location, status, operating_hours)
       VALUES ($1, $2, $3, $4, 'active', $5::jsonb)
       RETURNING *`,
      [
        company.rows[0].id,
        cityIdMap.get(1),
        'CareLine Lahore Central Clinic',
        'Gulberg Main Boulevard, Lahore',
        JSON.stringify(DEFAULT_OPERATING_HOURS),
      ]
    );

    const receptionistUser = await insertUser(client, {
      username: 'kamran.akmal',
      email: 'kamran.akmal@careline.local',
      password: 'recep123',
      role: 'receptionist',
    });
    const receptionist = await client.query(
      `INSERT INTO receptionists (user_id, clinic_id, name, contact, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [receptionistUser.id, clinic.rows[0].id, 'Kamran Akmal', '03005556666']
    );

    const doctorOneUser = await insertUser(client, {
      username: 'ahmed.ali',
      email: 'ahmed.ali@careline.local',
      password: 'doc123',
      role: 'doctor',
    });
    const doctorOne = await client.query(
      `INSERT INTO doctors (user_id, clinic_id, name, specialization_id, license_number, contact, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        doctorOneUser.id,
        clinic.rows[0].id,
        'Ahmed Ali',
        specializationIdMap.get(1),
        'PMC-10001',
        '03002223333',
      ]
    );

    const doctorTwoUser = await insertUser(client, {
      username: 'fatima.sheikh',
      email: 'fatima.sheikh@careline.local',
      password: 'doc123',
      role: 'doctor',
    });
    const doctorTwo = await client.query(
      `INSERT INTO doctors (user_id, clinic_id, name, specialization_id, license_number, contact, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        doctorTwoUser.id,
        clinic.rows[0].id,
        'Fatima Sheikh',
        specializationIdMap.get(2),
        'PMC-10002',
        '03009998888',
      ]
    );

    for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 7]) {
      await client.query(
        `INSERT INTO doctor_weekly_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctorOne.rows[0].id, dayOfWeek, '00:00', '23:59']
      );
    }

    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await client.query(
        `INSERT INTO doctor_weekly_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctorTwo.rows[0].id, dayOfWeek, '09:00', '17:00']
      );
    }
    await client.query(
      `INSERT INTO doctor_weekly_availability (doctor_id, day_of_week, start_time, end_time)
       VALUES ($1, 6, '10:00', '14:00')`,
      [doctorTwo.rows[0].id]
    );
    await client.query(
      `INSERT INTO doctor_weekly_availability (doctor_id, day_of_week, start_time, end_time)
       VALUES ($1, 7, '10:00', '14:00')`,
      [doctorTwo.rows[0].id]
    );

    const patientOne = await client.query(
      `INSERT INTO patients (name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        'Ali Raza',
        32,
        'Male',
        'Raza Ahmed',
        'Married',
        '03004445555',
        'ali.raza@example.com',
        'Model Town, Lahore',
        '35202-1234567-1',
        'Engineer',
        'Pakistani',
      ]
    );

    const patientTwo = await client.query(
      `INSERT INTO patients (name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        'Sara Khan',
        27,
        'Female',
        'Imran Khan',
        'Single',
        '03007778888',
        'sara.khan@example.com',
        'Johar Town, Lahore',
        '35202-7654321-2',
        'Teacher',
        'Pakistani',
      ]
    );

    const waitingAppointment = await client.query(
      `INSERT INTO appointments_core (patient_id, doctor_id, clinic_id, ticket_no, status)
       VALUES ($1, $2, $3, 1, 'waiting')
       RETURNING *`,
      [patientOne.rows[0].id, doctorOne.rows[0].id, clinic.rows[0].id]
    );
    await client.query(
      `INSERT INTO appointment_encounters (appointment_id, vitals, diagnosis, prescription, notes)
       VALUES ($1, $2::jsonb, '', '', '')`,
      [waitingAppointment.rows[0].id, JSON.stringify({ bp: '120/80', pulse: '72' })]
    );

    const completedAppointment = await client.query(
      `INSERT INTO appointments_core (patient_id, doctor_id, clinic_id, ticket_no, status, started_at, ended_at)
       VALUES ($1, $2, $3, 2, 'completed', CURRENT_TIMESTAMP - INTERVAL '50 minutes', CURRENT_TIMESTAMP - INTERVAL '20 minutes')
       RETURNING *`,
      [patientTwo.rows[0].id, doctorTwo.rows[0].id, clinic.rows[0].id]
    );
    await client.query(
      `INSERT INTO appointment_encounters (appointment_id, vitals, diagnosis, prescription, notes)
       VALUES ($1, $2::jsonb, $3, $4, $5)`,
      [
        completedAppointment.rows[0].id,
        JSON.stringify({ temperature: '98.6 F', pulse: '74' }),
        'Seasonal flu',
        'Paracetamol 500mg twice daily',
        'Hydration and rest advised.',
      ]
    );

    await client.query(
      `INSERT INTO complaints (
        clinic_id, patient_id, created_by_receptionist_id, complaint_type, title, description, status, escalated_to_admin
      )
       VALUES ($1, $2, $3, $4, $5, $6, 'open', FALSE)`,
      [
        clinic.rows[0].id,
        patientOne.rows[0].id,
        receptionist.rows[0].id,
        'service',
        'Long wait time',
        'Patient reported that the wait time exceeded the expected duration.',
      ]
    );

    await client.query(
      `INSERT INTO doctor_unavailability_requests (
        doctor_id, clinic_id, start_datetime, end_datetime, reason, receptionist_status, receptionist_comment, receptionist_id, forwarded_to_admin_at
      )
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days 8 hours', $3, 'forwarded', $4, $5, CURRENT_TIMESTAMP)
      `,
      [
        doctorOne.rows[0].id,
        clinic.rows[0].id,
        'Attending a medical conference.',
        'Reviewed by clinic receptionist and ready for admin confirmation.',
        receptionist.rows[0].id,
      ]
    );

    await client.query(
      `INSERT INTO doctor_region_change_requests (
        doctor_id, clinic_id, requested_region_id, reason, status
      )
       VALUES ($1, $2, $3, $4, 'pending')`,
      [
        doctorTwo.rows[0].id,
        clinic.rows[0].id,
        regionIdMap.get(2),
        'Requesting assignment closer to family residence.',
      ]
    );

    await client.query(
      `INSERT INTO bulletins (company_id, title, message, active)
       VALUES ($1, $2, $3, TRUE)`,
      [company.rows[0].id, 'Welcome to the demo portal', 'This database was seeded from the normalized baseline schema.']
    );

    await client.query(
      `INSERT INTO admin_change_requests (admin_id, request_type, requested_data, reason, status)
       VALUES ($1, 'general_query', $2, $3, 'pending')`,
      [admin.rows[0].id, 'Need updated clinic branding assets.', 'Requested during demo setup.']
    );

    const notificationEvent = await client.query(
      `INSERT INTO notification_events (type, doctor_id, receptionist_id, clinic_id, clinic_name, title, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        'doctor_unavailability_forwarded',
        doctorOne.rows[0].id,
        receptionist.rows[0].id,
        clinic.rows[0].id,
        clinic.rows[0].name,
        'Doctor unavailability needs approval',
        'Ahmed Ali submitted an unavailability request that is ready for admin review.',
      ]
    );
    await client.query(
      `INSERT INTO notification_recipients (notification_id, recipient_type, recipient_id, read)
       VALUES ($1, 'admin', $2, FALSE)`,
      [notificationEvent.rows[0].id, admin.rows[0].id]
    );

    await client.query(
      `INSERT INTO audit_events (user_id, role, event_type, metadata, created_at)
       VALUES
       ($1, 'superadmin', 'login', '{}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '2 days'),
       ($2, 'admin', 'login', '{}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '1 day'),
       ($3, 'doctor', 'login', '{}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
       ($4, 'receptionist', 'login', '{}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '3 hours')`,
      [superUser.id, adminUser.id, doctorOneUser.id, receptionistUser.id]
    );

    console.log('Seed complete.');
    console.log('Demo credentials:');
    console.log(`  Superadmin: ${superUser.username} / super123`);
    console.log(`  Admin: ${adminUser.username} / admin123`);
    console.log(`  Doctor: ${doctorOneUser.username} / doc123`);
    console.log(`  Receptionist: ${receptionistUser.username} / recep123`);
    console.log(`  Superadmin profile id: ${superadmin.rows[0].id}`);
  });
}

seed()
  .catch(async (error) => {
    console.error('Failed to seed database', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
