// ============================================
// ADMISSION MODULE – Firebase Integration
// External JS file
// ============================================

import {
    auth, database, storage,
    onAuthStateChanged, signOut,
    ref, push, set, onValue, remove, update,
    storageRef, uploadBytesResumable, getDownloadURL
} from './firebase.js';

// ---------- Authentication ----------
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
    } catch (error) {
        showToast('Logout failed: ' + error.message, 'error');
    }
});

// ---------- Global Variables ----------
let allAdmissions = [];
let filteredAdmissions = [];
let currentPage = 1;
const pageSize = 5;
let deleteTargetId = null;

// File upload state: store file objects and URLs per field
const fileStore = {
    photo: { file: null, url: null, uploaded: false },
    aadhaar: { file: null, url: null, uploaded: false },
    fatherAadhaar: { file: null, url: null, uploaded: false },
    motherAadhaar: { file: null, url: null, uploaded: false }
};

// ---------- Wizard ----------
const steps = document.querySelectorAll('.wizard-step');
const indicators = document.querySelectorAll('.step-indicator');
const prevBtn = document.getElementById('prevStepBtn');
const nextBtn = document.getElementById('nextStepBtn');
const submitBtn = document.getElementById('submitAdmissionBtn');
const stepCounter = document.getElementById('stepCounter');
let currentStep = 1;
const totalSteps = 4;

function updateWizard(step) {
    steps.forEach(s => s.classList.remove('active'));
    indicators.forEach(ind => {
        ind.classList.remove('active', 'completed');
        const num = parseInt(ind.dataset.step);
        if (num === step) ind.classList.add('active');
        else if (num < step) ind.classList.add('completed');
    });
    document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active');
    currentStep = step;
    stepCounter.textContent = `Step ${step} of ${totalSteps}`;

    // Show/hide Previous button
    if (step === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline-flex';
    }

    // Show/hide Next and Submit
    if (step === totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    }
}

// ---------- Validation helpers ----------
function validateStep(step) {
    let valid = true;
    let firstInvalid = null;

    // Clear previous error styles
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

    if (step === 1) {
        const name = document.getElementById('studentName');
        const cls = document.getElementById('studentClass');
        if (!name.value.trim()) {
            name.classList.add('error');
            firstInvalid = name;
            valid = false;
        }
        if (!cls.value) {
            cls.classList.add('error');
            if (!firstInvalid) firstInvalid = cls;
            valid = false;
        }
        if (!valid) {
            showToast('Please fill Full Name and Class (required fields).', 'warning');
        }
    } else if (step === 3) {
        // Check required documents: photo and aadhaar must be uploaded
        if (!fileStore.photo.url) {
            document.getElementById('photoUpload').style.borderColor = 'var(--danger)';
            firstInvalid = document.getElementById('photoUpload');
            valid = false;
        }
        if (!fileStore.aadhaar.url) {
            document.getElementById('aadhaarUpload').style.borderColor = 'var(--danger)';
            if (!firstInvalid) firstInvalid = document.getElementById('aadhaarUpload');
            valid = false;
        }
        if (!valid) {
            showToast('Student Photo and Aadhaar Card are required.', 'warning');
        }
    }

    if (!valid && firstInvalid) {
        // Scroll to first invalid field
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus if it's an input/select
        const input = firstInvalid.querySelector('input, select, textarea');
        if (input) input.focus();
    }
    return valid;
}

// ---------- Wizard Navigation ----------
prevBtn.addEventListener('click', () => {
    if (currentStep > 1) updateWizard(currentStep - 1);
});

nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
        if (currentStep < totalSteps) updateWizard(currentStep + 1);
    }
});

indicators.forEach(ind => {
    ind.addEventListener('click', () => {
        const step = parseInt(ind.dataset.step);
        // Only allow jumping to previous steps or the immediate next step
        if (step <= currentStep + 1 && step >= 1 && step <= totalSteps) {
            // If jumping to next step, validate first
            if (step === currentStep + 1 && !validateStep(currentStep)) return;
            updateWizard(step);
        }
    });
});

