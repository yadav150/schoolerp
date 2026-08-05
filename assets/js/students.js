/**
 * STUDENTS – Page-specific JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
    // Handle form submission (Add/Edit)
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            // In Phase 2, you would send data to Firebase.
            // For now, show a success toast and close modal.
            showToast('Student saved successfully!', 'success');
            closeModal('studentModal');
            form.reset();
        });
    }

    // Optional: Set modal title dynamically if editing
    // For demo, we keep it static. You can add logic to detect edit mode.
});
