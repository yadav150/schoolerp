/**
 * DASHBOARD MODULE – Real-time Dashboard with Firebase
 * External JavaScript file for dashboard.html
 */

import {
    auth, database, ref, onValue, get, query, orderByChild, limitToLast,
    onAuthStateChanged, signOut
} from './firebase.js';

// ---------- Authentication Check ----------
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Not logged in, redirect to login
        window.location.href = 'login.html';
        return;
    }
    // User is logged in, load dashboard data
    loadDashboardData();
});

// ---------- Logout ----------
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        showToast('Logout failed: ' + error.message, 'error');
    }
});

// ---------- Load Dashboard Data ----------
async function loadDashboardData() {
    try {
        // Load total students
        const studentsRef = ref(database, 'students');
        const studentsSnapshot = await get(studentsRef);
        const studentsData = studentsSnapshot.val();
        const totalStudents = studentsData ? Object.keys(studentsData).length : 0;
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('studentChange').textContent = totalStudents > 0 ? 'Active' : 'No students yet';

        // Load total teachers (placeholder)
        document.getElementById('totalTeachers').textContent = '0';
        document.getElementById('teacherChange').textContent = 'Setup needed';

        // Load attendance (placeholder)
        document.getElementById('attendancePercent').textContent = '0%';
        document.getElementById('attendanceChange').textContent = 'No data';

        // Load fee summary (placeholder)
        document.getElementById('feeCollected').textContent = '$0';
        document.getElementById('feeChange').textContent = 'No data';

        // Load recent admissions (latest 4)
        const admissionsRef = query(ref(database, 'admissions'), orderByChild('timestamp'), limitToLast(4));
        const admissionsSnapshot = await get(admissionsRef);
        const admissionsData = admissionsSnapshot.val();
        const admissionsList = admissionsData ? Object.values(admissionsData).reverse() : [];
        updateRecentAdmissions(admissionsList);

        // Load recent activities (combine admissions)
        const activities = admissionsList.map(adm => ({
            text: `New student <strong>${adm.studentName || 'Unknown'}</strong> admitted to ${adm.class || 'N/A'}`,
            time: adm.timestamp ? timeAgo(adm.timestamp) : 'Just now',
            color: 'blue'
        }));
        if (activities.length === 0) {
            activities.push({
                text: 'No recent activity',
                time: 'Waiting for data',
                color: 'gray'
            });
        }
        updateActivityFeed(activities);

        // Update stats cards with counts from admissions? Not needed, we already have total students.

        // Update fee summary (placeholder)
        document.getElementById('totalCollected').textContent = '$0';
        document.getElementById('pendingFees').textContent = '$0';
        document.getElementById('overdueFees').textContent = '$0';
        document.getElementById('feeProgressBar').style.width = '0%';
        document.getElementById('feeProgressLabel').textContent = '0% Collected';

        // Update chart bars (dummy)
        updateChartBars();

        // Show success toast
        showToast('Dashboard data loaded', 'success');

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
}

// ---------- Update Recent Admissions Table ----------
function updateRecentAdmissions(admissions) {
    const tbody = document.getElementById('recentAdmissionsBody');
    if (!admissions || admissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">No recent admissions</td></tr>`;
        return;
    }
    let html = '';
    admissions.forEach(adm => {
        const statusBadge = adm.status === 'approved' ? 'success' : adm.status === 'pending' ? 'warning' : 'danger';
        const statusText = adm.status ? adm.status.charAt(0).toUpperCase() + adm.status.slice(1) : 'Pending';
        const date = adm.timestamp ? new Date(adm.timestamp).toISOString().slice(0,10) : 'N/A';
        html += `
            <tr>
                <td><span class="table-avatar">${getInitials(adm.studentName)}</span> ${adm.studentName || 'Unknown'}</td>
                <td>${adm.class || 'N/A'}</td>
                <td>${date}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ---------- Update Activity Feed ----------
function updateActivityFeed(activities) {
    const list = document.getElementById('activityList');
    if (!activities || activities.length === 0) {
        list.innerHTML = `<li class="activity-item"><span class="activity-dot blue"></span><div class="activity-content"><p class="activity-text">No recent activity</p><span class="activity-time">Just now</span></div></li>`;
        return;
    }
    let html = '';
    activities.forEach(act => {
        const color = act.color || 'blue';
        html += `
            <li class="activity-item">
                <span class="activity-dot ${color}"></span>
                <div class="activity-content">
                    <p class="activity-text">${act.text}</p>
                    <span class="activity-time">${act.time}</span>
                </div>
            </li>
        `;
    });
    list.innerHTML = html;
}

// ---------- Helper: Get Initials ----------
function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

// ---------- Helper: Time Ago ----------
function timeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(timestamp).toLocaleDateString();
}

// ---------- Update Chart Bars (dummy) ----------
function updateChartBars() {
    const bars = document.querySelectorAll('.chart-bar');
    const heights = [65, 78, 55, 92, 70, 60, 45]; // dummy data
    bars.forEach((bar, index) => {
        if (index < heights.length) {
            bar.style.height = heights[index] + '%';
        }
    });
}

// ---------- Refresh data on period change (optional) ----------
document.getElementById('attendancePeriod')?.addEventListener('change', () => {
    // reload chart with different data? We'll keep dummy for now.
    updateChartBars();
});

console.log('Dashboard module loaded.');
