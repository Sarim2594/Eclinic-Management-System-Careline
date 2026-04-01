import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerPatient, getDiagnoses, emailDiagnosis } from '../api';

export default function Receptionist() {
  const { user } = useAuth();
  const [activeTab, setActiveTab]     = useState('register');
  const [diagnoses, setDiagnoses]     = useState([]);
  const [filteredDx, setFilteredDx]   = useState([]);
  const [msg, setMsg]                 = useState({ text: '', type: '' });
  const [loading, setLoading]         = useState(false);

  useEffect(() => { if (activeTab === 'diagnosis') fetchDiagnoses(); }, [activeTab]);

  const fetchDiagnoses = async () => {
    const data = await getDiagnoses();
    const list = data.diagnoses || [];
    setDiagnoses(list); setFilteredDx(list);
  };

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  const handleRegister = async () => {
    const get = id => document.getElementById(id)?.value?.trim() ?? '';
    const payload = {
      name:           get('patient-name'),
      age:            parseInt(get('patient-age')),
      gender:         get('patient-gender'),
      father_name:    get('patient-father-name'),
      marital_status: get('patient-marital-status'),
      contact:        get('patient-contact'),
      email:          get('patient-email'),
      address:        get('patient-address'),
      cnic:           get('patient-cnic'),
      occupation:     get('patient-occupation'),
      nationality:    get('patient-nationality'),
      clinic_id:      user.clinic_id,
    };
    if (!payload.name || !payload.age || !payload.contact || !payload.email || !payload.cnic || !payload.nationality) {
      showMsg('Please fill all required fields', 'error'); return;
    }
    setLoading(true);
    try {
      await registerPatient(payload);
      showMsg('Patient registered and assigned to doctor successfully!', 'success');
      ['patient-name','patient-age','patient-father-name','patient-contact','patient-email',
       'patient-address','patient-cnic','patient-occupation','patient-nationality'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  const searchDiagnoses = (query) => {
    if (!query) { setFilteredDx(diagnoses); return; }
    const q = query.toLowerCase();
    setFilteredDx(diagnoses.filter(d =>
      d.patient_name?.toLowerCase().includes(q) ||
      d.patient_contact?.toLowerCase().includes(q) ||
      String(d.id).includes(q)
    ));
  };

  const TAB_BTN = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)} id={`tab-${id}`}
      className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:border-gray-300'
      }`}
    >
      <i className={`${icon} mr-2`}></i>{label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        {TAB_BTN('register', 'Register Patient', 'fas fa-user-plus')}
        {TAB_BTN('diagnosis', 'Previous Diagnoses', 'fas fa-history')}
      </div>

      {msg.text && (
        <div className={`hidden mb-6 p-4 rounded-lg ${
          msg.type === 'success' ? '!block bg-green-50 border border-green-200 text-green-800'
                                 : '!block bg-red-50 border border-red-200 text-red-800'
        }`} style={{display:'block'}}>
          {msg.text}
        </div>
      )}

      {/* REGISTER TAB */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Register New Patient</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Field label="Patient Name *" id="patient-name" placeholder="Muhammad Ali" />
            <Field label="Age *" id="patient-age" type="number" placeholder="35" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <select id="patient-gender" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status *</label>
              <select id="patient-marital-status" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>
            <Field label="Father Name *" id="patient-father-name" placeholder="Muhammad Raza" />
            <Field label="CNIC *" id="patient-cnic" placeholder="42101-1234567-1" />
            <Field label="Contact Number *" id="patient-contact" placeholder="+92 300-1234567" defaultValue="+92 " />
            <Field label="Email Address *" id="patient-email" type="email" placeholder="patient@example.com" />
            <Field label="Address *" id="patient-address" />
            <Field label="Occupation" id="patient-occupation" />
            <Field label="Nationality *" id="patient-nationality" defaultValue="Pakistani" />
          </div>
          <button
            onClick={handleRegister} disabled={loading}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Registering…' : 'Register Patient & Print Ticket'}
          </button>
        </div>
      )}

      {/* DIAGNOSIS TAB */}
      {activeTab === 'diagnosis' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Previous Diagnoses</h3>
          <div className="mb-6">
            <input
              type="text" onChange={e => searchDiagnoses(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="Search by name, contact, patient ID..."
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
          <div className="space-y-4" id="diagnosis-list">
            {filteredDx.length === 0 && <p className="text-gray-500 text-center py-8">No diagnosis data available.</p>}
            {filteredDx.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{d.patient_name}</p>
                    <p className="text-sm text-gray-500">{d.patient_contact} · Dr. {d.doctor_name}</p>
                    <p className="text-sm text-gray-600 mt-1"><strong>Diagnosis:</strong> {d.diagnosis || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Prescription:</strong> {d.prescription || '—'}</p>
                    {d.ended_at && <p className="text-xs text-gray-400 mt-1">{new Date(d.ended_at).toLocaleString()}</p>}
                  </div>
                  <button
                    onClick={() => emailDiagnosis({ appointment_id: d.id, patient_email: d.patient_email })}
                    className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
                  >
                    <i className="fas fa-envelope mr-1"></i>Email
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, type='text', placeholder='', defaultValue='' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={type} id={id} defaultValue={defaultValue}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        placeholder={placeholder}
      />
    </div>
  );
}