/**
 * Student Management Module
 * Dependencies: ../js/script.js (provides showToast, showConfirm, global utilities)
 */

// Default fee structure (aligned with Phase 1 spec)
const FEE_STRUCTURE = {
    'Nursery': 300,
    'LKG': 300,
    'UKG': 300,
    '1': 500,
    '2': 500,
    '3': 500,
    '4': 500,
    '5': 500,
    '6': 800,
    '7': 800,
    '8': 800
};

// Local storage key
const STORAGE_KEY = 'edu_students';

// Student data store (in-memory)
let students = [];

// DOM Elements
const addStudentBtn = document.getElementById('addStudentBtn');
const studentModal = document.getElementById('studentModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const studentForm = document.getElementById('studentForm');
const saveStudentBtn = document.getElementById('saveStudentBtn');
const modalTitle = document.getElementById('modalTitle');
const studentIdInput = document.getElementById('studentId');
const admissionNoInput = document.getElementById('admissionNo');
const studentNameInput = document.getElementById('studentName');
const studentClassInput = document.getElementById('studentClass');
const parentContactInput = document.getElementById('parentContact');
const feeHint = document.getElementById('feeHint');
const searchInput = document.getElementById('searchInput');
const classFilter = document.getElementById('classFilter');
const studentTableBody = document.getElementById('studentTableBody');
const recordCount = document.getElementById('recordCount');
const exportCSV = document.getElementById('exportCSV');
const exportExcel = document.getElementById('exportExcel');
const printTable = document.getElementById('printTable');

// Initialize module
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    renderTable();
    attachEventListeners();
});

// Load from localStorage
function loadStudents() {
    const stored = localStorage.getItem(STORAGE_KEY);
    students = stored ? JSON.parse(stored) : [];
    // If empty, add a few sample records for demo (optional)
    if (students.length === 0) {
        students = [
            { id: generateId(), admissionNo: 'ADM001', name: 'Aarav Sharma', class: '5', parentContact: '9876543210' },
            { id: generateId(), admissionNo: 'ADM002', name: 'Ishita Patel', class: 'Nursery', parentContact: '9123456780' },
            { id: generateId(), admissionNo: 'ADM003', name: 'Rohan Verma', class: '8', parentContact: '9988776655' }
        ];
        saveStudents();
    }
}

function saveStudents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Get fee for a class
function getFeeForClass(cls) {
    return FEE_STRUCTURE[cls] || 0;
}

// Show fee hint when class changes
studentClassInput.addEventListener('change', () => {
    const cls = studentClassInput.value;
    if (cls) {
        const fee = getFeeForClass(cls);
        feeHint.textContent = `Monthly fee: ₹${fee}`;
    } else {
        feeHint.textContent = '';
    }
});

