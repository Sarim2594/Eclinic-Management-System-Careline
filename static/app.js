const API_URL = '/api';

import * as validate from './validation_functions.js';
import * as popup from './popup_modal.js';
import * as notifications from './notifications.js';
import * as bulletins from './bulletins.js';
import * as userState from './user_state.js'; 
import * as receptionist from './components/receptionist.js';
import * as doctor from './components/doctor.js';
import * as admin from './components/admin.js';
import * as superadmin from './components/superadmin.js';

// ============================================================================
// GLOBAL BRIDGES
// ============================================================================
window.loadPortal = loadPortal;
window.logout = logout;
window.handleLogin = handleLogin;
window.createClinic = createClinic;
window.createReceptionist = createReceptionist;
window.createDoctor = createDoctor;
window.updateDoctorAvailability = updateDoctorAvailability;
window.transferDoctor = transferDoctor;
window.postBulletin = postBulletin;

window.formatPhoneInput = validate.formatPhoneInput;
window.validateEmail = validate.email;
window.validateVitalsInput = validate.vitalsInput;
window.formatCNICInput = validate.formatCNICInput;
window.showPopUp = popup.showPopUp;
window.closePopUp = popup.closePopUp;
window.toggleNotifications = notifications.toggleNotifications;
window.markNotificationRead = notifications.markNotificationRead;
window.markAllAsRead = notifications.markAllAsRead;
window.setupNotificationCloser = notifications.setupNotificationCloser;
window.showReceptionistTab = receptionist.showReceptionistTab;
window.registerPatient = receptionist.registerPatient;
window.submitDiagnosis = doctor.submitDiagnosis;
window.showDoctorTab = doctor.showDoctorTab;
window.searchPastPatients = doctor.searchPastPatients;
window.closeHistoryModal = doctor.closeHistoryModal;
window.confirmDiagnosis = doctor.confirmDiagnosis;
window.closeConfirmModal = doctor.closeConfirmModal;
window.togglePatientDetails = doctor.togglePatientDetails;
window.viewPatientHistory = doctor.viewPatientHistory;
window.showAdminTab = admin.showAdminTab;
window.searchStaff = admin.searchStaff;
window.showSuperAdminTab = superadmin.showSuperAdminTab;
window.searchCompanies = superadmin.searchCompanies;
window.searchAllCompanies = superadmin.searchAllCompanies;
window.registerCompany = superadmin.registerCompany;
window.searchAdmins = superadmin.searchAdmins;
window.filterAdminsByCompany = superadmin.filterAdminsByCompany;
window.loadRegionsForCompany = superadmin.loadRegionsForCompany;
window.assignAllRegions = superadmin.assignAllRegions;
window.createAdmin = superadmin.createAdmin;
window.assignAllRegionsEdit = superadmin.assignAllRegionsEdit;
window.updateAdminRegions = superadmin.updateAdminRegions;
window.closeEditAdminModal = superadmin.closeEditAdminModal;
window.viewCompanyDetails = superadmin.viewCompanyDetails || window.viewCompanyDetails;
window.toggleCompanyStatus = superadmin.toggleCompanyStatus || window.toggleCompanyStatus;
window.closeCompanyDetailsModal = superadmin.closeCompanyDetailsModal || window.closeCompanyDetailsModal;
window.closeCompanyDetailsOnOutsideClick = superadmin.closeCompanyDetailsOnOutsideClick || window.closeCompanyDetailsOnOutsideClick;
window.deleteAdmin = superadmin.deleteAdmin || window.deleteAdmin;
window.editAdminRegions = superadmin.editAdminRegions || window.editAdminRegions;

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    const username_or_email = document.getElementById('username') ? document.getElementById('username').value : '';
    const password = document.getElementById('password') ? document.getElementById('password').value : '';
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username_or_email, password })
        });

        const data = await response.json();
        if (data.success) {
            userState.setUser(data); 
            
            const loginPage = document.getElementById('login-page');
            const mainApp = document.getElementById('main-app');
            if (loginPage) loginPage.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            const portalName = document.getElementById('portal-name');
            if (portalName) portalName.textContent = data.role.charAt(0).toUpperCase() + data.role.slice(1) + ' Portal';
            const nameDisplay = document.getElementById('user-name-display');
            if (nameDisplay) nameDisplay.textContent = data.name || data.username || '';
            
            loadPortal(data.role);
            // Provide admin module with current user data so it can access company_id etc.
            if (data.role === 'admin' && admin && typeof admin.setCurrentUser === 'function') {
                admin.setCurrentUser(data);
            }
            bulletins.loadBulletins().catch(() => {});
            
            notifications.startNotificationPolling();
            // Setup outside-click handler for notifications dropdown (only once)
            if (typeof notifications.setupNotificationCloser === 'function') notifications.setupNotificationCloser();
            if (data.role === 'doctor') {
                doctor.startWaitingPatientsPolling();
            }
            if (data.role === 'admin') {
                admin.startAvailableDoctorsPolling();
            }
        } else {
            showLoginMessage('Invalid credentials', 'error');
        }
    } catch (error) {
        showLoginMessage('Login failed: ' + (error.message || error), 'error');
    }
}

