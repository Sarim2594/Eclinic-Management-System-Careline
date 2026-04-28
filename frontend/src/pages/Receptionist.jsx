import { useEffect, useState } from 'react';
import {
  bookPatientAppointment,
  createReceptionistComplaint,
  emailDiagnosis,
  forwardDoctorUnavailabilityRequest,
  getReceptionistAppointments,
  getReceptionistComplaints,
  getReceptionistDoctorUnavailabilityRequests,
  getReceptionistPatients,
  registerPatient,
  updatePatient,
  updateReceptionistComplaintStatus,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import InlineErrors from '../components/InlineErrors';
import {
  isValidCnic,
  isValidEmail,
  isValidPhone,
  sanitizeCnicInput,
  sanitizeEmailInput,
  sanitizePhoneInput,
} from '../utils/formValidation';
import { buildTableState, nextSort } from '../utils/table';

const EMPTY_PATIENT = {
  name: '',
  age: '',
  gender: 'Male',
  father_name: '',
  marital_status: 'Single',
  contact: '',
  email: '',
  address: '',
  cnic: '',
  occupation: '',
  nationality: 'Pakistani',
};

const EMPTY_COMPLAINT = {
  title: '',
  description: '',
  complaint_type: 'general',
  patient_id: '',
};

const LIVE_REFRESH_MS = 5000;

export default function Receptionist() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const clinic_id = user.clinic_id;

  const [activeTab, setActiveTab] = useState('patients');
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [patientErrors, setPatientErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientEditor, setPatientEditor] = useState(null);
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentStatus, setAppointmentStatus] = useState('all');
  const [complaints, setComplaints] = useState([]);
  const [complaintForm, setComplaintForm] = useState(EMPTY_COMPLAINT);
  const [complaintStatus, setComplaintStatus] = useState('all');
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [doctorRequestStatus, setDoctorRequestStatus] = useState('all');
  const [confirmState, setConfirmState] = useState(null);
  const [patientTable, setPatientTable] = useState({ query: '', sortKey: 'name', sortDirection: 'asc', page: 1 });
  const [appointmentTable, setAppointmentTable] = useState({ query: '', sortKey: 'created_at', sortDirection: 'desc', page: 1 });
  const [appointmentStartDate, setAppointmentStartDate] = useState('');
  const [appointmentEndDate, setAppointmentEndDate] = useState('');
  const [complaintTable, setComplaintTable] = useState({ query: '', sortKey: 'updated_at', sortDirection: 'desc', page: 1 });
  const [doctorRequestTable, setDoctorRequestTable] = useState({ query: '', sortKey: 'created_at', sortDirection: 'desc', page: 1 });

  useEffect(() => {
    loadPatients();
    loadAppointments('all');
    loadComplaints('all');
    loadDoctorRequests('all');
  }, []);

  useEffect(() => {
    const refreshActiveTab = async () => {
      if (activeTab === 'patients') {
        await loadPatients();
        return;
      }
      if (activeTab === 'appointments') {
        await loadAppointments(appointmentStatus);
        return;
      }
      if (activeTab === 'complaints') {
        await loadComplaints(complaintStatus);
        return;
      }
      if (activeTab === 'coordination') {
        await loadDoctorRequests(doctorRequestStatus);
      }
    };

    const interval = setInterval(() => {
      refreshActiveTab().catch((error) => {
        console.error('Failed to refresh receptionist portal', error);
      });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [activeTab, appointmentStatus, complaintStatus, doctorRequestStatus, clinic_id]);

  useEffect(() => {
    const refreshAppointmentsForNotifications = async (event) => {
      if (event.detail?.role !== 'receptionist') return;
      const hasDiagnosisUpdate = (event.detail?.notifications || []).some((notification) => (
        notification.type === 'diagnosis_completed' && !notification.read
      ));
      if (!hasDiagnosisUpdate) return;
      await loadAppointments(appointmentStatus);
    };

    const refreshAppointmentsOnFocus = () => {
      loadAppointments(appointmentStatus).catch((error) => {
        console.error('Failed to refresh receptionist appointments on focus', error);
      });
    };

    window.addEventListener('careline:notifications-updated', refreshAppointmentsForNotifications);
    window.addEventListener('focus', refreshAppointmentsOnFocus);

    return () => {
      window.removeEventListener('careline:notifications-updated', refreshAppointmentsForNotifications);
      window.removeEventListener('focus', refreshAppointmentsOnFocus);
    };
  }, [appointmentStatus]);

  const loadPatients = async () => {
    const data = await getReceptionistPatients({ clinic_id });
    setPatients(data.patients || []);
  };

  const loadAppointments = async (status) => {
    const data = await getReceptionistAppointments({ clinic_id, status });
    setAppointments(data.appointments || []);
  };

  const loadComplaints = async (status) => {
    const data = await getReceptionistComplaints(clinic_id, status);
    setComplaints(data.complaints || []);
  };

  const loadDoctorRequests = async (status) => {
    const data = await getReceptionistDoctorUnavailabilityRequests(status);
    setDoctorRequests(data.requests || []);
  };

  const validatePatientForm = () => {
    const errors = {};
    if (!patientForm.name.trim()) errors.name = 'Patient name is required.';
    if (!patientForm.age) errors.age = 'Age is required.';
    if (!patientForm.father_name.trim()) errors.father_name = 'Father name is required.';
    if (!patientForm.contact.trim()) errors.contact = 'Contact number is required.';
    else if (!isValidPhone(patientForm.contact)) errors.contact = 'Use an 11-digit mobile number like 03001234567.';
    if (!patientForm.email.trim()) errors.email = 'Email is required.';
    else if (!isValidEmail(patientForm.email)) errors.email = 'Enter a valid email address.';
    if (!patientForm.address.trim()) errors.address = 'Address is required.';
    if (!patientForm.cnic.trim()) errors.cnic = 'CNIC is required.';
    else if (!isValidCnic(patientForm.cnic)) errors.cnic = 'Use the format xxxxx-xxxxxxx-x.';
    setPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetPatientFormState = () => {
    setPatientEditor(null);
    setPatientForm(EMPTY_PATIENT);
    setPatientErrors({});
    setPatientFormOpen(false);
  };

  const handlePatientSubmit = async () => {
    if (!validatePatientForm()) return;

    try {
      if (patientEditor) {
        await updatePatient(patientEditor.id, { ...patientForm, age: Number(patientForm.age) });
        pushToast({ title: 'Patient updated', message: `${patientForm.name} was updated successfully.` });
      } else {
        const booking = await registerPatient({ ...patientForm, age: Number(patientForm.age), clinic_id });
        pushToast({
          title: 'Patient registered',
          message: `${patientForm.name} was registered with ID ${booking.patient?.registration_number || formatPatientRegistration(booking.patient?.id)} and queued successfully.`,
        });
        handlePrintQueueTicket(booking);
      }
      setPatientForm(EMPTY_PATIENT);
      setPatientEditor(null);
      setPatientErrors({});
      setPatientFormOpen(false);
      await Promise.all([loadPatients(), loadAppointments(appointmentStatus)]);
      setActiveTab('patients');
    } catch (error) {
      pushToast({ title: 'Patient action failed', message: error.response?.data?.detail || 'Please review the patient details.', tone: 'error' });
    }
  };

  const handleBookAppointment = async (patient) => {
    try {
      const booking = await bookPatientAppointment({ patient_id: patient.id });
      await Promise.all([loadPatients(), loadAppointments(appointmentStatus)]);
      pushToast({
        title: 'Appointment booked',
        message: `${patient.name} is queued as ticket #${booking.appointment?.ticket_no || '-'}.`,
      });
      handlePrintQueueTicket(booking);
      setActiveTab('appointments');
    } catch (error) {
      pushToast({
        title: 'Booking failed',
        message: error.response?.data?.detail || 'Unable to book the appointment right now.',
        tone: 'error',
      });
    }
  };

  const handleComplaintSubmit = async () => {
    if (!complaintForm.title.trim() || !complaintForm.description.trim()) {
      pushToast({ title: 'Complaint details missing', message: 'Title and description are required.', tone: 'error' });
      return;
    }

    try {
      await createReceptionistComplaint({
        ...complaintForm,
        clinic_id,
        receptionist_id: user.receptionist_id,
        patient_id: complaintForm.patient_id ? Number(complaintForm.patient_id) : null,
      });
      setComplaintForm(EMPTY_COMPLAINT);
      await loadComplaints(complaintStatus);
      pushToast({ title: 'Complaint logged', message: 'The complaint is now visible in the clinic queue.' });
    } catch (error) {
      pushToast({ title: 'Complaint failed', message: error.response?.data?.detail || 'Unable to create complaint.', tone: 'error' });
    }
  };

  const handleComplaintAction = async (complaint, status, options = {}) => {
    try {
      await updateReceptionistComplaintStatus(complaint.id, {
        status,
        resolution_note: options.resolution_note || '',
        escalated_to_admin: Boolean(options.escalated_to_admin),
        escalation_note: options.escalation_note || '',
      });
      await loadComplaints(complaintStatus);
      pushToast({
        title: 'Complaint updated',
        message: options.escalated_to_admin
          ? `${complaint.title} was escalated to Admin.`
          : `${complaint.title} is now ${status.replace('_', ' ')}.`,
      });
    } catch (error) {
      pushToast({ title: 'Complaint update failed', message: error.response?.data?.detail || 'Unable to update the complaint.', tone: 'error' });
    }
  };

  const handleForwardDoctorRequest = async (request) => {
    try {
      await forwardDoctorUnavailabilityRequest(request.id, {
        receptionist_comment: `Reviewed by receptionist ${user.name || ''}. Please confirm this unavailability request.`,
      });
      await loadDoctorRequests(doctorRequestStatus);
      pushToast({ title: 'Request forwarded', message: `${request.doctor_name}'s unavailability request was sent to Admin.` });
    } catch (error) {
      pushToast({ title: 'Forward failed', message: error.response?.data?.detail || 'Unable to forward the request.', tone: 'error' });
    }
  };

  const handlePrintDiagnosis = (appointment) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      pushToast({ title: 'Popup blocked', message: 'Please allow popups to print the diagnosis summary.', tone: 'error' });
      return;
    }

    const html = buildDiagnosisDocument(appointment);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePrintQueueTicket = (booking) => {
    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      pushToast({ title: 'Popup blocked', message: 'Please allow popups to print the queue ticket.', tone: 'error' });
      return;
    }

    const html = buildQueueTicketDocument(booking);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  const patientRows = buildTableState(patients, {
    ...patientTable,
    pageSize: 5,
    filterFn: (patient, query) => {
      const value = query.toLowerCase();
      return (
        `${patient.id || ''}`.includes(value) ||
        patient.registration_number?.toLowerCase().includes(value) ||
        patient.name?.toLowerCase().includes(value) ||
        patient.contact?.toLowerCase().includes(value) ||
        patient.email?.toLowerCase().includes(value) ||
        patient.cnic?.toLowerCase().includes(value)
      );
    },
  });

  const appointmentRows = buildTableState(appointments, {
    ...appointmentTable,
    pageSize: 6,
    filterFn: (appointment, query) => {
      const value = query.toLowerCase();
      const appointmentDate = appointment.ended_at || appointment.created_at;
      const createdAt = appointmentDate ? new Date(appointmentDate) : null;
      const matchesStart = !appointmentStartDate || !createdAt || createdAt >= new Date(`${appointmentStartDate}T00:00:00`);
      const matchesEnd = !appointmentEndDate || !createdAt || createdAt <= new Date(`${appointmentEndDate}T23:59:59`);
      return (
        matchesStart &&
        matchesEnd &&
        (
          `${appointment.ticket_no || ''}`.includes(value) ||
          `${appointment.patient_id || ''}`.includes(value) ||
          appointment.patient_registration_number?.toLowerCase().includes(value) ||
          appointment.patient_name?.toLowerCase().includes(value) ||
          appointment.doctor_name?.toLowerCase().includes(value) ||
          appointment.status?.toLowerCase().includes(value) ||
          appointment.diagnosis?.toLowerCase().includes(value)
        )
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
        complaint.complaint_type?.toLowerCase().includes(value) ||
        complaint.patient_name?.toLowerCase().includes(value) ||
        complaint.status?.toLowerCase().includes(value)
      );
    },
  });

  const doctorRequestRows = buildTableState(doctorRequests, {
    ...doctorRequestTable,
    pageSize: 6,
    filterFn: (request, query) => {
      const value = query.toLowerCase();
      return (
        request.doctor_name?.toLowerCase().includes(value) ||
        request.reason?.toLowerCase().includes(value) ||
        request.status?.toLowerCase().includes(value) ||
        request.receptionist_status?.toLowerCase().includes(value)
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto border-b border-gray-200 pb-1">
        {[
          ['patients', 'fa-solid fa-users', 'Patients'],
          ['appointments', 'fa-solid fa-calendar-check', 'Appointments'],
          ['complaints', 'fa-solid fa-life-ring', 'Complaints'],
          ['coordination', 'fa-solid fa-user-clock', 'Doctor Requests'],
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

      {activeTab === 'patients' ? (
        <Panel
          title="Patient Registry and Booking"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={patientTable.query}
                onChange={(event) => setPatientTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search by patient ID, CNIC, phone, or name"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => {
                  setPatientEditor(null);
                  setPatientForm(EMPTY_PATIENT);
                  setPatientErrors({});
                  setPatientFormOpen(true);
                }}
              >
                Add Patient
              </button>
            </div>
          )}
        >
          <p className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Register a patient once, then search by patient ID, CNIC, or phone number and book a new appointment directly from the table.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Patient ID" sortKey="id" tableState={patientTable} onSort={(next) => setPatientTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Name" sortKey="name" tableState={patientTable} onSort={(next) => setPatientTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Contact" sortKey="contact" tableState={patientTable} onSort={(next) => setPatientTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">CNIC</th>
                  <th className="px-4 py-3">Last Visit</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patientRows.rows.map((patient) => (
                  <tr key={patient.id} className="border-b border-gray-100 text-sm">
                    <td className="px-4 py-3 font-semibold text-gray-700">{patient.registration_number || formatPatientRegistration(patient.id)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{patient.name}</td>
                    <td className="px-4 py-3">{patient.contact}</td>
                    <td className="px-4 py-3">{patient.cnic}</td>
                    <td className="px-4 py-3">
                      {patient.last_visit ? (
                        <>
                          <p>{new Date(patient.last_visit).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{patient.last_company_name || patient.last_clinic_name || 'Previous clinic visit'}</p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">No visits yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label="Book Appointment"
                          tone="success"
                          onClick={() => setConfirmState({
                            title: 'Book appointment for this patient?',
                            message: `${patient.name} will receive the next available queue ticket.`,
                            confirmLabel: 'Book Appointment',
                            tone: 'primary',
                            onConfirm: async () => {
                              await handleBookAppointment(patient);
                              setConfirmState(null);
                            },
                          })}
                        />
                        <ActionButton
                          label="Edit"
                          onClick={() => {
                            setPatientEditor(patient);
                            setPatientForm({
                              name: patient.name || '',
                              age: String(patient.age || ''),
                              gender: patient.gender || 'Male',
                              father_name: patient.father_name || '',
                              marital_status: patient.marital_status || 'Single',
                              contact: sanitizePhoneInput(patient.contact || ''),
                              email: sanitizeEmailInput(patient.email || ''),
                              address: patient.address || '',
                              cnic: sanitizeCnicInput(patient.cnic || ''),
                              occupation: patient.occupation || '',
                              nationality: patient.nationality || 'Pakistani',
                            });
                            setPatientErrors({});
                            setPatientFormOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={patientRows.page} totalPages={patientRows.totalPages} onChange={(page) => setPatientTable((current) => ({ ...current, page }))} />
        </Panel>
      ) : null}

      {activeTab === 'appointments' ? (
        <Panel
          title="Clinic Appointments and Diagnosis Actions"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={appointmentTable.query}
                onChange={(event) => setAppointmentTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search by ticket, patient ID, name, doctor, or diagnosis"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <input
                type="date"
                value={appointmentStartDate}
                onChange={(event) => setAppointmentStartDate(event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <input
                type="date"
                value={appointmentEndDate}
                onChange={(event) => setAppointmentEndDate(event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <select
                value={appointmentStatus}
                onChange={async (event) => {
                  const nextStatus = event.target.value;
                  setAppointmentStatus(nextStatus);
                  await loadAppointments(nextStatus);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="waiting">Waiting</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1140px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Ticket" sortKey="ticket_no" tableState={appointmentTable} onSort={(next) => setAppointmentTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Patient" sortKey="patient_name" tableState={appointmentTable} onSort={(next) => setAppointmentTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Doctor" sortKey="doctor_name" tableState={appointmentTable} onSort={(next) => setAppointmentTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Status" sortKey="status" tableState={appointmentTable} onSort={(next) => setAppointmentTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Created" sortKey="created_at" tableState={appointmentTable} onSort={(next) => setAppointmentTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Diagnosis Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointmentRows.rows.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-gray-100 align-top text-sm">
                    <td className="px-4 py-3 font-semibold text-gray-900">#{appointment.ticket_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{appointment.patient_name}</p>
                      <p className="text-xs text-gray-500">{appointment.patient_registration_number || formatPatientRegistration(appointment.patient_id)}</p>
                      <p className="text-xs text-gray-500">{appointment.patient_email || appointment.patient_contact || 'No email available'}</p>
                    </td>
                    <td className="px-4 py-3">Dr. {appointment.doctor_name}</td>
                    <td className="px-4 py-3"><StatusPill value={appointment.status} /></td>
                    <td className="px-4 py-3">{new Date(appointment.ended_at || appointment.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {appointment.status === 'completed' && appointment.diagnosis ? (
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            label="Email"
                            onClick={() => setConfirmState({
                              title: 'Email diagnosis summary?',
                              message: `Send the diagnosis summary to ${appointment.patient_email || 'the patient'} using the configured email flow.`,
                              confirmLabel: 'Send Email',
                              tone: 'primary',
                              onConfirm: async () => {
                                await emailDiagnosis({ appointment_id: appointment.id, patient_email: appointment.patient_email });
                                pushToast({ title: 'Diagnosis email triggered', message: 'The diagnosis email endpoint responded successfully.' });
                                setConfirmState(null);
                              },
                            })}
                          />
                          <ActionButton label="Print" tone="secondary" onClick={() => handlePrintDiagnosis(appointment)} />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">Available after diagnosis</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={appointmentRows.page} totalPages={appointmentRows.totalPages} onChange={(page) => setAppointmentTable((current) => ({ ...current, page }))} />
        </Panel>
      ) : null}

      {activeTab === 'complaints' ? (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Panel title="Log Complaint">
            <div className="space-y-4">
              <Field label="Title" value={complaintForm.title} onChange={(value) => setComplaintForm((current) => ({ ...current, title: value }))} />
              <SelectField label="Complaint Type" value={complaintForm.complaint_type} onChange={(value) => setComplaintForm((current) => ({ ...current, complaint_type: value }))} options={['general', 'patient', 'doctor', 'system']} />
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-gray-700">Linked Patient</span>
                <select value={complaintForm.patient_id} onChange={(event) => setComplaintForm((current) => ({ ...current, patient_id: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3">
                  <option value="">No patient selected</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <TextAreaField label="Description" value={complaintForm.description} onChange={(value) => setComplaintForm((current) => ({ ...current, description: value }))} />
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleComplaintSubmit}>
                Submit Complaint
              </button>
            </div>
          </Panel>

          <Panel
            title="Complaint Queue"
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
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <SortableHeader label="Title" sortKey="title" tableState={complaintTable} onSort={(next) => setComplaintTable((current) => ({ ...current, ...next }))} />
                    <SortableHeader label="Type" sortKey="complaint_type" tableState={complaintTable} onSort={(next) => setComplaintTable((current) => ({ ...current, ...next }))} />
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
                      <td className="px-4 py-3">{complaint.complaint_type}</td>
                      <td className="px-4 py-3">{complaint.patient_name || 'No patient linked'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <StatusPill value={complaint.status} />
                          {complaint.escalated_to_admin ? <StatusPill value="escalated" /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{complaint.updated_at ? new Date(complaint.updated_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {complaint.status === 'open' ? (
                            <ActionButton
                              label="Start"
                              tone="secondary"
                              onClick={() => handleComplaintAction(complaint, 'in_progress', { resolution_note: 'Complaint accepted by receptionist for review.' })}
                            />
                          ) : null}
                          {complaint.status !== 'resolved' && complaint.status !== 'closed' ? (
                            <ActionButton
                              label="Resolve"
                              tone="success"
                              onClick={() => handleComplaintAction(complaint, 'resolved', { resolution_note: 'Resolved by receptionist at clinic level.' })}
                            />
                          ) : null}
                          {!complaint.escalated_to_admin ? (
                            <ActionButton
                              label="Escalate"
                              tone="danger"
                              onClick={() => handleComplaintAction(complaint, complaint.status === 'open' ? 'in_progress' : complaint.status, {
                                escalated_to_admin: true,
                                escalation_note: `Escalated by receptionist ${user.name || ''} for admin support.`,
                              })}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={complaintRows.page} totalPages={complaintRows.totalPages} onChange={(page) => setComplaintTable((current) => ({ ...current, page }))} />
          </Panel>
        </div>
      ) : null}

      {activeTab === 'coordination' ? (
        <Panel
          title="Doctor Unavailability Coordination"
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={doctorRequestTable.query}
                onChange={(event) => setDoctorRequestTable((current) => ({ ...current, query: event.target.value, page: 1 }))}
                placeholder="Search requests"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <select
                value={doctorRequestStatus}
                onChange={async (event) => {
                  const nextStatus = event.target.value;
                  setDoctorRequestStatus(nextStatus);
                  await loadDoctorRequests(nextStatus);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <SortableHeader label="Doctor" sortKey="doctor_name" tableState={doctorRequestTable} onSort={(next) => setDoctorRequestTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="Start" sortKey="start_datetime" tableState={doctorRequestTable} onSort={(next) => setDoctorRequestTable((current) => ({ ...current, ...next }))} />
                  <SortableHeader label="End" sortKey="end_datetime" tableState={doctorRequestTable} onSort={(next) => setDoctorRequestTable((current) => ({ ...current, ...next }))} />
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Receptionist</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctorRequestRows.rows.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 align-top text-sm">
                    <td className="px-4 py-3 font-semibold text-gray-900">{request.doctor_name}</td>
                    <td className="px-4 py-3">{new Date(request.start_datetime).toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(request.end_datetime).toLocaleString()}</td>
                    <td className="px-4 py-3">{request.reason}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <StatusPill value={request.receptionist_status || 'pending'} />
                        {request.receptionist_comment ? <p className="text-xs text-gray-500">{request.receptionist_comment}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <StatusPill value={request.status} />
                        {request.admin_comment ? <p className="text-xs text-gray-500">{request.admin_comment}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' && request.receptionist_status !== 'forwarded' ? (
                        <ActionButton label="Forward To Admin" onClick={() => handleForwardDoctorRequest(request)} />
                      ) : (
                        <span className="text-xs font-medium text-gray-500">Already coordinated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={doctorRequestRows.page} totalPages={doctorRequestRows.totalPages} onChange={(page) => setDoctorRequestTable((current) => ({ ...current, page }))} />
        </Panel>
      ) : null}

      {patientFormOpen ? (
        <Modal title={patientEditor ? 'Update Patient Information' : 'Register New Patient'} onClose={resetPatientFormState}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Patient Name" value={patientForm.name} error={patientErrors.name} onChange={(value) => setPatientForm((current) => ({ ...current, name: value }))} />
            <Field label="Age" type="number" value={patientForm.age} error={patientErrors.age} onChange={(value) => setPatientForm((current) => ({ ...current, age: value }))} />
            <SelectField label="Gender" value={patientForm.gender} onChange={(value) => setPatientForm((current) => ({ ...current, gender: value }))} options={['Male', 'Female']} />
            <SelectField label="Marital Status" value={patientForm.marital_status} onChange={(value) => setPatientForm((current) => ({ ...current, marital_status: value }))} options={['Single', 'Married']} />
            <Field label="Father Name" value={patientForm.father_name} error={patientErrors.father_name} onChange={(value) => setPatientForm((current) => ({ ...current, father_name: value }))} />
            <Field label="CNIC" placeholder="12345-1234567-1" inputMode="numeric" value={patientForm.cnic} error={patientErrors.cnic} onChange={(value) => setPatientForm((current) => ({ ...current, cnic: sanitizeCnicInput(value) }))} />
            <Field label="Contact Number" placeholder="03001234567" inputMode="numeric" value={patientForm.contact} error={patientErrors.contact} onChange={(value) => setPatientForm((current) => ({ ...current, contact: sanitizePhoneInput(value) }))} />
            <Field label="Email" type="email" placeholder="patient@example.com" value={patientForm.email} error={patientErrors.email} onChange={(value) => setPatientForm((current) => ({ ...current, email: sanitizeEmailInput(value) }))} />
            <Field label="Address" value={patientForm.address} error={patientErrors.address} onChange={(value) => setPatientForm((current) => ({ ...current, address: value }))} />
            <Field label="Occupation" value={patientForm.occupation} onChange={(value) => setPatientForm((current) => ({ ...current, occupation: value }))} />
            <Field label="Nationality" value={patientForm.nationality} onChange={(value) => setPatientForm((current) => ({ ...current, nationality: value }))} />
          </div>
          <div className="mt-4 space-y-4">
            <InlineErrors errors={patientErrors} />
            <div className="flex gap-3">
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handlePatientSubmit}>
                {patientEditor ? 'Save Patient Changes' : 'Register Patient & Book Appointment'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                onClick={resetPatientFormState}
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
        tone={confirmState?.tone || 'danger'}
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

function Field({ label, value, onChange, error, type = 'text', placeholder, inputMode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <input type={type} inputMode={inputMode} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'}`} />
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function TextAreaField({ label, value, onChange, error }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <textarea rows="5" value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-4 py-3 ${error ? 'border-[#CC2229]' : 'border-gray-300'}`} />
      {error ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3">
        {options.map((option) => {
          if (Array.isArray(option)) {
            return <option key={option[0]} value={option[0]}>{option[1]}</option>;
          }
          return <option key={option} value={option}>{option}</option>;
        })}
      </select>
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

function StatusPill({ value }) {
  const styles = value === 'completed' || value === 'resolved' || value === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : value === 'waiting' || value === 'open' || value === 'pending' || value === 'in_progress' || value === 'forwarded' || value === 'escalated'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-700';
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
    <button type="button" className={`rounded-lg px-3 py-2 text-xs font-semibold ${styles}`} onClick={onClick}>
      {label}
    </button>
  );
}

function buildDiagnosisDocument(appointment) {
  const visitTime = appointment.ended_at || appointment.created_at;
  const companyName = getCompanyDisplayName(appointment.company_name);
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${companyName} Diagnosis Summary</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; color: #1f2937; font-size: 12px; }
          .sheet { max-width: 840px; margin: 0 auto; }
          .hero { background: linear-gradient(135deg, #fff1f2, #fee2e2); border: 1px solid #fecdd3; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
          .hero h1 { margin: 0 0 4px; color: #b91c1c; font-size: 20px; }
          .hero p { margin: 2px 0; color: #4b5563; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; }
          .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px; }
          .value { font-size: 12px; line-height: 1.45; white-space: pre-wrap; }
          .section { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
          .section h2 { margin: 0 0 6px; font-size: 15px; color: #111827; }
          .footer { margin-top: 12px; font-size: 11px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <h1>${companyName} Diagnosis Summary</h1>
            <p>Ticket #${appointment.ticket_no || '-'}</p>
            <p>Prepared on ${visitTime ? new Date(visitTime).toLocaleString() : '-'}</p>
          </div>
          <div class="grid">
            <div class="card">
              <div class="label">Patient</div>
              <div class="value">${appointment.patient_name || '-'}</div>
            </div>
            <div class="card">
              <div class="label">Patient ID</div>
              <div class="value">${appointment.patient_registration_number || formatPatientRegistration(appointment.patient_id)}</div>
            </div>
            <div class="card">
              <div class="label">Doctor</div>
              <div class="value">Dr. ${appointment.doctor_name || '-'}</div>
            </div>
            <div class="card">
              <div class="label">Company</div>
              <div class="value">${companyName}</div>
            </div>
            <div class="card">
              <div class="label">Email</div>
              <div class="value">${appointment.patient_email || '-'}</div>
            </div>
            <div class="card">
              <div class="label">Contact</div>
              <div class="value">${appointment.patient_contact || '-'}</div>
            </div>
          </div>
          <div class="section">
            <h2>Diagnosis</h2>
            <div class="value">${appointment.diagnosis || 'No diagnosis recorded.'}</div>
          </div>
          <div class="section">
            <h2>Recorded Vitals</h2>
            <div class="value">${formatVitalsForPrint(appointment.vitals)}</div>
          </div>
          <div class="section">
            <h2>Prescription</h2>
            <div class="value">${appointment.prescription || 'No prescription recorded.'}</div>
          </div>
          <div class="section">
            <h2>Doctor Notes</h2>
            <div class="value">${appointment.notes || 'No additional notes recorded.'}</div>
          </div>
          <div class="footer">This summary was generated from the ${companyName} receptionist portal.</div>
        </div>
      </body>
    </html>
  `;
}

function buildQueueTicketDocument(booking) {
  const patient = booking?.patient || {};
  const appointment = booking?.appointment || {};
  const issuedAt = appointment.created_at ? new Date(appointment.created_at) : new Date();
  const companyName = getCompanyDisplayName(appointment.company_name);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${companyName} Queue Ticket</title>
        <style>
          @page { size: 80mm 105mm; margin: 4mm; }
          body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
          .ticket { border: 2px dashed #CC2229; border-radius: 14px; padding: 12px 10px; }
          .brand { text-align: center; margin-bottom: 8px; }
          .brand h1 { margin: 0; font-size: 16px; color: #CC2229; }
          .brand p { margin: 3px 0 0; font-size: 10px; color: #6b7280; }
          .queue { margin: 8px 0; border-radius: 12px; background: #fff1f2; padding: 10px 8px; text-align: center; }
          .queue-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
          .queue-number { margin-top: 4px; font-size: 32px; font-weight: 700; color: #991b1b; }
          .row { margin-bottom: 7px; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
          .value { margin-top: 2px; font-size: 13px; font-weight: 600; }
          .footer { margin-top: 8px; text-align: center; font-size: 10px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="brand">
            <h1>${companyName} Queue Ticket</h1>
            <p>Please keep this slip until your consultation is complete.</p>
          </div>
          <div class="queue">
            <div class="queue-label">Queue Number</div>
            <div class="queue-number">#${appointment.ticket_no || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Patient</div>
            <div class="value">${patient.name || appointment.patient_name || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Patient ID</div>
            <div class="value">${patient.registration_number || appointment.patient_registration_number || formatPatientRegistration(patient.id || appointment.patient_id)}</div>
          </div>
          <div class="row">
            <div class="label">Doctor</div>
            <div class="value">Dr. ${appointment.doctor_name || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Contact</div>
            <div class="value">${patient.contact || appointment.patient_contact || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Issued At</div>
            <div class="value">${issuedAt.toLocaleString()}</div>
          </div>
          <div class="footer">Queue numbering restarts automatically every day after midnight.</div>
        </div>
      </body>
    </html>
  `;
}

function formatVitalsForPrint(vitals) {
  const values = vitals && typeof vitals === 'object' ? vitals : {};
  const lines = [
    ['Temperature', values.temperature ? `${values.temperature} F` : '-'],
    ['Blood Pressure', values.blood_pressure || '-'],
    ['Pulse Rate', values.pulse_rate ? `${values.pulse_rate} bpm` : '-'],
    ['Height', values.height ? `${values.height} cm` : '-'],
    ['Weight', values.weight ? `${values.weight} kg` : '-'],
    ['Blood Oxygen', values.blood_oxygen ? `${values.blood_oxygen}%` : '-'],
    ['Blood Sugar Level', values.blood_sugar_level ? `${values.blood_sugar_level} mg/dL` : '-'],
  ];
  return lines.map(([label, value]) => `${label}: ${value}`).join('\n');
}

function formatPatientRegistration(patientId) {
  if (!patientId) return 'PT-000000';
  return `PT-${String(patientId).padStart(6, '0')}`;
}

function getCompanyDisplayName(companyName) {
  const trimmed = `${companyName || ''}`.trim();
  return trimmed || 'Clinic';
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
