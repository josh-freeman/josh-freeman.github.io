/**
 * Notification Bell Component
 * Shows notification bell in top-right corner for all logged-in users
 */

(function() {
    'use strict';

    let notificationDropdownOpen = false;

    /**
     * Check if user is logged in
     */
    function isUserLoggedIn() {
        try {
            const token = localStorage.getItem('comment_token');
            const user = localStorage.getItem('comment_user');
            return !!(token && user);
        } catch (e) {}
        return false;
    }

    /**
     * Get auth token
     */
    function getAuthToken() {
        return localStorage.getItem('comment_token');
    }

    /**
     * Make authenticated API request
     */
    async function fetchWithAuth(endpoint, options = {}) {
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${window.API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Initialize the notification component
     */
    function initNotifications() {
        // Only show for logged-in users
        if (!isUserLoggedIn()) return;

        // Create and inject the notification bell
        createNotificationBell();

        // Fetch initial count
        fetchUnreadCount();

        // Listen for real-time updates via WebSocket
        if (window.WebSocketClient) {
            window.WebSocketClient.on('notification_update', function(data) {
                updateBadge(data.unread_count);
                // If dropdown is open, refresh the list
                if (notificationDropdownOpen) {
                    fetchNotifications();
                }
            });

            window.WebSocketClient.on('notification', function(data) {
                // New notification received, refresh the count
                fetchUnreadCount();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', handleOutsideClick);
    }

    /**
     * Create the notification bell HTML and inject it into the page
     */
    function createNotificationBell() {
        const bell = document.createElement('div');
        bell.id = 'notification-bell-container';
        bell.innerHTML = `
            <button id="notification-bell" class="notification-bell" onclick="toggleNotificationDropdown(event)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
                    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
                </svg>
                <span id="notification-badge" class="notification-badge" style="display: none;">0</span>
            </button>
            <div id="notification-dropdown" class="notification-dropdown" style="display: none;">
                <div class="notification-dropdown-header">
                    <span>Notifications</span>
                    <button onclick="markAllAsRead()" class="notification-action-btn">Mark all read</button>
                </div>
                <div id="notification-list" class="notification-list">
                    <div class="notification-empty">No notifications</div>
                </div>
                <div class="notification-dropdown-footer">
                    <button onclick="clearAllNotifications()" class="notification-clear-btn">Clear all</button>
                </div>
            </div>
        `;
        document.body.appendChild(bell);
    }

    /**
     * Fetch unread notification count
     */
    async function fetchUnreadCount() {
        try {
            const response = await fetchWithAuth('/notifications/unread-count');
            updateBadge(response.unread_count);
        } catch (error) {
            console.error('Failed to fetch notification count:', error);
        }
    }

    /**
     * Update the notification badge
     */
    function updateBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Toggle notification dropdown
     */
    window.toggleNotificationDropdown = function(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;

        notificationDropdownOpen = !notificationDropdownOpen;

        if (notificationDropdownOpen) {
            dropdown.style.display = 'block';
            fetchNotifications();
        } else {
            dropdown.style.display = 'none';
        }
    };

    /**
     * Handle clicks outside the dropdown
     */
    function handleOutsideClick(event) {
        if (!notificationDropdownOpen) return;

        const container = document.getElementById('notification-bell-container');
        if (container && !container.contains(event.target)) {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
                notificationDropdownOpen = false;
            }
        }
    }

    /**
     * Fetch all notifications
     */
    async function fetchNotifications() {
        const list = document.getElementById('notification-list');
        if (!list) return;

        try {
            const response = await fetchWithAuth('/notifications');
            renderNotifications(response.notifications);
            updateBadge(response.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            list.innerHTML = '<div class="notification-empty">Failed to load</div>';
        }
    }

    /**
     * Render notifications list
     */
    function renderNotifications(notifications) {
        const list = document.getElementById('notification-list');
        if (!list) return;

        if (!notifications || notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
            return;
        }

        list.innerHTML = notifications.slice(0, 10).map(n => `
            <div class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
                <a href="${n.link || '#'}" class="notification-link" onclick="handleNotificationClick(event, ${n.id})">
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(n.title)}</div>
                        <div class="notification-message">${escapeHtml(n.message)}</div>
                        <div class="notification-time">${formatTimeAgo(n.created_at)}</div>
                    </div>
                </a>
                <button class="notification-dismiss" onclick="dismissNotification(event, ${n.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    /**
     * Handle notification click - mark as read and navigate
     */
    window.handleNotificationClick = async function(event, id) {
        event.preventDefault();
        const link = event.currentTarget.getAttribute('href');

        try {
            await fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' });
            fetchUnreadCount();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }

        // Navigate to the link
        if (link && link !== '#') {
            window.location.href = link;
        }
    };

    /**
     * Dismiss a single notification
     */
    window.dismissNotification = async function(event, id) {
        event.stopPropagation();

        try {
            await fetchWithAuth(`/notifications/${id}`, { method: 'DELETE' });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
        }
    };

    /**
     * Mark all notifications as read
     */
    window.markAllAsRead = async function() {
        try {
            await fetchWithAuth('/notifications/read-all', { method: 'PUT' });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    /**
     * Clear all notifications
     */
    window.clearAllNotifications = async function() {
        try {
            await fetchWithAuth('/notifications', { method: 'DELETE' });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    };

    /**
     * Format time ago string
     */
    function formatTimeAgo(dateStr) {
        // Ensure UTC parsing if no timezone specified
        let date = new Date(dateStr);
        if (!dateStr.includes('Z') && !dateStr.includes('+')) {
            date = new Date(dateStr + 'Z');
        }
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 0) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
        if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
        return `${Math.floor(seconds / 31536000)}y ago`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotifications);
    } else {
        // Small delay to ensure auth.js and api.js are loaded
        setTimeout(initNotifications, 100);
    }
})();
