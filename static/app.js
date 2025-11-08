const API_URL = 'http://localhost:8000/api';
let currentUser = null;

let allPastPatients = []; // This will now hold basic patient records the doctor has seen

let notificationInterval = null; // Global notification polling interval
let waitingPatientsInterval = null; // Global waiting patients polling interval
let lastNotificationCount = 0;
let lastWaitingPatientsCount = 0;

const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3");

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validatePhone(phone) {
    const regex = /^\+92\d{10}$/;
    if (!regex.test(phone)) return false;
    if (phone.length !== 13) return false; // +92 + 10 digits = 13
    return true;
}

function validateEmail(email) {
    // const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const regex = /^[a-zA-Z0-9._%+-]+@clinic.pk/
    return regex.test(email);
}

function formatPhoneInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    // If user types leading 0, convert to 92 prefix
    if (value.length > 0 && !value.startsWith('92')) {
        if (value.startsWith('0')) {
            value = '92' + value.substring(1);
        }
    }
    if (value.length > 12) value = value.substring(0, 12);
    input.value = value.length > 0 ? '+' + value : '';
}

function validateVitalsInput(input) {
    const value = input.value;
    let isValid = true;
    let errorMsg = '';

    // Simple BP format check
    if (input.id.includes('vitals-bp')) {
        if (!/^\d{2,3}\/\d{2,3}$/.test(value)) {
            isValid = false;
            errorMsg = 'Blood pressure must be in the format 120/80';
        }
    }


    if (!isValid) {
        input.classList.add('border-red-500');
        input.setAttribute('title', errorMsg);
    } else {
        input.classList.remove('border-red-500');
        input.removeAttribute('title');
    }

    return isValid;
}

// ============================================================================
// CUSTOM PopUp MODAL
// ============================================================================

function showPopUp(title, message, type) {
    const modal = document.getElementById('notification-modal');
    if (!modal) return; // silently return if UI not present

    const icon = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const messageEl = document.getElementById('notif-message');

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (icon) {
        if (type === 'success') {
            icon.className = 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `\n                <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>\n                </svg>\n            `;
        } else if (type === 'error') {
            icon.className = 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `\n                <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>\n                </svg>\n            `;
        } else {
            icon.className = 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `\n                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>\n                </svg>\n            `;
        }
    }

    modal.classList.remove('hidden');
}

function closePopUp() {
    const modal = document.getElementById('notification-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        getNotifications();
    } else {
        dropdown.classList.add('hidden');
    }
}

