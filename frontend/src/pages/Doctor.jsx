import { useEffect, useMemo, useState } from 'react';
import {
  getAllRegions,
  getDoctorRegionChangeHistory,
  getDoctorUnavailabilityRequests,
  getPastPatients,
  getPatientHistory,
  getWaitingPatients,
  requestDoctorRegionChange,
  requestUnavailability,
  submitDiagnosis,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

const VITAL_FIELDS = [
  { key: 'temperature', label: 'Temperature', unit: 'F', type: 'number', min: 90, max: 110, step: '0.1' },
  { key: 'blood_pressure', label: 'Blood Pressure', placeholder: '120/80' },
  { key: 'pulse_rate', label: 'Pulse Rate', unit: 'bpm', type: 'number', min: 30, max: 220, step: '1' },
  { key: 'height', label: 'Height', unit: 'cm', type: 'number', min: 30, max: 260, step: '0.1' },
  { key: 'weight', label: 'Weight', unit: 'kg', type: 'number', min: 1, max: 400, step: '0.1' },
  { key: 'blood_oxygen', label: 'Blood Oxygen', unit: '%', type: 'number', min: 50, max: 100, step: '1' },
  { key: 'blood_sugar_level', label: 'Blood Sugar Level', unit: 'mg/dL', type: 'number', min: 20, max: 600, step: '1' },
];

const EMPTY_VITALS = {
  temperature: '',
  blood_pressure: '',
  pulse_rate: '',
  height: '',
  weight: '',
  blood_oxygen: '',
  blood_sugar_level: '',
};

const LIVE_REFRESH_MS = 15000;

export default function Doctor() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const doctor_id = user.doctor_id;

  const [activeTab, setActiveTab] = useState('waiting');
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [pastPatients, setPastPatients] = useState([]);
  const [unavailabilityRequests, setUnavailabilityRequests] = useState([]);
  const [regionRequests, setRegionRequests] = useState([]);
  const [regions, setRegions] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [unavailabilityForm, setUnavailabilityForm] = useState({ start_datetime: '', end_datetime: '', reason: '' });
  const [regionForm, setRegionForm] = useState({ requested_region_id: '', reason: '' });
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  useEffect(() => {
    loadWaitingPatients();
    loadPastPatients();
    loadRequests();
    loadRegions();
  }, []);

  useEffect(() => {
    const refreshActiveTab = async () => {
      if (activeTab === 'requests') {
        await loadRequests();
        return;
      }

      await Promise.all([
        loadWaitingPatients(),
        loadPastPatients(),
      ]);
    };

    const interval = setInterval(() => {
      refreshActiveTab().catch((error) => {
        console.error('Failed to refresh doctor portal', error);
      });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [activeTab, doctor_id]);

  const loadWaitingPatients = async () => {
    const data = await getWaitingPatients(doctor_id);
    setWaitingPatients(data.patients || []);
  };

  const loadPastPatients = async () => {
    const data = await getPastPatients(doctor_id);
    setPastPatients(data.patients || []);
  };

  const loadRequests = async () => {
    const [unavailabilityRes, regionRes] = await Promise.all([
      getDoctorUnavailabilityRequests(doctor_id),
      getDoctorRegionChangeHistory(doctor_id),
    ]);
    setUnavailabilityRequests(unavailabilityRes.requests || []);
    setRegionRequests(regionRes.requests || []);
  };

  const loadRegions = async () => {
    const data = await getAllRegions();
    setRegions(data.regions || []);
  };

  const openHistory = async (patientId, patientName) => {
    const data = await getPatientHistory(patientId);
    setHistoryModal({ patientName });
    setHistoryItems(data.history || []);
  };

  const handleUnavailabilitySubmit = async () => {
    if (!unavailabilityForm.start_datetime || !unavailabilityForm.end_datetime || !unavailabilityForm.reason.trim()) {
      pushToast({ title: 'Request incomplete', message: 'Start, end, and reason are required.', tone: 'error' });
      return;
    }

    await requestUnavailability({ doctor_id, ...unavailabilityForm });
    setUnavailabilityForm({ start_datetime: '', end_datetime: '', reason: '' });
    await loadRequests();
    pushToast({ title: 'Time-off request submitted', message: 'Your unavailability request is now pending review.' });
  };

  const handleRegionRequestSubmit = async () => {
    if (!regionForm.requested_region_id || !regionForm.reason.trim()) {
      pushToast({ title: 'Request incomplete', message: 'Choose a region and add a reason.', tone: 'error' });
      return;
    }

    await requestDoctorRegionChange({
      doctor_id,
      requested_region_id: Number(regionForm.requested_region_id),
      reason: regionForm.reason,
    });
    setRegionForm({ requested_region_id: '', reason: '' });
    await loadRequests();
    pushToast({ title: 'Region change submitted', message: 'Your clinic-side review request has been created.' });
  };

  const filteredPastPatients = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    return pastPatients.filter((patient) => {
      const matchesQuery = !query || [
        patient.registration_number,
        patient.id,
        patient.name,
        patient.contact,
        patient.cnic,
        patient.diagnosis,
      ].some((value) => `${value || ''}`.toLowerCase().includes(query));

      const visitDate = patient.last_visit ? new Date(patient.last_visit) : null;
      if (!visitDate) return matchesQuery;

      const matchesStart = !historyStartDate || visitDate >= new Date(`${historyStartDate}T00:00:00`);
      const matchesEnd = !historyEndDate || visitDate <= new Date(`${historyEndDate}T23:59:59`);
      return matchesQuery && matchesStart && matchesEnd;
    });
  }, [pastPatients, historySearch, historyStartDate, historyEndDate]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto border-b border-gray-200 pb-1">
        {[
          ['waiting', 'fa-solid fa-hourglass-half', 'Waiting Patients'],
          ['history', 'fa-solid fa-clock-rotate-left', 'Your History'],
          ['requests', 'fa-solid fa-calendar-days', 'Unavailability Requests'],
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

      {activeTab === 'waiting' ? (
        <Panel title="Waiting Patients">
          <div className="space-y-4">
            {waitingPatients.length === 0 ? <EmptyState text="No patients are waiting right now." /> : null}
            {waitingPatients.map((patient) => (
              <WaitingCard
                key={patient.id}
                patient={patient}
                pushToast={pushToast}
                onViewHistory={() => openHistory(patient.patient_id, patient.patient_name)}
                onSubmitDiagnosis={(diagnosisData) => setConfirmState({
                  title: `Submit diagnosis for ${patient.patient_name}?`,
                  message: 'This will save the vitals, complete the consultation, and move the patient into history.',
                  confirmLabel: 'Submit Diagnosis',
                  onConfirm: async () => {
                    try {
                      await submitDiagnosis({ appointment_id: patient.id, ...diagnosisData });
                      await Promise.all([loadWaitingPatients(), loadPastPatients()]);
                      pushToast({ title: 'Consultation completed', message: `${patient.patient_name}'s vitals and diagnosis were saved successfully.` });
                      setConfirmState(null);
                    } catch (error) {
                      pushToast({
                        title: 'Unable to complete consultation',
                        message: error.response?.data?.detail || 'Please review the highlighted values and try again.',
                        tone: 'error',
                      });
                    }
                  },
                })}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'history' ? (
        <Panel title="Diagnosed Patients" actions={(
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search by patient ID, contact, CNIC, or diagnosis"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
            <input
              type="date"
              value={historyStartDate}
              onChange={(event) => setHistoryStartDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
            <input
              type="date"
              value={historyEndDate}
              onChange={(event) => setHistoryEndDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            />
          </div>
        )}>
          <div className="space-y-3">
            {filteredPastPatients.length === 0 ? <EmptyState text="No completed patient history matches your filters." /> : null}
            {filteredPastPatients.map((patient) => (
              <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="text-sm text-gray-500">{patient.registration_number || formatPatientRegistration(patient.id)}</p>
                  <p className="font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-500">{patient.contact} • {patient.gender} • {patient.age} yrs</p>
                  <p className="text-sm text-gray-400">Last visit: {new Date(patient.last_visit).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                  onClick={() => openHistory(patient.id, patient.name)}
                >
                  View History
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === 'requests' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Unavailability Request">
            <div className="space-y-4">
              <Field label="Start Date & Time" type="datetime-local" value={unavailabilityForm.start_datetime} onChange={(value) => setUnavailabilityForm((current) => ({ ...current, start_datetime: value }))} />
              <Field label="End Date & Time" type="datetime-local" value={unavailabilityForm.end_datetime} onChange={(value) => setUnavailabilityForm((current) => ({ ...current, end_datetime: value }))} />
              <TextAreaField label="Reason" value={unavailabilityForm.reason} onChange={(value) => setUnavailabilityForm((current) => ({ ...current, reason: value }))} />
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleUnavailabilitySubmit}>
                Submit Unavailability Request
              </button>
            </div>
            <Section title="Recent Unavailability Requests">
              {unavailabilityRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  title={`${new Date(request.start_datetime).toLocaleDateString()} to ${new Date(request.end_datetime).toLocaleDateString()}`}
                  subtitle={request.reason}
                  note={[
                    request.receptionist_status ? `Receptionist status: ${request.receptionist_status}` : null,
                    request.receptionist_comment ? `Receptionist note: ${request.receptionist_comment}` : null,
                    request.admin_comment ? `Admin note: ${request.admin_comment}` : null,
                  ].filter(Boolean).join(' | ')}
                  status={request.status}
                />
              ))}
            </Section>
          </Panel>

          <Panel title="Region Change Request">
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-gray-700">Requested Region</span>
                <select value={regionForm.requested_region_id} onChange={(event) => setRegionForm((current) => ({ ...current, requested_region_id: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3">
                  <option value="">Select a region</option>
                  {regions.map((region) => (
                    <option key={region.region_id} value={region.region_id}>{region.province} • {region.sub_region}</option>
                  ))}
                </select>
              </label>
              <TextAreaField label="Reason for change" value={regionForm.reason} onChange={(value) => setRegionForm((current) => ({ ...current, reason: value }))} />
              <button type="button" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleRegionRequestSubmit}>
                Submit Region Change
              </button>
            </div>
            <Section title="Recent Region Requests">
              {regionRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  title={`${request.province} • ${request.sub_region}`}
                  subtitle={request.reason}
                  note={request.reviewer_comment}
                  status={request.status}
                />
              ))}
            </Section>
          </Panel>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={confirmState?.onConfirm || (() => {})}
        onCancel={() => setConfirmState(null)}
      />

      {historyModal ? (
        <Modal title={`${historyModal.patientName} • Appointment History`} onClose={() => setHistoryModal(null)}>
          <div className="space-y-3">
            {historyItems.length === 0 ? <EmptyState text="No previous history is recorded for this patient yet." /> : null}
            {historyItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-900">{new Date(item.created_at).toLocaleDateString()} • {item.clinic_name}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {formatVitals(item.vitals).map((entry) => (
                    <p key={entry.label} className="text-sm text-gray-700"><strong>{entry.label}:</strong> {entry.value}</p>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-700"><strong>Diagnosis:</strong> {item.diagnosis || '-'}</p>
                <p className="text-sm text-gray-700"><strong>Prescription:</strong> {item.prescription || '-'}</p>
                {item.notes ? <p className="text-sm text-gray-700"><strong>Notes:</strong> {item.notes}</p> : null}
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Panel({ title, children, actions }) {
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
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <div className="space-y-3">{children.length ? children : <EmptyState text="No requests yet." />}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, min, max, step, inputMode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        className="w-full rounded-lg border border-gray-300 px-4 py-3"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <textarea rows="4" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
    </label>
  );
}

function StatusPill({ value }) {
  const styles = value === 'completed' || value === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : value === 'waiting' || value === 'pending'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{value}</span>;
}

function RequestCard({ title, subtitle, note, status }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{subtitle}</p>
          {note ? <p className="mt-1 text-sm text-gray-500">Review note: {note}</p> : null}
        </div>
        <StatusPill value={status} />
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">{text}</p>;
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

function WaitingCard({ patient, onViewHistory, onSubmitDiagnosis, pushToast }) {
  const [expanded, setExpanded] = useState(false);
  const [vitals, setVitals] = useState(EMPTY_VITALS);
  const [diagnosis, setDiagnosis] = useState({ diagnosis: '', prescription: '', notes: '' });
  const [vitalErrors, setVitalErrors] = useState({});
  const [diagnosisErrors, setDiagnosisErrors] = useState({});

  const handleSubmit = () => {
    const nextVitalErrors = validateVitals(vitals);
    const nextDiagnosisErrors = validateDiagnosis(diagnosis);
    setVitalErrors(nextVitalErrors);
    setDiagnosisErrors(nextDiagnosisErrors);

    if (Object.keys(nextVitalErrors).length > 0 || Object.keys(nextDiagnosisErrors).length > 0) {
      pushToast({
        title: 'Consultation details need attention',
        message: 'Enter all required vitals and complete the diagnosis details before submitting.',
        tone: 'error',
      });
      return;
    }

    onSubmitDiagnosis({
      ...diagnosis,
      vitals: normalizeVitals(vitals),
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-4">
        <div>
          <p className="font-semibold text-gray-900">Ticket #{patient.ticket_no} • {patient.patient_name}</p>
          <p className="text-sm text-gray-500">{patient.patient_contact} • {patient.patient_age} yrs • {patient.patient_gender}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200" onClick={onViewHistory}>
            History
          </button>
          <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Hide' : 'Open'}
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="grid gap-6 p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Record vitals</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {VITAL_FIELDS.map((field) => (
                <label key={field.key} className="block text-sm">
                  <span className="mb-2 block font-semibold text-gray-700">{field.label}{field.unit ? ` (${field.unit})` : ''}</span>
                  <input
                    type={field.type || 'text'}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    inputMode={field.type === 'number' ? 'decimal' : 'text'}
                    value={vitals[field.key]}
                    onChange={(event) => setVitals((current) => ({ ...current, [field.key]: event.target.value }))}
                    className={`w-full rounded-lg border px-4 py-3 ${vitalErrors[field.key] ? 'border-[#CC2229]' : 'border-gray-300'}`}
                  />
                  {vitalErrors[field.key] ? <span className="mt-1 block text-xs font-medium text-[#CC2229]">{vitalErrors[field.key]}</span> : null}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500">Vitals will be saved automatically when you submit the consultation.</p>
          </div>

          <div className="space-y-3">
            <TextAreaField label="Diagnosis" value={diagnosis.diagnosis} error={diagnosisErrors.diagnosis} onChange={(value) => setDiagnosis((current) => ({ ...current, diagnosis: value }))} />
            <TextAreaField label="Prescription" value={diagnosis.prescription} error={diagnosisErrors.prescription} onChange={(value) => setDiagnosis((current) => ({ ...current, prescription: value }))} />
            <TextAreaField label="Notes" value={diagnosis.notes} onChange={(value) => setDiagnosis((current) => ({ ...current, notes: value }))} />
            <button type="button" className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark" onClick={handleSubmit}>
              Submit Diagnosis
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function validateVitals(vitals) {
  const errors = {};
  const temperature = toNumber(vitals.temperature);
  const pulseRate = toNumber(vitals.pulse_rate);
  const height = toNumber(vitals.height);
  const weight = toNumber(vitals.weight);
  const bloodOxygen = toNumber(vitals.blood_oxygen);
  const bloodSugarLevel = toNumber(vitals.blood_sugar_level);

  if (temperature === null || temperature < 90 || temperature > 110) {
    errors.temperature = 'Temperature must be between 90 and 110 F.';
  }
  const bloodPressureError = getBloodPressureError(vitals.blood_pressure);
  if (bloodPressureError) {
    errors.blood_pressure = bloodPressureError;
  }
  if (pulseRate === null || pulseRate < 30 || pulseRate > 220) {
    errors.pulse_rate = 'Pulse rate must be between 30 and 220 bpm.';
  }
  if (height === null || height < 30 || height > 260) {
    errors.height = 'Height must be between 30 and 260 cm.';
  }
  if (weight === null || weight < 1 || weight > 400) {
    errors.weight = 'Weight must be between 1 and 400 kg.';
  }
  if (bloodOxygen === null || bloodOxygen < 50 || bloodOxygen > 100) {
    errors.blood_oxygen = 'Blood oxygen must be between 50 and 100%.';
  }
  if (bloodSugarLevel === null || bloodSugarLevel < 20 || bloodSugarLevel > 600) {
    errors.blood_sugar_level = 'Blood sugar must be between 20 and 600 mg/dL.';
  }

  return errors;
}

function getBloodPressureError(value) {
  const match = `${value || ''}`.trim().match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return 'Use blood pressure format like 120/80.';
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (systolic <= diastolic) {
    return 'The top blood pressure number should be higher than the bottom number.';
  }
  if (systolic < 70 || systolic > 250 || diastolic < 40 || diastolic > 150) {
    return 'Blood pressure looks out of range. Enter a realistic reading like 120/80.';
  }
  return null;
}

function validateDiagnosis(diagnosis) {
  const errors = {};
  if (!diagnosis.diagnosis?.trim()) {
    errors.diagnosis = 'Enter the diagnosis before completing the consultation.';
  }
  if (!diagnosis.prescription?.trim()) {
    errors.prescription = 'Enter the prescription or write "No medication prescribed".';
  }
  return errors;
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVitals(vitals) {
  return {
    temperature: Number(vitals.temperature),
    blood_pressure: `${vitals.blood_pressure}`.trim(),
    pulse_rate: Number(vitals.pulse_rate),
    height: Number(vitals.height),
    weight: Number(vitals.weight),
    blood_oxygen: Number(vitals.blood_oxygen),
    blood_sugar_level: Number(vitals.blood_sugar_level),
  };
}

function formatVitals(vitals) {
  const values = vitals && typeof vitals === 'object' ? vitals : {};
  return [
    { label: 'Temperature', value: values.temperature ? `${values.temperature} F` : '-' },
    { label: 'Blood Pressure', value: values.blood_pressure || '-' },
    { label: 'Pulse Rate', value: values.pulse_rate ? `${values.pulse_rate} bpm` : '-' },
    { label: 'Height', value: values.height ? `${values.height} cm` : '-' },
    { label: 'Weight', value: values.weight ? `${values.weight} kg` : '-' },
    { label: 'Blood Oxygen', value: values.blood_oxygen ? `${values.blood_oxygen}%` : '-' },
    { label: 'Blood Sugar Level', value: values.blood_sugar_level ? `${values.blood_sugar_level} mg/dL` : '-' },
  ];
}

function formatPatientRegistration(patientId) {
  if (!patientId) return 'Patient ID unavailable';
  return `PT-${String(patientId).padStart(6, '0')}`;
}
