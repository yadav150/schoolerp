/**
 * SCHOOL ERP – Universal JavaScript
 * Version 1.0.0
 */

document.addEventListener('DOMContentLoaded', function () {
    // ---------- Sidebar Toggle ----------
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 1024 && sidebar && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // ---------- Active Navigation ----------
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.closest('.nav-item')?.classList.add('active');
        } else if (currentPage === 'dashboard.html' && href && href.includes('dashboard')) {
            link.closest('.nav-item')?.classList.add('active');
        }
    });

    // ---------- Modal Helpers ----------
    window.openModal = function (modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) overlay.classList.add('active');
    };

    window.closeModal = function (modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) overlay.classList.remove('active');
    };

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    // ---------- Toast Notification ----------
    window.showToast = function (message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        document.body.appendChild(container);
        // Add toast styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                padding: 12px 20px;
                border-radius: 5px;
                background: #1F2937;
                color: white;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateX(120%);
                transition: transform 0.3s ease;
                min-width: 200px;
                max-width: 400px;
            }
            .toast.show {
                transform: translateX(0);
            }
            .toast-success { background: #10B981; }
            .toast-error { background: #EF4444; }
            .toast-warning { background: #F59E0B; }
            .toast-info { background: #3B82F6; }
        `;
        document.head.appendChild(style);
        return container;
    }

    // ---------- Ripple Effect (optional) ----------
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                width: ${size}px;
                height: ${size}px;
                left: ${e.clientX - rect.left - size/2}px;
                top: ${e.clientY - rect.top - size/2}px;
                transform: scale(0);
                animation: rippleAnim 0.6s ease-out;
                pointer-events: none;
            `;
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    });

    // Add keyframes for ripple if not present
    if (!document.querySelector('#rippleStyle')) {
        const style = document.createElement('style');
        style.id = 'rippleStyle';
        style.textContent = `
            @keyframes rippleAnim {
                to { transform: scale(4); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
});
