/*
 * ============================================
 *  TTB Data Module
 * ============================================
 *
 *  Shared data layer used by every page.
 *
 *  PUBLIC pages: loads all data from local JSON files in /data/
 *  (instant, no server dependency, works on GitHub Pages).
 *
 *  ADMIN pages: CRUD operations still call the API on Render
 *  (only used by admin.html when the server is awake).
 *
 *  Usage:
 *    <script src="/js/ttb-data.js"></script>
 *    <script>
 *      TTBData.getSpots().then(spots => { ... });
 *    </script>
 */

const TTBData = (function () {
    // ── Config ────────────────────────────────────────
    // API is only needed for admin CRUD operations
    function getApiBase() {
        if (typeof window === 'undefined') return '';
        var override = localStorage.getItem('ttb_api_url');
        if (override) return override.replace(/\/+$/, '');
        if (window.TTB_API_URL) return String(window.TTB_API_URL).replace(/\/+$/, '');
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return '';
    }
    const API_BASE = getApiBase();

    // ── Local JSON paths ─────────────────────────────
    const LOCAL_SPOTS = '/data/spots.json';
    const LOCAL_TESTIMONIALS = '/data/testimonials.json';
    const LOCAL_PACKAGES = '/data/packages.json';
    const LOCAL_TRUST_STATS = '/data/trust-stats.json';

    // ── In-memory caches (avoid re-fetching the same JSON) ─
    let _spotsPromise = null;
    let _testimonialsPromise = null;
    let _packagesPromise = null;
    let _trustStatsPromise = null;

    // ── Generic local JSON loader ────────────────────
    async function _loadJSON(path) {
        var res = await fetch(path);
        if (!res.ok) throw new Error('Failed to load ' + path + ' (' + res.status + ')');
        return res.json();
    }

    // ── Public: Get all spots ─────────────────────────
    function getSpots(forceRefresh) {
        if (_spotsPromise && !forceRefresh) return _spotsPromise;
        _spotsPromise = _loadJSON(LOCAL_SPOTS).catch(function (err) {
            console.error('TTBData: Could not load spots.', err);
            return [];
        });
        return _spotsPromise;
    }

    // ── Public: Get testimonials ──────────────────────
    function getTestimonials(forceRefresh) {
        if (_testimonialsPromise && !forceRefresh) return _testimonialsPromise;
        _testimonialsPromise = _loadJSON(LOCAL_TESTIMONIALS).catch(function (err) {
            console.error('TTBData: Could not load testimonials.', err);
            return [];
        });
        return _testimonialsPromise;
    }

    // ── Public: Get packages ──────────────────────────
    function getPackages(forceRefresh) {
        if (_packagesPromise && !forceRefresh) return _packagesPromise;
        _packagesPromise = _loadJSON(LOCAL_PACKAGES).catch(function (err) {
            console.error('TTBData: Could not load packages.', err);
            return [];
        });
        return _packagesPromise;
    }

    // ── Public: Get trust stats ───────────────────────
    function getTrustStats(forceRefresh) {
        if (_trustStatsPromise && !forceRefresh) return _trustStatsPromise;
        _trustStatsPromise = _loadJSON(LOCAL_TRUST_STATS).catch(function (err) {
            console.error('TTBData: Could not load trust stats.', err);
            return [];
        });
        return _trustStatsPromise;
    }

    function clearCache() {
        _spotsPromise = null;
        _testimonialsPromise = null;
        _packagesPromise = null;
        _trustStatsPromise = null;
    }

    // ── Admin helpers (used by admin.html only) ──────

    function getToken() {
        return localStorage.getItem('ttb_admin_token') || '';
    }

    function setToken(token) {
        localStorage.setItem('ttb_admin_token', token);
    }

    function clearToken() {
        localStorage.removeItem('ttb_admin_token');
    }

    function isLoggedIn() {
        return !!getToken();
    }

    async function login(password) {
        var res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setToken(data.token);
        return data;
    }

    async function logout() {
        clearToken();
        clearCache();
    }

    function _authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        };
    }

    // ── Admin: Spots CRUD ─────────────────────────────
    // These fetch from the API (used by admin panel only)

    async function getAdminSpots() {
        var res = await fetch(API_BASE + '/api/spots', {
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var data = await res.json();
        return data.spots || data;
    }

    async function createSpot(spot) {
        var res = await fetch(API_BASE + '/api/spots', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(spot)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create spot');
        return data;
    }

    async function updateSpot(id, updates) {
        var res = await fetch(API_BASE + '/api/spots/' + id, {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify(updates)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update spot');
        return data;
    }

    async function deleteSpot(id) {
        var res = await fetch(API_BASE + '/api/spots/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete spot');
        return data;
    }

    // ── Admin: Testimonials CRUD ──────────────────────

    async function getAdminTestimonials() {
        var res = await fetch(API_BASE + '/api/testimonials', {
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var data = await res.json();
        return data.testimonials || data;
    }

    async function createTestimonial(testimonial) {
        var res = await fetch(API_BASE + '/api/testimonials', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(testimonial)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create testimonial');
        return data;
    }

    async function updateTestimonial(id, updates) {
        var res = await fetch(API_BASE + '/api/testimonials/' + id, {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify(updates)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update testimonial');
        return data;
    }

    async function deleteTestimonial(id) {
        var res = await fetch(API_BASE + '/api/testimonials/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete testimonial');
        return data;
    }

    // ── Admin: Packages CRUD ──────────────────────────

    async function getAdminPackages() {
        var res = await fetch(API_BASE + '/api/packages', {
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var data = await res.json();
        return data.packages || data;
    }

    async function createPackage(pkg) {
        var res = await fetch(API_BASE + '/api/packages', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(pkg)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create package');
        return data;
    }

    async function updatePackage(id, updates) {
        var res = await fetch(API_BASE + '/api/packages/' + id, {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify(updates)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update package');
        return data;
    }

    async function deletePackage(id) {
        var res = await fetch(API_BASE + '/api/packages/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete package');
        return data;
    }

    // ── Admin: Trust Stats ────────────────────────────

    async function getAdminTrustStats() {
        var res = await fetch(API_BASE + '/api/settings/trustStats', {
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) throw new Error('API returned ' + res.status);
        var data = await res.json();
        return data.stats || [];
    }

    async function updateTrustStats(stats) {
        var res = await fetch(API_BASE + '/api/settings/trustStats', {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify({ stats })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update trust stats');
        return data;
    }

    // ── Export: Download all data from API as JSON files ──
    // Used by admin panel to export current DB data for committing to repo
    async function exportAllData() {
        var results = {};
        var errors = [];

        try {
            var spotsRes = await fetch(API_BASE + '/api/spots', { signal: AbortSignal.timeout(15000) });
            if (spotsRes.ok) {
                var spotsData = await spotsRes.json();
                results.spots = spotsData.spots || spotsData;
            } else { errors.push('spots'); }
        } catch (e) { errors.push('spots: ' + e.message); }

        try {
            var testimonialsRes = await fetch(API_BASE + '/api/testimonials', { signal: AbortSignal.timeout(15000) });
            if (testimonialsRes.ok) {
                var testimonialsData = await testimonialsRes.json();
                results.testimonials = testimonialsData.testimonials || testimonialsData;
            } else { errors.push('testimonials'); }
        } catch (e) { errors.push('testimonials: ' + e.message); }

        try {
            var packagesRes = await fetch(API_BASE + '/api/packages', { signal: AbortSignal.timeout(15000) });
            if (packagesRes.ok) {
                var packagesData = await packagesRes.json();
                results.packages = packagesData.packages || packagesData;
            } else { errors.push('packages'); }
        } catch (e) { errors.push('packages: ' + e.message); }

        try {
            var statsRes = await fetch(API_BASE + '/api/settings/trustStats', { signal: AbortSignal.timeout(15000) });
            if (statsRes.ok) {
                var statsData = await statsRes.json();
                results.trustStats = statsData.stats || [];
            } else { errors.push('trustStats'); }
        } catch (e) { errors.push('trustStats: ' + e.message); }

        return { data: results, errors: errors };
    }

    // ── Shared utilities ────────────────────────────────

    function escapeHtml(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function sanitizeTikTokId(id) {
        if (!id) return '';
        return String(id).replace(/\D/g, '').slice(0, 25);
    }

    // ── Public API ────────────────────────────────────
    return {
        // Public data (loads from local JSON — instant, no server needed)
        getSpots,
        getTestimonials,
        getPackages,
        getTrustStats,
        clearCache,
        // Utilities
        escapeHtml,
        sanitizeTikTokId,
        // Admin auth
        login,
        logout,
        isLoggedIn,
        getToken,
        // Admin CRUD (requires API server)
        getAdminSpots,
        createSpot,
        updateSpot,
        deleteSpot,
        getAdminTestimonials,
        createTestimonial,
        updateTestimonial,
        deleteTestimonial,
        getAdminPackages,
        createPackage,
        updatePackage,
        deletePackage,
        getAdminTrustStats,
        updateTrustStats,
        // Export
        exportAllData,
        // Config
        get apiBase() { return API_BASE; }
    };
})();
