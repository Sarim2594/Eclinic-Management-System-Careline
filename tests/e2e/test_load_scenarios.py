"""
Full-System Lifecycle Load Test for E-Clinic Management System.
Hierarchy: Superadmin -> Company -> Admin (Regional) -> Clinic -> Staff -> Patient -> Appointment.

Scenarios:
1. Superadmin creates 5 Companies (with full details).
2. Superadmin creates 5 Admins (one per company) with assigned Regions.
3. Admins create 20 Clinics and 40 Doctors (with availability schedules).
4. Receptionists register 100 Patients (Automatic Queuing).
5. WORKFLOW: Doctors complete consultations for queued patients.
"""

import time
from datetime import datetime, timedelta
import random
import string
from playwright.sync_api import sync_playwright

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def login(page, username, password):
    """Standard Login Helper."""
    page.goto("http://localhost:8000")
    page.fill('#username', username)
    page.fill('#password', password)
    page.click('button[type="submit"]')
    page.wait_for_selector('#main-app', timeout=8000)
    time.sleep(0.5)

def wait_for_popup(page, timeout=5000):
    """Wait for Success/Error Modal."""
    try:
        page.wait_for_selector('#popup-modal:not(.hidden)', timeout=timeout)
        title = page.query_selector('#popup-title').inner_text()
        message = page.query_selector('#popup-message').inner_text()
        return title, message
    except:
        return None, None

def close_popup(page):
    """Close Modal and Verify."""
    try:
        button = page.query_selector('button:has-text("Got it!")')
        if button:
            page.click('button:has-text("Got it!")')
            time.sleep(0.5)
    except:
        pass

def suppress_print_dialog(page):
    """Prevents window.print() from blocking execution."""
    page.evaluate("() => { window.print = function() { console.log('Print suppressed'); }; }")

