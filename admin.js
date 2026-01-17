// ADMIN DASHBOARD LOGIC

// FIREBASE INIT
let db;
try {
    firebase.initializeApp(window.firebaseConfig);
    db = firebase.database();
} catch (e) {
    console.error("Firebase Init Error:", e);
    alert("Error connecting to cloud. Check config.");
}

// State
let channels = [];
let pendingChannels = [];       // Object or Array
let reports = [];               // Object or Array
let verifyRequests = [];        // Object or Array
let config = {
    announcement: '',
    blacklist: []
};

// DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const pendingContainer = document.getElementById('pending-container');
const activeList = document.getElementById('active-list');
const reportsContainer = document.getElementById('reports-container');
const verifyContainer = document.getElementById('verify-container');

// Init
function init() {
    checkSession();
}

function checkSession() {
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        showDashboard();
    }
}

async function loadData() {
    // Fetch EVERYTHING from Firebase
    try {
        const snapshot = await db.ref('/').once('value');
        const data = snapshot.val() || {};

        channels = data.channels || [];

        // Convert Objects to Arrays (Firebase returns Objects for lists usually)
        pendingChannels = data.pending ? Object.keys(data.pending).map(key => ({ ...data.pending[key], firebaseKey: key })) : [];
        reports = data.reports ? Object.keys(data.reports).map(key => ({ ...data.reports[key], firebaseKey: key })) : [];
        verifyRequests = data.verification_requests ? Object.keys(data.verification_requests).map(key => ({ ...data.verification_requests[key], firebaseKey: key })) : [];

        config = data.config || { announcement: '', blacklist: [] };

        // Populate Config UI
        document.getElementById('announcement-input').value = config.announcement || '';
        document.getElementById('blacklist-input').value = (config.blacklist || []).join(', ');

        updateStats();
        renderPending();
        renderActiveChannels();
        renderReports();
        renderVerification();
        renderChart();

    } catch (e) {
        console.error(e);
        alert("Failed to load data from Cloud.");
    }
}


// LOGIN FLOW
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-password').value;
    if (pass === 'admin123') { // Simple gate
        sessionStorage.setItem('admin_logged_in', 'true');
        showDashboard();
    } else {
        alert('Invalid Password');
    }
});

function logout() {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
}

function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadData(); // Load on dashboard show
    switchView('overview');
}

// NAVIGATION
window.switchView = function (viewId) {
    ['overview', 'submissions', 'active-channels', 'reports', 'verification', 'tools'].forEach(id => {
        const el = document.getElementById(`view-${id}`);
        if (el) el.style.display = 'none';
        // highlight nav
    });
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.style.display = 'block';
}

// STATS
function updateStats() {
    document.getElementById('stat-active').textContent = channels.length;
    document.getElementById('stat-pending').textContent = pendingChannels.length;
    document.getElementById('stat-reports').textContent = reports.length;

    const badge = document.getElementById('pending-badge');
    badge.textContent = pendingChannels.length;
    badge.style.display = pendingChannels.length > 0 ? 'inline-block' : 'none';

    const repBadge = document.getElementById('report-badge');
    if (repBadge) {
        repBadge.textContent = reports.length;
        repBadge.style.display = reports.length > 0 ? 'inline-block' : 'none';
    }
}

// Simulated Live User Tracking (to match main site)
setInterval(() => {
    const count = Math.floor(Math.random() * (80 - 30 + 1)) + 30;
    const el = document.getElementById('stat-live');
    if (el) el.textContent = count;
}, 5000);


