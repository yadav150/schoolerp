/**
 * Students Module - Page-specific logic
 * Handles CRUD operations with localStorage (ready for backend swap)
 */

(function() {
    'use strict';

    // ============================================================
    // DOM References
    // ============================================================
    const tableBody = document.getElementById('studentsTableBody');
    const searchInput = document.getElementById('searchInput');
    const classFilter = document.getElementById('classFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const addStudentBtn = document.getElementById('addStudentBtn');

    // Modal elements
    const modalOverlay = document.getElementById('studentModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const studentForm = document.getElementById('studentForm');
    const studentId = document.getElementById('studentId');
    const admissionNo = document.getElementById('admissionNo');
    const studentName = document.getElementById('studentName');
    const studentClass = document.getElementById('studentClass');
    const studentSection = document.getElementById('studentSection');
    const parentContact = document.getElementById('parentContact');
    const studentStatus = document.getElementById('studentStatus');

    // ============================================================
    // Data Store (localStorage)
    // ============================================================
    const STORAGE_KEY = 'hss_students';

    function getStudents() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    function saveStudents(students) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    }

    // ============================================================
    // Generate unique ID (simple incremental)
    // ============================================================
    function generateId(students) {
        if (students.length === 0) return 1;
        const maxId = students.reduce((max, s) => Math.max(max, s.id || 0), 0);
        return maxId + 1;
    }

    // ============================================================
    // Render Table
    // ============================================================
    function renderTable(students) {
        if (!tableBody) return;

        if (students.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2rem; color: #999;">
                        <i class="fas fa-user-graduate" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        No students found. Add a new student!
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        students.forEach(student => {
            const statusClass = student.status?.toLowerCase() || 'active';
            html += `
                <tr data-id="${student.id}">
                    <td><strong>${student.admissionNo || '—'}</strong></td>
                    <td>${student.name || '—'}</td>
                    <td>${student.class || '—'}</td>
                    <td>${student.section || '—'}</td>
                    <td>${student.parentContact || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${student.status || 'Active'}</span></td>
                    <td class="text-center">
                        <div class="actions-cell">
                            <button class="btn-icon edit-btn" data-id="${student.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${student.id}" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;

        // Attach event listeners to action buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const id = parseInt(this.dataset.id);
                openEditModal(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const id = parseInt(this.dataset.id);
                deleteStudent(id);
            });
        });
    }

    // ============================================================
    // Filter Logic
    // ============================================================
    function filterStudents() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const classVal = classFilter.value;
        const statusVal = statusFilter.value;

        let students = getStudents();

        if (searchTerm) {
            students = students.filter(s =>
                (s.name && s.name.toLowerCase().includes(searchTerm)) ||
                (s.admissionNo && s.admissionNo.toLowerCase().includes(searchTerm)) ||
                (s.class && s.class.toString().includes(searchTerm))
            );
        }

        if (classVal) {
            students = students.filter(s => s.class && s.class.toString() === classVal);
        }

        if (statusVal) {
            students = students.filter(s => (s.status || 'Active') === statusVal);
        }

        renderTable(students);
    }

    // ============================================================
    // CRUD Operations
    // ============================================================

    // Add / Update
    function saveStudentFromForm() {
        const id = studentId.value ? parseInt(studentId.value) : null;
        const students = getStudents();

        const studentData = {
            name: studentName.value.trim(),
            admissionNo: admissionNo.value.trim(),
            class: studentClass.value,
            section: studentSection.value.trim().toUpperCase(),
            parentContact: parentContact.value.trim(),
            status: studentStatus.value || 'Active'
        };

        // Validation
        if (!studentData.name || !studentData.admissionNo || !studentData.class) {
            alert('Please fill in Name, Admission No., and Class.');
            return;
        }

        if (id) {
            // EDIT
            const index = students.findIndex(s => s.id === id);
            if (index !== -1) {
                students[index] = { ...students[index], ...studentData };
                saveStudents(students);
                closeModal();
                filterStudents();
                showToast('Student updated successfully!');
            }
        } else {
            // ADD
            // Check duplicate admission no
            if (students.some(s => s.admissionNo === studentData.admissionNo)) {
                alert(`Admission No. "${studentData.admissionNo}" already exists. Please use a unique number.`);
                return;
            }
            const newStudent = {
                id: generateId(students),
                ...studentData
            };
            students.push(newStudent);
            saveStudents(students);
            closeModal();
            filterStudents();
            showToast('Student added successfully!');
        }
    }

    function openEditModal(id) {
        const students = getStudents();
        const student = students.find(s => s.id === id);
        if (!student) return;

        modalTitle.textContent = 'Edit Student';
        studentId.value = student.id;
        admissionNo.value = student.admissionNo || '';
        studentName.value = student.name || '';
        studentClass.value = student.class || '';
        studentSection.value = student.section || '';
        parentContact.value = student.parentContact || '';
        studentStatus.value = student.status || 'Active';

        openModal();
    }

    function deleteStudent(id) {
        if (!confirm('Are you sure you want to delete this student record? This cannot be undone.')) return;

        let students = getStudents();
        students = students.filter(s => s.id !== id);
        saveStudents(students);
        filterStudents();
        showToast('Student deleted.');
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
        studentForm.reset();
        studentId.value = '';
        modalTitle.textContent = 'Add New Student';
    }

    // ============================================================
    // Toast Notification (simple)
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

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Auto dismiss
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
        filterStudents();
    }

    // ============================================================
    // Init: Load sample data if empty
    // ============================================================
    function initSampleData() {
        const students = getStudents();
        if (students.length === 0) {
            const sample = [
                { id: 1, admissionNo: '2026-001', name: 'Rahul Sharma', class: '10', section: 'A', parentContact: '9876543210', status: 'Active' },
                { id: 2, admissionNo: '2026-002', name: 'Priya Patel', class: '8', section: 'B', parentContact: '9876543211', status: 'Active' },
                { id: 3, admissionNo: '2026-003', name: 'Amit Kumar', class: '12', section: 'A', parentContact: '9876543212', status: 'Active' },
                { id: 4, admissionNo: '2026-004', name: 'Sneha Reddy', class: '5', section: 'C', parentContact: '9876543213', status: 'Inactive' },
                { id: 5, admissionNo: '2026-005', name: 'Vikram Singh', class: '9', section: 'B', parentContact: '9876543214', status: 'Graduated' }
            ];
            saveStudents(sample);
        }
    }

    // ============================================================
    // Event Bindings
    // ============================================================
    function init() {
        // Load sample if needed
        initSampleData();

        // Render initial table
        filterStudents();

        // Filter events
        searchInput.addEventListener('input', filterStudents);
        classFilter.addEventListener('change', filterStudents);
        statusFilter.addEventListener('change', filterStudents);
        resetFiltersBtn.addEventListener('click', resetFilters);

        // Add button
        addStudentBtn.addEventListener('click', function() {
            modalTitle.textContent = 'Add New Student';
            studentId.value = '';
            studentForm.reset();
            openModal();
        });

        // Modal close events
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Form submit
        studentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveStudentFromForm();
        });

        // Keyboard shortcut: Escape to close modal
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                closeModal();
            }
        });

        // Export (dummy)
        document.getElementById('exportBtn')?.addEventListener('click', function() {
            showToast('Export feature ready for backend integration.');
        });
    }

    // Run when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
