import * as popup from '../popup_modal.js';
import * as bulletins from '../bulletins.js';
import { getUser } from '../user_state.js';

// Small inline SVG helper to avoid relying on external icon fonts/CDNs
function svgIcon(name, extraClasses = '') {
    const base = `class="${extraClasses} inline-block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
        case 'eye':
            return `<svg ${base}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        case 'trash':
            return `<svg ${base}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`;
        case 'map':
        case 'map-marked-alt':
            return `<svg ${base}><path d="M20.5 3.5l-5.5 2.2-6-2.4L3.5 5.5v15l5.5-2.3 6 2.4 5.5-2.2v-15z"></path></svg>`;
        case 'map-marker':
        case 'map-pin':
            return `<svg ${base}><path d="M12 2C8 2 5 5 5 9c0 6 7 13 7 13s7-7 7-13c0-4-3-7-7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>`;
        case 'ban':
            return `<svg ${base}><circle cx="12" cy="12" r="9"></circle><line x1="5" y1="5" x2="19" y2="19"></line></svg>`;
        case 'check':
        case 'check-circle':
            return `<svg ${base}><circle cx="12" cy="12" r="9"></circle><path d="M10 13l2 2 4-4"></path></svg>`;
        case 'envelope':
            return `<svg ${base}><path d="M3 8l9 6 9-6"></path><rect x="3" y="5" width="18" height="14" rx="2"></rect></svg>`;
        case 'phone':
            return `<svg ${base}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12 1.21.38 2.4.78 3.52a2 2 0 0 1-.45 2.11L8.91 11.09a16 16 0 0 0 6 6l1.74-1.74a2 2 0 0 1 2.11-.45c1.12.4 2.31.66 3.52.78A2 2 0 0 1 22 16.92z"></path></svg>`;
        case 'info':
        case 'info-circle':
            return `<svg ${base}><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="12"></line><circle cx="12" cy="16" r="0.5"></circle></svg>`;
        case 'user-shield':
            return `<svg ${base}><path d="M20 21v-7a4 4 0 0 0-3-3.87"></path><path d="M4 21v-7a4 4 0 0 1 3-3.87"></path><path d="M12 3v4"></path></svg>`;
        case 'hospital':
            return `<svg ${base}><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M12 8v8"></path><path d="M9 11h6"></path></svg>`;
        case 'bullhorn':
            return `<svg ${base}><path d="M3 11v2a4 4 0 0 0 4 4h1l7 3V8L8 11H7a4 4 0 0 0-4 0z"></path></svg>`;
        default:
            return `<svg ${base}><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
}
const pakistanRegions = {
    // ... (Your large region data structure remains here)
    "Punjab": {
        "Central Punjab": ["Lahore", "Faisalabad", "Kasur", "Okara", "Sheikhupura", "Nankana Sahib", "Chiniot", "Jhang", "Toba Tek Singh", "Kamoke", "Murīdke", "Raiwind", "Pattoki", "Depalpur", "Gojra", "Samundri", "Shorkot", "Shahkot", "Jaranwala"],
        "Potohar Region": ["Rawalpindi", "Islamabad", "Attock", "Taxila", "Wah Cantonment", "Chakwal", "Talagang", "Jhelum", "Dina", "Gujar Khan", "Murree", "Kotli Sattian", "Kahuta", "Kallar Syedan"],
        "Western Punjab": ["Sargodha", "Mianwali", "Khushab", "Bhakkar", "Kot Adu", "Jauharabad", "Kundian"],
        "Southern Punjab": ["Multan", "Bahawalpur", "Bahawalnagar", "DG Khan", "Muzaffargarh", "Layyah", "Rajanpur", "Rahim Yar Khan", "Sadiqabad", "Khanpur", "Lodhran", "Hasilpur"],
        "Eastern Punjab": ["Gujranwala", "Sialkot", "Gujrat", "Wazirabad", "Daska", "Narowal", "Hafizabad", "Phalia", "Mandi Bahauddin"]
    },
    "Sindh": {
        "Upper Sindh": ["Sukkur", "Larkana", "Khairpur", "Shikarpur", "Jacobabad", "Ghotki", "Kashmore", "Kandhkot", "Rohri"],
        "Lower Sindh": ["Karachi", "Hyderabad", "Thatta", "Mirpur Sakro", "Badin", "Sujawal", "Kotri", "Tando Muhammad Khan", "Tando Allahyar"],
        "Central Sindh": ["Nawabshah", "Sanghar", "Dadu", "Jamshoro", "Matiari", "Shahdadpur", "Sehwan"],
        "Thar Region": ["Mithi", "Tharparkar", "Umerkot", "Mirpur Khas", "Diplo", "Chachro", "Nagarparkar"]
    },
    "Khyber Pakhtunkhwa": {
        "Northern KP": ["Abbottabad", "Mansehra", "Balakot", "Battagram", "Besham", "Alpuri", "Swat", "Mingora", "Kalam", "Malakand", "Dir", "Chitral", "Drosh"],
        "Central KP": ["Peshawar", "Mardan", "Charsadda", "Nowshera", "Swabi", "Takht-i-Bahi"],
        "Southern KP": ["Kohat", "Hangu", "Karak", "Bannu", "Lakki Marwat", "Tank", "Dera Ismail Khan"],
        "Ex-FATA Areas": ["Khyber", "Bara", "Parachinar", "Sadda", "Miramshah", "Miran Shah", "Wana", "Ghalanai", "Khar"]
    },
    "Balochistan": {
        "Central Balochistan": ["Quetta", "Pishin", "Chaman", "Ziarat", "Mastung", "Killa Abdullah", "Huramzai"],
        "Northern Balochistan": ["Zhob", "Loralai", "Killa Saifullah", "Musakhel", "Barkhan", "Sherani"],
        "Eastern Balochistan": ["Sibi", "Dera Bugti", "Kohlu", "Dhadar", "Jaffarabad", "Sohbatpur"],
        "Western Balochistan": ["Chagai", "Nushki", "Dalbandin", "Kharan", "Washuk"],
        "Makran Region": ["Gwadar", "Turbat", "Kech", "Panjgur", "Awaran", "Lasbela", "Hub", "Ormara", "Pasni"]
    }
};

let allCompanies = [];
let allAdmins = [];
let selectedRegionIds = [];
let allRegions = [];

async function loadRegionsFromAPI() {
    try {
        const response = await fetch('/api/superadmin/regions/all');
        const data = await response.json();
        
        if (data.success) {
            allRegions = data.regions;
            return data.grouped;  // Returns {Province: [{id, sub_region}, ...]}
        }
        return {};
    } catch (error) {
        console.error('Error loading regions:', error);
        return {};
    }
}

export function showSuperAdminTab(tabName) {
    const tabs = ['dashboard', 'companies', 'register-company', 'admins', 'create-admin', 'analytics', 'change-requests'];
    
    tabs.forEach(tab => {
        const btn = document.getElementById(`superadmin-tab-${tab}`);
        const content = document.getElementById(`superadmin-${tab}-tab`);
        
        if (btn && content) {
            if (tab === tabName) {
                btn.className = 'px-4 py-3 font-medium border-b-2 border-primary text-primary whitespace-nowrap';
                content.classList.remove('hidden');
            } else {
                btn.className = 'px-4 py-3 font-medium border-b-2 border-transparent text-gray-600 whitespace-nowrap';
                content.classList.add('hidden');
            }
        }
    });

    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'companies') loadAllCompanies();
    if (tabName === 'admins') loadAllAdmins();
    if (tabName === 'create-admin') loadCompaniesForDropdown();
    if (tabName === 'analytics') loadAnalytics();
    if (tabName === 'change-requests') loadChangeRequests();
}

async function loadDashboard() {
    try {
        const response = await fetch('/api/superadmin/dashboard');
        const data = await response.json();

        document.getElementById('superadmin-stat-companies').textContent = data.total_companies || 0;
        document.getElementById('superadmin-stat-admins').textContent = data.total_admins || 0;
        document.getElementById('superadmin-stat-clinics').textContent = data.total_clinics || 0;
        document.getElementById('superadmin-stat-doctors').textContent = data.total_doctors || 0;

        allCompanies = data.companies || [];
        displayCompanyBreakdown(allCompanies);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        popup.showPopUp('Error', 'Failed to load dashboard data', 'error');
    }
}

function displayCompanyBreakdown(companies) {
    const tbody = document.getElementById('superadmin-company-breakdown');
    if (!tbody) return;

    if (companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No companies registered yet</td></tr>';
        return;
    }

    tbody.innerHTML = companies.map(company => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 font-medium text-gray-800">${company.name}</td>
            <td class="py-3 px-4">${company.admin_count || 0}</td>
            <td class="py-3 px-4">${company.clinic_count || 0}</td>
            <td class="py-3 px-4">${company.doctor_count || 0}</td>
            <td class="py-3 px-4">${company.patient_count || 0}</td>
            <td class="py-3 px-4">
                <span class="px-3 py-1 ${company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-medium">
                    ${company.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="py-3 px-4">
                <button onclick="viewCompanyDetails('${company.id}')" class="text-blue-600 hover:text-blue-800 mr-3" title="View Details">
                    ${svgIcon('eye')}
                </button>
                <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" class="text-${company.status === 'active' ? 'red' : 'green'}-600 hover:text-${company.status === 'active' ? 'red' : 'green'}-800" title="${company.status === 'active' ? 'Deactivate' : 'Activate'}">
                    ${svgIcon(company.status === 'active' ? 'ban' : 'check')}
                </button>
            </td>
        </tr>
    `).join('');
}

