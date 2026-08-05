/**
 * ADMISSION MODULE – Full Multi-Step Wizard with Firebase Storage
 * External JavaScript file for admission.html
 */

import {
    auth, database, ref, push, set, onValue, remove, update,
    onAuthStateChanged, signOut,
    storage, storageRef, uploadBytesResumable, getDownloadURL
} from './firebase.js';

// --- Authentication Check ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }
    loadAdmissions();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../../login.html';
    } catch (e) {
        showToast('Logout failed: ' + e.message, 'error');
    }
});

// ============================================================
// STATE
// ============================================================
let currentStep = 1;
const totalSteps = 4;
let allAdmissions = [];
let filteredAdmissions = [];
let currentPage = 1;
const pageSize = 5;
let deleteTargetId = null;
let uploadTasks = {};

// Document tracking
const docFiles = {
    photo: { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 },
    aadhaar: { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 },
    fatherAadhaar: { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 },
    motherAadhaar: { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 },
    apar: { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 }
};

// ============================================================
// DOM REFS
// ============================================================
const formCard = document.getElementById('admissionFormCard');
const newBtn = document.getElementById('newAdmissionBtn');
const steps = document.querySelectorAll('.form-step');
const progressBar = document.getElementById('progressBar');
const progressSteps = document.querySelectorAll('.step-progress-step');
const form = document.getElementById('admissionForm');
const finalSubmitBtn = document.getElementById('finalSubmitBtn');

// Step 1 fields
const sName = document.getElementById('studentName');
const sDOB = document.getElementById('studentDOB');
const sGender = document.getElementById('studentGender');
const sClass = document.getElementById('studentClass');
const sSection = document.getElementById('studentSection');
const sPhone = document.getElementById('studentPhone');
const sEmail = document.getElementById('studentEmail');
const sAddress = document.getElementById('studentAddress');

// Step 2 fields
const prevSchool = document.getElementById('prevSchool');
const prevClass = document.getElementById('prevClass');
const prevYear = document.getElementById('prevYear');
const prevGrade = document.getElementById('prevGrade');

// Confirmation fields
const confirmStudentId = document.getElementById('confirmStudentId');
const confirmFormNumber = document.getElementById('confirmFormNumber');
const confirmDate = document.getElementById('confirmDate');
const confirmName = document.getElementById('confirmName');
const confirmClass = document.getElementById('confirmClass');
const confirmDocs = document.getElementById('confirmDocs');

// Table
const tbody = document.getElementById('admissionTableBody');
const countSpan = document.getElementById('admissionCount');

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function generateStudentId() {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `STU-${year}-${rand}`;
}