// ---------- File Upload Setup ----------
function setupFileUpload(fieldId, inputId, progressId, previewId, fileNameId, previewImgId = null, allowedTypes = [], required = false) {
    const area = document.getElementById(fieldId);
    const input = document.getElementById(inputId);
    const progress = document.getElementById(progressId);
    const preview = document.getElementById(previewId);
    const fileName = document.getElementById(fileNameId);
    const previewImg = previewImgId ? document.getElementById(previewImgId) : null;
    const fieldName = fieldId.replace('Upload', '').toLowerCase();

    // Reset border color on focus
    area.addEventListener('click', () => {
        area.style.borderColor = '';
    });

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (allowedTypes.length > 0) {
            const ext = file.name.split('.').pop().toLowerCase();
            const allowed = allowedTypes.some(type => {
                if (type.startsWith('.')) return ext === type.substring(1);
                return file.type.startsWith(type);
            });
            if (!allowed) {
                showToast(`File type not allowed. Please upload: ${allowedTypes.join(', ')}`, 'warning');
                input.value = '';
                return;
            }
        }

        // Validate size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size exceeds 5MB limit.', 'warning');
            input.value = '';
            return;
        }

        // Show progress
        progress.classList.add('show');
        const bar = progress.querySelector('.progress-bar');
        bar.style.width = '0%';

        try {
            // Show "Uploading..." toast
            showToast(`Uploading ${file.name}...`, 'info');

            // Upload to Firebase Storage
            const storagePath = `admissions/${Date.now()}_${file.name}`;
            const fileRef = storageRef(storage, storagePath);
            const uploadTask = uploadBytesResumable(fileRef, file);

            // Listen for progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    bar.style.width = percent + '%';
                },
                (error) => {
                    console.error('Upload error:', error);
                    showToast('Upload failed: ' + error.message, 'error');
                    progress.classList.remove('show');
                    input.value = '';
                },
                async () => {
                    // Success
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    fileStore[fieldName].url = url;
                    fileStore[fieldName].file = file;
                    fileStore[fieldName].uploaded = true;

                    // Show preview
                    preview.style.display = 'block';
                    fileName.textContent = file.name;
                    if (previewImg) {
                        previewImg.src = URL.createObjectURL(file);
                        previewImg.style.display = 'block';
                    }
                    progress.classList.remove('show');
                    bar.style.width = '0%';
                    area.style.borderColor = '';
                    showToast(`${file.name} uploaded successfully.`, 'success');
                }
            );

        } catch (error) {
            console.error('Upload error:', error);
            showToast('Upload failed: ' + error.message, 'error');
            progress.classList.remove('show');
            input.value = '';
        }
    });

    // Remove button
    const removeBtn = preview.querySelector('.file-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            fileStore[fieldName].file = null;
            fileStore[fieldName].url = null;
            fileStore[fieldName].uploaded = false;
            preview.style.display = 'none';
            if (previewImg) {
                previewImg.src = '#';
                previewImg.style.display = 'none';
            }
            input.value = '';
            area.style.borderColor = '';
        });
    }

    // Drag and drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });

    // Initialize from edit mode (if editId is set, we may have existing URLs)
    // This will be handled separately in openEditModal
}

// Initialize upload fields
setupFileUpload('photoUpload', 'studentPhoto', 'photoProgress', 'photoPreview', 'photoFileName', 'photoPreviewImg', ['image/'], true);
setupFileUpload('aadhaarUpload', 'studentAadhaar', 'aadhaarProgress', 'aadhaarPreview', 'aadhaarFileName', null, ['image/', '.pdf'], true);
setupFileUpload('fatherAadhaarUpload', 'fatherAadhaar', 'fatherAadhaarProgress', 'fatherAadhaarPreview', 'fatherAadhaarFileName', null, ['image/', '.pdf'], false);
setupFileUpload('motherAadhaarUpload', 'motherAadhaar', 'motherAadhaarProgress', 'motherAadhaarPreview', 'motherAadhaarFileName', null, ['image/', '.pdf'], false);