export function searchCompanies() {
    const query = document.getElementById('company-search').value.toLowerCase();
    const filtered = allCompanies.filter(c => 
        (c.name || '').toLowerCase().includes(query)
    );
    displayCompanyBreakdown(filtered);
}

async function loadAllCompanies() {
    const container = document.getElementById('companies-list');
    if (!container) return;

    container.innerHTML = '<p class="text-gray-500 text-center py-8">Loading companies...</p>';

    try {
        const response = await fetch('/api/superadmin/companies');
        const data = await response.json();

        allCompanies = data.companies || [];
        displayAllCompanies(allCompanies);
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error loading companies</p>';
        console.error('Error loading companies:', error);
    }
}

function displayAllCompanies(companies) {
    const container = document.getElementById('companies-list');
    if (!container) return;

    if (companies.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No companies registered yet</p>';
        return;
    }

    container.innerHTML = companies.map(company => `
        <div class="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-xl font-bold text-gray-800 mb-2">${company.name}</h4>
                    <p class="text-gray-600 text-sm mb-1">
                        ${svgIcon('envelope','mr-2')}${company.email}
                    </p>
                    <p class="text-gray-600 text-sm mb-1">
                        ${svgIcon('phone','mr-2')}${company.contact}
                    </p>
                    <p class="text-gray-600 text-sm">
                        ${svgIcon('map-marker','mr-2')}${company.address}
                    </p>
                </div>
                <span class="px-3 py-1 ${company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-medium">
                    ${company.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="grid grid-cols-4 gap-4 mb-4">
                <div class="bg-blue-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-blue-600">${company.admin_count || 0}</p>
                    <p class="text-xs text-gray-600">Admins</p>
                </div>
                <div class="bg-green-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-green-600">${company.clinic_count || 0}</p>
                    <p class="text-xs text-gray-600">Clinics</p>
                </div>
                <div class="bg-purple-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-purple-600">${company.doctor_count || 0}</p>
                    <p class="text-xs text-gray-600">Doctors</p>
                </div>
                <div class="bg-orange-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-orange-600">${company.patient_count || 0}</p>
                    <p class="text-xs text-gray-600">Patients</p>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="viewCompanyDetails('${company.id}')" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    ${svgIcon('eye','mr-2')}View Details
                </button>
                <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" class="px-4 py-2 bg-${company.status === 'active' ? 'red' : 'green'}-600 hover:bg-${company.status === 'active' ? 'red' : 'green'}-700 text-white rounded-lg transition-colors">
                    ${svgIcon(company.status === 'active' ? 'ban' : 'check','mr-2')}${company.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        </div>
    `).join('');
}

