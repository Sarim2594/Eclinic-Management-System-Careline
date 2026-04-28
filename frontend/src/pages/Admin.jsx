import { useEffect, useState } from 'react';
import {
  approveUnavailability,
  createClinic,
  createDoctor,
  createReceptionist,
  deleteBulletin,
  getAdminAppointments,
  getAdminCities,
  getAdminClinicBreakdown,
  getAdminComplaints,
  getAdminDoctors,
  getAdminReports,
  getAdminReceptionists,
  getAdminStatistics,
  getBulletinsByAdmin,
  getClinics,
  getDoctorRegionChangeRequests,
  getSpecializations,
  getUnavailabilityRequests,
  postBulletin,
  rejectUnavailability,
  reviewDoctorRegionChangeRequest,
  updateClinic,
  updateComplaintStatus,
  updateDoctorProfile,
  updateDoctorStatus,
  updateReceptionistProfile,
  updateReceptionistStatus,
} from '../api';
import { useAuth } from '../context/AuthContext';
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

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const createOperatingHours = () => WEEKDAY_LABELS.reduce((accumulator, day) => {
  accumulator[day] = { open: '', close: '' };
  return accumulator;
}, {});

const EMPTY_DOCTOR = {
  name: '',
  username: '',
  email: '',
  password: '',
  contact: '',
  clinic_id: '',
  license_number: '',
  specialization_id: '',
  startTimes: Array(7).fill(''),
  endTimes: Array(7).fill(''),
};

const EMPTY_RECEPTIONIST = {
  name: '',
  username: '',
  email: '',
  password: '',
  contact: '',
  clinic_id: '',
};

const EMPTY_CLINIC = {
  name: '',
  location: '',
  city_id: '',
  status: 'active',
  operating_hours: createOperatingHours(),
};

const LIVE_REFRESH_MS = 5000;

