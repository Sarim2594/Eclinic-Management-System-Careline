import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getWaitingPatients, getPastPatients, getPatientHistory,
  recordVitals, submitDiagnosis, setDoctorInactive,
  requestUnavailability, getDoctorUnavailabilityRequests,
} from '../api';

// Restores: exact tab/card structure from templates/doctor.html
// Tabs: Waiting Patients | Your History | Unavailability Requests

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function Doctor() {
  const { user } = useAuth();
  const doctor_id = user.doctor_id;

  const [activeTab, setActiveTab]       = useState('waiting');
  const [waiting, setWaiting]           = useState([]);
  const [past, setPast]                 = useState([]);
  const [filteredPast, setFilteredPast] = useState([]);
  const [unavailReqs, setUnavailReqs]   = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyList, setHistoryList]   = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchWaiting();
    pollingRef.current = setInterval(fetchWaiting, 15000);
    return () => clearInterval(pollingRef.current);
  }, []);

  const fetchWaiting = async () => {
    try {
      const data = await getWaitingPatients(doctor_id);
      setWaiting(data.patients || []);
    } catch {}
  };

  const handleTab = async (tab) => {
    setActiveTab(tab);
    if (tab === 'past') {
      const data = await getPastPatients(doctor_id);
      const list = data.patients || [];
      setPast(list); setFilteredPast(list);
    }
    if (tab === 'unavailability') {
      const data = await getDoctorUnavailabilityRequests(doctor_id);
      setUnavailReqs(data.requests || []);
    }
  };

  const openHistory = async (p) => {
    setHistoryModal(p);
    const data = await getPatientHistory(p.patient_id);
    setHistoryList(data.history || []);
  };

  const searchPast = (query) => {
    if (!query) { setFilteredPast(past); return; }
    const q = query.toLowerCase();
    setFilteredPast(past.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.contact?.toLowerCase().includes(q) ||
      String(p.age)?.includes(q) ||
      p.gender?.toLowerCase().includes(q)
    ));
  };

  const handleSubmitUnavail = async (e) => {
    e.preventDefault();
    const start = document.getElementById('unavail-start-date').value;
    const end   = document.getElementById('unavail-end-date').value;
    const reason = document.getElementById('unavail-reason').value;
    await requestUnavailability({ doctor_id, start_datetime: start, end_datetime: end, reason });
    const data = await getDoctorUnavailabilityRequests(doctor_id);
    setUnavailReqs(data.requests || []);
    document.getElementById('unavail-start-date').value = '';
    document.getElementById('unavail-end-date').value = '';
    document.getElementById('unavail-reason').value = '';
  };

  const TAB_BTN = (id, label, icon) => (
    <button
      onClick={() => handleTab(id)}
      id={`doctor-tab-${id}`}
      className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
        activeTab === id
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-600 hover:border-gray-300'
      }`}
    >
      <i className={`${icon} mr-2`}></i>{label}
    </button>
  );

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        {TAB_BTN('waiting', 'Waiting Patients', 'fas fa-hourglass-half')}
        {TAB_BTN('past', 'Your History', 'fas fa-history')}
        {TAB_BTN('unavailability', 'Unavailability Requests', 'fas fa-calendar-times')}
      </div>

      {/* WAITING PATIENTS */}
      {activeTab === 'waiting' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">My Waiting Patients</h3>
          <div id="waiting-patients">
            {waiting.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No patients waiting.</p>
            ) : (
              <div className="space-y-4">
                {waiting.map(p => (
                  <WaitingPatientCard
                    key={p.id} patient={p}
                    onViewHistory={() => openHistory(p)}
                    onVitals={recordVitals}
                    onConfirmDiagnosis={(appt) => setConfirmModal(appt)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAST PATIENTS */}
      {activeTab === 'past' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Patients You've Diagnosed</h3>
          <div className="mb-6">
            <input
              type="text"
              onChange={e => searchPast(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="Search by name, contact, age, or gender..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mt-2">Start Date</label>
                <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mt-2">End Date</label>
                <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {filteredPast.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.age} yrs · {p.gender} · {p.contact}</p>
                  <p className="text-sm text-gray-400">Last visit: {new Date(p.last_visit).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => openHistory(p)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
                >
                  View History
                </button>
              </div>
            ))}
            {filteredPast.length === 0 && <p className="text-gray-500 text-center py-8">No results found.</p>}
          </div>
        </div>
      )}

      {/* UNAVAILABILITY */}
      {activeTab === 'unavailability' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Request Time Off</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800"><i className="fas fa-info-circle mr-2"></i>Submit a request for unavailability. Your admin will review and approve or reject your request.</p>
          </div>
          <form onSubmit={handleSubmitUnavail} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                <input type="datetime-local" id="unavail-start-date" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                <input type="datetime-local" id="unavail-end-date" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
              <textarea id="unavail-reason" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" rows="3" placeholder="e.g., Medical appointment, Family emergency, etc." />
            </div>
            <button type="submit" className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
              <i className="fas fa-paper-plane mr-2"></i>Submit Request
            </button>
          </form>
          <h4 className="text-lg font-bold text-gray-800 mb-4">Your Requests</h4>
          <div className="space-y-3">
            {unavailReqs.length === 0 && <p className="text-gray-500 text-center py-8">No requests yet.</p>}
            {unavailReqs.map(r => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{new Date(r.start_datetime).toLocaleDateString()} → {new Date(r.end_datetime).toLocaleDateString()}</p>
                    {r.reason && <p className="text-sm text-gray-500 mt-1">{r.reason}</p>}
                    {r.admin_comment && <p className="text-sm text-gray-500 mt-1">Admin note: {r.admin_comment}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700'
                    : r.status === 'rejected' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-800">{historyModal.name} — History</h3>
              <button onClick={() => setHistoryModal(null)} className="text-gray-500 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 pb-6 pt-4 space-y-4">
              {historyList.length === 0 && <p className="text-gray-500 text-center py-8">No appointment history.</p>}
              {historyList.map(h => (
                <div key={h.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-700">{new Date(h.created_at).toLocaleDateString()} — {h.clinic_name}</p>
                  <p className="text-sm text-gray-600 mt-1"><strong>Diagnosis:</strong> {h.diagnosis || '—'}</p>
                  <p className="text-sm text-gray-600"><strong>Prescription:</strong> {h.prescription || '—'}</p>
                  {h.notes && <p className="text-sm text-gray-500"><strong>Notes:</strong> {h.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIAGNOSIS MODAL */}
      {confirmModal && (
        <ConfirmDiagnosisModal
          appointment={confirmModal}
          onClose={() => setConfirmModal(null)}
          onConfirm={async (diagnosisData) => {
            await submitDiagnosis({ appointment_id: confirmModal.id, ...diagnosisData });
            setConfirmModal(null);
            fetchWaiting();
          }}
        />
      )}
    </div>
  );
}

function WaitingPatientCard({ patient, onViewHistory, onVitals, onConfirmDiagnosis }) {
  const [expanded, setExpanded] = useState(false);
  const [vitals, setVitals]     = useState({ bp_systolic:'', bp_diastolic:'', temperature:'', pulse:'' });
  const [diagnosis, setDiagnosis] = useState({ diagnosis:'', prescription:'', notes:'' });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="font-bold text-gray-800">Ticket #{patient.ticket_no} — {patient.patient_name}</p>
          <p className="text-sm text-gray-500">{patient.age} yrs · {patient.gender} · {patient.contact}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onViewHistory(patient); }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
            <i className="fas fa-history mr-1"></i>History
          </button>
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-gray-400`}></i>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
          {/* Vitals */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Record Vitals</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['bp_systolic','BP Systolic'],['bp_diastolic','BP Diastolic'],['temperature','Temp (°F)'],['pulse','Pulse']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-500 mb-1">{l}</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={vitals[k]} onChange={e => setVitals(v => ({ ...v, [k]: e.target.value }))}
                    placeholder={l}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => onVitals(patient.patient_id, vitals)}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Save Vitals
            </button>
          </div>

          {/* Diagnosis */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Diagnosis & Prescription</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Diagnosis</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={diagnosis.diagnosis} onChange={e => setDiagnosis(d => ({ ...d, diagnosis: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prescription</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={diagnosis.prescription} onChange={e => setDiagnosis(d => ({ ...d, prescription: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={diagnosis.notes} onChange={e => setDiagnosis(d => ({ ...d, notes: e.target.value }))} />
              </div>
            </div>
            <button
              onClick={() => onConfirmDiagnosis({ ...patient, diagnosisData: diagnosis })}
              className="mt-3 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors"
            >
              <i className="fas fa-check mr-1"></i>Submit Diagnosis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmDiagnosisModal({ appointment, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirm Submission</h3>
          <p className="text-gray-600">Are you sure you want to submit this diagnosis?</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => onConfirm(appointment.diagnosisData)}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors">
            Yes, Submit
          </button>
          <button onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}