// ---------- Preview & Print ----------
function populatePrintForm(data) {
    document.getElementById('printFormNo').textContent = data.formNo || '--';
    document.getElementById('printDate').textContent = new Date().toLocaleDateString();
    document.getElementById('printName').textContent = data.name || '--';
    document.getElementById('printClass').textContent = data.class || '--';
    document.getElementById('printSection').textContent = data.section || '--';
    document.getElementById('printDOB').textContent = data.dob || '--';
    document.getElementById('printGender').textContent = data.gender || '--';
    document.getElementById('printPhone').textContent = data.phone || '--';
    document.getElementById('printAddress').textContent = data.address || '--';
    document.getElementById('printPrevSchool').textContent = data.prevSchool || '--';
    document.getElementById('printPrevClass').textContent = data.prevClass || '--';
    document.getElementById('printPrevYear').textContent = data.prevYear || '--';
    document.getElementById('printPrevBoard').textContent = data.prevBoard || '--';
    document.getElementById('printApar').textContent = data.aparId || '--';

    const printImg = document.getElementById('printPhoto');
    if (fileStore.photo.url) {
        printImg.src = fileStore.photo.url;
        printImg.style.display = 'block';
    } else {
        printImg.style.display = 'none';
    }
}

function collectFormData() {
    return {
        name: document.getElementById('studentName').value.trim(),
        class: document.getElementById('studentClass').value,
        section: document.getElementById('studentSection').value,
        dob: document.getElementById('studentDOB').value,
        gender: document.getElementById('studentGender').value,
        phone: document.getElementById('studentPhone').value.trim(),
        address: document.getElementById('studentAddress').value.trim(),
        prevSchool: document.getElementById('prevSchool').value.trim(),
        prevClass: document.getElementById('prevClass').value.trim(),
        prevYear: document.getElementById('prevYear').value.trim(),
        prevBoard: document.getElementById('prevBoard').value.trim(),
        aparId: document.getElementById('aparId').value.trim(),
        formNo: 'ADM-' + Date.now().toString().slice(-6)
    };
}

