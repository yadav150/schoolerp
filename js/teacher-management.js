/**
 * Teacher Management Module
 */

const STORAGE_KEY_TEACHERS = 'edu_teachers';
let teachers = [];

const addTeacherBtn = document.getElementById('addTeacherBtn');
const teacherModal = document.getElementById('teacherModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const teacherForm = document.getElementById('teacherForm');
const saveTeacherBtn = document.getElementById('saveTeacherBtn');
const modalTitle = document.getElementById('modalTitle');
const teacherIdInput = document.getElementById('teacherId');
const teacherCodeInput = document.getElementById('teacherCode');
const teacherNameInput = document.getElementById('teacherName');
const subjectInput = document.getElementById('subject');
const phoneInput = document.getElementById('phone');
const salaryInput = document.getElementById('salary');
const searchInput = document.getElementById('searchInput');
const subjectFilter = document.getElementById('subjectFilter');
const teacherTableBody = document.getElementById('teacherTableBody');
const recordCount = document.getElementById('recordCount');
const exportCSV = document.getElementById('exportCSV');
const exportExcel = document.getElementById('exportExcel');
const printTable = document.getElementById('printTable');

document.addEventListener('DOMContentLoaded', () => {
    loadTeachers();
    renderTable();
    attachEventListeners();
});

function loadTeachers() {
    const stored = localStorage.getItem(STORAGE_KEY_TEACHERS);
    teachers = stored ? JSON.parse(stored) : [];
    if (teachers.length === 0) {
        teachers = [
            { id: generateId(), teacherCode: 'TCH001', name: 'Dr. Sunita Rao', subject: 'Mathematics', phone: '9876501234', salary: 25000 },
            { id: generateId(), teacherCode: 'TCH002', name: 'Mr. Akash Mehta', subject: 'Science', phone: '9123409876', salary: 22000 },
            { id: generateId(), teacherCode: 'TCH003', name: 'Mrs. Priya Kapoor', subject: 'English', phone: '9988771122', salary: 23000 }
        ];
        saveTeachers();
    }
}

function saveTeachers() {
    localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(teachers));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function renderTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const subjectVal = subjectFilter.value;

    const filtered = teachers.filter(t => {
        const matchSearch = !searchTerm ||
            t.name.toLowerCase().includes(searchTerm) ||
            t.teacherCode.toLowerCase().includes(searchTerm) ||
            t.subject.toLowerCase().includes(searchTerm);
        const matchSubject = !subjectVal || t.subject === subjectVal;
        return matchSearch && matchSubject;
    });

    if (filtered.length === 0) {
        teacherTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No teachers found.</td></tr>';
    } else {
        teacherTableBody.innerHTML = filtered.map(t => `
            <tr>
                <td>${t.teacherCode}</td>
                <td>${t.name}</td>
                <td>${t.subject}</td>
                <td>${t.phone}</td>
                <td>₹${t.salary.toLocaleString()}</td>
                <td>
                    <div class="action-btns">
                        <button class="edit-btn" data-id="${t.id}" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="delete-btn" data-id="${t.id}" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    recordCount.textContent = filtered.length;

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editTeacher(btn.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTeacher(btn.getAttribute('data-id')));
    });
}

function openAddModal() {
    teacherForm.reset();
    teacherIdInput.value = '';
    modalTitle.textContent = 'Add Teacher';
    teacherModal.classList.add('active');
    teacherCodeInput.focus();
}

function editTeacher(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    teacherIdInput.value = t.id;
    teacherCodeInput.value = t.teacherCode;
    teacherNameInput.value = t.name;
    subjectInput.value = t.subject;
    phoneInput.value = t.phone;
    salaryInput.value = t.salary;
    modalTitle.textContent = 'Edit Teacher';
    teacherModal.classList.add('active');
}

function closeModal() {
    teacherModal.classList.remove('active');
    teacherForm.reset();
    teacherIdInput.value = '';
}

function saveTeacher() {
    const code = teacherCodeInput.value.trim();
    const name = teacherNameInput.value.trim();
    const subject = subjectInput.value;
    const phone = phoneInput.value.trim();
    const salary = parseFloat(salaryInput.value) || 0;

    if (!code || !name || !subject || !phone) {
        if (typeof showToast === 'function') showToast('Please fill all required fields.', 'error');
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        if (typeof showToast === 'function') showToast('Phone must be a 10-digit number.', 'error');
        return;
    }

    const existingId = teacherIdInput.value;
    const duplicate = teachers.some(t => t.teacherCode.toLowerCase() === code.toLowerCase() && t.id !== existingId);
    if (duplicate) {
        if (typeof showToast === 'function') showToast('Teacher ID already exists.', 'error');
        return;
    }

    if (existingId) {
        const t = teachers.find(t => t.id === existingId);
        if (t) {
            t.teacherCode = code;
            t.name = name;
            t.subject = subject;
            t.phone = phone;
            t.salary = salary;
        }
        if (typeof showToast === 'function') showToast('Teacher updated successfully.', 'success');
    } else {
        teachers.push({ id: generateId(), teacherCode: code, name, subject, phone, salary });
        if (typeof showToast === 'function') showToast('Teacher added successfully.', 'success');
    }

    saveTeachers();
    closeModal();
    renderTable();
}

function deleteTeacher(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;

    const perform = () => {
        teachers = teachers.filter(t => t.id !== id);
        saveTeachers();
        renderTable();
        if (typeof showToast === 'function') showToast('Teacher deleted.', 'success');
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Delete Teacher', `Remove ${t.name} (${t.teacherCode})?`, perform);
    } else if (confirm(`Delete ${t.name}?`)) {
        perform();
    }
}

function attachEventListeners() {
    addTeacherBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveTeacherBtn.addEventListener('click', saveTeacher);
    teacherModal.addEventListener('click', e => { if (e.target === teacherModal) closeModal(); });
    searchInput.addEventListener('input', renderTable);
    subjectFilter.addEventListener('change', renderTable);
    exportCSV.addEventListener('click', () => downloadCSV());
    exportExcel.addEventListener('click', () => downloadCSV(true));
    printTable.addEventListener('click', () => window.print());
}

function downloadCSV(asExcel = false) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const subjectVal = subjectFilter.value;
    const filtered = teachers.filter(t => {
        const matchSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm) || t.teacherCode.toLowerCase().includes(searchTerm) || t.subject.toLowerCase().includes(searchTerm);
        const matchSubject = !subjectVal || t.subject === subjectVal;
        return matchSearch && matchSubject;
    });
    if (filtered.length === 0) {
        if (typeof showToast === 'function') showToast('No data to export.', 'error');
        return;
    }
    const headers = ['Teacher ID', 'Name', 'Subject', 'Phone', 'Monthly Salary (₹)'];
    const rows = filtered.map(t => [t.teacherCode, t.name, t.subject, t.phone, t.salary]);
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => { csvContent += row.map(c => `"${c}"`).join(',') + '\n'; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asExcel ? 'teachers.csv' : 'teachers_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof showToast === 'function') showToast('Export completed.', 'success');
}
