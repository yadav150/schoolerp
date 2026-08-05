/**
 * Salary Module - Page-specific logic
 * CRUD operations with localStorage (ready for backend swap)
 */

(function() {
    'use strict';

    // ============================================================
    // DOM References
    // ============================================================
    const tableBody = document.getElementById('salaryTableBody');
    const searchInput = document.getElementById('searchInput');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const addSalaryBtn = document.getElementById('addSalaryBtn');

    const modalOverlay = document.getElementById('salaryModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalTitle = document.getElementById('modalTitle');
    const salaryForm = document.getElementById('salaryForm');
    const salaryId = document.getElementById('salaryId');
    const employeeId = document.getElementById('employeeId');
    const teacherName = document.getElementById('teacherName');
    const salaryMonth = document.getElementById('salaryMonth');
    const salaryYear = document.getElementById('salaryYear');
    const basicPay = document.getElementById('basicPay');
    const allowances = document.getElementById('allowances');
    const deductions = document.getElementById('deductions');
    const salaryStatus = document.getElementById('salaryStatus');

    // Stats elements
    const totalPaidEl = document.getElementById('totalPaid');
    const pendingCountEl = document.getElementById('pendingCount');
    const teacherCountEl = document.getElementById('teacherCount');
    const monthTotalEl = document.getElementById('monthTotal');

    // ============================================================
    // Data Store (localStorage)
    // ============================================================
    const STORAGE_KEY = 'hss_salaries';

    function getSalaries() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    function saveSalaries(salaries) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(salaries));
    }

    function generateId(salaries) {
        if (salaries.length === 0) return 1;
        const maxId = salaries.reduce((max, s) => Math.max(max, s.id || 0), 0);
        return maxId + 1;
    }

    // ============================================================
    // Helper: Calculate Net Salary
    // ============================================================
    function calculateNet(basic, allow, deduct) {
        const b = parseFloat(basic) || 0;
        const a = parseFloat(allow) || 0;
        const d = parseFloat(deduct) || 0;
        return b + a - d;
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
    function updateStats(salaries) {
        const totalPaid = salaries
            .filter(s => s.status === 'Paid')
            .reduce((sum, s) => sum + calculateNet(s.basicPay, s.allowances, s.deductions), 0);

        const pendingCount = salaries.filter(s => s.status === 'Pending').length;

        // Unique teachers (by employeeId)
        const uniqueTeachers = new Set(salaries.map(s => s.employeeId));
        const teacherCount = uniqueTeachers.size;

        // This month's total (current month)
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        const currentYear = now.getFullYear().toString();
        const monthTotal = salaries
            .filter(s => s.month === currentMonth && s.year === currentYear && s.status === 'Paid')
            .reduce((sum, s) => sum + calculateNet(s.basicPay, s.allowances, s.deductions), 0);

        totalPaidEl.textContent = formatCurrency(totalPaid);
        pendingCountEl.textContent = pendingCount;
        teacherCountEl.textContent = teacherCount;
        monthTotalEl.textContent = formatCurrency(monthTotal);
    }

    // ============================================================
    // Render Table
    // ============================================================
    function renderTable(salaries) {
        if (!tableBody) return;

        if (salaries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="padding: 2rem; color: #999;">
                        <i class="fas fa-wallet" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                        No salary records found. Add a new record!
                    </td>
                </tr>
            `;
            updateStats(getSalaries());
            return;
        }

        let html = '';
        salaries.forEach(salary => {
            const statusClass = (salary.status || 'Pending').toLowerCase();
            const netSalary = calculateNet(salary.basicPay, salary.allowances, salary.deductions);
            html += `
                <tr data-id="${salary.id}">
                    <td><strong>${salary.employeeId || '—'}</strong></td>
                    <td>${salary.teacherName || '—'}</td>
                    <td>${salary.month || '—'}</td>
                    <td>${salary.year || '—'}</td>
                    <td class="text-right">${formatCurrency(salary.basicPay || 0)}</td>
                    <td class="text-right">${formatCurrency(salary.allowances || 0)}</td>
                    <td class="text-right">${formatCurrency(salary.deductions || 0)}</td>
                    <td class="text-right"><strong>${formatCurrency(netSalary)}</strong></td>
                    <td><span class="status-badge ${statusClass}">${salary.status || 'Pending'}</span></td>
                    <td class="text-center">
                        <div class="actions-cell">
                            <button class="btn-icon edit-btn" data-id="${salary.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${salary.id}" title="Delete">
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
                deleteSalary(id);
            });
        });

        updateStats(getSalaries());
    }

    // ============================================================
    // Filter Logic
    // ============================================================
    function filterSalaries() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const monthVal = monthFilter.value;
        const yearVal = yearFilter.value;
        const statusVal = statusFilter.value;

        let salaries = getSalaries();

        if (searchTerm) {
            salaries = salaries.filter(s =>
                (s.teacherName && s.teacherName.toLowerCase().includes(searchTerm)) ||
                (s.employeeId && s.employeeId.toLowerCase().includes(searchTerm))
            );
        }

        if (monthVal) {
            salaries = salaries.filter(s => s.month === monthVal);
        }

        if (yearVal) {
            salaries = salaries.filter(s => s.year === yearVal);
        }

        if (statusVal) {
            salaries = salaries.filter(s => (s.status || 'Pending') === statusVal);
        }

        renderTable(salaries);
    }

    // ============================================================
    // CRUD Operations
    // ============================================================

    function saveSalaryFromForm() {
        const id = salaryId.value ? parseInt(salaryId.value) : null;
        const salaries = getSalaries();

        const salaryData = {
            employeeId: employeeId.value.trim(),
            teacherName: teacherName.value.trim(),
            month: salaryMonth.value,
            year: salaryYear.value,
            basicPay: parseFloat(basicPay.value) || 0,
            allowances: parseFloat(allowances.value) || 0,
            deductions: parseFloat(deductions.value) || 0,
            status: salaryStatus.value || 'Pending'
        };

        if (!salaryData.employeeId || !salaryData.teacherName || !salaryData.month || !salaryData.year) {
            alert('Please fill in Employee ID, Teacher Name, Month, and Year.');
            return;
        }

        if (salaryData.basicPay < 0 || salaryData.allowances < 0 || salaryData.deductions < 0) {
            alert('Basic Pay, Allowances, and Deductions cannot be negative.');
            return;
        }

        if (id) {
            // EDIT
            const index = salaries.findIndex(s => s.id === id);
            if (index !== -1) {
                salaries[index] = { ...salaries[index], ...salaryData };
                saveSalaries(salaries);
                closeModal();
                filterSalaries();
                showToast('Salary record updated successfully!');
            }
        } else {
            // ADD - check duplicate (same employee, month, year)
            const duplicate = salaries.some(s =>
                s.employeeId === salaryData.employeeId &&
                s.month === salaryData.month &&
                s.year === salaryData.year
            );
            if (duplicate) {
                alert(`Salary record for ${salaryData.teacherName} (${salaryData.month} ${salaryData.year}) already exists.`);
                return;
            }
            const newSalary = {
                id: generateId(salaries),
                ...salaryData
            };
            salaries.push(newSalary);
            saveSalaries(salaries);
            closeModal();
            filterSalaries();
            showToast('Salary record added successfully!');
        }
    }

    function openEditModal(id) {
        const salaries = getSalaries();
        const salary = salaries.find(s => s.id === id);
        if (!salary) return;

        modalTitle.textContent = 'Edit Salary Record';
        salaryId.value = salary.id;
        employeeId.value = salary.employeeId || '';
        teacherName.value = salary.teacherName || '';
        salaryMonth.value = salary.month || '';
        salaryYear.value = salary.year || '';
        basicPay.value = salary.basicPay || 0;
        allowances.value = salary.allowances || 0;
        deductions.value = salary.deductions || 0;
        salaryStatus.value = salary.status || 'Pending';

        openModal();
    }

    function deleteSalary(id) {
        if (!confirm('Are you sure you want to delete this salary record? This cannot be undone.')) return;

        let salaries = getSalaries();
        salaries = salaries.filter(s => s.id !== id);
        saveSalaries(salaries);
        filterSalaries();
        showToast('Salary record deleted.');
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
        salaryForm.reset();
        salaryId.value = '';
        modalTitle.textContent = 'Add Salary Record';
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
        monthFilter.value = '';
        yearFilter.value = '';
        statusFilter.value = '';
        filterSalaries();
    }

    // ============================================================
    // Init: Load sample data if empty
    // ============================================================
    function initSampleData() {
        const salaries = getSalaries();
        if (salaries.length === 0) {
            const sample = [
                { id: 1, employeeId: 'T-2026-001', teacherName: 'Mr. Anand Sharma', month: 'January', year: '2026', basicPay: 45000, allowances: 8000, deductions: 3000, status: 'Paid' },
                { id: 2, employeeId: 'T-2026-002', teacherName: 'Ms. Priya Mehta', month: 'January', year: '2026', basicPay: 38000, allowances: 6000, deductions: 2500, status: 'Paid' },
                { id: 3, employeeId: 'T-2026-003', teacherName: 'Dr. Suresh Kumar', month: 'January', year: '2026', basicPay: 52000, allowances: 10000, deductions: 4000, status: 'Pending' },
                { id: 4, employeeId: 'T-2026-004', teacherName: 'Mrs. Reena Das', month: 'February', year: '2026', basicPay: 35000, allowances: 5000, deductions: 2000, status: 'Paid' },
                { id: 5, employeeId: 'T-2026-005', teacherName: 'Mr. Vikram Singh', month: 'February', year: '2026', basicPay: 30000, allowances: 4000, deductions: 1500, status: 'Pending' },
                { id: 6, employeeId: 'T-2026-001', teacherName: 'Mr. Anand Sharma', month: 'February', year: '2026', basicPay: 45000, allowances: 8000, deductions: 3000, status: 'Pending' }
            ];
            saveSalaries(sample);
        }
    }

    // ============================================================
    // Event Bindings
    // ============================================================
    function init() {
        initSampleData();
        filterSalaries();

        searchInput.addEventListener('input', filterSalaries);
        monthFilter.addEventListener('change', filterSalaries);
        yearFilter.addEventListener('change', filterSalaries);
        statusFilter.addEventListener('change', filterSalaries);
        resetFiltersBtn.addEventListener('click', resetFilters);

        addSalaryBtn.addEventListener('click', function() {
            modalTitle.textContent = 'Add Salary Record';
            salaryId.value = '';
            salaryForm.reset();
            // Set current month/year as defaults
            const now = new Date();
            salaryMonth.value = now.toLocaleString('default', { month: 'long' });
            salaryYear.value = now.getFullYear().toString();
            allowances.value = 0;
            deductions.value = 0;
            openModal();
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        salaryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSalaryFromForm();
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
