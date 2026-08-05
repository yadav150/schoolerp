/**
 * Salary Management Module
 */

const STORAGE_TEACHERS = 'edu_teachers';
const STORAGE_SALARY_PAYMENTS = 'edu_salary_payments';

let salaryPayments = [];

// DOM
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const teacherSelect = document.getElementById('teacherSelect');
const defaultSalaryDisplay = document.getElementById('defaultSalaryDisplay');
const salaryAmount = document.getElementById('salaryAmount');
const salaryDate = document.getElementById('salaryDate');
const salaryMethod = document.getElementById('salaryMethod');
const paySalaryBtn = document.getElementById('paySalaryBtn');
const historySearch = document.getElementById('historySearch');
const historySubjectFilter = document.getElementById('historySubjectFilter');
const historyTableBody = document.getElementById('historyTableBody');
const historyCount = document.getElementById('historyCount');
const exportCSVBtn = document.getElementById('exportCSV');
const exportExcelBtn = document.getElementById('exportExcel');
const printHistoryBtn = document.getElementById('printHistory');
const receiptModal = document.getElementById('receiptModal');
const receiptBody = document.getElementById('receiptBody');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const closeReceiptModal = document.getElementById('closeReceiptModal');
const printReceiptBtn = document.getElementById('printReceiptBtn');

document.addEventListener('DOMContentLoaded', () => {
    loadSalaryPayments();
    populateTeacherDropdown();
    setDefaultDate();
    populateSubjectFilter();
    renderHistory();
    attachListeners();
});

function loadSalaryPayments() {
    const stored = localStorage.getItem(STORAGE_SALARY_PAYMENTS);
    salaryPayments = stored ? JSON.parse(stored) : [];
}

function saveSalaryPayments() {
    localStorage.setItem(STORAGE_SALARY_PAYMENTS, JSON.stringify(salaryPayments));
}

function generateReceiptNo() {
    const count = salaryPayments.length + 1;
    return 'SAL' + String(count).padStart(5, '0');
}

// Populate teacher dropdown from localStorage
function populateTeacherDropdown() {
    const teachers = JSON.parse(localStorage.getItem(STORAGE_TEACHERS)) || [];
    teacherSelect.innerHTML = '<option value="">Select teacher</option>' +
        teachers.map(t => `<option value="${t.id}" data-salary="${t.salary}" data-name="${t.name}" data-code="${t.teacherCode}" data-subject="${t.subject}">${t.name} (${t.teacherCode})</option>`).join('');
}

// Update display when teacher selected
teacherSelect.addEventListener('change', () => {
    const option = teacherSelect.selectedOptions[0];
    if (option && option.dataset.salary) {
        const salary = parseFloat(option.dataset.salary) || 0;
        defaultSalaryDisplay.value = '₹' + salary.toLocaleString();
        salaryAmount.value = salary;
        salaryAmount.placeholder = '₹' + salary;
    } else {
        defaultSalaryDisplay.value = '';
        salaryAmount.value = '';
        salaryAmount.placeholder = '';
    }
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    salaryDate.value = today;
}

// Pay salary and generate receipt
paySalaryBtn.addEventListener('click', () => {
    const teacherId = teacherSelect.value;
    if (!teacherId) {
        showToast('Please select a teacher.', 'error');
        return;
    }
    const amount = parseFloat(salaryAmount.value);
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    const date = salaryDate.value;
    if (!date) {
        showToast('Please select a payment date.', 'error');
        return;
    }
    const method = salaryMethod.value;
    const option = teacherSelect.selectedOptions[0];
    const teacherName = option.dataset.name;
    const teacherCode = option.dataset.code;
    const subject = option.dataset.subject;

    const payment = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2,5),
        receiptNo: generateReceiptNo(),
        teacherId,
        teacherName,
        teacherCode,
        subject,
        amount,
        date,
        method
    };

    salaryPayments.push(payment);
    saveSalaryPayments();

    // Show receipt modal
    showReceipt(payment);

    // Reset form
    teacherSelect.value = '';
    defaultSalaryDisplay.value = '';
    salaryAmount.value = '';
    setDefaultDate();

    renderHistory();
    showToast('Salary paid successfully.', 'success');
});