export function searchAllCompanies() {
    const query = document.getElementById('all-companies-search').value.toLowerCase();
    const filtered = allCompanies.filter(c => 
        (c.name || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query)
    );
    displayAllCompanies(filtered);
}

export async function registerCompany() {
    const name = document.getElementById('company-name').value.trim();
    const email = document.getElementById('company-email').value.trim();
    const contact = document.getElementById('company-contact').value.trim();
    const regNumber = document.getElementById('company-reg-number').value.trim();
    const address = document.getElementById('company-address').value.trim();
    const subscription = document.getElementById('company-subscription').value;
    const maxClinics = document.getElementById('company-max-clinics').value;

    if (!name || !email || !contact || !regNumber || !address || !maxClinics) {
        popup.showPopUp('Missing Fields', 'Please fill all required fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/superadmin/register-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, email, contact, registration_number: regNumber,
                address, subscription_plan: subscription, max_clinics: parseInt(maxClinics)
            })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Company "${name}" registered successfully!`, 'success');
            document.getElementById('company-name').value = '';
            document.getElementById('company-email').value = '';
            document.getElementById('company-contact').value = '+92 ';
            document.getElementById('company-reg-number').value = '';
            document.getElementById('company-address').value = '';
            document.getElementById('company-subscription').value = 'basic';
            document.getElementById('company-max-clinics').value = '';
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to register company', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Registration failed: ' + error.message, 'error');
    }
}

async function loadAllAdmins() {
    const tbody = document.getElementById('admins-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Loading admins...</td></tr>';

    try {
        const response = await fetch('/api/superadmin/admins');
        const data = await response.json();
        
        console.log('Admins API response:', data);

        allAdmins = data.admins || [];
        console.log('Admins to display:', allAdmins);
        displayAdmins(allAdmins);
        populateCompanyFilter();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Error loading admins</td></tr>';
        console.error('Error loading admins:', error);
    }
}

function displayAdmins(admins) {
    const tbody = document.getElementById('admins-list');
    if (!tbody) return;

    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No admins found</td></tr>';
        return;
    }

    tbody.innerHTML = admins.map(admin => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 font-medium text-gray-800">${admin.name}</td>
            <td class="py-3 px-4">${admin.username}</td>
            <td class="py-3 px-4">${admin.email}</td>
            <td class="py-3 px-4">
                <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${admin.company_name}</span>
            </td>
            <td class="py-3 px-4">
                <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">${admin.region_count || 0} regions</span>
            </td>
            <td class="py-3 px-4">
                <button onclick="editAdminRegions(${admin.id}, '${admin.name.replace(/'/g, "\\'")}', ${admin.company_id})" 
                    class="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" 
                    title="Edit Regions">
                    ${svgIcon('map','')}
                </button>
                <button onclick="deleteAdmin(${admin.id})" 
                    class="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" 
                    title="Delete Admin">
                    ${svgIcon('trash','')}
                </button>
            </td>
        </tr>
    `).join('');
}

