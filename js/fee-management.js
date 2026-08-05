/**
 * Fee Management Module
 * Updated: Itemised fee collection and professional A4 receipt
 */

const FEE_STRUCTURE = {
    'Nursery': 300, 'LKG': 300, 'UKG': 300,
    '1': 500, '2': 500, '3': 500, '4': 500, '5': 500,
    '6': 800, '7': 800, '8': 800
};

// System settings (will be moved to a settings module in future phases)
const SCHOOL_NAME = "Hawaipur Higher Secondary School";
const SCHOOL_ADDRESS = "Hawaipur, West Karbi Anglong, Assam";

const STORAGE_STUDENTS = 'edu_students';
const STORAGE_PAYMENTS = 'edu_fee_payments';

let payments = [];

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const feeStructureBody = document.getElementById('feeStructureBody');
const studentSelect = document.getElementById('studentSelect');
const studentClassDisplay = document.getElementById('studentClassDisplay');
const paymentDateInput = document.getElementById('paymentDate');
const paymentMethodInput = document.getElementById('paymentMethod');
const transactionRefInput = document.getElementById('transactionRef');
const receivedByInput = document.getElementById('receivedBy');
const collectFeeBtn = document.getElementById('collectFeeBtn');
const totalFeeDisplay = document.getElementById('totalFeeDisplay');
const totalFeeHidden = document.getElementById('totalFeeHidden');
const feeCheckboxes = document.querySelectorAll('.fee-check');
const feeAmountInputs = document.querySelectorAll('.fee-amount');
const receiptModal = document.getElementById('receiptModal');
const receiptBody = document.getElementById('receiptBody');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const closeReceiptModal = document.getElementById('closeReceiptModal');
const printReceiptBtn = document.getElementById('printReceiptBtn');

// History elements
const historySearch = document.getElementById('historySearch');
const historyClassFilter = document.getElementById('historyClassFilter');
const historyTableBody = document.getElementById('historyTableBody');
const historyCount = document.getElementById('historyCount');
const exportCSVBtn = document.getElementById('exportCSV');
const exportExcelBtn = document.getElementById('exportExcel');
const printHistoryBtn = document.getElementById('printHistory');

// Initialise
document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
    renderFeeStructure();
    populateStudentDropdown();
    setDefaultDate();
    populateClassFilter();
    renderPaymentHistory();
    attachListeners();
});

// Data loading
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

// Fee Structure Table
function renderFeeStructure() {
    const rows = Object.entries(FEE_STRUCTURE).map(([cls, fee]) => `<tr><td>${cls}</td><td>₹${fee}</td></tr>`).join('');
    feeStructureBody.innerHTML = rows;
}

// Populate student dropdown
function populateStudentDropdown() {
    const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS)) || [];
    studentSelect.innerHTML = '<option value="">Select student</option>' + 
        students.map(s => `<option value="${s.id}" data-class="${s.class}" data-name="${s.name}" data-adm="${s.admissionNo}">${s.name} (${s.admissionNo})</option>`).join('');
}

// Student selection changes
studentSelect.addEventListener('change', () => {
    const selectedOption = studentSelect.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.class) {
        studentClassDisplay.value = selectedOption.dataset.class;
    } else {
        studentClassDisplay.value = '';
    }
    // Reset fee items
    feeCheckboxes.forEach(cb => { cb.checked = false; cb.parentElement.querySelector('.fee-amount').value = 0; cb.parentElement.querySelector('.fee-amount').disabled = true; });
    updateTotal();
});

// Fee checkbox behaviour
feeCheckboxes.forEach(cb => {
    cb.addEventListener('change', function() {
        const amountInput = this.parentElement.querySelector('.fee-amount');
        amountInput.disabled = !this.checked;
        if (!this.checked) amountInput.value = 0;
        updateTotal();
    });
});

feeAmountInputs.forEach(inp => {
    inp.addEventListener('input', updateTotal);
});

function updateTotal() {
    let total = 0;
    feeCheckboxes.forEach(cb => {
        if (cb.checked) {
            const amt = parseFloat(cb.parentElement.querySelector('.fee-amount').value) || 0;
            total += amt;
        }
    });
    totalFeeDisplay.textContent = total;
    totalFeeHidden.value = total;
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    paymentDateInput.value = today;
}

