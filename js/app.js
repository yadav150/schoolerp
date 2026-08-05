/**
 * Universal JavaScript – shared across all pages
 * Handles sidebar toggle, search, and other global interactions
 */

document.addEventListener('DOMContentLoaded', function() {

    // ============================================================
    // SIDEBAR TOGGLE (mobile)
    // ============================================================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });

        // Close sidebar on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }

    // ============================================================
    // HEADER SEARCH (global placeholder)
    // ============================================================
    const searchInputs = document.querySelectorAll('.header-search .search-input');
    searchInputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    // Future: trigger global search
                    console.log('Search:', query);
                    // Show toast or navigate
                }
            }
        });
    });

    // ============================================================
    // NOTIFICATION / MESSAGE BUTTONS (placeholders)
    // ============================================================
    document.querySelectorAll('.header-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const badge = this.querySelector('.badge');
            if (badge) {
                // Future: open notification panel
                console.log('Button clicked:', this);
            }
        });
    });

    // ============================================================
    // PROFILE DROPDOWN (placeholder)
    // ============================================================
    const profile = document.querySelector('.header-profile');
    if (profile) {
        profile.addEventListener('click', function() {
            // Future: open user menu
            console.log('Profile clicked');
        });
    }

    // ============================================================
    // TOAST UTILITY (available globally)
    // ============================================================
    window.showToast = function(message, type = 'info') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;

        const colors = {
            info: '#1a237e',
            success: '#2e7d32',
            warning: '#b45a1c',
            error: '#c62828'
        };

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: colors[type] || colors.info,
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: '9999',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'all 0.3s ease',
            maxWidth: '400px'
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
    };

});
