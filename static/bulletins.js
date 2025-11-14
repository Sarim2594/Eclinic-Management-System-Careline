export async function loadBulletins() {
    try {
        const res = await fetch(`http://localhost:8000/api/bulletins`);
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