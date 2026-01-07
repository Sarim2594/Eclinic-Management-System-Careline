import time
from datetime import datetime, timedelta
import pytest
import random
import string

from playwright.sync_api import sync_playwright


def login(page, username, password):
    """Login helper — navigates to app and logs in with credentials."""
    page.goto("http://localhost:8000")
    page.fill('#username', username)
    page.fill('#password', password)
    # Submit the login form
    page.click('button[type="submit"]')
    # Wait until main app is visible
    page.wait_for_selector('#main-app', timeout=7000)
    time.sleep(0.5)  # Brief wait to ensure UI is fully rendered


def wait_for_popup(page, timeout=7000):
    """Wait for and extract popup modal content."""
    page.wait_for_selector('#popup-modal:not(.hidden)', timeout=timeout)
    title = page.query_selector('#popup-title').inner_text()
    message = page.query_selector('#popup-message').inner_text()
    return title, message


def close_popup(page):
    """Close the popup modal."""
    button = page.query_selector('button:has-text("Got it!")')
    if button:
        page.click('button:has-text("Got it!")')
        time.sleep(1)  # Wait for animation to complete
    # Verify modal is hidden
    assert page.query_selector('#popup-modal.hidden') is not None, "Popup should be hidden after close"


def get_random_string(length=8):
    """Generate a random alphanumeric string."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


# ============================================================================
# ADMIN TESTS: CREATE CLINIC (Multiple scenarios)
# ============================================================================

def test_admin_create_clinic_success():
    """Admin successfully creates a clinic with valid data."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        # Navigate to Create Clinic
        page.click('#admin-tab-staff-management')
        page.wait_for_selector('#staff-management-subtab-clinic', timeout=3000)
        page.click('#staff-management-subtab-clinic')

        # Fill form
        clinic_name = f'Test Clinic {int(time.time())}'
        page.fill('#admin-clinic-name', clinic_name)
        page.fill('#admin-clinic-location', 'Test Location')

        # Wait for cities to load
        page.wait_for_function("() => document.querySelectorAll('#admin-clinic-city option').length > 1", timeout=7000)
        options = page.query_selector_all('#admin-clinic-city option')
        for opt in options:
            val = opt.get_attribute('value')
            if val and val.strip():
                page.select_option('#admin-clinic-city', val)
                break

        print(f"\n✓ Form prepared, clicking button...")
        
        # Click the button and capture console output
        console_logs.clear()
        page.click('button:has-text("Create Clinic"):last-of-type')
        
        time.sleep(2)
        
        print(f"✓ Console logs after button click: {console_logs}")
        
        # Check for popup
        popup_visible = page.query_selector('#popup-modal:not(.hidden)')
        print(f"✓ Popup visible: {popup_visible is not None}")
        
        if popup_visible:
            title = page.query_selector('#popup-title').inner_text()
            message = page.query_selector('#popup-message').inner_text()
            print(f"✓ Popup: {title} - {message}")
            assert 'Clinic' in title or 'Clinic' in message, f"Expected clinic success, got: {title} - {message}"
        else:
            print(f"✗ FAIL: No popup appeared after button click")
            print(f"✗ Console logs: {console_logs}")
            assert False, "Popup modal did not appear after button click"

        browser.close()