async function getNotifications() {
    if (!currentUser) return;
    
    const role = currentUser.role;
    let userId = null;
    
    if (role === 'doctor') {
        userId = currentUser.doctor_id;
    } else if (role === 'receptionist') {
        userId = currentUser.receptionist_id;
    }
    
    try {
        const url = userId 
            ? `${API_URL}/notifications/${role}/${userId}`
            : `${API_URL}/notifications/${role}/0`;
            
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            // Check if there are new notifications
            if (data.count > lastNotificationCount) {
                playNotificationSound();
            }
            lastNotificationCount = data.count;
            
            updateNotificationBadge(data.count);
            displayNotifications(data.notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function playNotificationSound() {
    if (sound) {
        // Reset and play
        sound.currentTime = 0;
        
        sound.play();
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notification-list');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8 text-sm">No new notifications</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item p-4 cursor-pointer" onclick="markNotificationRead(${notif.id})">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 rounded-full ${getNotificationColor(notif.type)} flex items-center justify-center">
                    ${getNotificationIcon(notif.type)}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800 text-sm">${notif.title}</p>
                    <p class="text-gray-600 text-sm mt-1">${notif.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${formatNotificationTime(notif.created_at)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function getNotificationColor(type) {
    const colors = {
        'diagnosis_complete': 'bg-green-100',
        'no_doctors_available': 'bg-red-100',
        'appointment_created': 'bg-blue-100',
        'new_patient': 'bg-blue-100',
        'transfer_doctor': 'bg-yellow-100',
        'default': 'bg-gray-100'
    };
    return colors[type] || colors.default;
}

function getNotificationIcon(type) {
    const icons = {
        'diagnosis_complete': '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        'no_doctors_available': '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        'appointment_created': '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
        'new_patient': '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>',
        'transfer_doctor': '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h11M9 21V3m0 0l7 7m-7-7L2 10"/></svg>',
        'default': '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    return icons[type] || icons.default;
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

async function markNotificationRead(notificationId) {
    try {
        const response = await fetch(`${API_URL}/notifications/mark-read/${notificationId}`, {
            method: 'PUT'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload notifications to update the list and badge
            await getNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
    if (!currentUser) return;
    
    console.log(currentUser);

    const role = currentUser.role;
    let userId = null;
    
    if (role === 'doctor') {
        userId = currentUser.doctor_id;
    } else if (role === 'receptionist') {
        userId = currentUser.receptionist_id;
    }
    
    try {
        const url = userId 
            ? `${API_URL}/notifications/mark-all-read/${role}/${userId}`
            : `${API_URL}/notifications/mark-all-read/${role}/0`;
            
        const response = await fetch(url, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            lastNotificationCount = 0; // Reset count to avoid sound on next refresh
            await getNotifications();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// Close notification dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notification-dropdown');
    const bell = event.target.closest('button[onclick="toggleNotifications()"]');
    
    if (dropdown && !dropdown.contains(event.target) && !bell) {
        dropdown.classList.add('hidden');
    }
});

// ============================================================================
// AUTHENTICATION AND POLLING
// ============================================================================

async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();

    const username_or_email = document.getElementById('username') ? document.getElementById('username').value : '';
    const password = document.getElementById('password') ? document.getElementById('password').value : '';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data;

            const loginPage = document.getElementById('login-page');
            const mainApp = document.getElementById('main-app');
            if (loginPage) loginPage.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            const portalName = document.getElementById('portal-name');
            if (portalName) portalName.textContent = data.role.charAt(0).toUpperCase() + data.role.slice(1) + ' Portal';
            const nameDisplay = document.getElementById('user-name-display');
            if (nameDisplay) nameDisplay.textContent = data.name || data.username || '';

            loadPortal(data.role);
            loadBulletins().catch(() => {});
            
            startNotificationPolling();
            // Start waiting patients polling if doctor
            if (data.role === 'doctor') {
                startWaitingPatientsPolling();
            }
        } else {
            showLoginMessage('Invalid credentials', 'error');
        }
    } catch (error) {
        showLoginMessage('Login failed: ' + (error.message || error), 'error');
    }
}

function startNotificationPolling() {
    // Clear any existing intervals
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }

    // Load notifications immediately
    getNotifications();
    
    // Poll every 10 seconds for notifications
    notificationInterval = setInterval(() => {
        getNotifications();
    }, 10000);
}

function startWaitingPatientsPolling() {
    // Clear any existing interval
    if (waitingPatientsInterval) {
        clearInterval(waitingPatientsInterval);
    }

    // Check if we're on the waiting patients tab
    const waitingTab = document.getElementById('doctor-tab-content-waiting');
    if (waitingTab && !waitingTab.classList.contains('hidden')) {
        // Load immediately
        displayWaitingPatients();
        
        // Poll every 10 seconds
        waitingPatientsInterval = setInterval(() => {
            displayWaitingPatients();
        }, 10000);
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
    currentUser = null;

    stopNotificationPolling();
    stopWaitingPatientsPolling();

    // Set doctor status to inactive on logout
    if (currentUser && currentUser.role === 'doctor' && currentUser.doctor_id) {
        try {
            fetch(`${API_URL}/doctors/set-inactive/${currentUser.doctor_id}`, { method: 'PUT' })
        } catch (error) {
            console.error('Error setting doctor status to inactive:', error);
        }
    }

    const mainApp = document.getElementById('main-app');
    const loginPage = document.getElementById('login-page');
    if (mainApp) mainApp.classList.add('hidden');
    if (loginPage) loginPage.classList.remove('hidden');
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    if (usernameEl) usernameEl.value = '';
    if (passwordEl) passwordEl.value = '';
}

function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

function stopWaitingPatientsPolling() {
    if (waitingPatientsInterval) {
        clearInterval(waitingPatientsInterval);
        waitingPatientsInterval = null;
    }
}

// ============================================================================
// PORTAL LOADING
// ============================================================================

function loadPortal(role) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    switch (role) {
        case 'receptionist':
            contentArea.innerHTML = getReceptionistHTML();
            break;
        case 'doctor':
            contentArea.innerHTML = getDoctorHTML();
            // Start by loading the default tab (Waiting Patients)
            showDoctorTab('waiting'); 
            break;
        case 'admin':
            contentArea.innerHTML = getAdminHTML();
            loadAdminDashboard().catch(() => {});
            loadAdminNotifications().catch(() => {});
            break;
        default:
            contentArea.innerHTML = '<p class="text-gray-600">Unknown role</p>';
            break;
    }
}

// ============================================================================
// RECEPTIONIST PORTAL
// ============================================================================

function getReceptionistHTML() {
    return `
        <div class="flex gap-4 mb-6 border-b border-gray-200">
            <button onclick="showReceptionistTab('register')" id="tab-register" class="px-4 py-3 font-medium border-b-2 border-primary text-primary">Register Patient</button>
        </div>

        <div id="recep-message" class="hidden mb-6 p-4 rounded-lg"></div>

        <!-- Register Tab -->
        <div id="register-tab" class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Register New Patient</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Patient Name *</label>
                    <input type="text" id="patient-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Muhammad Ali">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                    <input type="number" id="patient-age" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="35" min="1" step="1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select id="patient-gender" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                    <input type="text" id="patient-contact" oninput="formatPhoneInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="+923001234567">
                    <p class="text-xs text-gray-500 mt-1">Format: +92XXXXXXXXXX</p>
                </div>
            </div>
            <button onclick="registerPatient()" class="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">Register Patient & Download Ticket</button>
        </div>

        </div>
    `;
}

function showReceptionistTab(tab) {
    // Keeping this function even though it's currently only showing 'register'
    const tabs = ['register', 'vitals'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) btn.className = 'px-4 py-3 font-medium border-b-2 border-transparent text-gray-600';
    });


    const active = document.getElementById(`tab-${tab}`);
    if (active) active.className = 'px-4 py-3 font-medium border-b-2 border-primary text-primary';

    const registerTab = document.getElementById('register-tab');
    const vitalsTab = document.getElementById('vitals-tab');
    if (registerTab) registerTab.classList.toggle('hidden', tab !== 'register');
    if (vitalsTab) vitalsTab.classList.toggle('hidden', tab !== 'vitals');
}

async function registerPatient() {
    const name = document.getElementById('patient-name') ? document.getElementById('patient-name').value.trim() : '';
    const age = document.getElementById('patient-age') ? document.getElementById('patient-age').value : '';
    const gender = document.getElementById('patient-gender') ? document.getElementById('patient-gender').value : '';
    const contact = document.getElementById('patient-contact') ? document.getElementById('patient-contact').value.trim() : '';
    
    if (!name || !age || !contact) {
        showPopUp('Missing Fields', 'Please fill all required fields', 'error');
        return;
    }

    if (!validatePhone(contact)) {
        showPopUp('Invalid Phone', 'Contact must be in format: +92XXXXXXXXXX (e.g., +923001234567)', 'error');
        return;
    }

    console.log(JSON.stringify({ name, age: parseInt(age, 10), gender, contact, clinic_id: currentUser.clinic_id }));

    try {
        const response = await fetch(`${API_URL}/receptionist/register-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, age: parseInt(age, 10), gender, contact, clinic_id: currentUser.clinic_id })
        });

        const data = await response.json();

        if (data.success) {
            showPopUp('Patient Registered!', `Ticket #${data.ticket_no} | Patient ID: ${data.patient_id} | Assigned to Dr. ${data.doctor_name}`, 'success');

            // Open ticket in new tab (backend should serve this endpoint)
            try { window.open(`${API_URL}/receptionist/download-ticket/${data.patient_id}`, '_blank'); } catch (e) {}

            // Clear form
            const pn = document.getElementById('patient-name'); if (pn) pn.value = '';
            const pa = document.getElementById('patient-age'); if (pa) pa.value = '';
            const pc = document.getElementById('patient-contact'); if (pc) pc.value = '';
        } else {
            showPopUp('Registration Failed', data.detail || 'Could not register patient', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Registration failed: ' + (error.message || error), 'error');
    }
}

// ============================================================================
// DOCTOR PORTAL
// ============================================================================

function getDoctorHTML() {
    return `
        <div class="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button onclick="showDoctorTab('waiting')" id="doctor-tab-waiting" 
                class="px-4 py-3 font-medium border-b-2 border-primary text-primary whitespace-nowrap">
                <i class="fas fa-hourglass-half mr-2"></i> Waiting Patients
            </button>
            <button onclick="showDoctorTab('past')" id="doctor-tab-past" 
                class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">
                <i class="fas fa-history mr-2"></i> Your History
            </button>
        </div>

        <div id="doctor-tab-content-waiting" class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">My Waiting Patients</h3>
            <div id="waiting-patients">
                <p class="text-gray-500 text-center py-8">Loading patients...</p>
            </div>
        </div>

        <div id="doctor-tab-content-past" class="hidden bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">Patients You've Diagnosed</h3>
            <div class="mb-6">
                <input type="text" id="past-patient-search" 
                    oninput="searchPastPatients(this.value)" 
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg" 
                    placeholder="Search by name, contact, patient ID, age, or gender...">
            </div>
            
            <div id="past-patients">
                <p class="text-gray-500 text-center py-8">Loading patient history...</p>
            </div>
        </div>

        <div id="history-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-2xl font-bold text-gray-800" id="history-patient-name">Patient History</h3>
                    <button onclick="closeHistoryModal()" class="text-gray-500 hover:text-gray-800 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="p-6">
                    <div id="history-patient-basic-info" class="text-gray-600 p-3 bg-gray-50 rounded-lg border"></div>
                </div>
                <div id="history-appointment-list" class="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
                    <p class="text-gray-500 text-center py-8">Loading appointment records...</p>
                </div>
            </div>
        </div>

        <div id="confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">Confirm Submission</h3>
                    <p class="text-gray-600">Are you sure you want to submit this diagnosis?</p>
                </div>
                <div class="flex gap-4">
                    <button onclick="confirmDiagnosis()" id="confirm-submit-button" class="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">Yes, Submit</button>
                    <button onclick="closeConfirmModal()" class="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    `;
}

function showDoctorTab(tab) {
    const tabs = ['waiting', 'past'];
    tabs.forEach(t => {
        const btn = document.getElementById(`doctor-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
                t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'
            }`;
        }
        const content = document.getElementById(`doctor-tab-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== tab);
        }
    });

    if (tab === 'waiting') {
        loadWaitingPatients().catch(console.error);
        startWaitingPatientsPolling();
    } else if (tab === 'past') {
        loadDiagnosedPatients().catch(console.error);
        // Stop auto-refresh when not on waiting tab
        stopWaitingPatientsPolling();
    }
}

async function displayWaitingPatients() {
    const doctor_id = currentUser.doctor_id;
    const container = document.getElementById('waiting-patients');
    if (!doctor_id || !container) return;

    try {
        const response = await fetch(`${API_URL}/doctor/${doctor_id}/waiting-patients`);
        const data = await response.json();

        // Check if number of patients have changed
        if (lastWaitingPatientsCount === data.count) {return}
        
        // Re-render the waiting patients list
        lastWaitingPatientsCount = data.count;
        if (!data || data.count === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">✅ No patients waiting!</p>';
            return;
        }

        container.innerHTML = data.patients.map(appt => {
            return `
            <div class="border-b border-gray-200 mb-4">
                <div class="p-4 hover:bg-gray-50 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div class="cursor-pointer flex-1" onclick="togglePatientDetails('${appt.id}')">
                            <h4 class="font-semibold text-lg">Ticket #${appt.ticket_no} - ${appt.name}</h4>
                            <p class="text-gray-600">${appt.age}y, ${appt.gender} | ${appt.contact}</p>
                            <p class="text-sm text-primary mt-1">Patient ID: ${appt.patient_id}</p>
                        </div>
                        <div class="text-right flex gap-2">
                            <button onclick="togglePatientDetails('${appt.id}')" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">View Details</button>
                            <button onclick="viewPatientHistory('${appt.patient_id}', event)" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">View History</button>
                        </div>
                    </div>
                </div>

                <div id="details-${appt.id}" class="hidden p-6 bg-gray-50 rounded-lg">
                    <input type="hidden" id="patient-id-${appt.id}" value="${appt.patient_id}">

                    <h5 class="font-semibold text-gray-800 mb-6">Vital Readings:</h5>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Blood Pressure *</label>
                            <input type="text" id="vitals-bp-${appt.id}" oninput="validateVitalsInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="120/80" value="${appt.vitals.blood_pressure || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm) *</label>
                            <input type="number" step="0.1" id="vitals-hr-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="72" min="1" value="${appt.vitals.heart_rate || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Temperature (°F) *</label>
                            <input type="number" step="0.1" id="vitals-temperature-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98.6" min="1" value="${appt.vitals.temperature || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">BMI *</label>
                            <input type="number" step="0.1" id="vitals-bmi-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="24.5" min="1" value="${appt.vitals.bmi || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Blood Oxygen (%) *</label>
                            <input type="number" step="0.1" id="vitals-oxygen-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98" min="1" max="100" value="${appt.vitals.blood_oxygen || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
                            <input type="number" id="vitals-weight-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="75" min="1" value="${appt.vitals.weight || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
                            <input type="number" id="vitals-height-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="175" min="1" value="${appt.vitals.height || ''}">
                        </div>
                    </div>
                    
                    <hr class="mb-6 border-gray-300"> 
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                            <textarea id="diagnosis-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter diagnosis *"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Prescription *</label>
                            <textarea id="prescription-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter prescription *"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                            <textarea id="notes-${appt.id}" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Additional notes"></textarea>
                        </div>
                        <button onclick="submitDiagnosis('${appt.id}')" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Submit Diagnosis</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error('Error loading waiting patients:', error);
    }
}

function displayDiagnosedPatients(patients) {
    const pastPatientsContainer = document.getElementById('past-patients');
    
    if (!pastPatientsContainer) return;
    
    if (patients.length === 0) {
        pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No matching patient records found.</p>';
        return;
    }
    pastPatientsContainer.innerHTML = patients.map(patient => `
        <div class="border-b border-gray-200 mb-4">
            <div class="p-4 hover:bg-gray-50 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg">${patient.name} (ID: ${patient.id})</h4>
                        <p class="text-gray-600">${patient.age}y, ${patient.gender} | ${patient.contact}</p>
                        <p class="text-sm text-blue-600 mt-1">Latest visit: ${patient.diagnosed_date}</p>
                    </div>
                    <button onclick="viewPatientHistory('${patient.id}', event)" 
                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                        View Full History
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function searchPastPatients(query) {
    if (!allPastPatients || allPastPatients.length === 0) return;
    const lowerCaseQuery = query.toLowerCase();

    const filteredPatients = allPastPatients.filter(patient => {
        return (
        // Search across multiple fields
        (patient.name || '').toLowerCase().includes(lowerCaseQuery) ||
        (patient.contact || '').toLowerCase().includes(lowerCaseQuery) ||
        String(patient.id || '').includes(lowerCaseQuery) ||
        String(patient.age || '').includes(lowerCaseQuery) ||
        (patient.gender || '').toLowerCase().includes(lowerCaseQuery)
        );
    });

    displayDiagnosedPatients(filteredPatients);
}

async function loadDiagnosedPatients() {
    const doctor_id = currentUser.doctor_id;
    pastPatientsContainer = document.getElementById('past-patients');
    if (!doctor_id || !pastPatientsContainer) return;

    pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Loading your diagnosed patients...</p>';

    try {
        const response = await fetch(`${API_URL}/doctor/${doctor_id}/past-patients`);
        const data = await response.json();

        if (!data || data.count === 0) {
            allPastPatients = [];
            pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No previous patients found in your history.</p>';
            return;
        }

        // Store all fetched data globally for searching
        allPastPatients = data.patients || [];
        displayDiagnosedPatients(allPastPatients);

    } catch (error) {
        pastPatientsContainer.innerHTML = '<p class="text-red-500 text-center py-8">Error loading patient history</p>';
        console.error('Error loading past patients:', error);
    }
}

async function viewPatientHistory(patient_id, event) {
    // Prevent event bubbling if called from a button
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('viewPatientHistory called with patient_id:', patient_id);
    
    const modal = document.getElementById('history-modal');
    const nameEl = document.getElementById('history-patient-name');
    const basicInfoEl = document.getElementById('history-patient-basic-info');
    const listEl = document.getElementById('history-appointment-list');

    if (!modal || !nameEl || !basicInfoEl || !listEl) {
        console.error('History modal elements not found');
        return;
    }

    nameEl.textContent = 'Loading...';
    basicInfoEl.innerHTML = '';
    listEl.innerHTML = '<p class="text-gray-500 text-center py-8">Fetching appointment records...</p>';
    modal.classList.remove('hidden');
    
    console.log('Modal should be visible now');
    
    try {
        const response = await fetch(`${API_URL}/doctor/patient/${patient_id}/history`);
        const data = await response.json();

        console.log('History data received:', data);

        if (!data.success) {
            listEl.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${data.detail || 'Could not fetch history'}</p>`;
            nameEl.textContent = 'History Error';
            return;
        }

        const patient = data.patient;
        const history = data.history;
        
        nameEl.textContent = `${patient.name}'s Appointment History`;
        basicInfoEl.innerHTML = `
            <p><strong>Patient ID:</strong> ${patient.id}</p>
            <p><strong>Age:</strong> ${patient.age}y, <strong>Gender:</strong> ${patient.gender}, <strong>Contact:</strong> ${patient.contact}</p>
        `;

        if (history.length === 0) {
            listEl.innerHTML = '<p class="text-gray-500 text-center py-8">No previous completed appointments found for this patient.</p>';
            return;
        }

        listEl.innerHTML = history.map(appt => `
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-lg text-gray-800">Visit on ${appt.diagnosed_date}</h4>
                    <span class="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">Dr. ${appt.doctor_name}</span>
                </div>
                <p class="text-sm text-gray-600 mb-4">Ticket #${appt.ticket_no} | Appointment ID: ${appt.appointment_id}</p>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Blood Pressure</p>
                        <p class="font-semibold">${appt.vitals.blood_pressure || 'N/A'}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Heart Rate</p>
                        <p class="font-semibold">${appt.vitals.heart_rate || 'N/A'} bpm</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Temp</p>
                        <p class="font-semibold">${appt.vitals.temperature || 'N/A'}°F</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">BMI</p>
                        <p class="font-semibold">${appt.vitals.bmi || 'N/A'}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Blood Oxygen percentage</p>
                        <p class="font-semibold">${appt.vitals.blood_oxygen || 'N/A'}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Weight</p>
                        <p class="font-semibold">${appt.vitals.weight || 'N/A'}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Height</p>
                        <p class="font-semibold">${appt.vitals.height || 'N/A'}</p>
                    </div>
                </div>

                <div class="space-y-3 mt-4">
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Diagnosis:</p>
                        <p class="font-medium text-gray-700 whitespace-pre-wrap">${appt.diagnosis}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Prescription:</p>
                        <p class="font-medium text-gray-700 whitespace-pre-wrap">${appt.prescription}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg border">
                        <p class="text-xs text-gray-500">Notes:</p>
                        <p class="text-gray-700 whitespace-pre-wrap">${appt.notes}</p>
                    </div>
                </div>
            </div>
        `).join('');


    } catch (error) {
        listEl.innerHTML = `<p class="text-red-500 text-center py-8">Error loading history: ${error.message}</p>`;
        console.error('Error loading patient history:', error);
    }
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

async function loadWaitingPatients() {
    const doctor_id = currentUser.doctor_id;
    const container = document.getElementById('waiting-patients');
    if (!doctor_id || !container) return;

    // Reset container to show loading state
    container.innerHTML = '<p class="text-gray-500 text-center py-8">Loading patients...</p>';

    try {
        const response = await fetch(`${API_URL}/doctor/${doctor_id}/waiting-patients`);
        const data = await response.json();

        if (!data || data.count === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">✅ No patients waiting!</p>';
            return;
        }

        container.innerHTML = data.patients.map(appt => {
            return `
            <div class="border-b border-gray-200 mb-4">
                <div class="p-4 hover:bg-gray-50 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div class="cursor-pointer flex-1" onclick="togglePatientDetails('${appt.id}')">
                            <h4 class="font-semibold text-lg">Ticket #${appt.ticket_no} - ${appt.name}</h4>
                            <p class="text-gray-600">${appt.age}y, ${appt.gender} | ${appt.contact}</p>
                            <p class="text-sm text-primary mt-1">Patient ID: ${appt.patient_id}</p>
                        </div>
                        <div class="text-right flex gap-2">
                            <button onclick="togglePatientDetails('${appt.id}')" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">View Details</button>
                            <button onclick="viewPatientHistory('${appt.patient_id}', event)" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">View History</button>
                        </div>
                    </div>
                </div>

                <div id="details-${appt.id}" class="hidden p-6 bg-gray-50 rounded-lg">
                    <input type="hidden" id="patient-id-${appt.id}" value="${appt.patient_id}">

                    <h5 class="font-semibold text-gray-800 mb-6">Vital Readings:</h5>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Blood Pressure *</label>
                            <input type="text" id="vitals-bp-${appt.id}" oninput="validateVitalsInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="120/80" value="${appt.vitals.blood_pressure || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm) *</label>
                            <input type="number" step="0.1" id="vitals-hr-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="72" min="1" value="${appt.vitals.heart_rate || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Temperature (°F) *</label>
                            <input type="number" step="0.1" id="vitals-temperature-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98.6" min="1" value="${appt.vitals.temperature || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">BMI *</label>
                            <input type="number" step="0.1" id="vitals-bmi-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="24.5" min="1" value="${appt.vitals.bmi || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Blood Oxygen (%) *</label>
                            <input type="number" step="0.1" id="vitals-oxygen-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98" min="1" max="100" value="${appt.vitals.blood_oxygen || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label>
                            <input type="number" id="vitals-weight-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="75" min="1" value="${appt.vitals.weight || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
                            <input type="number" id="vitals-height-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="175" min="1" value="${appt.vitals.height || ''}">
                        </div>
                    </div>
                    
                    <hr class="mb-6 border-gray-300"> 
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                            <textarea id="diagnosis-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter diagnosis *"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Prescription *</label>
                            <textarea id="prescription-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter prescription *"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                            <textarea id="notes-${appt.id}" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Additional notes"></textarea>
                        </div>
                        <button onclick="submitDiagnosis('${appt.id}')" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Submit Diagnosis</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error loading patients</p>';
        console.error('Error loading waiting patients:', error);
    }
}

function togglePatientDetails(appointmentId) {
    const detailsDiv = document.getElementById(`details-${appointmentId}`);
    if (!detailsDiv) return;
    detailsDiv.classList.toggle('hidden');
}

async function submitDiagnosis(appointmentId) {
    const patientId = document.getElementById(`patient-id-${appointmentId}`).value;
    
    // 1. Collect Vitals
    const vitals = {
        blood_pressure: document.getElementById(`vitals-bp-${appointmentId}`) ? document.getElementById(`vitals-bp-${appointmentId}`).value.trim() : '',
        heart_rate: document.getElementById(`vitals-hr-${appointmentId}`) ? document.getElementById(`vitals-hr-${appointmentId}`).value.trim() : '',
        temperature: document.getElementById(`vitals-temperature-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-temperature-${appointmentId}`).value) : null,
        bmi: document.getElementById(`vitals-bmi-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-bmi-${appointmentId}`).value) : null,
        blood_oxygen: document.getElementById(`vitals-oxygen-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-oxygen-${appointmentId}`).value) : null,
        weight: document.getElementById(`vitals-weight-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-weight-${appointmentId}`).value) : null,
        height: document.getElementById(`vitals-height-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-height-${appointmentId}`).value) : null
    };
    
    if (!vitals.blood_pressure || !vitals.heart_rate || !vitals.temperature || !vitals.bmi || !vitals.blood_oxygen || !vitals.weight || !vitals.height) {
        showPopUp('Missing Vitals', 'Please fill all vital reading fields', 'error');
        return;
    }
    const bpInput = document.getElementById(`vitals-bp-${appointmentId}`);
    if (bpInput && !validateVitalsInput(bpInput)) { 
        showPopUp('Invalid Format', 'Blood pressure must be in the format 120/80', 'error');
        return;
    }
    
    // 2. Collect Diagnosis Data
    const diagnosisEl = document.getElementById(`diagnosis-${appointmentId}`);
    const prescriptionEl = document.getElementById(`prescription-${appointmentId}`);
    const notesEl = document.getElementById(`notes-${appointmentId}`);
    const diagnosis = diagnosisEl ? diagnosisEl.value.trim() : '';
    const prescription = prescriptionEl ? prescriptionEl.value.trim() : '';
    const notes = notesEl ? notesEl.value.trim() : '';

    if (!diagnosis || !prescription) {
        showPopUp('Missing Information', 'Please enter both diagnosis and prescription', 'error');
        return;
    }

    // 3. Submit Vitals
    try {
        const response = await fetch(`${API_URL}/doctor/record-vitals/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vitals)
        });

        const data = await response.json();

        if (!data.success) {
            showPopUp('Vitals Update Failed', data.detail || 'Could not update vitals before submission.', 'error');
            return;
        }
    } catch (error) {
        showPopUp('Error', error.message || 'Vitals update failed', 'error');
        return;
    }

    // Prepare the data payload
    const diagnosisPayload = {
        appointment_id: appointmentId, 
        patient_id: patientId,         
        doctor_id: currentUser.doctor_id,
        diagnosis,
        prescription,
        notes
    };
    
    // 4. Show Confirmation Modal and store payload on the button
    const confirmModal = document.getElementById('confirm-modal');
    const confirmButton = document.getElementById('confirm-submit-button');
    
    if (confirmModal && confirmButton) {
        // Store the payload as a JSON string on a data attribute
        confirmButton.setAttribute('data-diagnosis-payload', JSON.stringify(diagnosisPayload));
        confirmModal.classList.remove('hidden');
    } else {
        showPopUp('Error', 'Confirmation modal elements missing.', 'error');
    }
}

async function confirmDiagnosis() {
    const confirmButton = document.getElementById('confirm-submit-button');
    
    if (!confirmButton) {
        console.error("Confirm button not found.");
        return;
    }

    const payloadString = confirmButton.getAttribute('data-diagnosis-payload');
    
    if (!payloadString) {
        showPopUp('Error', 'Missing diagnosis data. Please resubmit.', 'error');
        closeConfirmModal(); 
        return;
    }
    
    // Parse the payload and clear the attribute before the API call begins
    let finalDiagnosisData;
    try {
        finalDiagnosisData = JSON.parse(payloadString);
    } catch (e) {
        showPopUp('Error', 'Invalid data format. Please refresh.', 'error');
        closeConfirmModal();
        return;
    }
    
    confirmButton.removeAttribute('data-diagnosis-payload'); 

    try {
        const response = await fetch(`${API_URL}/doctor/submit-diagnosis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalDiagnosisData)
        });

        const data = await response.json();

        closeConfirmModal();
        if (data.success) {
            showPopUp('Diagnosis Submitted!', 'Patient vitals and diagnosis have been recorded successfully.', 'success');
            // After submitting, reload waiting list instantly (patient disappears)
            loadWaitingPatients().catch(() => {});
            lastWaitingPatientsCount = -1; // and reduce count to stop unnecessary reload
        } else {
            showPopUp('Submission Failed', data.detail || 'Could not submit diagnosis', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Submission failed: ' + (error.message || error), 'error');
    }
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
    
    // Clear the data attribute in case the user closes/cancels
    const confirmButton = document.getElementById('confirm-submit-button');
    if (confirmButton) {
        confirmButton.removeAttribute('data-diagnosis-payload');
    }
}

// ============================================================================
// ADMIN PORTAL
// (No changes required in admin logic due to schema refactoring, as admin only
// tracks counts and transfers, not specific patient records/vitals/diagnosis).
// ============================================================================

function getAdminHTML() {
    return `
        <!--
        <div class="mb-8">
            <h2 class="text-3xl font-bold text-gray-800">Admin Control Panel</h2>
            <p class="text-gray-600 mt-2">System management and monitoring</p>
        </div>
        -->

        <div id="admin-notifications" class="mb-6"></div>

        <div class="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button onclick="showAdminTab('dashboard')" id="admin-tab-dashboard" class="px-4 py-3 font-medium border-b-2 border-primary text-primary whitespace-nowrap">Dashboard</button>
            <button onclick="showAdminTab('staff')" id="admin-tab-staff" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Staff Assignments</button>
            <button onclick="showAdminTab('clinic')" id="admin-tab-clinic" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Create Clinic</button>
            <button onclick="showAdminTab('receptionist')" id="admin-tab-receptionist" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Add Receptionist</button>
            <button onclick="showAdminTab('doctor')" id="admin-tab-doctor" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Add Doctor</button>
            <button onclick="showAdminTab('transfer')" id="admin-tab-transfer" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Transfer Doctor</button>
            <button onclick="showAdminTab('bulletin')" id="admin-tab-bulletin" class="px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap">Post Bulletin</button>
        </div>

        <div id="admin-message" class="hidden mb-6 p-4 rounded-lg"></div>

        <!-- Dashboard Tab -->
        <div id="admin-dashboard-tab">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary">
                    <p class="text-gray-600 text-sm">Total Clinics</p>
                    <p id="admin-stat-clinics" class="text-3xl font-bold text-gray-800">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                    <p class="text-gray-600 text-sm">Total Doctors</p>
                    <p id="admin-stat-doctors" class="text-3xl font-bold text-gray-800">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                    <p class="text-gray-600 text-sm">Total Patients</p>
                    <p id="admin-stat-patients" class="text-3xl font-bold text-gray-800">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                    <p class="text-gray-600 text-sm">Active Queue</p>
                    <p id="admin-stat-queue" class="text-3xl font-bold text-gray-800">-</p>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Clinic Breakdown</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-3 px-4">Clinic</th>
                                <th class="text-left py-3 px-4">Doctors</th>
                                <th class="text-left py-3 px-4">Patients</th>
                                <th class="text-left py-3 px-4">Waiting</th>
                            </tr>
                        </thead>
                        <tbody id="admin-clinic-stats"></tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Doctor Performance</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-3 px-4">Doctor</th>
                                <th class="text-left py-3 px-4">Assigned Clinic</th>
                                <th class="text-left py-3 px-4">Attended</th>
                                <th class="text-left py-3 px-4">Current Queue</th>
                            </tr>
                        </thead>
                        <tbody id="admin-doctor-stats"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Staff Assignments Tab -->
        <div id="admin-staff-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <div class="mb-6">
                <input type="text" id="staff-search" oninput="searchStaff()" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Search by name, username, or clinic...">
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Receptionists</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-3 px-4">Name</th>
                                <th class="text-left py-3 px-4">Username</th>
                                <th class="text-left py-3 px-4">Email</th>
                                <th class="text-left py-3 px-4">Assigned Clinic</th>
                            </tr>
                        </thead>
                        <tbody id="staff-receptionists"></tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Doctors</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b-2 border-gray-200">
                                <th class="text-left py-3 px-4">Name</th>
                                <th class="text-left py-3 px-4">Username</th>
                                <th class="text-left py-3 px-4">Email</th>
                                <th class="text-left py-3 px-4">Assigned Clinic</th>
                            </tr>
                        </thead>
                        <tbody id="staff-doctors"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Create Clinic Tab -->
        <div id="admin-clinic-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Create New Clinic</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Clinic Name *</label>
                    <input type="text" id="admin-clinic-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Shifa Medical Center">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <input type="text" id="admin-clinic-location" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="F-7, Islamabad">
                </div>
            </div>
            <button onclick="createClinic()" class="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">Create Clinic</button>
        </div>

        <!-- Add Receptionist Tab -->
        <div id="admin-receptionist-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Add Receptionist Account</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input type="text" id="admin-recep-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Sarim Khan">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                    <input type="text" id="admin-recep-username" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="sarim.khan">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input type="email" id="admin-recep-email" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="sarim@clinic.pk">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input type="password" id="admin-recep-password" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter password">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contact *</label>
                    <input type="text" id="admin-recep-contact" oninput="formatPhoneInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="+923001234567">
                    <p class="text-xs text-gray-500 mt-1">Format: +92XXXXXXXXXX (must be 13 characters)</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Assign to Clinic *</label>
                    <select id="admin-recep-clinic" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select clinic...</option>
                    </select>
                </div>
            </div>
            <button onclick="createReceptionist()" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Create Receptionist Account</button>
        </div>

        <!-- Add Doctor Tab -->
        <div id="admin-doctor-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-6">Add Doctor Account</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                        <input type="text" id="admin-doctor-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Ahmed Ali">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                        <input type="text" id="admin-doctor-username" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="ahmed.ali">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input type="email" id="admin-doctor-email" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="ahmed.ali@clinic.pk">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                        <input type="password" id="admin-doctor-password" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter password">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">License Number *</label>
                        <input type="text" id="admin-doctor-license" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="PMC-12345">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contact *</label>
                        <input type="text" id="admin-doctor-contact" oninput="formatPhoneInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="+923001234567">
                        <p class="text-xs text-gray-500 mt-1">Format: +92XXXXXXXXXX (must be 13 characters)</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Assign to Clinic *</label>
                        <select id="admin-doctor-clinic" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">Select clinic...</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Availability Hours *</label>
                        <div class="flex gap-2 items-center">
                            <input type="time" id="admin-doctor-start-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <span class="text-gray-600">to</span>
                            <input type="time" id="admin-doctor-end-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Example: 12:30 to 14:15</p>
                    </div>
                </div>
                <button onclick="createDoctor()" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Create Doctor Account</button>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-6">Edit Doctor Availability</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Doctor ID *</label>
                        <input type="number" id="edit-doctor-id" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter doctor ID">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">New Start Time *</label>
                        <input type="time" id="edit-doctor-start-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">New End Time *</label>
                        <input type="time" id="edit-doctor-end-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    </div>
                </div>
                <button onclick="updateDoctorAvailability()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Update Availability</button>
            </div>
        </div>

        <!-- Transfer Doctor Tab -->
        <div id="admin-transfer-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Transfer Doctor Between Clinics</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Doctor *</label>
                    <select id="admin-transfer-doctor" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select doctor...</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Clinic *</label>
                    <select id="admin-transfer-clinic" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select clinic...</option>
                    </select>
                </div>
            </div>
            <button onclick="transferDoctor()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Transfer Doctor</button>
        </div>

        <!-- Bulletin Tab -->
        <div id="admin-bulletin-tab" class="hidden bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Post Health Bulletin</h3>
            <div class="space-y-4 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input type="text" id="admin-bulletin-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Dengue Fever Alert">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <textarea id="admin-bulletin-message" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter bulletin message..."></textarea>
                </div>
            </div>
            <button onclick="postBulletin()" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">Post Bulletin</button>
        </div>
    `;
}

function showAdminTab(tab) {
    ['dashboard', 'staff', 'clinic', 'receptionist', 'doctor', 'transfer', 'bulletin'].forEach(t => {
        const btn = document.getElementById(`admin-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 ${t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'} whitespace-nowrap`;
            if (t === tab && t === 'dashboard') {
                loadAdminDashboard().catch(() => {});
            }
        }
    });

    document.getElementById('admin-dashboard-tab').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('admin-staff-tab').classList.toggle('hidden', tab !== 'staff');
    document.getElementById('admin-clinic-tab').classList.toggle('hidden', tab !== 'clinic');
    document.getElementById('admin-receptionist-tab').classList.toggle('hidden', tab !== 'receptionist');
    document.getElementById('admin-doctor-tab').classList.toggle('hidden', tab !== 'doctor');
    document.getElementById('admin-transfer-tab').classList.toggle('hidden', tab !== 'transfer');
    document.getElementById('admin-bulletin-tab').classList.toggle('hidden', tab !== 'bulletin');

    if (['receptionist', 'doctor', 'transfer'].includes(tab)) {
        loadAdminClinicsDropdown().catch(() => {});
        if (tab === 'transfer') loadAdminDoctorsDropdown().catch(() => {});
    }

    if (tab === 'staff') loadStaffAssignments().catch(() => {});
}

async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/statistics`);
        const data = await response.json();

        document.getElementById('admin-stat-clinics').textContent = (data && data.overview && data.overview.total_clinics) || '-';
        document.getElementById('admin-stat-doctors').textContent = (data && data.overview && data.overview.total_doctors) || '-';
        document.getElementById('admin-stat-patients').textContent = (data && data.overview && data.overview.total_patients) || '-';
        document.getElementById('admin-stat-queue').textContent = (data && data.overview && data.overview.active_appointments) || '-';

        const clinicStats = document.getElementById('admin-clinic-stats');
        if (clinicStats && data && data.clinic_breakdown) {
            clinicStats.innerHTML = data.clinic_breakdown.map(clinic => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${clinic.name}</td>
                    <td class="py-3 px-4">${clinic.total_doctors}</td>
                    <td class="py-3 px-4">${clinic.total_patients}</td>
                    <td class="py-3 px-4"><span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">${clinic.waiting_patients}</span></td>
                </tr>
            `).join('');
        }

        const doctorStats = document.getElementById('admin-doctor-stats');
        if (doctorStats && data && data.doctor_performance) {
            doctorStats.innerHTML = data.doctor_performance.map(doctor => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${doctor.name}</td>
                    <td class="py-3 px-4">${doctor.clinic_name}</td>
                    <td class="py-3 px-4">${doctor.total_attended}</td>
                    <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${doctor.currently_waiting}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

let allReceptionists = [];
let allDoctors = [];

async function loadStaffAssignments() {
    try {
        const [recepResponse, docResponse] = await Promise.all([
            fetch(`${API_URL}/admin/receptionists`),
            fetch(`${API_URL}/admin/statistics`)
        ]);

        const recepData = await recepResponse.json();
        const docData = await docResponse.json();

        allReceptionists = recepData.receptionists || [];
        allDoctors = docData.doctor_performance || [];

        displayStaff(allReceptionists, allDoctors);
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

function displayStaff(receptionists, doctors) {
    const recepTable = document.getElementById('staff-receptionists');
    const docTable = document.getElementById('staff-doctors');

    if (recepTable) {
        recepTable.innerHTML = receptionists.map(recep => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${recep.name}</td>
                <td class="py-3 px-4">${recep.username}</td>
                <td class="py-3 px-4">${recep.email}</td>
                <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${recep.clinic_name}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No receptionists found</td></tr>';
    }

    if (docTable) {
        docTable.innerHTML = doctors.map(doc => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${doc.name}</td>
                <td class="py-3 px-4">${doc.username}</td>
                <td class="py-3 px-4">${doc.email}</td>
                <td class="py-3 px-4"><span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">${doc.clinic_name}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No doctors found</td></tr>';
    }
}

function searchStaff() {
    const qEl = document.getElementById('staff-search');
    const query = qEl ? qEl.value.toLowerCase() : '';

    const filteredReceptionists = allReceptionists.filter(r => (
        (r.name || '').toLowerCase().includes(query) ||
        (r.username || '').toLowerCase().includes(query) ||
        (r.clinic_name || '').toLowerCase().includes(query)
    ));

    const filteredDoctors = allDoctors.filter(d => (
        (d.name || '').toLowerCase().includes(query) ||
        (d.username || '').toLowerCase().includes(query) ||
        (d.clinic_name || '').toLowerCase().includes(query)
    ));

    displayStaff(filteredReceptionists, filteredDoctors);
}

async function loadAdminNotifications() {
    try {
        const response = await fetch(`${API_URL}/admin/notifications`);
        const data = await response.json();
        const container = document.getElementById('admin-notifications');
        if (!container) return;

        if (!data || data.count === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = data.notifications.map(notif => `
            <div class="bg-red-50 border-l-4 border-primary rounded-lg p-4 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3">
                        <svg class="w-6 h-6 text-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <div>
                            <h4 class="font-semibold text-gray-800">${notif.message}</h4>
                            <p class="text-sm text-gray-600 mt-1">Please transfer a doctor to this clinic or approve a new doctor.</p>
                        </div>
                    </div>
                    <button onclick="markNotificationRead('${notif.id}')" class="text-primary hover:text-primary-dark text-sm font-medium">Dismiss</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`${API_URL}/admin/mark-notification-read/${notificationId}`, { method: 'PUT' });
        loadAdminNotifications().catch(() => {});
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function loadAdminClinicsDropdown() {
    try {
        const response = await fetch(`${API_URL}/clinics`);
        const data = await response.json();
        const selects = [
            document.getElementById('admin-doctor-clinic'),
            document.getElementById('admin-recep-clinic'),
            document.getElementById('admin-transfer-clinic')
        ];

        selects.forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="">Select clinic...</option>';
            (data.clinics || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id || '';
                opt.textContent = c.name || c.location || 'Clinic';
                sel.appendChild(opt);
            });
        });
    } catch (error) {
        console.error('Error loading clinics dropdown:', error);
    }
}

async function loadAdminDoctorsDropdown() {
    try {
        const response = await fetch(`${API_URL}/admin/statistics`);
        const data = await response.json();
        const sel = document.getElementById('admin-transfer-doctor');
        if (!sel) return;
        sel.innerHTML = '<option value="">Select doctor...</option>';
        (data.doctor_performance || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.doctor_id;
            opt.textContent = d.name || d.username || 'Doctor';
            sel.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading doctors dropdown:', error);
    }
}

// ============================================================================
// ADMIN ACTIONS: createClinic, createReceptionist, createDoctor, transferDoctor, postBulletin
// (simple implementations - adjust to your backend contract)
// ============================================================================

async function createClinic() {
    const name = document.getElementById('admin-clinic-name') ? document.getElementById('admin-clinic-name').value.trim() : '';
    const location = document.getElementById('admin-clinic-location') ? document.getElementById('admin-clinic-location').value.trim() : '';

    if (!name || !location) { showPopUp('Missing Fields', 'Please fill all clinic fields', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-clinic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, location}) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Clinic Created', 'The clinic has been created successfully', 'success'); loadAdminClinicsDropdown().catch(() => {}); 
            const acn = document.getElementById('admin-clinic-name'); if (acn) acn.value = '';
            const acl = document.getElementById('admin-clinic-location'); if (acl) acl.value = '';
        }
        else showPopUp('Creation Failed', data.detail || 'Could not create clinic', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create clinic', 'error'); }
}

async function createReceptionist() {
    const name = document.getElementById('admin-recep-name') ? document.getElementById('admin-recep-name').value.trim() : '';
    const username = document.getElementById('admin-recep-username') ? document.getElementById('admin-recep-username').value.trim() : '';
    const email = document.getElementById('admin-recep-email') ? document.getElementById('admin-recep-email').value.trim() : '';
    const password = document.getElementById('admin-recep-password') ? document.getElementById('admin-recep-password').value : '';
    const contact = document.getElementById('admin-recep-contact') ? document.getElementById('admin-recep-contact').value.trim() : '';
    const clinic_id = document.getElementById('admin-recep-clinic') ? document.getElementById('admin-recep-clinic').value : '';

    if (!name || !username || !email || !password || !contact || !clinic_id) { showPopUp('Missing Fields', 'Please fill all receptionist fields', 'error'); return; }
    if (!validateEmail(email)) { showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }
    if (!validatePhone(contact)) { showPopUp('Invalid Phone', 'Contact must be in +92XXXXXXXXXX format', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-receptionist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, contact, clinic_id }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Receptionist Created', 'Account created successfully', 'success'); loadStaffAssignments().catch(() => {}); 
            const arn = document.getElementById('admin-recep-name'); if (arn) arn.value = '';
            const aru = document.getElementById('admin-recep-username'); if (aru) aru.value = '';
            const are = document.getElementById('admin-recep-email'); if (are) are.value = '';
            const arp = document.getElementById('admin-recep-password'); if (arp) arp.value = '';
            const arc = document.getElementById('admin-recep-contact'); if (arc) arc.value = '';
            const arcl = document.getElementById('admin-recep-clinic'); if (arcl) arcl.value = '';
        }
        else showPopUp('Creation Failed', data.detail || 'Could not create receptionist', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create receptionist', 'error'); }
}

async function createDoctor() {
    const name = document.getElementById('admin-doctor-name') ? document.getElementById('admin-doctor-name').value.trim() : '';
    const username = document.getElementById('admin-doctor-username') ? document.getElementById('admin-doctor-username').value.trim() : '';
    const email = document.getElementById('admin-doctor-email') ? document.getElementById('admin-doctor-email').value.trim() : '';
    const password = document.getElementById('admin-doctor-password') ? document.getElementById('admin-doctor-password').value : '';
    const license = document.getElementById('admin-doctor-license') ? document.getElementById('admin-doctor-license').value.trim() : '';
    const contact = document.getElementById('admin-doctor-contact') ? document.getElementById('admin-doctor-contact').value.trim() : '';
    const clinic_id = document.getElementById('admin-doctor-clinic') ? document.getElementById('admin-doctor-clinic').value : '';
    const startTime = document.getElementById('admin-doctor-start-time') ? document.getElementById('admin-doctor-start-time').value : '';
    const endTime = document.getElementById('admin-doctor-end-time') ? document.getElementById('admin-doctor-end-time').value : '';

    if (!name || !username || !email || !password || !license || !contact || !clinic_id) { 
        showPopUp('Missing Fields', 'Please fill all doctor fields', 'error'); return; 
    }
    if (!validateEmail(email)) { showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }
    if (!validatePhone(contact)) { showPopUp('Invalid Phone', 'Contact must be in +92XXXXXXXXXX format', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, license_number: license, contact, clinic_id }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Doctor Created', 'Account created successfully', 'success'); loadStaffAssignments().catch(() => {}); 
            const adn = document.getElementById('admin-doctor-name'); if (adn) adn.value = '';
            const adu = document.getElementById('admin-doctor-username'); if (adu) adu.value = '';
            const ade = document.getElementById('admin-doctor-email'); if (ade) ade.value = '';
            const adp = document.getElementById('admin-doctor-password'); if (adp) adp.value = '';
            const adl = document.getElementById('admin-doctor-license'); if (adl) adl.value = '';
            const adc = document.getElementById('admin-doctor-contact'); if (adc) adc.value = '';
            const adcl = document.getElementById('admin-doctor-clinic'); if (adcl) adcl.value = '';
        }
        else showPopUp('Creation Failed', data.detail || 'Could not create doctor', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create doctor', 'error'); }
}

async function updateDoctorAvailability() {
    const doctorId = document.getElementById('edit-doctor-id').value;
    const startTime = document.getElementById('edit-doctor-start-time').value;
    const endTime = document.getElementById('edit-doctor-end-time').value;

    if (!doctorId || !startTime || !endTime) {
        showPopUp("Missing Fields", "Please fill all fields to update availability", "error");
        return;
    }

    const res = await fetch(`/api/admin/update-availability/${doctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime })
    });
    const data = await res.json();

    if (!data.success) {
        showPopUp("Update Failed", data.detail || "Doctor does not exist", "error");
        return;
    } else {
        showPopUp("Availability Updated", "Doctor's availability has been updated successfully");
    }
    
    document.getElementById('edit-doctor-id').value = '';
    document.getElementById('edit-doctor-start-time').value = '';
    document.getElementById('edit-doctor-end-time').value = '';
}

async function transferDoctor() {
    const doctorId = document.getElementById('admin-transfer-doctor') ? document.getElementById('admin-transfer-doctor').value : '';
    const clinicId = document.getElementById('admin-transfer-clinic') ? document.getElementById('admin-transfer-clinic').value : '';

    if (!doctorId || !clinicId) { showPopUp('Missing Fields', 'Select doctor and new clinic', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/transfer-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: doctorId, new_clinic_id: clinicId }) });
        const data = await res.json();
        if (data.success) { showPopUp('Doctor Transferred', 'Doctor transfer successful', 'success'); loadStaffAssignments().catch(() => {}); }
        else showPopUp('Transfer Failed', data.detail || 'Could not transfer doctor', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to transfer doctor', 'error'); }
}

async function postBulletin() {
    const title = document.getElementById('admin-bulletin-title') ? document.getElementById('admin-bulletin-title').value.trim() : '';
    const message = document.getElementById('admin-bulletin-message') ? document.getElementById('admin-bulletin-message').value.trim() : '';
    if (!title || !message) { showPopUp('Missing Fields', 'Please provide title and message', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/post-bulletin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Bulletin Posted', 'Bulletin published successfully', 'success'); loadBulletins().catch(() => {}); 
            const abt = document.getElementById('admin-bulletin-title'); if (abt) abt.value = '';
            const abm = document.getElementById('admin-bulletin-message'); if (abm) abm.value = '';
        }
        else showPopUp('Post Failed', data.detail || 'Could not post bulletin', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to post bulletin', 'error'); }
}

// ============================================================================
// BULLETINS (shared)
// ============================================================================

async function loadBulletins() {
    try {
        const res = await fetch(`${API_URL}/bulletins`);
        const data = await res.json();
        
        // --- THIS LINE IS THE FIX ---
        // Change 'bulletin-list' to 'bulletin-content'
        const container = document.getElementById('bulletin-content'); 
        // -----------------------------
        
        if (!container) return;
        
        // Construct the HTML for the bulletins
        const bulletinHtml = (data.bulletins || []).map(b => `
            <div class="p-4 bg-white rounded-lg mb-3 border">
                <h4 class="font-semibold text-gray-800">${b.title}</h4>
                <p class="text-sm text-gray-600">${b.message}</p>
            </div>
        `).join('');

        // 1. Insert the content
        container.innerHTML = bulletinHtml;
        
        // 2. Make the banner visible (if it was hidden initially)
        const banner = document.getElementById('bulletin-banner');
        if (bulletinHtml.trim() !== '' && banner.classList.contains('hidden')) {
            banner.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading bulletins:', error);
    }
}

// ============================================================================
// Initialization helper to attach login form handler if present
// ============================================================================

(function init() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
})();
