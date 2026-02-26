/*
 * ============================================
 *  TTB Data Module
 * ============================================
 *
 *  Shared data layer used by every page.
 *  Tries the API first, falls back to the local JSON.
 *
 *  Usage:
 *    <script src="/js/ttb-data.js"></script>
 *    <script>
 *      TTBData.getSpots().then(spots => { ... });
 *    </script>
 */

const TTBData = (function () {
    // ── Config ────────────────────────────────────────
    // Priority: localStorage override > window.TTB_API_URL (set in js/ttb-config.js) > automatic
    // Automatic: localhost → http://localhost:3001; otherwise same origin (site must serve API at /api)
    function getApiBase() {
        if (typeof window === 'undefined') return '';
        var override = localStorage.getItem('ttb_api_url');
        if (override) return override.replace(/\/+$/, '');
        if (window.TTB_API_URL) return String(window.TTB_API_URL).replace(/\/+$/, '');
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return window.location.origin;
    }
    const API_BASE = getApiBase();

    const FALLBACK_JSON = '/data/spots.json';
    const CACHE_KEY = 'ttb_spots_cache';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

    let _spotsPromise = null;

    // ── Public: Get all spots ─────────────────────────
    function getSpots(forceRefresh) {
        if (_spotsPromise && !forceRefresh) return _spotsPromise;

        _spotsPromise = _fetchSpots(forceRefresh);
        return _spotsPromise;
    }

    // ── Internal: Fetch with cache + fallback ─────────
    async function _fetchSpots(forceRefresh) {
        // Check in-memory/session cache first
        if (!forceRefresh) {
            const cached = _getCache();
            if (cached) return cached;
        }

        // Try API first
        if (API_BASE) {
            try {
                const res = await fetch(API_BASE + '/api/spots', {
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) throw new Error('API returned ' + res.status);
                const data = await res.json();
                const spots = data.spots || data;
                _setCache(spots);
                return spots;
            } catch (err) {
                console.warn('TTBData: API unavailable, falling back to local JSON.', err.message);
            }
        }

        // Fallback to local JSON
        try {
            const res = await fetch(FALLBACK_JSON);
            if (!res.ok) throw new Error('JSON fetch returned ' + res.status);
            const spots = await res.json();
            _setCache(spots);
            return spots;
        } catch (err) {
            console.error('TTBData: Could not load spots data.', err);
            // Last resort: return empty array so pages don't break
            return [];
        }
    }

    // ── Cache helpers ─────────────────────────────────
    function _getCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) return null;
            return data;
        } catch {
            return null;
        }
    }

    function _setCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        } catch { /* quota exceeded — ignore */ }
    }

    function clearCache() {
        sessionStorage.removeItem(CACHE_KEY);
        _spotsPromise = null;
    }

    // ── Admin helpers (used by admin.html) ────────────

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
        const res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
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

    async function createSpot(spot) {
        const res = await fetch(API_BASE + '/api/spots', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(spot)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create spot');
        clearCache();
        return data;
    }

    async function updateSpot(id, updates) {
        const res = await fetch(API_BASE + '/api/spots/' + id, {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update spot');
        clearCache();
        return data;
    }

    async function deleteSpot(id) {
        const res = await fetch(API_BASE + '/api/spots/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete spot');
        clearCache();
        return data;
    }

    // ── Testimonials ──────────────────────────────────

    const TESTIMONIALS_CACHE_KEY = 'ttb_testimonials_cache';
    let _testimonialsPromise = null;

    function getTestimonials(forceRefresh) {
        if (_testimonialsPromise && !forceRefresh) return _testimonialsPromise;
        _testimonialsPromise = _fetchTestimonials(forceRefresh);
        return _testimonialsPromise;
    }

    async function _fetchTestimonials(forceRefresh) {
        if (!forceRefresh) {
            try {
                const raw = sessionStorage.getItem(TESTIMONIALS_CACHE_KEY);
                if (raw) {
                    const { data, ts } = JSON.parse(raw);
                    if (Date.now() - ts < CACHE_TTL) return data;
                }
            } catch {}
        }

        if (API_BASE) {
            try {
                const res = await fetch(API_BASE + '/api/testimonials', {
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) throw new Error('API returned ' + res.status);
                const data = await res.json();
                const testimonials = data.testimonials || data;
                try {
                    sessionStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify({ data: testimonials, ts: Date.now() }));
                } catch {}
                return testimonials;
            } catch (err) {
                console.warn('TTBData: Could not load testimonials from API.', err.message);
            }
        }
        return [];
    }

    async function createTestimonial(testimonial) {
        const res = await fetch(API_BASE + '/api/testimonials', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(testimonial)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create testimonial');
        sessionStorage.removeItem(TESTIMONIALS_CACHE_KEY);
        _testimonialsPromise = null;
        return data;
    }

    async function updateTestimonial(id, updates) {
        const res = await fetch(API_BASE + '/api/testimonials/' + id, {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update testimonial');
        sessionStorage.removeItem(TESTIMONIALS_CACHE_KEY);
        _testimonialsPromise = null;
        return data;
    }

    async function deleteTestimonial(id) {
        const res = await fetch(API_BASE + '/api/testimonials/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete testimonial');
        sessionStorage.removeItem(TESTIMONIALS_CACHE_KEY);
        _testimonialsPromise = null;
        return data;
    }

    // ── Packages ──────────────────────────────────────

    const PACKAGES_CACHE_KEY = 'ttb_packages_cache';
    let _packagesPromise = null;

    function getPackages(forceRefresh) {
        if (_packagesPromise && !forceRefresh) return _packagesPromise;
        _packagesPromise = _fetchPackages(forceRefresh);
        return _packagesPromise;
    }

    async function _fetchPackages(forceRefresh) {
        if (!forceRefresh) {
            try {
                var raw = sessionStorage.getItem(PACKAGES_CACHE_KEY);
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (Date.now() - parsed.ts < CACHE_TTL) return parsed.data;
                }
            } catch {}
        }

        if (API_BASE) {
            try {
                var res = await fetch(API_BASE + '/api/packages', {
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) throw new Error('API returned ' + res.status);
                var data = await res.json();
                var packages = data.packages || data;
                try {
                    sessionStorage.setItem(PACKAGES_CACHE_KEY, JSON.stringify({ data: packages, ts: Date.now() }));
                } catch {}
                return packages;
            } catch (err) {
                console.warn('TTBData: Could not load packages from API.', err.message);
            }
        }
        return [];
    }

    async function createPackage(pkg) {
        var res = await fetch(API_BASE + '/api/packages', {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(pkg)
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create package');
        sessionStorage.removeItem(PACKAGES_CACHE_KEY);
        _packagesPromise = null;
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
        sessionStorage.removeItem(PACKAGES_CACHE_KEY);
        _packagesPromise = null;
        return data;
    }

    async function deletePackage(id) {
        var res = await fetch(API_BASE + '/api/packages/' + id, {
            method: 'DELETE',
            headers: _authHeaders()
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete package');
        sessionStorage.removeItem(PACKAGES_CACHE_KEY);
        _packagesPromise = null;
        return data;
    }

    // ── Trust Stats (Settings) ───────────────────────

    async function getTrustStats() {
        if (API_BASE) {
            try {
                const res = await fetch(API_BASE + '/api/settings/trustStats', {
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) throw new Error('API returned ' + res.status);
                const data = await res.json();
                return data.stats || [];
            } catch (err) {
                console.warn('TTBData: Could not load trust stats.', err.message);
            }
        }
        return [];
    }

    async function updateTrustStats(stats) {
        const res = await fetch(API_BASE + '/api/settings/trustStats', {
            method: 'PUT',
            headers: _authHeaders(),
            body: JSON.stringify({ stats })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update trust stats');
        return data;
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
        getSpots,
        clearCache,
        escapeHtml,
        sanitizeTikTokId,
        // Admin
        login,
        logout,
        isLoggedIn,
        getToken,
        createSpot,
        updateSpot,
        deleteSpot,
        // Testimonials
        getTestimonials,
        createTestimonial,
        updateTestimonial,
        deleteTestimonial,
        // Packages
        getPackages,
        createPackage,
        updatePackage,
        deletePackage,
        // Settings
        getTrustStats,
        updateTrustStats,
        // Config
        get apiBase() { return API_BASE; }
    };
})();
