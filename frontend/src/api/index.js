import axios from 'axios';

// ============================================================================
// API LAYER
// Replaces: all fetch() calls scattered across static/components/*.js
// Single source of truth for every backend call.
// The proxy in package.json forwards /api/* to http://localhost:5000
// ============================================================================

const api = axios.create({ baseURL: '/api' });

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const login = (credentials) =>
  api.post('/auth/login', credentials).then(r => r.data);

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
export const getNotifications = (role, user_id) =>
  api.get(`/notifications/${role}`, { params: { user_id } }).then(r => r.data);
export const markNotificationRead = (id) =>
  api.put(`/notifications/mark-read/${id}`).then(r => r.data);
export const markAllNotificationsRead = (role, user_id) =>
  api.put(`/notifications/mark-all-read/${role}`, null, { params: { user_id } }).then(r => r.data);

// ─── BULLETINS ───────────────────────────────────────────────────────────────
export const getBulletins = () => api.get('/bulletins').then(r => r.data);
export const getBulletinsByAdmin = (admin_id) =>
  api.get(`/bulletins/admin/${admin_id}`).then(r => r.data);
export const getBulletinsByCompany = (company_id) =>
  api.get(`/bulletins/company/${company_id}`).then(r => r.data);

// ─── CLINICS ─────────────────────────────────────────────────────────────────
export const getClinics = (params = {}) =>
  api.get('/clinics', { params }).then(r => r.data);
export const getClinicCompany = (clinic_id) =>
  api.get(`/clinic/${clinic_id}/company`).then(r => r.data);

// ─── REGIONS & CITIES ────────────────────────────────────────────────────────
export const getAllRegions = () => api.get('/regions/all').then(r => r.data);
export const getAllCities = () => api.get('/cities/all').then(r => r.data);
export const lookupCityRegion = (city) =>
  api.get(`/regions/lookup/${city}`).then(r => r.data);

// ─── ADMIN ───────────────────────────────────────────────────────────────────
export const getAdminStatistics = (params) =>
  api.get('/admin/statistics', { params }).then(r => r.data);
export const getAdminReceptionists = (params) =>
  api.get('/admin/receptionists', { params }).then(r => r.data);
export const getAdminDoctors = (params) =>
  api.get('/admin/doctors', { params }).then(r => r.data);
export const getAvailableDoctors = () =>
  api.get('/admin/available-doctors').then(r => r.data);
export const getUnavailableDoctors = (admin_id) =>
  api.get('/admin/unavailable-doctors', { params: { admin_id } }).then(r => r.data);
export const createReceptionist = (data) =>
  api.post('/admin/create-receptionist', data).then(r => r.data);
export const createDoctor = (data) =>
  api.post('/admin/create-doctor', data).then(r => r.data);
export const createClinic = (data) =>
  api.post('/admin/create-clinic', data).then(r => r.data);
export const transferDoctor = (data) =>
  api.post('/admin/transfer-doctor', data).then(r => r.data);
export const updateDoctorAvailability = (doctor_id, data) =>
  api.put(`/admin/update-availability/${doctor_id}`, data).then(r => r.data);
export const monitorDoctors = () =>
  api.get('/admin/monitor-doctors').then(r => r.data);
export const postBulletin = (data) =>
  api.post('/admin/post-bulletin', data).then(r => r.data);
export const deleteBulletin = (bulletin_id, admin_id) =>
  api.delete(`/admin/delete-bulletin/${bulletin_id}`, { params: { admin_id } }).then(r => r.data);
export const requestPasswordChange = (data) =>
  api.post('/admin/request-password-change', data).then(r => r.data);
export const requestContactChange = (data) =>
  api.post('/admin/request-contact-change', data).then(r => r.data);
export const requestGeneralQuery = (data) =>
  api.post('/admin/request-general-query', data).then(r => r.data);
export const getUnavailabilityRequests = (admin_id) =>
  api.get('/admin/doctor-unavailability-requests', { params: { admin_id } }).then(r => r.data);
export const approveUnavailability = (request_id, admin_id, admin_comment = '') =>
  api.put(`/admin/unavailability-request/${request_id}/approve`, null, { params: { admin_id, admin_comment } }).then(r => r.data);
export const rejectUnavailability = (request_id, admin_id, reason) =>
  api.put(`/admin/unavailability-request/${request_id}/reject`, { reason }, { params: { admin_id } }).then(r => r.data);
