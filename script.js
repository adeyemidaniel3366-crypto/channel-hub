// DOM Elements
const grid = document.getElementById('channel-grid');
const trendingGrid = document.getElementById('trending-grid');
const searchInput = document.getElementById('search-input');
const platformFilter = document.getElementById('platform-filter');
const categoryFilter = document.getElementById('category-filter');
const langFilter = document.getElementById('lang-filter');
const countryFilter = document.getElementById('country-filter');
const themeToggle = document.getElementById('theme-toggle');
const randomBtn = document.getElementById('random-btn');

// Stats Elements
const totalCount = document.getElementById('total-count');
const waCount = document.getElementById('wa-count');
const tgCount = document.getElementById('tg-count');
const savedBadge = document.getElementById('saved-badge');

// State
let channels = []; // Active channels
let bookmarks = []; // IDs of saved channels
let comments = {}; // Map channelId -> array of objects {text, time, deviceId}
let ratings = {}; // Map channelId -> array of numbers
let likes = {}; // Map channelId -> number (Count)
let userLikes = []; // Array of channelIds this user has liked
let collections = []; // Array of objects { id, name, channelIds }
let currentTab = 'browse'; // 'browse', 'saved', 'collections'
let currentRating = 0; // For comment modal

// Device ID Logic
function getDeviceId() {
    let id = localStorage.getItem('channelHub_deviceId');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('channelHub_deviceId', id);
    }
    return id;
}

// Live Tracking Simulation
setInterval(() => {
    // Random user count between 30 and 80
    const count = Math.floor(Math.random() * (80 - 30 + 1)) + 30;
    const el = document.getElementById('live-users-count');
    if (el) el.textContent = count;
}, 5000);

// --- INIT & DATA IO ---

function init() {
    loadData();
    populateDropdowns();
    applyTheme();
    renderMain();
    renderTrending();
    updateStats();
    setupEventListeners();

    // Check for shared collection hash
    if (location.hash.startsWith('#collection=')) {
        loadSharedCollection(location.hash.substring(12));
    }

    // Check Config for Banner
    const conf = localStorage.getItem('channelHub_config');
    if (conf) {
        try {
            const c = JSON.parse(conf);
            if (c.announcement) {
                const b = document.getElementById('announcement-banner');
                if (b) {
                    b.innerHTML = escapeHtml(c.announcement);
                    b.style.display = 'block';
                }
            }
        } catch (e) { }
    }
}

function loadData() {
    // Active Channels
    const stored = localStorage.getItem('channelHub_data');
    if (stored) channels = JSON.parse(stored);
    else channels = window.INITIAL_DATA || [];

    // Bookmarks
    const storedBookmarks = localStorage.getItem('channelHub_bookmarks');
    if (storedBookmarks) bookmarks = JSON.parse(storedBookmarks);

    // Comments
    const storedComments = localStorage.getItem('channelHub_comments');
    if (storedComments) comments = JSON.parse(storedComments);

    // Ratings
    const storedRatings = localStorage.getItem('channelHub_ratings');
    if (storedRatings) ratings = JSON.parse(storedRatings);

    // Likes
    const storedLikes = localStorage.getItem('channelHub_likes');
    if (storedLikes) likes = JSON.parse(storedLikes);
    const storedUserLikes = localStorage.getItem('channelHub_user_likes');
    if (storedUserLikes) userLikes = JSON.parse(storedUserLikes);

    // Collections
    const storedCol = localStorage.getItem('channelHub_collections');
    if (storedCol) collections = JSON.parse(storedCol);
}

