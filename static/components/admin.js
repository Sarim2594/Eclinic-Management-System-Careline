export function showAdminTab(tab) {
    ['dashboard', 'staff', 'clinic', 'receptionist', 'doctor', 'available-doctors', 'transfer', 'bulletin'].forEach(t => {
        const btn = document.getElementById(`admin-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 ${t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'} whitespace-nowrap`;
            if (t === tab && t === 'dashboard') {
                loadAdminDashboard().catch(() => {});
            }
            else if (t === tab && t === 'available-doctors') {
                searchAvailableDoctors().catch(() => {});
            }
        }
    });

    document.getElementById('admin-dashboard-tab').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('admin-staff-tab').classList.toggle('hidden', tab !== 'staff');
    document.getElementById('admin-clinic-tab').classList.toggle('hidden', tab !== 'clinic');
    document.getElementById('admin-receptionist-tab').classList.toggle('hidden', tab !== 'receptionist');
    document.getElementById('admin-doctor-tab').classList.toggle('hidden', tab !== 'doctor');
    document.getElementById('admin-available-doctors-tab').classList.toggle('hidden', tab !== 'available-doctors');
    document.getElementById('admin-transfer-tab').classList.toggle('hidden', tab !== 'transfer');
    document.getElementById('admin-bulletin-tab').classList.toggle('hidden', tab !== 'bulletin');

    if (['receptionist', 'doctor', 'transfer'].includes(tab)) {
        loadAdminClinicsDropdown().catch(() => {});
        if (tab === 'transfer') loadAdminDoctorsDropdown().catch(() => {});
    }

    if (tab === 'staff') loadStaffAssignments().catch(() => {});
}

export async function loadAdminDashboard() {
    try {
        const response = await fetch(`http://localhost:8000/api/admin/statistics`);
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

let allReceptionists = [];
let allDoctors = [];

export async function loadStaffAssignments() {
    try {
        const [recepResponse, docResponse] = await Promise.all([
            fetch(`http://localhost:8000/api/admin/receptionists`),
            fetch(`http://localhost:8000/api/admin/statistics`)
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

export function searchStaff() {
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

export async function searchAvailableDoctors() {
    const docTable = document.getElementById('available-doctors');
    if (!docTable) return;
    const response = await fetch(`http://localhost:8000/api/admin/available-doctors`);
    const data = await response.json();
    docTable.innerHTML = (data.available_doctors || []).map(doc => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 font-medium">${doc.name}</td>
            <td class="py-3 px-4 font-medium">${doc.end_time}</td>
            <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${doc.current_queue ? doc.current_queue : '-'}</span></td>
            <td class="py-3 px-4"><span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">${doc.clinic_name}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No available doctors found</td></tr>';
}

async function monitorDoctors() {
    try {
        const response = await fetch(`http://localhost:8000/api/admin/monitor-doctors`);
        const data = await response.json();
        if (data.success) {return;}
    } catch (error) {
        console.error('Error monitoring unavailable doctors:', error);
    }
}

let AvailableDoctorsInterval = null;

export function startAvailableDoctorsPolling() {
    if (AvailableDoctorsInterval) {
        clearInterval(AvailableDoctorsInterval);
    }
    AvailableDoctorsInterval = setInterval(() => {
        searchAvailableDoctors();
        monitorDoctors();
    }, 300000);
}

export function stopAvailableDoctorsPolling() {
    if (AvailableDoctorsInterval) {
        clearInterval(AvailableDoctorsInterval);
        AvailableDoctorsInterval = null;
    }
}

export async function loadAdminClinicsDropdown() {
    try {
        const response = await fetch(`http://localhost:8000/api/clinics`);
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
        const response = await fetch(`http://localhost:8000/api/admin/statistics`);
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