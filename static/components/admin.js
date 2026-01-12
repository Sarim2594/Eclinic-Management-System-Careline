// Complete admin.js with all fixes

import { getUser } from '../user_state.js';

let currentUser = null;
let isRequestingPasswordChange = false;

// Small inline SVG helper to avoid relying on external icon fonts/CDNs
function svgIcon(name, extraClasses = '') {
    const base = `class="${extraClasses} inline-block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
        case 'chart-line':
            return `<svg ${base}><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H17"></path><polyline points="6 12 4 14 2 12"></polyline></svg>`;
        case 'users':
            return `<svg ${base}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
        case 'stethoscope':
            return `<svg ${base}><path d="M11 4a4 4 0 0 0-4 4v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a4 4 0 0 0-4-4"></path><circle cx="18" cy="14" r="2"></circle></svg>`;
        case 'message-square':
            return `<svg ${base}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        default:
            return `<svg ${base}><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
}

export function setCurrentUser(data) {
    currentUser = data;
}

export function getCurrentUser() {
    return currentUser;
}

// Render regions as compact badges with a "+N more" toggle when there are many
function renderAdminRegions(regions, containerId = 'admin-regions-list', maxVisible = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Group sub-regions by province
    const byProvince = {};
    regions.forEach(r => {
        const prov = r.province || (r.full_name ? r.full_name.split('>')[0].trim() : 'Unknown');
        const sub = r.sub_region || (r.full_name ? r.full_name.split('>')[1]?.trim() : '');
        if (!byProvince[prov]) byProvince[prov] = new Set();
        if (sub) byProvince[prov].add(sub);
    });

    const entries = Object.entries(byProvince).map(([prov, subsSet]) => {
        const subs = Array.from(subsSet);
        const text = subs.length ? `${prov} > ${subs.join(', ')}` : prov;
        return { prov, text };
    });

    const visible = entries.slice(0, maxVisible);
    const hidden = entries.slice(maxVisible);

    visible.forEach(e => {
        const span = document.createElement('span');
        span.className = 'px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium';
        span.textContent = e.text;
        span.title = e.text;
        container.appendChild(span);
    });

    if (hidden.length > 0) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium';
        moreBtn.type = 'button';
        moreBtn.textContent = `+${hidden.length} more`;
        moreBtn.onclick = () => {
            container.innerHTML = '';
            entries.forEach(e => {
                const s = document.createElement('span');
                s.className = 'px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium';
                s.textContent = e.text;
                s.title = e.text;
                container.appendChild(s);
            });
            const less = document.createElement('button');
            less.className = 'px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium';
            less.type = 'button';
            less.textContent = 'Show less';
            less.onclick = () => renderAdminRegions(regions, containerId, maxVisible);
            container.appendChild(less);
        };
        container.appendChild(moreBtn);
    }
}

// Updated showAdminTab with city loading
export function showAdminTab(tab) {
    ['dashboard', 'staff-management', 'doctors', 'communications'].forEach(t => {
        const btn = document.getElementById(`admin-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 ${t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'} whitespace-nowrap`;
            
            if (t === tab && t === 'dashboard') {
                loadAdminDashboard().catch(() => {});
            }
            else if (t === tab && t === 'doctors') {
                showDoctorSubTab('available');
            }
            else if (t === tab && t === 'staff-management') {
                showStaffManagementSubTab('assignments');
            }
        }
    });

    document.getElementById('admin-dashboard-tab').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('admin-staff-management-tab').classList.toggle('hidden', tab !== 'staff-management');
    document.getElementById('admin-doctors-tab').classList.toggle('hidden', tab !== 'doctors');
    document.getElementById('admin-communications-tab').classList.toggle('hidden', tab !== 'communications');

    if (tab === 'staff-management') loadStaffAssignments().catch(() => {});
    if (tab === 'staff-management') {
        // Preload doctor specializations and clinics so the Add Doctor form shows immediately
        loadDoctorSpecializations().catch(() => {});
        loadClinicsForDoctor().catch(() => {});
    }
    if (tab === 'dashboard') {
        // Ensure cities dropdown is loaded for clinic creation
        loadCitiesDropdownForAdmin().catch(() => {});
    }
}

