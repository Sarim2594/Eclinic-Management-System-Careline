function _getElements() {
    const modal = document.getElementById('popup-modal');
    const icon = document.getElementById('popup-icon');
    const titleEl = document.getElementById('popup-title');
    const messageEl = document.getElementById('popup-message');
    let buttonContainer = document.getElementById('popup-button-container');
    return { modal, icon, titleEl, messageEl, buttonContainer };
}

function _ensureButtonContainer(modal) {
    let bc = document.getElementById('popup-button-container');
    if (!bc && modal) {
        bc = document.createElement('div');
        bc.id = 'popup-button-container';
        bc.className = 'grid grid-cols-2 gap-3 mt-6';
        modal.appendChild(bc);
    }
    return bc;
}

function _setIcon(icon, type) {
    if (!icon) return;
    if (type === 'success') {
        icon.className = 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = `<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error' || type === 'danger') {
        icon.className = 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = `<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (type === 'warning') {
        icon.className = 'w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = `<svg class="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    } else {
        icon.className = 'w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4';
        icon.innerHTML = `<svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18z"/></svg>`;
    }
}

function _hideModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
}

function _showModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
}

export function showModal({ title = '', message = '', type = 'info', mode = 'notify', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
    const els = _getElements();
    // ensure modals stack on top of other elements when opened
    if (typeof window._popupZIndexCounter === 'undefined') window._popupZIndexCounter = 1000;
    
    if (els.modal && els.titleEl && els.messageEl) {
        els.titleEl.textContent = title;
        els.messageEl.textContent = message;
        _setIcon(els.icon, type);

        const bc = _ensureButtonContainer(els.modal);

        if (bc) bc.innerHTML = '';

        if (mode === 'confirm') {
            return new Promise((resolve) => {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors text-center';
                cancelBtn.textContent = cancelText;
                const confirmBtn = document.createElement('button');
                let confirmClass = 'px-6 py-3 text-white rounded-lg font-medium transition-colors text-center ';
                if (type === 'danger') {
                    confirmClass += 'bg-red-600 hover:bg-red-700';
                } else if (type === 'warning') {
                    confirmClass += 'bg-orange-600 hover:bg-orange-700';
                } else {
                    confirmClass += 'bg-primary hover:bg-primary-dark';
                }
                confirmBtn.className = confirmClass;
                confirmBtn.textContent = confirmText;

                const cleanup = () => {
                    if (bc) bc.innerHTML = '';
                    _hideModal(els.modal);
                    cancelBtn.onclick = null;
                    confirmBtn.onclick = null;
                };

                cancelBtn.onclick = () => { cleanup(); resolve(false); };
                confirmBtn.onclick = () => { cleanup(); resolve(true); };

                if (bc) {
                    bc.appendChild(cancelBtn);
                    bc.appendChild(confirmBtn);
                }

                // push this modal to the front
                if (els.modal) els.modal.style.zIndex = String(10000 + (++window._popupZIndexCounter));
                _showModal(els.modal);
            });
        }

        // notify mode: render a single full-width "Got it!" button in the container
        if (bc) {
            bc.innerHTML = '';
            const gotIt = document.createElement('button');
            gotIt.className = 'col-span-2 w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors';
            gotIt.textContent = 'Got it!';
            gotIt.onclick = () => { _hideModal(els.modal); };
            bc.appendChild(gotIt);
        }
        // push this modal to the front
        if (els.modal) els.modal.style.zIndex = String(10000 + (++window._popupZIndexCounter));
        _showModal(els.modal);
        return Promise.resolve();
    }

}

export function showPopUp(title, message, type) {
    return showModal({ title, message, type, mode: 'notify' });
}

export function closePopUp() {
    const els = _getElements();
    if (els.modal) _hideModal(els.modal);
}

export function showConfirmModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'confirmation') {
    return showModal({ title, message, type, mode: 'confirm', confirmText, cancelText });
}