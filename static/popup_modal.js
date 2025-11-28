export function showPopUp(title, message, type) {
    const modal = document.getElementById('popup-modal');
    if (!modal) return; 

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

export async function showConfirmModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-lg shadow-lg p-6 max-w-sm';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'text-lg font-semibold text-gray-800 mb-2';
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.className = 'text-gray-600 mb-6';
        messageEl.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-3 justify-end';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium transition';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
            backdrop.remove();
            resolve(false);
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            backdrop.remove();
            resolve(true);
        };
        
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        
        modal.appendChild(titleEl);
        modal.appendChild(messageEl);
        modal.appendChild(buttonContainer);
        backdrop.appendChild(modal);
        
        document.body.appendChild(backdrop);
    });
}