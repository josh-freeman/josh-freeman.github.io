/**
 * API utilities for joshfreeman.me
 */

// API base URL - set on window to share with other scripts (sidebar.js, etc.)
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = 'https://api.joshfreeman.me';
}

// Also set for comments.js compatibility
window.COMMENTS_API_BASE = window.API_BASE;

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (starting with /)
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('comment_token');

    const headers = {
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    return fetch(`${window.API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });
}

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} JSON response
 */
async function apiGet(endpoint) {
    const response = await fetchApi(endpoint);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<any>} JSON response
 */
async function apiPost(endpoint, data) {
    const response = await fetchApi(endpoint, {
        method: 'POST',
        body: data
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<any>} JSON response
 */
async function apiPut(endpoint, data) {
    const response = await fetchApi(endpoint, {
        method: 'PUT',
        body: data
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} JSON response
 */
async function apiDelete(endpoint) {
    const response = await fetchApi(endpoint, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Upload a file
 * @param {string} endpoint - API endpoint
 * @param {File} file - File to upload
 * @param {string} fieldName - Form field name (default: 'file')
 * @returns {Promise<any>} JSON response
 */
async function apiUpload(endpoint, file, fieldName = 'file') {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetchApi(endpoint, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Upload error: ${response.status}`);
    }
    return response.json();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE: window.API_BASE,
        fetchApi,
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        apiUpload
    };
}
