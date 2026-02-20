// ============================================
//  TTB ADMIN PANEL — JavaScript
// ============================================

let allSpots = [];
let mapPicker = null;
let mapPickerMarker = null;
let currentTags = [];
let pendingDeleteId = null;

// ── Utilities ──────────────────────────────────

// Use shared escapeHtml from TTBData module
var escapeHtml = TTBData.escapeHtml;

function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = 'ttb-toast ' + type;
    toast.innerHTML =
        '<i class="fas ' + (icons[type] || icons.info) + '"></i>' +
        '<span>' + escapeHtml(message) + '</span>' +
        '<span class="toast-close" onclick="this.parentElement.remove()">&times;</span>';
    container.appendChild(toast);
    setTimeout(function () {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.3s ease';
            setTimeout(function () { toast.remove(); }, 300);
        }
    }, 4500);
}

// ── Init ───────────────────────────────────────

(function init() {
    if (!TTBData.apiBase) {
        document.getElementById('loginScreen').innerHTML =
            '<div class="admin-login-card">' +
            '<img src="/Images/ttbLogo.png" alt="TTB Logo">' +
            '<h2>Admin Setup Required</h2>' +
            '<p class="subtitle">The API hasn\'t been connected yet.<br>Deploy the API from <code>/api</code> (see setup guide), then paste the URL below.</p>' +
            '<input type="url" class="form-control mb-3" id="apiUrlInput" placeholder="https://your-api.onrender.com">' +
            '<button class="btn-ttb btn-ttb-primary" style="width:100%;justify-content:center;border:none;" onclick="setApiUrl()">' +
            '<i class="fas fa-plug"></i> Connect API</button>' +
            '<p style="color:var(--text-muted);font-size:0.75rem;margin-top:1.5rem;margin-bottom:0;">' +
            '<a href="/" style="color:var(--header-color);text-decoration:none;">&larr; Back to site</a></p>' +
            '</div>';
        return;
    }

    if (TTBData.isLoggedIn()) {
        verifyAndShowDashboard();
    }

    var loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    var searchInput = document.getElementById('adminSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            var filtered = allSpots.filter(function (s) {
                return s.name.toLowerCase().includes(q) ||
                    s.location.toLowerCase().includes(q) ||
                    (s.tags || []).some(function (t) { return t.toLowerCase().includes(q); });
            });
            renderTable(filtered);
        });
    }

    var tagInput = document.getElementById('tagInput');
    if (tagInput) {
        tagInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                var val = this.value.trim().toLowerCase().replace(/,/g, '');
                if (val && !currentTags.includes(val)) {
                    currentTags.push(val);
                    renderTagChips();
                }
                this.value = '';
            }
            if (e.key === 'Backspace' && !this.value && currentTags.length) {
                currentTags.pop();
                renderTagChips();
            }
        });
    }

    var tagsWrapper = document.getElementById('tagsWrapper');
    if (tagsWrapper) {
        tagsWrapper.addEventListener('click', function () {
            document.getElementById('tagInput').focus();
        });
    }

    var ratingSlider = document.getElementById('spotRating');
    if (ratingSlider) {
        ratingSlider.addEventListener('input', function () {
            document.getElementById('ratingDisplay').textContent = parseFloat(this.value).toFixed(1);
        });
    }

    // Close modals on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeModal(); closeConfirm(); }
    });

    var spotModalEl = document.getElementById('spotModal');
    if (spotModalEl) spotModalEl.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    var confirmEl = document.getElementById('confirmDialog');
    if (confirmEl) confirmEl.addEventListener('click', function (e) { if (e.target === this) closeConfirm(); });
})();

function setApiUrl() {
    var url = document.getElementById('apiUrlInput').value.trim().replace(/\/+$/, '');
    if (!url) { showToast('Please enter a valid API URL', 'error'); return; }
    localStorage.setItem('ttb_api_url', url);
    showToast('API URL saved! Reloading...', 'success');
    setTimeout(function () { window.location.reload(); }, 1000);
}

// ── Auth ───────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    var btn = document.getElementById('loginBtn');
    var pw = document.getElementById('loginPassword').value;
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Logging in...';

    try {
        await TTBData.login(pw);
        showToast('Welcome back!', 'success');
        showDashboard();
        loadSpots();
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('loginPassword').classList.add('error');
        setTimeout(function () { document.getElementById('loginPassword').classList.remove('error'); }, 2000);
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Log In';
    }
}

async function verifyAndShowDashboard() {
    try {
        var res = await fetch(TTBData.apiBase + '/api/auth/verify', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TTBData.getToken() }
        });
        if (res.ok) { showDashboard(); loadSpots(); }
        else { TTBData.logout(); }
    } catch (_) { /* API down */ }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function handleLogout() {
    TTBData.logout();
    showToast('Logged out', 'info');
    setTimeout(function () { window.location.reload(); }, 500);
}

