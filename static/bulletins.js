import { showPopUp, showConfirmModal } from "./popup_modal.js";
import { getUser } from "./user_state.js";

// Load bulletins for main page view
export async function loadBulletins() {
    try {
        const currentUser = getUser();
        if (!currentUser) {
            console.warn('No current user, skipping loadBulletins');
            return;
        }

        if (currentUser.role === 'superadmin') {
            const banner = document.getElementById('bulletin-banner');
            if (banner) banner.classList.add('hidden');
            return;
        }

        let endpoint = `/api/bulletins`;
        if (currentUser.role === 'admin' && currentUser.admin_id) {
            endpoint = `/api/bulletins/admin/${currentUser.admin_id}`;
        }

        const res = await fetch(endpoint);
        if (!res.ok) {
            console.error(`Bulletins fetch failed: ${res.status} ${res.statusText}`);
            return;
        }
        const data = await res.json();
        
        const container = document.getElementById('bulletin-content');
        if (!container) {
            console.warn('bulletin-content container not found');
            return;
        }
        let bulletinHtml = '';

        let bulletinsToShow = data.bulletins || [];
        
        if ((currentUser.role === 'doctor' || currentUser.role === 'receptionist')) {
            try {
                const clinicRes = await fetch(`/api/clinic/${currentUser.clinic_id}/company`);
                const clinicData = await clinicRes.json();
                
                    if (clinicData.success && clinicData.company_id) {
                    bulletinsToShow = bulletinsToShow.filter(b => b.company_id === clinicData.company_id);
                }
            } catch (error) {
                console.error('Error fetching clinic company:', error);
            }
        }

    if (bulletinsToShow.length === 0) {
        bulletinHtml = '<p class="text-gray-500 text-center py-8">No announcements at this time</p>';
    } else if (currentUser.role === 'admin') {
        bulletinHtml = bulletinsToShow.map(b => `
            <div class="relative p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg mb-3 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-2 h-2 bg-primary rounded-full"></div>
                            <h4 class="font-bold text-gray-800">${b.title}</h4>
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed">${b.message}</p>
                        <p class="text-xs text-gray-400 mt-2">${new Date(b.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onclick="deleteBulletin(${b.id})"
                        class="text-gray-400 hover:text-red-500 transition flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        bulletinHtml = bulletinsToShow.map(b => `
            <div class="relative p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg mb-3 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-2 h-2 bg-primary rounded-full"></div>
                    <h4 class="font-bold text-gray-800">${b.title}</h4>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed">${b.message}</p>
                <p class="text-xs text-gray-400 mt-2">${new Date(b.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    }

    container.innerHTML = bulletinHtml;
    
    // Update badge and show toggle button if there are bulletins
    const toggleBtn = document.getElementById('bulletin-toggle-btn');
    const badge = document.getElementById('bulletin-badge');
    
    
    
    if (bulletinsToShow.length > 0) {
        if (toggleBtn) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.style.display = 'flex';
        }
        if (badge) {
            // Only show badge if bulletins haven't been read yet
            const bulletinsRead = localStorage.getItem('bulletins_read') === 'true';
            if (!bulletinsRead) {
                badge.classList.remove('hidden');
                badge.textContent = bulletinsToShow.length > 9 ? '9+' : bulletinsToShow.length;
            } else {
                badge.classList.add('hidden');
            }
        }
    } else {
        if (toggleBtn) {
            toggleBtn.classList.add('hidden');
            toggleBtn.style.display = 'none';
        }
        if (badge) badge.classList.add('hidden');
    }
    } catch (error) {
        console.error('Error in loadBulletins:', error);
    }
}

// Load bulletins for a specific company (used in superadmin company details modal)
export async function loadCompanyBulletins(companyId, containerId) {
    try {
        const res = await fetch(`/api/bulletins/company/${companyId}`);
        const data = await res.json();
        
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data.success || !data.bulletins || data.bulletins.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No bulletins posted for this company</p>';
            return;
        }

        container.innerHTML = data.bulletins.map(b => `
            <div class="relative p-4 bg-white rounded-lg mb-3 border">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${b.title}</h4>
                        <p class="text-sm text-gray-600">${b.message}</p>
                    </div>
                    <span class="text-xs text-gray-400">${new Date(b.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading company bulletins:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load bulletins</p>';
        }
    }
}

export function toggleBulletinPanel() {
    const panel = document.getElementById('bulletin-panel');
    const backdrop = document.getElementById('bulletin-backdrop');
    if (!panel) return;
    
    const isOpen = panel.style.transform === 'translateX(0px)' || panel.style.transform === '';
    panel.style.transform = isOpen ? 'translateX(100%)' : 'translateX(0px)';
    
    // Show/hide backdrop
    if (backdrop) {
        if (isOpen) {
            backdrop.classList.add('hidden');
        } else {
            backdrop.classList.remove('hidden');
        }
    }
    
    // Mark bulletins as read when panel is opened
    if (!isOpen) {
        const badge = document.getElementById('bulletin-badge');
        if (badge) badge.classList.add('hidden');
        // Save read state to localStorage
        localStorage.setItem('bulletins_read', 'true');
        
    }
}

window.deleteBulletin = async function(bulletinId) {
    // Use custom confirmation modal
    const confirmed = await showConfirmModal(
        'Delete Bulletin',
        'Are you sure you want to delete this bulletin? This action cannot be undone.',
        'Delete',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    const currentUser = getUser();
    if (!currentUser || !currentUser.admin_id) {
        showPopUp('Error', 'Admin information not found', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/delete-bulletin/${bulletinId}?admin_id=${currentUser.admin_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await res.json();
        if (data.success) {
            showPopUp('Success', 'Bulletin deleted successfully', 'success');
            loadBulletins();
        } else {
            showPopUp('Error', data.detail || 'Failed to delete bulletin', 'error');
        }
    } catch (error) {
        console.error('Error deleting bulletin:', error);
        showPopUp("Error", `An unexpected error occurred while trying to delete bulletin`, "error");
    }
}