function showLoginMessage(message, type) {
    const msgDiv = document.getElementById('login-message');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = `mb-4 p-3 rounded-lg ${type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`;
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 5000);
}

async function logout() {
    notifications.stopNotificationPolling();
    doctor.stopWaitingPatientsPolling();
    admin.stopAvailableDoctorsPolling();

    // Calls service function which uses userState.getUser()
    doctor.setInactiveStatus(); 
    
    userState.clearUser(); 

    const mainApp = document.getElementById('main-app');
    const loginPage = document.getElementById('login-page');
    if (mainApp) mainApp.classList.add('hidden');
    if (loginPage) loginPage.classList.remove('hidden');
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';
}

// ============================================================================
// PORTAL LOADING
// ============================================================================

async function loadPortal(role) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    switch (role) {
        case 'receptionist':
            contentArea.innerHTML = await (await fetch('./templates/receptionist.html')).text();
            break;
        case 'doctor':
            contentArea.innerHTML = await (await fetch('./templates/doctor.html')).text();
            doctor.showDoctorTab('waiting'); 
            break;
        case 'admin':
            contentArea.innerHTML = await (await fetch('./templates/admin.html')).text();
            admin.loadAdminDashboard().catch(() => {});
            break;
        case 'superadmin':
            contentArea.innerHTML = await (await fetch('./templates/superadmin.html')).text();
            superadmin.showSuperAdminTab('dashboard');
            break;
        default:
            contentArea.innerHTML = '<p class="text-gray-600">Unknown role</p>';
            break;
    }
}

// ============================================================================
// ADMIN ACTIONS (Retained locally in app.js)
// ============================================================================

async function createClinic() {
    const name = document.getElementById('admin-clinic-name') ? document.getElementById('admin-clinic-name').value.trim() : '';
    const location = document.getElementById('admin-clinic-location') ? document.getElementById('admin-clinic-location').value.trim() : '';
    
    // 1. Get company_id from the user state
    const adminData = userState.getUser(); 
    if (!adminData || !adminData.company_id) {
        popup.showPopUp('Error', 'Company ID not found in Admin profile.', 'error');
        return;
    }
    const company_id = adminData.company_id; 
    
    if (!name || !location) { popup.showPopUp('Missing Fields', 'Please fill all clinic fields', 'error'); return; }

    try {
        // 2. Include company_id in the payload
        const res = await fetch(`${API_URL}/admin/create-clinic`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, location, company_id }) 
        });
        const data = await res.json();
        if (data.success) { 
            popup.showPopUp('Clinic Created', 'Clinic created successfully', 'success'); 
            const acn = document.getElementById('admin-clinic-name'); if (acn) acn.value = '';
            const acl = document.getElementById('admin-clinic-location'); if (acl) acl.value = '';
            const acc = document.getElementById('admin-clinic-city'); if (acc) acc.value = '';
        }
        else popup.showPopUp('Creation Failed', data.detail || 'Could not create clinic', 'error');
    } catch (err) { popup.showPopUp('Error', err.message || 'Failed to create clinic', 'error'); }
}

