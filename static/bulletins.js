import { showPopUp } from "./popup_modal.js";
import { getUser } from "./user_state.js";

// Load bulletins for main page view
export async function loadBulletins() {
    const currentUser = getUser();
    if (!currentUser) return;

    if (currentUser.role === 'superadmin') {
        const banner = document.getElementById('bulletin-banner');
        if (banner) banner.classList.add('hidden');
        return;
    }

    let endpoint = `http://localhost:8000/api/bulletins`;
    if (currentUser.role === 'admin' && currentUser.admin_id) {
        endpoint = `http://localhost:8000/api/bulletins/admin/${currentUser.admin_id}`;
    }

    const res = await fetch(endpoint);
    const data = await res.json();
    
    const container = document.getElementById('bulletin-content');
    if (!container) return;
    let bulletinHtml = '';

    let bulletinsToShow = data.bulletins || [];
    
    if ((currentUser.role === 'doctor' || currentUser.role === 'receptionist')) {
        try {
            const clinicRes = await fetch(`http://localhost:8000/api/clinic/${currentUser.clinic_id}/company`);
            const clinicData = await clinicRes.json();
            
            if (clinicData.success && clinicData.company_id) {
                bulletinsToShow = bulletinsToShow.filter(b => b.company_id === clinicData.company_id);
            }
        } catch (error) {
            console.error('Error fetching clinic company:', error);
        }
    }

    if (currentUser.role === 'admin') {
        bulletinHtml = bulletinsToShow.map(b => `
            <div class="relative p-4 bg-white rounded-lg mb-3 border flex items-start justify-between">
                <div>
                    <h4 class="font-semibold text-gray-800">${b.title}</h4>
                    <p class="text-sm text-gray-600">${b.message}</p>
                </div>
                <button onclick="deleteBulletin(${b.id})"
                    class="ml-4 text-gray-400 hover:text-red-500 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join('');
    } else {
        bulletinHtml = bulletinsToShow.map(b => `
            <div class="relative p-4 bg-white rounded-lg mb-3 border">
                <h4 class="font-semibold text-gray-800">${b.title}</h4>
                <p class="text-sm text-gray-600">${b.message}</p>
            </div>
        `).join('');
    }

    container.innerHTML = bulletinHtml;
    
    const banner = document.getElementById('bulletin-banner');
    if (bulletinHtml.trim() !== '' && banner) {
        banner.classList.remove('hidden');
    } else if (banner) {
        banner.classList.add('hidden');
    }
}

// Load bulletins for a specific company (used in superadmin company details modal)
export async function loadCompanyBulletins(companyId, containerId) {
    try {
        const res = await fetch(`http://localhost:8000/api/bulletins/company/${companyId}`);
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

window.deleteBulletin = async function(bulletinId) {
    if (!confirm('Are you sure you want to delete this bulletin?')) return;
    
    const currentUser = getUser();
    if (!currentUser || !currentUser.admin_id) {
        showPopUp('Error', 'Admin information not found', 'error');
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:8000/api/admin/delete-bulletin/${bulletinId}?admin_id=${currentUser.admin_id}`, {
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
        showPopUp("Error", `An unexpected error occurred while trying to delete bulletin with id: ${bulletinId}`, "error");
    }
}