document.getElementById('previewFormBtn').addEventListener('click', () => {
    const data = collectFormData();
    populatePrintForm(data);
    const printDiv = document.getElementById('printAdmissionForm');
    printDiv.style.display = 'block';
    printDiv.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('printFormBtn').addEventListener('click', () => {
    const data = collectFormData();
    populatePrintForm(data);
    window.print();
});

// ---------- Form Submit ----------
document.getElementById('admissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editAdmissionId').value;
    const confirmCheck = document.getElementById('confirmCheck');
    if (!confirmCheck.checked) {
        showToast('Please confirm that all information is correct.', 'warning');
        return;
    }

    // Check if required files are uploaded (should already be validated but double-check)
    if (!fileStore.photo.url || !fileStore.aadhaar.url) {
        showToast('Student Photo and Aadhaar Card are required.', 'warning');
        return;
    }

    const data = {
        studentName: document.getElementById('studentName').value.trim(),
        class: document.getElementById('studentClass').value,
        section: document.getElementById('studentSection').value,
        dob: document.getElementById('studentDOB').value,
        gender: document.getElementById('studentGender').value,
        phone: document.getElementById('studentPhone').value.trim(),
        address: document.getElementById('studentAddress').value.trim(),
        prevSchool: document.getElementById('prevSchool').value.trim(),
        prevClass: document.getElementById('prevClass').value.trim(),
        prevYear: document.getElementById('prevYear').value.trim(),
        prevBoard: document.getElementById('prevBoard').value.trim(),
        aparId: document.getElementById('aparId').value.trim(),
        photoUrl: fileStore.photo.url,
        aadhaarUrl: fileStore.aadhaar.url,
        fatherAadhaarUrl: fileStore.fatherAadhaar.url || '',
        motherAadhaarUrl: fileStore.motherAadhaar.url || '',
        status: 'pending',
        updatedAt: Date.now()
    };

    if (!data.studentName || !data.class) {
        showToast('Please fill all required fields.', 'warning');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.querySelector('.spinner').style.display = 'inline-block';
    submitBtn.querySelector('.btn-text').textContent = 'Submitting...';

    try {
        if (id) {
            await update(ref(database, `admissions/${id}`), data);
            showToast('Admission updated successfully!', 'success');
        } else {
            const newRef = push(ref(database, 'admissions'));
            data.timestamp = Date.now();
            await set(newRef, data);
            showToast('Student admission submitted successfully.', 'success');
        }
        // Reset form
        document.getElementById('admissionForm').reset();
        document.getElementById('editAdmissionId').value = '';
        // Reset file store
        Object.keys(fileStore).forEach(key => {
            fileStore[key] = { file: null, url: null, uploaded: false };
        });
        document.querySelectorAll('.file-preview').forEach(el => el.style.display = 'none');
        document.getElementById('printAdmissionForm').style.display = 'none';
        document.getElementById('admissionModal').classList.remove('active');
        document.getElementById('confirmCheck').checked = false;
        updateWizard(1);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.spinner').style.display = 'none';
        submitBtn.querySelector('.btn-text').textContent = 'Final Submit';
    }
});

// ---------- Modal Controls ----------
function openAddModal() {
    document.getElementById('admissionModalTitle').textContent = 'New Student Admission';
    document.getElementById('admissionForm').reset();
    document.getElementById('editAdmissionId').value = '';
    document.getElementById('confirmCheck').checked = false;
    Object.keys(fileStore).forEach(key => {
        fileStore[key] = { file: null, url: null, uploaded: false };
    });
    document.querySelectorAll('.file-preview').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.file-upload-area').forEach(el => el.style.borderColor = '');
    document.getElementById('printAdmissionForm').style.display = 'none';
    updateWizard(1);
    document.getElementById('admissionModal').classList.add('active');
}

function openEditModal(id) {
    const adm = allAdmissions.find(a => a.id === id);
    if (!adm) {
        showToast('Record not found', 'error');
        return;
    }
    document.getElementById('admissionModalTitle').textContent = 'Edit Admission';
    document.getElementById('editAdmissionId').value = id;
    document.getElementById('studentName').value = adm.studentName || '';
    document.getElementById('studentClass').value = adm.class || '';
    document.getElementById('studentSection').value = adm.section || '';
    document.getElementById('studentDOB').value = adm.dob || '';
    document.getElementById('studentGender').value = adm.gender || 'Male';
    document.getElementById('studentPhone').value = adm.phone || '';
    document.getElementById('studentAddress').value = adm.address || '';
    document.getElementById('prevSchool').value = adm.prevSchool || '';
    document.getElementById('prevClass').value = adm.prevClass || '';
    document.getElementById('prevYear').value = adm.prevYear || '';
    document.getElementById('prevBoard').value = adm.prevBoard || '';
    document.getElementById('aparId').value = adm.aparId || '';

    // Restore file URLs and previews
    if (adm.photoUrl) {
        fileStore.photo.url = adm.photoUrl;
        fileStore.photo.uploaded = true;
        const preview = document.getElementById('photoPreview');
        preview.style.display = 'block';
        document.getElementById('photoPreviewImg').src = adm.photoUrl;
        document.getElementById('photoFileName').textContent = 'Photo (uploaded)';
    }
    if (adm.aadhaarUrl) {
        fileStore.aadhaar.url = adm.aadhaarUrl;
        fileStore.aadhaar.uploaded = true;
        const preview = document.getElementById('aadhaarPreview');
        preview.style.display = 'block';
        document.getElementById('aadhaarFileName').textContent = 'Aadhaar (uploaded)';
    }
    if (adm.fatherAadhaarUrl) {
        fileStore.fatherAadhaar.url = adm.fatherAadhaarUrl;
        fileStore.fatherAadhaar.uploaded = true;
        const preview = document.getElementById('fatherAadhaarPreview');
        preview.style.display = 'block';
        document.getElementById('fatherAadhaarFileName').textContent = 'Father\'s Aadhaar (uploaded)';
    }
    if (adm.motherAadhaarUrl) {
        fileStore.motherAadhaar.url = adm.motherAadhaarUrl;
        fileStore.motherAadhaar.uploaded = true;
        const preview = document.getElementById('motherAadhaarPreview');
        preview.style.display = 'block';
        document.getElementById('motherAadhaarFileName').textContent = 'Mother\'s Aadhaar (uploaded)';
    }

    document.getElementById('confirmCheck').checked = false;
    updateWizard(1);
    document.getElementById('admissionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('admissionModal').classList.remove('active');
    document.getElementById('admissionForm').reset();
    document.getElementById('editAdmissionId').value = '';
    document.querySelectorAll('.file-upload-area').forEach(el => el.style.borderColor = '');
}

document.getElementById('openAdmissionModalBtn').addEventListener('click', openAddModal);
document.getElementById('closeAdmissionModal').addEventListener('click', closeModal);
document.getElementById('admissionModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ---------- Load Admissions ----------
function loadAdmissions() {
    const admissionsRef = ref(database, 'admissions');
    onValue(admissionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allAdmissions = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            allAdmissions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } else {
            allAdmissions = [];
        }
        applyFiltersAndRender();
    }, (error) => {
        showToast('Error loading admissions: ' + error.message, 'error');
        document.getElementById('admissionTableBody').innerHTML = `<tr><td colspan="6" class="text-center">Error loading data</td></tr>`;
    });
}

// ---------- Filter & Render ----------
function applyFiltersAndRender() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const classFilter = document.getElementById('filterClass').value;
    const statusFilter = document.getElementById('filterStatus').value;

    filteredAdmissions = allAdmissions.filter(adm => {
        const nameMatch = adm.studentName?.toLowerCase().includes(searchTerm) || false;
        const classMatch = classFilter ? adm.class === classFilter : true;
        const statusMatch = statusFilter ? adm.status === statusFilter : true;
        return nameMatch && classMatch && statusMatch;
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredAdmissions.slice(start, end);
    const tbody = document.getElementById('admissionTableBody');

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No admissions found</td></tr>`;
        document.getElementById('admissionCount').textContent = 'Showing 0 entries';
        return;
    }

    let html = '';
    pageData.forEach(adm => {
        const statusBadge = adm.status === 'approved' ? 'success' : adm.status === 'pending' ? 'warning' : 'danger';
        const statusText = adm.status ? adm.status.charAt(0).toUpperCase() + adm.status.slice(1) : 'Pending';
        const date = adm.timestamp ? new Date(adm.timestamp).toLocaleDateString() : 'N/A';
        const initials = getInitials(adm.studentName);
        html += `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-id="${adm.id}" /></td>
                <td><span class="table-avatar">${initials}</span> ${adm.studentName || 'Unknown'}</td>
                <td>${adm.class || 'N/A'}</td>
                <td>${date}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm edit-btn" data-id="${adm.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${adm.id}">Delete</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const total = filteredAdmissions.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    document.getElementById('admissionCount').textContent = `Showing ${start+1}-${Math.min(end, total)} of ${total} entries`;
    document.getElementById('page1').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });

    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.onchange = function() {
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = this.checked);
        };
    }
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

// ---------- Delete ----------
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

document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) closeConfirmModal();
});

// ---------- Filter controls ----------
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
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});
document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredAdmissions.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Initialize wizard
updateWizard(1);

// Add error style for invalid fields
document.querySelectorAll('.form-control').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('error'));
    el.addEventListener('change', () => el.classList.remove('error'));
});

console.log('Admission module fixed and ready (external JS).');
