/**
 * Teachers Module - Page-specific logic
 * CRUD operations with localStorage (ready for backend swap)
 */

(function() {
    'use strict';

    // ============================================================
    // DOM References
    // ============================================================
    const tableBody = document.getElementById('teachersTableBody');
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const addTeacherBtn = document.getElementById('addTeacherBtn');

    const modalOverlay = document.getElementById('teacherModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const teacherForm = document.getElementById('teacherForm');
    const teacherId = document.getElementById('teacherId');
    const teacherIdField = document.getElementById('teacherIdField');
    const teacherName = document.getElementById('teacherName');
    const teacherSubject = document.getElementById('teacherSubject');
    const teacherClass = document.getElementById('teacherClass');
    const teacherContact = document.getElementById('teacherContact');
    const teacherEmail = document.getElementById('teacherEmail');
    const teacherStatus = document.getElementById('teacherStatus');

    // ============================================================
    // Data Store (localStorage)
    // ============================================================
    const STORAGE_KEY = 'hss_teachers';

    function getTeachers() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    function saveTeachers(teachers) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    }

    function generateId(teachers) {
        if (teachers.length === 0) return 1;
        const maxId = teachers.reduce((max, t) => Math.max(max, t.id || 0), 0);
        return maxId + 1;
    }

    // ============================================================
    // Render Table
    // ============================================================
    function renderTable(teachers) {
        if (!tableBody) return;

        if (teachers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem; color: #999;">
                        <i class="fas fa-chalkboard-teacher" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        No teachers found. Add a new teacher!
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        teachers.forEach(teacher => {
            const statusClass = (teacher.status || 'Active').toLowerCase().replace(/\s+/g, '-');
            html += `
                <tr data-id="${teacher.id}">
                    <td><strong>${teacher.teacherId || '—'}</strong></td>
                    <td>${teacher.name || '—'}</td>
                    <td>${teacher.subject || '—'}</td>
                    <td>${teacher.classAssigned || '—'}</td>
                    <td>${teacher.contact || '—'}</td>
                    <td>${teacher.email || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${teacher.status || 'Active'}</span></td>
                    <td class="text-center">
                        <div class="actions-cell">
                            <button class="btn-icon edit-btn" data-id="${teacher.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${teacher.id}" title="Delete">
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
                deleteTeacher(id);
            });
        });
    }

    // ============================================================
    // Filter Logic
    // ============================================================
    function filterTeachers() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const subjectVal = subjectFilter.value;
        const statusVal = statusFilter.value;

        let teachers = getTeachers();

        if (searchTerm) {
            teachers = teachers.filter(t =>
                (t.name && t.name.toLowerCase().includes(searchTerm)) ||
                (t.teacherId && t.teacherId.toLowerCase().includes(searchTerm)) ||
                (t.subject && t.subject.toLowerCase().includes(searchTerm)) ||
                (t.classAssigned && t.classAssigned.toLowerCase().includes(searchTerm))
            );
        }

        if (subjectVal) {
            teachers = teachers.filter(t => t.subject === subjectVal);
        }

        if (statusVal) {
            teachers = teachers.filter(t => (t.status || 'Active') === statusVal);
        }

        renderTable(teachers);
    }

    // ============================================================
    // CRUD Operations
    // ============================================================

    function saveTeacherFromForm() {
        const id = teacherId.value ? parseInt(teacherId.value) : null;
        const teachers = getTeachers();

        const teacherData = {
            teacherId: teacherIdField.value.trim(),
            name: teacherName.value.trim(),
            subject: teacherSubject.value,
            classAssigned: teacherClass.value.trim(),
            contact: teacherContact.value.trim(),
            email: teacherEmail.value.trim(),
            status: teacherStatus.value || 'Active'
        };

        if (!teacherData.teacherId || !teacherData.name || !teacherData.subject) {
            alert('Please fill in Teacher ID, Name, and Subject.');
            return;
        }

        if (id) {
            // EDIT
            const index = teachers.findIndex(t => t.id === id);
            if (index !== -1) {
                // Check duplicate teacherId (excluding self)
                const duplicate = teachers.some((t, i) => i !== index && t.teacherId === teacherData.teacherId);
                if (duplicate) {
                    alert(`Teacher ID "${teacherData.teacherId}" already exists. Please use a unique ID.`);
                    return;
                }
                teachers[index] = { ...teachers[index], ...teacherData };
                saveTeachers(teachers);
                closeModal();
                filterTeachers();
                showToast('Teacher updated successfully!');
            }
        } else {
            // ADD
            if (teachers.some(t => t.teacherId === teacherData.teacherId)) {
                alert(`Teacher ID "${teacherData.teacherId}" already exists. Please use a unique ID.`);
                return;
            }
            const newTeacher = {
                id: generateId(teachers),
                ...teacherData
            };
            teachers.push(newTeacher);
            saveTeachers(teachers);
            closeModal();
            filterTeachers();
            showToast('Teacher added successfully!');
        }
    }

    function openEditModal(id) {
        const teachers = getTeachers();
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) return;

        modalTitle.textContent = 'Edit Teacher';
        teacherId.value = teacher.id;
        teacherIdField.value = teacher.teacherId || '';
        teacherName.value = teacher.name || '';
        teacherSubject.value = teacher.subject || '';
        teacherClass.value = teacher.classAssigned || '';
        teacherContact.value = teacher.contact || '';
        teacherEmail.value = teacher.email || '';
        teacherStatus.value = teacher.status || 'Active';

        openModal();
    }

    function deleteTeacher(id) {
        if (!confirm('Are you sure you want to delete this teacher record? This cannot be undone.')) return;

        let teachers = getTeachers();
        teachers = teachers.filter(t => t.id !== id);
        saveTeachers(teachers);
        filterTeachers();
        showToast('Teacher deleted.');
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
        teacherForm.reset();
        teacherId.value = '';
        modalTitle.textContent = 'Add New Teacher';
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
        subjectFilter.value = '';
        statusFilter.value = '';
        filterTeachers();
    }

    // ============================================================
    // Init: Load sample data if empty
    // ============================================================
    function initSampleData() {
        const teachers = getTeachers();
        if (teachers.length === 0) {
            const sample = [
                { id: 1, teacherId: 'T-2026-001', name: 'Mr. Anand Sharma', subject: 'Mathematics', classAssigned: '10-A, 12-B', contact: '9876543201', email: 'anand.sharma@hss.edu', status: 'Active' },
                { id: 2, teacherId: 'T-2026-002', name: 'Ms. Priya Mehta', subject: 'English', classAssigned: '9-A, 11-B', contact: '9876543202', email: 'priya.mehta@hss.edu', status: 'Active' },
                { id: 3, teacherId: 'T-2026-003', name: 'Dr. Suresh Kumar', subject: 'Science', classAssigned: '8-A, 10-B', contact: '9876543203', email: 'suresh.kumar@hss.edu', status: 'On Leave' },
                { id: 4, teacherId: 'T-2026-004', name: 'Mrs. Reena Das', subject: 'Social Studies', classAssigned: '7-A, 9-B', contact: '9876543204', email: 'reena.das@hss.edu', status: 'Active' },
                { id: 5, teacherId: 'T-2026-005', name: 'Mr. Vikram Singh', subject: 'Physical Education', classAssigned: 'All Classes', contact: '9876543205', email: 'vikram.singh@hss.edu', status: 'Inactive' }
            ];
            saveTeachers(sample);
        }
    }

    // ============================================================
    // Event Bindings
    // ============================================================
    function init() {
        initSampleData();
        filterTeachers();

        searchInput.addEventListener('input', filterTeachers);
        subjectFilter.addEventListener('change', filterTeachers);
        statusFilter.addEventListener('change', filterTeachers);
        resetFiltersBtn.addEventListener('click', resetFilters);

        addTeacherBtn.addEventListener('click', function() {
            modalTitle.textContent = 'Add New Teacher';
            teacherId.value = '';
            teacherForm.reset();
            openModal();
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        teacherForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveTeacherFromForm();
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
