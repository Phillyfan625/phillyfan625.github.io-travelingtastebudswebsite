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
                hideTagSuggestions();
            }
            if (e.key === 'Backspace' && !this.value && currentTags.length) {
                currentTags.pop();
                renderTagChips();
            }
            if (e.key === 'Escape') {
                hideTagSuggestions();
            }
        });
        tagInput.addEventListener('input', function () {
            showTagSuggestions(this.value);
        });
        tagInput.addEventListener('focus', function () {
            showTagSuggestions(this.value);
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.tags-input-wrapper') && !e.target.closest('.tag-suggestions')) {
                hideTagSuggestions();
            }
        });
    }

    var tagsWrapper = document.getElementById('tagsWrapper');
    if (tagsWrapper) {
        tagsWrapper.addEventListener('click', function () {
            document.getElementById('tagInput').focus();
        });
    }

    var colorPicker = document.getElementById('spotLogoBgColorPicker');
    var colorText = document.getElementById('spotLogoBgColor');
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function () {
            colorText.value = this.value;
        });
        colorText.addEventListener('input', function () {
            if (/^#[0-9a-fA-F]{6}$/.test(this.value)) {
                colorPicker.value = this.value;
            }
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
        if (e.key === 'Escape') { closeModal(); closeConfirm(); closeImportModal(); }
    });

    var spotModalEl = document.getElementById('spotModal');
    if (spotModalEl) spotModalEl.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    var confirmEl = document.getElementById('confirmDialog');
    if (confirmEl) confirmEl.addEventListener('click', function (e) { if (e.target === this) closeConfirm(); });
    var importEl = document.getElementById('importModal');
    if (importEl) importEl.addEventListener('click', function (e) { if (e.target === this) closeImportModal(); });
})();

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
            '<td>' + (spot.logoImage ? '<img src="' + escapeHtml(spot.logoImage) + '" alt="" class="spot-logo"' + (spot.logoBgColor ? ' style="background:' + escapeHtml(spot.logoBgColor) + ';"' : '') + '>' : '<div class="spot-logo skeleton"></div>') + '</td>' +
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
    document.getElementById('spotLogoBgColor').value = '';
    document.getElementById('spotLogoBgColorPicker').value = '#ffffff';
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
    document.getElementById('spotLogoBgColor').value = spot.logoBgColor || '';
    document.getElementById('spotLogoBgColorPicker').value = spot.logoBgColor || '#ffffff';
    document.getElementById('spotFoodImage').value = spot.foodImage || '';
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
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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

// ── Address Geocoding ─────────────────────────

async function geocodeAddress() {
    var address = document.getElementById('addressSearch').value.trim();
    if (!address) { showToast('Enter an address to look up', 'error'); return; }

    var btn = document.querySelector('[onclick="geocodeAddress()"]');
    var originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';

    try {
        var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
        var res = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });
        var results = await res.json();

        if (!results || results.length === 0) {
            showToast('Address not found. Try a more specific address.', 'error');
            return;
        }

        var lat = parseFloat(results[0].lat).toFixed(4);
        var lng = parseFloat(results[0].lon).toFixed(4);

        document.getElementById('spotLat').value = lat;
        document.getElementById('spotLng').value = lng;

        if (mapPicker) {
            mapPicker.setView([lat, lng], 15);
            setPickerMarker(lat, lng);
        }

        showToast('Found: ' + results[0].display_name.split(',').slice(0, 3).join(','), 'success');
    } catch (err) {
        showToast('Geocoding failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
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

function getAllUniqueTags() {
    var tagSet = new Set();
    allSpots.forEach(function (s) {
        (s.tags || []).forEach(function (t) { tagSet.add(t.toLowerCase()); });
    });
    return Array.from(tagSet).sort();
}

function showTagSuggestions(query) {
    var existing = document.querySelector('.tag-suggestions');
    if (existing) existing.remove();

    var allTags = getAllUniqueTags();
    var q = (query || '').trim().toLowerCase();

    // Filter: show tags that match the query and aren't already selected
    var matches = allTags.filter(function (t) {
        return !currentTags.includes(t) && (q === '' || t.includes(q));
    });

    if (matches.length === 0) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'tag-suggestions';
    matches.slice(0, 8).forEach(function (tag) {
        var item = document.createElement('div');
        item.className = 'tag-suggestion-item';
        item.textContent = tag;
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!currentTags.includes(tag)) {
                currentTags.push(tag);
                renderTagChips();
            }
            document.getElementById('tagInput').value = '';
            hideTagSuggestions();
            document.getElementById('tagInput').focus();
        });
        dropdown.appendChild(item);
    });

    var wrapper = document.getElementById('tagsWrapper');
    wrapper.parentElement.style.position = 'relative';
    wrapper.parentElement.appendChild(dropdown);
}