export function searchAdmins() {
    const query = document.getElementById('admin-search').value.toLowerCase();
    const filtered = allAdmins.filter(a => 
        (a.name || '').toLowerCase().includes(query) ||
        (a.username || '').toLowerCase().includes(query) ||
        (a.email || '').toLowerCase().includes(query)
    );
    displayAdmins(filtered);
}

export function filterAdminsByCompany() {
    const companyId = document.getElementById('admin-filter-company').value;
    if (!companyId) {
        displayAdmins(allAdmins);
        return;
    }
    const filtered = allAdmins.filter(a => a.company_id == companyId);
    displayAdmins(filtered);
}

function populateCompanyFilter() {
    const select = document.getElementById('admin-filter-company');
    if (!select) return;

    select.innerHTML = '<option value="">All Companies</option>';
    allCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

async function loadCompaniesForDropdown() {
    const select = document.getElementById('admin-company');
    if (!select) return;

    try {
        const response = await fetch('/api/superadmin/companies');
        const data = await response.json();

        select.innerHTML = '<option value="">Select company...</option>';
        (data.companies || []).forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

export async function loadRegionsForCompany() {
    const companyId = document.getElementById('admin-company').value;
    if (!companyId) {
        document.getElementById('regions-container').innerHTML = '<p class="text-gray-500 text-center">Select a company to view available regions</p>';
        updateSelectedCount(0);
        return;
    }

    selectedRegionIds = [];
    const regionsGrouped = await loadRegionsFromAPI();
    displayRegionCheckboxes('regions-container', 'selected-count', regionsGrouped);
}

function displayRegionCheckboxes(containerId, countId, regionsGrouped) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    
    for (const [province, subRegions] of Object.entries(regionsGrouped)) {
        const provinceId = province.replace(/\s/g, '-');
        
        html += `
            <div class="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-gradient-to-r from-primary to-red-500 p-3">
                        <label class="flex items-center cursor-pointer text-white">
                            <input type="checkbox" 
                                onchange="toggleProvince('${province}', this.checked, '${containerId}', '${countId}')" 
                                class="mr-3 w-5 h-5 cursor-pointer"
                                id="province-${provinceId}-${containerId}">
                            <span class="font-bold text-lg">
                                ${svgIcon('map-marker','mr-2')}${province}
                            </span>
                        </label>
                    </div>
                <div class="p-3 bg-white">
        `;
        
        for (const subRegion of subRegions) {
            const regionId = subRegion.id;
            const subRegionSafe = subRegion.sub_region.replace(/\s/g, '-');
            
            html += `
                <div class="mb-2 ml-4">
                    <label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                        <input type="checkbox" 
                            value="${regionId}" 
                            onchange="toggleSubRegion('${containerId}', '${countId}')" 
                            class="mr-3 w-4 h-4 cursor-pointer province-${provinceId}-${containerId} subregion-checkbox"
                            id="subregion-${provinceId}-${subRegionSafe}-${containerId}"
                            data-province="${province}">
                        <span class="font-semibold text-gray-700">
                            ${svgIcon('map-pin','mr-2 text-primary')}${subRegion.sub_region}
                        </span>
                    </label>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

window.toggleProvince = function(province, checked, containerId, countId) {
    const provinceId = province.replace(/\s/g, '-');
    const checkboxes = document.querySelectorAll(`#${containerId} .province-${provinceId}-${containerId}`);
    checkboxes.forEach(cb => cb.checked = checked);
    toggleSubRegion(containerId, countId);
}

window.toggleSubRegion = function(containerId, countId) {
    const checkboxes = document.querySelectorAll(`#${containerId} .subregion-checkbox:checked`);
    selectedRegionIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    updateSelectedCount(selectedRegionIds.length, countId);
}

function updateSelectedCount(count, countId = 'selected-count') {
    const countEl = document.getElementById(countId);
    if (countEl) {
        countEl.textContent = count;
    }
}

export function assignAllRegions() {
    const checkboxes = document.querySelectorAll('#regions-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    toggleSubRegion('regions-container', 'selected-count');
    popup.showPopUp('Success', 'All regions have been selected!', 'success');
}

export async function createAdmin() {
    const name = document.getElementById('admin-name').value.trim();
    const username = document.getElementById('admin-username').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const contact = document.getElementById('admin-contact').value.trim();
    const companyId = document.getElementById('admin-company').value;

    if (!name || !username || !email || !password || !contact || !companyId) {
        popup.showPopUp('Missing Fields', 'Please fill all required fields', 'error');
        return;
    }

    if (selectedRegionIds.length === 0) {
        popup.showPopUp('No Regions', 'Please assign at least one region to the admin', 'error');
        return;
    }

    try {
        const response = await fetch('/api/superadmin/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, username, email, password, contact,
                company_id: companyId,
                assigned_region_ids: selectedRegionIds  // Changed from assigned_regions
            })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Admin "${name}" created successfully with ${selectedRegionIds.length} regions!`, 'success');
            
            // Clear form
            document.getElementById('admin-name').value = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-contact').value = '+92 ';
            document.getElementById('admin-company').value = '';
            document.getElementById('regions-container').innerHTML = '<p class="text-gray-500 text-center">Select a company to view available regions</p>';
            selectedRegionIds = [];
            updateSelectedCount(0);
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to create admin', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Creation failed: ' + error.message, 'error');
    }
}

export async function editAdminRegions(adminId, adminName, companyId) {
    document.getElementById('edit-admin-id').value = adminId;
    document.getElementById('edit-admin-info').textContent = adminName;

    try {
        // Get admin's current regions
        const response = await fetch(`/api/superadmin/admin/${adminId}/regions`);
        const data = await response.json();

        // Load all available regions
        const regionsGrouped = await loadRegionsFromAPI();
        
        selectedRegionIds = data.assigned_regions ? data.assigned_regions.map(r => r.id) : [];
        displayRegionCheckboxes('edit-regions-container', 'edit-selected-count', regionsGrouped);

        // Check the already assigned regions
        selectedRegionIds.forEach(regionId => {
            const checkbox = document.querySelector(`#edit-regions-container input[value="${regionId}"]`);
            if (checkbox) checkbox.checked = true;
        });

        updateSelectedCount(selectedRegionIds.length, 'edit-selected-count');
        document.getElementById('edit-admin-modal').classList.remove('hidden');
    } catch (error) {
        popup.showPopUp('Error', 'Failed to load admin regions', 'error');
    }
}

export function assignAllRegionsEdit() {
    const checkboxes = document.querySelectorAll('#edit-regions-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    toggleSubRegion('edit-regions-container', 'edit-selected-count');
    popup.showPopUp('Success', 'All regions have been selected!', 'success');
}

export async function updateAdminRegions() {
    const adminId = document.getElementById('edit-admin-id').value;
    toggleSubRegion('edit-regions-container', 'edit-selected-count');

    if (selectedRegionIds.length === 0) {
        popup.showPopUp('No Regions', 'Please assign at least one region', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/superadmin/admin/${adminId}/regions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assigned_region_ids: selectedRegionIds })  // Changed
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Admin regions updated successfully! ${selectedRegionIds.length} regions assigned.`, 'success');
            closeEditAdminModal();
            loadAllAdmins();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to update regions', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Update failed: ' + error.message, 'error');
    }
}

export function closeEditAdminModal() {
    document.getElementById('edit-admin-modal').classList.add('hidden');
    selectedRegions = [];
}

export async function deleteAdmin(adminId) {
    const confirmed = await showConfirmModal(
        'Delete Admin',
        'Are you sure you want to delete this admin? This action cannot be undone.',
        'Delete',
        'Cancel'
    );
    
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/superadmin/admin/${adminId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', 'Admin deleted successfully', 'success');
            loadAllAdmins();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to delete admin', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Deletion failed: ' + error.message, 'error');
    }
}

export async function viewCompanyDetails(companyId) {
    try {
        const response = await fetch(`/api/superadmin/companies`);
        const data = await response.json();
        
        const company = data.companies.find(c => c.id == companyId);
        if (!company) {
            popup.showPopUp('Error', 'Company not found', 'error');
            return;
        }

        const statsResponse = await fetch(`/api/superadmin/dashboard`);
        const statsData = await statsResponse.json();
        const companyStats = statsData.companies.find(c => c.id == companyId);

        const modalHTML = `
            <div id="company-details-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeCompanyDetailsOnOutsideClick(event)">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800">${company.name}</h3>
                            <span class="px-3 py-1 mt-2 inline-block ${company.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full text-sm font-medium">
                                ${company.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <button onclick="closeCompanyDetailsModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="p-6">
                        <div class="bg-blue-50 rounded-lg p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                ${svgIcon('info','text-blue-600 mr-2')}
                                Company Information
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-gray-600">Email</p>
                                    <p class="font-semibold text-gray-800">${company.email}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Contact</p>
                                    <p class="font-semibold text-gray-800">${company.contact}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Registration Number</p>
                                    <p class="font-semibold text-gray-800">${company.registration_number}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Created</p>
                                    <p class="font-semibold text-gray-800">${new Date(company.created_at).toLocaleDateString()}</p>
                                </div>
                                <div class="md:col-span-2">
                                    <p class="text-sm text-gray-600">Address</p>
                                    <p class="font-semibold text-gray-800">${company.address}</p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-center">
                                <p class="text-3xl font-bold">${company.admin_count || 0}</p>
                                <p class="text-sm text-blue-100">Admins</p>
                            </div>
                            <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white text-center">
                                <p class="text-3xl font-bold">${company.clinic_count || 0}</p>
                                <p class="text-sm text-green-100">Clinics</p>
                            </div>
                            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white text-center">
                                <p class="text-3xl font-bold">${company.doctor_count || 0}</p>
                                <p class="text-sm text-purple-100">Doctors</p>
                            </div>
                            <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white text-center">
                                <p class="text-3xl font-bold">${company.patient_count || 0}</p>
                                <p class="text-sm text-orange-100">Patients</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg border p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                ${svgIcon('user-shield','text-primary mr-2')}
                                Company Admins & Their Regions
                            </h4>
                            <div id="company-admins-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading admins...</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg border p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                ${svgIcon('hospital','text-primary mr-2')}
                                Company Clinics
                            </h4>
                            <div id="company-clinics-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading clinics...</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg border p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                ${svgIcon('bullhorn','text-primary mr-2')}
                                Company Bulletins
                            </h4>
                            <div id="company-bulletins-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading bulletins...</p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" 
                                class="flex-1 px-4 py-2 bg-${company.status === 'active' ? 'red' : 'green'}-600 hover:bg-${company.status === 'active' ? 'red' : 'green'}-700 text-white rounded-lg transition-colors">
                                ${svgIcon(company.status === 'active' ? 'ban' : 'check','mr-2')}
                                ${company.status === 'active' ? 'Deactivate' : 'Activate'} Company
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('company-details-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        loadCompanyAdminsWithRegions(companyId);
        loadCompanyClinics(companyId);

        bulletins.loadCompanyBulletins(companyId, 'company-bulletins-list');

    } catch (error) {
        console.error('Error loading company details:', error);
        popup.showPopUp('Error', 'Failed to load company details', 'error');
    }
}

async function loadCompanyAdminsWithRegions(companyId) {
    try {
        const response = await fetch(`/api/superadmin/company/${companyId}/admins-with-regions`);
        const data = await response.json();
        
        const container = document.getElementById('company-admins-list');
        if (!container) return;

        if (!data.success || !data.admins || data.admins.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No admins assigned to this company</p>';
            return;
        }

        container.innerHTML = data.admins.map(admin => {
            // Group regions by province
            const regionsByProvince = {};
            admin.regions.forEach(region => {
                const province = region.province;
                if (!regionsByProvince[province]) {
                    regionsByProvince[province] = [];
                }
                regionsByProvince[province].push(region.sub_region);
            });

            // Format regions display
            const regionsDisplay = Object.entries(regionsByProvince).map(([province, subRegions]) => {
                return `<div class="mb-2">
                    <span class="font-semibold text-primary">${province}:</span>
                    <span class="text-sm text-gray-600">${subRegions.join(', ')}</span>
                </div>`;
            }).join('');

            return `
                <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-semibold text-gray-800">${admin.name}</p>
                            <p class="text-sm text-gray-600">${admin.email} | ${admin.username}</p>
                        </div>
                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            ${admin.region_count} regions
                        </span>
                    </div>
                    <div class="mt-3 pl-4 border-l-2 border-primary">
                        <p class="text-xs font-semibold text-gray-700 mb-2">Assigned Regions:</p>
                        ${regionsDisplay || '<p class="text-xs text-gray-500">No regions assigned</p>'}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        const container = document.getElementById('company-admins-list');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load admins</p>';
        }
    }
}

window.closeCompanyDetailsOnOutsideClick = function(event) {
    if (event.target.id === 'company-details-modal') {
        closeCompanyDetailsModal();
    }
}

export function closeCompanyDetailsModal() {
    const modal = document.getElementById('company-details-modal');
    if (modal) modal.remove();
}

async function loadCompanyClinics(companyId) {
    try {
        const container = document.getElementById('company-clinics-list');
        if (!container) return;

        const clinicsResponse = await fetch(`/api/superadmin/company/${companyId}/clinics`);
        const clinicsData = await clinicsResponse.json();

        if (clinicsData.success && clinicsData.clinics) {
            container.innerHTML = clinicsData.clinics.map(clinic => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                        <p class="font-semibold text-gray-800">${clinic.name}</p>
                        <p class="text-sm text-gray-600">
                            ${svgIcon('map-marker','mr-1')}${clinic.location} (${clinic.city})
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            ${clinic.doctor_count || 0} doctors
                        </span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Unable to load clinic details</p>';
        }
    } catch (error) {
        const container = document.getElementById('company-clinics-list');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load clinics</p>';
        }
    }
}

function showConfirmModal(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        const modalHTML = `
            <div id="confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">${title}</h3>
                        <p class="text-gray-600 mb-6">${message}</p>
                        <div class="flex gap-3 justify-end">
                            <button onclick="window.resolveConfirm(false)" 
                                class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors">
                                ${cancelText}
                            </button>
                            <button onclick="window.resolveConfirm(true)" 
                                class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
                                ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        window.resolveConfirm = (result) => {
            const modal = document.getElementById('confirm-modal');
            if (modal) modal.remove();
            delete window.resolveConfirm;
            resolve(result);
        };
    });
}

export async function toggleCompanyStatus(companyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    // Use custom confirmation modal
    const confirmed = await showConfirmModal(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Company`,
        `Are you sure you want to ${action} this company? This will affect all associated clinics, doctors, and staff.`,
        action === 'active' ? 'Activate' : 'Deactivate',
        'Cancel'
    );
    
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/superadmin/company/${companyId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Company ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            loadDashboard();
            loadAllCompanies();
            closeCompanyDetailsModal();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to update status', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Status update failed: ' + error.message, 'error');
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch('/api/superadmin/analytics');
        const data = await response.json();

        // Display top companies
        const tbody = document.getElementById('top-companies');
        if (tbody && data.top_companies) {
            tbody.innerHTML = data.top_companies.map((company, idx) => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                            idx === 1 ? 'bg-gray-100 text-gray-700' : 
                            idx === 2 ? 'bg-orange-100 text-orange-700' : 
                            'bg-blue-100 text-blue-700'
                        } font-bold">
                            ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </span>
                    </td>
                    <td class="py-3 px-4 font-medium">${company.name}</td>
                    <td class="py-3 px-4">${company.clinic_count}</td>
                    <td class="py-3 px-4">${company.doctor_count}</td>
                    <td class="py-3 px-4">${company.patient_count}</td>
                    <td class="py-3 px-4">
                        <div class="flex items-center">
                            <div class="w-full bg-gray-200 rounded-full h-2 mr-2">
                                <div class="bg-primary h-2 rounded-full" style="width: ${company.performance_score}%"></div>
                            </div>
                            <span class="text-sm font-semibold">${company.performance_score}%</span>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Display regional distribution
        const regionalChart = document.getElementById('regional-chart');
        if (regionalChart && data.regional_distribution) {
            const sorted = data.regional_distribution.sort((a, b) => b.clinic_count - a.clinic_count);
            
            regionalChart.innerHTML = `
                <div class="space-y-4 w-full">
                    ${sorted.map(region => `
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-sm font-semibold text-gray-700">${region.province}</span>
                                <span class="text-xs text-gray-500">${region.clinic_count} clinics, ${region.doctor_count} doctors</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-3">
                                <div class="bg-gradient-to-r from-primary to-red-400 h-3 rounded-full transition-all" 
                                     style="width: ${Math.min(100, (region.clinic_count / Math.max(...sorted.map(r => r.clinic_count))) * 100)}%">
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Display growth trends (using company data as a proxy)
        const growthChart = document.getElementById('growth-chart');
        if (growthChart && data.top_companies) {
            const recentCompanies = data.top_companies.slice(0, 5);
            
            growthChart.innerHTML = `
                <div class="space-y-3 w-full">
                    <div class="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                        <span>Company</span>
                        <span class="text-center">Appointments</span>
                        <span class="text-center">Performance</span>
                    </div>
                    ${recentCompanies.map(company => `
                        <div class="grid grid-cols-3 gap-2 items-center py-2 hover:bg-gray-50 rounded px-2">
                            <span class="text-sm font-medium text-gray-700 truncate">${company.name}</span>
                            <div class="text-center">
                                <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                    ${company.total_appointments}
                                </span>
                            </div>
                            <div class="text-center">
                                <span class="px-2 py-1 ${
                                    company.performance_score >= 75 ? 'bg-green-100 text-green-700' :
                                    company.performance_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                } rounded text-xs font-semibold">
                                    ${company.performance_score}%
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        
        const regionalChart = document.getElementById('regional-chart');
        const growthChart = document.getElementById('growth-chart');
        
        if (regionalChart) {
            regionalChart.innerHTML = '<p class="text-red-500 text-center">Failed to load regional data</p>';
        }
        if (growthChart) {
            growthChart.innerHTML = '<p class="text-red-500 text-center">Failed to load growth data</p>';
        }
    }
}

// ============================================================================
// CHANGE REQUESTS MANAGEMENT
// ============================================================================

async function loadChangeRequests() {
    try {
        const response = await fetch('/api/superadmin/change-requests');
        const data = await response.json();
        
        const tbody = document.getElementById('change-requests-body');
        if (!tbody) return;
        
        if (!data.success || !data.requests || data.requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No pending change requests</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.requests.map(req => {
            const requestType = req.request_type === 'password_reset' ? 'Password Reset' : 
                              req.request_type === 'contact_change' ? 'Contact Change' : 'Regions Change';
            const createdDate = new Date(req.created_at).toLocaleDateString();
            
            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 font-medium">${req.admin_name}</td>
                    <td class="py-3 px-4">${req.company_name}</td>
                    <td class="py-3 px-4">
                        <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">${requestType}</span>
                    </td>
                    <td class="py-3 px-4 text-sm max-w-xs truncate">${req.reason || 'No reason provided'}</td>
                    <td class="py-3 px-4 text-sm text-gray-600">${createdDate}</td>
                    <td class="py-3 px-4">
                        <div class="flex gap-2">
                            <button onclick="approveChangeRequest(${req.id})" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors inline-flex items-center gap-1 w-8 h-8 justify-center">
                                ${svgIcon('check-circle', 'w-4 h-4')}
                            </button>
                            <button onclick="rejectChangeRequest(${req.id})" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors inline-flex items-center gap-1 w-8 h-8 justify-center">
                                ${svgIcon('ban', 'w-4 h-4')}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading change requests:', error);
        popup.showPopUp('Error', 'Failed to load change requests', 'error');
    }
}

window.approveChangeRequest = async function(requestId) {
    const confirmed = await popup.showConfirmModal(
        'Approve Change Request',
        'Are you sure you want to approve this change request?',
        'Approve',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/superadmin/change-request/${requestId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success) {
            popup.showPopUp('Success', 'Change request approved successfully', 'success');
            loadChangeRequests();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to approve request', 'error');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        popup.showPopUp('Error', 'An error occurred while approving the request', 'error');
    }
};

window.rejectChangeRequest = async function(requestId) {
    const rejectReason = prompt('Enter rejection reason:', '');
    if (rejectReason === null) return; // User cancelled
    
    try {
        const response = await fetch(`/api/superadmin/change-request/${requestId}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectReason })
        });
        
        const data = await response.json();
        if (data.success) {
            popup.showPopUp('Success', 'Change request rejected', 'success');
            loadChangeRequests();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to reject request', 'error');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        popup.showPopUp('Error', 'An error occurred while rejecting the request', 'error');
    }
};

// Attach to window for backward compatibility with onclick handlers
window.viewCompanyDetails = viewCompanyDetails;
window.toggleCompanyStatus = toggleCompanyStatus;
window.closeCompanyDetailsModal = closeCompanyDetailsModal;
window.closeCompanyDetailsOnOutsideClick = closeCompanyDetailsOnOutsideClick;
window.deleteAdmin = deleteAdmin;
window.editAdminRegions = editAdminRegions;
window.loadChangeRequests = loadChangeRequests;

export { pakistanRegions };