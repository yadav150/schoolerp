/**
 * STUDENTS MODULE – Student Records with Firebase
 * External JavaScript file for students.html
 */

import {
    auth, database, ref, push, set, onValue, remove, update,
    onAuthStateChanged, signOut
} from './firebase.js';

// ---------- Authentication Check ----------
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }
    loadStudents();
});

// ---------- Logout ----------
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '../../login.html';
    } catch (error) {
        showToast('Logout failed: ' + error.message, 'error');
    }
});

// ============================================================
// STATE
// ============================================================
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
const pageSize = 5;
let deleteTargetId = null;

// ============================================================
// DOM REFS
// ============================================================
const tbody = document.getElementById('studentTableBody');
const countSpan = document.getElementById('studentCount');
const searchInput = document.getElementById('searchInput');
const filterClass = document.getElementById('filterClass');
const filterSection = document.getElementById('filterSection');
const filterStatus = document.getElementById('filterStatus');
const applyBtn = document.getElementById('applyFilterBtn');
const resetBtn = document.getElementById('resetFilterBtn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const page1Btn = document.getElementById('page1');

// Modal elements
const modal = document.getElementById('studentModal');
const modalTitle = document.getElementById('studentModalTitle');
const form = document.getElementById('studentForm');
const editIdInput = document.getElementById('editStudentId');
const studentName = document.getElementById('studentName');
const studentClass = document.getElementById('studentClass');
const rollNo = document.getElementById('rollNo');
const studentStatus = document.getElementById('studentStatus');
const parentName = document.getElementById('parentName');
const parentPhone = document.getElementById('parentPhone');
const studentAddress = document.getElementById('studentAddress');
const submitBtn = document.getElementById('submitStudentBtn');
const cancelBtn = document.getElementById('cancelStudentBtn');
const closeModalBtn = document.getElementById('closeStudentModal');
const openModalBtn = document.getElementById('openStudentModalBtn');

// Confirm modal
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const closeConfirmBtn = document.getElementById('closeConfirmModal');

// ============================================================
// LOAD STUDENTS
// ============================================================
function loadStudents() {
    const studentsRef = ref(database, 'students');
    onValue(studentsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allStudents = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            allStudents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            allStudents = [];
        }
        applyFiltersAndRender();
    }, (error) => {
        showToast('Error loading students: ' + error.message, 'error');
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading data</td></tr>`;
    });
}

// ============================================================
// FILTER & RENDER
// ============================================================
function applyFiltersAndRender() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const classFilter = filterClass.value;
    const sectionFilter = filterSection.value;
    const statusFilter = filterStatus.value;

    filteredStudents = allStudents.filter(student => {
        const nameMatch = student.name?.toLowerCase().includes(searchTerm) || false;
        const idMatch = student.rollNo?.toLowerCase().includes(searchTerm) || false;
        const searchMatch = nameMatch || idMatch;
        const classMatch = classFilter ? student.class === classFilter : true;
        const sectionMatch = sectionFilter ? student.section === sectionFilter : true;
        const statusMatch = statusFilter ? student.status === statusFilter : true;
        return searchMatch && classMatch && sectionMatch && statusMatch;
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredStudents.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No students found</td></tr>`;
        countSpan.textContent = 'Showing 0 entries';
        return;
    }

    let html = '';
    pageData.forEach(student => {
        const statusBadge = student.status === 'active' ? 'success' : student.status === 'inactive' ? 'warning' : 'danger';
        const statusText = student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Active';
        const initials = getInitials(student.name);
        html += `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-id="${student.id}" /></td>
                <td><span class="table-avatar">${initials}</span> ${student.name || 'Unknown'}</td>
                <td>${student.class || 'N/A'}</td>
                <td>${student.rollNo || 'N/A'}</td>
                <td>${student.parentPhone || 'N/A'}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm edit-btn" data-id="${student.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${student.id}">Delete</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const total = filteredStudents.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    countSpan.textContent = `Showing ${start+1}-${Math.min(end, total)} of ${total} entries`;
    page1Btn.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;

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
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// MODAL OPEN/CLOSE
// ============================================================
function openAddModal() {
    modalTitle.textContent = 'Add Student';
    form.reset();
    editIdInput.value = '';
    studentStatus.value = 'active';
    submitBtn.querySelector('.btn-text').textContent = 'Save Student';
    modal.classList.add('active');
}

function openEditModal(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) {
        showToast('Record not found', 'error');
        return;
    }
    modalTitle.textContent = 'Edit Student';
    editIdInput.value = id;
    studentName.value = student.name || '';
    studentClass.value = student.class || '';
    rollNo.value = student.rollNo || '';
    studentStatus.value = student.status || 'active';
    parentName.value = student.parentName || '';
    parentPhone.value = student.parentPhone || '';
    studentAddress.value = student.address || '';
    submitBtn.querySelector('.btn-text').textContent = 'Update Student';
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    form.reset();
    editIdInput.value = '';
}

// ============================================================
// FORM SUBMIT
// ============================================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const name = studentName.value.trim();
    const cls = studentClass.value;
    if (!name || !cls) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    const data = {
        name: name,
        class: cls,
        rollNo: rollNo.value.trim() || '',
        status: studentStatus.value || 'active',
        parentName: parentName.value.trim() || '',
        parentPhone: parentPhone.value.trim() || '',
        address: studentAddress.value.trim() || '',
        updatedAt: Date.now()
    };

    submitBtn.disabled = true;
    submitBtn.querySelector('.spinner').style.display = 'inline-block';
    submitBtn.querySelector('.btn-text').textContent = 'Saving...';

    try {
        if (id) {
            await update(ref(database, `students/${id}`), data);
            showToast('Student updated successfully!', 'success');
        } else {
            const newRef = push(ref(database, 'students'));
            data.createdAt = Date.now();
            await set(newRef, data);
            showToast('Student added successfully!', 'success');
        }
        closeModal();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.spinner').style.display = 'none';
        submitBtn.querySelector('.btn-text').textContent = id ? 'Update Student' : 'Save Student';
    }
});

// ============================================================
// DELETE
// ============================================================
function confirmDelete(id) {
    deleteTargetId = id;
    confirmModal.classList.add('active');
}

confirmDeleteBtn.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
        await remove(ref(database, `students/${deleteTargetId}`));
        showToast('Student deleted successfully', 'success');
    } catch (error) {
        showToast('Error deleting: ' + error.message, 'error');
    } finally {
        confirmModal.classList.remove('active');
        deleteTargetId = null;
    }
});

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    deleteTargetId = null;
}

// ============================================================
// EVENT BINDINGS
// ============================================================
openModalBtn.addEventListener('click', openAddModal);
cancelBtn.addEventListener('click', closeModal);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
confirmModal.addEventListener('click', function(e) {
    if (e.target === this) closeConfirmModal();
});
cancelConfirmBtn.addEventListener('click', closeConfirmModal);
closeConfirmBtn.addEventListener('click', closeConfirmModal);

applyBtn.addEventListener('click', applyFiltersAndRender);
resetBtn.addEventListener('click', function() {
    searchInput.value = '';
    filterClass.value = '';
    filterSection.value = '';
    filterStatus.value = '';
    applyFiltersAndRender();
});
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') applyFiltersAndRender();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});
nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Sidebar toggle (if not handled by global script)
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

console.log('Students module loaded.');
