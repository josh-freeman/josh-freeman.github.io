/**
 * Authentication utilities for joshfreeman.me
 */

/**
 * Collect browser fingerprint data for location disambiguation
 * Used to detect VPN usage by comparing with IP-based location
 * @returns {Object} Browser data including timezone, language, etc.
 */
function getBrowserData() {
    const data = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset: new Date().getTimezoneOffset(),
        language: navigator.language || navigator.userLanguage,
        languages: navigator.languages ? Array.from(navigator.languages) : [],
        platform: navigator.platform,
        screen_width: screen.width,
        screen_height: screen.height,
        color_depth: screen.colorDepth
    };
    return data;
}

/**
 * Send browser data to backend for location disambiguation
 * Called after login or periodically to update location hints
 */
async function sendBrowserData() {
    const token = getToken();
    if (!token) return;

    try {
        const browserData = getBrowserData();
        await fetch(`${window.API_BASE || API_BASE}/users/browser-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(browserData)
        });
    } catch (e) {
        // Silently fail - this is supplementary data
        console.debug('Browser data send failed:', e);
    }
}

/**
 * Get the current auth token
 * @returns {string|null} Auth token or null
 */
function getToken() {
    return localStorage.getItem('comment_token');
}

/**
 * Get the current user object
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('comment_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Check if a user is logged in
 * @returns {boolean} True if logged in
 */
function isLoggedIn() {
    return !!getToken() && !!getCurrentUser();
}

/**
 * Check if the current user is an admin
 * @returns {boolean} True if admin
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.is_admin === true;
}

/**
 * Save auth data after login
 * @param {string} token - Auth token
 * @param {Object} user - User object
 */
function saveAuth(token, user) {
    localStorage.setItem('comment_token', token);
    localStorage.setItem('comment_user', JSON.stringify(user));
    // Send browser data for location disambiguation (VPN detection)
    setTimeout(() => sendBrowserData(), 100);
}

/**
 * Clear auth data (logout)
 */
function clearAuth() {
    localStorage.removeItem('comment_token');
    localStorage.removeItem('comment_user');
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object on success
 */
async function login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    saveAuth(data.token, data.user);
    return data.user;
}

/**
 * Logout and optionally reload the page
 * @param {boolean} reload - Whether to reload the page
 */
function logout(reload = true) {
    clearAuth();
    if (reload) {
        window.location.reload();
    }
}

/**
 * Require authentication - redirect to login or show login modal
 * @param {Function} [showLoginFn] - Optional function to show login modal
 * @returns {boolean} True if authenticated
 */
function requireAuth(showLoginFn) {
    if (isLoggedIn()) {
        return true;
    }
    if (showLoginFn) {
        showLoginFn();
    } else {
        alert('Please log in to continue');
    }
    return false;
}

/**
 * Require admin authentication
 * @returns {boolean} True if admin
 */
function requireAdmin() {
    if (!isLoggedIn()) {
        alert('Please log in to continue');
        return false;
    }
    if (!isAdmin()) {
        alert('Admin access required');
        return false;
    }
    return true;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getToken,
        getCurrentUser,
        isLoggedIn,
        isAdmin,
        saveAuth,
        clearAuth,
        login,
        logout,
        requireAuth,
        requireAdmin,
        getBrowserData,
        sendBrowserData
    };
}