// CHART
function renderChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    const catCounts = {};
    channels.forEach(c => {
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(catCounts),
            datasets: [{
                label: 'Channels',
                data: Object.values(catCounts),
                backgroundColor: 'rgba(37, 211, 102, 0.5)',
                borderColor: 'rgba(37, 211, 102, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#94a3b8' }, beginAtZero: true },
                x: { ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// PENDING APPROVALS
function renderPending() {
    pendingContainer.innerHTML = '';
    if (pendingChannels.length === 0) {
        pendingContainer.innerHTML = '<p style="color: var(--text-secondary)">No pending items.</p>';
        return;
    }

    pendingChannels.forEach(item => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        // Use firebaseKey for operations
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem; flex:1">
                <input type="checkbox" class="pending-check" value="${item.firebaseKey}">
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <br>
                    <a href="${item.link}" target="_blank" style="color:var(--accent-blue); font-size:0.85rem; display:block; margin:2px 0;">${escapeHtml(item.link)}</a>
                    <small style="color: var(--text-secondary)">${item.platform}</small>
                    <div style="margin-top:0.5rem">
                         <input type="text" id="logo-input-${item.firebaseKey}" placeholder="Optional: Custom Logo URL" 
                         style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid #444; background:#222; color:white; font-size:0.8rem;">
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem">
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" onclick="approve('${item.firebaseKey}')">Approve</button>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; background: var(--danger)" onclick="reject('${item.firebaseKey}')">Reject</button>
            </div>
        `;
        pendingContainer.appendChild(div);
    });
}

// MASS ACTIONS
window.toggleSelectAllPending = function (source) {
    const checkboxes = document.querySelectorAll('.pending-check');
    checkboxes.forEach(c => c.checked = source.checked);
}

window.massApprove = async function () {
    const checks = document.querySelectorAll('.pending-check:checked');
    if (checks.length === 0) return alert('Select items first');

    for (const c of checks) {
        await approve(c.value); // Sequential wait
    }
    alert(`Approved ${checks.length} items`);
}

window.massReject = async function () {
    const checks = document.querySelectorAll('.pending-check:checked');
    if (checks.length === 0) return alert('Select items first');

    if (!confirm('Reject logic cannot be undone. Confirm?')) return;

    for (const c of checks) {
        await reject(c.value);
    }
    alert(`Rejected ${checks.length} items`);
}


// ACTIVE CHANNELS & EDIT
function renderActiveChannels() {
    activeList.innerHTML = '';
    const term = document.getElementById('admin-search').value.toLowerCase();

    // Ensure channels is array
    if (!Array.isArray(channels)) {
        channels = channels ? Object.values(channels) : [];
    }

    const filtered = channels.filter(c => c.name.toLowerCase().includes(term));

    filtered.slice(0, 50).forEach(c => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div>
                <strong>${escapeHtml(c.name)}</strong> ${c.isFeatured ? '⭐' : ''}
                <br>
                <small>${c.category} • ${c.id}</small>
            </div>
            <div>
                <button class="btn-primary" style="padding:0.4rem" onclick="openEdit('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-primary" style="padding:0.4rem; background:var(--danger)" onclick="deleteActive('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        activeList.appendChild(div);
    });
}

window.openEdit = function (id) {
    const c = channels.find(x => x.id === id);
    if (!c) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = c.name;
    document.getElementById('edit-desc').value = c.description;
    document.getElementById('edit-featured').value = c.isFeatured ? "true" : "false";

    openModal('edit-modal');
}

document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const c = channels.find(x => x.id === id);
    if (c) {
        // Find index to update
        const idx = channels.findIndex(x => x.id === id);

        c.name = document.getElementById('edit-name').value;
        c.description = document.getElementById('edit-desc').value;
        c.isFeatured = document.getElementById('edit-featured').value === 'true';

        if (idx > -1) channels[idx] = c;

        // Save WHOLE channels array to Firebase
        // NOTE: In production, we should patch only the specific index, but Set(channels) works for MVP
        await db.ref('channels').set(channels);

        closeModal('edit-modal');
        renderActiveChannels();
        alert('Updated channel!');
    }
});

window.deleteActive = async function (id) {
    if (confirm('Delete live channel?')) {
        channels = channels.filter(c => c.id !== id);
        await db.ref('channels').set(channels);
        renderActiveChannels();
    }
}


// REPORTS & VERIFICATION
function renderReports() {
    reportsContainer.innerHTML = '';
    if (reports.length === 0) return reportsContainer.innerHTML = '<p style="color:var(--text-secondary)">No reports.</p>';

    reports.forEach(r => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div>
                <strong>From User</strong>: Report on channel ID ${r.channelId}
                <br><span style="color:var(--danger)">${r.reason}</span>
            </div>
            <button class="btn-primary" onclick="dismissReport('${r.firebaseKey}')">Dismiss</button>
        `;
        reportsContainer.appendChild(div);
    });
}

window.dismissReport = async function (key) {
    await db.ref(`reports/${key}`).remove();
    loadData(); // refresh
}

function renderVerification() {
    verifyContainer.innerHTML = '';
    if (verifyRequests.length === 0) return verifyContainer.innerHTML = '<p style="color:var(--text-secondary)">No requests.</p>';

    verifyRequests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div>
                <strong>${escapeHtml(req.name)}</strong>
                <br><a href="${req.proof}" target="_blank">View Proof</a>
            </div>
             <div style="display: flex; gap: 0.5rem">
                <button class="btn-primary" onclick="verifyChannel('${req.name}', '${req.firebaseKey}')">Verify</button>
                <button class="btn-primary" style="background:var(--danger)" onclick="rejectVerify('${req.firebaseKey}')">Reject</button>
            </div>
        `;
        verifyContainer.appendChild(div);
    });
}

window.verifyChannel = async function (name, key) {
    const c = channels.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (c) {
        c.verified = true;

        // Update Channels
        await db.ref('channels').set(channels);

        // Delete Request
        await db.ref(`verification_requests/${key}`).remove();

        loadData();
        alert('Verified!');
    } else {
        alert('Channel not found by name.');
    }
}

window.rejectVerify = async function (key) {
    await db.ref(`verification_requests/${key}`).remove();
    loadData();
}


// TOOLS: CONFIG & DATA
window.saveAnnouncement = async function () {
    config.announcement = document.getElementById('announcement-input').value;
    await db.ref('config').set(config);
    alert('Announcement Banner updated on Cloud.');
}

window.saveBlacklist = async function () {
    const txt = document.getElementById('blacklist-input').value;
    config.blacklist = txt.split(',').map(s => s.trim()).filter(s => s);
    await db.ref('config').set(config);
    alert('Blacklist saved to Cloud.');
}

// APPROVAL
window.approve = async function (key) {
    const item = pendingChannels.find(p => p.firebaseKey === key);
    if (!item) return;

    // Check custom logo override
    const customLogoInput = document.getElementById(`logo-input-${key}`);
    const customLogo = customLogoInput ? customLogoInput.value.trim() : '';
    if (customLogo) {
        item.logo = customLogo;
    }

    // Clean up firebaseKey before saving to channels array
    const cleanItem = { ...item };
    delete cleanItem.firebaseKey;

    channels.unshift(cleanItem);

    // 1. Update Channels
    await db.ref('channels').set(channels);

    // 2. Remove from Pending
    await db.ref(`pending/${key}`).remove();

    loadData(); // Re-render
}

window.reject = async function (key) {
    await db.ref(`pending/${key}`).remove();
    loadData();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Data IO - Export now downloads from Memory (which is synced from Cloud)
window.exportData = function () {
    const data = { channels, config, reports, verifyRequests };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channelHub_backup_${Date.now()}.json`;
    a.click();
}

window.importData = function (input) {
    // Import logic could overwrite Firebase. dangerous but allowed for admin
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const d = JSON.parse(e.target.result);
            await db.ref('/').set(d); // DANGEROUS: Overwrites entire DB
            alert("Database Overwritten from Backup!");
            loadData();
        } catch (err) {
            alert("Invalid JSON");
        }
    };
    reader.readAsText(file);
}

window.clearAllData = async function () {
    if (confirm("NUKE THE DATABASE? This cannot be undone.")) {
        await db.ref('/').remove();
        alert("Database Cleared.");
        location.reload();
    }
}

init();