function hideTagSuggestions() {
    var existing = document.querySelector('.tag-suggestions');
    if (existing) existing.remove();
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
        logoBgColor: document.getElementById('spotLogoBgColor').value.trim(),
        foodImage: document.getElementById('spotFoodImage').value.trim(),
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

        // If in batch import mode, advance to next
        if (!isEdit && batchImportQueue.length > 1 && batchImportIndex < batchImportQueue.length - 1) {
            batchImportIndex++;
            setTimeout(function() {
                prefillFromImport(batchImportQueue[batchImportIndex]);
            }, 500);
        } else if (batchImportQueue.length > 0) {
            batchImportQueue = [];
            batchImportIndex = 0;
        }
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

// ── TikTok Import ──────────────────────────────

var fetchedImports = [];

function openImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('importUrls').value = '';
    document.getElementById('importResults').style.display = 'none';
    document.getElementById('importFooter').style.display = 'none';
    document.getElementById('importList').innerHTML = '';
    document.getElementById('importStatus').textContent = '';
    fetchedImports = [];
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
    document.body.style.overflow = '';
}

function extractVideoId(url) {
    // Match patterns like /video/7262868213384400171
    var match = url.match(/\/video\/(\d+)/);
    if (match) return match[1];
    // Also try extracting just a bare numeric ID
    var cleaned = url.trim().replace(/\D/g, '');
    if (cleaned.length >= 5 && cleaned.length <= 25) return cleaned;
    return null;
}

function parseRestaurantName(title) {
    if (!title) return '';
    // TikTok titles often have patterns like "Restaurant Name - description"
    // or "Trying Restaurant Name!" or "Restaurant Name review"
    // Try to extract the most useful part
    var name = title;
    // Remove common hashtags
    name = name.replace(/#\w+/g, '').trim();
    // Remove common phrases
    var removePatterns = [
        /\b(review|trying|tried|must try|food review|best|amazing|incredible|check out)\b/gi,
        /[!?]{2,}/g,
        /\s{2,}/g
    ];
    removePatterns.forEach(function(p) { name = name.replace(p, ' '); });
    name = name.trim();
    // If too long, take first meaningful chunk
    if (name.length > 60) {
        var dash = name.indexOf(' - ');
        var pipe = name.indexOf(' | ');
        if (dash > 0 && dash < 50) name = name.substring(0, dash);
        else if (pipe > 0 && pipe < 50) name = name.substring(0, pipe);
        else name = name.substring(0, 60);
    }
    return name.trim();
}

async function fetchTikTokData() {
    var textarea = document.getElementById('importUrls');
    var btn = document.getElementById('importFetchBtn');
    var status = document.getElementById('importStatus');
    var raw = textarea.value.trim();

    if (!raw) {
        showToast('Paste at least one TikTok URL', 'error');
        return;
    }

    // Split by newlines, filter empty
    var urls = raw.split(/\n+/).map(function(u) { return u.trim(); }).filter(Boolean);

    // Deduplicate
    urls = urls.filter(function(u, i) { return urls.indexOf(u) === i; });

    if (urls.length === 0) {
        showToast('No valid URLs found', 'error');
        return;
    }

    // Check which video IDs already exist in the database
    var existingIds = new Set(allSpots.map(function(s) { return s.tiktokId; }));

    btn.disabled = true;
    btn.querySelector('span').textContent = 'Fetching...';
    status.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:0.4rem;"></i> Fetching ' + urls.length + ' video(s)...';

    try {
        var res = await fetch(TTBData.apiBase + '/api/tiktok/oembed/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + TTBData.getToken()
            },
            body: JSON.stringify({ urls: urls })
        });

        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fetch failed');

        fetchedImports = [];
        var listEl = document.getElementById('importList');
        listEl.innerHTML = '';
        var successCount = 0;
        var skipCount = 0;

        data.results.forEach(function(item) {
            if (item.error) return;

            var videoId = extractVideoId(item.url || '');
            if (!videoId) return;

            // Check if already exists
            var alreadyExists = existingIds.has(videoId);
            if (alreadyExists) {
                skipCount++;
                return;
            }

            var parsed = {
                url: item.url,
                videoId: videoId,
                title: item.title || '',
                parsedName: parseRestaurantName(item.title || ''),
                thumbnail: item.thumbnail_url || '',
                author: item.author_name || ''
            };
            fetchedImports.push(parsed);
            successCount++;

            var card = document.createElement('div');
            card.className = 'import-item';
            card.innerHTML =
                '<div class="import-item-thumb">' +
                    (parsed.thumbnail ? '<img src="' + escapeHtml(parsed.thumbnail) + '" alt="">' : '<div class="import-item-no-thumb"><i class="fab fa-tiktok"></i></div>') +
                '</div>' +
                '<div class="import-item-info">' +
                    '<div class="import-item-name">' + escapeHtml(parsed.parsedName || 'Untitled') + '</div>' +
                    '<div class="import-item-meta">' +
                        '<span><i class="fas fa-fingerprint"></i> ' + escapeHtml(parsed.videoId) + '</span>' +
                    '</div>' +
                    '<div class="import-item-title">' + escapeHtml(parsed.title).substring(0, 120) + '</div>' +
                '</div>' +
                '<div class="import-item-actions">' +
                    '<button class="btn-ttb btn-ttb-primary" style="font-size:0.75rem;padding:0.35rem 0.75rem;" onclick="importSingle(' + (fetchedImports.length - 1) + ')"><i class="fas fa-plus"></i> Add</button>' +
                '</div>';
            listEl.appendChild(card);
        });

        var statusMsg = successCount + ' new video(s) found';
        if (skipCount > 0) statusMsg += ', ' + skipCount + ' already in database';
        status.innerHTML = '<i class="fas fa-check-circle" style="color:var(--accent);margin-right:0.4rem;"></i> ' + statusMsg;

        if (fetchedImports.length > 0) {
            document.getElementById('importResults').style.display = 'block';
            document.getElementById('importFooter').style.display = 'flex';
        } else {
            document.getElementById('importResults').style.display = 'none';
            document.getElementById('importFooter').style.display = 'none';
            if (skipCount > 0) {
                showToast('All videos are already in the database!', 'info');
            }
        }
    } catch (err) {
        status.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;margin-right:0.4rem;"></i> ' + err.message;
        showToast('Failed to fetch TikTok data: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Fetch Data';
    }
}

