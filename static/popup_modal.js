export function showPopUp(title, message, type) {
    const modal = document.getElementById('popup-modal');
    if (!modal) return; // silently return if UI not present

    const icon = document.getElementById('popup-icon');
    const titleEl = document.getElementById('popup-title');
    const messageEl = document.getElementById('popup-message');

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

export function closePopUp() {
    const modal = document.getElementById('popup-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}