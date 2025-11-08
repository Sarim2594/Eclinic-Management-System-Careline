// ============================================================================
// ADMIN PORTAL
// ============================================================================

let allReceptionists = [];
let allDoctors = [];

function showAdminTab(tab) {
    ['dashboard', 'staff', 'clinic', 'receptionist', 'doctor', 'transfer', 'bulletin'].forEach(t => {
        const btn = document.getElementById(`admin-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 ${t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'} whitespace-nowrap`;
            if (t === tab && t === 'dashboard') {
                loadAdminDashboard().catch(() => {});
            }
        }
    });

    document.getElementById('admin-dashboard-tab').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('admin-staff-tab').classList.toggle('hidden', tab !== 'staff');
    document.getElementById('admin-clinic-tab').classList.toggle('hidden', tab !== 'clinic');
    document.getElementById('admin-receptionist-tab').classList.toggle('hidden', tab !== 'receptionist');
    document.getElementById('admin-doctor-tab').classList.toggle('hidden', tab !== 'doctor');
    document.getElementById('admin-transfer-tab').classList.toggle('hidden', tab !== 'transfer');
    document.getElementById('admin-bulletin-tab').classList.toggle('hidden', tab !== 'bulletin');

    if (['receptionist', 'doctor', 'transfer'].includes(tab)) {
        loadAdminClinicsDropdown().catch(() => {});
        if (tab === 'transfer') loadAdminDoctorsDropdown().catch(() => {});
    }
    if (tab === 'staff') loadStaffAssignments().catch(() => {});
}