export const getAdminCities = (admin_id) =>
  api.get('/admin/cities', { params: { admin_id } }).then(r => r.data);
export const getAdminClinicBreakdown = (params) =>
  api.get('/admin/clinics-breakdown', { params }).then(r => r.data);
export const getDoctorSchedule = (doctor_id) =>
  api.get('/admin/doctor-schedule', { params: { doctor_id } }).then(r => r.data);
export const getSpecializations = () =>
  api.get('/admin/specializations').then(r => r.data);
export const getAvailableDoctorsForClinic = (clinic_id) =>
  api.get(`/admin/clinic/${clinic_id}/available-doctors`).then(r => r.data);
export const transferPatients = (from_doctor_id, to_doctor_id) =>
  api.post('/admin/transfer-patients', null, { params: { from_doctor_id, to_doctor_id } }).then(r => r.data);

// ─── DOCTOR ──────────────────────────────────────────────────────────────────
export const getWaitingPatients = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/waiting-patients`).then(r => r.data);
export const getPastPatients = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/past-patients`).then(r => r.data);
export const getPatientHistory = (patient_id) =>
  api.get(`/doctor/patient/${patient_id}/history`).then(r => r.data);
export const recordVitals = (patient_id, vitals) =>
  api.put(`/doctor/record-vitals/${patient_id}`, vitals).then(r => r.data);
export const submitDiagnosis = (data) =>
  api.post('/doctor/submit-diagnosis', data).then(r => r.data);
export const setDoctorInactive = (doctor_id) =>
  api.put(`/doctor/${doctor_id}/set-inactive`).then(r => r.data);
export const requestUnavailability = (data) =>
  api.post('/doctor/request-unavailability', data).then(r => r.data);
export const getDoctorUnavailabilityRequests = (doctor_id) =>
  api.get(`/doctor/${doctor_id}/unavailability-requests`).then(r => r.data);

// ─── RECEPTIONIST ────────────────────────────────────────────────────────────
export const registerPatient = (data) =>
  api.post('/receptionist/register-patient', data).then(r => r.data);
export const getDiagnoses = () =>
  api.get('/receptionist/get-diagnoses').then(r => r.data);
export const emailDiagnosis = (data) =>
  api.post('/receptionist/email-diagnosis', data).then(r => r.data);

// ─── SUPERADMIN ──────────────────────────────────────────────────────────────
export const getSuperadminDashboard = () =>
  api.get('/superadmin/dashboard').then(r => r.data);
export const getAllCompanies = () =>
  api.get('/superadmin/companies').then(r => r.data);
export const getCompanyClinics = (company_id) =>
  api.get(`/superadmin/company/${company_id}/clinics`).then(r => r.data);
export const getCompanyAdminsWithRegions = (company_id) =>
  api.get(`/superadmin/company/${company_id}/admins-with-regions`).then(r => r.data);
export const registerCompany = (data) =>
  api.post('/superadmin/register-company', data).then(r => r.data);
export const updateCompanyStatus = (company_id, status) =>
  api.put(`/superadmin/company/${company_id}/status`, { status }).then(r => r.data);
export const getAllAdmins = () =>
  api.get('/superadmin/admins').then(r => r.data);
export const createAdmin = (data) =>
  api.post('/superadmin/create-admin', data).then(r => r.data);
export const getAdminRegions = (admin_id) =>
  api.get(`/superadmin/admin/${admin_id}/regions`).then(r => r.data);
export const updateAdminRegions = (admin_id, region_ids) =>
  api.put(`/superadmin/admin/${admin_id}/regions`, { region_ids }).then(r => r.data);
export const updateAdminContact = (admin_id, contact) =>
  api.put(`/superadmin/admin/${admin_id}/contact`, { contact }).then(r => r.data);
export const deleteAdmin = (admin_id) =>
  api.delete(`/superadmin/admin/${admin_id}`).then(r => r.data);
export const getAnalytics = () =>
  api.get('/superadmin/analytics').then(r => r.data);
export const getChangeRequests = () =>
  api.get('/superadmin/change-requests').then(r => r.data);
export const approveChangeRequest = (request_id) =>
  api.put(`/superadmin/change-request/${request_id}/approve`).then(r => r.data);
export const rejectChangeRequest = (request_id, reason) =>
  api.put(`/superadmin/change-request/${request_id}/reject`, { reason }).then(r => r.data);
