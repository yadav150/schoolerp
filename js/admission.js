/**
 * Admission Module - Page-specific logic
 * CRUD operations with localStorage (ready for backend swap)
 */

(function() {
    'use strict';

    // ============================================================
    // DOM References
    // ============================================================
    const tableBody = document.getElementById('admissionsTableBody');
    const searchInput = document.getElementById('searchInput');
    const classFilter = document.getElementById('classFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const addAdmissionBtn = document.getElementById('addAdmissionBtn');

    const modalOverlay = document.getElementById('admissionModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const admissionForm = document.getElementById('admissionForm');
    const admissionId = document.getElementById('admissionId');
    const admissionNo = document.getElementById('admissionNo');
    const studentName = document.getElementById('studentName');
    const admissionClass = document.getElementById('admissionClass');
    const admissionSection = document.getElementById('admissionSection');
    const admissionDate = document.getElementById('admissionDate');
    const parentContact = document.getElementById('parentContact');
    const admissionStatus = document.getElementById('admissionStatus');

    // ============================================================
    // Data Store (localStorage)
    // ============================================================
    const STORAGE_KEY = 'hss_admissions';

    function getAdmissions() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    function saveAdmissions(admissions) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(admissions));
    }

    function generateId(admissions) {
        if (admissions.length === 0) return 1;
        const maxId = admissions.reduce((max, a) => Math.max(max, a.id || 0), 0);
        return maxId + 1;
    }

    // ============================================================
    // Render Table
    // ============================================================
    function renderTable(admissions) {
        if (!tableBody) return;

        if (admissions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem; color: #999;">
                        <i class="fas fa-user-plus" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        No admission records found. Add a new admission!
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        admissions.forEach(admission => {
            const statusClass = (admission.status || 'Pending').toLowerCase();
            html += `
                <tr data-id="${admission.id}">
                    <td><strong>${admission.admissionNo || '—'}</strong></td>
                    <td>${admission.studentName || '—'}</td>
                    <td>${admission.class || '—'}</td>
                    <td>${admission.section || '—'}</td>
                    <td>${admission.admissionDate || '—'}</td>
                    <td>${admission.parentContact || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${admission.status || 'Pending'}</span></td>
                    <td class="text-center">
                        <div class="actions-cell">
                            <button class="btn-icon edit-btn" data-id="${admission.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${admission.id}" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                openEditModal(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                deleteAdmission(id);
            });
        });
    }

    // ============================================================
    // Filter Logic
    // ============================================================
    function filterAdmissions() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const classVal = classFilter.value;
        const statusVal = statusFilter.value;

        let admissions = getAdmissions();

        if (searchTerm) {
            admissions = admissions.filter(a =>
                (a.studentName && a.studentName.toLowerCase().includes(searchTerm)) ||
                (a.admissionNo && a.admissionNo.toLowerCase().includes(searchTerm)) ||
                (a.class && a.class.toString().includes(searchTerm))
            );
        }

        if (classVal) {
            admissions = admissions.filter(a => a.class && a.class.toString() === classVal);
        }

        if (statusVal) {
            admissions = admissions.filter(a => (a.status || 'Pending') === statusVal);
        }

        renderTable(admissions);
    }

    // ============================================================
    // CRUD Operations
    // ============================================================

    function saveAdmissionFromForm() {
        const id = admissionId.value ? parseInt(admissionId.value) : null;
        const admissions = getAdmissions();

        const admissionData = {
            admissionNo: admissionNo.value.trim(),
            studentName: studentName.value.trim(),
            class: admissionClass.value,
            section: admissionSection.value.trim().toUpperCase(),
            admissionDate: admissionDate.value,
            parentContact: parentContact.value.trim(),
            status: admissionStatus.value || 'Pending'
        };

        if (!admissionData.admissionNo || !admissionData.studentName || !admissionData.class || !admissionData.admissionDate) {
            alert('Please fill in Admission No., Student Name, Class, and Date.');
            return;
        }

        if (id) {
            // EDIT
            const index = admissions.findIndex(a => a.id === id);
            if (index !== -1) {
                // Check duplicate admissionNo (excluding self)
                const duplicate = admissions.some((a, i) => i !== index && a.admissionNo === admissionData.admissionNo);
                if (duplicate) {
                    alert(`Admission No. "${admissionData.admissionNo}" already exists. Please use a unique number.`);
                    return;
                }
                admissions[index] = { ...admissions[index], ...admissionData };
                saveAdmissions(admissions);
                closeModal();
                filterAdmissions();
                showToast('Admission record updated successfully!');
            }
        } else {
            // ADD
            if (admissions.some(a => a.admissionNo === admissionData.admissionNo)) {
                alert(`Admission No. "${admissionData.admissionNo}" already exists. Please use a unique number.`);
                return;
            }
            const newAdmission = {
                id: generateId(admissions),
                ...admissionData
            };
            admissions.push(newAdmission);
            saveAdmissions(admissions);
            closeModal();
            filterAdmissions();
            showToast('Admission record added successfully!');
        }
    }

    function openEditModal(id) {
        const admissions = getAdmissions();
        const admission = admissions.find(a => a.id === id);
        if (!admission) return;

        modalTitle.textContent = 'Edit Admission';
        admissionId.value = admission.id;
        admissionNo.value = admission.admissionNo || '';
        studentName.value = admission.studentName || '';
        admissionClass.value = admission.class || '';
        admissionSection.value = admission.section || '';
        admissionDate.value = admission.admissionDate || '';
        parentContact.value = admission.parentContact || '';
        admissionStatus.value = admission.status || 'Pending';

        openModal();
    }

    function deleteAdmission(id) {
        if (!confirm('Are you sure you want to delete this admission record? This cannot be undone.')) return;

        let admissions = getAdmissions();
        admissions = admissions.filter(a => a.id !== id);
        saveAdmissions(admissions);
        filterAdmissions();
        showToast('Admission record deleted.');
    }

    // ============================================================
    // Modal Controls
    // ============================================================
    function openModal() {
        modalOverlay.classList.add('active');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.classList.remove('modal-open');
        admissionForm.reset();
        admissionId.value = '';
        modalTitle.textContent = 'New Admission';
    }

    // ============================================================
    // Toast Notification
    // ============================================================
    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#1a237e',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: '9999',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'all 0.3s ease'
        });
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // Reset Filters
    // ============================================================
    function resetFilters() {
        searchInput.value = '';
        classFilter.value = '';
        statusFilter.value = '';
        filterAdmissions();
    }

    // ============================================================
    // Init: Load sample data if empty
    // ============================================================
    function initSampleData() {
        const admissions = getAdmissions();
        if (admissions.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            const sample = [
                { id: 1, admissionNo: '2026-001', studentName: 'Rahul Sharma', class: '10', section: 'A', admissionDate: today, parentContact: '9876543210', status: 'Pending' },
                { id: 2, admissionNo: '2026-002', studentName: 'Priya Patel', class: '8', section: 'B', admissionDate: today, parentContact: '9876543211', status: 'Approved' },
                { id: 3, admissionNo: '2026-003', studentName: 'Amit Kumar', class: '12', section: 'A', admissionDate: today, parentContact: '9876543212', status: 'Rejected' },
                { id: 4, admissionNo: '2026-004', studentName: 'Sneha Reddy', class: '5', section: 'C', admissionDate: today, parentContact: '9876543213', status: 'Pending' },
                { id: 5, admissionNo: '2026-005', studentName: 'Vikram Singh', class: '9', section: 'B', admissionDate: today, parentContact: '9876543214', status: 'Approved' }
            ];
            saveAdmissions(sample);
        }
    }

    // ============================================================
    // Event Bindings
    // ============================================================
    function init() {
        initSampleData();
        filterAdmissions();

        searchInput.addEventListener('input', filterAdmissions);
        classFilter.addEventListener('change', filterAdmissions);
        statusFilter.addEventListener('change', filterAdmissions);
        resetFiltersBtn.addEventListener('click', resetFilters);

        addAdmissionBtn.addEventListener('click', function() {
            modalTitle.textContent = 'New Admission';
            admissionId.value = '';
            admissionForm.reset();
            // Set default date to today
            admissionDate.value = new Date().toISOString().split('T')[0];
            openModal();
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        admissionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAdmissionFromForm();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                closeModal();
            }
        });

        document.getElementById('exportBtn')?.addEventListener('click', function() {
            showToast('Export feature ready for backend integration.');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
