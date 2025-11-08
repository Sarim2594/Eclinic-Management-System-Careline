let allPastPatients = []; // This will now hold basic patient records the doctor has seen
let waitingPatientsInterval = null; // Global waiting patients polling interval
let lastWaitingPatientsCount = 0;

// ============================================================================
// DOCTOR PORTAL
// ============================================================================

function showDoctorTab(tab) {
    const tabs = ['waiting', 'past'];
    tabs.forEach(t => {
        const btn = document.getElementById(`doctor-tab-${t}`);
        if (btn) {
            btn.className = `px-4 py-3 font-medium border-b-2 whitespace-nowrap ${
                t === tab ? 'border-primary text-primary' : 'border-transparent text-gray-600'
            }`;
        }
        const content = document.getElementById(`doctor-tab-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== tab);
        }
    });

    if (tab === 'waiting') {
        loadWaitingPatients().catch(console.error);
        startWaitingPatientsPolling();
    } else if (tab === 'past') {
        loadDiagnosedPatients().catch(console.error);
        stopWaitingPatientsPolling();
    }
}

function startWaitingPatientsPolling() {
    if (waitingPatientsInterval) {
        clearInterval(waitingPatientsInterval);
    }
    const waitingTab = document.getElementById('doctor-tab-content-waiting');
    if (waitingTab && !waitingTab.classList.contains('hidden')) {
        displayWaitingPatients();
        waitingPatientsInterval = setInterval(displayWaitingPatients, 10000);
    }
}

function stopWaitingPatientsPolling() {
    if (waitingPatientsInterval) {
        clearInterval(waitingPatientsInterval);
        waitingPatientsInterval = null;
    }
}

async function displayWaitingPatients() {
    const doctor_id = currentUser.doctor_id;
    const container = document.getElementById('waiting-patients');
    if (!doctor_id || !container) return;

    try {
        const response = await fetch(`${API_URL}/doctor/${doctor_id}/waiting-patients`);
        const data = await response.json();

        if (lastWaitingPatientsCount === data.count) {return}
        
        lastWaitingPatientsCount = data.count;
        if (!data || data.count === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">✅ No patients waiting!</p>';
            return;
        }

        container.innerHTML = data.patients.map(appt => `
            <div class="border-b border-gray-200 mb-4">
                <div class="p-4 hover:bg-gray-50 rounded-lg">
                    <div class="flex justify-between items-start">
                        <div class="cursor-pointer flex-1" onclick="togglePatientDetails('${appt.id}')">
                            <h4 class="font-semibold text-lg">Ticket #${appt.ticket_no} - ${appt.name}</h4>
                            <p class="text-gray-600">${appt.age}y, ${appt.gender} | ${appt.contact}</p>
                            <p class="text-sm text-primary mt-1">Patient ID: ${appt.patient_id}</p>
                        </div>
                        <div class="text-right flex gap-2">
                            <button onclick="togglePatientDetails('${appt.id}')" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">View Details</button>
                            <button onclick="viewPatientHistory('${appt.patient_id}', event)" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">View History</button>
                        </div>
                    </div>
                </div>
                <div id="details-${appt.id}" class="hidden p-6 bg-gray-50 rounded-lg">
                    <input type="hidden" id="patient-id-${appt.id}" value="${appt.patient_id}">
                    <h5 class="font-semibold text-gray-800 mb-6">Vital Readings:</h5>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Blood Pressure *</label><input type="text" id="vitals-bp-${appt.id}" oninput="validateVitalsInput(this)" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="120/80" value="${appt.vitals.blood_pressure || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm) *</label><input type="number" step="0.1" id="vitals-hr-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="72" min="1" value="${appt.vitals.heart_rate || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Temperature (°F) *</label><input type="number" step="0.1" id="vitals-temperature-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98.6" min="1" value="${appt.vitals.temperature || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">BMI *</label><input type="number" step="0.1" id="vitals-bmi-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="24.5" min="1" value="${appt.vitals.bmi || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Blood Oxygen (%) *</label><input type="number" step="0.1" id="vitals-oxygen-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="98" min="1" max="100" value="${appt.vitals.blood_oxygen || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Weight (kg) *</label><input type="number" id="vitals-weight-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="75" min="1" value="${appt.vitals.weight || ''}"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label><input type="number" id="vitals-height-${appt.id}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="175" min="1" value="${appt.vitals.height || ''}"></div>
                    </div>
                    <hr class="mb-6 border-gray-300"> 
                    <div class="space-y-4">
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label><textarea id="diagnosis-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter diagnosis *"></textarea></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Prescription *</label><textarea id="prescription-${appt.id}" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Enter prescription *"></textarea></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label><textarea id="notes-${appt.id}" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Additional notes"></textarea></div>
                        <button onclick="submitDiagnosis('${appt.id}')" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Submit Diagnosis</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading waiting patients:', error);
    }
}

function displayDiagnosedPatients(patients) {
    const pastPatientsContainer = document.getElementById('past-patients');
    if (!pastPatientsContainer) return;
    
    if (patients.length === 0) {
        pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No matching patient records found.</p>';
        return;
    }
    pastPatientsContainer.innerHTML = patients.map(patient => `
        <div class="border-b border-gray-200 mb-4">
            <div class="p-4 hover:bg-gray-50 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg">${patient.name} (ID: ${patient.id})</h4>
                        <p class="text-gray-600">${patient.age}y, ${patient.gender} | ${patient.contact}</p>
                        <p class="text-sm text-blue-600 mt-1">Latest visit: ${patient.diagnosed_date}</p>
                    </div>
                    <button onclick="viewPatientHistory('${patient.id}', event)" 
                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                        View Full History
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function searchPastPatients(query) {
    if (!allPastPatients || allPastPatients.length === 0) return;
    const lowerCaseQuery = query.toLowerCase();

    const filteredPatients = allPastPatients.filter(patient => (
        (patient.name || '').toLowerCase().includes(lowerCaseQuery) ||
        (patient.contact || '').toLowerCase().includes(lowerCaseQuery) ||
        String(patient.id || '').includes(lowerCaseQuery) ||
        String(patient.age || '').includes(lowerCaseQuery) ||
        (patient.gender || '').toLowerCase().includes(lowerCaseQuery)
    ));
    displayDiagnosedPatients(filteredPatients);
}

async function loadDiagnosedPatients() {
    const doctor_id = currentUser.doctor_id;
    const pastPatientsContainer = document.getElementById('past-patients');
    if (!doctor_id || !pastPatientsContainer) return;

    pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Loading your diagnosed patients...</p>';

    try {
        const response = await fetch(`${API_URL}/doctor/${doctor_id}/past-patients`);
        const data = await response.json();

        if (!data || data.count === 0) {
            allPastPatients = [];
            pastPatientsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No previous patients found in your history.</p>';
            return;
        }
        allPastPatients = data.patients || [];
        displayDiagnosedPatients(allPastPatients);
    } catch (error) {
        pastPatientsContainer.innerHTML = '<p class="text-red-500 text-center py-8">Error loading patient history</p>';
        console.error('Error loading past patients:', error);
    }
}

async function viewPatientHistory(patient_id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const modal = document.getElementById('history-modal');
    const nameEl = document.getElementById('history-patient-name');
    const basicInfoEl = document.getElementById('history-patient-basic-info');
    const listEl = document.getElementById('history-appointment-list');

    if (!modal || !nameEl || !basicInfoEl || !listEl) return;

    nameEl.textContent = 'Loading...';
    basicInfoEl.innerHTML = '';
    listEl.innerHTML = '<p class="text-gray-500 text-center py-8">Fetching appointment records...</p>';
    modal.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_URL}/doctor/patient/${patient_id}/history`);
        const data = await response.json();

        if (!data.success) {
            listEl.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${data.detail || 'Could not fetch history'}</p>`;
            nameEl.textContent = 'History Error';
            return;
        }

        const patient = data.patient;
        const history = data.history;
        
        nameEl.textContent = `${patient.name}'s Appointment History`;
        basicInfoEl.innerHTML = `
            <p><strong>Patient ID:</strong> ${patient.id}</p>
            <p><strong>Age:</strong> ${patient.age}y, <strong>Gender:</strong> ${patient.gender}, <strong>Contact:</strong> ${patient.contact}</p>
        `;

        if (history.length === 0) {
            listEl.innerHTML = '<p class="text-gray-500 text-center py-8">No previous completed appointments found for this patient.</p>';
            return;
        }

        listEl.innerHTML = history.map(appt => `
            <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-lg text-gray-800">Visit on ${appt.diagnosed_date}</h4>
                    <span class="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">Dr. ${appt.doctor_name}</span>
                </div>
                <p class="text-sm text-gray-600 mb-4">Ticket #${appt.ticket_no} | Appointment ID: ${appt.appointment_id}</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Blood Pressure</p><p class="font-semibold">${appt.vitals.blood_pressure || 'N/A'}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Heart Rate</p><p class="font-semibold">${appt.vitals.heart_rate || 'N/A'} bpm</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Temp</p><p class="font-semibold">${appt.vitals.temperature || 'N/A'}°F</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">BMI</p><p class="font-semibold">${appt.vitals.bmi || 'N/A'}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Blood Oxygen percentage</p><p class="font-semibold">${appt.vitals.blood_oxygen || 'N/A'}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Weight</p><p class="font-semibold">${appt.vitals.weight || 'N/A'}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Height</p><p class="font-semibold">${appt.vitals.height || 'N/A'}</p></div>
                </div>
                <div class="space-y-3 mt-4">
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Diagnosis:</p><p class="font-medium text-gray-700 whitespace-pre-wrap">${appt.diagnosis}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Prescription:</p><p class="font-medium text-gray-700 whitespace-pre-wrap">${appt.prescription}</p></div>
                    <div class="bg-gray-50 p-3 rounded-lg border"><p class="text-xs text-gray-500">Notes:</p><p class="text-gray-700 whitespace-pre-wrap">${appt.notes}</p></div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listEl.innerHTML = `<p class="text-red-500 text-center py-8">Error loading history: ${error.message}</p>`;
        console.error('Error loading patient history:', error);
    }
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

async function loadWaitingPatients() {
    const doctor_id = currentUser.doctor_id;
    const container = document.getElementById('waiting-patients');
    if (!doctor_id || !container) return;

    container.innerHTML = '<p class="text-gray-500 text-center py-8">Loading patients...</p>';
    await displayWaitingPatients(); // Re-use the display function
}

function togglePatientDetails(appointmentId) {
    const detailsDiv = document.getElementById(`details-${appointmentId}`);
    if (!detailsDiv) return;
    detailsDiv.classList.toggle('hidden');
}

async function submitDiagnosis(appointmentId) {
    const patientId = document.getElementById(`patient-id-${appointmentId}`).value;
    
    const vitals = {
        blood_pressure: document.getElementById(`vitals-bp-${appointmentId}`) ? document.getElementById(`vitals-bp-${appointmentId}`).value.trim() : '',
        heart_rate: document.getElementById(`vitals-hr-${appointmentId}`) ? document.getElementById(`vitals-hr-${appointmentId}`).value.trim() : '',
        temperature: document.getElementById(`vitals-temperature-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-temperature-${appointmentId}`).value) : null,
        bmi: document.getElementById(`vitals-bmi-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-bmi-${appointmentId}`).value) : null,
        blood_oxygen: document.getElementById(`vitals-oxygen-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-oxygen-${appointmentId}`).value) : null,
        weight: document.getElementById(`vitals-weight-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-weight-${appointmentId}`).value) : null,
        height: document.getElementById(`vitals-height-${appointmentId}`) ? parseFloat(document.getElementById(`vitals-height-${appointmentId}`).value) : null
    };
    
    if (!vitals.blood_pressure || !vitals.heart_rate || !vitals.temperature || !vitals.bmi || !vitals.blood_oxygen || !vitals.weight || !vitals.height) {
        showPopUp('Missing Vitals', 'Please fill all vital reading fields', 'error');
        return;
    }
    const bpInput = document.getElementById(`vitals-bp-${appointmentId}`);
    if (bpInput && !validateVitalsInput(bpInput)) { 
        showPopUp('Invalid Format', 'Blood pressure must be in the format 120/80', 'error');
        return;
    }
    
    const diagnosis = document.getElementById(`diagnosis-${appointmentId}`)?.value.trim() || '';
    const prescription = document.getElementById(`prescription-${appointmentId}`)?.value.trim() || '';
    const notes = document.getElementById(`notes-${appointmentId}`)?.value.trim() || '';

    if (!diagnosis || !prescription) {
        showPopUp('Missing Information', 'Please enter both diagnosis and prescription', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/doctor/record-vitals/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vitals)
        });
        const data = await response.json();
        if (!data.success) {
            showPopUp('Vitals Update Failed', data.detail || 'Could not update vitals.', 'error');
            return;
        }
    } catch (error) {
        showPopUp('Error', error.message || 'Vitals update failed', 'error');
        return;
    }

    const diagnosisPayload = {
        appointment_id: appointmentId, 
        patient_id: patientId,         
        doctor_id: currentUser.doctor_id,
        diagnosis,
        prescription,
        notes
    };
    
    const confirmModal = document.getElementById('confirm-modal');
    const confirmButton = document.getElementById('confirm-submit-button');
    
    if (confirmModal && confirmButton) {
        confirmButton.setAttribute('data-diagnosis-payload', JSON.stringify(diagnosisPayload));
        confirmModal.classList.remove('hidden');
    } else {
        showPopUp('Error', 'Confirmation modal elements missing.', 'error');
    }
}

async function confirmDiagnosis() {
    const confirmButton = document.getElementById('confirm-submit-button');
    if (!confirmButton) return;

    const payloadString = confirmButton.getAttribute('data-diagnosis-payload');
    if (!payloadString) {
        showPopUp('Error', 'Missing diagnosis data. Please resubmit.', 'error');
        closeConfirmModal(); 
        return;
    }
    
    let finalDiagnosisData;
    try {
        finalDiagnosisData = JSON.parse(payloadString);
    } catch (e) {
        showPopUp('Error', 'Invalid data format. Please refresh.', 'error');
        closeConfirmModal();
        return;
    }
    
    confirmButton.removeAttribute('data-diagnosis-payload'); 

    try {
        const response = await fetch(`${API_URL}/doctor/submit-diagnosis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalDiagnosisData)
        });
        const data = await response.json();
        closeConfirmModal();
        if (data.success) {
            showPopUp('Diagnosis Submitted!', 'Patient vitals and diagnosis recorded.', 'success');
            loadWaitingPatients().catch(() => {});
            lastWaitingPatientsCount = -1;
        } else {
            showPopUp('Submission Failed', data.detail || 'Could not submit diagnosis', 'error');
        }
    } catch (error) {
        showPopUp('Error', 'Submission failed: ' + (error.message || error), 'error');
    }
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
    
    const confirmButton = document.getElementById('confirm-submit-button');
    if (confirmButton) {
        confirmButton.removeAttribute('data-diagnosis-payload');
    }
}

// Initial load for the doctor portal
document.addEventListener('DOMContentLoaded', () => {
    // Ensure this runs *after* shared.js has run checkAuth()
    if (currentUser && currentUser.role === 'doctor') {
        showDoctorTab('waiting');
    }
});