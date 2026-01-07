import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
import traceback
import hashlib
import datetime
from datetime import timedelta
import random
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import os
from dotenv import load_dotenv
import logging

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
            logging.exception("❌ Database connection failed")
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
        """Create all database tables with normalized region structure"""
        with self.get_cursor() as cursor:
            # Drop tables in reverse order of dependencies
            cursor.execute("""
                DROP TABLE IF EXISTS doctor_unavailability_notification CASCADE;
                DROP TABLE IF EXISTS notifications CASCADE;
                DROP TABLE IF EXISTS doctor_unavailability_requests CASCADE;
                DROP TABLE IF EXISTS appointments CASCADE;
                DROP TABLE IF EXISTS availability_schedules CASCADE;
                DROP TABLE IF EXISTS bulletins CASCADE;
                DROP TABLE IF EXISTS admin_regions CASCADE;
                DROP TABLE IF EXISTS admin_change_requests CASCADE;
                DROP TABLE IF EXISTS doctors CASCADE;
                DROP TABLE IF EXISTS receptionists CASCADE;
                DROP TABLE IF EXISTS admins CASCADE;
                DROP TABLE IF EXISTS superadmins CASCADE;
                DROP TABLE IF EXISTS patients CASCADE;
                DROP TABLE IF EXISTS clinics CASCADE;
                DROP TABLE IF EXISTS cities CASCADE;
                DROP TABLE IF EXISTS regions CASCADE;
                DROP TABLE IF EXISTS companies CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            """)
            
            # Users table (authentication only)
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
            
            # Companies table - UPDATED with subscription fields
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    registration_number VARCHAR(100) UNIQUE NOT NULL,
                    address TEXT NOT NULL,
                    subscription_plan VARCHAR(50) DEFAULT 'purchase' CHECK (subscription_plan IN ('purchase', 'rental', 'per_consultation_with_doctor', 'per_consultation_without_doctor')),
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Regions table - NEW: Normalized region structure
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS regions (
                    id SERIAL PRIMARY KEY,
                    province VARCHAR(50) NOT NULL,
                    sub_region VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(province, sub_region)
                )
            """)
            
            # Cities table - NEW: Cities mapped to regions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cities (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name, region_id)
                )
            """)
            
            # Clinics table - UPDATED with region_id instead of just city string
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clinics (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    location VARCHAR(255) NOT NULL,
                    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Patients table
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
            
            # Admins table
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
            
            # Admin regions table - UPDATED to use region_id
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_regions (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(admin_id, region_id)
                )
            """)
            
            # Admin change requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_change_requests (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('password_reset', 'contact_change', 'general_query')),
                    requested_data TEXT NOT NULL,
                    reason TEXT,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    rejection_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Receptionists table
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
            
            # Doctors table
            # Specializations lookup table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS specializations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctors (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    specialization_id INTEGER REFERENCES specializations(id) ON DELETE SET NULL,
                    license_number VARCHAR(50) UNIQUE NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    missed_shifts_count INTEGER DEFAULT 0,
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
            
            # Doctor Unavailability Requests table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctor_unavailability_requests (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                    start_datetime TIMESTAMP NOT NULL,
                    end_datetime TIMESTAMP NOT NULL,
                    reason TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    admin_comment TEXT,
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

            # Doctor unavailability notification tracking table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctor_unavailability_notification (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                    shift_date DATE NOT NULL,
                    shift_start_time TIME NOT NULL,
                    admin_notified BOOLEAN DEFAULT FALSE,
                    notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(doctor_id, shift_date, shift_start_time)
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                
                CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
                CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
                
                CREATE INDEX IF NOT EXISTS idx_regions_province_subregion ON regions(province, sub_region);
                
                CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
                CREATE INDEX IF NOT EXISTS idx_cities_region_id ON cities(region_id);
                
                CREATE INDEX IF NOT EXISTS idx_clinics_company_id ON clinics(company_id);
                CREATE INDEX IF NOT EXISTS idx_clinics_city_id ON clinics(city_id);
                
                CREATE INDEX IF NOT EXISTS idx_superadmins_user_id ON superadmins(user_id);
                
                CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
                CREATE INDEX IF NOT EXISTS idx_admins_company_id ON admins(company_id);
                
                CREATE INDEX IF NOT EXISTS idx_admin_regions_admin_id ON admin_regions(admin_id);
                CREATE INDEX IF NOT EXISTS idx_admin_regions_region_id ON admin_regions(region_id);
                
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
                CREATE INDEX IF NOT EXISTS idx_doctor_unavail_notify_doctor_date_time ON doctor_unavailability_notification(doctor_id, shift_date, shift_start_time);
                CREATE INDEX IF NOT EXISTS idx_doctor_unavail_notify_admin_notified ON doctor_unavailability_notification(admin_notified);
                CREATE TABLE IF NOT EXISTS doctor_unavailability_admin_notification (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                    shift_date DATE NOT NULL,
                    shift_start_time TIME NOT NULL,
                    notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(admin_id, doctor_id, shift_date, shift_start_time)
                );
                CREATE INDEX IF NOT EXISTS idx_doctor_unavail_admin_adminid ON doctor_unavailability_admin_notification(admin_id);
                CREATE INDEX IF NOT EXISTS idx_doctor_unavail_admin_doctorid ON doctor_unavailability_admin_notification(doctor_id);
            """)
    
    def initialize_test_data(self):
        """Initialize database with robust, synthetic Pakistani test data"""
        
        with self.get_cursor() as cursor:
            # Clear existing data
            cursor.execute("""
                TRUNCATE TABLE notifications, doctor_unavailability_admin_notification, doctor_unavailability_notification, doctor_unavailability_requests, appointments, availability_schedules, 
                       bulletins, admin_regions, doctors, receptionists, admins, 
                       superadmins, patients, clinics, cities, regions, companies, users
                RESTART IDENTITY CASCADE
            """)
            
            # ============= REGIONS AND CITIES =============
            # Updated to include GB/AJK for complete 5-admin coverage
            pakistan_regions_data = {
                "Punjab": {
                    "Central Punjab": ["Lahore", "Faisalabad", "Kasur", "Okara", "Sheikhupura", "Nankana Sahib", "Chiniot", "Jhang", "Toba Tek Singh"],
                    "Potohar Region": ["Rawalpindi", "Islamabad", "Attock", "Chakwal", "Jhelum"],
                    "Western Punjab": ["Sargodha", "Mianwali", "Khushab", "Bhakkar"],
                    "Southern Punjab": ["Multan", "Bahawalpur", "Bahawalnagar", "DG Khan", "Muzaffargarh", "Rahim Yar Khan"],
                    "Eastern Punjab": ["Gujranwala", "Sialkot", "Gujrat", "Narowal", "Hafizabad"]
                },
                "Sindh": {
                    "Upper Sindh": ["Sukkur", "Larkana", "Khairpur", "Shikarpur", "Jacobabad"],
                    "Lower Sindh": ["Karachi", "Hyderabad", "Thatta", "Badin"],
                    "Central Sindh": ["Nawabshah", "Sanghar", "Dadu", "Jamshoro"],
                    "Thar Region": ["Mithi", "Tharparkar", "Umerkot", "Mirpur Khas"]
                },
                "Khyber Pakhtunkhwa": {
                    "Northern KP": ["Abbottabad", "Mansehra", "Swat", "Mingora", "Chitral"],
                    "Central KP": ["Peshawar", "Mardan", "Charsadda", "Nowshera", "Swabi"],
                    "Southern KP": ["Kohat", "Bannu", "Dera Ismail Khan"],
                    "Ex-FATA Areas": ["Khyber", "Parachinar", "Miramshah", "Wana"]
                },
                "Balochistan": {
                    "Central Balochistan": ["Quetta", "Pishin", "Ziarat", "Mastung"],
                    "Northern Balochistan": ["Zhob", "Loralai", "Killa Saifullah"],
                    "Eastern Balochistan": ["Sibi", "Dera Bugti", "Kohlu"],
                    "Western Balochistan": ["Chagai", "Nushki", "Kharan"],
                    "Makran Region": ["Gwadar", "Turbat", "Kech", "Panjgur", "Lasbela"]
                },
                "Gilgit-Baltistan & AJK": {
                    "Gilgit Division": ["Gilgit", "Hunza", "Skardu"],
                    "AJK Central": ["Muzaffarabad", "Mirpur", "Rawalakot"],
                    "Baltistan Region": ["Khaplu", "Shigar"]
                }
            }
            
            # Insert regions and cities
            region_id_map = {}  # {(province, sub_region): region_id}
            province_region_map = {} # {province: [region_id1, region_id2...]}
            city_id_map = {}    # {city_name: city_id}
            
            for province, sub_regions in pakistan_regions_data.items():
                province_region_map[province] = []
                for sub_region, cities in sub_regions.items():
                    # Insert region
                    cursor.execute("""
                        INSERT INTO regions (province, sub_region) 
                        VALUES (%s, %s) RETURNING id
                    """, (province, sub_region))
                    region_id = cursor.fetchone()['id']
                    region_id_map[(province, sub_region)] = region_id
                    province_region_map[province].append(region_id)
                    
                    # Insert cities for this region
                    for city in cities:
                        cursor.execute("""
                            INSERT INTO cities (name, region_id) 
                            VALUES (%s, %s) RETURNING id
                        """, (city, region_id))
                        city_id = cursor.fetchone()['id']
                        city_id_map[city] = city_id
            
            logging.info(f"✓ Inserted {len(region_id_map)} regions and {len(city_id_map)} cities")
            
            # ============= COMPANIES =============
            companies_data = [
                ("Edhi Foundation", "info@edhi.pk", "+923001111000", "REG-EDH-2024-001", "Blue Area, Islamabad, Pakistan", "purchase", "active"),
                ("Sehat Medical Group", "contact@sehat.pk", "+923002222000", "REG-SMG-2024-002", "Clifton Block 5, Karachi, Pakistan", "rental", "active"),
                ("E-Shifa Wellness Services", "admin@eshifa.pk", "+923003333000", "REG-SWS-2024-003", "Model Town, Lahore, Pakistan", "per_consultation_with_doctor", "inactive")
            ]
            
            cursor.executemany("""
                INSERT INTO companies (name, email, contact, registration_number, address, subscription_plan, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, companies_data)
            
            logging.info(f"✓ Inserted {len(companies_data)} companies")
            
            # ============= USERS & ROLES =============
            superadmin_pass = hashlib.sha256("super123".encode()).hexdigest()
            admin_pass = hashlib.sha256("admin123".encode()).hexdigest()
            doc_pass = hashlib.sha256("doc123".encode()).hexdigest()
            recep_pass = hashlib.sha256("recep123".encode()).hexdigest()
            
            users_to_insert = []
            
            # --- 1. SuperAdmin (User ID 1) ---
            users_to_insert.append(('muhammad.yasir', 'muhammad.yasir@edhi.pk', superadmin_pass, 'superadmin'))
            
            # --- 2. Company 1 Admins (5 Admins) (User IDs 2-6) ---
            # Edhi Foundation: 1 Admin per Province/Area
            # Proper names: Sarim Khan, Zainab Ali, Omar Farooq, Fatima Zahra, Hassan Askari
            users_to_insert.append(('sarim.khan', 'sarim.khan@edhi.pk', admin_pass, 'admin'))     # ID 2: Punjab
            users_to_insert.append(('zainab.ali', 'zainab.ali@edhi.pk', admin_pass, 'admin'))           # ID 3: Sindh
            users_to_insert.append(('omar.farooq', 'omar.farooq@edhi.pk', admin_pass, 'admin'))         # ID 4: KP
            users_to_insert.append(('fatima.zahra', 'fatima.zahra@edhi.pk', admin_pass, 'admin'))       # ID 5: Balochistan
            users_to_insert.append(('hassan.askari', 'hassan.askari@edhi.pk', admin_pass, 'admin'))     # ID 6: GB/AJK

            # --- 3. Company 2 Admins (3 Admins) (User IDs 7-9) ---
            # Sehat Group: 3 Admins covering all regions via zones
            # Proper names: Usman Tariq, Ayesha Khan, Hamza Malik
            users_to_insert.append(('usman.tariq', 'usman.tariq@sehat.pk', admin_pass, 'admin'))        # ID 7: Punjab + KP
            users_to_insert.append(('ayesha.khan', 'ayesha.khan@sehat.pk', admin_pass, 'admin'))        # ID 8: Sindh + Balochistan
            users_to_insert.append(('hamza.malik', 'hamza.malik@sehat.pk', admin_pass, 'admin'))        # ID 9: GB/AJK

            # Insert Users so far (Admins)
            cursor.executemany("""
                INSERT INTO users (username, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, users_to_insert)
            
            # Insert SuperAdmin Detail
            cursor.execute("INSERT INTO superadmins (user_id, name, contact) VALUES (1, 'Muhammad Yasir', '+923009999999')")
            
            # Insert Admin Details & Regions
            admin_details = [
                # Comp 1 (Edhi) Admins
                (2, 1, 'Sarim Khan', '+923001110001'),
                (3, 1, 'Zainab Ali', '+923001110002'),
                (4, 1, 'Omar Farooq', '+923001110003'),
                (5, 1, 'Fatima Zahra', '+923001110004'),
                (6, 1, 'Hassan Askari', '+923001110005'),
                # Comp 2 (Sehat) Admins
                (7, 2, 'Usman Tariq', '+923002220001'),
                (8, 2, 'Ayesha Khan', '+923002220002'),
                (9, 2, 'Hamza Malik', '+923002220003'),
            ]
            cursor.executemany("INSERT INTO admins (user_id, company_id, name, contact) VALUES (%s, %s, %s, %s)", admin_details)

            # --- Admin Region Assignments ---
            admin_regions_data = []
            
            # Comp 1: 1 Region Each
            # Admin 2 (Punjab) -> All Punjab subregions
            for rid in province_region_map["Punjab"]: admin_regions_data.append((1, rid)) # Admin ID 1 corresponds to User ID 2
            
            # Admin 3 (Sindh) -> All Sindh subregions
            for rid in province_region_map["Sindh"]: admin_regions_data.append((2, rid))
            
            # Admin 4 (KP) -> All KP subregions
            for rid in province_region_map["Khyber Pakhtunkhwa"]: admin_regions_data.append((3, rid))
            
            # Admin 5 (Balochistan) -> All Balochistan subregions
            for rid in province_region_map["Balochistan"]: admin_regions_data.append((4, rid))
            
            # Admin 6 (Northern) -> All GB/AJK subregions
            for rid in province_region_map["Gilgit-Baltistan & AJK"]: admin_regions_data.append((5, rid))

            # Comp 2: 3 Admins covering everything
            # Admin 7 (Sehat A) -> Punjab + KP
            for rid in province_region_map["Punjab"] + province_region_map["Khyber Pakhtunkhwa"]: 
                admin_regions_data.append((6, rid))
            
            # Admin 8 (Sehat B) -> Sindh + Balochistan
            for rid in province_region_map["Sindh"] + province_region_map["Balochistan"]: 
                admin_regions_data.append((7, rid))
            
            # Admin 9 (Sehat C) -> GB/AJK
            for rid in province_region_map["Gilgit-Baltistan & AJK"]: 
                admin_regions_data.append((8, rid))

            cursor.executemany("INSERT INTO admin_regions (admin_id, region_id) VALUES (%s, %s)", admin_regions_data)
            logging.info("✓ Configured Admins with complex region coverage")

            # ============= CLINICS =============
            # Expanded list of clinics to cover more regions
            clinics_data = [
                (1, "Shifa Medical Center", "F-7, Islamabad", city_id_map["Islamabad"]), # ID 1
                (2, "Aga Khan Hospital", "Stadium Road, Karachi", city_id_map["Karachi"]), # ID 2
                (1, "Services Hospital", "Jail Road, Lahore", city_id_map["Lahore"]), # ID 3
                # New Clinics
                (1, "Edhi Center Quetta", "Airport Road, Quetta", city_id_map["Quetta"]), # ID 4
                (1, "Edhi Peshawar Clinic", "University Road, Peshawar", city_id_map["Peshawar"]), # ID 5
                (1, "Edhi Gilgit Hub", "Main Bazaar, Gilgit", city_id_map["Gilgit"]), # ID 6
                (2, "Sehat Care Multan", "Bosan Road, Multan", city_id_map["Multan"]), # ID 7
                (2, "Sehat Life Hyderabad", "Auto Bahn, Hyderabad", city_id_map["Hyderabad"]), # ID 8
            ]
            
            cursor.executemany("""
                INSERT INTO clinics (company_id, name, location, city_id) 
                VALUES (%s, %s, %s, %s)
            """, clinics_data)
            logging.info(f"✓ Inserted {len(clinics_data)} clinics across the country")

            # ============= DOCTORS & RECEPTIONISTS =============
            # We need doctors for 8 clinics now.
            # Lets add doctors. We already had users 1-9. Next is 10.
            
            # Seed specializations lookup table and prepare doctors data
            new_users = []
            doctors_data = []

            specs = ['General Practitioner','Pediatrics','Cardiology','Dermatology','Gynecology','Orthopedics','ENT','Neurology']
            spec_ids = []
            for s in specs:
                cursor.execute("INSERT INTO specializations (name) VALUES (%s) RETURNING id", (s,))
                spec_ids.append(cursor.fetchone()['id'])

            # Helper to create doctor data using specialization ids
            def create_doctor(idx, clinic_id, name):
                u_name = name.lower().replace(' ', '.')
                email = u_name + "@doc.pk"
                new_users.append((u_name, email, doc_pass, 'doctor'))
                # We can't know the exact user_id yet without inserting, 
                # but since we are in a fresh transaction with known previous inserts:
                # Previous total users = 9. So this starts at 10 + idx.
                user_id = 9 + idx + 1 
                # assign specialization_id cyclically for seed data
                spec_id = spec_ids[idx % len(spec_ids)]
                doctors_data.append((user_id, clinic_id, name, spec_id, f"PMC-{202400+idx}", f"+92300{8000000+idx}"))
                return user_id

            # Clinic 1 (Islamabad) - 3 Docs
            create_doctor(0, 1, "Ahmed Ali")
            create_doctor(1, 1, "Fatima Hassan")
            create_doctor(2, 1, "Hassan Raza")
            
            # Clinic 2 (Karachi) - 3 Docs
            create_doctor(3, 2, "Sara Khan")
            create_doctor(4, 2, "Zahra Mirza")
            create_doctor(5, 2, "Bilal Sheikh")

            # Clinic 3 (Lahore) - 2 Docs
            create_doctor(6, 3, "Usman Ahmed")
            create_doctor(7, 3, "Nadia Hussain")

            # Clinic 4 (Quetta) - 2 Docs
            create_doctor(8, 4, "Jamal Khan")
            create_doctor(9, 4, "Gul Wareen")

            # Clinic 5 (Peshawar) - 2 Docs
            create_doctor(10, 5, "Yar Muhammad")
            create_doctor(11, 5, "Palwasha Khan")

            # Clinic 6 (Gilgit) - 2 Docs
            create_doctor(12, 6, "Ali Baig")
            create_doctor(13, 6, "Amina Batool")

            # Clinic 7 (Multan) - 2 Docs
            create_doctor(14, 7, "Fareed Shah")
            create_doctor(15, 7, "Zainab Bibi")

            # Clinic 8 (Hyderabad) - 2 Docs
            create_doctor(16, 8, "Rajesh Kumar")
            create_doctor(17, 8, "Anita Mahesh")

            cursor.executemany("INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)", new_users)
            cursor.executemany("INSERT INTO doctors (user_id, clinic_id, name, specialization_id, license_number, contact) VALUES (%s, %s, %s, %s, %s, %s)", doctors_data)
            
            logging.info(f"✓ Inserted {len(doctors_data)} doctors across all clinics")

            # ============= RECEPTIONISTS =============
            # We have 8 clinics. We need 1 receptionist per clinic.
            # Users created so far: 9 (Super/Admins) + 18 (Doctors) = 27.
            # Receptionist User IDs will start from 28.
            
            receptionist_users = [
                ('kamran.akmal', 'kamran.akmal@recep.pk', recep_pass, 'receptionist'),   # Clinic 1
                ('sania.mirza', 'sania.mirza@recep.pk', recep_pass, 'receptionist'),     # Clinic 2
                ('shoaib.malik', 'shoaib.malik@recep.pk', recep_pass, 'receptionist'),   # Clinic 3
                ('javed.miandad', 'javed.miandad@recep.pk', recep_pass, 'receptionist'), # Clinic 4
                ('shahid.afridi', 'shahid.afridi@recep.pk', recep_pass, 'receptionist'), # Clinic 5
                ('wasim.akram', 'wasim.akram@recep.pk', recep_pass, 'receptionist'),     # Clinic 6
                ('inzamam.ulhaq', 'inzamam.ulhaq@recep.pk', recep_pass, 'receptionist'), # Clinic 7
                ('younis.khan', 'younis.khan@recep.pk', recep_pass, 'receptionist'),     # Clinic 8
            ]
            
            cursor.executemany("""
                INSERT INTO users (username, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, receptionist_users)
            
            receptionist_details = [
                (28, 1, 'Kamran Akmal', '+923009000001'),
                (29, 2, 'Sania Mirza', '+923009000002'),
                (30, 3, 'Shoaib Malik', '+923009000003'),
                (31, 4, 'Javed Miandad', '+923009000004'),
                (32, 5, 'Shahid Afridi', '+923009000005'),
                (33, 6, 'Wasim Akram', '+923009000006'),
                (34, 7, 'Inzamam Ul Haq', '+923009000007'),
                (35, 8, 'Younis Khan', '+923009000008'),
            ]
            
            cursor.executemany("""
                INSERT INTO receptionists (user_id, clinic_id, name, contact) 
                VALUES (%s, %s, %s, %s)
            """, receptionist_details)
            
            logging.info(f"✓ Inserted 8 receptionists (1 per clinic)")

            # ============= AVAILABILITY =============
            availability_data = []
            # Assign generic 9-5 schedule to all doctors
            # We have 18 doctors (indices 0 to 17). Their DB IDs will be 1 to 18.
            for doc_id in range(1, 19): 
                # Mon-Fri 9-5
                for day in range(1, 6):
                    availability_data.append((doc_id, day, '09:00', '17:00'))
            
            cursor.executemany("""
                INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time) 
                VALUES (%s, %s, %s, %s)
            """, availability_data)

            # ============= SYNTHETIC PATIENTS & APPOINTMENTS (Existing Logic Preserved) =============
            # ... (Patient generation code remains same as previous version but with updated city choices) ...
            
            first_names = ["Muhammad", "Ali", "Zain", "Omar", "Bilal", "Usman", "Hamza", "Hassan", "Ayesha", "Fatima", "Zainab", "Maryam", "Sana", "Hina", "Rabia", "Sidra", "Khadija", "Nida", "Iqra", "Sadia"]
            last_names = ["Khan", "Ahmed", "Ali", "Hussain", "Malik", "Raza", "Iqbal", "Shah", "Bhatti", "Chaudhry", "Ansari", "Mirza", "Sheikh", "Qureshi", "Abbasi", "Jutt", "Butt", "Rehman", "Siddiqui"]
            occupations = ["Engineer", "Teacher", "Doctor", "Driver", "Shopkeeper", "Student", "Housewife", "Lawyer", "Civil Servant", "Banker", "Artist", "Farmer"]
            
            patients_data = []
            generated_cnics = set()
            
            for i in range(100): # Increased to 100 patients
                fname = random.choice(first_names)
                lname = random.choice(last_names)
                full_name = f"{fname} {lname}"
                age = random.randint(18, 85)
                gender = "Female" if fname in ["Ayesha", "Fatima", "Zainab", "Maryam", "Sana", "Hina", "Rabia", "Sidra", "Khadija", "Nida", "Iqra", "Sadia"] else "Male"
                father_spouse = f"{random.choice(first_names)} {lname}"
                marital = random.choice(["Single", "Married"])
                
                while True:
                    cnic = f"{random.randint(31101, 38403)}-{random.randint(1000000, 9999999)}-{random.randint(1,9)}"
                    if cnic not in generated_cnics:
                        generated_cnics.add(cnic)
                        break
                        
                contact = f"+923{random.randint(10, 49)}{random.randint(1000000, 9999999)}"
                email = f"{fname.lower()}.{lname.lower()}{random.randint(1,9999)}@example.com"
                address = f"House {random.randint(1,999)}, Street {random.randint(1,20)}, {random.choice(list(city_id_map.keys()))}"
                
                patients_data.append((
                    full_name, age, gender, father_spouse, marital, contact, email, address, cnic, random.choice(occupations), "Pakistani"
                ))
            
            cursor.executemany("""
                INSERT INTO patients (name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, patients_data)
            
            # Fetch all doctor IDs with clinic IDs to create valid appointments
            cursor.execute("SELECT id, clinic_id FROM doctors")
            all_doc_rows = cursor.fetchall()

            cursor.execute("SELECT id FROM patients")
            patient_ids = [row['id'] for row in cursor.fetchall()]

            appointments_data = []
            notifications_data = []
            
            start_date = datetime.datetime.now() - datetime.timedelta(days=30)
            
            # Generate 300 appointments
            for _ in range(300):
                pat_id = random.choice(patient_ids)
                doc = random.choice(all_doc_rows)
                doc_id = doc['id']
                clinic_id = doc['clinic_id']
                
                days_offset = random.randint(0, 37) 
                appt_time = start_date + datetime.timedelta(days=days_offset, hours=random.randint(9, 17), minutes=random.choice([0, 15, 30, 45]))
                
                # FORCE COMPLETED
                status = 'completed'
                completed_at = appt_time + datetime.timedelta(minutes=20)
                
                vitals = f'{{"bp_systolic": {random.randint(110, 140)}, "bp_diastolic": {random.randint(70, 90)}, "temperature": {random.uniform(97.5, 99.5):.1f}, "pulse": {random.randint(60, 100)}}}'
                diagnosis = random.choice(["Acute Pharyngitis", "Seasonal Flu", "Migraine", "Gastritis", "Hypertension", "Lower Back Pain", "Vitamin D Deficiency", "Upper Respiratory Infection"])
                prescription = random.choice(["Panadol 500mg BID", "Augmentin 625mg BD", "Risek 40mg OD", "Brufen 400mg TDS", "Sunny D Capsule Weekly"])

                appointments_data.append((
                    pat_id, doc_id, clinic_id, random.randint(100, 999), 
                    vitals, diagnosis, prescription, f"Patient complains of {random.choice(['headache', 'fever', 'cough', 'stomach pain', 'fatigue'])}",
                    status, appt_time, appt_time, completed_at
                ))
                
                notifications_data.append((
                    'appointment_new', 'doctor', doc_id, pat_id, doc_id, clinic_id,
                    "New Appointment", f"New appointment scheduled."
                ))

            cursor.executemany("""
                INSERT INTO appointments (patient_id, doctor_id, clinic_id, ticket_no, vitals, diagnosis, prescription, notes, status, created_at, started_at, ended_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, appointments_data)
            
            cursor.executemany("""
                INSERT INTO notifications (type, recipient_type, recipient_id, patient_id, doctor_id, clinic_id, title, message)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, notifications_data)
            
            # ============= BULLETINS =============
            cursor.execute("""
                INSERT INTO bulletins (company_id, title, message) 
                VALUES 
                    (1, 'Dengue Fever Alert', '⚠️ Increased dengue cases in urban areas.'),
                    (2, 'New COVID-19 Guidelines', '📋 Updated protocols for patient screening.'),
                    (1, 'Expansion Notice', '🎉 We have opened new clinics in Quetta and Peshawar!')
            """)
            
            logging.info("\n✅ Test data initialization complete with SCATTERED CLINICS & REGIONAL ADMINS!")
    
    def close(self):
        """Close all database connections"""
        if self.connection_pool:
            self.connection_pool.closeall()