function saveData() {
    localStorage.setItem('channelHub_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('channelHub_comments', JSON.stringify(comments));
    localStorage.setItem('channelHub_ratings', JSON.stringify(ratings));
    localStorage.setItem('channelHub_likes', JSON.stringify(likes));
    localStorage.setItem('channelHub_user_likes', JSON.stringify(userLikes));
    localStorage.setItem('channelHub_collections', JSON.stringify(collections));
    updateStats();
}

function populateDropdowns() {
    // Populate Categories
    const formCategory = document.getElementById('f-category');
    categoryFilter.innerHTML = '<option value="all">Categories</option>';
    formCategory.innerHTML = '';

    CATEGORIES.forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        formCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // Populate Languages
    const formLang = document.getElementById('f-lang');
    langFilter.innerHTML = '<option value="all">Languages</option>';
    formLang.innerHTML = '';

    LANGUAGES.forEach(lang => {
        langFilter.innerHTML += `<option value="${lang}">${lang}</option>`;
        formLang.innerHTML += `<option value="${lang}">${lang}</option>`;
    });

    // Populate Countries
    const formCountry = document.getElementById('f-country');
    countryFilter.innerHTML = '<option value="all">Countries</option>';
    formCountry.innerHTML = '';

    COUNTRIES.forEach(c => {
        countryFilter.innerHTML += `<option value="${c}">${c}</option>`;
        formCountry.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Populate Platforms (Main Filter form handled in HTML dynamic now)
    const select = document.getElementById('platform-filter');
    select.innerHTML = '<option value="all">All Platforms</option>';
    PLATFORMS.forEach(p => {
        select.innerHTML += `<option value="${p}">${p}</option>`;
    });

    const formPlat = document.getElementById('f-platform');
    formPlat.innerHTML = '';
    PLATFORMS.forEach(p => {
        formPlat.innerHTML += `<option value="${p}">${p}</option>`;
    });
}

// --- LOGIC ---

// Enhanced Auto-Logo V2: Google Favicon + Gradient Fallback
function generateAutoLogo(link, name) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    const color = colors[name.length % colors.length];
    const initial = name ? name[0].toUpperCase() : '?';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${color}" />
        <text x="50" y="65" font-family="Arial" font-weight="bold" font-size="50" fill="white" text-anchor="middle">${initial}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Helper to get fallback Favicon if needed
function getFaviconUrl(link) {
    try {
        const domain = new URL(link).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
        return null;
    }
}


function renderMain() {
    // Handle Collections Tab
    if (currentTab === 'collections') {
        document.getElementById('channel-grid').style.display = 'none';
        document.getElementById('browse-controls').style.display = 'none';
        document.querySelector('.trending-section').style.display = 'none';
        document.getElementById('collections-view').style.display = 'block';
        renderCollections();
        return;
    }

    // Normal Browsing
    document.getElementById('channel-grid').style.display = 'grid';
    document.getElementById('browse-controls').style.display = 'block';

    // logic for trending vs featured toggle could be added here
    document.querySelector('.trending-section').style.display = 'block';
    document.getElementById('collections-view').style.display = 'none';

    let dataToRender = channels;
    if (currentTab === 'saved') {
        dataToRender = channels.filter(c => bookmarks.includes(c.id));
    }

    // Filters
    const term = searchInput.value.toLowerCase();
    const platform = platformFilter.value;
    const category = categoryFilter.value;
    const lang = langFilter.value;
    const country = countryFilter.value;

    const filtered = dataToRender.filter(channel => {
        const matchesTerm = channel.name.toLowerCase().includes(term) ||
            channel.description.toLowerCase().includes(term);
        const matchesPlatform = platform === 'all' || channel.platform === platform;
        const matchesCategory = category === 'all' || channel.category === category;
        const matchesLang = lang === 'all' || (channel.language || 'English') === lang;
        const matchesCountry = country === 'all' || (channel.country || 'Global') === country;

        return matchesTerm && matchesPlatform && matchesCategory && matchesLang && matchesCountry;
    });

    // Render
    grid.innerHTML = '';
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No channels found matching filters.</div>';
        return;
    }

    // Filtered by Featured first if "Browse" tab?
    if (currentTab === 'browse' && platform === 'all' && category === 'all' && term === '') {
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    filtered.forEach(channel => {
        grid.appendChild(createChannelCard(channel));
    });
}

function renderCollections() {
    const colGrid = document.getElementById('collections-grid');
    colGrid.innerHTML = '';

    if (collections.length === 0) {
        colGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">No collections yet. Create one!</div>';
        return;
    }

    collections.forEach(col => {
        const div = document.createElement('div');
        div.className = 'channel-card';
        div.innerHTML = `
            <h3>${escapeHtml(col.name)}</h3>
            <p style="color:var(--text-secondary)">${col.channelIds.length} Channels</p>
            <div class="card-actions">
                <button class="btn-primary" onclick="viewCollection('${col.id}')">View</button>
                <button class="btn-primary" style="background:var(--secondary-bg)" onclick="shareCollection('${col.id}')"><i class="fa-solid fa-share"></i></button>
                <button class="btn-icon" style="color:var(--danger); border-color:var(--danger)" onclick="deleteCollection('${col.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        colGrid.appendChild(div);
    });
}

function viewCollection(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;

    const names = channels.filter(c => col.channelIds.includes(c.id)).map(c => c.name).join('\n');
    alert(`Collection: ${col.name}\n\n${names}`);
}

function shareCollection(id) {
    const col = collections.find(c => c.id === id);
    const ids = col.channelIds.join(',');
    const url = `${window.location.origin}${window.location.pathname}#collection=${ids}`;
    navigator.clipboard.writeText(url).then(() => alert('Collection link copied! Share it with friends.'));
}

function loadSharedCollection(idsString) {
    const ids = idsString.split(',');
    alert(`Loaded shared collection with ${ids.length} channels! Filtering view...`);
    currentTab = 'browse';
    channels = channels.filter(c => ids.includes(c.id));
    switchTab('browse');
    renderMain();
}

function createChannelCard(channel) {
    const card = document.createElement('div');
    card.className = 'channel-card';
    if (channel.isFeatured) card.classList.add('featured-card');

    const isSaved = bookmarks.includes(channel.id);
    const likeCount = likes[channel.id] || 0;
    const isLiked = userLikes.includes(channel.id);

    let platformClass = 'platform-other';
    if (channel.platform === 'WhatsApp') platformClass = 'platform-whatsapp';
    if (channel.platform === 'Telegram') platformClass = 'platform-telegram';
    if (channel.platform === 'Discord') platformClass = 'platform-discord';

    // Logo Logic: Prioritize Favicon, Fallback to Gradient
    const faviconSrc = getFaviconUrl(channel.link);
    const gradientSrc = generateAutoLogo(channel.link, channel.name);

    let primarySrc = faviconSrc;
    let fallbackSrc = gradientSrc;

    if (channel.logo && !channel.logo.startsWith('data:image/svg+xml')) {
        primarySrc = channel.logo;
    }

    let catClass = '';
    if (channel.category.includes('code') || channel.category.includes('Dev') || channel.category.includes('Tech')) catClass = 'cat-webdev';
    if (channel.category.includes('Design') || channel.category.includes('Art')) catClass = 'cat-design';
    if (channel.category.includes('Crypto') || channel.category.includes('Finance')) catClass = 'cat-crypto';

    const r = ratings[channel.id] || [];
    const avgRating = r.length > 0 ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1) : 'New';

    card.onclick = (e) => {
        if (e.target.closest('.card-actions') || e.target.closest('.btn-join')) return;
        addToRecent(channel.id);
        openInfoModal(channel.id);
    };

    const likeColor = isLiked ? 'color:var(--danger); border-color:var(--danger)' : '';
    const likeIcon = isLiked ? 'fa-solid' : 'fa-regular';

    card.innerHTML = `
        ${channel.isFeatured ? '<div style="position:absolute; top:10px; right:10px; background:var(--gold); color:black; padding:2px 8px; border-radius:10px; font-size:0.7rem; font-weight:bold; z-index:5">FEATURED</div>' : ''}
        <div class="card-header">
            <img src="${primarySrc}" class="channel-logo" alt="${channel.name}" onerror="this.src='${fallbackSrc}'">
            <div class="header-meta">
                <span class="platform-badge ${platformClass}">${channel.platform}</span>
                ${channel.verified ? '<i class="fa-solid fa-circle-check verified-badge" title="Verified"></i>' : ''}
                <div class="rating-display"><i class="fa-solid fa-star"></i> ${avgRating}</div>
                <h3 class="channel-name">${escapeHtml(channel.name)}</h3>
            </div>
        </div>
        
        <span class="channel-category ${catClass}">${channel.category}</span>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem">
            ${channel.language || 'English'} • ${channel.country || 'Global'}
        </div>
        <p class="channel-desc">${escapeHtml(channel.description)}</p>
        
        <div class="card-actions">
            <a href="${channel.link}" target="_blank" class="btn-join">Join</a>
             <button class="btn-icon" onclick="openQR('${channel.link}', '${escapeHtml(channel.name)}')" title="QR Code">
                <i class="fa-solid fa-qrcode"></i>
            </button>
            <button class="btn-icon" style="${likeColor}" onclick="toggleLike('${channel.id}')" title="Like (${likeCount})">
                <i class="${likeIcon} fa-thumbs-up"></i> <span style="font-size:0.75rem; margin-left:2px">${likeCount > 0 ? likeCount : ''}</span>
            </button>
            <button class="btn-icon ${isSaved ? 'active' : ''}" onclick="toggleBookmark('${channel.id}')" title="Save/Add to Collection">
                <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i>
            </button>
             <button class="btn-icon" onclick="openComments('${channel.id}')" title="Comments">
                <i class="fa-regular fa-comment"></i>
            </button>
        </div>
    `;
    return card;
}

function addToRecent(id) {
    let recent = JSON.parse(localStorage.getItem('channelHub_recent') || '[]');
    recent = recent.filter(r => r !== id);
    recent.unshift(id);
    if (recent.length > 5) recent.pop();
    localStorage.setItem('channelHub_recent', JSON.stringify(recent));
}

// --- LIKES LOGIC ---
window.toggleLike = function (id) {
    if (userLikes.includes(id)) {
        // Unlike
        userLikes = userLikes.filter(u => u !== id);
        if (likes[id] && likes[id] > 0) likes[id]--;
    } else {
        // Like
        userLikes.push(id);
        if (!likes[id]) likes[id] = 0;
        likes[id]++;
    }
    saveData(); // Persist
    renderMain(); // Re-render to show new count/icon
}


// --- INFO MODAL ---
window.openInfoModal = function (id) {
    const c = channels.find(ch => ch.id === id);
    if (!c) return;

    const modal = document.getElementById('info-modal');
    const content = document.getElementById('info-content');
    const faviconSrc = getFaviconUrl(c.link);
    const gradientSrc = generateAutoLogo(c.link, c.name);

    let primarySrc = faviconSrc;
    let fallbackSrc = gradientSrc;

    if (c.logo && !c.logo.startsWith('data:image/svg+xml')) {
        primarySrc = c.logo;
    }

    content.innerHTML = `
        <img src="${primarySrc}" class="info-logo-large" onerror="this.src='${fallbackSrc}'">
        <h2 class="info-title">${escapeHtml(c.name)}</h2>
        
        <div class="info-meta-row">
            <span class="platform-badge" style="background:var(--secondary-bg); border:1px solid var(--glass-border)">${c.platform}</span>
            <span class="info-stat">${c.category}</span>
            <span class="info-stat">${c.language || 'English'}</span>
            <span class="info-stat">${c.country || 'Global'}</span>
        </div>
        
        <div class="info-desc-full">
            <strong>About this channel:</strong><br><br>
            ${escapeHtml(c.description)}
        </div>
        
        <a href="${c.link}" target="_blank" class="btn-primary" style="display:block; text-decoration:none; margin-bottom:1rem; font-size:1.1rem;">
            Join Channel <i class="fa-solid fa-arrow-right"></i>
        </a>
        
        <div style="font-size:0.8rem; color:var(--text-secondary)">
            ID: ${c.id} • Added: ${new Date(c.timestamp).toLocaleDateString()}
        </div>
    `;

    modal.classList.add('active');
}


function renderTrending() {
    const trendingGrid = document.getElementById('trending-grid');
    if (!trendingGrid) return;
    trendingGrid.innerHTML = '';

    // Sort by rating + bookmarks + likes
    const sorted = [...channels].sort((a, b) => {
        const scoreA = (bookmarks.includes(a.id) ? 5 : 0) + (likes[a.id] || 0) + (ratings[a.id] ? ratings[a.id].length : 0);
        const scoreB = (bookmarks.includes(b.id) ? 5 : 0) + (likes[b.id] || 0) + (ratings[b.id] ? ratings[b.id].length : 0);
        return scoreB - scoreA;
    }).slice(0, 3);

    if (sorted.length > 0 && (bookmarks.length > 0 || Object.keys(ratings).length > 0 || userLikes.length > 0)) {
        document.querySelector('.trending-section').classList.add('active');
        sorted.forEach(c => trendingGrid.appendChild(createChannelCard(c)));
    }
}

// --- SUBMISSION ---

document.getElementById('submit-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('f-name').value;
    const link = document.getElementById('f-link').value;
    const platform = document.getElementById('f-platform').value;

    // Validation
    const bl = ["scam", "casino", "hack", "porn", "xxx"]; // Basic Blacklist
    if (bl.some(w => name.toLowerCase().includes(w) || link.toLowerCase().includes(w))) {
        return alert("Submission rejected: Blacklisted content detected.");
    }

    if (platform === 'WhatsApp' && !link.includes('whatsapp.com')) return alert('Invalid WhatsApp link');
    if (platform === 'Telegram' && !link.includes('t.me')) return alert('Invalid Telegram link');

    // Auto-Generate Logo Link
    const logo = generateAutoLogo(link, name);

    const newChannel = {
        id: Date.now().toString(),
        name,
        logo, // Auto-Generated
        platform,
        type: document.getElementById('f-type').value,
        category: document.getElementById('f-category').value,
        country: document.getElementById('f-country').value,
        language: document.getElementById('f-lang').value,
        link,
        description: document.getElementById('f-desc').value,
        verified: false,
        isFeatured: false, // Default
        timestamp: Date.now()
    };

    // Save to pending
    const pending = JSON.parse(localStorage.getItem('channelHub_pending') || '[]');
    pending.push(newChannel);
    localStorage.setItem('channelHub_pending', JSON.stringify(pending));

    closeModal('submit-modal');
    document.getElementById('submit-form').reset();
    alert('Submitted! Waiting for admin approval.');
});

// --- COLLECTIONS & BOOKMARKS ---

window.toggleBookmark = function (id) {
    if (bookmarks.includes(id)) {
        bookmarks = bookmarks.filter(b => b !== id);
    } else {
        bookmarks.push(id);
    }
    saveData();
    renderMain();
}

document.getElementById('collection-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('collection-name').value;

    const newCol = {
        id: Date.now().toString(),
        name,
        channelIds: [...bookmarks] // Create from current bookmarks
    };

    collections.push(newCol);
    saveData();
    closeModal('create-collection-modal');
    alert(`Collection "${name}" created with ${bookmarks.length} items!`);
    renderCollections();
});

window.deleteCollection = function (id) {
    if (confirm('Delete collection?')) {
        collections = collections.filter(c => c.id !== id);
        saveData();
        renderCollections();
    }
}


// --- SAFETY (REPORT & VERIFICATION) ---
// Save these to localStorage to be viewed in Admin

window.openReport = function (id) {
    document.getElementById('report-channel-id').value = id;
    openModal('report-modal');
}

document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('report-channel-id').value;
    const reason = document.getElementById('report-reason').value;

    const reports = JSON.parse(localStorage.getItem('channelHub_reports') || '[]');
    reports.push({
        id: Date.now().toString(),
        channelId: id,
        reason,
        timestamp: Date.now()
    });
    localStorage.setItem('channelHub_reports', JSON.stringify(reports));

    closeModal('report-modal');
    alert('Report submitted. Admins will review it.');
});