// Receipt modal logic
function showReceipt(payment) {
    receiptBody.innerHTML = `
        <div class="receipt-details">
            <p><strong>Receipt No:</strong> ${payment.receiptNo}</p>
            <p><strong>Teacher:</strong> ${payment.teacherName} (${payment.teacherCode})</p>
            <p><strong>Subject:</strong> ${payment.subject}</p>
            <p><strong>Amount:</strong> ₹${payment.amount}</p>
            <p><strong>Date:</strong> ${payment.date}</p>
            <p><strong>Method:</strong> ${payment.method}</p>
        </div>
    `;
    receiptModal.classList.add('active');
}

function closeReceipt() {
    receiptModal.classList.remove('active');
}
closeReceiptBtn.addEventListener('click', closeReceipt);
closeReceiptModal.addEventListener('click', closeReceipt);
receiptModal.addEventListener('click', e => { if (e.target === receiptModal) closeReceipt(); });

printReceiptBtn.addEventListener('click', () => {
    const printContent = document.getElementById('receiptContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Salary Receipt</title><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/salary-management.css"></head><body>${printContent}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
});

// Subject filter for history
function populateSubjectFilter() {
    const teachers = JSON.parse(localStorage.getItem(STORAGE_TEACHERS)) || [];
    const subjects = [...new Set(teachers.map(t => t.subject))].sort();
    historySubjectFilter.innerHTML = '<option value="">All Subjects</option>' +
        subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Render salary payment history
function renderHistory() {
    const searchTerm = historySearch.value.toLowerCase().trim();
    const subjectVal = historySubjectFilter.value;

    const filtered = salaryPayments.filter(p => {
        const matchSearch = !searchTerm ||
            p.teacherName.toLowerCase().includes(searchTerm) ||
            p.teacherCode.toLowerCase().includes(searchTerm);
        const matchSubject = !subjectVal || p.subject === subjectVal;
        return matchSearch && matchSubject;
    });

    if (filtered.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No salary payments found.</td></tr>';
    } else {
        historyTableBody.innerHTML = filtered.map(p => `
            <tr>
                <td>${p.receiptNo}</td>
                <td>${p.teacherName}</td>
                <td>${p.subject}</td>
                <td>₹${p.amount}</td>
                <td>${p.date}</td>
                <td>${p.method}</td>
                <td><button class="btn btn-sm btn-outline view-receipt" data-id="${p.id}">Receipt</button></td>
            </tr>
        `).join('');
    }
    historyCount.textContent = filtered.length;

    document.querySelectorAll('.view-receipt').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const payment = salaryPayments.find(p => p.id === id);
            if (payment) showReceipt(payment);
        });
    });
}

// Filter events
historySearch.addEventListener('input', renderHistory);
historySubjectFilter.addEventListener('change', renderHistory);

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-tab');
        tabContents.forEach(tc => tc.classList.remove('active'));
        document.getElementById(`tab-${target}`).classList.add('active');
    });
});

// Export CSV
function exportHistoryCSV(asExcel = false) {
    const searchTerm = historySearch.value.toLowerCase().trim();
    const subjectVal = historySubjectFilter.value;
    const filtered = salaryPayments.filter(p => {
        const matchSearch = !searchTerm || p.teacherName.toLowerCase().includes(searchTerm) || p.teacherCode.toLowerCase().includes(searchTerm);
        const matchSubject = !subjectVal || p.subject === subjectVal;
        return matchSearch && matchSubject;
    });
    if (filtered.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }
    const headers = ['Receipt No.', 'Teacher', 'Teacher ID', 'Subject', 'Amount', 'Date', 'Method'];
    const rows = filtered.map(p => [p.receiptNo, p.teacherName, p.teacherCode, p.subject, p.amount, p.date, p.method]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => csv += r.map(c => `"${c}"`).join(',') + '\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = asExcel ? 'salary_payments.csv' : 'salary_payments_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Export completed.', 'success');
}

exportCSVBtn.addEventListener('click', () => exportHistoryCSV());
exportExcelBtn.addEventListener('click', () => exportHistoryCSV(true));
printHistoryBtn.addEventListener('click', () => {
    const printArea = document.getElementById('tab-history').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Salary History</title><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/salary-management.css"></head><body>${printArea}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
});

function attachListeners() {
    // all listeners are already attached
}
