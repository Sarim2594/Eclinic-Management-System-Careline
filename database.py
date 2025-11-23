import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import traceback
import hashlib
import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    """PostgreSQL Database Handler with Connection Pooling"""
    
    def __init__(self):
        try:
            self.connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,
                host=os.getenv('DB_HOST'),
                port=os.getenv('DB_PORT'),
                database=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD')
            )
            
            if self.connection_pool:
                self._create_tables()
            else:
                raise Exception("Failed to create connection pool")
                
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            traceback.print_exc()
            raise
    
    @contextmanager
    def get_cursor(self, cursor_factory=RealDictCursor):
        """Context manager for database cursor"""
        conn = self.connection_pool.getconn()
        try:
            cursor = conn.cursor(cursor_factory=cursor_factory)
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            self.connection_pool.putconn(conn)
    
    def _create_tables(self):
        """Create all database tables with proper 3NF structure and auto-increment PKs"""
        with self.get_cursor() as cursor:
            # Drop tables in reverse order of dependencies (for fresh start)
            cursor.execute("""
                DROP TABLE IF EXISTS notifications CASCADE;
                DROP TABLE IF EXISTS appointments CASCADE;
                DROP TABLE IF EXISTS availability_schedules CASCADE;
                DROP TABLE IF EXISTS bulletins CASCADE;
                DROP TABLE IF EXISTS admin_regions CASCADE;
                DROP TABLE IF EXISTS doctors CASCADE;
                DROP TABLE IF EXISTS receptionists CASCADE;
                DROP TABLE IF EXISTS admins CASCADE;
                DROP TABLE IF EXISTS superadmins CASCADE;
                DROP TABLE IF EXISTS patients CASCADE;
                DROP TABLE IF EXISTS clinics CASCADE;
                DROP TABLE IF EXISTS pakistan_regions CASCADE;
                DROP TABLE IF EXISTS companies CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            """)
            
            # Users table (authentication only) - updated with superadmin role
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin', 'doctor', 'receptionist')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Companies table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    registration_number VARCHAR(100) UNIQUE NOT NULL,
                    address TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Pakistan regions table (for city-to-region mapping)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pakistan_regions (
                    id SERIAL PRIMARY KEY,
                    city VARCHAR(100) NOT NULL,
                    sub_region VARCHAR(100) NOT NULL,
                    province VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(city, province)
                )
            """)
            
            # Clinics table - updated with company_id and city
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clinics (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    location VARCHAR(255) NOT NULL,
                    city VARCHAR(100) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Patients table (no user_id, standalone)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patients (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
                    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
                    father_name VARCHAR(255) NOT NULL,
                    marital_status VARCHAR(10) NOT NULL CHECK (marital_status IN ('Married', 'Single')),
                    contact VARCHAR(20) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    address VARCHAR(255) NOT NULL,
                    cnic VARCHAR(20) UNIQUE NOT NULL,
                    occupation VARCHAR(100),
                    nationality VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # SuperAdmins table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS superadmins (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Admins table - updated with company_id
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admins (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Admin regions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_regions (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    region VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(admin_id, region)
                )
            """)
            
            # Admin change requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_change_requests (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('password_reset', 'contact_change', 'regions_change')),
                    requested_data TEXT NOT NULL,
                    reason TEXT,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    rejection_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Receptionists table (linking users to clinics)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS receptionists (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Doctors table (linking users to clinics)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctors (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    license_number VARCHAR(50) UNIQUE NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Availability schedules table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS availability_schedules (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
                    start_time TIME,
                    end_time TIME,
                    is_active BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Appointments table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
                    ticket_no INTEGER NOT NULL,
                    vitals JSONB DEFAULT '{}',
                    diagnosis TEXT DEFAULT '',
                    prescription TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'completed', 'cancelled')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    ended_at TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Bulletins table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bulletins (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Notifications table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('superadmin', 'admin', 'doctor', 'receptionist')),
                    recipient_id INTEGER,
                    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
                    receptionist_id INTEGER REFERENCES receptionists(id) ON DELETE CASCADE,
                    clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
                    clinic_name VARCHAR(255),
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT check_recipient CHECK (
                        (recipient_type = 'superadmin' AND recipient_id IS NULL) OR
                        (recipient_type = 'admin' AND recipient_id IS NOT NULL) OR
                        (recipient_type = 'doctor' AND recipient_id IS NOT NULL) OR
                        (recipient_type = 'receptionist' AND recipient_id IS NOT NULL)
                    )
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                
                CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
                CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
                
                CREATE INDEX IF NOT EXISTS idx_pakistan_regions_city ON pakistan_regions(city);
                CREATE INDEX IF NOT EXISTS idx_pakistan_regions_province_subregion ON pakistan_regions(province, sub_region);
                
                CREATE INDEX IF NOT EXISTS idx_clinics_company_id ON clinics(company_id);
                CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);
                
                CREATE INDEX IF NOT EXISTS idx_superadmins_user_id ON superadmins(user_id);
                
                CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
                CREATE INDEX IF NOT EXISTS idx_admins_company_id ON admins(company_id);
                
                CREATE INDEX IF NOT EXISTS idx_admin_regions_admin_id ON admin_regions(admin_id);
                CREATE INDEX IF NOT EXISTS idx_admin_regions_region ON admin_regions(region);
                
                CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
                CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
                CREATE INDEX IF NOT EXISTS idx_doctors_license ON doctors(license_number);
                CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
                
                CREATE INDEX IF NOT EXISTS idx_receptionists_user_id ON receptionists(user_id);
                CREATE INDEX IF NOT EXISTS idx_receptionists_clinic_id ON receptionists(clinic_id);
                
                CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients(contact);
                CREATE INDEX IF NOT EXISTS idx_patients_cnic ON patients(cnic);
                
                CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
                CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);
                
                CREATE INDEX IF NOT EXISTS idx_availability_doctor_id ON availability_schedules(doctor_id);
                CREATE INDEX IF NOT EXISTS idx_availability_day ON availability_schedules(day_of_week);
                
                CREATE INDEX IF NOT EXISTS idx_bulletins_company_id ON bulletins(company_id);
                CREATE INDEX IF NOT EXISTS idx_bulletins_active ON bulletins(active);
                
                CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
                CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
            """)
    
    def initialize_test_data(self):
        """Initialize database with Pakistani test data"""
        
        with self.get_cursor() as cursor:
            # Clear existing data
            cursor.execute("""
                TRUNCATE TABLE notifications, appointments, availability_schedules, 
                       bulletins, admin_regions, doctors, receptionists, admins, 
                       superadmins, patients, clinics, pakistan_regions, companies, users
                RESTART IDENTITY CASCADE
            """)
            
            # ============= PAKISTAN REGIONS MAPPING =============
            pakistan_regions_data = {
                "Punjab": {
                    "Central Punjab": ["Lahore", "Faisalabad", "Kasur", "Okara", "Sheikhupura", "Nankana Sahib", "Chiniot", "Jhang", "Toba Tek Singh", "Kamoke", "Murīdke", "Raiwind", "Pattoki", "Depalpur", "Gojra", "Samundri", "Shorkot", "Shahkot", "Jaranwala"],
                    "Potohar Region": ["Rawalpindi", "Islamabad", "Attock", "Taxila", "Wah Cantonment", "Chakwal", "Talagang", "Jhelum", "Dina", "Gujar Khan", "Murree", "Kotli Sattian", "Kahuta", "Kallar Syedan"],
                    "Western Punjab": ["Sargodha", "Mianwali", "Khushab", "Bhakkar", "Kot Adu", "Jauharabad", "Kundian"],
                    "Southern Punjab": ["Multan", "Bahawalpur", "Bahawalnagar", "DG Khan", "Muzaffargarh", "Layyah", "Rajanpur", "Rahim Yar Khan", "Sadiqabad", "Khanpur", "Lodhran", "Hasilpur"],
                    "Eastern Punjab": ["Gujranwala", "Sialkot", "Gujrat", "Wazirabad", "Daska", "Narowal", "Hafizabad", "Phalia", "Mandi Bahauddin"]
                },
                "Sindh": {
                    "Upper Sindh": ["Sukkur", "Larkana", "Khairpur", "Shikarpur", "Jacobabad", "Ghotki", "Kashmore", "Kandhkot", "Rohri"],
                    "Lower Sindh": ["Karachi", "Hyderabad", "Thatta", "Mirpur Sakro", "Badin", "Sujawal", "Kotri", "Tando Muhammad Khan", "Tando Allahyar"],
                    "Central Sindh": ["Nawabshah", "Sanghar", "Dadu", "Jamshoro", "Matiari", "Shahdadpur", "Sehwan"],
                    "Thar Region": ["Mithi", "Tharparkar", "Umerkot", "Mirpur Khas", "Diplo", "Chachro", "Nagarparkar"]
                },
                "Khyber Pakhtunkhwa": {
                    "Northern KP": ["Abbottabad", "Mansehra", "Balakot", "Battagram", "Besham", "Alpuri", "Swat", "Mingora", "Kalam", "Malakand", "Dir", "Chitral", "Drosh"],
                    "Central KP": ["Peshawar", "Mardan", "Charsadda", "Nowshera", "Swabi", "Takht-i-Bahi"],
                    "Southern KP": ["Kohat", "Hangu", "Karak", "Bannu", "Lakki Marwat", "Tank", "Dera Ismail Khan"],
                    "Ex-FATA Areas": ["Khyber", "Bara", "Parachinar", "Sadda", "Miramshah", "Miran Shah", "Wana", "Ghalanai", "Khar"]
                },
                "Balochistan": {
                    "Central Balochistan": ["Quetta", "Pishin", "Chaman", "Ziarat", "Mastung", "Killa Abdullah", "Huramzai"],
                    "Northern Balochistan": ["Zhob", "Loralai", "Killa Saifullah", "Musakhel", "Barkhan", "Sherani"],
                    "Eastern Balochistan": ["Sibi", "Dera Bugti", "Kohlu", "Dhadar", "Jaffarabad", "Sohbatpur"],
                    "Western Balochistan": ["Chagai", "Nushki", "Dalbandin", "Kharan", "Washuk"],
                    "Makran Region": ["Gwadar", "Turbat", "Kech", "Panjgur", "Awaran", "Lasbela", "Hub", "Ormara", "Pasni"]
                }
            }
            
            # Populate pakistan_regions table
            regions_insert_data = []
            for province, sub_regions in pakistan_regions_data.items():
                for sub_region, cities in sub_regions.items():
                    for city in cities:
                        regions_insert_data.append((city, sub_region, province))
            
            cursor.executemany("""
                INSERT INTO pakistan_regions (city, sub_region, province) 
                VALUES (%s, %s, %s)
            """, regions_insert_data)
            
            print(f"✓ Inserted {len(regions_insert_data)} city-to-region mappings")
            
            # ============= COMPANIES =============
            companies_data = [
                ("Edhi Foundation", "info@edhi.pk", "+923001111000", "REG-EDH-2024-001", "Blue Area, Islamabad, Pakistan", "active"),
                ("Sehat Medical Group", "contact@sehat.pk", "+923002222000", "REG-SMG-2024-002", "Clifton Block 5, Karachi, Pakistan", "active"),
                ("E-Shifa Wellness Services", "admin@eshifa.pk", "+923003333000", "REG-SWS-2024-003", "Model Town, Lahore, Pakistan", "inactive")
            ]
            
            cursor.executemany("""
                INSERT INTO companies (name, email, contact, registration_number, address, status) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, companies_data)
            
            print(f"✓ Inserted {len(companies_data)} companies")
            
            # ============= USERS =============
            superadmin_pass = hashlib.sha256("super123".encode()).hexdigest()
            admin_pass = hashlib.sha256("admin123".encode()).hexdigest()
            doc_pass = hashlib.sha256("doc123".encode()).hexdigest()
            recep_pass = hashlib.sha256("recep123".encode()).hexdigest()
            
            users_data = [
                # SuperAdmin
                ('muhammad.yasir', 'muhammad.yasir@edhi.pk', superadmin_pass, 'superadmin'),
                # Admins
                ('areeb.rehman', 'areeb.rehman@edhi.pk', admin_pass, 'admin'),
                ('junaid.ahmed', 'junaid.ahmed@sehat.pk', admin_pass, 'admin'),
                ('sarim.khan', 'sarim.khan@edhi.pk', admin_pass, 'admin'),
                # Doctors
                ('ahmed.ali', 'ahmed.ali@edhi.pk', doc_pass, 'doctor'),
                ('fatima.hassan', 'fatima.hassan@edhi.pk', doc_pass, 'doctor'),
                ('sara.khan', 'sara.khan@sehat.pk', doc_pass, 'doctor'),
                # Receptionists
                ('syed.ammar', 'syed.ammar@edhi.pk', recep_pass, 'receptionist'),
                ('zainab.malik', 'zainab.malik@sehat.pk', recep_pass, 'receptionist'),
                ('hina.tariq', 'hina.tariq@edhi.pk', recep_pass, 'receptionist')
            ]
            
            cursor.executemany("""
                INSERT INTO users (username, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, users_data)
            
            print(f"✓ Inserted {len(users_data)} users")
            
            # ============= SUPERADMIN =============
            superadmin_data = [(1, 'Muhammad Yasir', '+923009999999')]
            
            cursor.executemany("""
                INSERT INTO superadmins (user_id, name, contact) 
                VALUES (%s, %s, %s)
            """, superadmin_data)
            
            print(f"✓ Inserted {len(superadmin_data)} superadmin")
            
            # ============= CLINICS (with company_id and city) =============
            clinics_data = [
                (1, "Shifa Medical Center", "F-7, Islamabad", "Islamabad"),
                (2, "Aga Khan Hospital", "Stadium Road, Karachi", "Karachi"),
                (1, "Services Hospital", "Jail Road, Lahore", "Lahore")
            ]
            
            cursor.executemany("""
                INSERT INTO clinics (company_id, name, location, city) 
                VALUES (%s, %s, %s, %s)
            """, clinics_data)
            
            print(f"✓ Inserted {len(clinics_data)} clinics")
            
            # ============= ADMINS (with company_id) =============
            admins_data = [
                (2, 1, 'Areeb Rehman', '+923001234547'),   # Company 1
                (3, 2, 'Junaid Ahmed', '+923002645678'),     # Company 2
                (4, 1, 'Sarim Khan', '+923003476789')        # Company 1 (multiple admins for same company)
            ]
            
            cursor.executemany("""
                INSERT INTO admins (user_id, company_id, name, contact) 
                VALUES (%s, %s, %s, %s)
            """, admins_data)
            
            print(f"✓ Inserted {len(admins_data)} admins")
            
            # ============= ADMIN REGIONS =============
            admin_regions_data = [
                (1, 'Punjab|Central Punjab'),
                (1, 'Punjab|Potohar Region'),
                (2, 'Sindh|Lower Sindh'),
                (2, 'Sindh|Upper Sindh'),
                (3, 'Khyber Pakhtunkhwa|Central KP'),
                (3, 'Khyber Pakhtunkhwa|Northern KP')
            ]
            
            cursor.executemany("""
                INSERT INTO admin_regions (admin_id, region) 
                VALUES (%s, %s)
            """, admin_regions_data)
            
            print(f"✓ Inserted {len(admin_regions_data)} admin region assignments")
            
            # ============= DOCTORS =============
            doctors_data = [
                (5, 1, 'Ahmed Ali', 'PMC-12345', '+923001234567'),
                (6, 1, 'Fatima Hassan', 'PMC-12346', '+923002345678'),
                (7, 2, 'Sara Khan', 'PMC-12347', '+923003456789')
            ]
            
            cursor.executemany("""
                INSERT INTO doctors (user_id, clinic_id, name, license_number, contact) 
                VALUES (%s, %s, %s, %s, %s)
            """, doctors_data)
            
            print(f"✓ Inserted {len(doctors_data)} doctors")
            
            # ============= RECEPTIONISTS =============
            receptionists_data = [
                (8, 1, 'Syed Ammar', '+923001111111'),
                (9, 2, 'Zainab Malik', '+923002222222'),
                (10, 3, 'Hina Tariq', '+923003333333')
            ]
            
            cursor.executemany("""
                INSERT INTO receptionists (user_id, clinic_id, name, contact) 
                VALUES (%s, %s, %s, %s)
            """, receptionists_data)
            
            print(f"✓ Inserted {len(receptionists_data)} receptionists")
            
            # ============= AVAILABILITY SCHEDULES =============
            availability_data = []
            
            # Doctor 1: Mon-Sun 9AM-5PM
            for day in range(1, 8):
                availability_data.append((1, day, '09:00', '17:00'))
            
            # Doctor 2: Mon-Sat 5PM-5AM (night shift), Sun 5PM-3AM
            for day in range(1, 7):
                availability_data.append((2, day, '17:00', '05:00'))
            availability_data.append((2, 7, '17:00', '03:00'))
            
            # Doctor 3: Tue-Sun 1:45PM-8PM (off on Monday)
            for day in range(2, 8):
                availability_data.append((3, day, '13:45', '20:00'))
            availability_data.append((3, 1, None, None))
            
            cursor.executemany("""
                INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time) 
                VALUES (%s, %s, %s, %s)
            """, availability_data)
            
            print(f"✓ Inserted {len(availability_data)} availability schedules")
            
            # ============= SAMPLE BULLETINS (one per company) =============
            cursor.execute("""
                INSERT INTO bulletins (company_id, title, message) 
                VALUES 
                    (1, 'Dengue Fever Alert', '⚠️ Increased dengue cases in urban areas. Use mosquito repellent and eliminate standing water.'),
                    (2, 'New COVID-19 Guidelines', '📋 Updated protocols for patient screening. All staff must follow new safety measures.'),
                    (1, 'Staff Training Session', '📚 Mandatory training on new equipment next Monday at 9 AM. Attendance is required.')
            """)
            
            print("✓ Inserted sample bulletins")
            print("\n✅ Test data initialization complete!")
    
    def close(self):
        """Close all database connections"""
        if self.connection_pool:
            self.connection_pool.closeall()