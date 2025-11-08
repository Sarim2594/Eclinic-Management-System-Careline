// ============================================================================
// RECEPTIONIST PORTAL
// ============================================================================

function showReceptionistTab(tab) {
    // This function is kept for consistency, even if there's only one tab
    const tabs = ['register'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) btn.className = 'px-4 py-3 font-medium border-b-2 border-transparent text-gray-600';
    });

    const active = document.getElementById(`tab-${tab}`);
    if (active) active.className = 'px-4 py-3 font-medium border-b-2 border-primary text-primary';

    const registerTab = document.getElementById('register-tab');
    if (registerTab) registerTab.classList.toggle('hidden', tab !== 'register');
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

    try {
        const response = await fetch(`${API_URL}/receptionist/register-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, age: parseInt(age, 10), gender, contact, clinic_id: currentUser.clinic_id })
        });

        const data = await response.json();

        if (data.success) {
            showPopUp('Patient Registered!', `Ticket #${data.ticket_no} | Patient ID: ${data.patient_id} | Assigned to Dr. ${data.doctor_name}`, 'success');

            // Open ticket in new tab
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