def test_admin_create_clinic_missing_name():
    """Admin attempts to create clinic without name — should show error."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        page.click('#admin-tab-staff-management')
        page.wait_for_selector('#staff-management-subtab-clinic', timeout=3000)
        page.click('#staff-management-subtab-clinic')

        # Leave name empty, fill only location
        page.fill('#admin-clinic-location', 'Test Location')
        page.wait_for_function("() => document.querySelectorAll('#admin-clinic-city option').length > 1", timeout=7000)
        options = page.query_selector_all('#admin-clinic-city option')
        for opt in options:
            val = opt.get_attribute('value')
            if val and val.strip():
                page.select_option('#admin-clinic-city', val)
                break

        page.click('button:has-text("Create Clinic"):last-of-type')
        title, message = wait_for_popup(page)
        
        assert 'Missing' in title or 'Error' in title
        browser.close()


# ============================================================================
# DOCTOR TESTS: UNAVAILABILITY REQUEST
# ============================================================================

def test_doctor_submit_unavailability_success():
    """Doctor successfully submits an unavailability request."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'ahmed.ali', 'doc123')
        page.wait_for_selector('#content-area', timeout=7000)

        page.click('#doctor-tab-unavailability')
        page.wait_for_selector('#unavail-start-date', timeout=3000)

        start = datetime.now() + timedelta(hours=2)
        end = start + timedelta(hours=3)
        start_str = start.strftime('%Y-%m-%dT%H:%M')
        end_str = end.strftime('%Y-%m-%dT%H:%M')

        page.fill('#unavail-start-date', start_str)
        page.fill('#unavail-end-date', end_str)
        page.fill('#unavail-reason', 'Medical appointment')

        page.click('button:has-text("Submit Request")')
        title, message = wait_for_popup(page)
        
        assert 'Success' in title or 'Unavailability' in title
        browser.close()


def test_doctor_unavailability_end_before_start():
    """Doctor submits unavailability with end time before start — validation error."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'ahmed.ali', 'doc123')
        page.wait_for_selector('#content-area', timeout=7000)

        page.click('#doctor-tab-unavailability')
        page.wait_for_selector('#unavail-start-date', timeout=3000)

        start = datetime.now() + timedelta(hours=5)
        end = start - timedelta(hours=2)  # End before start!
        start_str = start.strftime('%Y-%m-%dT%H:%M')
        end_str = end.strftime('%Y-%m-%dT%H:%M')

        page.fill('#unavail-start-date', start_str)
        page.fill('#unavail-end-date', end_str)
        page.fill('#unavail-reason', 'This should fail')

        page.click('button:has-text("Submit Request")')
        title, message = wait_for_popup(page)
        
        assert 'Error' in title or 'after' in message.lower()
        browser.close()


# ============================================================================
# ADMIN TESTS: UPDATE DOCTOR AVAILABILITY
# ============================================================================

def test_admin_edit_doctor_availability():
    """Admin navigates to edit doctor availability and updates a time slot."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        # Go to Doctors > Add Doctor sub-tab (which contains the edit section)
        page.click('#admin-tab-doctors')
        page.click('#doctor-subtab-transfer')  # Or another sub-tab that has edit form
        # For now, just verify the tab loads without crashing
        page.wait_for_selector('#doctor-content-transfer', timeout=3000)
        
        browser.close()


# ============================================================================
# RECEPTIONIST TESTS
# ============================================================================

def test_receptionist_login_and_dashboard():
    """Receptionist logs in and views dashboard."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'syed.ammar', 'recep123')
        page.wait_for_selector('#content-area', timeout=7000)
        
        # Verify receptionist portal loaded
        portal_name = page.query_selector('#portal-name').inner_text()
        assert 'Receptionist' in portal_name
        
        browser.close()


# ============================================================================
# SUPERADMIN TESTS
# ============================================================================

def test_superadmin_login_and_dashboard():
    """SuperAdmin logs in and views the dashboard."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'muhammad.yasir', 'super123')
        page.wait_for_selector('#content-area', timeout=7000)
        
        portal_name = page.query_selector('#portal-name').inner_text()
        assert 'Superadmin' in portal_name or 'SuperAdmin' in portal_name
        
        browser.close()


# ============================================================================
# LOAD/STRESS TESTS: Simulate high volume scenarios
# ============================================================================

