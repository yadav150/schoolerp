/**
 * Fee Management Module
 */

const FEE_STRUCTURE = {
    'Nursery': 300, 'LKG': 300, 'UKG': 300,
    '1': 500, '2': 500, '3': 500, '4': 500, '5': 500,
    '6': 800, '7': 800, '8': 800
};

const STORAGE_STUDENTS = 'edu_students';
const STORAGE_PAYMENTS = 'edu_fee_payments';

let payments = [];

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const feeStructureBody = document.getElementById('feeStructureBody');
const studentSelect = document.getElementById('studentSelect');
const studentClassDisplay = document.getElementById('studentClassDisplay');
const amountInput = document.getElementById('amount');
const paymentDateInput = document.getElementById('paymentDate');
const paymentMethodInput = document.getElementById('paymentMethod');
const collectFeeBtn = document.getElementById('collectFeeBtn');
const historySearch = document.getElementById('historySearch');
const historyClassFilter = document.getElementById('historyClassFilter');
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
    loadPayments();
    renderFeeStructure();
    populateStudentDropdown();
    setDefaultDate();
    populateClassFilter();
    renderPaymentHistory();
    attachListeners();
});

function loadPayments() {
    const stored = localStorage.getItem(STORAGE_PAYMENTS);
    payments = stored ? JSON.parse(stored) : [];
}

function savePayments() {
    localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(payments));
}

function generateReceiptNo() {
    const count = payments.length + 1;
    return 'RCP' + String(count).padStart(5, '0');
}

// Fee Structure table
function renderFeeStructure() {
    const rows = Object.entries(FEE_STRUCTURE).map(([cls, fee]) => `<tr><td>${cls}</td><td>₹${fee}</td></tr>`).join('');
    feeStructureBody.innerHTML = rows;
}

// Populate student dropdown from localStorage
function populateStudentDropdown() {
    const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS)) || [];
    studentSelect.innerHTML = '<option value="">Select student</option>' + 
        students.map(s => `<option value="${s.id}" data-class="${s.class}" data-name="${s.name}" data-adm="${s.admissionNo}">${s.name} (${s.admissionNo})</option>`).join('');
}

// Update class display and suggest default fee
studentSelect.addEventListener('change', () => {
    const selectedOption = studentSelect.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.class) {
        const cls = selectedOption.dataset.class;
        studentClassDisplay.value = cls;
        const defaultFee = FEE_STRUCTURE[cls] || 0;
        amountInput.value = defaultFee;
        amountInput.placeholder = `Default: ₹${defaultFee}`;
    } else {
        studentClassDisplay.value = '';
        amountInput.value = '';
        amountInput.placeholder = '';
    }
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    paymentDateInput.value = today;
}

// Collect fee & generate receipt
collectFeeBtn.addEventListener('click', () => {
    const studentId = studentSelect.value;
    if (!studentId) {
        showToast('Please select a student.', 'error');
        return;
    }
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    const date = paymentDateInput.value;
    if (!date) {
        showToast('Please select payment date.', 'error');
        return;
    }
    const method = paymentMethodInput.value;
    const selectedOption = studentSelect.selectedOptions[0];
    const studentName = selectedOption.dataset.name;
    const admissionNo = selectedOption.dataset.adm;
    const studentClass = selectedOption.dataset.class;

    const payment = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2,5),
        receiptNo: generateReceiptNo(),
        studentId,
        studentName,
        admissionNo,
        class: studentClass,
        amount,
        date,
        method
    };

    payments.push(payment);
    savePayments();

    // Show receipt modal
    showReceipt(payment);

    // Reset form
    studentSelect.value = '';
    studentClassDisplay.value = '';
    amountInput.value = '';
    setDefaultDate();

    renderPaymentHistory();
    showToast('Fee collected successfully.', 'success');
});

// Receipt modal
function showReceipt(payment) {
    receiptBody.innerHTML = `
        <div class="receipt-details">
            <p><strong>Receipt No:</strong> ${payment.receiptNo}</p>
            <p><strong>Student:</strong> ${payment.studentName} (${payment.admissionNo})</p>
            <p><strong>Class:</strong> ${payment.class}</p>
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
    win.document.write('<html><head><title>Fee Receipt</title><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/fee-management.css"></head><body>');
    win.document.write(printContent);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
});

// Populate class filter for history
function populateClassFilter() {
    const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS)) || [];
    const classes = [...new Set(students.map(s => s.class))].sort();
    historyClassFilter.innerHTML = '<option value="">All Classes</option>' + 
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

// Render payment history
function renderPaymentHistory() {
    const searchTerm = historySearch.value.toLowerCase().trim();
    const classVal = historyClassFilter.value;

    const filtered = payments.filter(p => {
        const matchSearch = !searchTerm ||
            p.studentName.toLowerCase().includes(searchTerm) ||
            p.admissionNo.toLowerCase().includes(searchTerm);
        const matchClass = !classVal || p.class === classVal;
        return matchSearch && matchClass;
    });

    if (filtered.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No payments found.</td></tr>';
    } else {
        historyTableBody.innerHTML = filtered.map(p => `
            <tr>
                <td>${p.receiptNo}</td>
                <td>${p.studentName}</td>
                <td>${p.class}</td>
                <td>₹${p.amount}</td>
                <td>${p.date}</td>
                <td>${p.method}</td>
                <td><button class="btn btn-sm btn-outline view-receipt" data-id="${p.id}">Receipt</button></td>
            </tr>
        `).join('');
    }
    historyCount.textContent = filtered.length;

    // attach view receipt
    document.querySelectorAll('.view-receipt').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const payment = payments.find(p => p.id === id);
            if (payment) showReceipt(payment);
        });
    });
}

// Filters
historySearch.addEventListener('input', renderPaymentHistory);
historyClassFilter.addEventListener('change', renderPaymentHistory);

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
    const classVal = historyClassFilter.value;
    const filtered = payments.filter(p => {
        const matchSearch = !searchTerm || p.studentName.toLowerCase().includes(searchTerm) || p.admissionNo.toLowerCase().includes(searchTerm);
        const matchClass = !classVal || p.class === classVal;
        return matchSearch && matchClass;
    });
    if (filtered.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }
    const headers = ['Receipt No.', 'Student', 'Admission No.', 'Class', 'Amount', 'Date', 'Method'];
    const rows = filtered.map(p => [p.receiptNo, p.studentName, p.admissionNo, p.class, p.amount, p.date, p.method]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => csv += r.map(c => `"${c}"`).join(',') + '\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = asExcel ? 'fee_payments.csv' : 'fee_payments_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Export completed.', 'success');
}

exportCSVBtn.addEventListener('click', () => exportHistoryCSV());
exportExcelBtn.addEventListener('click', () => exportHistoryCSV(true));
printHistoryBtn.addEventListener('click', () => {
    const printArea = document.getElementById('tab-history').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Payment History</title><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/fee-management.css"></head><body>${printArea}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
});

function attachListeners() {
    // placeholder
}