export default function Admin() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const { admin_id, company_id } = user;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [clinics, setClinics] = useState([]);
  const [clinicBreakdown, setClinicBreakdown] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentStatus, setAppointmentStatus] = useState('all');
  const [complaints, setComplaints] = useState([]);
  const [complaintStatus, setComplaintStatus] = useState('all');
  const [reports, setReports] = useState({ performance: [], appointment_summary: [], complaint_summary: [] });
  const [bulletinForm, setBulletinForm] = useState({ title: '', message: '' });
  const [bulletins, setBulletins] = useState([]);
  const [unavailabilityRequests, setUnavailabilityRequests] = useState([]);
  const [regionChangeRequests, setRegionChangeRequests] = useState([]);
  const [cities, setCities] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);
  const [doctorErrors, setDoctorErrors] = useState({});
  const [doctorEditor, setDoctorEditor] = useState(null);
  const [doctorFormOpen, setDoctorFormOpen] = useState(false);
  const [receptionistForm, setReceptionistForm] = useState(EMPTY_RECEPTIONIST);
  const [receptionistErrors, setReceptionistErrors] = useState({});
  const [receptionistEditor, setReceptionistEditor] = useState(null);
  const [receptionistFormOpen, setReceptionistFormOpen] = useState(false);
  const [clinicForm, setClinicForm] = useState(EMPTY_CLINIC);
  const [clinicErrors, setClinicErrors] = useState({});
  const [clinicEditor, setClinicEditor] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [doctorTable, setDoctorTable] = useState({ query: '', page: 1 });
  const [receptionistTable, setReceptionistTable] = useState({ query: '', page: 1 });
  const [clinicTable, setClinicTable] = useState({ query: '', sortKey: 'name', sortDirection: 'asc', page: 1 });
  const [reportPerformanceTable, setReportPerformanceTable] = useState({ query: '', sortKey: 'name', sortDirection: 'asc', page: 1 });
  const [reportAppointmentTable, setReportAppointmentTable] = useState({ query: '', page: 1 });
  const [reportComplaintTable, setReportComplaintTable] = useState({ query: '', page: 1 });

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (activeTab === 'appointments') loadAppointments(appointmentStatus);
    if (activeTab === 'operations') {
      loadUnavailabilityQueue();
      loadRegionChangeQueue();
    }
    if (activeTab === 'complaints') loadComplaints(complaintStatus);
    if (activeTab === 'communications') loadBulletins();
  }, [activeTab]);

  useEffect(() => {
    const refreshPortal = async () => {
      await loadBaseData();

      if (activeTab === 'appointments') {
        await loadAppointments(appointmentStatus);
      }
      if (activeTab === 'operations') {
        await Promise.all([loadUnavailabilityQueue(), loadRegionChangeQueue()]);
      }
      if (activeTab === 'complaints') {
        await loadComplaints(complaintStatus);
      }
      if (activeTab === 'communications') {
        await loadBulletins();
      }
    };

    const interval = setInterval(() => {
      refreshPortal().catch((error) => {
        console.error('Failed to refresh admin portal', error);
      });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [activeTab, appointmentStatus, complaintStatus, admin_id, company_id]);

  const loadBaseData = async () => {
    const [statsRes, doctorRes, receptionistRes, clinicRes, breakdownRes, cityRes, specializationRes, reportRes] = await Promise.all([
      getAdminStatistics({ company_id, admin_id }),
      getAdminDoctors({ company_id, admin_id }),
      getAdminReceptionists({ company_id, admin_id }),
      getClinics({ company_id, admin_id }),
      getAdminClinicBreakdown({ company_id, admin_id }),
      getAdminCities(admin_id),
      getSpecializations(),
      getAdminReports(),
    ]);

    setStats({
      clinics: statsRes.total_clinics,
      doctors: statsRes.total_doctors,
      patients: statsRes.total_patients,
      queue: statsRes.active_queue,
    });
    setDoctors(doctorRes.doctors || []);
    setReceptionists(receptionistRes.receptionists || []);
    setClinics(clinicRes.clinics || []);
    setClinicBreakdown(breakdownRes.clinics || []);
    setCities(cityRes.cities || []);
    setSpecializations(specializationRes.specializations || []);
    setReports({
      performance: reportRes.performance || [],
      appointment_summary: reportRes.appointment_summary || [],
      complaint_summary: reportRes.complaint_summary || [],
    });
  };

  const loadAppointments = async (status) => {
    const data = await getAdminAppointments({ admin_id, company_id, status });
    setAppointments(data.appointments || []);
  };

  const loadComplaints = async (status) => {
    const data = await getAdminComplaints(admin_id, status);
    setComplaints(data.complaints || []);
  };

  const loadBulletins = async () => {
    const data = await getBulletinsByAdmin(admin_id);
    setBulletins(data.bulletins || []);
  };

  const loadUnavailabilityQueue = async () => {
    const data = await getUnavailabilityRequests(admin_id);
    setUnavailabilityRequests(data.requests || []);
  };

  const loadRegionChangeQueue = async () => {
    const data = await getDoctorRegionChangeRequests(admin_id);
    setRegionChangeRequests(data.requests || []);
  };

  const validateDoctorForm = () => {
    const errors = {};
    if (!doctorForm.name.trim()) errors.name = 'Doctor name is required.';
    if (!doctorForm.username.trim()) errors.username = 'Username is required.';
    if (!doctorEditor && !doctorForm.password.trim()) errors.password = 'Password is required.';
    if (!doctorForm.email.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(doctorForm.email)) errors.email = 'Enter a valid email address.';
    if (!doctorForm.contact.trim()) errors.contact = 'Contact number is required.';
    else if (!isValidPhone(doctorForm.contact)) errors.contact = 'Use an 11-digit mobile number like 03001234567.';
    if (!doctorForm.clinic_id) errors.clinic_id = 'Clinic selection is required.';
    if (!doctorForm.license_number.trim()) errors.license_number = 'License number is required.';
    doctorForm.startTimes.forEach((startTime, index) => {
      const endTime = doctorForm.endTimes[index];
      if ((startTime && !endTime) || (!startTime && endTime)) {
        errors[`availability_${index}`] = `${WEEKDAY_LABELS[index]} needs both a start and end time, or both left blank.`;
      }
    });
    setDoctorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateReceptionistForm = () => {
    const errors = {};
    if (!receptionistForm.name.trim()) errors.name = 'Receptionist name is required.';
    if (!receptionistForm.username.trim()) errors.username = 'Username is required.';
    if (!receptionistEditor && !receptionistForm.password.trim()) errors.password = 'Password is required.';
    if (!receptionistForm.email.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(receptionistForm.email)) errors.email = 'Enter a valid email address.';
    if (!receptionistForm.contact.trim()) errors.contact = 'Contact number is required.';
    else if (!isValidPhone(receptionistForm.contact)) errors.contact = 'Use an 11-digit mobile number like 03001234567.';
    if (!receptionistForm.clinic_id) errors.clinic_id = 'Clinic selection is required.';
    setReceptionistErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetDoctorFormState = () => {
    setDoctorEditor(null);
    setDoctorForm(EMPTY_DOCTOR);
    setDoctorErrors({});
    setDoctorFormOpen(false);
  };

  const resetReceptionistFormState = () => {
    setReceptionistEditor(null);
    setReceptionistForm(EMPTY_RECEPTIONIST);
    setReceptionistErrors({});
    setReceptionistFormOpen(false);
  };

  const validateClinicForm = () => {
    const errors = {};
    if (!clinicForm.name.trim()) errors.name = 'Clinic name is required.';
    if (!clinicForm.location.trim()) errors.location = 'Clinic location is required.';
    if (!clinicForm.city_id) errors.city_id = 'City selection is required.';
    WEEKDAY_LABELS.forEach((day) => {
      const dayHours = clinicForm.operating_hours?.[day] || { open: '', close: '' };
      if ((dayHours.open && !dayHours.close) || (!dayHours.open && dayHours.close)) {
        errors[`operating_hours_${day}`] = `${day} needs both an opening and closing time, or both left blank.`;
      }
    });
    setClinicErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDoctorSubmit = async () => {
    if (!validateDoctorForm()) return;

    try {
      if (doctorEditor) {
        await updateDoctorProfile(doctorEditor.id, {
          ...doctorForm,
          clinic_id: Number(doctorForm.clinic_id),
          specialization_id: doctorForm.specialization_id ? Number(doctorForm.specialization_id) : null,
        });
        pushToast({ title: 'Doctor updated', message: `${doctorForm.name} was updated successfully.` });
      } else {
        await createDoctor({
          ...doctorForm,
          clinic_id: Number(doctorForm.clinic_id),
          specialization_id: doctorForm.specialization_id ? Number(doctorForm.specialization_id) : null,
          startTimes: doctorForm.startTimes,
          endTimes: doctorForm.endTimes,
        });
        pushToast({ title: 'Doctor created', message: `${doctorForm.name} was added successfully.` });
      }
      setDoctorForm(EMPTY_DOCTOR);
      setDoctorEditor(null);
      setDoctorErrors({});
      setDoctorFormOpen(false);
      await loadBaseData();
      setActiveTab('staff');
    } catch (error) {
      pushToast({ title: 'Doctor action failed', message: error.response?.data?.detail || 'Please review the doctor details.', tone: 'error' });
    }
  };

  const handleReceptionistSubmit = async () => {
    if (!validateReceptionistForm()) return;

    try {
      if (receptionistEditor) {
        await updateReceptionistProfile(receptionistEditor.id, {
          ...receptionistForm,
          clinic_id: Number(receptionistForm.clinic_id),
        });
        pushToast({ title: 'Receptionist updated', message: `${receptionistForm.name} was updated successfully.` });
      } else {
        await createReceptionist({
          ...receptionistForm,
          clinic_id: Number(receptionistForm.clinic_id),
        });
        pushToast({ title: 'Receptionist created', message: `${receptionistForm.name} was added successfully.` });
      }
      setReceptionistForm(EMPTY_RECEPTIONIST);
      setReceptionistErrors({});
      setReceptionistEditor(null);
      setReceptionistFormOpen(false);
      await loadBaseData();
      setActiveTab('staff');
    } catch (error) {
      pushToast({ title: 'Receptionist action failed', message: error.response?.data?.detail || 'Please review the receptionist details.', tone: 'error' });
    }
  };

  const handleClinicSubmit = async () => {
    if (!validateClinicForm()) return;

    try {
      if (clinicEditor) {
        await updateClinic(clinicEditor.id, {
          ...clinicForm,
          city_id: Number(clinicForm.city_id),
        });
        pushToast({ title: 'Clinic updated', message: `${clinicForm.name} was updated successfully.` });
      } else {
        await createClinic({
          company_id,
          ...clinicForm,
          city_id: Number(clinicForm.city_id),
        });
        pushToast({ title: 'Clinic created', message: `${clinicForm.name} was added successfully.` });
      }
      setClinicForm({ ...EMPTY_CLINIC, operating_hours: createOperatingHours() });
      setClinicEditor(null);
      setClinicErrors({});
      await loadBaseData();
      setActiveTab('dashboard');
    } catch (error) {
      pushToast({ title: 'Clinic action failed', message: error.response?.data?.detail || 'Please review the clinic details.', tone: 'error' });
    }
  };

  const doctorRows = buildTableState(doctors, {
    ...doctorTable,
    pageSize: 5,
    filterFn: (doctor, query) => {
      const value = query.toLowerCase();
      return (
        doctor.name?.toLowerCase().includes(value) ||
        doctor.username?.toLowerCase().includes(value) ||
        doctor.clinic_name?.toLowerCase().includes(value)
      );
    },
  });

  const receptionistRows = buildTableState(receptionists, {
    ...receptionistTable,
    pageSize: 5,
    filterFn: (receptionist, query) => {
      const value = query.toLowerCase();
      return (
        receptionist.name?.toLowerCase().includes(value) ||
        receptionist.username?.toLowerCase().includes(value) ||
        receptionist.clinic_name?.toLowerCase().includes(value)
      );
    },
  });

  const clinicRows = buildTableState(clinicBreakdown, {
    ...clinicTable,
    pageSize: 5,
    filterFn: (clinic, query) => {
      const value = query.toLowerCase();
      return (
        clinic.name?.toLowerCase().includes(value) ||
        clinic.city_name?.toLowerCase().includes(value) ||
        clinic.province?.toLowerCase().includes(value)
      );
    },
  });

  const reportPerformanceRows = buildTableState(reports.performance, {
    ...reportPerformanceTable,
    pageSize: 5,
    filterFn: (item, query) => item.clinic_name?.toLowerCase().includes(query.toLowerCase()) || item.name?.toLowerCase().includes(query.toLowerCase()),
  });

  const reportAppointmentRows = buildTableState(reports.appointment_summary, {
    ...reportAppointmentTable,
    pageSize: 6,
    filterFn: (item, query) => item.clinic_name?.toLowerCase().includes(query.toLowerCase()) || item.status?.toLowerCase().includes(query.toLowerCase()),
  });

  const reportComplaintRows = buildTableState(reports.complaint_summary, {
    ...reportComplaintTable,
    pageSize: 6,
    filterFn: (item, query) => item.clinic_name?.toLowerCase().includes(query.toLowerCase()) || item.status?.toLowerCase().includes(query.toLowerCase()),
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto border-b border-gray-200 pb-1">
        {[
          ['dashboard', 'fa-solid fa-chart-pie', 'Dashboard'],
          ['staff', 'fa-solid fa-user-doctor', 'Staff'],
          ['clinics', 'fa-solid fa-hospital', clinicEditor ? 'Edit Clinic' : 'Clinic Settings'],
          ['appointments', 'fa-solid fa-calendar-check', 'Appointments'],
          ['operations', 'fa-solid fa-stethoscope', 'Doctor Reviews'],
          ['complaints', 'fa-solid fa-life-ring', 'Complaints'],
          ['communications', 'fa-solid fa-bullhorn', 'Communications'],
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
            <StatCard label="Total Clinics" value={stats.clinics} color="from-rose-500 to-rose-600" />
            <StatCard label="Total Doctors" value={stats.doctors} color="from-blue-500 to-blue-600" />
            <StatCard label="Total Patients" value={stats.patients} color="from-emerald-500 to-emerald-600" />
            <StatCard label="Active Queue" value={stats.queue} color="from-amber-500 to-amber-600" />
          </div>

          <Panel title="Clinic Breakdown" actions={(
            <input type="text" value={clinicTable.query} onChange={(event) => setClinicTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search clinics" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
          )}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <SortableHeader label="Clinic" sortKey="name" tableState={clinicTable} onSort={(next) => setClinicTable((current) => ({ ...current, ...next }))} />
                    <SortableHeader label="Location" sortKey="city_name" tableState={clinicTable} onSort={(next) => setClinicTable((current) => ({ ...current, ...next }))} />
                    <SortableHeader label="Doctors" sortKey="doctor_count" tableState={clinicTable} onSort={(next) => setClinicTable((current) => ({ ...current, ...next }))} />
                    <SortableHeader label="Patients" sortKey="patient_count" tableState={clinicTable} onSort={(next) => setClinicTable((current) => ({ ...current, ...next }))} />
                    <SortableHeader label="Waiting" sortKey="waiting_count" tableState={clinicTable} onSort={(next) => setClinicTable((current) => ({ ...current, ...next }))} />
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicRows.rows.map((clinic) => (
                    <tr key={clinic.id} className="border-b border-gray-100 text-sm">
                      <td className="px-4 py-3 font-semibold text-gray-900">{clinic.name}</td>
                      <td className="px-4 py-3">{clinic.city_name}, {clinic.province}</td>
                      <td className="px-4 py-3">{clinic.doctor_count}</td>
                      <td className="px-4 py-3">{clinic.patient_count}</td>
                      <td className="px-4 py-3">{clinic.waiting_count}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                          onClick={() => {
                            setClinicEditor(clinic);
                            setClinicForm({
                              name: clinic.name || '',
                              location: clinic.location || '',
                              city_id: String(clinic.city_id || ''),
                              status: clinic.status || 'active',
                              operating_hours: clinic.operating_hours || createOperatingHours(),
                            });
                            setActiveTab('clinics');
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={clinicRows.page} totalPages={clinicRows.totalPages} onChange={(page) => setClinicTable((current) => ({ ...current, page }))} />
          </Panel>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Clinic Performance" actions={(
              <input type="text" value={reportPerformanceTable.query} onChange={(event) => setReportPerformanceTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search clinics" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
            )}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                      <SortableHeader label="Clinic" sortKey="name" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                      <SortableHeader label="Doctors" sortKey="doctor_count" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                      <SortableHeader label="Receptionists" sortKey="receptionist_count" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                      <SortableHeader label="Waiting" sortKey="waiting_count" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                      <SortableHeader label="Completed" sortKey="completed_count" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                      <SortableHeader label="Cancelled" sortKey="cancelled_count" tableState={reportPerformanceTable} onSort={(next) => setReportPerformanceTable((current) => ({ ...current, ...next }))} />
                    </tr>
                  </thead>
                  <tbody>
                    {reportPerformanceRows.rows.map((item) => (
                      <tr key={item.id || item.clinic_id} className="border-b border-gray-100 text-sm">
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.clinic_name || item.name}</td>
                        <td className="px-4 py-3">{item.doctor_count}</td>
                        <td className="px-4 py-3">{item.receptionist_count}</td>
                        <td className="px-4 py-3">{item.waiting_count}</td>
                        <td className="px-4 py-3">{item.completed_count}</td>
                        <td className="px-4 py-3">{item.cancelled_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={reportPerformanceRows.page} totalPages={reportPerformanceRows.totalPages} onChange={(page) => setReportPerformanceTable((current) => ({ ...current, page }))} />
            </Panel>

            <Panel title="Appointment Reports" actions={(
              <input type="text" value={reportAppointmentTable.query} onChange={(event) => setReportAppointmentTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search reports" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
            )}>
              <div className="space-y-3">
                {reportAppointmentRows.rows.map((item) => (
                  <MiniCard key={`${item.clinic_id}-${item.status}`} title={item.clinic_name} subtitle={`${item.status}: ${item.total}`} />
                ))}
              </div>
              <Pagination page={reportAppointmentRows.page} totalPages={reportAppointmentRows.totalPages} onChange={(page) => setReportAppointmentTable((current) => ({ ...current, page }))} />
            </Panel>

            <Panel title="Complaint Reports" actions={(
              <input type="text" value={reportComplaintTable.query} onChange={(event) => setReportComplaintTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search reports" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
            )}>
              <div className="space-y-3">
                {reportComplaintRows.rows.map((item) => (
                  <MiniCard key={`${item.clinic_id}-${item.status}`} title={item.clinic_name} subtitle={`${item.status}: ${item.total}`} />
                ))}
              </div>
              <Pagination page={reportComplaintRows.page} totalPages={reportComplaintRows.totalPages} onChange={(page) => setReportComplaintTable((current) => ({ ...current, page }))} />
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'staff' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Doctors" actions={(
            <div className="flex flex-wrap gap-3">
              <input type="text" value={doctorTable.query} onChange={(event) => setDoctorTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search doctors" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => {
                  setDoctorEditor(null);
                  setDoctorForm(EMPTY_DOCTOR);
                  setDoctorErrors({});
                  setDoctorFormOpen(true);
                }}
              >
                Add Doctor
              </button>
            </div>
          )}>
            <div className="space-y-3">
              {doctorRows.rows.map((doctor) => (
                <div key={doctor.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{doctor.name}</p>
                      <p className="text-sm text-gray-500">{doctor.username} • {doctor.clinic_name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DoctorAvailabilityBadge status={doctor.availability_status} label={doctor.availability_label} />
                        {doctor.scheduled_start_time && doctor.scheduled_end_time ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            Today: {formatTimeWindow(doctor.scheduled_start_time, doctor.scheduled_end_time)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            No schedule saved for today
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                        onClick={() => {
                          setDoctorEditor(doctor);
                          setDoctorForm({
                            name: doctor.name || '',
                            username: doctor.username || '',
                            email: sanitizeEmailInput(doctor.email || ''),
                            password: '',
                            contact: sanitizePhoneInput(doctor.contact || ''),
                            clinic_id: String(doctor.clinic_id || ''),
                            license_number: doctor.license_number || '',
                            specialization_id: doctor.specialization_id ? String(doctor.specialization_id) : '',
                          });
                          setDoctorErrors({});
                          setDoctorFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${doctor.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        onClick={() => setConfirmState({
                          title: `${doctor.status === 'active' ? 'Deactivate' : 'Activate'} ${doctor.name}?`,
                          message: 'This changes the doctor profile status without deleting any appointment history.',
                          confirmLabel: doctor.status === 'active' ? 'Deactivate Doctor' : 'Activate Doctor',
                          onConfirm: async () => {
                            await updateDoctorStatus(doctor.id, doctor.status === 'active' ? 'inactive' : 'active');
                            await loadBaseData();
                            setConfirmState(null);
                            pushToast({ title: 'Doctor status updated', message: `${doctor.name} is now ${doctor.status === 'active' ? 'inactive' : 'active'}.` });
                          },
                        })}
                      >
                        {doctor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={doctorRows.page} totalPages={doctorRows.totalPages} onChange={(page) => setDoctorTable((current) => ({ ...current, page }))} />
          </Panel>

          <Panel title="Receptionists" actions={(
            <div className="flex flex-wrap gap-3">
              <input type="text" value={receptionistTable.query} onChange={(event) => setReceptionistTable((current) => ({ ...current, query: event.target.value, page: 1 }))} placeholder="Search receptionists" className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => {
                  setReceptionistEditor(null);
                  setReceptionistForm(EMPTY_RECEPTIONIST);
                  setReceptionistErrors({});
                  setReceptionistFormOpen(true);
                }}
              >
                Add Receptionist
              </button>
            </div>
          )}>
            <div className="space-y-3">
              {receptionistRows.rows.map((receptionist) => (
                <div key={receptionist.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{receptionist.name}</p>
                      <p className="text-sm text-gray-500">{receptionist.username} • {receptionist.clinic_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                        onClick={() => {
                          setReceptionistEditor(receptionist);
                          setReceptionistForm({
                            name: receptionist.name || '',
                            username: receptionist.username || '',
                            email: sanitizeEmailInput(receptionist.email || ''),
                            password: '',
                            contact: sanitizePhoneInput(receptionist.contact || ''),
                            clinic_id: String(receptionist.clinic_id || ''),
                          });
                          setReceptionistErrors({});
                          setReceptionistFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${receptionist.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        onClick={() => setConfirmState({
                          title: `${receptionist.status === 'active' ? 'Deactivate' : 'Activate'} ${receptionist.name}?`,
                          message: 'This changes receptionist access without deleting clinic history.',
                          confirmLabel: receptionist.status === 'active' ? 'Deactivate Receptionist' : 'Activate Receptionist',
                          onConfirm: async () => {
                            await updateReceptionistStatus(receptionist.id, receptionist.status === 'active' ? 'inactive' : 'active');
                            await loadBaseData();
                            setConfirmState(null);
                            pushToast({ title: 'Receptionist status updated', message: `${receptionist.name} is now ${receptionist.status === 'active' ? 'inactive' : 'active'}.` });
                          },
                        })}
                      >
                        {receptionist.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={receptionistRows.page} totalPages={receptionistRows.totalPages} onChange={(page) => setReceptionistTable((current) => ({ ...current, page }))} />
          </Panel>
        </div>
      ) : null}

      {activeTab === 'clinics' ? (
        <Panel title={clinicEditor ? 'Edit Clinic Settings' : 'Create Clinic'}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Clinic Name" value={clinicForm.name} error={clinicErrors.name} onChange={(value) => setClinicForm((current) => ({ ...current, name: value }))} />
            <Field label="Location" value={clinicForm.location} error={clinicErrors.location} onChange={(value) => setClinicForm((current) => ({ ...current, location: value }))} />
            <SelectField label="City / Region" value={clinicForm.city_id} error={clinicErrors.city_id} onChange={(value) => setClinicForm((current) => ({ ...current, city_id: value }))} options={cities.map((city) => [String(city.id), `${city.name} • ${city.sub_region}, ${city.province}`])} />
            <SelectField label="Status" value={clinicForm.status} onChange={(value) => setClinicForm((current) => ({ ...current, status: value }))} options={[['active', 'Active'], ['inactive', 'Inactive']]} />
          </div>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900">Operating Hours</h4>
              <p className="mt-1 text-sm text-gray-500">Leave both fields empty to mark a day as closed.</p>
            </div>
            <div className="space-y-3">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[160px_1fr_1fr]">
                  <div className="flex items-center text-sm font-semibold text-gray-700">{day}</div>
                  <Field
                    label="Open"
                    type="time"
                    value={clinicForm.operating_hours?.[day]?.open || ''}
                    error={clinicErrors[`operating_hours_${day}`]}
                    onChange={(value) => setClinicForm((current) => ({
                      ...current,
                      operating_hours: {
                        ...current.operating_hours,
                        [day]: { ...(current.operating_hours?.[day] || { open: '', close: '' }), open: value },
                      },
                    }))}
                  />
                  <Field
                    label="Close"
                    type="time"
                    value={clinicForm.operating_hours?.[day]?.close || ''}
                    error={clinicErrors[`operating_hours_${day}`]}
                    onChange={(value) => setClinicForm((current) => ({
                      ...current,
                      operating_hours: {
                        ...current.operating_hours,
                        [day]: { ...(current.operating_hours?.[day] || { open: '', close: '' }), close: value },
                      },
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <InlineErrors errors={clinicErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleClinicSubmit}>
                {clinicEditor ? 'Save Clinic Changes' : 'Create Clinic'}
              </button>
              {clinicEditor ? (
                <button type="button" className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200" onClick={() => {
                  setClinicEditor(null);
                  setClinicForm({ ...EMPTY_CLINIC, operating_hours: createOperatingHours() });
                  setClinicErrors({});
                }}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      {activeTab === 'appointments' ? (
        <Panel title="Clinic Appointments" actions={(
          <select value={appointmentStatus} onChange={async (event) => {
            const nextStatus = event.target.value;
            setAppointmentStatus(nextStatus);
            await loadAppointments(nextStatus);
          }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}>
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">Ticket #{appointment.ticket_no} • {appointment.patient_name}</p>
                    <p className="text-sm text-gray-500">{appointment.patient_contact} • Dr. {appointment.doctor_name} • {appointment.clinic_name}</p>
                  </div>
                  <StatusPill value={appointment.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Receptionist-Forwarded Unavailability Queue">
              <div className="space-y-3">
                {unavailabilityRequests.map((request) => (
                  <ReviewCard
                    key={request.id}
                    title={request.doctor_name}
                    subtitle={`${new Date(request.start_datetime).toLocaleDateString()} to ${new Date(request.end_datetime).toLocaleDateString()} - ${request.clinic_name}`}
                    detail={`${request.reason}${request.receptionist_name || request.receptionist_comment ? `\n\nReceptionist review: ${request.receptionist_name || 'Clinic receptionist'}${request.receptionist_comment ? ` - ${request.receptionist_comment}` : ''}` : ''}`}
                    onApprove={async () => {
                      await approveUnavailability(request.id, admin_id, 'Approved in admin portal');
                      await loadUnavailabilityQueue();
                      pushToast({ title: 'Unavailability approved', message: `${request.doctor_name}'s request was approved.` });
                    }}
                    onReject={async () => {
                      await rejectUnavailability(request.id, admin_id, 'Rejected in admin portal');
                      await loadUnavailabilityQueue();
                      pushToast({ title: 'Unavailability rejected', message: `${request.doctor_name}'s request was rejected.` });
                    }}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Region Change Queue">
              <div className="space-y-3">
                {regionChangeRequests.map((request) => (
                  <ReviewCard
                    key={request.id}
                    title={request.doctor_name}
                    subtitle={`${request.province} • ${request.sub_region}`}
                    detail={request.reason}
                    onApprove={async () => {
                      await reviewDoctorRegionChangeRequest(request.id, { status: 'approved', reviewer_comment: 'Approved in admin portal' });
                      await loadRegionChangeQueue();
                      pushToast({ title: 'Region request approved', message: `${request.doctor_name}'s region request was approved.` });
                    }}
                    onReject={async () => {
                      await reviewDoctorRegionChangeRequest(request.id, { status: 'rejected', reviewer_comment: 'Rejected in admin portal' });
                      await loadRegionChangeQueue();
                      pushToast({ title: 'Region request rejected', message: `${request.doctor_name}'s region request was rejected.` });
                    }}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'complaints' ? (
        <Panel title="Clinic Complaints" actions={(
          <select value={complaintStatus} onChange={async (event) => {
            const nextStatus = event.target.value;
            setComplaintStatus(nextStatus);
            await loadComplaints(nextStatus);
          }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        )}>
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{complaint.title}</p>
                    <p className="text-sm text-gray-500">{complaint.clinic_name} • {complaint.patient_name || 'No patient linked'}</p>
                    <p className="mt-2 text-sm text-gray-700">{complaint.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill value={complaint.status} />
                    <button type="button" className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200" onClick={async () => {
                      await updateComplaintStatus(complaint.id, { status: 'resolved', resolution_note: 'Resolved in admin portal' });
                      await loadComplaints(complaintStatus);
                      pushToast({ title: 'Complaint resolved', message: `${complaint.title} was marked resolved.` });
                    }}>
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'communications' ? (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Panel title="Post Bulletin">
            <div className="space-y-4">
              <Field label="Title" value={bulletinForm.title} onChange={(value) => setBulletinForm((current) => ({ ...current, title: value }))} />
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-gray-700">Message</span>
                <textarea rows="6" value={bulletinForm.message} onChange={(event) => setBulletinForm((current) => ({ ...current, message: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
              </label>
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={async () => {
                await postBulletin({ admin_id, ...bulletinForm });
                setBulletinForm({ title: '', message: '' });
                await loadBulletins();
                pushToast({ title: 'Bulletin posted', message: 'The bulletin is now visible to the company.' });
              }}>
                Post Bulletin
              </button>
            </div>
          </Panel>

          <Panel title="Active Bulletins">
            <div className="space-y-3">
              {bulletins.map((bulletin) => (
                <div key={bulletin.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{bulletin.title}</p>
                      <p className="mt-2 text-sm text-gray-700">{bulletin.message}</p>
                    </div>
                    <button type="button" className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200" onClick={() => setConfirmState({
                      title: 'Archive bulletin?',
                      message: 'This will deactivate the bulletin for staff users.',
                      confirmLabel: 'Archive Bulletin',
                      onConfirm: async () => {
                        await deleteBulletin(bulletin.id, admin_id);
                        await loadBulletins();
                        setConfirmState(null);
                        pushToast({ title: 'Bulletin archived', message: `${bulletin.title} was archived.` });
                      },
                    })}>
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {doctorFormOpen ? (
        <Modal title={doctorEditor ? 'Edit Doctor Profile' : 'Add Doctor'} onClose={resetDoctorFormState}>
          <AutofillShield />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Doctor Name" value={doctorForm.name} error={doctorErrors.name} onChange={(value) => setDoctorForm((current) => ({ ...current, name: value }))} />
            <Field label="Username" value={doctorForm.username} error={doctorErrors.username} onChange={(value) => setDoctorForm((current) => ({ ...current, username: value }))} />
            <Field label="Email" type="email" inputName="doctor_create_email" autoComplete="off" placeholder="doctor@example.com" value={doctorForm.email} error={doctorErrors.email} readOnly={Boolean(doctorEditor)} onChange={(value) => setDoctorForm((current) => ({ ...current, email: sanitizeEmailInput(value) }))} />
            <Field label="Password" type="password" inputName="doctor_create_password" autoComplete="new-password" value={doctorForm.password} error={doctorErrors.password} readOnly={Boolean(doctorEditor)} onChange={(value) => setDoctorForm((current) => ({ ...current, password: value }))} />
            <Field label="Contact" placeholder="03001234567" inputMode="numeric" value={doctorForm.contact} error={doctorErrors.contact} onChange={(value) => setDoctorForm((current) => ({ ...current, contact: sanitizePhoneInput(value) }))} />
            <Field label="License Number" value={doctorForm.license_number} error={doctorErrors.license_number} onChange={(value) => setDoctorForm((current) => ({ ...current, license_number: value }))} />
            <SelectField label="Clinic" value={doctorForm.clinic_id} error={doctorErrors.clinic_id} onChange={(value) => setDoctorForm((current) => ({ ...current, clinic_id: value }))} options={clinics.map((clinic) => [String(clinic.id), clinic.name])} />
            <SelectField label="Specialization" value={doctorForm.specialization_id} onChange={(value) => setDoctorForm((current) => ({ ...current, specialization_id: value }))} options={specializations.map((specialization) => [String(specialization.id), specialization.name])} />
          </div>
          {!doctorEditor ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-900">Weekly Availability</h4>
                <p className="mt-1 text-sm text-gray-500">Set each day separately. Leave both fields empty when the doctor is unavailable that day.</p>
              </div>
              <div className="space-y-3">
                {WEEKDAY_LABELS.map((dayLabel, index) => (
                  <div key={dayLabel} className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[160px_1fr_1fr]">
                    <div className="flex items-center text-sm font-semibold text-gray-700">{dayLabel}</div>
                    <Field
                      label="Start Time"
                      type="time"
                      value={doctorForm.startTimes[index]}
                      error={doctorErrors[`availability_${index}`]}
                      onChange={(value) => setDoctorForm((current) => ({
                        ...current,
                        startTimes: current.startTimes.map((item, itemIndex) => (itemIndex === index ? value : item)),
                      }))}
                    />
                    <Field
                      label="End Time"
                      type="time"
                      value={doctorForm.endTimes[index]}
                      error={doctorErrors[`availability_${index}`]}
                      onChange={(value) => setDoctorForm((current) => ({
                        ...current,
                        endTimes: current.endTimes.map((item, itemIndex) => (itemIndex === index ? value : item)),
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-4">
            <InlineErrors errors={doctorErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleDoctorSubmit}>
                {doctorEditor ? 'Save Doctor Changes' : 'Create Doctor'}
              </button>
              <button type="button" className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200" onClick={resetDoctorFormState}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {receptionistFormOpen ? (
        <Modal title={receptionistEditor ? 'Edit Receptionist' : 'Add Receptionist'} onClose={resetReceptionistFormState}>
          <AutofillShield />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Receptionist Name" value={receptionistForm.name} error={receptionistErrors.name} onChange={(value) => setReceptionistForm((current) => ({ ...current, name: value }))} />
            <Field label="Username" value={receptionistForm.username} error={receptionistErrors.username} onChange={(value) => setReceptionistForm((current) => ({ ...current, username: value }))} />
            <Field label="Email" type="email" inputName="receptionist_create_email" autoComplete="off" placeholder="receptionist@example.com" value={receptionistForm.email} error={receptionistErrors.email} readOnly={Boolean(receptionistEditor)} onChange={(value) => setReceptionistForm((current) => ({ ...current, email: sanitizeEmailInput(value) }))} />
            <Field label="Password" type="password" inputName="receptionist_create_password" autoComplete="new-password" value={receptionistForm.password} error={receptionistErrors.password} readOnly={Boolean(receptionistEditor)} onChange={(value) => setReceptionistForm((current) => ({ ...current, password: value }))} />
            <Field label="Contact" placeholder="03001234567" inputMode="numeric" value={receptionistForm.contact} error={receptionistErrors.contact} onChange={(value) => setReceptionistForm((current) => ({ ...current, contact: sanitizePhoneInput(value) }))} />
            <SelectField label="Clinic" value={receptionistForm.clinic_id} error={receptionistErrors.clinic_id} onChange={(value) => setReceptionistForm((current) => ({ ...current, clinic_id: value }))} options={clinics.map((clinic) => [String(clinic.id), clinic.name])} />
          </div>
          <div className="mt-4 space-y-4">
            <InlineErrors errors={receptionistErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleReceptionistSubmit}>
                {receptionistEditor ? 'Save Receptionist Changes' : 'Create Receptionist'}
              </button>
              <button type="button" className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200" onClick={resetReceptionistFormState}>
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

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-lg`}>
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value ?? '-'}</p>
    </div>
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

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
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

function Field({ label, value, onChange, error, type = 'text', readOnly = false, autoComplete = 'off', inputName, placeholder, inputMode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <input type={type} name={inputName} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'} ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`} />
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, error, options }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'}`}>
        <option value="">Select an option</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function StatusPill({ value }) {
  const styles = value === 'active' || value === 'resolved' || value === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : value === 'waiting' || value === 'open' || value === 'pending' || value === 'in_progress'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{value}</span>;
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

function MiniCard({ title, subtitle }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function DoctorAvailabilityBadge({ status, label }) {
  const styles = status === 'online'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'offline'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      <span className="text-[10px]">●</span>
      <span>{label}</span>
    </span>
  );
}

function formatTimeWindow(start, end) {
  return `${formatClock(start)} - ${formatClock(end)}`;
}

function formatClock(value) {
  if (!value) return '-';
  const [hours, minutes] = `${value}`.split(':');
  const numericHours = Number(hours);
  const suffix = numericHours >= 12 ? 'PM' : 'AM';
  const twelveHour = numericHours % 12 || 12;
  return `${twelveHour}:${minutes} ${suffix}`;
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

function ReviewCard({ title, subtitle, detail, onApprove, onReject }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{detail}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200" onClick={onApprove}>
          Approve
        </button>
        <button type="button" className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200" onClick={onReject}>
          Reject
        </button>
      </div>
    </div>
  );
}
