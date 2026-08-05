/**
 * ADMISSION MODULE – 3-Step Wizard with Full CRUD + Approve/Reject + Student Creation
 * External JavaScript file for admission.html
 */

import {
    auth, database, ref, push, set, onValue, remove, update,
    onAuthStateChanged, signOut, get
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
const totalSteps = 3;
let allAdmissions = [];
let filteredAdmissions = [];
let currentPage = 1;
const pageSize = 5;
let deleteTargetId = null;
let confirmAction = 'delete'; // 'delete' | 'approve' | 'reject'
let confirmTargetId = null;

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
const editAdmissionId = document.getElementById('editAdmissionId');

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
const confirmEmail = document.getElementById('confirmEmail');
const confirmPhone = document.getElementById('confirmPhone');
const confirmAddress = document.getElementById('confirmAddress');

// Table
const tbody = document.getElementById('admissionTableBody');
const countSpan = document.getElementById('admissionCount');

// Confirm modal
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const closeConfirmBtn = document.getElementById('closeConfirmModal');
const confirmMessage = document.getElementById('confirmMessage');

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
    if (step === 3) populateConfirmation();
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
    // For edit mode, we need to use existing data if editing, else generate new.
    const id = editAdmissionId.value;
    if (id) {
        // Edit mode: use existing data from allAdmissions
        const adm = allAdmissions.find(a => a.id === id);
        if (adm) {
            confirmStudentId.textContent = adm.studentId || '—';
            confirmFormNumber.textContent = adm.formNumber || '—';
            confirmDate.textContent = adm.date || getTodayDate();
            confirmName.textContent = adm.studentName || '—';
            confirmClass.textContent = adm.class ? `${adm.class} ${adm.section || ''}`.trim() : '—';
            confirmEmail.textContent = adm.email || '—';
            confirmPhone.textContent = adm.phone || '—';
            confirmAddress.textContent = adm.address || '—';
            return;
        }
    }
    // Add mode: generate new
    confirmStudentId.textContent = generateStudentId();
    confirmFormNumber.textContent = generateFormNumber();
    confirmDate.textContent = getTodayDate();
    confirmName.textContent = sName.value.trim() || '—';
    confirmClass.textContent = sClass.value ? `${sClass.value} ${sSection.value || ''}`.trim() : '—';
    confirmEmail.textContent = sEmail.value.trim() || '—';
    confirmPhone.textContent = sPhone.value.trim() || '—';
    confirmAddress.textContent = sAddress.value.trim() || '—';
}

// ============================================================
// OPEN EDIT MODAL
// ============================================================
function openEditModal(id) {
    const adm = allAdmissions.find(a => a.id === id);
    if (!adm) {
        showToast('Record not found', 'error');
        return;
    }

    // Populate form fields
    editAdmissionId.value = id;
    sName.value = adm.studentName || '';
    sDOB.value = adm.dob || '';
    sGender.value = adm.gender || '';
    sClass.value = adm.class || '';
    sSection.value = adm.section || '';
    sPhone.value = adm.phone || '';
    sEmail.value = adm.email || '';
    sAddress.value = adm.address || '';
    prevSchool.value = adm.prevSchool || '';
    prevClass.value = adm.prevClass || '';
    prevYear.value = adm.prevYear || '';
    prevGrade.value = adm.prevGrade || '';

    // Update submit button text
    finalSubmitBtn.querySelector('.btn-text').textContent = 'Update Admission';

    // Show form
    formCard.style.display = 'block';
    document.getElementById('admissionListContainer').style.display = 'none';
    goToStep(1);
    sName.focus();
}

