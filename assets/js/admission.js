/**
 * ADMISSION – Page-specific JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
    // Handle form submission
    const form = document.getElementById('admissionForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            // In Phase 2, you would send data to Firebase.
            // For now, show a toast and close modal.
            showToast('Admission submitted successfully!', 'success');
            closeModal('admissionModal');
            form.reset();
        });
    }

    // You can add more admission-specific logic here, e.g., table sorting, filtering.
});
