/**
 * Universal scripts for EduERP
 * – Sidebar toggle (mobile)
 * – Toast notification system
 * – Confirm modal
 * – Header date
 * – Active navigation detection
 * No module-specific logic; avoid collisions with module scripts.
 */
(function() {
    'use strict';

    // ===== Mobile Sidebar Toggle =====
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // ===== Toast Notification System =====
    const toastContainer = document.getElementById('toastContainer');
    window.showToast = function(message, type = 'success') {
        if (!toastContainer) return;
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // ===== Global Confirm Modal =====
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');
    let confirmCallback = null;

    window.showConfirm = function(title, message, callback) {
        if (!confirmModal || !confirmTitle || !confirmMessage) {
            // Fallback for missing modal
            if (confirm(message)) callback();
            return;
        }
        confirmTitle.textContent = title || 'Are you sure?';
        confirmMessage.textContent = message || 'This action cannot be undone.';
        confirmCallback = callback;
        confirmModal.classList.add('active');
    };

    function closeConfirm() {
        confirmModal.classList.remove('active');
        confirmCallback = null;
    }

    if (confirmCancel) confirmCancel.addEventListener('click', closeConfirm);
    if (confirmOk) confirmOk.addEventListener('click', () => {
        closeConfirm();
        if (typeof confirmCallback === 'function') confirmCallback();
    });
    if (confirmModal) confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirm();
    });

    // ===== Header Date =====
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        const now = new Date();
        headerDate.textContent = now.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // ===== Active Navigation State =====
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href) {
            const hrefFile = href.split('/').pop();
            if (currentPath === '' && hrefFile === 'index.html') {
                item.classList.add('active');
            } else if (hrefFile === currentPath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });

})();