async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/statistics`);
        const data = await response.json();

        document.getElementById('admin-stat-clinics').textContent = (data && data.overview && data.overview.total_clinics) || '-';
        document.getElementById('admin-stat-doctors').textContent = (data && data.overview && data.overview.total_doctors) || '-';
        document.getElementById('admin-stat-patients').textContent = (data && data.overview && data.overview.total_patients) || '-';
        document.getElementById('admin-stat-queue').textContent = (data && data.overview && data.overview.active_appointments) || '-';

        const clinicStats = document.getElementById('admin-clinic-stats');
        if (clinicStats && data && data.clinic_breakdown) {
            clinicStats.innerHTML = data.clinic_breakdown.map(clinic => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${clinic.name}</td>
                    <td class="py-3 px-4">${clinic.total_doctors}</td>
                    <td class="py-3 px-4">${clinic.total_patients}</td>
                    <td class="py-3 px-4"><span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">${clinic.waiting_patients}</span></td>
                </tr>
            `).join('');
        }

        const doctorStats = document.getElementById('admin-doctor-stats');
        if (doctorStats && data && data.doctor_performance) {
            doctorStats.innerHTML = data.doctor_performance.map(doctor => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${doctor.name}</td>
                    <td class="py-3 px-4">${doctor.clinic_name}</td>
                    <td class="py-3 px-4">${doctor.total_attended}</td>
                    <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${doctor.currently_waiting}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

async function loadStaffAssignments() {
    try {
        const [recepResponse, docResponse] = await Promise.all([
            fetch(`${API_URL}/admin/receptionists`),
            fetch(`${API_URL}/admin/statistics`)
        ]);
        const recepData = await recepResponse.json();
        const docData = await docResponse.json();
        allReceptionists = recepData.receptionists || [];
        allDoctors = docData.doctor_performance || [];
        displayStaff(allReceptionists, allDoctors);
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

function displayStaff(receptionists, doctors) {
    const recepTable = document.getElementById('staff-receptionists');
    const docTable = document.getElementById('staff-doctors');

    if (recepTable) {
        recepTable.innerHTML = receptionists.map(recep => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${recep.name}</td>
                <td class="py-3 px-4">${recep.username}</td>
                <td class="py-3 px-4">${recep.email}</td>
                <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${recep.clinic_name}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No receptionists found</td></tr>';
    }

    if (docTable) {
        docTable.innerHTML = doctors.map(doc => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium">${doc.name}</td>
                <td class="py-3 px-4">${doc.username}</td>
                <td class="py-3 px-4">${doc.email}</td>
                <td class="py-3 px-4"><span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">${doc.clinic_name}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No doctors found</td></tr>';
    }
}

function searchStaff() {
    const qEl = document.getElementById('staff-search');
    const query = qEl ? qEl.value.toLowerCase() : '';

    const filteredReceptionists = allReceptionists.filter(r => (
        (r.name || '').toLowerCase().includes(query) ||
        (r.username || '').toLowerCase().includes(query) ||
        (r.clinic_name || '').toLowerCase().includes(query)
    ));
    const filteredDoctors = allDoctors.filter(d => (
        (d.name || '').toLowerCase().includes(query) ||
        (d.username || '').toLowerCase().includes(query) ||
        (d.clinic_name || '').toLowerCase().includes(query)
    ));
    displayStaff(filteredReceptionists, filteredDoctors);
}

async function loadAdminNotifications() {
    try {
        const response = await fetch(`${API_URL}/admin/notifications`);
        const data = await response.json();
        const container = document.getElementById('admin-notifications');
        if (!container) return;

        if (!data || data.count === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = data.notifications.map(notif => `
            <div class="bg-red-50 border-l-4 border-primary rounded-lg p-4 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3">
                        <svg class="w-6 h-6 text-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <div>
                            <h4 class="font-semibold text-gray-800">${notif.message}</h4>
                            <p class="text-sm text-gray-600 mt-1">Please transfer a doctor to this clinic or approve a new doctor.</p>
                        </div>
                    </div>
                    <button onclick="markNotificationRead('${notif.id}')" class="text-primary hover:text-primary-dark text-sm font-medium">Dismiss</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`${API_URL}/admin/mark-notification-read/${notificationId}`, { method: 'PUT' });
        loadAdminNotifications().catch(() => {});
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function loadAdminClinicsDropdown() {
    try {
        const response = await fetch(`${API_URL}/clinics`);
        const data = await response.json();
        const selects = [
            document.getElementById('admin-doctor-clinic'),
            document.getElementById('admin-recep-clinic'),
            document.getElementById('admin-transfer-clinic')
        ];
        selects.forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="">Select clinic...</option>';
            (data.clinics || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id || '';
                opt.textContent = c.name || c.location || 'Clinic';
                sel.appendChild(opt);
            });
        });
    } catch (error) {
        console.error('Error loading clinics dropdown:', error);
    }
}

async function loadAdminDoctorsDropdown() {
    try {
        const response = await fetch(`${API_URL}/admin/statistics`);
        const data = await response.json();
        const sel = document.getElementById('admin-transfer-doctor');
        if (!sel) return;
        sel.innerHTML = '<option value="">Select doctor...</option>';
        (data.doctor_performance || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.doctor_id;
            opt.textContent = d.name || d.username || 'Doctor';
            sel.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading doctors dropdown:', error);
    }
}

async function createClinic() {
    const name = document.getElementById('admin-clinic-name')?.value.trim() || '';
    const location = document.getElementById('admin-clinic-location')?.value.trim() || '';
    if (!name || !location) { showPopUp('Missing Fields', 'Please fill all clinic fields', 'error'); return; }
    try {
        const res = await fetch(`${API_URL}/admin/create-clinic`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, location}) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Clinic Created', 'The clinic has been created successfully', 'success'); loadAdminClinicsDropdown().catch(() => {}); 
            const acn = document.getElementById('admin-clinic-name'); if (acn) acn.value = '';
            const acl = document.getElementById('admin-clinic-location'); if (acl) acl.value = '';
        } else showPopUp('Creation Failed', data.detail || 'Could not create clinic', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create clinic', 'error'); }
}

async function createReceptionist() {
    const name = document.getElementById('admin-recep-name')?.value.trim() || '';
    const username = document.getElementById('admin-recep-username')?.value.trim() || '';
    const email = document.getElementById('admin-recep-email')?.value.trim() || '';
    const password = document.getElementById('admin-recep-password')?.value || '';
    const contact = document.getElementById('admin-recep-contact')?.value.trim() || '';
    const clinic_id = document.getElementById('admin-recep-clinic')?.value || '';

    if (!name || !username || !email || !password || !contact || !clinic_id) { showPopUp('Missing Fields', 'Please fill all receptionist fields', 'error'); return; }
    if (!validateEmail(email)) { showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }
    if (!validatePhone(contact)) { showPopUp('Invalid Phone', 'Contact must be in +92XXXXXXXXXX format', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-receptionist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, contact, clinic_id }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Receptionist Created', 'Account created successfully', 'success'); loadStaffAssignments().catch(() => {}); 
            document.getElementById('admin-recep-name').value = '';
            document.getElementById('admin-recep-username').value = '';
            document.getElementById('admin-recep-email').value = '';
            document.getElementById('admin-recep-password').value = '';
            document.getElementById('admin-recep-contact').value = '';
            document.getElementById('admin-recep-clinic').value = '';
        } else showPopUp('Creation Failed', data.detail || 'Could not create receptionist', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create receptionist', 'error'); }
}

async function createDoctor() {
    const name = document.getElementById('admin-doctor-name')?.value.trim() || '';
    const username = document.getElementById('admin-doctor-username')?.value.trim() || '';
    const email = document.getElementById('admin-doctor-email')?.value.trim() || '';
    const password = document.getElementById('admin-doctor-password')?.value || '';
    const license = document.getElementById('admin-doctor-license')?.value.trim() || '';
    const contact = document.getElementById('admin-doctor-contact')?.value.trim() || '';
    const clinic_id = document.getElementById('admin-doctor-clinic')?.value || '';
    const startTime = document.getElementById('admin-doctor-start-time')?.value || '';
    const endTime = document.getElementById('admin-doctor-end-time')?.value || '';

    if (!name || !username || !email || !password || !license || !contact || !clinic_id) { 
        showPopUp('Missing Fields', 'Please fill all doctor fields', 'error'); return; 
    }
    if (!validateEmail(email)) { showPopUp('Invalid Email', 'Please provide a valid email', 'error'); return; }
    if (!validatePhone(contact)) { showPopUp('Invalid Phone', 'Contact must be in +92XXXXXXXXXX format', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/create-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, email, password, license_number: license, contact, clinic_id }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Doctor Created', 'Account created successfully', 'success'); loadStaffAssignments().catch(() => {}); 
            document.getElementById('admin-doctor-name').value = '';
            document.getElementById('admin-doctor-username').value = '';
            document.getElementById('admin-doctor-email').value = '';
            document.getElementById('admin-doctor-password').value = '';
            document.getElementById('admin-doctor-license').value = '';
            document.getElementById('admin-doctor-contact').value = '';
            document.getElementById('admin-doctor-clinic').value = '';
        } else showPopUp('Creation Failed', data.detail || 'Could not create doctor', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to create doctor', 'error'); }
}

async function updateDoctorAvailability() {
    const doctorId = document.getElementById('edit-doctor-id').value;
    const startTime = document.getElementById('edit-doctor-start-time').value;
    const endTime = document.getElementById('edit-doctor-end-time').value;

    if (!doctorId || !startTime || !endTime) {
        showPopUp("Missing Fields", "Please fill all fields", "error"); return;
    }

    const res = await fetch(`/api/admin/update-availability/${doctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime })
    });
    const data = await res.json();
    if (!data.success) {
        showPopUp("Update Failed", data.detail || "Doctor not found", "error");
    } else {
        showPopUp("Availability Updated", "Doctor's availability updated", "success");
    }
    document.getElementById('edit-doctor-id').value = '';
    document.getElementById('edit-doctor-start-time').value = '';
    document.getElementById('edit-doctor-end-time').value = '';
}

async function transferDoctor() {
    const doctorId = document.getElementById('admin-transfer-doctor')?.value || '';
    const clinicId = document.getElementById('admin-transfer-clinic')?.value || '';
    if (!doctorId || !clinicId) { showPopUp('Missing Fields', 'Select doctor and new clinic', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/transfer-doctor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctor_id: doctorId, new_clinic_id: clinicId }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Doctor Transferred', 'Doctor transfer successful', 'success'); 
            loadStaffAssignments().catch(() => {}); 
        } else showPopUp('Transfer Failed', data.detail || 'Could not transfer doctor', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to transfer doctor', 'error'); }
}

async function postBulletin() {
    const title = document.getElementById('admin-bulletin-title')?.value.trim() || '';
    const message = document.getElementById('admin-bulletin-message')?.value.trim() || '';
    if (!title || !message) { showPopUp('Missing Fields', 'Please provide title and message', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/admin/post-bulletin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message }) });
        const data = await res.json();
        if (data.success) { 
            showPopUp('Bulletin Posted', 'Bulletin published successfully', 'success'); 
            loadBulletins().catch(() => {}); 
            document.getElementById('admin-bulletin-title').value = '';
            document.getElementById('admin-bulletin-message').value = '';
        } else showPopUp('Post Failed', data.detail || 'Could not post bulletin', 'error');
    } catch (err) { showPopUp('Error', err.message || 'Failed to post bulletin', 'error'); }
}

// Initial load for the admin portal
document.addEventListener('DOMContentLoaded', () => {
    // Ensure this runs *after* shared.js has run checkAuth()
    if (currentUser && currentUser.role === 'admin') {
        loadAdminDashboard().catch(() => {});
        loadAdminNotifications().catch(() => {});
    }
});