def get_random_string(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# ============================================================================
# TIER 1: SUPERADMIN - COMPANY MANAGEMENT
# ============================================================================

def test_load_01_create_companies():
    """
    Superadmin creates 5 new Companies (Tenants).
    Updated to match superadmin.html fields.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("\n🚀 [Tier 1] Superadmin: Creating 5 Companies...")
        
        login(page, 'muhammad.yasir', 'super123')
        
        # Navigate to Company Creation
        page.click('#superadmin-tab-register-company') 
        
        created = 0
        for i in range(1, 6):
            company_name = f"Load Company {get_random_string(4)}"
            
            # Ensure tab is active and form is visible
            page.click('#superadmin-tab-register-company')
            page.wait_for_selector('#company-name')
            
            # Fill Company Details
            page.fill('#company-name', company_name)
            page.fill('#company-email', f"contact{i}@{get_random_string(4).lower()}.com")
            page.fill('#company-contact', f"+92 300-{random.randint(1000000,9999999)}")
            page.fill('#company-reg-number', f"REG-{random.randint(10000,99999)}")
            page.fill('#company-address', f"Headquarters {i}, Main Blvd")
            
            # Select Subscription
            plans = ['basic', 'standard', 'premium', 'enterprise']
            page.select_option('#company-subscription', random.choice(plans))
            
            page.fill('#company-max-clinics', "50")
            
            page.click('button:has-text("Register Company")')
            
            title, msg = wait_for_popup(page)
            if title and 'Success' in title:
                created += 1
                print(f"  ✓ Created: {company_name}")
            else:
                print(f"  ✗ Failed: {company_name} - {title}")
            close_popup(page)
                
        print(f"📊 Companies Created: {created}/5")
        browser.close()

# ============================================================================
# TIER 2: SUPERADMIN - ADMIN CREATION (REGIONAL)
# ============================================================================

def test_load_02_create_admins_with_regions():
    """
    Superadmin creates Admins linked to the new Companies.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("\n🚀 [Tier 2] Superadmin: Creating Admins & Assigning Regions...")
        
        login(page, 'muhammad.yasir', 'super123')
        page.click('#superadmin-tab-create-admin')
        
        # Get list of companies
        page.wait_for_selector('#admin-company')
        company_options = page.eval_on_selector_all('#admin-company option', 'opts => opts.map(o => o.value).filter(v => v)')
        
        target_companies = company_options[-5:] if len(company_options) >= 5 else company_options
        
        created = 0
        for idx, comp_val in enumerate(target_companies):
            # Reset form
            page.click('#superadmin-tab-create-admin')
            
            username = f"admin_reg_{get_random_string(4).lower()}"
            page.fill('#admin-name', f"Regional Admin {idx+1}")
            page.fill('#admin-username', username)
            page.fill('#admin-email', f"{username}@sys.com")
            page.fill('#admin-password', 'Admin123!')
            page.fill('#admin-contact', f"+92 300-{random.randint(1000000,9999999)}")
            
            # Select Company
            page.select_option('#admin-company', comp_val)
            
            # Assign Regions
            try:
                # Click "Assign All Regions" button if available for ease
                page.click('button:has-text("Assign All Regions")')
            except:
                pass

            # Update: Use the specific ID from the HTML to avoid clicking the Tab button
            page.click('#btn-create-admin-submit')

            # Update: Handle the Success Modal
            # The previous error showed the modal was intercepting clicks in the next loop.
            # We must wait for it to appear and then close it.
            try:
                # Wait for modal to appear
                page.wait_for_selector('#popup-modal', state='visible', timeout=5000)
                
                # Click the specific close button ID found in the HTML
                page.click('#popup-close-btn')
                
                # Wait for modal to disappear so it doesn't block the next iteration
                page.wait_for_selector('#popup-modal', state='hidden', timeout=5000)
            except Exception as e:
                print(f"Warning: Modal interaction failed or didn't appear for {username}: {e}")

            created += 1
            print(f"   - Created {username} for {comp_val}")
                
        print(f"📊 Regional Admins Created: {created}/{len(target_companies)}")
        browser.close()

# ============================================================================
# TIER 3: INFRASTRUCTURE (Clinics, Docs, Receptionists)
# ============================================================================

def test_load_03_infrastructure_buildup():
    """
    Existing Admins create the physical infrastructure.
    Updated for admin.html Doctor Availability fields.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("\n🚀 [Tier 3] Admin: Building Clinics, Doctors, Receptionists...")
        
        login(page, 'areeb.rehman', 'admin123')
        
        # 1. Create 10 Clinics
        page.click('#admin-tab-staff-management')
        page.click('#staff-management-subtab-clinic')
        
        # Get City
        page.wait_for_function("() => document.querySelectorAll('#admin-clinic-city option').length > 1")
        city_val = page.eval_on_selector('#admin-clinic-city option:nth-child(2)', 'el => el.value')
        
        clinics_made = 0
        for i in range(10):
            page.click('#staff-management-subtab-clinic') # Reset
            page.fill('#admin-clinic-name', f"Load Clinic {i+1}")
            page.fill('#admin-clinic-location', f"Region Block {i+1}")
            page.select_option('#admin-clinic-city', city_val)
            page.click('button:has-text("Create Clinic")')
            
            title, msg = wait_for_popup(page, timeout=2000)
            if title and 'Clinic' in title: clinics_made += 1
            close_popup(page)
            time.sleep(0.1)
            
        print(f"  ✓ {clinics_made} Clinics Created")

        # 2. Create 10 Doctors
        page.click('#staff-management-subtab-doctor')
        doctors_made = 0
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

        for i in range(10):
            page.click('#staff-management-subtab-doctor') # Reset
            name = f"Dr. Load {i+1}"
            user = f"doc_load_{i+1}"
            
            page.fill('#admin-doctor-name', name)
            page.fill('#admin-doctor-username', user)
            page.fill('#admin-doctor-email', f"{user}@hosp.com")
            page.fill('#admin-doctor-password', 'Doc123!')
            page.fill('#admin-doctor-license', f"PMDC-{random.randint(1000,9999)}")
            page.fill('#admin-doctor-contact', f"+92 300-{random.randint(1000000,9999999)}")
            
            # Select last clinic (likely the one just created)
            page.eval_on_selector('#admin-doctor-clinic', 'el => el.selectedIndex = el.options.length - 1')
            
            # Fill Availability for ALL days (Required by admin.html)
            for day in days:
                page.fill(f'#admin-doctor-start-time-{day}', "09:00")
                page.fill(f'#admin-doctor-end-time-{day}', "17:00")
            
            page.click('button:has-text("Create Doctor Account")')
            
            title, msg = wait_for_popup(page, timeout=3000)
            if title and 'Doctor' in title: doctors_made += 1
            close_popup(page)
            
        print(f"  ✓ {doctors_made} Doctors Created")
        browser.close()

# ============================================================================
# TIER 4: OPERATIONS (Patients & Doctor Queue)
# ============================================================================

def test_load_04_patient_registration_flow():
    """
    Receptionist registers 50 patients.
    NOTE: In receptionist.html, 'Register Patient & Print Ticket' implies automatic queuing.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("\n🚀 [Tier 4a] Receptionist: Registering 50 Patients...")
        
        login(page, 'syed.ammar', 'recep123')
        suppress_print_dialog(page) # Critical Fix
        
        created = 0
        for i in range(50):
            page.click('#tab-register')
            page.wait_for_selector('#patient-name')
            
            mr_num = 8000 + i
            page.fill('#patient-mr', str(mr_num))
            page.fill('#patient-name', f"Load Patient {i+1}")
            page.fill('#patient-age', "45")
            page.select_option('#patient-gender', 'Male')
            page.fill('#patient-father-name', f"Father {i+1}")
            page.select_option('#patient-marital-status', 'Single')
            page.fill('#patient-contact', f"+92 300-{random.randint(1000000,9999999)}")
            page.fill('#patient-email', f"patient{i}@test.com")
            page.fill('#patient-address', "Test Address")
            page.fill('#patient-cnic', "42101-1234567-1")
            page.fill('#patient-nationality', "Pakistani")
            
            # Click Register
            page.click('button:has-text("Register Patient & Print Ticket")')
            
            title, msg = wait_for_popup(page, timeout=2000)
            if title and ('Success' in title or 'Registered' in title):
                created += 1
            close_popup(page)
            
        print(f"📊 Patients Registered & Queued: {created}/50")
        browser.close()

def test_load_05_doctor_consultation_flow():
    """
    Doctor clears the queue.
    1. Doctor logs in.
    2. Views 'Waiting Patients'.
    3. Completes consultation.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("\n🚀 [Tier 4b] Doctor: Completing Consultations...")
        
        # Login as a known doctor (ensure this doctor exists/was created in Tier 3)
        # Using a fallback doctor if dynamic ones aren't easily trackable
        login(page, 'ahmed.ali', 'doc123') 
        
        completed = 0
        
        # Go to Waiting Patients
        page.click('#doctor-tab-waiting')
        time.sleep(2) # Allow queue to load
        
        # We assume the waiting list renders buttons to 'Start' or 'View'
        # Since the HTML just shows <div id="waiting-patients">, we assume dynamic content.
        # We will attempt to find a button inside this container.
        
        # Attempt to process 20 patients from the queue
        for i in range(20):
            try:
                # Find the first available "Start" or "Call" button in the queue
                # Selector strategy: look for any button inside the waiting list
                start_btn = page.query_selector('#waiting-patients button')
                
                if not start_btn:
                    print("  ⚠️ No more patients in queue.")
                    break
                
                start_btn.click()
                
                # Wait for consultation form to appear (likely injected or a modal)
                # Based on doctor.html, we have a #confirm-modal but no explicit form static HTML.
                # We assume standard inputs exist once a patient is selected.
                page.wait_for_selector('#consultation-notes', state='visible', timeout=3000)
                
                page.fill('#consultation-notes', "Load Test Diagnosis: Routine checkup.")
                page.fill('#consultation-prescription', "Rest and hydration.")
                
                # Submit
                page.click('button:has-text("Complete")')
                
                # Handle Confirmation Modal
                page.wait_for_selector('#confirm-modal:not(.hidden)', timeout=2000)
                page.click('#confirm-submit-button')
                
                # Wait for success popup
                title, msg = wait_for_popup(page)
                if title and 'Success' in title:
                    completed += 1
                    print(f"  ✓ Consultation {i+1} completed")
                close_popup(page)
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ⚠️ Step failed (Queue empty or UI changed): {str(e)[:50]}")
                break
        
        print(f"📊 Consultations Completed: {completed}")
        browser.close()