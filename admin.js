// ADMIN DASHBOARD LOGIC

// State
let channels = [];
let pendingChannels = [];
let bookmarks = [];
let reports = [];
let verifyRequests = [];
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
    loadData();
    updateStats();
    checkSession();
}

function checkSession() {
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        showDashboard();
    }
}

function loadData() {
    const d = localStorage.getItem('channelHub_data');
    if (d) channels = JSON.parse(d);

    const p = localStorage.getItem('channelHub_pending');
    if (p) pendingChannels = JSON.parse(p);

    // Safety & Config
    const reps = localStorage.getItem('channelHub_reports');
    if (reps) reports = JSON.parse(reps);

    const vers = localStorage.getItem('channelHub_verify_requests');
    if (vers) verifyRequests = JSON.parse(vers);

    const conf = localStorage.getItem('channelHub_config');
    if (conf) config = JSON.parse(conf);

    // Populate Config UI
    document.getElementById('announcement-input').value = config.announcement || '';
    document.getElementById('blacklist-input').value = (config.blacklist || []).join(', ');
}

function saveData() {
    localStorage.setItem('channelHub_data', JSON.stringify(channels));
    localStorage.setItem('channelHub_pending', JSON.stringify(pendingChannels));
    localStorage.setItem('channelHub_reports', JSON.stringify(reports));
    localStorage.setItem('channelHub_verify_requests', JSON.stringify(verifyRequests));
    localStorage.setItem('channelHub_config', JSON.stringify(config));

    updateStats();
    renderPending();
    renderActiveChannels();
    renderReports();
    renderVerification();
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
    renderPending();
    renderActiveChannels();
    renderReports();
    renderVerification();
    renderChart();
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
        // ID for checkboxes
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem; flex:1">
                <input type="checkbox" class="pending-check" value="${item.id}">
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <br>
                    <small style="color: var(--text-secondary)">${item.platform}</small>
                    <div style="margin-top:0.5rem">
                         <input type="text" id="logo-input-${item.id}" placeholder="Optional: Custom Logo URL" 
                         style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid #444; background:#222; color:white; font-size:0.8rem;">
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem">
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;" onclick="approve('${item.id}')">Approve</button>
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; background: var(--danger)" onclick="reject('${item.id}')">Reject</button>
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

window.massApprove = function () {
    const checks = document.querySelectorAll('.pending-check:checked');
    if (checks.length === 0) return alert('Select items first');

    checks.forEach(c => {
        const id = c.value;
        const idx = pendingChannels.findIndex(x => x.id === id);
        if (idx > -1) {
            channels.unshift(pendingChannels[idx]);
            pendingChannels.splice(idx, 1);
        }
    });
    saveData();
    alert(`Approved ${checks.length} items`);
}

window.massReject = function () {
    const checks = document.querySelectorAll('.pending-check:checked');
    if (checks.length === 0) return alert('Select items first');

    if (!confirm('Reject logic cannot be undone. Confirm?')) return;

    checks.forEach(c => {
        const id = c.value;
        const idx = pendingChannels.findIndex(x => x.id === id);
        if (idx > -1) pendingChannels.splice(idx, 1);
    });
    saveData();
    alert(`Rejected ${checks.length} items`);
}


// ACTIVE CHANNELS & EDIT
function renderActiveChannels() {
    activeList.innerHTML = '';
    const term = document.getElementById('admin-search').value.toLowerCase();

    const filtered = channels.filter(c => c.name.toLowerCase().includes(term));

    filtered.slice(0, 50).forEach(c => { // Limit render for perf
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

document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const c = channels.find(x => x.id === id);
    if (c) {
        c.name = document.getElementById('edit-name').value;
        c.description = document.getElementById('edit-desc').value;
        c.isFeatured = document.getElementById('edit-featured').value === 'true';
        saveData();
        closeModal('edit-modal');
        renderActiveChannels();
    }
});

window.deleteActive = function (id) {
    if (confirm('Delete live channel?')) {
        channels = channels.filter(c => c.id !== id);
        saveData();
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
            <button class="btn-primary" onclick="dismissReport('${r.id}')">Dismiss</button>
        `;
        reportsContainer.appendChild(div);
    });
}

window.dismissReport = function (id) {
    reports = reports.filter(r => r.id !== id);
    saveData();
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
                <button class="btn-primary" onclick="verifyChannel('${req.name}', '${req.id}')">Verify</button>
                <button class="btn-primary" style="background:var(--danger)" onclick="rejectVerify('${req.id}')">Reject</button>
            </div>
        `;
        verifyContainer.appendChild(div);
    });
}

window.verifyChannel = function (name, id) {
    const c = channels.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (c) {
        c.verified = true;
        rejectVerify(id); // remove req
        alert('Verified!');
    } else {
        alert('Channel not found by name.');
    }
}

window.rejectVerify = function (id) {
    verifyRequests = verifyRequests.filter(r => r.id !== id);
    saveData();
}


// TOOLS: CONFIG & DATA
window.saveAnnouncement = function () {
    config.announcement = document.getElementById('announcement-input').value;
    saveData();
    alert('Announcement Banner updated on main site.');
}

window.saveBlacklist = function () {
    const txt = document.getElementById('blacklist-input').value;
    config.blacklist = txt.split(',').map(s => s.trim()).filter(s => s);
    saveData();
    alert('Blacklist saved.');
}

window.approve = function (id) {
    const idx = pendingChannels.findIndex(x => x.id === id);
    if (idx > -1) {
        const item = pendingChannels[idx];
        // Check for custom logo override
        const customLogo = document.getElementById(`logo-input-${id}`).value.trim();
        if (customLogo) {
            item.logo = customLogo;
        }

        channels.unshift(item);
        pendingChannels.splice(idx, 1);
        saveData();
    }
}

window.reject = function (id) {
    const idx = pendingChannels.findIndex(x => x.id === id);
    if (idx > -1) {
        pendingChannels.splice(idx, 1);
        saveData();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Data IO (Same as before)
window.clearAllData = function () { localStorage.clear(); location.reload(); }

init();
