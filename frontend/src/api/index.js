import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('careline_user') : null;
  if (stored) {
    const user = JSON.parse(stored);
    if (user?.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${user.token}`,
      };
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.sessionStorage.removeItem('careline_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const login = (credentials) =>
  api.post('/auth/login', credentials).then((response) => response.data);
export const logoutSession = () =>
  api.post('/auth/logout').then((response) => response.data);
export const pingPresence = () =>
  api.post('/auth/presence/ping').then((response) => response.data);
export const markPresenceOffline = (token) =>
  fetch('/api/auth/presence/offline', {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

export const getNotifications = (role, user_id) =>
  api.get(`/notifications/${role}`, { params: { user_id } }).then((response) => response.data);
export const markNotificationRead = (id) =>
  api.put(`/notifications/mark-read/${id}`).then((response) => response.data);
export const markAllNotificationsRead = (role, user_id) =>
  api.put(`/notifications/mark-all-read/${role}`, null, { params: { user_id } }).then((response) => response.data);

export const getBulletins = () =>
  api.get('/bulletins').then((response) => response.data);
export const getBulletinsByAdmin = (admin_id) =>
  api.get(`/bulletins/admin/${admin_id}`).then((response) => response.data);
export const getBulletinsByCompany = (company_id) =>
  api.get(`/bulletins/company/${company_id}`).then((response) => response.data);

export const getClinics = (params = {}) =>
  api.get('/clinics', { params }).then((response) => response.data);
export const getClinicCompany = (clinic_id) =>
  api.get(`/clinic/${clinic_id}/company`).then((response) => response.data);

export const getAllRegions = () =>
  api.get('/regions/all').then((response) => response.data);
export const getAllCities = () =>
  api.get('/cities/all').then((response) => response.data);
export const lookupCityRegion = (city) =>
  api.get(`/regions/lookup/${city}`).then((response) => response.data);

export const getAdminStatistics = (params) =>
  api.get('/admin/statistics', { params }).then((response) => response.data);
export const getAdminReceptionists = (params) =>
  api.get('/admin/receptionists', { params }).then((response) => response.data);
export const getAdminDoctors = (params) =>
  api.get('/admin/doctors', { params }).then((response) => response.data);
export const getAvailableDoctors = () =>
  api.get('/admin/available-doctors').then((response) => response.data);
export const getUnavailableDoctors = (admin_id) =>
  api.get('/admin/unavailable-doctors', { params: { admin_id } }).then((response) => response.data);
export const createReceptionist = (data) =>
  api.post('/admin/create-receptionist', data).then((response) => response.data);
export const updateReceptionistProfile = (receptionist_id, data) =>
  api.put(`/admin/receptionist/${receptionist_id}`, data).then((response) => response.data);
export const updateReceptionistStatus = (receptionist_id, status) =>
  api.put(`/admin/receptionist/${receptionist_id}/status`, { status }).then((response) => response.data);
export const createDoctor = (data) =>
  api.post('/admin/create-doctor', data).then((response) => response.data);
export const updateDoctorProfile = (doctor_id, data) =>
  api.put(`/admin/doctor/${doctor_id}`, data).then((response) => response.data);
export const updateDoctorStatus = (doctor_id, status) =>
  api.put(`/admin/doctor/${doctor_id}/status`, { status }).then((response) => response.data);
export const createClinic = (data) =>
  api.post('/admin/create-clinic', data).then((response) => response.data);
export const updateClinic = (clinic_id, data) =>
  api.put(`/admin/clinic/${clinic_id}`, data).then((response) => response.data);
export const transferDoctor = (data) =>
  api.post('/admin/transfer-doctor', data).then((response) => response.data);
export const updateDoctorAvailability = (doctor_id, data) =>
  api.put(`/admin/update-availability/${doctor_id}`, data).then((response) => response.data);
export const monitorDoctors = () =>
  api.get('/admin/monitor-doctors').then((response) => response.data);
export const getAdminAppointments = (params) =>
  api.get('/admin/appointments', { params }).then((response) => response.data);
export const postBulletin = (data) =>
  api.post('/admin/post-bulletin', data).then((response) => response.data);
export const deleteBulletin = (bulletin_id, admin_id) =>
  api.delete(`/admin/delete-bulletin/${bulletin_id}`, { params: { admin_id } }).then((response) => response.data);
export const requestPasswordChange = (data) =>
  api.post('/admin/request-password-change', data).then((response) => response.data);
export const requestContactChange = (data) =>
  api.post('/admin/request-contact-change', data).then((response) => response.data);
export const requestGeneralQuery = (data) =>
  api.post('/admin/request-general-query', data).then((response) => response.data);
export const getUnavailabilityRequests = (admin_id) =>
  api.get('/admin/doctor-unavailability-requests', { params: { admin_id } }).then((response) => response.data);
export const approveUnavailability = (request_id, admin_id, admin_comment = '') =>
  api.put(`/admin/unavailability-request/${request_id}/approve`, null, { params: { admin_id, admin_comment } }).then((response) => response.data);
export const rejectUnavailability = (request_id, admin_id, reason) =>
  api.put(`/admin/unavailability-request/${request_id}/reject`, { reason }, { params: { admin_id } }).then((response) => response.data);
export const getDoctorRegionChangeRequests = (admin_id) =>
  api.get('/admin/doctor-region-change-requests', { params: { admin_id } }).then((response) => response.data);
export const reviewDoctorRegionChangeRequest = (request_id, data) =>
  api.put(`/admin/doctor-region-change-request/${request_id}/review`, data).then((response) => response.data);
export const getAdminComplaints = (admin_id, status = 'all') =>
  api.get('/admin/complaints', { params: { admin_id, status } }).then((response) => response.data);
export const updateComplaintStatus = (complaint_id, data) =>
  api.put(`/admin/complaint/${complaint_id}/status`, data).then((response) => response.data);
export const getAdminCities = (admin_id) =>
  api.get('/admin/cities', { params: { admin_id } }).then((response) => response.data);
export const getAdminClinicBreakdown = (params) =>
  api.get('/admin/clinics-breakdown', { params }).then((response) => response.data);
export const getAdminReports = () =>
  api.get('/admin/reports').then((response) => response.data);
export const getDoctorSchedule = (doctor_id) =>
  api.get('/admin/doctor-schedule', { params: { doctor_id } }).then((response) => response.data);
export const getSpecializations = () =>
  api.get('/admin/specializations').then((response) => response.data);
export const getAvailableDoctorsForClinic = (clinic_id) =>
  api.get(`/admin/clinic/${clinic_id}/available-doctors`).then((response) => response.data);
export const transferPatients = (from_doctor_id, to_doctor_id) =>
  api.post('/admin/transfer-patients', null, { params: { from_doctor_id, to_doctor_id } }).then((response) => response.data);

export const getWaitingPatients = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/waiting-patients`).then((response) => response.data);
export const getPastPatients = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/past-patients`).then((response) => response.data);
export const getPatientHistory = (patient_id) =>
  api.get(`/doctor/patient/${patient_id}/history`).then((response) => response.data);
export const submitDiagnosis = (data) =>
  api.post('/doctor/submit-diagnosis', data).then((response) => response.data);
export const setDoctorInactive = (doctor_id) =>
  api.put(`/doctor/${doctor_id}/set-inactive`).then((response) => response.data);
export const requestUnavailability = (data) =>
  api.post('/doctor/request-unavailability', data).then((response) => response.data);
export const getDoctorUnavailabilityRequests = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/unavailability-requests`).then((response) => response.data);
export const requestDoctorRegionChange = (data) =>
  api.post('/doctor/request-region-change', data).then((response) => response.data);