// Collect fee and generate receipt
collectFeeBtn.addEventListener('click', () => {
    const studentId = studentSelect.value;
    if (!studentId) {
        showToast('Please select a student.', 'error');
        return;
    }
    const totalAmount = parseFloat(totalFeeHidden.value);
    if (totalAmount <= 0) {
        showToast('Please select at least one fee item and enter amount.', 'error');
        return;
    }
    const date = paymentDateInput.value;
    if (!date) {
        showToast('Please select payment date.', 'error');
        return;
    }
    const method = paymentMethodInput.value;
    const transactionRef = transactionRefInput.value.trim();
    const receivedBy = receivedByInput.value.trim();

    const selectedOption = studentSelect.selectedOptions[0];
    const studentName = selectedOption.dataset.name;
    const admissionNo = selectedOption.dataset.adm;
    const studentClass = selectedOption.dataset.class;

    // Build fee items list (only those with amount > 0)
    const feeItems = [];
    feeCheckboxes.forEach(cb => {
        if (cb.checked) {
            const feeName = cb.getAttribute('data-fee');
            const amount = parseFloat(cb.parentElement.querySelector('.fee-amount').value) || 0;
            if (amount > 0) {
                feeItems.push({ name: feeName, amount });
            }
        }
    });

    const payment = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2,5),
        receiptNo: generateReceiptNo(),
        studentId,
        studentName,
        admissionNo,
        class: studentClass,
        feeItems,
        totalAmount,
        date,
        method,
        transactionRef,
        receivedBy
    };

    payments.push(payment);
    savePayments();

    // Show receipt
    showReceipt(payment);

    // Reset form
    studentSelect.value = '';
    studentClassDisplay.value = '';
    feeCheckboxes.forEach(cb => { cb.checked = false; cb.parentElement.querySelector('.fee-amount').value = 0; cb.parentElement.querySelector('.fee-amount').disabled = true; });
    updateTotal();
    setDefaultDate();
    transactionRefInput.value = '';
    receivedByInput.value = '';

    renderPaymentHistory();
    showToast('Fee collected successfully.', 'success');
});

// Show receipt in modal
function showReceipt(payment) {
    const itemsHtml = payment.feeItems.map(item => 
        `<tr><td>${item.name}</td><td style="text-align:right;">₹${item.amount}</td></tr>`
    ).join('');

    receiptBody.innerHTML = `
        <div class="receipt-wrapper">
            <div style="text-align:center; margin-bottom:1.5rem;">
                <h2 style="margin:0;">${SCHOOL_NAME}</h2>
                <p style="margin:0;">${SCHOOL_ADDRESS}</p>
                <h3 style="margin-top:1rem;">Fee Payment Receipt</h3>
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem;">
                <tr><td><strong>Receipt No.:</strong> ${payment.receiptNo}</td><td><strong>Date:</strong> ${payment.date}</td></tr>
            </table>
            <h4>Student Details</h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
                <tr><td><strong>Student Name:</strong> ${payment.studentName}</td><td><strong>Admission No.:</strong> ${payment.admissionNo}</td></tr>
                <tr><td><strong>Class & Section:</strong> ${payment.class}</td><td><strong>Roll No.:</strong> - </td></tr>
                <tr><td><strong>Academic Session:</strong> 2025-26</td><td></td></tr>
            </table>
            <h4>Fee Details</h4>
            <table class="receipt-table">
                <thead><tr><th>Particular</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr><td><strong>Total Fee</strong></td><td style="text-align:right;"><strong>₹${payment.totalAmount}</strong></td></tr>
                    <tr><td>Discount</td><td style="text-align:right;">₹0</td></tr>
                    <tr><td>Previous Due</td><td style="text-align:right;">₹0</td></tr>
                    <tr><td><strong>Grand Total</strong></td><td style="text-align:right;"><strong>₹${payment.totalAmount}</strong></td></tr>
                    <tr><td><strong>Amount Paid</strong></td><td style="text-align:right;"><strong>₹${payment.totalAmount}</strong></td></tr>
                    <tr><td>Balance Due</td><td style="text-align:right;">₹0</td></tr>
                </tfoot>
            </table>
            <h4>Payment Information</h4>
            <p><strong>Payment Mode:</strong> ${payment.method}</p>
            <p><strong>Transaction / Reference No.:</strong> ${payment.transactionRef || '-'}</p>
            <p><strong>Received By:</strong> ${payment.receivedBy || '-'}</p>
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
    window.print();
});

// Payment History
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
                <td>₹${p.totalAmount}</td>
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
            const payment = payments.find(p => p.id === id);
            if (payment) showReceipt(payment);
        });
    });
}

function populateClassFilter() {
    const students = JSON.parse(localStorage.getItem(STORAGE_STUDENTS)) || [];
    const classes = [...new Set(students.map(s => s.class))].sort();
    historyClassFilter.innerHTML = '<option value="">All Classes</option>' +
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

// Filter listeners
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
    const headers = ['Receipt No.', 'Student', 'Admission No.', 'Class', 'Total Amount', 'Date', 'Method'];
    const rows = filtered.map(p => [p.receiptNo, p.studentName, p.admissionNo, p.class, p.totalAmount, p.date, p.method]);
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
    // All listeners attached directly; placeholder for future expansions.
}
