import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStatistics, getAdminDoctors, getAdminReceptionists,
  getUnavailableDoctors, createDoctor, createReceptionist, createClinic,
  getClinics, getAdminCities, getSpecializations, postBulletin,
  getBulletinsByAdmin, deleteBulletin, getUnavailabilityRequests,
  approveUnavailability, rejectUnavailability, monitorDoctors,
  getDoctorSchedule, updateDoctorAvailability, transferDoctor,
  requestPasswordChange, requestContactChange, requestGeneralQuery,
  getAvailableDoctors, getAdminClinicBreakdown,
} from '../api';

// Restores: exact structure from templates/admin.html
// Tabs: Dashboard | Staff Management | Doctors | Communications

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function Admin() {
  const { user } = useAuth();
  const { admin_id, company_id } = user;

  const [activeTab, setActiveTab]         = useState('dashboard');
  const [staffSubTab, setStaffSubTab]     = useState('assignments');
  const [doctorSubTab, setDoctorSubTab]   = useState('available');
  const [commsSubTab, setCommsSubTab]     = useState('bulletin');

  // Data
  const [stats, setStats]               = useState({});
  const [clinicStats, setClinicStats]   = useState([]);
  const [doctorStats, setDoctorStats]   = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [filteredReceps, setFilteredReceps] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [availDoctors, setAvailDoctors] = useState([]);
  const [unavailDoctors, setUnavailDoctors] = useState([]);
  const [unavailReqs, setUnavailReqs]   = useState([]);
  const [clinics, setClinics]           = useState([]);
  const [cities, setCities]             = useState([]);
  const [specs, setSpecs]               = useState([]);
  const [regions, setRegions]           = useState([]);
  const [msg, setMsg]                   = useState({ text: '', ok: true });

  useEffect(() => { loadDashboard(); }, []);

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 5000);
  };

  const loadDashboard = async () => {
    try {
      const [st, docs, receps, cl, breakdown, ct, sp] = await Promise.all([
        getAdminStatistics({ company_id, admin_id }),
        getAdminDoctors({ company_id, admin_id }),
        getAdminReceptionists({ company_id, admin_id }),
        getClinics({ company_id, admin_id }),
        getAdminClinicBreakdown({ company_id, admin_id }),  // NEW
        getAdminCities(admin_id),
        getSpecializations(),
      ]);
      const docList   = docs.doctors        || [];
      const recepList = receps.receptionists || [];
      setDoctors(docList);        setFilteredDoctors(docList);
      setReceptionists(recepList); setFilteredReceps(recepList);
      setClinics(cl.clinics || []);
      setClinicStats(breakdown.clinics || []);   // use breakdown for the table
      setCities(ct.cities || []);
      setSpecs(sp.specializations || []);
  
      setStats({
        clinics:    st.total_clinics,
        doctors:    st.total_doctors,
        patients:   st.total_patients,
        queue:      st.active_queue,
      });
      setDoctorStats(docList);
    } catch (e) { console.error(e); }
  };

  const handleTab = async (tab) => {
    setActiveTab(tab);
    if (tab === 'staff-management') { setStaffSubTab('assignments'); }
    if (tab === 'doctors') { setDoctorSubTab('available'); loadAvailDoctors(); }
    if (tab === 'dashboard') loadDashboard();
  };

  const loadAvailDoctors = async () => {
    const data = await getAvailableDoctors();
    setAvailDoctors(data.doctors || []);
  };

  const loadUnavailDoctors = async () => {
    const data = await getUnavailableDoctors(admin_id);
    setUnavailDoctors(data.doctors || []);
  };

  const loadUnavailReqs = async () => {
    const data = await getUnavailabilityRequests(admin_id);
    setUnavailReqs(data.requests || []);
  };

  const handleDoctorSubTab = (sub) => {
    setDoctorSubTab(sub);
    if (sub === 'available') loadAvailDoctors();
    if (sub === 'unavailable') loadUnavailDoctors();
    if (sub === 'unavailability') loadUnavailReqs();
  };

  const searchStaff = (query) => {
    const q = (query || '').toLowerCase();
    setFilteredDoctors(doctors.filter(d =>
      !q || d.name?.toLowerCase().includes(q) || d.clinic_name?.toLowerCase().includes(q)
    ));
    setFilteredReceps(receptionists.filter(r =>
      !q || r.name?.toLowerCase().includes(q) || r.clinic_name?.toLowerCase().includes(q)
    ));
  };

  // Sub-tab pill button
  const SubBtn = ({ id, current, onClick, label }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        current === id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >{label}</button>
  );

  // Main tab button
  const TabBtn = ({ id, icon, label }) => (
    <button
      onClick={() => handleTab(id)}
      id={`admin-tab-${id}`}
      className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-600'
      }`}
    >
      <i className={`${icon} mr-2`}></i>{label}
    </button>
  );

  return (
    <div>
      {/* Regions Display */}
      {regions.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-full mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8 2 5 5 5 9c0 6 7 13 7 13s7-7 7-13c0-4-3-7-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                  <circle cx="12" cy="9" r="2.5" fill="currentColor"></circle>
                </svg>
              </div>
              <h4 className="text-md font-semibold text-gray-800">Your Regions</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {regions.map(r => (
                <span key={r.region_id} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {r.province} &gt; {r.sub_region}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <TabBtn id="dashboard"         icon="fas fa-chart-line"  label="Dashboard" />
        <TabBtn id="staff-management"  icon="fas fa-users"       label="Staff Management" />
        <TabBtn id="doctors"           icon="fas fa-stethoscope" label="Doctors" />
        <TabBtn id="communications"    icon="fas fa-envelope"    label="Communications" />
      </div>

      {msg.text && (
        <div className={`mb-6 p-4 rounded-lg ${msg.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard color="from-primary to-primary-dark" icon="fas fa-hospital"      label="Total Clinics"   value={stats.clinics} />
            <StatCard color="from-green-500 to-green-600"  icon="fas fa-user-md"       label="Total Doctors"   value={stats.doctors} />
            <StatCard color="from-blue-500 to-blue-600"    icon="fas fa-users"         label="Total Patients"  value={stats.patients} />
            <StatCard color="from-orange-500 to-orange-600" icon="fas fa-calendar-check" label="Active Queue" value={stats.queue} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Clinic Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Clinic</th>
                  <th className="text-left py-3 px-4">Doctors</th>
                  <th className="text-left py-3 px-4">Patients</th>
                  <th className="text-left py-3 px-4">Waiting</th>
                </tr></thead>
                <tbody id="admin-clinic-stats">
                  {clinicStats.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4">{c.doctor_count}</td>
                      <td className="py-3 px-4">{c.patient_count}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                          {c.waiting_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Doctor Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Doctor</th>
                  <th className="text-left py-3 px-4">Assigned Clinic</th>
                  <th className="text-left py-3 px-4">Attended</th>
                  <th className="text-left py-3 px-4">Current Queue</th>
                  <th className="text-left py-3 px-4">Missed Shifts</th>
                </tr></thead>
                <tbody id="admin-doctor-stats">
                  {doctorStats.map(d => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{d.name}</td>
                      <td className="py-3 px-4">{d.clinic_name}</td>
                      <td className="py-3 px-4">{d.attended}</td>
                      <td className="py-3 px-4">{d.current_queue}</td>
                      <td className="py-3 px-4">{d.missed_shifts_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STAFF MANAGEMENT TAB ═══ */}
      {activeTab === 'staff-management' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4 flex-wrap">
            <SubBtn id="assignments" current={staffSubTab} onClick={setStaffSubTab} label="Staff Assignments" />
            <SubBtn id="clinic"      current={staffSubTab} onClick={setStaffSubTab} label="Create Clinic" />
            <SubBtn id="receptionist" current={staffSubTab} onClick={setStaffSubTab} label="Add Receptionist" />
            <SubBtn id="doctor"      current={staffSubTab} onClick={setStaffSubTab} label="Add Doctor" />
          </div>

          {/* Assignments */}
          {staffSubTab === 'assignments' && (
            <div>
              <div className="mb-6 flex gap-3">
                <input type="text" onChange={e => searchStaff(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="Search by name, username, or clinic..." />
                <select onChange={e => {
                  const spec = e.target.value;
                  setFilteredDoctors(doctors.filter(d => !spec || d.specialization === spec));
                }} className="w-72 px-4 py-3 border border-gray-300 rounded-lg">
                  <option value="">All specializations</option>
                  {specs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-lg border p-4 mb-6">
                <h4 className="font-bold text-gray-800 mb-4">Receptionists</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Username</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Assigned Clinic</th>
                    </tr></thead>
                    <tbody id="staff-receptionists">
                      {filteredReceps.map(r => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">{r.name}</td>
                          <td className="py-3 px-4">{r.username || '-'}</td>
                          <td className="py-3 px-4">{r.email || '-'}</td>
                          <td className="py-3 px-4">{r.clinic_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-bold text-gray-800 mb-4">Doctors</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Username</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Assigned Clinic</th>
                    </tr></thead>
                    <tbody id="staff-doctors">
                      {filteredDoctors.map(d => (
                        <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">{d.name}</td>
                          <td className="py-3 px-4">{d.username || '-'}</td>
                          <td className="py-3 px-4">{d.email || '-'}</td>
                          <td className="py-3 px-4">{d.clinic_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Create Clinic */}
          {staffSubTab === 'clinic' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Create New Clinic</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Name *</label>
                  <input type="text" id="admin-clinic-name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Shifa Medical Center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location Address *</label>
                  <input type="text" id="admin-clinic-location" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="F-7, Islamabad" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select City *</label>
                  <select id="admin-clinic-city" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select a city...</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.sub_region}, {c.province}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Cities are grouped by Province → Sub-Region</p>
                </div>
              </div>
              <button onClick={async () => {
                const name     = document.getElementById('admin-clinic-name').value.trim();
                const location = document.getElementById('admin-clinic-location').value.trim();
                const city_id  = document.getElementById('admin-clinic-city').value;
                if (!name || !location || !city_id) { showMsg('Please fill all clinic fields', false); return; }
                try {
                  await createClinic({ name, location, company_id, city_id: parseInt(city_id) });
                  showMsg('Clinic created successfully!');
                  loadDashboard();
                } catch (e) { showMsg(e.response?.data?.detail || 'Failed to create clinic', false); }
              }} className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
                Create Clinic
              </button>
            </div>
          )}

          {/* Add Receptionist */}
          {staffSubTab === 'receptionist' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Add Receptionist Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FInput label="Full Name *"  id="admin-recep-name"     placeholder="Sarim Khan" />
                <FInput label="Username *"   id="admin-recep-username" placeholder="sarim.khan" />
                <FInput label="Email *"      id="admin-recep-email"    type="email" placeholder="sarim@clinic.pk" />
                <FInput label="Password *"   id="admin-recep-password" type="password" placeholder="Enter password" />
                <FInput label="Contact *"    id="admin-recep-contact"  placeholder="+92 300-1234567" defaultValue="+92 " />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Clinic *</label>
                  <select id="admin-recep-clinic" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select clinic...</option>
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={async () => {
                const g = id => document.getElementById(id)?.value || '';
                try {
                  await createReceptionist({ name: g('admin-recep-name'), username: g('admin-recep-username'), email: g('admin-recep-email'), password: g('admin-recep-password'), contact: g('admin-recep-contact'), clinic_id: g('admin-recep-clinic') });
                  showMsg('Receptionist account created successfully!');
                } catch (e) { showMsg(e.response?.data?.detail || 'Failed', false); }
              }} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                Create Receptionist Account
              </button>
            </div>
          )}

          {/* Add Doctor */}
          {staffSubTab === 'doctor' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Add Doctor Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FInput label="Full Name *"       id="admin-doctor-name"     placeholder="Ahmed Ali" />
                <FInput label="Username *"        id="admin-doctor-username" placeholder="ahmed.ali" />
                <FInput label="Email *"           id="admin-doctor-email"    type="email" placeholder="ahmed.ali@clinic.pk" />
                <FInput label="Password *"        id="admin-doctor-password" type="password" placeholder="Enter password" />
                <FInput label="License Number *"  id="admin-doctor-license"  placeholder="PMC-12345" />
                <FInput label="Contact *"         id="admin-doctor-contact"  placeholder="+92 300-1234567" defaultValue="+92 " />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Clinic *</label>
                  <select id="admin-doctor-clinic" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select clinic...</option>
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="mt-3 block text-sm font-medium text-gray-700">Specialization *</label>
                  <select id="admin-doctor-specialization" className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-1">
                    <option value="">Select specialization...</option>
                    {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  {DAYS.map(day => (
                    <div key={day} className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{day} Hours</label>
                      <div className="flex gap-2 items-center">
                        <input type="time" id={`admin-doctor-start-time-${day}`} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        <span className="text-gray-600">to</span>
                        <input type="time" id={`admin-doctor-end-time-${day}`} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={async () => {
                const g = id => document.getElementById(id)?.value || '';
                const startTimes = DAYS.map(d => g(`admin-doctor-start-time-${d}`) || null);
                const endTimes   = DAYS.map(d => g(`admin-doctor-end-time-${d}`) || null);
                try {
                  await createDoctor({ name: g('admin-doctor-name'), username: g('admin-doctor-username'), email: g('admin-doctor-email'), password: g('admin-doctor-password'), license_number: g('admin-doctor-license'), contact: g('admin-doctor-contact'), clinic_id: g('admin-doctor-clinic'), specialization_id: parseInt(g('admin-doctor-specialization')), startTimes, endTimes });
                  showMsg('Doctor account created successfully!');
                } catch (e) { showMsg(e.response?.data?.detail || 'Failed', false); }
              }} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                Create Doctor Account
              </button>

              <hr className="my-8" />
              <h4 className="text-lg font-bold text-gray-800 mb-4">Edit Doctor Availability</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <FInput label="Doctor ID *" id="edit-doctor-id" type="number" placeholder="Enter doctor ID" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day *</label>
                  <select id="edit-doctor-day" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select day...</option>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i) => (
                      <option key={d} value={i+1}>{d}</option>
                    ))}
                  </select>
                </div>
                <FInput label="New Start Time *" id="edit-doctor-start-time" type="time" />
                <FInput label="New End Time *"   id="edit-doctor-end-time"   type="time" />
              </div>
              <button onClick={async () => {
                const g = id => document.getElementById(id)?.value || '';
                const doctorId = g('edit-doctor-id');
                const day_of_week = g('edit-doctor-day');
                const startTime = g('edit-doctor-start-time');
                const endTime   = g('edit-doctor-end-time');
                if (!doctorId || !day_of_week) { showMsg('Please fill all fields', false); return; }
                try {
                  await updateDoctorAvailability(doctorId, { day_of_week, startTime, endTime });
                  showMsg("Doctor's availability updated successfully!");
                } catch (e) { showMsg('Update failed', false); }
              }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Update Availability
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ DOCTORS TAB ═══ */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4 flex-wrap">
            <SubBtn id="available"      current={doctorSubTab} onClick={handleDoctorSubTab} label="Available Now" />
            <SubBtn id="unavailable"    current={doctorSubTab} onClick={handleDoctorSubTab} label="Unavailable" />
            <SubBtn id="transfer"       current={doctorSubTab} onClick={d => setDoctorSubTab(d)} label="Transfer Doctor" />
            <SubBtn id="unavailability" current={doctorSubTab} onClick={handleDoctorSubTab} label="Unavailability Requests" />
          </div>

          {doctorSubTab === 'available' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Available Doctors Right Now</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Shift End</th>
                    <th className="text-left py-3 px-4">Current Queue</th>
                    <th className="text-left py-3 px-4">Assigned Clinic</th>
                  </tr></thead>
                  <tbody id="available-doctors">
                    {availDoctors.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-gray-500">No doctors available right now</td></tr>}
                    {availDoctors.map(d => (
                      <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{d.name}</td>
                        <td className="py-3 px-4">{d.shift_end || '-'}</td>
                        <td className="py-3 px-4">{d.current_queue}</td>
                        <td className="py-3 px-4">{d.clinic_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {doctorSubTab === 'unavailable' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Currently Unavailable Doctors</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Clinic</th>
                    <th className="text-left py-3 px-4">Unavailable From</th>
                    <th className="text-left py-3 px-4">Unavailable Until</th>
                    <th className="text-left py-3 px-4">Reason</th>
                  </tr></thead>
                  <tbody id="unavailable-doctors">
                    {unavailDoctors.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No unavailable doctors</td></tr>}
                    {unavailDoctors.map(d => (
                      <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{d.name}</td>
                        <td className="py-3 px-4">{d.clinic_name}</td>
                        <td className="py-3 px-4">-</td><td className="py-3 px-4">-</td><td className="py-3 px-4">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {doctorSubTab === 'transfer' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Transfer Doctor Between Clinics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Doctor *</label>
                  <select id="admin-transfer-doctor" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select doctor...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Clinic *</label>
                  <select id="admin-transfer-clinic" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select clinic...</option>
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={async () => {
                const doctorId = document.getElementById('admin-transfer-doctor')?.value;
                const clinicId = document.getElementById('admin-transfer-clinic')?.value;
                if (!doctorId || !clinicId) { showMsg('Select doctor and new clinic', false); return; }
                try {
                  await transferDoctor({ doctor_id: doctorId, new_clinic_id: clinicId });
                  showMsg('Doctor transferred successfully!');
                } catch (e) { showMsg('Transfer failed', false); }
              }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Transfer Doctor
              </button>
            </div>
          )}

          {doctorSubTab === 'unavailability' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Doctor Unavailability Requests</h4>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800"><i className="fas fa-info-circle mr-2"></i>Review and manage doctor unavailability requests.</p>
              </div>
              <div className="space-y-4" id="admin-unavailability-requests-list">
                {unavailReqs.length === 0 && <p className="text-gray-500 text-center py-8">No pending requests.</p>}
                {unavailReqs.map(r => (
                  <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">{r.doctor_name} — {r.clinic_name}</p>
                        <p className="text-sm text-gray-500">{new Date(r.start_datetime).toLocaleDateString()} → {new Date(r.end_datetime).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">{r.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => { await approveUnavailability(r.id, admin_id); showMsg('Approved.'); loadUnavailReqs(); }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve</button>
                        <button onClick={async () => { const reason = prompt('Rejection reason:'); if (!reason) return; await rejectUnavailability(r.id, admin_id, reason); showMsg('Rejected.'); loadUnavailReqs(); }}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMMUNICATIONS TAB ═══ */}
      {activeTab === 'communications' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4 flex-wrap">
            <SubBtn id="bulletin" current={commsSubTab} onClick={setCommsSubTab} label="Post Bulletin" />
            <SubBtn id="password" current={commsSubTab} onClick={setCommsSubTab} label="Password Reset" />
            <SubBtn id="contact"  current={commsSubTab} onClick={setCommsSubTab} label="Contact Change" />
            <SubBtn id="query"    current={commsSubTab} onClick={setCommsSubTab} label="General Query" />
          </div>

          {commsSubTab === 'bulletin' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Post Health Bulletin</h4>
              <div className="space-y-4 mb-6">
                <FInput label="Title *" id="admin-bulletin-title" placeholder="Dengue Fever Alert" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea id="admin-bulletin-message" rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter bulletin message..."></textarea>
                </div>
              </div>
              <button onClick={async () => {
                const title   = document.getElementById('admin-bulletin-title')?.value?.trim();
                const message = document.getElementById('admin-bulletin-message')?.value?.trim();
                if (!title || !message) { showMsg('Please provide title and message', false); return; }
                try {
                  await postBulletin({ admin_id, title, message });
                  showMsg('Bulletin posted successfully!');
                  document.getElementById('admin-bulletin-title').value = '';
                  document.getElementById('admin-bulletin-message').value = '';
                } catch (e) { showMsg('Failed to post bulletin', false); }
              }} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                Post Bulletin
              </button>
            </div>
          )}

          {commsSubTab === 'password' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Request Password Reset</h4>
              <div className="space-y-4">
                <FInput label="New Password *" id="request-new-password" type="password" placeholder="Enter new password" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Change *</label>
                  <textarea id="request-password-reason" rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Why do you need to change your password?"></textarea>
                </div>
                <button onClick={async () => {
                  const new_password = document.getElementById('request-new-password')?.value;
                  if (!new_password) { showMsg('Please enter new password', false); return; }
                  try { await requestPasswordChange({ admin_id, new_password }); showMsg('Password change request submitted!'); }
                  catch (e) { showMsg('Failed', false); }
                }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Submit Password Reset Request
                </button>
              </div>
            </div>
          )}

          {commsSubTab === 'contact' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Request Contact Number Change</h4>
              <div className="space-y-4">
                <FInput label="New Contact Number *" id="request-new-contact" placeholder="+92 300-1234567" defaultValue="+92 " />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Change *</label>
                  <textarea id="request-contact-reason" rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Why do you need to change your contact?"></textarea>
                </div>
                <button onClick={async () => {
                  const new_contact = document.getElementById('request-new-contact')?.value;
                  if (!new_contact) { showMsg('Please enter new contact', false); return; }
                  try { await requestContactChange({ admin_id, new_contact }); showMsg('Contact change request submitted!'); }
                  catch (e) { showMsg('Failed', false); }
                }} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                  Submit Contact Change Request
                </button>
              </div>
            </div>
          )}

          {commsSubTab === 'query' && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Send General Query/Message</h4>
              <p className="text-sm text-gray-600 mb-4">Send any message or query to the SuperAdmin.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Query/Message *</label>
                  <textarea id="request-general-query" rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Write your query or message here..."></textarea>
                </div>
                <button onClick={async () => {
                  const query = document.getElementById('request-general-query')?.value?.trim();
                  if (!query) { showMsg('Please write your query', false); return; }
                  try { await requestGeneralQuery({ admin_id, query }); showMsg('Query submitted!'); document.getElementById('request-general-query').value = ''; }
                  catch (e) { showMsg('Failed', false); }
                }} className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">
                  Submit Query
                </button>
              </div>
            </div>
          )}
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