function generateFormNumber() {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `ADM-${year}-${rand}`;
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// STEP NAVIGATION
// ============================================================
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;
    steps.forEach(el => {
        el.style.display = el.dataset.step == step ? 'block' : 'none';
    });
    const pct = ((step - 1) / (totalSteps - 1)) * 100;
    progressBar.style.width = pct + '%';
    progressSteps.forEach(el => {
        const num = parseInt(el.dataset.step);
        el.classList.toggle('active', num <= step);
        el.classList.toggle('completed', num < step);
    });
    if (step === 4) populateConfirmation();
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// VALIDATION
// ============================================================
function validateStep(step) {
    let fields = [];
    let firstInvalid = null;

    if (step === 1) {
        fields = [
            { el: sName, msg: 'Full name is required' },
            { el: sDOB, msg: 'Date of birth is required' },
            { el: sGender, msg: 'Please select gender' },
            { el: sClass, msg: 'Please select class' },
            { el: sPhone, msg: 'Phone number is required' },
            { el: sAddress, msg: 'Address is required' }
        ];
    } else if (step === 2) {
        return true;
    } else if (step === 3) {
        const requiredDocs = ['photo', 'aadhaar', 'fatherAadhaar', 'motherAadhaar'];
        for (const key of requiredDocs) {
            if (!docFiles[key].uploaded) {
                const labelMap = {
                    photo: 'Student Photo',
                    aadhaar: 'Student Aadhaar',
                    fatherAadhaar: "Father's Aadhaar",
                    motherAadhaar: "Mother's Aadhaar"
                };
                showToast(`${labelMap[key]} is required. Please upload the document.`, 'warning');
                const field = document.querySelector(`[data-doc="${key}"]`)?.closest('.document-field');
                if (field) {
                    field.style.borderColor = 'var(--danger)';
                    setTimeout(() => field.style.borderColor = '', 3000);
                }
                return false;
            }
        }
        return true;
    }

    for (const f of fields) {
        const val = f.el.value.trim();
        if (!val) {
            f.el.classList.add('is-invalid');
            if (!firstInvalid) firstInvalid = f.el;
        } else {
            f.el.classList.remove('is-invalid');
        }
    }
    const invalid = fields.some(f => !f.el.value.trim());
    if (invalid && firstInvalid) {
        const label = firstInvalid.closest('.form-group')?.querySelector('.form-label')?.textContent || 'Field';
        showToast(`Please fill in: ${label}`, 'warning');
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
    }
    return true;
}

// ============================================================
// CONFIRMATION POPULATION
// ============================================================
function populateConfirmation() {
    confirmStudentId.textContent = generateStudentId();
    confirmFormNumber.textContent = generateFormNumber();
    confirmDate.textContent = getTodayDate();
    confirmName.textContent = sName.value.trim() || '—';
    confirmClass.textContent = sClass.value ? `${sClass.value} ${sSection.value || ''}`.trim() : '—';
    const uploaded = Object.keys(docFiles).filter(k => docFiles[k].uploaded);
    confirmDocs.textContent = uploaded.length > 0 ? uploaded.length + ' file(s) uploaded' : 'No documents';
}

// ============================================================
// FIREBASE STORAGE UPLOAD
// ============================================================
async function uploadDocument(docKey, file) {
    const statusEl = document.querySelector(`[data-doc="${docKey}"]`)?.closest('.file-upload-wrapper')?.querySelector('.file-status');
    if (!statusEl) return;

    const timestamp = Date.now();
    const path = `admissions/temp/${timestamp}_${docKey}_${file.name}`;
    const fileRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTasks[docKey] = uploadTask;

    try {
        statusEl.textContent = '⏳ Uploading...';
        statusEl.style.color = 'var(--warning)';
        const snapshot = await uploadTask;
        const downloadUrl = await getDownloadURL(snapshot.ref);
        docFiles[docKey].uploaded = true;
        docFiles[docKey].url = downloadUrl;
        docFiles[docKey].progress = 100;
        statusEl.textContent = '✅ Uploaded';
        statusEl.style.color = 'var(--success)';
        showToast(`${file.name} uploaded successfully!`, 'success');
        delete uploadTasks[docKey];
        return downloadUrl;
    } catch (error) {
        console.error('Upload error:', error);
        statusEl.textContent = '❌ Upload failed';
        statusEl.style.color = 'var(--danger)';
        docFiles[docKey].uploaded = false;
        docFiles[docKey].url = '';
        showToast(`Upload failed: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================================
// FILE INPUT HANDLING
// ============================================================
function setupFileInputs() {
    const inputs = document.querySelectorAll('.file-input');
    inputs.forEach(input => {
        input.addEventListener('change', async function() {
            const docKey = this.dataset.doc;
            const file = this.files[0];
            if (!file) return;

            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Invalid file type. Please upload JPG, PNG, WEBP, or PDF.', 'error');
                this.value = '';
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showToast('File size exceeds 2MB limit.', 'error');
                this.value = '';
                return;
            }

            docFiles[docKey] = {
                file: file,
                name: file.name,
                size: file.size,
                uploaded: false,
                url: '',
                progress: 0
            };

            const wrapper = this.closest('.file-upload-wrapper');
            const label = wrapper.querySelector('.file-label .file-name');
            const placeholder = wrapper.querySelector('.file-placeholder');
            const status = wrapper.querySelector('.file-status');
            const removeBtn = wrapper.querySelector('.file-remove');

            if (label) label.textContent = file.name;
            if (placeholder) placeholder.style.display = 'none';
            if (status) {
                status.textContent = '📤 Uploading...';
                status.style.color = 'var(--warning)';
            }
            if (removeBtn) removeBtn.style.display = 'inline-block';

            try {
                await uploadDocument(docKey, file);
            } catch (error) {
                this.value = '';
                if (status) {
                    status.textContent = '❌ Retry';
                    status.style.color = 'var(--danger)';
                }
            }
        });

        const removeBtn = input.closest('.file-upload-wrapper')?.querySelector('.file-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                const docKey = input.dataset.doc;
                if (uploadTasks[docKey]) {
                    uploadTasks[docKey].cancel();
                    delete uploadTasks[docKey];
                }
                input.value = '';
                docFiles[docKey] = { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 };
                const wrapper = input.closest('.file-upload-wrapper');
                const label = wrapper.querySelector('.file-label .file-name');
                const placeholder = wrapper.querySelector('.file-placeholder');
                const status = wrapper.querySelector('.file-status');
                if (label) label.textContent = '';
                if (placeholder) placeholder.style.display = 'inline';
                if (status) { status.textContent = ''; status.style.color = ''; }
                this.style.display = 'none';
                showToast('File removed', 'info');
            });
        }
    });
}

// ============================================================
// FORM SUBMISSION
// ============================================================
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = sName.value.trim();
    if (!name) {
        showToast('Please complete all required fields in previous steps.', 'warning');
        goToStep(1);
        return;
    }

    const requiredDocs = ['photo', 'aadhaar', 'fatherAadhaar', 'motherAadhaar'];
    for (const key of requiredDocs) {
        if (!docFiles[key].uploaded) {
            showToast('Please upload all required documents.', 'warning');
            goToStep(3);
            return;
        }
    }

    const data = {
        studentId: generateStudentId(),
        formNumber: generateFormNumber(),
        date: getTodayDate(),
        studentName: name,
        dob: sDOB.value || '',
        gender: sGender.value || '',
        class: sClass.value || '',
        section: sSection.value || '',
        phone: sPhone.value || '',
        email: sEmail.value || '',
        address: sAddress.value || '',
        prevSchool: prevSchool.value || '',
        prevClass: prevClass.value || '',
        prevYear: prevYear.value || '',
        prevGrade: prevGrade.value || '',
        status: 'pending',
        documents: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    for (const [key, val] of Object.entries(docFiles)) {
        if (val.uploaded && val.url) {
            data.documents[key] = {
                name: val.name,
                size: val.size,
                url: val.url
            };
        }
    }

    finalSubmitBtn.disabled = true;
    finalSubmitBtn.querySelector('.spinner').style.display = 'inline-block';
    finalSubmitBtn.querySelector('.btn-text').textContent = 'Submitting...';

    try {
        const newRef = push(ref(database, 'admissions'));
        await set(newRef, data);
        showToast('Admission submitted successfully! ✅', 'success');
        resetForm();
        goToStep(1);
        loadAdmissions();
        formCard.style.display = 'none';
        document.getElementById('admissionListContainer').style.display = 'block';
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.querySelector('.spinner').style.display = 'none';
        finalSubmitBtn.querySelector('.btn-text').textContent = 'Final Submit';
    }
});

// ============================================================
// RESET FORM
// ============================================================
function resetForm() {
    form.reset();
    document.querySelectorAll('.file-input').forEach(input => {
        input.value = '';
        const wrapper = input.closest('.file-upload-wrapper');
        const label = wrapper?.querySelector('.file-label .file-name');
        const placeholder = wrapper?.querySelector('.file-placeholder');
        const status = wrapper?.querySelector('.file-status');
        const removeBtn = wrapper?.querySelector('.file-remove');
        if (label) label.textContent = '';
        if (placeholder) placeholder.style.display = 'inline';
        if (status) { status.textContent = ''; status.style.color = ''; }
        if (removeBtn) removeBtn.style.display = 'none';
    });
    Object.keys(docFiles).forEach(k => {
        docFiles[k] = { file: null, name: '', size: 0, uploaded: false, url: '', progress: 0 };
    });
    for (const task of Object.values(uploadTasks)) {
        if (task && task.cancel) task.cancel();
    }
    uploadTasks = {};
    currentStep = 1;
    goToStep(1);
}

// ============================================================
// LOAD ADMISSIONS
// ============================================================
function loadAdmissions() {
    const admissionsRef = ref(database, 'admissions');
    onValue(admissionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allAdmissions = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            allAdmissions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            allAdmissions = [];
        }
        applyFiltersAndRender();
    }, (error) => {
        showToast('Error loading admissions: ' + error.message, 'error');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Error loading data</td></tr>`;
    });
}

// ============================================================
// FILTER & RENDER
// ============================================================
function applyFiltersAndRender() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const classFilter = document.getElementById('filterClass').value;
    const statusFilter = document.getElementById('filterStatus').value;

    filteredAdmissions = allAdmissions.filter(adm => {
        const nameMatch = adm.studentName?.toLowerCase().includes(searchTerm) || false;
        const idMatch = adm.studentId?.toLowerCase().includes(searchTerm) || false;
        const searchMatch = nameMatch || idMatch;
        const classMatch = classFilter ? adm.class === classFilter : true;
        const statusMatch = statusFilter ? adm.status === statusFilter : true;
        return searchMatch && classMatch && statusMatch;
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredAdmissions.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No admissions found</td></tr>`;
        countSpan.textContent = 'Showing 0 entries';
        return;
    }

    let html = '';
    pageData.forEach(adm => {
        const statusBadge = adm.status === 'approved' ? 'success' : adm.status === 'pending' ? 'warning' : 'danger';
        const statusText = adm.status ? adm.status.charAt(0).toUpperCase() + adm.status.slice(1) : 'Pending';
        const date = adm.date || (adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A');
        const initials = getInitials(adm.studentName);
        html += `
            <tr>
                <td><strong>${adm.studentId || 'N/A'}</strong></td>
                <td><span class="table-avatar">${initials}</span> ${adm.studentName || 'Unknown'}</td>
                <td>${adm.class || 'N/A'} ${adm.section || ''}</td>
                <td>${date}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm view-btn" data-id="${adm.id}">View</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${adm.id}">Delete</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const total = filteredAdmissions.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    countSpan.textContent = `Showing ${start+1}-${Math.min(end, total)} of ${total} entries`;
    document.getElementById('page1').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewAdmission(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });
}

function viewAdmission(id) {
    showToast('View details feature coming soon.', 'info');
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(id) {
    deleteTargetId = id;
    document.getElementById('confirmModal').classList.add('active');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
        await remove(ref(database, `admissions/${deleteTargetId}`));
        showToast('Admission deleted successfully', 'success');
    } catch (error) {
        showToast('Error deleting: ' + error.message, 'error');
    } finally {
        document.getElementById('confirmModal').classList.remove('active');
        deleteTargetId = null;
    }
});

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    deleteTargetId = null;
}