// ── Load & Render ──────────────────────────────

async function loadSpots() {
    try {
        var data = await TTBData.getSpots(true);
        allSpots = data;
        renderStats();
        renderTable(allSpots);
    } catch (err) {
        showToast('Failed to load spots: ' + err.message, 'error');
        renderTable([]);
    }
}

function renderStats() {
    document.getElementById('statTotal').textContent = allSpots.length;
    document.getElementById('statDiscounts').textContent = allSpots.filter(function (s) { return s.discount; }).length;
    var avg = allSpots.length
        ? (allSpots.reduce(function (sum, s) { return sum + (s.rating || 0); }, 0) / allSpots.length).toFixed(1)
        : '-';
    document.getElementById('statAvgRating').textContent = avg;
    var tagSet = new Set();
    allSpots.forEach(function (s) { (s.tags || []).forEach(function (t) { tagSet.add(t); }); });
    document.getElementById('statTags').textContent = tagSet.size;
}

function renderTable(spots) {
    var tbody = document.getElementById('spotsTableBody');
    if (spots.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7"><div class="empty-state">' +
            '<i class="fas fa-utensils"></i>' +
            '<h3>No spots yet</h3>' +
            '<p>Click "Add Spot" to add your first restaurant review!</p>' +
            '</div></td></tr>';
        return;
    }
    tbody.innerHTML = spots.map(function (spot) {
        var id = spot._id || '';
        var safeName = escapeHtml(spot.name);
        return '<tr class="admin-table-row" data-id="' + id + '">' +
            '<td>' + (spot.logoImage ? '<img src="' + escapeHtml(spot.logoImage) + '" alt="" class="spot-logo">' : '<div class="spot-logo skeleton"></div>') + '</td>' +
            '<td class="spot-name">' + safeName + '</td>' +
            '<td style="color:var(--text-muted);font-size:0.85rem;">' + escapeHtml(spot.location) + '</td>' +
            '<td><div class="spot-tags">' + (spot.tags || []).map(function (t) { return '<span class="spot-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div></td>' +
            '<td class="spot-rating">' + (spot.rating ? spot.rating + '/10' : '-') + '</td>' +
            '<td class="spot-discount">' + (spot.discount ? escapeHtml(spot.discount) : '-') + '</td>' +
            '<td><div class="table-actions">' +
            '<button class="table-action-btn" title="Edit" onclick="openEditModal(\'' + id + '\')"><i class="fas fa-pen"></i></button>' +
            '<button class="table-action-btn delete" title="Delete" onclick="confirmDelete(\'' + id + '\',\'' + safeName.replace(/'/g, "\\'") + '\')"><i class="fas fa-trash-alt"></i></button>' +
            '</div></td></tr>';
    }).join('');
}

// ── Add / Edit Modal ───────────────────────────

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Spot';
    document.getElementById('saveSpotBtn').querySelector('span').textContent = 'Save Spot';
    document.getElementById('spotForm').reset();
    document.getElementById('spotId').value = '';
    document.getElementById('spotRating').value = 8;
    document.getElementById('ratingDisplay').textContent = '8.0';
    currentTags = [];
    renderTagChips();
    openModal();
}

function openEditModal(id) {
    var spot = allSpots.find(function (s) { return s._id === id; });
    if (!spot) { showToast('Spot not found', 'error'); return; }

    document.getElementById('modalTitle').textContent = 'Edit: ' + spot.name;
    document.getElementById('saveSpotBtn').querySelector('span').textContent = 'Update Spot';
    document.getElementById('spotId').value = id;
    document.getElementById('spotName').value = spot.name || '';
    document.getElementById('spotLocation').value = spot.location || '';
    document.getElementById('spotTiktokId').value = spot.tiktokId || '';
    document.getElementById('spotDiscount').value = spot.discount || '';
    document.getElementById('spotSnippet').value = spot.snippet || '';
    document.getElementById('spotLogoImage').value = spot.logoImage || '';
    document.getElementById('spotLat').value = spot.lat || '';
    document.getElementById('spotLng').value = spot.lng || '';
    document.getElementById('spotRating').value = spot.rating || 0;
    document.getElementById('ratingDisplay').textContent = (spot.rating || 0).toFixed(1);
    currentTags = [].concat(spot.tags || []);
    renderTagChips();
    openModal();

    if (spot.lat && spot.lng) {
        setTimeout(function () {
            if (mapPicker) {
                mapPicker.setView([spot.lat, spot.lng], 14);
                setPickerMarker(spot.lat, spot.lng);
            }
        }, 300);
    }
}

function openModal() {
    document.getElementById('spotModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
        if (!mapPicker) {
            mapPicker = L.map('mapPicker').setView([39.83, -75.08], 10);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OSM &copy; CARTO'
            }).addTo(mapPicker);
            mapPicker.on('click', function (e) {
                document.getElementById('spotLat').value = e.latlng.lat.toFixed(4);
                document.getElementById('spotLng').value = e.latlng.lng.toFixed(4);
                setPickerMarker(e.latlng.lat, e.latlng.lng);
            });
        } else {
            mapPicker.invalidateSize();
        }
    }, 200);
}

