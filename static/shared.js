const API_URL = 'http://localhost:8000/api';
let currentUser = null;
let notificationInterval = null;
let lastNotificationCount = 0;
const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3");

// ============================================================================
// AUTH & INITIALIZATION
// ============================================================================

function checkAuth() {
    const userData = localStorage.getItem('currentUser');
    
    if (!userData) {
        // --- 1. NOT Logged In ---
        // We don't reveal the page. We just redirect.
        window.location.replace('/login'); // Use .replace() to avoid browser "back" button
        return; // Stop all execution
    }

    // --- 2. Logged In: Parse data ---
    try {
        currentUser = JSON.parse(userData);
    } catch (e) {
        // Data is corrupt. Clear it and redirect to login.
        localStorage.removeItem('currentUser');
        window.location.replace('/login');
        return;
    }

    // --- 3. Logged In: Check if on the RIGHT portal ---
    const requiredRole = window.location.pathname.substring(1); // 'admin', 'doctor', etc.

    if (requiredRole && currentUser.role && currentUser.role !== requiredRole) {
        // --- 4. WRONG Portal ---
        // We don't reveal the page. We redirect to their *correct* portal.
        window.location.replace(`/${currentUser.role}`);
        return; // Stop all execution
    }

    // --- 5. Logged In AND Correct Portal ---
    // This is the ONLY case where we reveal the page.
    const mainApp = document.getElementById('main-app');
    if (mainApp) {
        mainApp.style.opacity = 1;
    } else {
        console.error('CRITICAL: #main-app not found. Page cannot be revealed.');
        return;
    }
    
    const nameDisplay = document.getElementById('user-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = currentUser.name || currentUser.username || '';
    }
}

// Function to clear the server-set cookie
function clearSessionCookie() {
    document.cookie = "session=; Max-Age=0; path=/; domain=" + window.location.hostname;
}

async function logout() {
    // Set doctor status to inactive on logout
    if (currentUser && currentUser.role === 'doctor' && currentUser.doctor_id) {
        try {
            await fetch(`${API_URL}/doctors/set-inactive/${currentUser.doctor_id}`, { method: 'PUT' });
        } catch (error) {
            console.error('Error setting doctor status to inactive:', error);
        }
    }
    // Clear the secure cookie set by the server
    clearSessionCookie();
    // Clear local storage and redirect
    localStorage.removeItem('currentUser');
    currentUser = null;
    stopNotificationPolling();
    // Redirect to login
    window.location.href = '/login';
}

// Run initialization logic on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Check authentication first
    
    // If auth is successful, currentUser will be set
    if (currentUser) {
        loadBulletins().catch(() => {});
        startNotificationPolling();
    }
});

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
    const regex = /^[a-zA-Z0-9._%+-]+@clinic.pk/
    return regex.test(email);
}

function formatPhoneInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
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
    if (!modal) return; 

    const icon = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const messageEl = document.getElementById('notif-message');

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (icon) {
        if (type === 'success') {
            icon.className = 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
        } else if (type === 'error') {
            icon.className = 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
        } else {
            icon.className = 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4';
            icon.innerHTML = `<svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
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
            await getNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
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
            ? `${API_URL}/notifications/mark-all-read/${role}/${userId}`
            : `${API_URL}/notifications/mark-all-read/${role}/0`;
            
        const response = await fetch(url, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            lastNotificationCount = 0;
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
// POLLING
// ============================================================================

function startNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
    getNotifications();
    notificationInterval = setInterval(getNotifications, 10000);
}

function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// ============================================================================
// BULLETINS (shared)
// ============================================================================

async function loadBulletins() {
    try {
        const res = await fetch(`${API_URL}/bulletins`);
        const data = await res.json();
        const container = document.getElementById('bulletin-content'); 
        if (!container) return;
        
        const bulletinHtml = (data.bulletins || []).map(b => `
            <div class="p-4 bg-white rounded-lg mb-3 border">
                <h4 class="font-semibold text-gray-800">${b.title}</h4>
                <p class="text-sm text-gray-600">${b.message}</p>
            </div>
        `).join('');

        container.innerHTML = bulletinHtml;
        
        const banner = document.getElementById('bulletin-banner');
        if (bulletinHtml.trim() !== '' && banner && banner.classList.contains('hidden')) {
            banner.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading bulletins:', error);
    }
}