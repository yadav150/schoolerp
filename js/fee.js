/**
 * Fee Module - Page-specific logic
 * CRUD operations with localStorage (ready for backend swap)
 */

(function() {
    'use strict';

    // ============================================================
    // DOM References
    // ============================================================
    const tableBody = document.getElementById('feeTableBody');
    const searchInput = document.getElementById('searchInput');
    const classFilter = document.getElementById('classFilter');
    const statusFilter = document.getElementById('statusFilter');
    const feeTypeFilter = document.getElementById('feeTypeFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const addFeeBtn = document.getElementById('addFeeBtn');

    const modalOverlay = document.getElementById('feeModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const feeForm = document.getElementById('feeForm');
    const feeId = document.getElementById('feeId');
    const feeAdmissionNo = document.getElementById('feeAdmissionNo');
    const feeStudentName = document.getElementById('feeStudentName');
    const feeClass = document.getElementById('feeClass');
    const feeType = document.getElementById('feeType');
    const feeAmount = document.getElementById('feeAmount');
    const feeDueDate = document.getElementById('feeDueDate');
    const feePaid = document.getElementById('feePaid');
    const feeStatus = document.getElementById('feeStatus');

    // Stats elements
    const totalCollectedEl = document.getElementById('totalCollected');
    const pendingCountEl = document.getElementById('pendingCount');
    const paidCountEl = document.getElementById('paidCount');
    const duesCountEl = document.getElementById('duesCount');

    // ============================================================
    // Data Store (localStorage)
    // ============================================================
    const STORAGE_KEY = 'hss_fees';

    function getFees() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    function saveFees(fees) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fees));
    }

    function generateId(fees) {
        if (fees.length === 0) return 1;
        const maxId = fees.reduce((max, f) => Math.max(max, f.id || 0), 0);
        return maxId + 1;
    }

    // ============================================================
    // Format currency
    // ============================================================
    function formatCurrency(amount) {
        return '₹' + Number(amount).toLocaleString('en-IN');
    }

    // ============================================================
    // Update Stats
    // ============================================================
    function updateStats(fees) {
        const totalCollected = fees.reduce((sum, f) => sum + (parseFloat(f.paid) || 0), 0);
        const pendingCount = fees.filter(f => f.status === 'Unpaid').length;
        const paidCount = fees.filter(f => f.status === 'Paid').length;
        // Students with dues: unique admission numbers with any Unpaid or Partial
        const duesSet = new Set();
        fees.forEach(f => {
            if (f.status === 'Unpaid' || f.status === 'Partial') {
                duesSet.add(f.admissionNo);
            }
        });
        const duesCount = duesSet.size;

        totalCollectedEl.textContent = formatCurrency(totalCollected);
        pendingCountEl.textContent = pendingCount;
        paidCountEl.textContent = paidCount;
        duesCountEl.textContent = duesCount;
    }

    // ============================================================
    // Render Table
    // ============================================================
    function renderTable(fees) {
        if (!tableBody) return;

        if (fees.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 2rem; color: #999;">
                        <i class="fas fa-coins" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        No fee records found. Collect fees!
                    </td>
                </tr>
            `;
            updateStats(getFees());
            return;
        }

        let html = '';
        fees.forEach(fee => {
            const statusClass = (fee.status || 'Unpaid').toLowerCase();
            const paid = parseFloat(fee.paid) || 0;
            const amount = parseFloat(fee.amount) || 0;
            const remaining = amount - paid;
            html += `
                <tr data-id="${fee.id}">
                    <td><strong>${fee.admissionNo || '—'}</strong></td>
                    <td>${fee.studentName || '—'}</td>
                    <td>${fee.class || '—'}</td>
                    <td>${fee.feeType || '—'}</td>
                    <td class="text-right">${formatCurrency(amount)}</td>
                    <td>${fee.dueDate || '—'}</td>
                    <td class="text-right">${formatCurrency(paid)}</td>
                    <td><span class="status-badge ${statusClass}">${fee.status || 'Unpaid'}</span></td>
                    <td class="text-center">
                        <div class="actions-cell">
                            <button class="btn-icon edit-btn" data-id="${fee.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${fee.id}" title="Delete">
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
                deleteFee(id);
            });
        });

        updateStats(getFees());
    }

    // ============================================================
    // Filter Logic
    // ============================================================
    function filterFees() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const classVal = classFilter.value;
        const statusVal = statusFilter.value;
        const feeTypeVal = feeTypeFilter.value;

        let fees = getFees();

        if (searchTerm) {
            fees = fees.filter(f =>
                (f.studentName && f.studentName.toLowerCase().includes(searchTerm)) ||
                (f.admissionNo && f.admissionNo.toLowerCase().includes(searchTerm)) ||
                (f.class && f.class.toString().includes(searchTerm))
            );
        }

        if (classVal) {
            fees = fees.filter(f => f.class && f.class.toString() === classVal);
        }

        if (statusVal) {
            fees = fees.filter(f => (f.status || 'Unpaid') === statusVal);
        }

        if (feeTypeVal) {
            fees = fees.filter(f => f.feeType === feeTypeVal);
        }

        renderTable(fees);
    }

    // ============================================================
    // CRUD Operations
    // ============================================================

    function saveFeeFromForm() {
        const id = feeId.value ? parseInt(feeId.value) : null;
        const fees = getFees();

        const feeData = {
            admissionNo: feeAdmissionNo.value.trim(),
            studentName: feeStudentName.value.trim(),
            class: feeClass.value,
            feeType: feeType.value,
            amount: parseFloat(feeAmount.value) || 0,
            dueDate: feeDueDate.value,
            paid: parseFloat(feePaid.value) || 0,
            status: feeStatus.value || 'Unpaid'
        };

        // Auto-calculate status if not manually set
        if (feeData.paid >= feeData.amount) {
            feeData.status = 'Paid';
        } else if (feeData.paid > 0 && feeData.paid < feeData.amount) {
            feeData.status = 'Partial';
        } else {
            feeData.status = 'Unpaid';
        }

        if (!feeData.admissionNo || !feeData.studentName || !feeData.class || !feeData.feeType || !feeData.dueDate) {
            alert('Please fill in Admission No., Student Name, Class, Fee Type, and Due Date.');
            return;
        }

        if (feeData.amount <= 0) {
            alert('Amount must be greater than 0.');
            return;
        }

        if (feeData.paid < 0) {
            alert('Paid amount cannot be negative.');
            return;
        }

        if (id) {
            // EDIT
            const index = fees.findIndex(f => f.id === id);
            if (index !== -1) {
                fees[index] = { ...fees[index], ...feeData };
                saveFees(fees);
                closeModal();
                filterFees();
                showToast('Fee record updated successfully!');
            }
        } else {
            // ADD - allow duplicates for same student (different fee types/dates)
            const newFee = {
                id: generateId(fees),
                ...feeData
            };
            fees.push(newFee);
            saveFees(fees);
            closeModal();
            filterFees();
            showToast('Fee record added successfully!');
        }
    }

    function openEditModal(id) {
        const fees = getFees();
        const fee = fees.find(f => f.id === id);
        if (!fee) return;

        modalTitle.textContent = 'Edit Fee Record';
        feeId.value = fee.id;
        feeAdmissionNo.value = fee.admissionNo || '';
        feeStudentName.value = fee.studentName || '';
        feeClass.value = fee.class || '';
        feeType.value = fee.feeType || 'Tuition';
        feeAmount.value = fee.amount || 0;
        feeDueDate.value = fee.dueDate || '';
        feePaid.value = fee.paid || 0;
        feeStatus.value = fee.status || 'Unpaid';

        openModal();
    }

    function deleteFee(id) {
        if (!confirm('Are you sure you want to delete this fee record? This cannot be undone.')) return;

        let fees = getFees();
        fees = fees.filter(f => f.id !== id);
        saveFees(fees);
        filterFees();
        showToast('Fee record deleted.');
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
        feeForm.reset();
        feeId.value = '';
        modalTitle.textContent = 'Collect Fee';
        // Set default due date to 30 days from now
        const today = new Date();
        today.setDate(today.getDate() + 30);
        feeDueDate.value = today.toISOString().split('T')[0];
        feePaid.value = 0;
        feeStatus.value = 'Unpaid';
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
        feeTypeFilter.value = '';
        filterFees();
    }

    // ============================================================
    // Init: Load sample data if empty
    // ============================================================
    function initSampleData() {
        const fees = getFees();
        if (fees.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            const dueDateStr = dueDate.toISOString().split('T')[0];
            const sample = [
                { id: 1, admissionNo: '2026-001', studentName: 'Rahul Sharma', class: '10', feeType: 'Tuition', amount: 5000, dueDate: dueDateStr, paid: 5000, status: 'Paid' },
                { id: 2, admissionNo: '2026-002', studentName: 'Priya Patel', class: '8', feeType: 'Library', amount: 1000, dueDate: dueDateStr, paid: 0, status: 'Unpaid' },
                { id: 3, admissionNo: '2026-003', studentName: 'Amit Kumar', class: '12', feeType: 'Sports', amount: 2000, dueDate: dueDateStr, paid: 1500, status: 'Partial' },
                { id: 4, admissionNo: '2026-004', studentName: 'Sneha Reddy', class: '5', feeType: 'Tuition', amount: 3500, dueDate: dueDateStr, paid: 3500, status: 'Paid' },
                { id: 5, admissionNo: '2026-005', studentName: 'Vikram Singh', class: '9', feeType: 'Lab', amount: 1500, dueDate: dueDateStr, paid: 0, status: 'Unpaid' }
            ];
            saveFees(sample);
        }
    }

    // ============================================================
    // Event Bindings
    // ============================================================
    function init() {
        initSampleData();
        filterFees();

        searchInput.addEventListener('input', filterFees);
        classFilter.addEventListener('change', filterFees);
        statusFilter.addEventListener('change', filterFees);
        feeTypeFilter.addEventListener('change', filterFees);
        resetFiltersBtn.addEventListener('click', resetFilters);

        addFeeBtn.addEventListener('click', function() {
            modalTitle.textContent = 'Collect Fee';
            feeId.value = '';
            feeForm.reset();
            const today = new Date();
            today.setDate(today.getDate() + 30);
            feeDueDate.value = today.toISOString().split('T')[0];
            feePaid.value = 0;
            feeStatus.value = 'Unpaid';
            openModal();
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        feeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveFeeFromForm();
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