document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) closeConfirmModal();
});

// ============================================================
// EVENT BINDINGS
// ============================================================
newBtn.addEventListener('click', () => {
    resetForm();
    formCard.style.display = 'block';
    document.getElementById('admissionListContainer').style.display = 'none';
    goToStep(1);
    sName.focus();
});

document.querySelectorAll('.step-next').forEach(btn => {
    btn.addEventListener('click', function() {
        const nextStep = parseInt(this.dataset.next);
        const currentStepNum = parseInt(this.closest('.form-step').dataset.step);
        if (validateStep(currentStepNum)) {
            goToStep(nextStep);
        }
    });
});

document.querySelectorAll('.step-prev').forEach(btn => {
    btn.addEventListener('click', function() {
        const prevStep = parseInt(this.dataset.prev);
        goToStep(prevStep);
    });
});

document.getElementById('applyFilterBtn').addEventListener('click', applyFiltersAndRender);
document.getElementById('resetFilterBtn').addEventListener('click', function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('filterStatus').value = '';
    applyFiltersAndRender();
});
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') applyFiltersAndRender();
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
});
document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredAdmissions.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
});

// Sidebar toggle (if not already handled by global script)
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && sidebar && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Setup file inputs
setupFileInputs();

// Initial state: show list, hide form
formCard.style.display = 'none';
document.getElementById('admissionListContainer').style.display = 'block';

console.log('Admission Module (external JS) loaded.');