// Render table based on current filters
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const classVal = classFilter.value;

    const filtered = students.filter(student => {
        const matchSearch = !searchTerm ||
            student.name.toLowerCase().includes(searchTerm) ||
            student.admissionNo.toLowerCase().includes(searchTerm) ||
            student.class.toLowerCase().includes(searchTerm);
        const matchClass = !classVal || student.class === classVal;
        return matchSearch && matchClass;
    });

    if (filtered.length === 0) {
        studentTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No students found.</td></tr>';
    } else {
        studentTableBody.innerHTML = filtered.map(student => {
            const fee = getFeeForClass(student.class);
            return `
                <tr>
                    <td>${student.admissionNo}</td>
                    <td>${student.name}</td>
                    <td>${student.class}</td>
                    <td>${student.parentContact}</td>
                    <td>₹${fee}</td>
                    <td>
                        <div class="action-btns">
                            <button class="edit-btn" data-id="${student.id}" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="delete-btn" data-id="${student.id}" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    recordCount.textContent = filtered.length;

    // Attach event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            editStudent(id);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            deleteStudent(id);
        });
    });
}

// Open modal for add
function openAddModal() {
    studentForm.reset();
    studentIdInput.value = '';
    modalTitle.textContent = 'Add Student';
    feeHint.textContent = '';
    studentModal.classList.add('active');
    admissionNoInput.focus();
}

// Open modal for edit
function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    studentIdInput.value = student.id;
    admissionNoInput.value = student.admissionNo;
    studentNameInput.value = student.name;
    studentClassInput.value = student.class;
    parentContactInput.value = student.parentContact;
    // Trigger fee hint
    studentClassInput.dispatchEvent(new Event('change'));
    modalTitle.textContent = 'Edit Student';
    studentModal.classList.add('active');
}

// Close modal
function closeModal() {
    studentModal.classList.remove('active');
    studentForm.reset();
    studentIdInput.value = '';
    feeHint.textContent = '';
}

// Save student (add or update)
function saveStudent() {
    // Validate
    const admissionNo = admissionNoInput.value.trim();
    const name = studentNameInput.value.trim();
    const cls = studentClassInput.value;
    const contact = parentContactInput.value.trim();

    if (!admissionNo || !name || !cls || !contact) {
        if (typeof showToast === 'function') {
            showToast('Please fill all required fields.', 'error');
        } else {
            alert('Please fill all required fields.');
        }
        return;
    }

    if (!/^\d{10}$/.test(contact)) {
        if (typeof showToast === 'function') {
            showToast('Parent contact must be a 10-digit number.', 'error');
        } else {
            alert('Parent contact must be a 10-digit number.');
        }
        return;
    }

    // Check duplicate admission number (except for current student being edited)
    const existingId = studentIdInput.value;
    const duplicate = students.some(s => s.admissionNo.toLowerCase() === admissionNo.toLowerCase() && s.id !== existingId);
    if (duplicate) {
        if (typeof showToast === 'function') {
            showToast('Admission number already exists.', 'error');
        } else {
            alert('Admission number already exists.');
        }
        return;
    }

    if (existingId) {
        // Update
        const student = students.find(s => s.id === existingId);
        if (student) {
            student.admissionNo = admissionNo;
            student.name = name;
            student.class = cls;
            student.parentContact = contact;
        }
        if (typeof showToast === 'function') showToast('Student updated successfully.', 'success');
    } else {
        // Add new
        students.push({
            id: generateId(),
            admissionNo,
            name,
            class: cls,
            parentContact: contact
        });
        if (typeof showToast === 'function') showToast('Student added successfully.', 'success');
    }

    saveStudents();
    closeModal();
    renderTable();
}

// Delete student with confirmation
function deleteStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const performDelete = () => {
        students = students.filter(s => s.id !== id);
        saveStudents();
        renderTable();
        if (typeof showToast === 'function') showToast('Student deleted.', 'success');
    };

    if (typeof showConfirm === 'function') {
        showConfirm(
            'Delete Student',
            `Are you sure you want to delete ${student.name} (${student.admissionNo})?`,
            performDelete
        );
    } else {
        // Fallback if global confirm not loaded
        if (confirm(`Delete ${student.name}?`)) {
            performDelete();
        }
    }
}

// Event listeners
function attachEventListeners() {
    addStudentBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveStudentBtn.addEventListener('click', saveStudent);

    // Close modal on overlay click
    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) closeModal();
    });

    // Search & filter
    searchInput.addEventListener('input', renderTable);
    classFilter.addEventListener('change', renderTable);

    // Export CSV
    exportCSV.addEventListener('click', () => downloadCSV());
    exportExcel.addEventListener('click', () => downloadCSV(true)); // CSV for Excel
    printTable.addEventListener('click', () => window.print());
}

// CSV Export function
function downloadCSV(asExcel = false) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const classVal = classFilter.value;
    const filtered = students.filter(student => {
        const matchSearch = !searchTerm ||
            student.name.toLowerCase().includes(searchTerm) ||
            student.admissionNo.toLowerCase().includes(searchTerm) ||
            student.class.toLowerCase().includes(searchTerm);
        const matchClass = !classVal || student.class === classVal;
        return matchSearch && matchClass;
    });

    if (filtered.length === 0) {
        if (typeof showToast === 'function') showToast('No data to export.', 'error');
        return;
    }

    const headers = ['Admission No.', 'Name', 'Class', 'Parent Contact', 'Default Fee (₹)'];
    const rows = filtered.map(s => [
        s.admissionNo,
        s.name,
        s.class,
        s.parentContact,
        getFeeForClass(s.class)
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = asExcel ? 'students.csv' : 'students_export.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast('Export completed.', 'success');
}
