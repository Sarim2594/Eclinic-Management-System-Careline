import { showPopUp } from "./popup_modal.js";

let currentUser = null;

export function setCurrentUser(data) {
    currentUser = data;
}

export async function loadBulletins() {
    try {
        const res = await fetch(`http://localhost:8000/api/bulletins`);
        const data = await res.json();
        
        const container = document.getElementById('bulletin-content');
        
        if (!container) return;
        let bulletinHtml = '';

        // Construct the HTML for the bulletins
        if (currentUser.role !== 'admin') {
            bulletinHtml = (data.bulletins || []).map(b => `
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
            bulletinHtml = (data.bulletins || []).map(b => `
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
        }

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

window.deleteBulletin = async function(bulletinId) {
    try {
        const res = await fetch(`http://localhost:8000/api/admin/delete-bulletin/${bulletinId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await res.json();
        if (data.success) {
            // Reload bulletins after deletion
            loadBulletins();
        }
    } catch (error) {
        console.error('Error deleting bulletin:', error);
        showPopUp("Error deleting bulletin.", `An unexpected error occured while trying to delete bulletin with id: ${bulletinId}`, "error");
    }
}