// Load cities dropdown for clinic creation
async function loadCitiesDropdownForAdmin() {
    try {
        const select = document.getElementById('admin-clinic-city');
        if (!select) return;

        select.innerHTML = '<option value="">Loading cities...</option>';

        const adminIdParam = currentUser && currentUser.admin_id ? `&admin_id=${currentUser.admin_id}` : '';
        const response = await fetch(`/api/admin/cities?${adminIdParam}`);
        const data = await response.json();

        select.innerHTML = '<option value="">Select a city...</option>';

        if (data && data.grouped) {
            for (const [province, subRegions] of Object.entries(data.grouped)) {
                for (const [subRegion, cities] of Object.entries(subRegions)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = `${province} > ${subRegion}`;

                    cities.forEach(city => {
                        const option = document.createElement('option');
                        option.value = city.id;
                        option.textContent = city.name;
                        optgroup.appendChild(option);
                    });

                    select.appendChild(optgroup);
                }
            }
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        const select = document.getElementById('admin-clinic-city');
        if (select) {
            select.innerHTML = '<option value="">Error loading cities</option>';
        }
    }
}

// Load dashboard with company filter
export async function loadAdminDashboard() {
    try {
        if (!currentUser || !currentUser.company_id) {
            console.error('Company ID not found');
            return;
        }

        const adminId = currentUser.admin_id ? `&admin_id=${currentUser.admin_id}` : '';
        const response = await fetch(`/api/admin/statistics?company_id=${currentUser.company_id}${adminId}`);
        const data = await response.json();

        document.getElementById('admin-stat-clinics').textContent = (data && data.overview && data.overview.total_clinics) || '-';
        document.getElementById('admin-stat-doctors').textContent = (data && data.overview && data.overview.total_doctors) || '-';
        document.getElementById('admin-stat-patients').textContent = (data && data.overview && data.overview.total_patients) || '-';
        document.getElementById('admin-stat-queue').textContent = (data && data.overview && data.overview.active_appointments) || '-';

        // Display admin's regions if available
        const regionsDiv = document.getElementById('admin-regions-display');
        if (regionsDiv && data.regions && data.regions.length > 0) {
            regionsDiv.classList.remove('hidden');
            renderAdminRegions(data.regions);
        } else if (regionsDiv) {
            regionsDiv.classList.add('hidden');
        }

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
                    <td class="py-3 px-4"><span class="px-3 py-1 ${doctor.missed_shifts_count > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} rounded-full text-sm font-semibold">${doctor.missed_shifts_count || 0}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

let allReceptionists = [];
let allDoctors = [];

// Load staff assignments filtered by company
export async function loadStaffAssignments() {
    try {
        if (!currentUser || !currentUser.company_id) {
            console.error('Company ID not found');
            return;
        }

        const adminId = currentUser.admin_id ? `&admin_id=${currentUser.admin_id}` : '';
        const [recepResponse, docResponse] = await Promise.all([
            fetch(`/api/admin/receptionists?company_id=${currentUser.company_id}${adminId}`),
            fetch(`/api/admin/doctors?company_id=${currentUser.company_id}${adminId}`)
        ]);

        const recepData = await recepResponse.json();
        const docData = await docResponse.json();

        allReceptionists = recepData.receptionists || [];
        allDoctors = docData.doctors || [];

        // Populate specialization filter for staff management
        try {
            const specSelect = document.getElementById('staff-doctor-specialization-filter');
            if (specSelect) {
                specSelect.innerHTML = '<option value="">All specializations</option>';
                const resp = await fetch('/api/admin/specializations');
                if (resp.ok) {
                    const d = await resp.json();
                    (d.specializations || []).forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.textContent = s.name;
                        specSelect.appendChild(opt);
                    });
                }
                specSelect.onchange = () => searchStaff();
            }
        } catch (e) { console.warn('Could not load specialization filter', e); }

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
                <td class="py-3 px-4">
                    <button type="button" onclick="viewDoctorSchedule(${doc.doctor_id}, '${encodeURIComponent(doc.name || '')}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">View Schedule</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No doctors found</td></tr>';
    }
}

// Fetch and display a doctor's weekly schedule in the popup modal
window.viewDoctorSchedule = async function(doctorId, encodedName) {
    const name = decodeURIComponent(encodedName || '');
    try {
        const resp = await fetch(`/api/admin/doctor-schedule?doctor_id=${doctorId}`);
        if (!resp.ok) {
            const txt = await resp.text();
            return showPopUp('Error', `Failed to load schedule: ${txt}`, 'error');
        }
        const data = await resp.json();
        const schedule = (data && data.schedule) || [];

        if (!schedule.length) {
            return showPopUp(`${name} — Schedule`, 'No schedule found for this doctor', 'info');
        }

        // Build an HTML table for the schedule
        const rows = schedule.map(s => {
            const start = s.start_time || '-';
            const end = s.end_time || '-';
            const status = s.is_active ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span>' : '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Inactive</span>';
            return `<tr class="border-b"><td class="py-2 px-3">${s.day_name}</td><td class="py-2 px-3">${start}</td><td class="py-2 px-3">${end}</td><td class="py-2 px-3">${status}</td></tr>`;
        }).join('');

        const table = `
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b-2">
                            <th class="py-2 px-3">Day</th>
                            <th class="py-2 px-3">Start</th>
                            <th class="py-2 px-3">End</th>
                            <th class="py-2 px-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        showPopUp(`${name} — Schedule`, table, 'info', true);
    } catch (err) {
        console.error('Error fetching doctor schedule', err);
        showPopUp('Error', 'Network error while loading schedule', 'error');
    }
}

export function searchStaff() {
    const qEl = document.getElementById('staff-search');
    const query = qEl ? qEl.value.toLowerCase() : '';
    const specEl = document.getElementById('staff-doctor-specialization-filter');
    const specFilter = specEl && specEl.value ? specEl.value : '';

    const filteredReceptionists = allReceptionists.filter(r => (
        (r.name || '').toLowerCase().includes(query) ||
        (r.username || '').toLowerCase().includes(query) ||
        (r.clinic_name || '').toLowerCase().includes(query)
    ));

    const filteredDoctors = allDoctors.filter(d => (
        ((d.name || '').toLowerCase().includes(query) ||
        (d.username || '').toLowerCase().includes(query) ||
        (d.clinic_name || '').toLowerCase().includes(query))
        && (specFilter === '' || (d.specialization_id && d.specialization_id.toString() === specFilter))
    ));

    // Render with both filters applied

    displayStaff(filteredReceptionists, filteredDoctors);
}

export async function searchAvailableDoctors() {
    const docTable = document.getElementById('available-doctors');
    if (!docTable) return;
    const response = await fetch(`/api/admin/available-doctors`);
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

export async function loadUnavailableDoctors() {
    const docTable = document.getElementById('unavailable-doctors');
    if (!docTable) return;
    try {
        const adminData = getUser();
        const adminId = adminData && adminData.admin_id ? `?admin_id=${adminData.admin_id}` : '';
        
        const response = await fetch(`/api/admin/unavailable-doctors${adminId}`);
        const data = await response.json();
        docTable.innerHTML = (data.unavailable_doctors || []).map(doc => {
            // availability_schedules returns start_time/end_time (TIME); display as-is
            const startTime = doc.start_time || '-';
            const endTime = doc.end_time || '-';
            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${doc.name}</td>
                    <td class="py-3 px-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${doc.clinic_name}</span></td>
                    <td class="py-3 px-4">${startTime}</td>
                    <td class="py-3 px-4">${endTime}</td>
                    <td class="py-3 px-4 text-sm">${doc.reason || 'N/A'}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No unavailable doctors at the moment</td></tr>';
    } catch (error) {
        console.error('Error loading unavailable doctors:', error);
        docTable.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading data</td></tr>';
    }
}

async function monitorDoctors() {
    try {
        const response = await fetch(`/api/admin/monitor-doctors`);
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
    }, 60000);
}

export function stopAvailableDoctorsPolling() {
    if (AvailableDoctorsInterval) {
        clearInterval(AvailableDoctorsInterval);
        AvailableDoctorsInterval = null;
    }
}

export async function loadAdminClinicsDropdown() {
    try {
        if (!currentUser || !currentUser.company_id) {
            console.error('Company ID not found');
            return;
        }

        const adminIdParam = currentUser && currentUser.admin_id ? `&admin_id=${currentUser.admin_id}` : '';
        const response = await fetch(`/api/clinics?company_id=${currentUser.company_id}${adminIdParam}`);
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
        if (!currentUser || !currentUser.company_id) {
            console.error('Company ID not found');
            return;
        }

        const response = await fetch(`/api/admin/doctors?company_id=${currentUser.company_id}`);
        const data = await response.json();
        const sel = document.getElementById('admin-transfer-doctor');
        if (!sel) return;
        sel.innerHTML = '<option value="">Select doctor...</option>';
        (data.doctors || []).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.doctor_id;
            opt.textContent = d.name || d.username || 'Doctor';
            sel.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading doctors dropdown:', error);
    }
}

// Request change functions with proper API calls
window.requestPasswordChange = async function() {
    // Prevent duplicate submissions
    if (isRequestingPasswordChange) return;

    const submitBtn = document.getElementById('request-password-submit');
    const newPassword = document.getElementById('request-new-password').value.trim();
    const reason = document.getElementById('request-password-reason').value.trim();

    if (!newPassword || !reason) {
        showPopUp('Missing Fields', 'Please provide both new password and reason', 'error');
        return;
    }

    if (!currentUser || !currentUser.admin_id) {
        showPopUp('Error', 'Admin information not found', 'error');
        return;
    }

    try {
        isRequestingPasswordChange = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
        }

        const response = await fetch('/api/admin/request-password-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: currentUser.admin_id,
                new_password: newPassword,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            showPopUp('Request Submitted', 'Your password change request has been sent to SuperAdmin', 'success');
            document.getElementById('request-new-password').value = '';
            document.getElementById('request-password-reason').value = '';
        } else {
            showPopUp('Request Failed', data.detail || 'Failed to submit request', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Failed to submit request: ' + (error && error.message ? error.message : error), 'error');
    } finally {
        isRequestingPasswordChange = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
}

window.requestContactChange = async function() {
    const newContact = document.getElementById('request-new-contact').value.trim();
    const reason = document.getElementById('request-contact-reason').value.trim();

    if (!newContact || newContact === '+92 ' || !reason) {
        showPopUp('Missing Fields', 'Please provide both new contact and reason', 'error');
        return;
    }

    if (!currentUser || !currentUser.admin_id) {
        showPopUp('Error', 'Admin information not found', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/request-contact-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: currentUser.admin_id,
                new_contact: newContact,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            showPopUp('Request Submitted', 'Your contact change request has been sent to SuperAdmin', 'success');
            document.getElementById('request-new-contact').value = '+92 ';
            document.getElementById('request-contact-reason').value = '';
        } else {
            showPopUp('Request Failed', data.detail || 'Failed to submit request', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Failed to submit request: ' + error.message, 'error');
    }
}

window.openRegionsChangeRequest = function() {
    showPopUp('Feature Coming Soon', 'Region change requests will be available in a future update', 'info');
}

// ============================================================================
// UNAVAILABILITY REQUESTS MANAGEMENT
// ============================================================================

export async function loadAdminUnavailabilityRequests() {
    const container = document.getElementById('admin-unavailability-requests-list');
    if (!container) return;

    // show loading placeholder first
    container.innerHTML = '<p class="text-center py-8">Loading requests...</p>';

    const adminData = getUser();
    
    if (!adminData || !adminData.admin_id) {
        // no admin id available — clear loading and show friendly message
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No pending unavailability requests</p>';
        console.error('Admin ID not found in user data');
        return;
    }

    try {
        const response = await fetch(`/api/admin/doctor-unavailability-requests?admin_id=${adminData.admin_id}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Unknown error'}`);
        }

        const data = await response.json();

        if (!data.requests || data.requests.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No pending unavailability requests</p>';
            return;
        }

        container.innerHTML = data.requests.map(req => {
            const startDate = new Date(req.start_datetime).toLocaleString();
            const endDate = new Date(req.end_datetime).toLocaleString();

            return `
                <div class="border border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-semibold">Doctor</p>
                            <p class="text-lg font-semibold text-gray-800">${req.doctor_name}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-semibold">Status</p>
                            <span class="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                ⏳ Pending
                            </span>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase font-semibold">Requested On</p>
                            <p class="text-sm text-gray-700">${new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="bg-white rounded p-3 mb-4 border border-gray-200">
                        <p class="text-sm text-gray-600"><strong>From:</strong> ${startDate}</p>
                        <p class="text-sm text-gray-600"><strong>To:</strong> ${endDate}</p>
                        ${req.reason ? `<p class="text-sm text-gray-600 mt-2"><strong>Reason:</strong> ${req.reason}</p>` : ''}
                    </div>

                    <div class="flex gap-3">
                        <button onclick="approveUnavailabilityRequest(${req.id}, '${req.doctor_name}')" 
                            class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                            <i class="fas fa-check mr-2"></i> Approve
                        </button>
                        <button onclick="rejectUnavailabilityRequest(${req.id}, '${req.doctor_name}')" 
                            class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                            <i class="fas fa-times mr-2"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading unavailability requests:', error);
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error: ' + error.message + '</p>';
    }
}

export async function approveUnavailabilityRequest(requestId, doctorName) {
    const adminData = getUser();
    if (!adminData || !adminData.admin_id) {
        console.error('Admin ID not found in user data');
        showPopUp('Error', 'Admin ID not found', 'error');
        return;
    }

    try {
        const url = `/api/admin/unavailability-request/${requestId}/approve?admin_id=${adminData.admin_id}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('Approve error:', error);
            showPopUp('Error', error.detail || 'Failed to approve request', 'error');
            return;
        }

        const data = await response.json();
        if (data.success) {
            showPopUp('Success', `Approved ${doctorName}'s unavailability request`, 'success');
            await loadAdminUnavailabilityRequests();
        } else {
            showPopUp('Error', data.detail || 'Failed to approve request', 'error');
        }

    } catch (error) {
        console.error('Error approving request:', error);
        showPopUp('Error', 'Network error occurred: ' + error.message, 'error');
    }
}

export async function rejectUnavailabilityRequest(requestId, doctorName) {
    const adminData = getUser();
    if (!adminData || !adminData.admin_id) {
        console.error('Admin ID not found in user data');
        showPopUp('Error', 'Admin ID not found', 'error');
        return;
    }

    try {
        // Use default reason since backend requires it
        const defaultReason = 'Request rejected by admin';
        const url = `/api/admin/unavailability-request/${requestId}/reject?admin_id=${adminData.admin_id}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: defaultReason })
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('Reject error:', error);
            showPopUp('Error', error.detail || 'Failed to reject request', 'error');
            return;
        }

        const data = await response.json();
        if (data.success) {
            showPopUp('Success', `Rejected ${doctorName}'s unavailability request`, 'success');
            await loadAdminUnavailabilityRequests();
        } else {
            showPopUp('Error', data.detail || 'Failed to reject request', 'error');
        }

    } catch (error) {
        console.error('Error rejecting request:', error);
        showPopUp('Error', 'Network error occurred: ' + error.message, 'error');
    }
}

