/**
 * Authentication utilities for joshfreeman.me
 */

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
        requireAdmin
    };
}
