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
                DROP TABLE IF EXISTS doctors CASCADE;
                DROP TABLE IF EXISTS admins CASCADE;
                DROP TABLE IF EXISTS receptionists CASCADE;
                DROP TABLE IF EXISTS patients CASCADE;
                DROP TABLE IF EXISTS clinics CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            """)
            
            # Users table (authentication only)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Clinics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS clinics (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    location VARCHAR(255) NOT NULL,
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
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admins (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(20) NOT NULL,
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
                    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('admin', 'doctor', 'receptionist')),
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
                        (recipient_type = 'admin' AND recipient_id IS NULL) OR
                        (recipient_type = 'doctor' AND recipient_id IS NOT NULL) OR
                        (recipient_type = 'receptionist' AND recipient_id IS NOT NULL)
                    )
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
                CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
                CREATE INDEX IF NOT EXISTS idx_doctors_license ON doctors(license_number);
                CREATE INDEX IF NOT EXISTS idx_receptionists_user_id ON receptionists(user_id);
                CREATE INDEX IF NOT EXISTS idx_receptionists_clinic_id ON receptionists(clinic_id);
                CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients(contact);
                CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
                CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
                CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);
                CREATE INDEX IF NOT EXISTS idx_availability_doctor_id ON availability_schedules(doctor_id);
                CREATE INDEX IF NOT EXISTS idx_availability_day ON availability_schedules(day_of_week);
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
                       bulletins, doctors, receptionists, patients, clinics, users, admins
                RESTART IDENTITY CASCADE
            """)
            
            # ============= CLINICS =============
            clinics_data = [
                ("Shifa Medical Center", "F-7, Islamabad"),
                ("Aga Khan Hospital", "Stadium Road, Karachi"),
                ("Services Hospital", "Jail Road, Lahore")
            ]
            
            cursor.executemany("""
                INSERT INTO clinics (name, location) VALUES (%s, %s)
            """, clinics_data)
            
            # ============= USERS =============
            admin_pass = hashlib.sha256("admin123".encode()).hexdigest()
            doc_pass = hashlib.sha256("doc123".encode()).hexdigest()
            recep_pass = hashlib.sha256("recep123".encode()).hexdigest()
            
            users_data = [
                # Admin
                ('muhammad.yasir', 'muhammad.yasir@careline.org', admin_pass, 'admin'),
                ('junaid.ahmed', 'junaid.ahmed@careline.org', admin_pass, 'admin'),
                ('sarim.khan', 'sarim.khan@careline.org', admin_pass, 'admin'),
                # Doctors
                ('ahmed.ali', 'ahmed.ali@careline.org', doc_pass, 'doctor'),
                ('fatima.hassan', 'fatima.hassan@careline.org', doc_pass, 'doctor'),
                ('sara.khan', 'sara.khan@careline.org', doc_pass, 'doctor'),
                # Receptionists
                ('syed.ammar', 'syed.ammar@careline.org', recep_pass, 'receptionist'),
                ('zainab.malik', 'zainab.malik@careline.org', recep_pass, 'receptionist'),
                ('hina.tariq', 'hina.tariq@careline.org', recep_pass, 'receptionist')
            ]
            
            cursor.executemany("""
                INSERT INTO users (username, email, password, role) 
                VALUES (%s, %s, %s, %s)
            """, users_data)
            
            # ============= ADMINS =============
            admins_data = [
                (1, 'Muhammad Yasir', '+923001234547'),
                (2, 'Junaid Ahmed', '+923002645678'),
                (3, 'Sarim Khan', '+923003476789')
            ]
            
            cursor.executemany("""
                INSERT INTO admins (user_id, name, contact) 
                VALUES (%s, %s, %s)
            """, admins_data)
            
            # ============= DOCTORS =============
            doctors_data = [
                (4, 1, 'Ahmed Ali', 'PMC-12345', '+923001234567'),
                (5, 1, 'Fatima Hassan', 'PMC-12346', '+923002345678'),
                (6, 2, 'Sara Khan', 'PMC-12347', '+923003456789')
            ]
            
            cursor.executemany("""
                INSERT INTO doctors (user_id, clinic_id, name, license_number, contact) 
                VALUES (%s, %s, %s, %s, %s)
            """, doctors_data)
            
            # ============= RECEPTIONISTS =============
            receptionists_data = [
                (7, 1, 'Syed Ammar', '+923001111111'),
                (8, 2, 'Zainab Malik', '+923002222222'),
                (9, 3, 'Hina Tariq', '+923003333333')
            ]
            
            cursor.executemany("""
                INSERT INTO receptionists (user_id, clinic_id, name, contact) 
                VALUES (%s, %s, %s, %s)
            """, receptionists_data)
            
            # ============= AVAILABILITY SCHEDULES =============
            availability_data = []
            
            for day in range(1, 6):
                availability_data.append((1, day, '09:00', '17:00'))
            availability_data.append((1, 6, None, None))
            availability_data.append((1, 7, None, None))
            
            for day in range(1, 7):
                availability_data.append((2, day, '17:00', '5:00'))
            availability_data.append((2, 7, '17:00', '3:00'))
            
            for day in range(2, 8):
                availability_data.append((3, day, '13:45', '20:00'))
            availability_data.append((3, 1, None, None))
            
            cursor.executemany("""
                INSERT INTO availability_schedules (doctor_id, day_of_week, start_time, end_time) 
                VALUES (%s, %s, %s, %s)
            """, availability_data)
            
            # ============= SAMPLE BULLETIN =============
            cursor.execute("""
                INSERT INTO bulletins (title, message) 
                VALUES (%s, %s)
            """, (
                'Dengue Fever Alert',
                '⚠️ Increased dengue cases in urban areas. Use mosquito repellent and eliminate standing water.'
            ))
    
    def close(self):
        """Close all database connections"""
        if self.connection_pool:
            self.connection_pool.closeall()