document.getElementById('verification-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('verify-name').value;
    const proof = document.getElementById('verify-proof').value;

    const reqs = JSON.parse(localStorage.getItem('channelHub_verify_requests') || '[]');
    reqs.push({
        id: Date.now().toString(),
        name,
        proof,
        timestamp: Date.now()
    });
    localStorage.setItem('channelHub_verify_requests', JSON.stringify(reqs));

    closeModal('verification-modal');
    alert('Verification request sent!');
});


// --- UTILS ---

window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
    renderMain();
};

window.copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => alert('Copied!'));
window.openQR = (link, name) => {
    document.getElementById('qrcode').innerHTML = '';
    document.getElementById('qr-modal-link-text').textContent = link;
    new QRCode(document.getElementById('qrcode'), {
        text: link,
        width: 200, height: 200
    });
    openModal('qr-modal');
};

// Ratings/Comments stub reused from before
window.openComments = function (id) {
    window.currentChannelId = id;
    const list = document.getElementById('comments-list');
    list.innerHTML = '';
    const chats = comments[id] || [];
    chats.forEach(c => {
        // Show Device ID
        const author = c.deviceId === getDeviceId() ? 'You' : `User ${c.deviceId.substr(-4)}`;
        list.innerHTML += `
            <div class="comment-item">
                <small style="color:var(--text-secondary); font-size:0.7rem">${author} • ${new Date(c.time).toLocaleDateString()}</small><br>
                ${escapeHtml(c.text)}
            </div>
        `;
    });
    openModal('comments-modal');
}
document.getElementById('comment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = document.getElementById('comment-input').value;
    if (!comments[window.currentChannelId]) comments[window.currentChannelId] = [];

    // Add Device ID
    comments[window.currentChannelId].push({
        text: txt,
        time: Date.now(),
        deviceId: getDeviceId()
    });

    saveData();
    document.getElementById('comment-input').value = '';
    window.openComments(window.currentChannelId);
});

window.escapeHtml = (text) => {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
window.setupEventListeners = () => {
    searchInput.addEventListener('input', renderMain);
    if (platformFilter) platformFilter.addEventListener('change', renderMain); // might be missing if new dropdown used?
    if (categoryFilter) categoryFilter.addEventListener('change', renderMain);
    if (langFilter) langFilter.addEventListener('change', renderMain);
    if (countryFilter) countryFilter.addEventListener('change', renderMain);
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    });
};

function applyTheme() {
    // defaults to dark in HTML
}

function updateStats() {
    totalCount.textContent = channels.length;
    waCount.textContent = channels.filter(c => c.platform === 'WhatsApp').length;
    tgCount.textContent = channels.filter(c => c.platform === 'Telegram').length;
    savedBadge.textContent = bookmarks.length;
}

init();