// ============================================================
// APPROVE ADMISSION → Create Student
// ============================================================
async function approveAdmission(id) {
    try {
        const adm = allAdmissions.find(a => a.id === id);
        if (!adm) {
            showToast('Record not found', 'error');
            return;
        }

        // Check if student already exists with this studentId
        const studentsRef = ref(database, 'students');
        const snapshot = await get(studentsRef);
        const studentsData = snapshot.val();
        let studentExists = false;
        if (studentsData) {
            for (const key in studentsData) {
                if (studentsData[key].studentId === adm.studentId) {
                    studentExists = true;
                    break;
                }
            }
        }

        if (studentExists) {
            showToast('Student with this ID already exists. Update status only.', 'warning');
            // Still update status to approved
            await update(ref(database, `admissions/${id}`), {
                status: 'approved',
                updatedAt: Date.now()
            });
            showToast('Admission approved (student already exists).', 'success');
            return;
        }

        // Create student record
        const studentData = {
            studentId: adm.studentId,
            name: adm.studentName,
            class: adm.class,
            section: adm.section || '',
            rollNo: '',
            status: 'active',
            parentName: '',
            parentPhone: '',
            address: adm.address || '',
            phone: adm.phone || '',
            email: adm.email || '',
            dob: adm.dob || '',
            gender: adm.gender || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const newStudentRef = push(ref(database, 'students'));
        await set(newStudentRef, studentData);

        // Update admission status
        await update(ref(database, `admissions/${id}`), {
            status: 'approved',
            updatedAt: Date.now()
        });

        showToast('Admission approved and student created successfully! ✅', 'success');
    } catch (error) {
        showToast('Error approving admission: ' + error.message, 'error');
    }
}

// ============================================================
// REJECT ADMISSION
// ============================================================
async function rejectAdmission(id) {
    try {
        await update(ref(database, `admissions/${id}`), {
            status: 'rejected',
            updatedAt: Date.now()
        });
        showToast('Admission rejected.', 'info');
    } catch (error) {
        showToast('Error rejecting admission: ' + error.message, 'error');
    }
}

// ============================================================
// FORM SUBMISSION (Add / Edit)
// ============================================================
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = editAdmissionId.value;
    const name = sName.value.trim();
    if (!name) {
        showToast('Please complete all required fields in Step 1.', 'warning');
        goToStep(1);
        return;
    }

    const data = {
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
        updatedAt: Date.now()
    };

    if (!id) {
        // Add mode: generate IDs and timestamp
        data.studentId = generateStudentId();
        data.formNumber = generateFormNumber();
        data.date = getTodayDate();
        data.status = 'pending';
        data.createdAt = Date.now();
    } else {
        // Edit mode: don't change studentId, formNumber, date, status, createdAt
        // We keep the existing values from the database; we just update the fields above.
        // We'll merge with existing data.
        const existing = allAdmissions.find(a => a.id === id);
        if (!existing) {
            showToast('Record not found', 'error');
            return;
        }
        // Keep original studentId, formNumber, date, status, createdAt
        data.studentId = existing.studentId;
        data.formNumber = existing.formNumber;
        data.date = existing.date;
        data.status = existing.status;
        data.createdAt = existing.createdAt;
        // But we don't need to send status if it's pending; we keep it.
    }

    finalSubmitBtn.disabled = true;
    finalSubmitBtn.querySelector('.spinner').style.display = 'inline-block';
    finalSubmitBtn.querySelector('.btn-text').textContent = id ? 'Updating...' : 'Submitting...';

    try {
        if (id) {
            await update(ref(database, `admissions/${id}`), data);
            showToast('Admission updated successfully!', 'success');
        } else {
            const newRef = push(ref(database, 'admissions'));
            await set(newRef, data);
            showToast('Admission submitted successfully! ✅', 'success');
        }
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
        finalSubmitBtn.querySelector('.btn-text').textContent = id ? 'Update Admission' : 'Submit Admission';
    }
});

// ============================================================
// RESET FORM
// ============================================================
function resetForm() {
    form.reset();
    editAdmissionId.value = '';
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    // Reset submit button text
    finalSubmitBtn.querySelector('.btn-text').textContent = 'Submit Admission';
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

        // Build action buttons
        let actionsHtml = `
            <button class="btn btn-outline-primary btn-sm edit-btn" data-id="${adm.id}">Edit</button>
        `;
        if (adm.status === 'pending') {
            actionsHtml += `
                <button class="btn btn-success btn-sm approve-btn" data-id="${adm.id}">Approve</button>
                <button class="btn btn-warning btn-sm reject-btn" data-id="${adm.id}">Reject</button>
            `;
        }
        actionsHtml += `
            <button class="btn btn-danger btn-sm delete-btn" data-id="${adm.id}">Delete</button>
        `;

        html += `
            <tr>
                <td><strong>${adm.studentId || 'N/A'}</strong></td>
                <td><span class="table-avatar">${initials}</span> ${adm.studentName || 'Unknown'}</td>
                <td>${adm.class || 'N/A'} ${adm.section || ''}</td>
                <td>${date}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>${actionsHtml}</td>
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

    // Attach event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => showConfirmModal('approve', btn.dataset.id));
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => showConfirmModal('reject', btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => showConfirmModal('delete', btn.dataset.id));
    });
}

// ============================================================
// CONFIRMATION MODAL (Unified)
// ============================================================
function showConfirmModal(action, id) {
    confirmAction = action;
    confirmTargetId = id;
    let message = '';
    let confirmBtnClass = 'btn-danger';
    switch (action) {
        case 'delete':
            message = 'Are you sure you want to delete this admission record? This action cannot be undone.';
            confirmBtnClass = 'btn-danger';
            break;
        case 'approve':
            message = 'Approving this admission will create a student record and mark the admission as approved. Continue?';
            confirmBtnClass = 'btn-success';
            break;
        case 'reject':
            message = 'Are you sure you want to reject this admission?';
            confirmBtnClass = 'btn-warning';
            break;
        default:
            message = 'Are you sure?';
    }
    confirmMessage.textContent = message;
    confirmDeleteBtn.className = `btn ${confirmBtnClass}`;
    confirmDeleteBtn.textContent = action.charAt(0).toUpperCase() + action.slice(1);
    confirmModal.classList.add('active');
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    confirmTargetId = null;
    confirmAction = 'delete';
}

confirmDeleteBtn.addEventListener('click', async () => {
    const action = confirmAction;
    const id = confirmTargetId;
    if (!id) return;

    try {
        if (action === 'delete') {
            await remove(ref(database, `admissions/${id}`));
            showToast('Admission deleted successfully', 'success');
        } else if (action === 'approve') {
            await approveAdmission(id);
        } else if (action === 'reject') {
            await rejectAdmission(id);
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        closeConfirmModal();
    }
});

cancelConfirmBtn.addEventListener('click', closeConfirmModal);
closeConfirmBtn.addEventListener('click', closeConfirmModal);
confirmModal.addEventListener('click', function(e) {
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

// Initial state: show list, hide form
formCard.style.display = 'none';
document.getElementById('admissionListContainer').style.display = 'block';

console.log('Admission Module (with Approve/Reject/Edit/Student creation) loaded.');