async function createReceptionist() {
    const name = document.getElementById('admin-recep-name') ? document.getElementById('admin-recep-name').value.trim() : '';
    const username = document.getElementById('admin-recep-username') ? document.getElementById('admin-recep-username').value.trim() : '';
    const email = document.getElementById('admin-recep-email') ? document.getElementById('admin-recep-email').value.trim() : '';
    const password = document.getElementById('admin-recep-password') ? document.getElementById('admin-recep-password').value : '';
    const contact = document.getElementById('admin-recep-contact') ? document.getElementById('admin-recep-contact').value.trim() : '';
    const clinic_id = document.getElementById('admin-recep-clinic') ? document.getElementById('admin-recep-clinic').value : '';

    if (!name || !username || !email || !password || !contact || !clinic_id) { popup.showPopUp('Missing Fields', 'Please fill all receptionist fields', 'error'); return; }
    if (!validate.email(email)) { popup.showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-receptionist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, contact, clinic_id }) });
        const data = await res.json();
        if (data.success) { 
            popup.showPopUp('Receptionist Created', 'Account created successfully', 'success'); admin.loadStaffAssignments().catch(() => {}); 
            const arn = document.getElementById('admin-recep-name'); if (arn) arn.value = '';
            const aru = document.getElementById('admin-recep-username'); if (aru) aru.value = '';
            const are = document.getElementById('admin-recep-email'); if (are) are.value = '';
            const arp = document.getElementById('admin-recep-password'); if (arp) arp.value = '';
            const arc = document.getElementById('admin-recep-contact'); if (arc) arc.value = '';
            const arcl = document.getElementById('admin-recep-clinic'); if (arcl) arcl.value = '';
        }
        else popup.showPopUp('Creation Failed', data.detail || 'Could not create receptionist', 'error');
    } catch (err) { popup.showPopUp('Error', err.message || 'Failed to create receptionist', 'error'); }
}

async function createDoctor() {
    const name = document.getElementById('admin-doctor-name') ? document.getElementById('admin-doctor-name').value.trim() : '';
    const username = document.getElementById('admin-doctor-username') ? document.getElementById('admin-doctor-username').value.trim() : '';
    const email = document.getElementById('admin-doctor-email') ? document.getElementById('admin-doctor-email').value.trim() : '';
    const password = document.getElementById('admin-doctor-password') ? document.getElementById('admin-doctor-password').value : '';
    const license = document.getElementById('admin-doctor-license') ? document.getElementById('admin-doctor-license').value.trim() : '';
    const contact = document.getElementById('admin-doctor-contact') ? document.getElementById('admin-doctor-contact').value.trim() : '';
    const clinic_id = document.getElementById('admin-doctor-clinic') ? document.getElementById('admin-doctor-clinic').value : '';
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const startTimes = days.map(day => document.getElementById(`admin-doctor-start-time-${day}`) ? document.getElementById(`admin-doctor-start-time-${day}`).value : null);
    const endTimes = days.map(day => document.getElementById(`admin-doctor-end-time-${day}`) ? document.getElementById(`admin-doctor-end-time-${day}`).value : null);

    if (!name || !username || !email || !password || !license || !contact || !clinic_id) { 
        popup.showPopUp('Missing Fields', 'Please fill all doctor fields', 'error'); return; 
    }
    if (!validate.email(email)) { popup.showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }
    for (let i = 0; i < days.length; i++) {
        if (startTimes[i]==="" && endTimes[i]==="") {
            startTimes[i] = null;
            endTimes[i] = null;
        } else if (startTimes[i] === "" || endTimes[i] === "") {
            popup.showPopUp('Invalid Availability', `Please provide both start and end times for ${days[i].charAt(0).toUpperCase() + days[i].slice(1)} or leave both empty`, 'error');
            return;
        }
    }

    try {
        const res = await fetch(`${API_URL}/admin/create-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, license_number: license, contact, clinic_id, startTimes, endTimes }) });
        const data = await res.json();
        if (data.success) { 
            popup.showPopUp('Doctor Created', 'Account created successfully', 'success'); admin.loadStaffAssignments().catch(() => {}); 
            const adn = document.getElementById('admin-doctor-name'); if (adn) adn.value = '';
            const adu = document.getElementById('admin-doctor-username'); if (adu) adu.value = '';
            const ade = document.getElementById('admin-doctor-email'); if (ade) ade.value = '';
            const adp = document.getElementById('admin-doctor-password'); if (adp) adp.value = '';
            const adl = document.getElementById('admin-doctor-license'); if (adl) adl.value = '';
            const adc = document.getElementById('admin-doctor-contact'); if (adc) adc.value = '+92 ';
            const adcl = document.getElementById('admin-doctor-clinic'); if (adcl) adcl.value = '';
            const adst = days.map(day => document.getElementById(`admin-doctor-start-time-${day}`)); adst.forEach(el => { if (el) el.value = ''; });
            const adet = days.map(day => document.getElementById(`admin-doctor-end-time-${day}`)); adet.forEach(el => { if (el) el.value = ''; });
        }
        else popup.showPopUp('Creation Failed', data.detail || 'Could not create doctor', 'error');
    } catch (err) { popup.showPopUp('Error', err.message || 'Failed to create doctor', 'error'); }
}

async function updateDoctorAvailability() {
    const doctorId = document.getElementById('edit-doctor-id').value;
    const startTime = document.getElementById('edit-doctor-start-time').value;
    const day_of_week = document.getElementById('edit-doctor-day').value;
    const endTime = document.getElementById('edit-doctor-end-time').value;

    if (!doctorId || !day_of_week) {
        popup.showPopUp("Missing Fields", "Please fill all fields to update availability", "error");
        return;
    }

    const res = await fetch(`/api/admin/update-availability/${doctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week, startTime, endTime })
    });
    const data = await res.json();

    if (!data.success) {
        popup.showPopUp("Update Failed", data.detail || "Doctor does not exist", "error");
        return;
    } else {
        popup.showPopUp("Availability Updated", "Doctor's availability has been updated successfully", "success");
    }
    
    document.getElementById('edit-doctor-id').value = '';
    document.getElementById('edit-doctor-day').value = '';
    document.getElementById('edit-doctor-start-time').value = '';
    document.getElementById('edit-doctor-end-time').value = '';
}

