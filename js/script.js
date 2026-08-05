/**
 * Universal scripts for EduERP
 * - Sidebar toggle (mobile)
 * - Toast notification system
 * - Confirm modal
 * - Global utility functions
 */
(function() {
    // Sidebar mobile toggle
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Toast system
    const toastContainer = document.getElementById('toastContainer');

    window.showToast = function(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠'
        };
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // Confirm modal
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');

    let confirmCallback = null;

    window.showConfirm = function(title, message, callback) {
        if (!confirmModal || !confirmTitle || !confirmMessage) {
            // Fallback
            if (confirm(message)) callback();
            return;
        }
        confirmTitle.textContent = title || 'Are you sure?';
        confirmMessage.textContent = message || 'This action cannot be undone.';
        confirmCallback = callback;
        confirmModal.classList.add('active');
    };

    if (confirmCancel && confirmModal) {
        confirmCancel.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            confirmCallback = null;
        });
    }
    if (confirmOk && confirmModal) {
        confirmOk.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
            confirmCallback = null;
        });
    }
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
                confirmCallback = null;
            }
        });
    }

    // Set header date
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        const now = new Date();
        headerDate.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Handle navigation active state based on current URL (optional)
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPath)) {
            item.classList.add('active');
        } else if (currentPath === '' && href === 'index.html') {
            item.classList.add('active');
        }
    });

})();
