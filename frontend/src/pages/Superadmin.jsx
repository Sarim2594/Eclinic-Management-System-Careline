import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getSuperadminDashboard, getAllCompanies, registerCompany, updateCompanyStatus,
  getAllAdmins, createAdmin, deleteAdmin, updateAdminRegions,
  getAllRegions, getAnalytics, getChangeRequests,
  approveChangeRequest, rejectChangeRequest,
  getCompanyClinics, getCompanyAdminsWithRegions,
} from '../api';

// Restores: exact structure from templates/superadmin.html
// Tabs: Dashboard | Companies | Register Company | Admins | Create Admin | Analytics | Change Requests

export default function Superadmin() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]       = useState('dashboard');
  const [stats, setStats]               = useState({});
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [admins, setAdmins]             = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [regions, setRegions]           = useState([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState([]);
  const [analytics, setAnalytics]       = useState({});
  const [changeReqs, setChangeReqs]     = useState([]);
  const [editAdminModal, setEditAdminModal] = useState(null);
  const [editRegionIds, setEditRegionIds] = useState([]);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [msg, setMsg]                   = useState({ text: '', ok: true });

  useEffect(() => { loadDashboard(); }, []);

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 5000);
  };

  const loadDashboard = async () => {
    try {
      const [dash, cos, ads, rgs] = await Promise.all([
        getSuperadminDashboard(),
        getAllCompanies(),
        getAllAdmins(),
        getAllRegions(),
      ]);
      setStats(dash);
      setAllCompanies(cos.companies || []);
      setFilteredCompanies(cos.companies || []);
      setCompanyBreakdown(cos.companies || []);
      setAdmins(ads.admins || []);
      setFilteredAdmins(ads.admins || []);
      setRegions(rgs.regions || []);
    } catch (e) { console.error(e); }
  };

  const handleTab = async (tab) => {
    setActiveTab(tab);
    if (tab === 'analytics') { const a = await getAnalytics(); setAnalytics(a); }
    if (tab === 'change-requests') { const r = await getChangeRequests(); setChangeReqs(r.requests || []); }
    if (tab === 'dashboard') loadDashboard();
  };

  const searchCompanies = (q) => {
    const query = q.toLowerCase();
    setCompanyBreakdown(allCompanies.filter(c => !query || c.name?.toLowerCase().includes(query)));
  };

  const searchAllCompanies = (q) => {
    const query = q.toLowerCase();
    setFilteredCompanies(allCompanies.filter(c => !query || c.name?.toLowerCase().includes(query)));
  };

  const searchAdmins = (q) => {
    const query = q.toLowerCase();
    setFilteredAdmins(admins.filter(a =>
      !query || a.name?.toLowerCase().includes(query) || a.company_name?.toLowerCase().includes(query)
    ));
  };

  const filterAdminsByCompany = (company_id) => {
    if (!company_id) { setFilteredAdmins(admins); return; }
    setFilteredAdmins(admins.filter(a => String(a.company_id) === String(company_id)));
  };

  const handleRegisterCompany = async () => {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    try {
      await registerCompany({
        name: g('company-name'), email: g('company-email'), contact: g('company-contact'),
        registration_number: g('company-reg-number'), address: g('company-address'),
        subscription_plan: g('company-subscription'),
      });
      showMsg('Company registered successfully!');
      loadDashboard();
    } catch (e) { showMsg(e.response?.data?.detail || 'Registration failed', false); }
  };

  const handleCreateAdmin = async () => {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    try {
      await createAdmin({
        name: g('admin-name'), username: g('admin-username'), email: g('admin-email'),
        password: g('admin-password'), contact: g('admin-contact'),
        company_id: parseInt(g('admin-company')),
        region_ids: selectedRegionIds,
      });
      showMsg('Admin created successfully!');
      setSelectedRegionIds([]);
      loadDashboard();
    } catch (e) { showMsg(e.response?.data?.detail || 'Failed', false); }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Delete this admin?')) return;
    try { await deleteAdmin(id); showMsg('Admin deleted.'); loadDashboard(); }
    catch (e) { showMsg('Failed to delete admin', false); }
  };

  const handleToggleCompany = async (id, status) => {
    await updateCompanyStatus(id, status === 'active' ? 'inactive' : 'active');
    showMsg('Company status updated.'); loadDashboard();
  };

  const handleViewCompany = async (company) => {
    const [cl, ad] = await Promise.all([getCompanyClinics(company.id), getCompanyAdminsWithRegions(company.id)]);
    setCompanyDetails({ ...company, clinics: cl.clinics || [], admins: ad.admins || [] });
  };

  const loadRegionsForCompany = () => {
    // Regions are already loaded globally — just reset selection
    setSelectedRegionIds([]);
  };

  const toggleRegion = (id, setter, current) => {
    setter(current.includes(id) ? current.filter(r => r !== id) : [...current, id]);
  };

  const assignAllRegions = () => setSelectedRegionIds(regions.map(r => r.region_id));
  const assignAllRegionsEdit = () => setEditRegionIds(regions.map(r => r.region_id));

  const handleUpdateAdminRegions = async () => {
    try {
      await updateAdminRegions(editAdminModal.id, editRegionIds);
      showMsg('Regions updated!');
      setEditAdminModal(null);
      loadDashboard();
    } catch (e) { showMsg('Failed to update regions', false); }
  };

  const TabBtn = ({ id, icon, label }) => (
    <button
      onClick={() => handleTab(id)}
      id={`superadmin-tab-${id}`}
      className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-600'
      }`}
    >
      <i className={`${icon} mr-2`}></i>{label}
    </button>
  );

  return (
    <div>
      {/* Main Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <TabBtn id="dashboard"         icon="fas fa-chart-line"   label="Dashboard" />
        <TabBtn id="companies"         icon="fas fa-building"     label="Companies" />
        <TabBtn id="register-company"  icon="fas fa-plus-circle"  label="Register Company" />
        <TabBtn id="admins"            icon="fas fa-user-shield"  label="Admins" />
        <TabBtn id="create-admin"      icon="fas fa-user-plus"    label="Create Admin" />
        <TabBtn id="analytics"         icon="fas fa-chart-pie"    label="Analytics" />
        <TabBtn id="change-requests"   icon="fas fa-tasks"        label="Change Requests" />
      </div>

      {msg.text && (
        <div className={`mb-6 p-4 rounded-lg ${msg.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* ═══ DASHBOARD ═══ */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard color="from-blue-500 to-blue-600"     icon="fas fa-building"    label="Total Companies" value={stats.total_companies} />
            <StatCard color="from-green-500 to-green-600"   icon="fas fa-user-shield" label="Total Admins"    value={stats.total_admins} />
            <StatCard color="from-purple-500 to-purple-600" icon="fas fa-hospital"    label="Total Clinics"   value={stats.total_clinics} />
            <StatCard color="from-orange-500 to-orange-600" icon="fas fa-user-md"     label="Total Doctors"   value={stats.total_doctors} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                <i className="fas fa-chart-bar text-primary mr-2"></i>Company Breakdown
              </h3>
              <input type="text" onChange={e => searchCompanies(e.target.value)}
                placeholder="Search companies..." className="px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Company Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Admins</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Clinics</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Doctors</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patients</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr></thead>
                <tbody id="superadmin-company-breakdown">
                  {companyBreakdown.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4">{c.admin_count || '-'}</td>
                      <td className="py-3 px-4">{c.clinic_count || '-'}</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleViewCompany(c)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 mr-2">
                          <i className="fas fa-eye mr-1"></i>View
                        </button>
                        <button onClick={() => handleToggleCompany(c.id, c.status)}
                          className={`px-3 py-1 rounded-lg text-sm ${c.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {c.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COMPANIES ═══ */}
      {activeTab === 'companies' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              <i className="fas fa-building text-primary mr-2"></i>All Registered Companies
            </h3>
            <input type="text" onChange={e => searchAllCompanies(e.target.value)}
              placeholder="Search companies..." className="px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="space-y-4" id="companies-list">
            {filteredCompanies.map(c => (
              <div key={c.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{c.name}</h4>
                    <p className="text-sm text-gray-500">{c.email} · {c.contact}</p>
                    <p className="text-sm text-gray-500">{c.address}</p>
                    <p className="text-sm text-gray-600 mt-1">Plan: <strong>{c.subscription_plan}</strong> · {c.clinic_count} clinics · {c.admin_count} admins</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.status}
                    </span>
                    <button onClick={() => handleViewCompany(c)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                      <i className="fas fa-eye mr-1"></i>View Details
                    </button>
                    <button onClick={() => handleToggleCompany(c.id, c.status)}
                      className={`px-3 py-1 rounded-lg text-sm ${c.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ REGISTER COMPANY ═══ */}
      {activeTab === 'register-company' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            <i className="fas fa-plus-circle text-primary mr-2"></i>Register New Company
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FInput label="Company Name *"       id="company-name"         placeholder="Healthcare Solutions Ltd." />
            <FInput label="Company Email *"      id="company-email"        type="email" placeholder="info@company.com" />
            <FInput label="Contact Number *"     id="company-contact"      placeholder="+92 300-1234567" defaultValue="+92 " />
            <FInput label="Registration Number *" id="company-reg-number"  placeholder="REG-12345" />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <textarea id="company-address" rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter company address"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Plan *</label>
              <select id="company-subscription" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="purchase">Purchase</option>
                <option value="rental">Rental</option>
                <option value="per_consultation_with_doctor">Per Consultation with Doctor</option>
                <option value="per_consultation_without_doctor">Per Consultation without Doctor</option>
              </select>
            </div>
          </div>
          <button onClick={handleRegisterCompany}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
            <i className="fas fa-check mr-2"></i>Register Company
          </button>
        </div>
      )}

      {/* ═══ ADMINS ═══ */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              <i className="fas fa-user-shield text-primary mr-2"></i>All Admins
            </h3>
            <div className="flex gap-3">
              <input type="text" onChange={e => searchAdmins(e.target.value)}
                placeholder="Search admins..." className="px-4 py-2 border border-gray-300 rounded-lg" />
              <select onChange={e => filterAdminsByCompany(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">All Companies</option>
                {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Assigned Regions</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr></thead>
              <tbody id="admins-list">
                {filteredAdmins.map(a => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{a.name}</td>
                    <td className="py-3 px-4">{a.username || '-'}</td>
                    <td className="py-3 px-4">{a.email || '-'}</td>
                    <td className="py-3 px-4">{a.company_name}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(a.regions) && a.regions[0] !== null
                          ? a.regions.slice(0, 3).map((r, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                              {r.province} &gt; {r.sub_region}
                            </span>
                          ))
                          : <span className="text-gray-400 text-sm">No regions</span>
                        }
                        {Array.isArray(a.regions) && a.regions.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">+{a.regions.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditAdminModal(a); setEditRegionIds(Array.isArray(a.regions) && a.regions[0] !== null ? a.regions.map(r => r.region_id) : []); }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                          <i className="fas fa-map-marker-alt mr-1"></i>Edit Regions
                        </button>
                        <button onClick={() => handleDeleteAdmin(a.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
                          <i className="fas fa-trash mr-1"></i>Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ CREATE ADMIN ═══ */}
      {activeTab === 'create-admin' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            <i className="fas fa-user-plus text-primary mr-2"></i>Create New Admin
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FInput label="Full Name *"  id="admin-name"     placeholder="Ali Ahmed" />
            <FInput label="Username *"   id="admin-username" placeholder="ali.ahmed" />
            <FInput label="Email *"      id="admin-email"    type="email" placeholder="ali@company.com" />
            <FInput label="Password *"   id="admin-password" type="password" placeholder="Enter password" />
            <FInput label="Contact *"    id="admin-contact"  placeholder="+92 300-1234567" defaultValue="+92 " />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Company *</label>
              <select id="admin-company" onChange={loadRegionsForCompany}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Select company...</option>
                {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Assign Regions (Province &gt; Sub-Region) *</label>
              <button onClick={assignAllRegions}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <i className="fas fa-check-double mr-2"></i>Assign All Regions
              </button>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
              {regions.length === 0
                ? <p className="text-gray-500 text-center">Loading regions...</p>
                : regions.map(r => (
                  <label key={r.region_id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white px-2 rounded">
                    <input type="checkbox"
                      checked={selectedRegionIds.includes(r.region_id)}
                      onChange={() => toggleRegion(r.region_id, setSelectedRegionIds, selectedRegionIds)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-gray-700">{r.province} &gt; {r.sub_region}</span>
                  </label>
                ))
              }
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <i className="fas fa-info-circle mr-1"></i>Selected regions:
              <span className="font-semibold text-primary ml-1">{selectedRegionIds.length}</span>
            </p>
          </div>

          <button onClick={handleCreateAdmin}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
            <i className="fas fa-user-plus mr-2"></i>Create Admin
          </button>
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {activeTab === 'analytics' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                <i className="fas fa-chart-pie text-primary mr-2"></i>Regional Distribution
              </h3>
              <div id="regional-chart" className="space-y-2">
                {(analytics.by_region || []).slice(0, 8).map(r => (
                  <div key={`${r.province}-${r.sub_region}`} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-40 truncate">{r.province}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div className="bg-primary h-3 rounded-full" style={{ width: `${Math.min(100, (r.appointments / 300) * 100)}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{r.appointments}</span>
                  </div>
                ))}
                {!analytics.by_region && <p className="text-gray-400 text-center py-8">Loading...</p>}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                <i className="fas fa-chart-line text-primary mr-2"></i>Growth Trends
              </h3>
              <div id="growth-chart" className="space-y-2">
                {(analytics.monthly_trend || []).map(r => (
                  <div key={r.month} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{new Date(r.month).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(100, (r.appointments / 100) * 100)}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{r.appointments}</span>
                  </div>
                ))}
                {!analytics.monthly_trend && <p className="text-gray-400 text-center py-8">Loading...</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              <i className="fas fa-crown text-primary mr-2"></i>Top Performing Companies
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Clinics</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Doctors</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Patients</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Appointments</th>
                </tr></thead>
                <tbody id="top-companies">
                  {(analytics.by_company || []).map((c, i) => (
                    <tr key={c.company} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-primary">#{i + 1}</td>
                      <td className="py-3 px-4 font-medium">{c.company}</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4">{c.appointments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CHANGE REQUESTS ═══ */}
      {activeTab === 'change-requests' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">
              <i className="fas fa-tasks text-primary mr-2"></i>Admin Change Requests
            </h3>
            <button onClick={async () => { const r = await getChangeRequests(); setChangeReqs(r.requests || []); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <i className="fas fa-sync-alt mr-2"></i>Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Admin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Request Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr></thead>
              <tbody id="change-requests-body">
                {changeReqs.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No pending change requests</td></tr>
                )}
                {changeReqs.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{r.admin_name}</td>
                    <td className="py-3 px-4">{r.company_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{r.request_type}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{r.reason || r.requested_data || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={async () => { await approveChangeRequest(r.id); showMsg('Request approved & applied!'); const res = await getChangeRequests(); setChangeReqs(res.requests || []); }}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                          <i className="fas fa-check mr-1"></i>Approve
                        </button>
                        <button onClick={async () => { const reason = prompt('Rejection reason:'); if (!reason) return; await rejectChangeRequest(r.id, reason); showMsg('Request rejected.'); const res = await getChangeRequests(); setChangeReqs(res.requests || []); }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                          <i className="fas fa-times mr-1"></i>Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ COMPANY DETAILS MODAL ═══ */}
      {companyDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setCompanyDetails(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">{companyDetails.name}</h3>
              <button onClick={() => setCompanyDetails(null)} className="text-gray-500 hover:text-gray-800">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{companyDetails.email}</p></div>
                <div><p className="text-sm text-gray-500">Contact</p><p className="font-medium">{companyDetails.contact}</p></div>
                <div><p className="text-sm text-gray-500">Plan</p><p className="font-medium">{companyDetails.subscription_plan}</p></div>
                <div><p className="text-sm text-gray-500">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${companyDetails.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{companyDetails.status}</span>
                </div>
              </div>
              <h4 className="font-bold text-gray-800 mb-3">Clinics ({companyDetails.clinics.length})</h4>
              <div className="space-y-2 mb-6">
                {companyDetails.clinics.map(c => <div key={c.id} className="p-3 bg-gray-50 rounded-lg text-sm">{c.name} — {c.city_name}, {c.province}</div>)}
              </div>
              <h4 className="font-bold text-gray-800 mb-3">Admins ({companyDetails.admins.length})</h4>
              <div className="space-y-2">
                {companyDetails.admins.map(a => <div key={a.id} className="p-3 bg-gray-50 rounded-lg text-sm">{a.name} — {a.contact}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT ADMIN REGIONS MODAL ═══ */}
      {editAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-gray-800">
                <i className="fas fa-edit text-primary mr-2"></i>Edit Admin Regions
              </h3>
              <button onClick={() => setEditAdminModal(null)} className="text-gray-500 hover:text-gray-800">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700"><strong>Admin:</strong> <span className="text-primary">{editAdminModal.name} — {editAdminModal.company_name}</span></p>
              </div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Assigned Regions</label>
                <button onClick={assignAllRegionsEdit}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <i className="fas fa-check-double mr-2"></i>Assign All Regions
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto mb-4 bg-gray-50">
                {regions.map(r => (
                  <label key={r.region_id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white px-2 rounded">
                    <input type="checkbox"
                      checked={editRegionIds.includes(r.region_id)}
                      onChange={() => toggleRegion(r.region_id, setEditRegionIds, editRegionIds)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-gray-700">{r.province} &gt; {r.sub_region}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                <i className="fas fa-info-circle mr-1"></i>Selected regions:
                <span className="font-semibold text-primary ml-1">{editRegionIds.length}</span>
              </p>
              <button onClick={handleUpdateAdminRegions}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
                <i className="fas fa-save mr-2"></i>Update Regions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ color, icon, label, value }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-lg p-6 text-white transform hover:-translate-y-1 transition-transform`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-opacity-80 text-sm mb-1">{label}</p>
          <p className="text-4xl font-bold">{value ?? '-'}</p>
        </div>
        <div className="bg-white bg-opacity-20 p-4 rounded-lg">
          <i className={`${icon} text-3xl`}></i>
        </div>
      </div>
    </div>
  );
}

function FInput({ label, id, type = 'text', placeholder = '', defaultValue = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input type={type} id={id} defaultValue={defaultValue}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        placeholder={placeholder} />
    </div>
  );
}