async function transferDoctor() {
    const doctorId = document.getElementById('admin-transfer-doctor') ? document.getElementById('admin-transfer-doctor').value : '';
    const clinicId = document.getElementById('admin-transfer-clinic') ? document.getElementById('admin-transfer-clinic').value : '';

    if (!doctorId || !clinicId) { popup.showPopUp('Missing Fields', 'Select doctor and new clinic', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/transfer-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: doctorId, new_clinic_id: clinicId }) });
        const data = await res.json();
        if (data.success) { 
            popup.showPopUp('Doctor Transferred', 'Doctor transfer successful', 'success'); 
            admin.loadStaffAssignments().catch(() => {}); 
            const atd = document.getElementById('admin-transfer-doctor'); if (atd) atd.value = '';
            const atc = document.getElementById('admin-transfer-clinic'); if (atc) atc.value = '';
        }
        else popup.showPopUp('Transfer Failed', data.detail || 'Could not transfer doctor', 'error');
    } catch (err) { popup.showPopUp('Error', err.message || 'Failed to transfer doctor', 'error'); }
}

async function postBulletin() {
    const title = document.getElementById('admin-bulletin-title') ? document.getElementById('admin-bulletin-title').value.trim() : '';
    const message = document.getElementById('admin-bulletin-message') ? document.getElementById('admin-bulletin-message').value.trim() : '';
    if (!title || !message) { popup.showPopUp('Missing Fields', 'Please provide title and message', 'error'); return; }

    const adminData = userState.getUser(); 
    if (!adminData || !adminData.admin_id) {
        popup.showPopUp('Error', 'Admin information not found', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/post-bulletin`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                admin_id: adminData.admin_id,
                title, 
                message 
            }) 
        });
        const data = await res.json();
        if (data.success) { 
            popup.showPopUp('Bulletin Posted', 'Bulletin published successfully', 'success'); 
            bulletins.loadBulletins().catch(() => {}); 
            const abt = document.getElementById('admin-bulletin-title'); if (abt) abt.value = '';
            const abm = document.getElementById('admin-bulletin-message'); if (abm) abm.value = '';
        }
        else popup.showPopUp('Post Failed', data.detail || 'Could not post bulletin', 'error');
    } catch (err) { popup.showPopUp('Error', err.message || 'Failed to post bulletin', 'error'); }
}


// ============================================================================
// Initialization helper
// ============================================================================

(function init() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
})();