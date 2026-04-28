import { useEffect, useState } from 'react';
import {
  approveChangeRequest,
  createAdmin,
  deleteAdmin,
  getAllAdmins,
  getAllCompanies,
  getAllRegions,
  getAnalytics,
  getChangeRequests,
  getCompanyClinics,
  getCompanyAdminsWithRegions,
  getNextCompanyRegistrationNumber,
  getSuperadminComplaints,
  getSuperadminDashboard,
  getSystemUsability,
  registerCompany,
  rejectChangeRequest,
  updateAdmin,
  updateAdminRegions,
  updateCompany,
  updateCompanyStatus,
  updateSuperadminComplaintStatus,
} from '../api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import InlineErrors from '../components/InlineErrors';
import {
  isValidEmail,
  isValidPhone,
  sanitizeEmailInput,
  sanitizePhoneInput,
} from '../utils/formValidation';
import { buildTableState, nextSort } from '../utils/table';

const DEFAULT_COMPANY = {
  name: '',
  email: '',
  contact: '',
  registration_number: '',
  address: '',
  subscription_plan: 'purchase',
};

const DEFAULT_ADMIN = {
  name: '',
  username: '',
  email: '',
  password: '',
  contact: '',
  company_id: '',
};

export default function Superadmin() {
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [regions, setRegions] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [changeRequests, setChangeRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [complaintStatus, setComplaintStatus] = useState('all');
  const [usability, setUsability] = useState({ recent_logins: [], role_logins: [], unread_notifications: [], active_entities: {} });
  const [companyForm, setCompanyForm] = useState(DEFAULT_COMPANY);
  const [companyErrors, setCompanyErrors] = useState({});
  const [adminForm, setAdminForm] = useState(DEFAULT_ADMIN);
  const [adminErrors, setAdminErrors] = useState({});
  const [selectedRegionIds, setSelectedRegionIds] = useState([]);
  const [companyModal, setCompanyModal] = useState(null);
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [adminModal, setAdminModal] = useState(null);
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [adminRegionModal, setAdminRegionModal] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [highlightedAdminId, setHighlightedAdminId] = useState(null);
  const [companyTable, setCompanyTable] = useState({ query: '', sortKey: 'name', sortDirection: 'asc', page: 1 });
  const [adminTable, setAdminTable] = useState({ query: '', sortKey: 'name', sortDirection: 'asc', page: 1 });
  const [complaintTable, setComplaintTable] = useState({ query: '', sortKey: 'updated_at', sortDirection: 'desc', page: 1 });

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
    if (activeTab === 'change-requests') loadChangeRequests();
    if (activeTab === 'complaints') loadComplaints(complaintStatus);
  }, [activeTab]);

  const loadBaseData = async () => {
    const [dashboard, companyRes, adminRes, regionRes, usabilityRes] = await Promise.all([
      getSuperadminDashboard(),
      getAllCompanies(),
      getAllAdmins(),
      getAllRegions(),
      getSystemUsability(),
    ]);
    setStats(dashboard);
    setCompanies(companyRes.companies || []);
    setAdmins(adminRes.admins || []);
    setRegions(regionRes.regions || []);
    setUsability({
      recent_logins: usabilityRes.recent_logins || [],
      role_logins: usabilityRes.role_logins || [],
      unread_notifications: usabilityRes.unread_notifications || [],
      active_entities: usabilityRes.active_entities || {},
    });
  };

  const loadGeneratedRegistrationNumber = async () => {
    const data = await getNextCompanyRegistrationNumber();
    setCompanyForm((current) => ({ ...current, registration_number: data.registration_number || '' }));
  };

  const loadAnalytics = async () => {
    const data = await getAnalytics();
    setAnalytics(data);
  };

  const loadChangeRequests = async () => {
    const data = await getChangeRequests();
    setChangeRequests(data.requests || []);
  };

  const loadComplaints = async (status) => {
    const data = await getSuperadminComplaints(status);
    setComplaints(data.complaints || []);
  };

  const validateCompanyForm = () => {
    const errors = {};
    if (!companyForm.name.trim()) errors.name = 'Company name is required.';
    if (!companyForm.email.trim()) errors.email = 'Company email is required.';
    else if (!isValidEmail(companyForm.email)) errors.email = 'Enter a valid email address.';
    if (!companyForm.contact.trim()) errors.contact = 'Contact number is required.';
    else if (!isValidPhone(companyForm.contact)) errors.contact = 'Use an 11-digit mobile number like 03001234567.';
    if (!companyForm.address.trim()) errors.address = 'Address is required.';
    if (!companyForm.registration_number.trim()) errors.registration_number = 'Registration number is required.';
    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAdminForm = () => {
    const errors = {};
    if (!adminForm.name.trim()) errors.name = 'Admin name is required.';
    if (!adminForm.username.trim()) errors.username = 'Username is required.';
    if (!adminForm.email.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(adminForm.email)) errors.email = 'Enter a valid email address.';
    if (!adminModal && !adminForm.password.trim()) errors.password = 'Password is required.';
    if (!adminForm.contact.trim()) errors.contact = 'Contact number is required.';
    else if (!isValidPhone(adminForm.contact)) errors.contact = 'Use an 11-digit mobile number like 03001234567.';
    if (!adminForm.company_id) errors.company_id = 'Company selection is required.';
    setAdminErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCompanySubmit = async () => {
    if (!validateCompanyForm()) return;

    try {
      if (companyModal) {
        await updateCompany(companyModal.id, companyForm);
        pushToast({ title: 'Company updated', message: `${companyForm.name} was updated successfully.` });
      } else {
        await registerCompany(companyForm);
        pushToast({ title: 'Company registered', message: `${companyForm.name} was added successfully.` });
      }
      setCompanyForm(DEFAULT_COMPANY);
      setCompanyErrors({});
      setCompanyModal(null);
      setCompanyFormOpen(false);
      await Promise.all([loadBaseData(), loadGeneratedRegistrationNumber()]);
      setActiveTab('companies');
    } catch (error) {
      pushToast({ title: 'Company action failed', message: error.response?.data?.detail || 'Please review the form and try again.', tone: 'error' });
    }
  };

  const handleAdminSubmit = async () => {
    if (!validateAdminForm()) return;

    try {
      const submittedAdminName = adminForm.name;
      if (adminModal) {
        await updateAdmin(adminModal.id, {
          name: adminForm.name,
          username: adminForm.username,
          contact: adminForm.contact,
        });
        await updateAdminRegions(adminModal.id, selectedRegionIds);
        pushToast({ title: 'Admin updated', message: `${adminForm.name} was updated successfully.` });
      } else {
        const result = await createAdmin({
          ...adminForm,
          company_id: Number(adminForm.company_id),
          region_ids: selectedRegionIds,
        });
        setHighlightedAdminId(result?.admin?.id || result?.admin_id || null);
        setAdminTable((current) => ({ ...current, query: submittedAdminName, page: 1 }));
        pushToast({ title: 'Admin created', message: `${adminForm.name} was created successfully.` });
      }

      setAdminForm(DEFAULT_ADMIN);
      setAdminErrors({});
      setSelectedRegionIds([]);
      setAdminModal(null);
      setAdminFormOpen(false);
      await loadBaseData();
      setActiveTab('admins');
    } catch (error) {
      pushToast({ title: 'Admin action failed', message: error.response?.data?.detail || 'Please review the form and try again.', tone: 'error' });
    }
  };

  const openCompanyEditor = (company) => {
    setCompanyModal(company);
    setCompanyForm({
      name: company.name || '',
      email: sanitizeEmailInput(company.email || ''),
      contact: sanitizePhoneInput(company.contact || ''),
      registration_number: company.registration_number || '',
      address: company.address || '',
      subscription_plan: company.subscription_plan || 'purchase',
    });
    setCompanyErrors({});
    setCompanyFormOpen(true);
  };

  const openAdminEditor = (admin) => {
    setAdminModal(admin);
    setAdminForm({
      name: admin.name || '',
      username: admin.username || '',
      email: sanitizeEmailInput(admin.email || ''),
      password: '',
      contact: sanitizePhoneInput(admin.contact || ''),
      company_id: admin.company_id || '',
    });
    setSelectedRegionIds(Array.isArray(admin.regions) ? admin.regions.filter(Boolean).map((region) => region.region_id) : []);
    setAdminErrors({});
    setAdminFormOpen(true);
  };

  const openCompanyDetails = async (company) => {
    const [clinicRes, adminRes] = await Promise.all([
      getCompanyClinics(company.id),
      getCompanyAdminsWithRegions(company.id),
    ]);
    setCompanyDetails({
      ...company,
      clinics: clinicRes.clinics || [],
      admins: adminRes.admins || [],
    });
  };

  const companyRows = buildTableState(companies, {
    ...companyTable,
    pageSize: 5,
    filterFn: (company, query) => {
      const value = query.toLowerCase();
      return (
        company.name?.toLowerCase().includes(value) ||
        company.email?.toLowerCase().includes(value) ||
        company.status?.toLowerCase().includes(value)
      );
    },
  });

  const adminRows = buildTableState(admins, {
    ...adminTable,
    pageSize: 5,
    filterFn: (admin, query) => {
      const value = query.toLowerCase();
      return (
        admin.name?.toLowerCase().includes(value) ||
        admin.username?.toLowerCase().includes(value) ||
        admin.company_name?.toLowerCase().includes(value)
      );
    },
  });

  const complaintRows = buildTableState(complaints, {
    ...complaintTable,
    pageSize: 6,
    filterFn: (complaint, query) => {
      const value = query.toLowerCase();
      return (
        complaint.title?.toLowerCase().includes(value) ||
        complaint.company_name?.toLowerCase().includes(value) ||
        complaint.clinic_name?.toLowerCase().includes(value) ||
        complaint.patient_name?.toLowerCase().includes(value) ||
        complaint.status?.toLowerCase().includes(value)
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto border-b border-gray-200 pb-1">
        {[
          ['dashboard', 'fa-solid fa-chart-line', 'Dashboard'],
          ['companies', 'fa-solid fa-building', 'Companies'],
          ['admins', 'fa-solid fa-users', 'Admins'],
          ['analytics', 'fa-solid fa-chart-pie', 'Analytics'],
          ['complaints', 'fa-solid fa-life-ring', 'Complaints'],
          ['change-requests', 'fa-solid fa-file-signature', 'Change Requests'],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-600'}`}
            onClick={() => setActiveTab(id)}
          >
            <span className="inline-flex items-center gap-2">
              <i className={`${icon} w-4 text-center`} aria-hidden="true" />
              <span>{label}</span>
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Companies" value={stats.total_companies} color="from-rose-500 to-rose-600" />
            <StatCard label="Total Admins" value={stats.total_admins} color="from-blue-500 to-blue-600" />
            <StatCard label="Total Clinics" value={stats.total_clinics} color="from-emerald-500 to-emerald-600" />
            <StatCard label="Total Doctors" value={stats.total_doctors} color="from-amber-500 to-amber-600" />
          </div>

          <Panel
            title="Company Breakdown"
            actions={(
              <input
                type="text"
                value={companyTable.query}
                onChange={(event) => setCompanyTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search companies"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <SortableHeader
                      label="Company"
                      sortKey="name"
                      tableState={companyTable}
                      onSort={(next) => setCompanyTable((current) => ({ ...current, ...next }))}
                    />
                    <th className="px-4 py-3">Admins</th>
                    <th className="px-4 py-3">Clinics</th>
                    <th className="px-4 py-3">Doctors</th>
                    <th className="px-4 py-3">Patients</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companyRows.rows.map((company) => (
                    <tr key={company.id} className="border-b border-gray-100 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{company.name}</td>
                      <td className="px-4 py-3">{company.admin_count}</td>
                      <td className="px-4 py-3">{company.clinic_count}</td>
                      <td className="px-4 py-3">{company.doctor_count}</td>
                      <td className="px-4 py-3">{company.patient_count}</td>
                      <td className="px-4 py-3">
                        <StatusPill value={company.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={companyRows.page}
              totalPages={companyRows.totalPages}
              onChange={(page) => setCompanyTable((current) => ({ ...current, page }))}
            />
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Companies" value={usability.active_entities?.active_companies} color="from-rose-500 to-rose-600" />
            <StatCard label="Active Clinics" value={usability.active_entities?.active_clinics} color="from-blue-500 to-blue-600" />
            <StatCard label="Active Doctors" value={usability.active_entities?.active_doctors} color="from-emerald-500 to-emerald-600" />
            <StatCard label="Active Receptionists" value={usability.active_entities?.active_receptionists} color="from-amber-500 to-amber-600" />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Recent Login Activity">
              <div className="space-y-3">
                {(usability.recent_logins || []).map((item) => (
                  <BarRow key={item.login_date} label={new Date(item.login_date).toLocaleDateString()} value={Number(item.logins || 0)} />
                ))}
              </div>
            </Panel>
            <Panel title="Logins By Role">
              <div className="space-y-3">
                {(usability.role_logins || []).map((item) => (
                  <BarRow key={item.role} label={item.role} value={Number(item.logins || 0)} />
                ))}
              </div>
            </Panel>
            <Panel title="Unread Notifications">
              <div className="space-y-3">
                {(usability.unread_notifications || []).map((item) => (
                  <BarRow key={item.recipient_type} label={item.recipient_type} value={Number(item.unread || 0)} />
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'companies' ? (
        <Panel
          title="Registered Companies"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={companyTable.query}
                onChange={(event) => setCompanyTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search companies"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={async () => {
                  setCompanyModal(null);
                  setCompanyForm(DEFAULT_COMPANY);
                  setCompanyErrors({});
                  await loadGeneratedRegistrationNumber();
                  setCompanyFormOpen(true);
                }}
              >
                Add Company
              </button>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Company" sortKey="name" tableState={companyTable} onSort={(next) => setCompanyTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Registration No.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyRows.rows.map((company) => (
                  <tr key={company.id} className="border-b border-gray-100 text-sm">
                    <td className="px-4 py-3 font-semibold text-gray-900">{company.name}</td>
                    <td className="px-4 py-3">{company.email}</td>
                    <td className="px-4 py-3">{company.subscription_plan}</td>
                    <td className="px-4 py-3">{company.registration_number}</td>
                    <td className="px-4 py-3"><StatusPill value={company.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton label="View" onClick={() => openCompanyDetails(company)} />
                        <ActionButton label="Edit" tone="secondary" onClick={() => openCompanyEditor(company)} />
                        <ActionButton
                          label={company.status === 'active' ? 'Deactivate' : 'Activate'}
                          tone={company.status === 'active' ? 'danger' : 'success'}
                          onClick={() => setConfirmState({
                            title: `${company.status === 'active' ? 'Deactivate' : 'Activate'} ${company.name}?`,
                            message: 'This updates company access without deleting any existing data.',
                            confirmLabel: company.status === 'active' ? 'Deactivate Company' : 'Activate Company',
                            onConfirm: async () => {
                              await updateCompanyStatus(company.id, company.status === 'active' ? 'inactive' : 'active');
                              await loadBaseData();
                              pushToast({ title: 'Company status updated', message: `${company.name} is now ${company.status === 'active' ? 'inactive' : 'active'}.` });
                              setConfirmState(null);
                            },
                          })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={companyRows.page}
            totalPages={companyRows.totalPages}
            onChange={(page) => setCompanyTable((current) => ({ ...current, page }))}
          />
        </Panel>
      ) : null}

      {activeTab === 'admins' ? (
        <Panel
          title="Admins"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={adminTable.query}
                onChange={(event) => setAdminTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search admins"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => {
                  setAdminModal(null);
                  setAdminForm(DEFAULT_ADMIN);
                  setAdminErrors({});
                  setSelectedRegionIds([]);
                  setAdminFormOpen(true);
                }}
              >
                Add Admin
              </button>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Name" sortKey="name" tableState={adminTable} onSort={(next) => setAdminTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Regions</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminRows.rows.map((admin) => (
                  <tr
                    key={admin.id}
                    className={`border-b border-gray-100 text-sm ${highlightedAdminId === admin.id ? 'bg-emerald-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{admin.name}</td>
                    <td className="px-4 py-3">{admin.username}</td>
                    <td className="px-4 py-3">{admin.company_name}</td>
                    <td className="px-4 py-3">{admin.contact || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(admin.regions || []).filter(Boolean).slice(0, 3).map((region) => (
                          <span key={region.region_id} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {region.province} &gt; {region.sub_region}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton label="Edit" tone="secondary" onClick={() => openAdminEditor(admin)} />
                        <ActionButton
                          label="Delete"
                          tone="danger"
                          onClick={() => setConfirmState({
                            title: `Delete ${admin.name}?`,
                            message: 'This will permanently remove the admin account. Company data will be preserved.',
                            confirmLabel: 'Delete Admin',
                            onConfirm: async () => {
                              await deleteAdmin(admin.id);
                              await loadBaseData();
                              pushToast({ title: 'Admin deleted', message: `${admin.name} was deleted successfully.` });
                              setConfirmState(null);
                            },
                          })}
                        />
                        <ActionButton label="Regions" onClick={() => {
                          setAdminRegionModal(admin);
                          setSelectedRegionIds((admin.regions || []).filter(Boolean).map((region) => region.region_id));
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={adminRows.page}
            totalPages={adminRows.totalPages}
            onChange={(page) => setAdminTable((current) => ({ ...current, page }))}
          />
        </Panel>
      ) : null}

      {activeTab === 'analytics' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Regional Distribution">
            <div className="space-y-3">
              {(analytics.by_region || []).slice(0, 8).map((item) => (
                <BarRow key={`${item.province}-${item.sub_region}`} label={`${item.province} / ${item.sub_region}`} value={Number(item.appointments || 0)} />
              ))}
            </div>
          </Panel>
          <Panel title="Monthly Appointment Trend">
            <div className="space-y-3">
              {(analytics.monthly_trend || []).map((item) => (
                <BarRow key={item.month} label={new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} value={Number(item.appointments || 0)} />
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'complaints' ? (
        <Panel
          title="System Complaints Management"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={complaintTable.query}
                onChange={(event) => setComplaintTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search complaints"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <select
                value={complaintStatus}
                onChange={async (event) => {
                  const nextStatus = event.target.value;
                  setComplaintStatus(nextStatus);
                  await loadComplaints(nextStatus);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Title" sortKey="title" tableState={complaintTable} onSort={(next) => setComplaintTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Clinic</th>
                  <th className="px-4 py-3">Patient</th>
                  <SortableHeader label="Status" sortKey="status" tableState={complaintTable} onSort={(next) => setComplaintTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Updated" sortKey="updated_at" tableState={complaintTable} onSort={(next) => setComplaintTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaintRows.rows.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-gray-100 align-top text-sm">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{complaint.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{complaint.description}</p>
                    </td>
                    <td className="px-4 py-3">{complaint.company_name}</td>
                    <td className="px-4 py-3">{complaint.clinic_name}</td>
                    <td className="px-4 py-3">{complaint.patient_name || 'No patient linked'}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <StatusPill value={complaint.status} />
                        {complaint.resolved_by_role ? <p className="text-xs text-gray-500">Resolved by {complaint.resolved_by_role}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{complaint.updated_at ? new Date(complaint.updated_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {complaint.status !== 'resolved' ? (
                          <ActionButton
                            label="Resolve"
                            tone="success"
                            onClick={async () => {
                              await updateSuperadminComplaintStatus(complaint.id, {
                                status: 'resolved',
                                resolution_note: 'Resolved in superadmin portal',
                              });
                              await loadComplaints(complaintStatus);
                              pushToast({ title: 'Complaint resolved', message: `${complaint.title} was marked resolved.` });
                            }}
                          />
                        ) : null}
                        {complaint.status !== 'closed' ? (
                          <ActionButton
                            label="Close"
                            tone="secondary"
                            onClick={async () => {
                              await updateSuperadminComplaintStatus(complaint.id, {
                                status: 'closed',
                                resolution_note: 'Closed in superadmin portal',
                              });
                              await loadComplaints(complaintStatus);
                              pushToast({ title: 'Complaint closed', message: `${complaint.title} was closed.` });
                            }}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={complaintRows.page}
            totalPages={complaintRows.totalPages}
            onChange={(page) => setComplaintTable((current) => ({ ...current, page }))}
          />
        </Panel>
      ) : null}

      {activeTab === 'change-requests' ? (
        <Panel title="Pending Change Requests">
          <div className="space-y-4">
            {changeRequests.length === 0 ? <p className="text-sm text-gray-500">No pending requests.</p> : null}
            {changeRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{request.admin_name} • {request.company_name}</p>
                    <p className="text-sm text-gray-500">{request.request_type}</p>
                    <p className="mt-2 text-sm text-gray-700">{request.reason || request.requested_data}</p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton label="Approve" tone="success" onClick={async () => {
                      await approveChangeRequest(request.id);
                      await loadChangeRequests();
                      pushToast({ title: 'Request approved', message: 'The change request has been applied.' });
                    }} />
                    <ActionButton label="Reject" tone="danger" onClick={() => setConfirmState({
                      title: 'Reject request?',
                      message: 'This request will be marked as rejected with a standard note.',
                      confirmLabel: 'Reject Request',
                      onConfirm: async () => {
                        await rejectChangeRequest(request.id, 'Rejected by superadmin');
                        await loadChangeRequests();
                        pushToast({ title: 'Request rejected', message: 'The change request was rejected.' });
                        setConfirmState(null);
                      },
                    })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {companyFormOpen ? (
        <Modal title={companyModal ? 'Edit Company' : 'Add Company'} onClose={async () => {
          setCompanyModal(null);
          setCompanyForm(DEFAULT_COMPANY);
          setCompanyErrors({});
          setCompanyFormOpen(false);
          await loadGeneratedRegistrationNumber();
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company Name" value={companyForm.name} error={companyErrors.name} onChange={(value) => setCompanyForm((current) => ({ ...current, name: value }))} />
            <Field label="Company Email" type="email" placeholder="company@example.com" value={companyForm.email} error={companyErrors.email} onChange={(value) => setCompanyForm((current) => ({ ...current, email: sanitizeEmailInput(value) }))} />
            <Field label="Contact Number" placeholder="03001234567" inputMode="numeric" value={companyForm.contact} error={companyErrors.contact} onChange={(value) => setCompanyForm((current) => ({ ...current, contact: sanitizePhoneInput(value) }))} />
            <Field label="Registration Number" value={companyForm.registration_number} error={companyErrors.registration_number} readOnly onChange={() => {}} />
            <SelectField
              label="Subscription Plan"
              value={companyForm.subscription_plan}
              onChange={(value) => setCompanyForm((current) => ({ ...current, subscription_plan: value }))}
              options={[
                ['purchase', 'Purchase'],
                ['rental', 'Rental'],
                ['per_consultation_with_doctor', 'Per Consultation with Doctor'],
                ['per_consultation_without_doctor', 'Per Consultation without Doctor'],
              ]}
            />
            <TextAreaField label="Address" value={companyForm.address} error={companyErrors.address} onChange={(value) => setCompanyForm((current) => ({ ...current, address: value }))} />
          </div>
          <div className="mt-4 space-y-4">
            <InlineErrors errors={companyErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleCompanySubmit}>
                {companyModal ? 'Save Company Changes' : 'Register Company'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                onClick={async () => {
                  setCompanyModal(null);
                  setCompanyForm(DEFAULT_COMPANY);
                  setCompanyErrors({});
                  setCompanyFormOpen(false);
                  await loadGeneratedRegistrationNumber();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {adminFormOpen ? (
        <Modal title={adminModal ? 'Edit Admin' : 'Add Admin'} onClose={() => {
          setAdminModal(null);
          setAdminForm(DEFAULT_ADMIN);
          setAdminErrors({});
          setSelectedRegionIds([]);
          setAdminFormOpen(false);
        }}>
          <AutofillShield />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={adminForm.name} error={adminErrors.name} onChange={(value) => setAdminForm((current) => ({ ...current, name: value }))} />
            <Field label="Username" value={adminForm.username} error={adminErrors.username} onChange={(value) => setAdminForm((current) => ({ ...current, username: value }))} />
            <Field label="Email" type="email" inputName="admin_create_email" autoComplete="off" placeholder="admin@example.com" value={adminForm.email} error={adminErrors.email} readOnly={Boolean(adminModal)} onChange={(value) => setAdminForm((current) => ({ ...current, email: sanitizeEmailInput(value) }))} />
            <Field label="Password" type="password" inputName="admin_create_password" autoComplete="new-password" value={adminForm.password} error={adminErrors.password} readOnly={Boolean(adminModal)} onChange={(value) => setAdminForm((current) => ({ ...current, password: value }))} />
            <Field label="Contact" placeholder="03001234567" inputMode="numeric" value={adminForm.contact} error={adminErrors.contact} onChange={(value) => setAdminForm((current) => ({ ...current, contact: sanitizePhoneInput(value) }))} />
            <SelectField
              label="Company"
              value={adminForm.company_id}
              onChange={(value) => setAdminForm((current) => ({ ...current, company_id: value }))}
              error={adminErrors.company_id}
              options={companies.map((company) => [String(company.id), company.name])}
            />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Assigned Regions</p>
            <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-4 md:grid-cols-2">
              {regions.map((region) => (
                <label key={region.region_id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedRegionIds.includes(region.region_id)}
                    onChange={() => {
                      setSelectedRegionIds((current) => (
                        current.includes(region.region_id)
                          ? current.filter((value) => value !== region.region_id)
                          : [...current, region.region_id]
                      ));
                    }}
                  />
                  <span>{region.province} &gt; {region.sub_region}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <InlineErrors errors={adminErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleAdminSubmit}>
                {adminModal ? 'Save Admin Changes' : 'Create Admin'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  setAdminModal(null);
                  setAdminForm(DEFAULT_ADMIN);
                  setAdminErrors({});
                  setSelectedRegionIds([]);
                  setAdminFormOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={confirmState?.onConfirm || (() => {})}
        onCancel={() => setConfirmState(null)}
      />

      {companyDetails ? (
        <Modal title={companyDetails.name} onClose={() => setCompanyDetails(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Email" value={companyDetails.email} />
            <Detail label="Contact" value={companyDetails.contact} />
            <Detail label="Plan" value={companyDetails.subscription_plan} />
            <Detail label="Registration No." value={companyDetails.registration_number} />
          </div>
          <Section title={`Clinics (${companyDetails.clinics.length})`}>
            {companyDetails.clinics.map((clinic) => (
              <div key={clinic.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {clinic.name} • {clinic.city_name}, {clinic.province}
              </div>
            ))}
          </Section>
          <Section title={`Admins (${companyDetails.admins.length})`}>
            {companyDetails.admins.map((admin) => (
              <div key={admin.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {admin.name} • {admin.username}
              </div>
            ))}
          </Section>
        </Modal>
      ) : null}

      {adminRegionModal ? (
        <Modal title={`Edit Regions • ${adminRegionModal.name}`} onClose={() => setAdminRegionModal(null)}>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-4 md:grid-cols-2">
            {regions.map((region) => (
              <label key={region.region_id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedRegionIds.includes(region.region_id)}
                  onChange={() => {
                    setSelectedRegionIds((current) => (
                      current.includes(region.region_id)
                        ? current.filter((value) => value !== region.region_id)
                        : [...current, region.region_id]
                    ));
                  }}
                />
                <span>{region.province} &gt; {region.sub_region}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
              onClick={async () => {
                await updateAdminRegions(adminRegionModal.id, selectedRegionIds);
                await loadBaseData();
                setAdminRegionModal(null);
                pushToast({ title: 'Regions updated', message: `${adminRegionModal.name}'s regions were updated.` });
              }}
            >
              Save Regions
            </button>
            <button type="button" className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200" onClick={() => setAdminRegionModal(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Panel({ title, actions, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-lg`}>
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value ?? '-'}</p>
    </div>
  );
}

function StatusPill({ value }) {
  const styles = value === 'active' || value === 'approved' || value === 'resolved'
    ? 'bg-emerald-100 text-emerald-700'
    : value === 'inactive' || value === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{value}</span>;
}

function ActionButton({ label, onClick, tone = 'primary' }) {
  const styles = tone === 'danger'
    ? 'bg-red-100 text-red-700 hover:bg-red-200'
    : tone === 'secondary'
      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        : 'bg-blue-100 text-blue-700 hover:bg-blue-200';
  return (
    <button type="button" className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${styles}`} onClick={onClick}>
      {label}
    </button>
  );
}

function AutofillShield() {
  return (
    <div className="hidden" aria-hidden="true">
      <input type="text" name="username" autoComplete="username" tabIndex="-1" readOnly />
      <input type="password" name="password" autoComplete="current-password" tabIndex="-1" readOnly />
    </div>
  );
}

function Field({ label, value, onChange, error, type = 'text', readOnly = false, autoComplete = 'off', inputName, placeholder, inputMode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        name={inputName}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'} ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function TextAreaField({ label, value, onChange, error }) {
  return (
    <label className="block text-sm md:col-span-2">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <textarea
        rows="4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'}`}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, error, options }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'}`}
      >
        <option value="">Select an option</option>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
      <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

function SortableHeader({ label, sortKey, tableState, onSort }) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold"
        onClick={() => onSort(nextSort(tableState.sortKey, tableState.sortDirection, sortKey))}
      >
        {label}
        <span className="text-xs">{tableState.sortKey === sortKey ? (tableState.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  );
}

function BarRow({ label, value }) {
  const width = Math.max(8, Math.min(100, value));
  return (
    <div className="grid grid-cols-[180px_1fr_60px] items-center gap-3 text-sm">
      <span className="truncate text-gray-600">{label}</span>
      <div className="h-3 rounded-full bg-gray-100">
        <div className="h-3 rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-semibold text-gray-700">{value}</span>
    </div>
  );
}
