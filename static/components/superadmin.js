import * as popup from '../popup_modal.js';
import * as bulletins from '../bulletins.js';
import { getUser } from '../user_state.js';

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
let selectedRegions = [];


// Tab Management
export function showSuperAdminTab(tabName) {
    const tabs = ['dashboard', 'companies', 'register-company', 'admins', 'create-admin', 'analytics'];
    
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
}

// Load Dashboard
async function loadDashboard() {
    try {
        const response = await fetch('http://localhost:8000/api/superadmin/dashboard');
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

// Display Company Breakdown
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
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" class="text-${company.status === 'active' ? 'red' : 'green'}-600 hover:text-${company.status === 'active' ? 'red' : 'green'}-800" title="${company.status === 'active' ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${company.status === 'active' ? 'ban' : 'check-circle'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Search Companies in Dashboard
export function searchCompanies() {
    const query = document.getElementById('company-search').value.toLowerCase();
    const filtered = allCompanies.filter(c => 
        (c.name || '').toLowerCase().includes(query)
    );
    displayCompanyBreakdown(filtered);
}

// Load All Companies
async function loadAllCompanies() {
    const container = document.getElementById('companies-list');
    if (!container) return;

    container.innerHTML = '<p class="text-gray-500 text-center py-8">Loading companies...</p>';

    try {
        const response = await fetch('http://localhost:8000/api/superadmin/companies');
        const data = await response.json();

        allCompanies = data.companies || [];
        displayAllCompanies(allCompanies);
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center py-8">Error loading companies</p>';
        console.error('Error loading companies:', error);
    }
}

// Display All Companies
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
                        <i class="fas fa-envelope mr-2"></i>${company.email}
                    </p>
                    <p class="text-gray-600 text-sm mb-1">
                        <i class="fas fa-phone mr-2"></i>${company.contact}
                    </p>
                    <p class="text-gray-600 text-sm">
                        <i class="fas fa-map-marker-alt mr-2"></i>${company.address}
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
                    <i class="fas fa-eye mr-2"></i>View Details
                </button>
                <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" class="px-4 py-2 bg-${company.status === 'active' ? 'red' : 'green'}-600 hover:bg-${company.status === 'active' ? 'red' : 'green'}-700 text-white rounded-lg transition-colors">
                    <i class="fas fa-${company.status === 'active' ? 'ban' : 'check-circle'} mr-2"></i>${company.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        </div>
    `).join('');
}

// Search All Companies
export function searchAllCompanies() {
    const query = document.getElementById('all-companies-search').value.toLowerCase();
    const filtered = allCompanies.filter(c => 
        (c.name || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query)
    );
    displayAllCompanies(filtered);
}

// Register Company
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
        const response = await fetch('http://localhost:8000/api/superadmin/register-company', {
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
            document.getElementById('company-contact').value = '';
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

// Load All Admins
async function loadAllAdmins() {
    const tbody = document.getElementById('admins-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Loading admins...</td></tr>';

    try {
        const response = await fetch('http://localhost:8000/api/superadmin/admins');
        const data = await response.json();

        allAdmins = data.admins || [];
        displayAdmins(allAdmins);
        populateCompanyFilter();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Error loading admins</td></tr>';
        console.error('Error loading admins:', error);
    }
}

// Display Admins
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
                <button onclick="editAdminRegions('${admin.id}', '${admin.name}', '${admin.company_id}')" class="text-blue-600 hover:text-blue-800 mr-3" title="Edit Regions">
                    <i class="fas fa-map-marked-alt"></i>
                </button>
                <button onclick="deleteAdmin('${admin.id}')" class="text-red-600 hover:text-red-800" title="Delete Admin">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Search Admins
export function searchAdmins() {
    const query = document.getElementById('admin-search').value.toLowerCase();
    const filtered = allAdmins.filter(a => 
        (a.name || '').toLowerCase().includes(query) ||
        (a.username || '').toLowerCase().includes(query) ||
        (a.email || '').toLowerCase().includes(query)
    );
    displayAdmins(filtered);
}

// Filter Admins by Company
export function filterAdminsByCompany() {
    const companyId = document.getElementById('admin-filter-company').value;
    if (!companyId) {
        displayAdmins(allAdmins);
        return;
    }
    const filtered = allAdmins.filter(a => a.company_id == companyId);
    displayAdmins(filtered);
}

// Populate Company Filter
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

// Load Companies for Dropdown
async function loadCompaniesForDropdown() {
    const select = document.getElementById('admin-company');
    if (!select) return;

    try {
        const response = await fetch('http://localhost:8000/api/superadmin/companies');
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

// Load Regions for Company
export function loadRegionsForCompany() {
    const companyId = document.getElementById('admin-company').value;
    if (!companyId) {
        document.getElementById('regions-container').innerHTML = '<p class="text-gray-500 text-center">Select a company to view available regions</p>';
        updateSelectedCount(0);
        return;
    }

    selectedRegions = [];
    displayRegionCheckboxes('regions-container', 'selected-count');
}

// Display Region Checkboxes (Province > Sub-Region only)
function displayRegionCheckboxes(containerId, countId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    
    for (const [province, subRegions] of Object.entries(pakistanRegions)) {
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
                            <i class="fas fa-map-marker-alt mr-2"></i>${province}
                        </span>
                    </label>
                </div>
                <div class="p-3 bg-white">
        `;
        
        for (const subRegion of Object.keys(subRegions)) {
            const regionKey = `${province}|${subRegion}`;
            const subRegionId = subRegion.replace(/\s/g, '-');
            
            html += `
                <div class="mb-2 ml-4">
                    <label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                        <input type="checkbox" 
                            value="${regionKey}" 
                            onchange="toggleSubRegion('${containerId}', '${countId}')" 
                            class="mr-3 w-4 h-4 cursor-pointer province-${provinceId}-${containerId} subregion-checkbox"
                            id="subregion-${provinceId}-${subRegionId}-${containerId}">
                        <span class="font-semibold text-gray-700">
                            <i class="fas fa-map-pin mr-2 text-primary"></i>${subRegion}
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

// Toggle Province (Select/Deselect all sub-regions)
window.toggleProvince = function(province, checked, containerId, countId) {
    const provinceId = province.replace(/\s/g, '-');
    const checkboxes = document.querySelectorAll(`#${containerId} .province-${provinceId}-${containerId}`);
    checkboxes.forEach(cb => cb.checked = checked);
    toggleSubRegion(containerId, countId);
}

// Toggle Sub-Region (Update selected regions)
window.toggleSubRegion = function(containerId, countId) {
    const checkboxes = document.querySelectorAll(`#${containerId} .subregion-checkbox:checked`);
    selectedRegions = Array.from(checkboxes).map(cb => cb.value);
    updateSelectedCount(selectedRegions.length, countId);
}

// Update Selected Count Display
function updateSelectedCount(count, countId = 'selected-count') {
    const countEl = document.getElementById(countId);
    if (countEl) {
        countEl.textContent = count;
    }
}

// Assign All Regions
export function assignAllRegions() {
    const checkboxes = document.querySelectorAll('#regions-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    toggleSubRegion('regions-container', 'selected-count');
    popup.showPopUp('Success', 'All regions have been selected!', 'success');
}

// Create Admin
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

    if (selectedRegions.length === 0) {
        popup.showPopUp('No Regions', 'Please assign at least one region to the admin', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/api/superadmin/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, username, email, password, contact,
                company_id: companyId,
                assigned_regions: selectedRegions
            })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Admin "${name}" created successfully with ${selectedRegions.length} regions!`, 'success');
            document.getElementById('admin-name').value = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-contact').value = '';
            document.getElementById('admin-company').value = '';
            document.getElementById('regions-container').innerHTML = '<p class="text-gray-500 text-center">Select a company to view available regions</p>';
            selectedRegions = [];
            updateSelectedCount(0);
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to create admin', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Creation failed: ' + error.message, 'error');
    }
}

// Edit Admin Regions
window.editAdminRegions = async function(adminId, adminName, companyId) {
    document.getElementById('edit-admin-id').value = adminId;
    document.getElementById('edit-admin-info').textContent = adminName;

    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/admin/${adminId}/regions`);
        const data = await response.json();

        selectedRegions = data.assigned_regions || [];
        displayRegionCheckboxes('edit-regions-container', 'edit-selected-count');

        selectedRegions.forEach(region => {
            const checkbox = document.querySelector(`#edit-regions-container input[value="${region}"]`);
            if (checkbox) checkbox.checked = true;
        });

        updateSelectedCount(selectedRegions.length, 'edit-selected-count');
        document.getElementById('edit-admin-modal').classList.remove('hidden');
    } catch (error) {
        popup.showPopUp('Error', 'Failed to load admin regions', 'error');
    }
}

// Assign All Regions in Edit Modal
export function assignAllRegionsEdit() {
    const checkboxes = document.querySelectorAll('#edit-regions-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    toggleSubRegion('edit-regions-container', 'edit-selected-count');
    popup.showPopUp('Success', 'All regions have been selected!', 'success');
}

// Update Admin Regions
export async function updateAdminRegions() {
    const adminId = document.getElementById('edit-admin-id').value;
    toggleSubRegion('edit-regions-container', 'edit-selected-count');

    if (selectedRegions.length === 0) {
        popup.showPopUp('No Regions', 'Please assign at least one region', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/admin/${adminId}/regions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assigned_regions: selectedRegions })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Admin regions updated successfully! ${selectedRegions.length} regions assigned.`, 'success');
            closeEditAdminModal();
            loadAllAdmins();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to update regions', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Update failed: ' + error.message, 'error');
    }
}

// Close Edit Admin Modal
export function closeEditAdminModal() {
    document.getElementById('edit-admin-modal').classList.add('hidden');
    selectedRegions = [];
}

// Delete Admin
window.deleteAdmin = async function(adminId) {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;

    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/admin/${adminId}`, {
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

// View Company Details - Updated to show admin regions
window.viewCompanyDetails = async function(companyId) {
    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/companies`);
        const data = await response.json();
        
        const company = data.companies.find(c => c.id == companyId);
        if (!company) {
            popup.showPopUp('Error', 'Company not found', 'error');
            return;
        }

        const statsResponse = await fetch(`http://localhost:8000/api/superadmin/dashboard`);
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
                                <i class="fas fa-info-circle text-blue-600 mr-2"></i>
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
                                <i class="fas fa-user-shield text-primary mr-2"></i>
                                Company Admins & Their Regions
                            </h4>
                            <div id="company-admins-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading admins...</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg border p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-hospital text-primary mr-2"></i>
                                Company Clinics
                            </h4>
                            <div id="company-clinics-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading clinics...</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg border p-4 mb-6">
                            <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                                <i class="fas fa-bullhorn text-primary mr-2"></i>
                                Company Bulletins
                            </h4>
                            <div id="company-bulletins-list" class="space-y-2">
                                <p class="text-gray-500 text-center py-4">Loading bulletins...</p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button onclick="toggleCompanyStatus('${company.id}', '${company.status}')" 
                                class="flex-1 px-4 py-2 bg-${company.status === 'active' ? 'red' : 'green'}-600 hover:bg-${company.status === 'active' ? 'red' : 'green'}-700 text-white rounded-lg transition-colors">
                                <i class="fas fa-${company.status === 'active' ? 'ban' : 'check-circle'} mr-2"></i>
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

// Load Company Admins with Regions
async function loadCompanyAdminsWithRegions(companyId) {
    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/company/${companyId}/admins-with-regions`);
        const data = await response.json();
        
        const container = document.getElementById('company-admins-list');
        if (!container) return;

        if (!data.success || !data.admins || data.admins.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No admins assigned to this company</p>';
            return;
        }

        container.innerHTML = data.admins.map(admin => {
            const regionsByProvince = {};
            admin.regions.forEach(region => {
                const [province, subRegion] = region.split('|');
                if (!regionsByProvince[province]) {
                    regionsByProvince[province] = [];
                }
                regionsByProvince[province].push(subRegion);
            });

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

// Close modal when clicking outside
window.closeCompanyDetailsOnOutsideClick = function(event) {
    if (event.target.id === 'company-details-modal') {
        closeCompanyDetailsModal();
    }
}

// Load Company Clinics
async function loadCompanyClinics(companyId) {
    try {
        const container = document.getElementById('company-clinics-list');
        if (!container) return;

        const clinicsResponse = await fetch(`http://localhost:8000/api/superadmin/company/${companyId}/clinics`);
        const clinicsData = await clinicsResponse.json();

        if (clinicsData.success && clinicsData.clinics) {
            container.innerHTML = clinicsData.clinics.map(clinic => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                        <p class="font-semibold text-gray-800">${clinic.name}</p>
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-map-marker-alt mr-1"></i>${clinic.location} (${clinic.city})
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

// Close Company Details Modal
window.closeCompanyDetailsModal = function() {
    const modal = document.getElementById('company-details-modal');
    if (modal) modal.remove();
}

// Toggle Company Status
window.toggleCompanyStatus = async function(companyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this company?`)) return;

    try {
        const response = await fetch(`http://localhost:8000/api/superadmin/company/${companyId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Success', `Company ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            loadDashboard();
            loadAllCompanies();
        } else {
            popup.showPopUp('Error', data.detail || 'Failed to update status', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Status update failed: ' + error.message, 'error');
    }
}

// Load Analytics
async function loadAnalytics() {
    try {
        const response = await fetch('http://localhost:8000/api/superadmin/analytics');
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

// Export pakistan regions for use in other files
export { pakistanRegions };