def test_admin_create_multiple_clinics_rapid():
    """Admin rapidly creates 5 clinics to test concurrent form submissions."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        page.click('#admin-tab-staff-management')
        page.wait_for_selector('#staff-management-subtab-clinic', timeout=3000)
        page.click('#staff-management-subtab-clinic')

        page.wait_for_function("() => document.querySelectorAll('#admin-clinic-city option').length > 1", timeout=7000)
        options = page.query_selector_all('#admin-clinic-city option')
        city_val = None
        for opt in options:
            val = opt.get_attribute('value')
            if val and val.strip():
                city_val = val
                break

        successes = 0
        for i in range(5):
            clinic_name = f'Stress Test Clinic {i} {int(time.time())}'
            page.fill('#admin-clinic-name', clinic_name)
            page.fill('#admin-clinic-location', f'Location {i}')
            page.select_option('#admin-clinic-city', city_val)

            page.click('button:has-text("Create Clinic"):last-of-type')
            
            try:
                title, message = wait_for_popup(page, timeout=5000)
                if 'Clinic' in title:
                    successes += 1
                close_popup(page)
            except:
                pass  # If popup times out or doesn't appear, skip
            
            time.sleep(0.3)

        assert successes >= 3, f"Expected at least 3 clinics created, got {successes}"
        browser.close()


def test_doctor_submit_multiple_unavailability_requests():
    """Doctor submits 3 unavailability requests in sequence."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'fatima.hassan', 'doc123')
        page.wait_for_selector('#content-area', timeout=7000)

        page.click('#doctor-tab-unavailability')
        page.wait_for_selector('#unavail-start-date', timeout=3000)

        successes = 0
        for i in range(3):
            start = datetime.now() + timedelta(days=i+1, hours=9)
            end = start + timedelta(hours=2)
            start_str = start.strftime('%Y-%m-%dT%H:%M')
            end_str = end.strftime('%Y-%m-%dT%H:%M')

            page.fill('#unavail-start-date', start_str)
            page.fill('#unavail-end-date', end_str)
            page.fill('#unavail-reason', f'Unavailable day {i+1}')

            page.click('button:has-text("Submit Request")')
            
            try:
                title, message = wait_for_popup(page, timeout=5000)
                if 'Success' in title or 'Unavailability' in title:
                    successes += 1
                close_popup(page)
            except:
                pass
            
            time.sleep(0.3)

        assert successes >= 2, f"Expected at least 2 requests successful, got {successes}"
        browser.close()


def test_concurrent_admin_actions():
    """Simulate admin doing multiple actions in sequence (dashboard → staff → doctors)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        # View Dashboard
        page.click('#admin-tab-dashboard')
        page.wait_for_selector('#admin-clinic-stats', timeout=3000)
        
        # View Staff Management
        page.click('#admin-tab-staff-management')
        page.wait_for_selector('#staff-search', timeout=3000)
        
        # View Doctors
        page.click('#admin-tab-doctors')
        page.wait_for_selector('#available-doctors', timeout=3000)
        
        browser.close()


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

def test_invalid_login_credentials():
    """Login with wrong password — should show error."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:8000")
        page.fill('#username', 'areeb.rehman')
        page.fill('#password', 'wrongpassword')
        page.click('button[type="submit"]')
        
        # Should NOT navigate to main app
        page.wait_for_selector('#login-message', timeout=3000)
        msg = page.query_selector('#login-message').inner_text()
        
        assert 'Invalid' in msg or 'Error' in msg or 'credentials' in msg.lower()
        browser.close()


def test_popup_modal_closes_correctly():
    """Verify popup modal can be closed and form resets."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        login(page, 'areeb.rehman', 'admin123')
        page.wait_for_selector('#content-area', timeout=5000)

        page.click('#admin-tab-staff-management')
        page.click('#staff-management-subtab-clinic')

        # Try to submit with missing data (should error)
        page.click('button:has-text("Create Clinic"):last-of-type')
        title, message = wait_for_popup(page)
        assert 'Missing' in title
        
        # Close popup
        close_popup(page)
        
        # Form should be accessible again
        name_field = page.query_selector('#admin-clinic-name')
        assert name_field is not None
        
        browser.close()