export const getDoctorRegionChangeHistory = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/region-change-requests`).then((response) => response.data);

export const registerPatient = (data) =>
  api.post('/receptionist/register-patient', data).then((response) => response.data);
export const bookPatientAppointment = (data) =>
  api.post('/receptionist/book-appointment', data).then((response) => response.data);
export const getReceptionistPatients = (params) =>
  api.get('/receptionist/patients', { params }).then((response) => response.data);
export const updatePatient = (patient_id, data) =>
  api.put(`/receptionist/patient/${patient_id}`, data).then((response) => response.data);
export const getReceptionistAppointments = (params) =>
  api.get('/receptionist/appointments', { params }).then((response) => response.data);
export const getDiagnoses = (params = {}) =>
  api.get('/receptionist/get-diagnoses', { params }).then((response) => response.data);
export const emailDiagnosis = (data) =>
  api.post('/receptionist/email-diagnosis', data).then((response) => response.data);
export const getReceptionistComplaints = (clinic_id, status = 'all') =>
  api.get('/receptionist/complaints', { params: { clinic_id, status } }).then((response) => response.data);
export const createReceptionistComplaint = (data) =>
  api.post('/receptionist/complaints', data).then((response) => response.data);
export const updateReceptionistComplaintStatus = (complaint_id, data) =>
  api.put(`/receptionist/complaints/${complaint_id}/status`, data).then((response) => response.data);
export const getReceptionistDoctorUnavailabilityRequests = (status = 'all') =>
  api.get('/receptionist/doctor-unavailability-requests', { params: { status } }).then((response) => response.data);
export const forwardDoctorUnavailabilityRequest = (request_id, data) =>
  api.put(`/receptionist/unavailability-request/${request_id}/forward`, data).then((response) => response.data);

export const getSuperadminDashboard = () =>
  api.get('/superadmin/dashboard').then((response) => response.data);
export const getNextCompanyRegistrationNumber = () =>
  api.get('/superadmin/company-registration-number').then((response) => response.data);
export const getAllCompanies = () =>
  api.get('/superadmin/companies').then((response) => response.data);
export const getCompanyClinics = (company_id) =>
  api.get(`/superadmin/company/${company_id}/clinics`).then((response) => response.data);
export const getCompanyAdminsWithRegions = (company_id) =>
  api.get(`/superadmin/company/${company_id}/admins-with-regions`).then((response) => response.data);
export const registerCompany = (data) =>
  api.post('/superadmin/register-company', data).then((response) => response.data);
export const updateCompany = (company_id, data) =>
  api.put(`/superadmin/company/${company_id}`, data).then((response) => response.data);
export const updateCompanyStatus = (company_id, status) =>
  api.put(`/superadmin/company/${company_id}/status`, { status }).then((response) => response.data);
export const getAllAdmins = () =>
  api.get('/superadmin/admins').then((response) => response.data);
export const createAdmin = (data) =>
  api.post('/superadmin/create-admin', data).then((response) => response.data);
export const updateAdmin = (admin_id, data) =>
  api.put(`/superadmin/admin/${admin_id}`, data).then((response) => response.data);
export const getAdminRegions = (admin_id) =>
  api.get(`/superadmin/admin/${admin_id}/regions`).then((response) => response.data);
export const updateAdminRegions = (admin_id, region_ids) =>
  api.put(`/superadmin/admin/${admin_id}/regions`, { region_ids }).then((response) => response.data);
export const updateAdminContact = (admin_id, contact) =>
  api.put(`/superadmin/admin/${admin_id}/contact`, { contact }).then((response) => response.data);
export const deleteAdmin = (admin_id) =>
  api.delete(`/superadmin/admin/${admin_id}`).then((response) => response.data);
export const getAnalytics = () =>
  api.get('/superadmin/analytics').then((response) => response.data);
export const getChangeRequests = () =>
  api.get('/superadmin/change-requests').then((response) => response.data);
export const approveChangeRequest = (request_id) =>
  api.put(`/superadmin/change-request/${request_id}/approve`).then((response) => response.data);
export const rejectChangeRequest = (request_id, reason) =>
  api.put(`/superadmin/change-request/${request_id}/reject`, { reason }).then((response) => response.data);
export const getSuperadminComplaints = (status = 'all') =>
  api.get('/superadmin/complaints', { params: { status } }).then((response) => response.data);
export const updateSuperadminComplaintStatus = (complaint_id, data) =>
  api.put(`/superadmin/complaint/${complaint_id}/status`, data).then((response) => response.data);
export const getSystemUsability = () =>
  api.get('/superadmin/system-usability').then((response) => response.data);