// ============================================================================
// SUB-TAB NAVIGATION FOR CONSOLIDATED TABS
// ============================================================================

export async function showStaffManagementSubTab(subTab) {
    ['assignments', 'clinic', 'receptionist', 'doctor'].forEach(t => {
        const btn = document.getElementById(`staff-management-subtab-${t}`);
        if (btn) {
            btn.className = `px-4 py-2 rounded-lg font-medium ${t === subTab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`;
        }
        const content = document.getElementById(`staff-management-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== subTab);
        }
    });

    if (subTab === 'clinic') loadCitiesDropdownForAdmin().catch(() => {});
    if (subTab === 'receptionist') loadClinicsForReceptionist().catch(() => {});
    if (subTab === 'doctor') {
        loadClinicsForDoctor().catch(() => {});
        loadDoctorSpecializations().catch(() => {});
    }
}

export async function showDoctorSubTab(subTab) {
    ['available', 'unavailable', 'transfer', 'unavailability'].forEach(t => {
        const btn = document.getElementById(`doctor-subtab-${t}`);
        if (btn) {
            btn.className = `px-4 py-2 rounded-lg font-medium ${t === subTab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`;
        }
        const content = document.getElementById(`doctor-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== subTab);
        }
    });

    if (subTab === 'available') searchAvailableDoctors().catch(() => {});
    if (subTab === 'unavailable') loadUnavailableDoctors().catch(() => {});
    if (subTab === 'transfer') loadAdminDoctorsDropdown().catch(() => {});
    if (subTab === 'unavailability') loadAdminUnavailabilityRequests().catch(() => {});
    if (subTab === 'doctor') loadDoctorSpecializations().catch(() => {});
}

