import { getUser } from "./user_state.js";

const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3");

let lastNotificationCount = 0;
let notificationInterval = null;

export function toggleNotifications() {
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
    const currentUser = getUser();
    if (!currentUser) return;
    
    const role = currentUser.role;
    let userId = null;
    
    if (role === 'doctor') {
        userId = currentUser.doctor_id;
    } else if (role === 'receptionist') {
        userId = currentUser.receptionist_id;
    } else if (role === 'admin') {
        userId = currentUser.admin_id;
    } else if (role === 'superadmin') {
        userId = currentUser.superadmin_id;
    }
    
    try {
        // FIX: Use the new /notifications/{role}?user_id={id} structure
        const url = `/api/notifications/${role}` + (userId ? `?user_id=${userId}` : '');
            
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

export async function markNotificationRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/mark-read/${notificationId}`, {
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

export async function markAllAsRead() {
    const currentUser = getUser();
    if (!currentUser) return;
    
    const role = currentUser.role;
    let userId = null;
    
    if (role === 'doctor') {
        userId = currentUser.doctor_id;
    } else if (role === 'receptionist') {
        userId = currentUser.receptionist_id;
    } else if (role === 'admin') {
        userId = currentUser.admin_id;
    } else if (role === 'superadmin') {
        userId = currentUser.superadmin_id;
    }
    
    try {
        // FIX: Use the new /mark-all-read/{role}?user_id={id} structure
        const url = `/api/notifications/mark-all-read/${role}` + (userId ? `?user_id=${userId}` : '');
            
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

export function setupNotificationCloser() {
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = event.target.closest('#notification-button');
        
        if (dropdown && !dropdown.contains(event.target) && !bell) {
            dropdown.classList.add('hidden');
        }
    });
}

export function startNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
    getNotifications();    
    notificationInterval = setInterval(() => {
        getNotifications();
    }, 10000);
}

export function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}