function closeModal() {
    document.getElementById('spotModal').classList.remove('show');
    document.body.style.overflow = '';
}

function setPickerMarker(lat, lng) {
    if (mapPickerMarker) mapPicker.removeLayer(mapPickerMarker);
    mapPickerMarker = L.marker([lat, lng]).addTo(mapPicker);
}

// ── Tags ───────────────────────────────────────

function renderTagChips() {
    var wrapper = document.getElementById('tagsWrapper');
    var input = document.getElementById('tagInput');
    wrapper.querySelectorAll('.tag-chip').forEach(function (c) { c.remove(); });
    currentTags.forEach(function (tag, i) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = escapeHtml(tag) + ' <span class="remove-tag" onclick="removeTag(' + i + ')">&times;</span>';
        wrapper.insertBefore(chip, input);
    });
}

function removeTag(index) {
    currentTags.splice(index, 1);
    renderTagChips();
}

// ── Save ───────────────────────────────────────

async function saveSpot() {
    var btn = document.getElementById('saveSpotBtn');
    var id = document.getElementById('spotId').value;
    var isEdit = !!id;

    var spotData = {
        name: document.getElementById('spotName').value.trim(),
        location: document.getElementById('spotLocation').value.trim(),
        tiktokId: document.getElementById('spotTiktokId').value.trim(),
        discount: document.getElementById('spotDiscount').value.trim(),
        snippet: document.getElementById('spotSnippet').value.trim(),
        logoImage: document.getElementById('spotLogoImage').value.trim(),
        lat: parseFloat(document.getElementById('spotLat').value),
        lng: parseFloat(document.getElementById('spotLng').value),
        rating: parseFloat(document.getElementById('spotRating').value),
        tags: currentTags
    };

    var errors = [];
    if (!spotData.name) errors.push('Name is required');
    if (!spotData.tiktokId) errors.push('TikTok Video ID is required');
    if (!spotData.location) errors.push('Location is required');
    if (isNaN(spotData.lat) || spotData.lat < -90 || spotData.lat > 90) errors.push('Valid latitude required');
    if (isNaN(spotData.lng) || spotData.lng < -180 || spotData.lng > 180) errors.push('Valid longitude required');

    if (errors.length) {
        showToast(errors.join('. '), 'error');
        if (!spotData.name) document.getElementById('spotName').classList.add('error');
        if (!spotData.tiktokId) document.getElementById('spotTiktokId').classList.add('error');
        if (!spotData.location) document.getElementById('spotLocation').classList.add('error');
        setTimeout(function () { document.querySelectorAll('.admin-input.error').forEach(function (el) { el.classList.remove('error'); }); }, 3000);
        return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = isEdit ? 'Updating...' : 'Saving...';

    try {
        if (isEdit) {
            await TTBData.updateSpot(id, spotData);
            showToast(spotData.name + ' updated!', 'success');
        } else {
            await TTBData.createSpot(spotData);
            showToast(spotData.name + ' added!', 'success');
        }
        closeModal();
        loadSpots();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = isEdit ? 'Update Spot' : 'Save Spot';
    }
}

// ── Delete ─────────────────────────────────────

function confirmDelete(id, name) {
    pendingDeleteId = id;
    document.getElementById('confirmTitle').textContent = 'Delete ' + name + '?';
    document.getElementById('confirmMessage').textContent =
        'This removes it from the map, reviews, and everywhere on the site. This cannot be undone.';
    document.getElementById('confirmDialog').classList.add('show');

    document.getElementById('confirmBtn').onclick = async function () {
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        try {
            await TTBData.deleteSpot(pendingDeleteId);
            showToast(name + ' deleted', 'success');
            closeConfirm();
            loadSpots();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        }
    };
}

function closeConfirm() {
    document.getElementById('confirmDialog').classList.remove('show');
    pendingDeleteId = null;
}

// ── Seed DB (one-time import from local JSON) ──

async function handleSeedDB() {
    if (!confirm('This will import all spots from the local JSON into the database. Only works if the DB is empty. Continue?')) return;

    try {
        showToast('Fetching local data...', 'info');
        var res = await fetch('/data/spots.json');
        var spots = await res.json();

        var seedRes = await fetch(TTBData.apiBase + '/api/seed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + TTBData.getToken()
            },
            body: JSON.stringify({ spots: spots })
        });

        var data = await seedRes.json();
        if (!seedRes.ok) throw new Error(data.error || 'Seed failed');

        showToast(data.message, 'success');
        loadSpots();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