// Populate specialization dropdown for doctor creation
async function loadDoctorSpecializations() {
    try {
        const select = document.getElementById('admin-doctor-specialization');
        if (!select) return;
        select.innerHTML = '<option value="">Loading specializations...</option>';
        const response = await fetch('/api/admin/specializations');
        if (!response.ok) {
            console.error('Failed to load specializations', response.status);
            select.innerHTML = '<option value="">Error loading specializations</option>';
            return;
        }
        const data = await response.json();
        select.innerHTML = '<option value="">Select specialization...</option>';
        (data.specializations || []).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error loading specializations:', error);
    }
}

// Communications tab sub-tabs
export function showCommunicationsSubTab(subTab) {
    ['bulletin', 'password', 'contact', 'query'].forEach(t => {
        const btn = document.getElementById(`communications-subtab-${t}`);
        if (btn) {
            btn.className = `px-4 py-2 rounded-lg font-medium ${t === subTab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`;
        }
        const content = document.getElementById(`communications-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== subTab);
        }
    });
}

// Load clinics for receptionist dropdown
async function loadClinicsForReceptionist() {
    try {
        const adminData = currentUser || getUser() || {};
        const params = [];
        if (adminData.company_id) params.push(`company_id=${adminData.company_id}`);
        if (adminData.admin_id) params.push(`admin_id=${adminData.admin_id}`);
        const q = params.length ? `?${params.join('&')}` : '';
        const response = await fetch('/api/clinics' + q);
        const data = await response.json();
        const select = document.getElementById('admin-recep-clinic');
        if (!select) return;
        select.innerHTML = '<option value="">Select clinic...</option>';
        (data.clinics || []).forEach(clinic => {
            const option = document.createElement('option');
            option.value = clinic.id;
            option.textContent = clinic.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clinics for receptionist:', error);
    }
}

// Load clinics for doctor dropdown
async function loadClinicsForDoctor() {
    try {
        const adminData = currentUser || getUser() || {};
        const params = [];
        if (adminData.company_id) params.push(`company_id=${adminData.company_id}`);
        if (adminData.admin_id) params.push(`admin_id=${adminData.admin_id}`);
        const q = params.length ? `?${params.join('&')}` : '';
        const response = await fetch('/api/clinics' + q);
        const data = await response.json();
        const select = document.getElementById('admin-doctor-clinic');
        if (!select) return;
        select.innerHTML = '<option value="">Select clinic...</option>';
        (data.clinics || []).forEach(clinic => {
            const option = document.createElement('option');
            option.value = clinic.id;
            option.textContent = clinic.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clinics for doctor:', error);
    }
}

window.submitGeneralQuery = async function() {
    const query = document.getElementById('request-general-query').value.trim();

    if (!query) {
        showPopUp('Missing Content', 'Please enter your query or message', 'error');
        return;
    }

    if (!currentUser || !currentUser.admin_id) {
        showPopUp('Error', 'Admin information not found', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/request-general-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: currentUser.admin_id,
                query: query
            })
        });

        const data = await response.json();

        if (data.success) {
            showPopUp('Query Submitted', 'Your query has been sent to SuperAdmin', 'success');
            document.getElementById('request-general-query').value = '';
        } else {
            showPopUp('Request Failed', data.detail || 'Failed to submit query', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Failed to submit query: ' + (error && error.message ? error.message : error), 'error');
    }
}