function importSingle(index) {
    var item = fetchedImports[index];
    if (!item) return;
    closeImportModal();
    prefillFromImport(item);
}

function importAllFetched() {
    if (fetchedImports.length === 0) return;
    if (fetchedImports.length === 1) {
        importSingle(0);
        return;
    }
    // For multiple, create them one at a time starting with the first
    closeImportModal();
    startBatchImport(0);
}

var batchImportQueue = [];
var batchImportIndex = 0;

function startBatchImport(startIndex) {
    batchImportQueue = fetchedImports.slice();
    batchImportIndex = startIndex;
    showToast('Importing ' + batchImportQueue.length + ' videos. Fill out each one and save.', 'info');
    prefillFromImport(batchImportQueue[batchImportIndex]);
}

function prefillFromImport(item) {
    // Open the add modal with pre-filled data
    document.getElementById('modalTitle').textContent = 'Add: ' + (item.parsedName || 'New Spot');
    document.getElementById('saveSpotBtn').querySelector('span').textContent = 'Save Spot';
    document.getElementById('spotForm').reset();
    document.getElementById('spotId').value = '';

    // Pre-fill what we know
    document.getElementById('spotName').value = item.parsedName || '';
    document.getElementById('spotTiktokId').value = item.videoId || '';
    document.getElementById('spotFoodImage').value = item.thumbnail || '';
    document.getElementById('spotRating').value = 8;
    document.getElementById('ratingDisplay').textContent = '8.0';
    document.getElementById('spotLogoBgColor').value = '';
    document.getElementById('spotLogoBgColorPicker').value = '#ffffff';
    currentTags = [];
    renderTagChips();
    openModal();

    // Show a helper message
    showToast('Video ID and thumbnail auto-filled! Add location, coordinates, and review.', 'success');

    // If batch mode, show progress
    if (batchImportQueue.length > 1) {
        showToast('Video ' + (batchImportIndex + 1) + ' of ' + batchImportQueue.length, 'info');
    }
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
