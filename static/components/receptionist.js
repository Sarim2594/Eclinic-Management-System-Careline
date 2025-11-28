import * as validate from '../validation_functions.js';
import * as popup from '../popup_modal.js';
import { getUser } from '../user_state.js';

let diagnosesData = [];

export function showReceptionistTab(tab) {
    const tabs = ['register', 'diagnosis']; 
    
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.classList.remove('border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'text-gray-600', 'hover:border-gray-300');
        }
    });

    const active = document.getElementById(`tab-${tab}`);
    if (active) {
        active.classList.add('border-primary', 'text-primary');
        active.classList.remove('border-transparent', 'text-gray-600', 'hover:border-gray-300');
    }

    const registerTab = document.getElementById('register-tab');
    const diagnosisTab = document.getElementById('diagnosis-tab');

    if (registerTab) registerTab.classList.toggle('hidden', tab !== 'register');
    if (diagnosisTab) diagnosisTab.classList.toggle('hidden', tab !== 'diagnosis');
    
    if (tab === 'diagnosis') {
        displayDiagnoses();
    }
}

async function printQueueTicket(ticketData) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const currentDate = new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    printWindow.document.writeln(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Queue Ticket #${ticketData.ticket_no}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .ticket {
                    border: 2px solid #333;
                    padding: 20px;
                    text-align: center;
                }
                .ticket-header {
                    border-bottom: 2px dashed #333;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                }
                .ticket-number {
                    font-size: 48px;
                    font-weight: bold;
                    color: #2563eb;
                    margin: 10px 0;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #ddd;
                }
                .info-label {
                    font-weight: bold;
                    color: #555;
                }
                .info-value {
                    color: #000;
                }
                .clinic-name {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .ticket-footer {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 2px dashed #333;
                    font-size: 12px;
                    color: #666;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="ticket-header">
                    <div style="font-size: 14px; color: #666;">Queue Ticket</div>
                </div>
                
                <div class="ticket-number">#${ticketData.ticket_no}</div>
                
                <div style="margin: 20px 0;">
                    <div class="info-row">
                        <span class="info-label">Patient ID:</span>
                        <span class="info-value">${ticketData.patient_id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Doctor:</span>
                        <span class="info-value">Dr. ${ticketData.doctor_name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date & Time:</span>
                        <span class="info-value">${currentDate}</span>
                    </div>
                </div>
                
                <div class="ticket-footer">
                    <p style="margin: 5px 0;">Please wait for your number to be called</p>
                    <p style="margin: 5px 0;">Thank you for your patience</p>
                </div>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; margin-right: 10px;">Print Ticket</button>
                <button onclick="window.close()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #6b7280; color: white; border: none; border-radius: 8px;">Close</button>
            </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
                
            </script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

export async function registerPatient() {
    const receptionistData = getUser();
    if (!receptionistData || !receptionistData.clinic_id) {
        popup.showPopUp('Error', 'Receptionist or clinic info missing.', 'error');
        return;
    }

    const mr = document.getElementById('patient-mr') ? document.getElementById('patient-mr').value.trim() : '';
    const name = document.getElementById('patient-name') ? document.getElementById('patient-name').value.trim() : '';
    const age = document.getElementById('patient-age') ? document.getElementById('patient-age').value : '';
    const email = document.getElementById('patient-email') ? document.getElementById('patient-email').value.trim() : '';
    // ... (rest of field collections)

    if (!mr || !name || !age || !email) { // simplified check for brevity
        popup.showPopUp('Missing Fields', 'Please fill all required fields', 'error');
        return;
    }

    if (!validate.email(email)) {
        popup.showPopUp('Invalid Email', 'Please enter a valid email address', 'error');
        return;
    }

    try {
        const payload = { 
            mr, name, age: parseInt(age, 10), email, clinic_id: receptionistData.clinic_id,
            // ... (rest of payload fields)
            gender: document.getElementById('patient-gender').value,
            father_name: document.getElementById('patient-father-name').value.trim(),
            marital_status: document.getElementById('patient-marital-status').value,
            contact: document.getElementById('patient-contact').value.trim(),
            address: document.getElementById('patient-address').value.trim(),
            cnic: document.getElementById('patient-cnic').value.trim(),
            occupation: document.getElementById('patient-occupation').value.trim(),
            nationality: document.getElementById('patient-nationality').value.trim(),
        };

        const response = await fetch(`/api/receptionist/register-patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            popup.showPopUp('Patient Registered!', `Ticket #${data.ticket_no} | Patient ID: ${data.patient_id} | Assigned to Dr. ${data.doctor_name}`, 'success');
            printQueueTicket(data);
            // Clear form
            document.getElementById('patient-mr').value = '';
            document.getElementById('patient-name').value = '';
            document.getElementById('patient-age').value = '';
            document.getElementById('patient-email').value = '';
            document.getElementById('patient-gender').value = '';
            document.getElementById('patient-father-name').value = '';
            document.getElementById('patient-marital-status').value = '';
            document.getElementById('patient-contact').value = '+92 ';
            document.getElementById('patient-address').value = '';
            document.getElementById('patient-cnic').value = '';
            document.getElementById('patient-occupation').value = '';
            document.getElementById('patient-nationality').value = '';
        } else {
            popup.showPopUp('Registration Failed', data.detail || 'Could not register patient', 'error');
        }
    } catch (error) {
        popup.showPopUp('Error', 'Registration failed: ' + (error.message || error), 'error');
    }
}

async function displayDiagnoses(filteredDiagnoses = null) {
    // ... (logic remains the same, no userState dependency in this function)
    const loadingEl = document.getElementById('diagnosis-loading');
    const listEl = document.getElementById('diagnosis-list');
    const noDataEl = document.getElementById('no-diagnosis-message');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (listEl) listEl.innerHTML = '';
    if (noDataEl) noDataEl.classList.add('hidden');
    
    if (filteredDiagnoses) {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (filteredDiagnoses.length > 0) {
            if (listEl) {
                listEl.innerHTML = filteredDiagnoses.map((d, idx) => createDiagnosisCard(d, idx)).join('');
            }
        } else {
            if (noDataEl) noDataEl.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch('/api/receptionist/get-diagnoses');
        const data = await response.json();
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (data.success && data.diagnoses && data.diagnoses.length > 0) {
            diagnosesData = data.diagnoses;
            if (listEl) {
                listEl.innerHTML = data.diagnoses.map((d, idx) => createDiagnosisCard(d, idx)).join('');
            }
        } else {
            if (noDataEl) noDataEl.classList.remove('hidden');
        }
    } catch (error) {
        if (loadingEl) loadingEl.classList.add('hidden');
        popup.showPopUp('Error', 'Failed to load diagnoses: ' + (error.message || error), 'error');
    }
}

window.searchPastDiagnoses = function(query = null) {
    // ... (logic remains the same, uses local diagnosesData)
    if (!diagnosesData || diagnosesData.length === 0) return;
    const searchText = query !== null ? query : document.getElementById('past-diagnoses-search').value;
    const lowerCaseQuery = (searchText || '').toLowerCase();

    const startDateInput = document.getElementById('start-date').value;
    const endDateInput = document.getElementById('end-date').value;
    const startDate = startDateInput ? new Date(startDateInput) : new Date(0);
    const endDate = endDateInput ? new Date(endDateInput) : new Date();
    endDate.setDate(endDate.getDate() + 1);

    const filteredDiagnoses = diagnosesData.filter(diagnosis => {
        const diagnosisDate = new Date(diagnosis.diagnosed_date); 
        
        const isWithinDateRange = 
            diagnosisDate >= startDate && diagnosisDate < endDate;
            
        let matchesTextQuery = true; 

        if (lowerCaseQuery.length > 0) {
            matchesTextQuery = (
                (diagnosis.patient_name || '').toLowerCase().includes(lowerCaseQuery) ||
                (diagnosis.contact || '').toLowerCase().includes(lowerCaseQuery) ||
                String(diagnosis.patient_mr || '').includes(lowerCaseQuery) ||
                String(diagnosis.age || '').includes(lowerCaseQuery) ||
                (diagnosis.gender || '').toLowerCase().includes(lowerCaseQuery)
            );
        }
        return matchesTextQuery && isWithinDateRange;
    });

    displayDiagnoses(filteredDiagnoses);
}

function createDiagnosisCard(diagnosis, index) {
    // ... (large HTML rendering function remains the same)
    const vitalsHtml = diagnosis.vitals ? `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">Blood Pressure</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.blood_pressure || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">Heart Rate</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.heart_rate || 'N/A'} bpm</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1"></p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.temperature || 'N/A'} °F</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">BMI</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.bmi || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">Blood Oxygen</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.blood_oxygen || 'N/A'} %</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">Weight</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.weight || 'N/A'} kg</p>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <p class="text-xs text-gray-600 mb-1">Height</p>
                <p class="font-semibold text-gray-800">${diagnosis.vitals.height || 'N/A'} cm</p>
            </div>
        </div>
    ` : '';
    
    return `
        <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer" onclick="toggleDiagnosisCard(${index})">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="font-bold text-gray-800 text-lg">${diagnosis.patient_name}</h4>
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">MR: ${diagnosis.patient_mr}</span>
                        </div>
                        <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span><strong>Doctor:</strong> ${diagnosis.doctor_name}</span>
                            <span><strong>Date:</strong> ${Date(diagnosis.diagnosed_date)}</span>
                            <span><strong>Age/Gender:</strong> ${diagnosis.age} / ${diagnosis.gender}</span>
                        </div>
                    </div>
                    <svg id="expand-icon-${index}" class="w-6 h-6 text-gray-600 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>
            
            <div id="diagnosis-content-${index}" class="hidden p-4 bg-white">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Father's Name</p>
                        <p class="font-medium text-gray-800">${diagnosis.father_name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Marital Status</p>
                        <p class="font-medium text-gray-800">${diagnosis.marital_status}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Contact</p>
                        <p class="font-medium text-gray-800">${diagnosis.contact}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Email</p>
                        <p class="font-medium text-gray-800">${diagnosis.email}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">CNIC</p>
                        <p class="font-medium text-gray-800">${diagnosis.cnic}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Address</p>
                        <p class="font-medium text-gray-800">${diagnosis.address}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Occupation</p>
                        <p class="font-medium text-gray-800">${diagnosis.occupation || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Nationality</p>
                        <p class="font-medium text-gray-800">${diagnosis.nationality}</p>
                    </div>
                </div>
                
                ${vitalsHtml}
                
                <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm font-semibold text-gray-700 mb-2">Diagnosis</p>
                    <p class="text-gray-800">${diagnosis.diagnosis}</p>
                </div>
                
                <div class="mt-4 p-4 bg-green-50 rounded-lg">
                    <p class="text-sm font-semibold text-gray-700 mb-2">Prescription</p>
                    <p class="text-gray-800">${diagnosis.prescription}</p>
                </div>
                
                ${diagnosis.notes ? `
                    <div class="mt-4 p-4 bg-yellow-50 rounded-lg">
                        <p class="text-sm font-semibold text-gray-700 mb-2">Notes</p>
                        <p class="text-gray-800">${diagnosis.notes}</p>
                    </div>
                ` : ''}
                
                <div class="mt-4 flex gap-3">
                    <button onclick="printDiagnosis(${index})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                        </svg>
                        Print Diagnosis
                    </button>
                </div>
                <div class="mt-4 flex gap-3">
                    <button onclick="emailToPatient(${index})" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12l-4 4-4-4m8-4H8"></path>
                        </svg>
                        Email to Patient
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.toggleDiagnosisCard = function(index) {
    const content = document.getElementById(`diagnosis-content-${index}`);
    const icon = document.getElementById(`expand-icon-${index}`);

    if (content && icon) {
        const isHidden = content.classList.contains('hidden');
        content.classList.toggle('hidden');
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

window.printDiagnosis = async function(index) {
    const diagnosis = diagnosesData[index];
    const printWindow = window.open('', '_blank', 'width=800,height=1000');

    const templateResponse = await fetch("static/components/diagnosis_template.html");
    let templateHtml = await templateResponse.text();
    
    const vitalsHtml = diagnosis.vitals ? `
        <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Vital Signs</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div><strong>Blood Pressure:</strong> ${diagnosis.vitals.blood_pressure || 'N/A'}</div>
                <div><strong>Heart Rate:</strong> ${diagnosis.vitals.heart_rate || 'N/A'} bpm</div>
                <div><strong>Temperature:</strong> ${diagnosis.vitals.temperature || 'N/A'} °F</div>
                <div><strong>Blood Oxygen:</strong> ${diagnosis.vitals.blood_oxygen || 'N/A'}%</div>
                <div><strong>Weight:</strong> ${diagnosis.vitals.weight || 'N/A'} kg</div>
                <div><strong>Height:</strong> ${diagnosis.vitals.height || 'N/A'} cm</div>
                <div><strong>BMI:</strong> ${diagnosis.vitals.bmi || 'N/A'}</div>
            </div>
        </div>
    ` : '';
    
    templateHtml = templateHtml
        .replace(/\$\{diagnosis\.patient_name\}/g, diagnosis.patient_name)
        .replace(/\$\{diagnosis\.patient_mr\}/g, diagnosis.patient_mr)
        .replace(/\$\{diagnosis\.age\}/g, diagnosis.age)
        .replace(/\$\{diagnosis\.gender\}/g, diagnosis.gender)
        .replace(/\$\{diagnosis\.father_name\}/g, diagnosis.father_name)
        .replace(/\$\{diagnosis\.marital_status\}/g, diagnosis.marital_status)
        .replace(/\$\{diagnosis\.contact\}/g, diagnosis.contact)
        .replace(/\$\{diagnosis\.email\}/g, diagnosis.email)
        .replace(/\$\{diagnosis\.cnic\}/g, diagnosis.cnic)
        .replace(/\$\{diagnosis\.address\}/g, diagnosis.address)
        .replace(/\$\{diagnosis\.occupation\}/g, diagnosis.occupation || "-")
        .replace(/\$\{diagnosis\.nationality\}/g, diagnosis.nationality)
        .replace(/\$\{diagnosis\.doctor_name\}/g, diagnosis.doctor_name)
        .replace(/\$\{diagnosis\.diagnosis\}/g, diagnosis.diagnosis)
        .replace(/\$\{diagnosis\.prescription\}/g, diagnosis.prescription)
        .replace(/\$\{diagnosis\.notes\}/g, diagnosis.notes || "")
        .replace(/\$\{Date\(diagnosis\.diagnosed_date\)\}/g, new Date(diagnosis.diagnosed_date).toDateString())
        .replace("${vitalsHtml}", vitalsHtml);

    printWindow.document.writeln(templateHtml);
    
    printWindow.document.close();
}

window.emailToPatient = async function(index) {
    const diagnosis = diagnosesData[index];
    try {
        const templateResponse = await fetch("static/components/diagnosis_template.html");
        let templateHtml = await templateResponse.text();

        let vitalsHtml = "";
        if (diagnosis.vitals && diagnosis.vitals.length > 0) {
            vitalsHtml = `
                <div class="section">
                    <div class="section-title">Vitals</div>
                    <div class="info-grid">
                        ${diagnosis.vitals.map(v => `
                            <div class="info-item">
                                <span class="info-label">${v.name}:</span> ${v.value}
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        templateHtml = templateHtml
            .replace(/\$\{diagnosis\.patient_name\}/g, diagnosis.patient_name)
            .replace(/\$\{diagnosis\.patient_mr\}/g, diagnosis.patient_mr)
            // ... (many more replaces)
            .replace(/\$\{diagnosis\.notes\}/g, diagnosis.notes || "")
            .replace(/\$\{Date\(diagnosis\.diagnosed_date\)\}/g, new Date(diagnosis.diagnosed_date).toDateString())
            .replace("${vitalsHtml}", vitalsHtml);

        const res = await fetch("/api/receptionist/email-diagnosis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: diagnosis.email,
                patient_name: diagnosis.patient_name,
                html: templateHtml
            })
        });

        const data = await res.json();
        if (data.success) {
            popup.showPopUp("Email Sent", "Diagnosis report emailed successfully to patient.", "success");
        } else {
            popup.showPopUp("Email Failed", "Failed to send diagnosis report email.", "error");
        }

    } catch (err) {
        console.error(err);
        popup.showPopUp("Error", "An error occurred while emailing the diagnosis report: " + (err.message || err), "error");
    }
}