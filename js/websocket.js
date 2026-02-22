/**
 * WebSocket Client for Real-time Updates
 * Handles connection, authentication, auto-reconnect, and event dispatching.
 */

(function() {
    'use strict';

    // Configuration
    const WS_RECONNECT_INTERVAL = 3000;  // 3 seconds
    const WS_MAX_RECONNECT_ATTEMPTS = 10;
    const WS_PING_INTERVAL = 30000;  // 30 seconds

    // State
    let ws = null;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let pingTimer = null;
    let isConnecting = false;
    let subscribedPosts = new Set();

    // Event listeners
    const eventListeners = {
        'connected': [],
        'disconnected': [],
        'new_comment': [],
        'comment_deleted': [],
        'notification': [],
        'notification_update': [],
        'direct_message': [],
        'message_count_update': [],
        'presence': []
    };

    /**
     * Get WebSocket URL based on environment
     */
    function getWebSocketUrl() {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = isLocalDev ? 'localhost:8080' : 'api.joshfreeman.me';
        return `${wsProtocol}//${host}/ws`;
    }

    /**
     * Get auth token if available
     */
    function getAuthToken() {
        return localStorage.getItem('comment_token');
    }

    /**
     * Connect to WebSocket server
     */
    function connect() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        if (isConnecting) {
            return;
        }

        isConnecting = true;
        const token = getAuthToken();
        const url = getWebSocketUrl() + (token ? `?token=${encodeURIComponent(token)}` : '');

        try {
            ws = new WebSocket(url);

            ws.onopen = function() {
                isConnecting = false;
                reconnectAttempts = 0;

                // Resubscribe to any posts we were watching
                subscribedPosts.forEach(slug => {
                    sendMessage({ type: 'subscribe', post_slug: slug });
                });

                // Start ping timer
                startPingTimer();
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (e) {
                    console.error('[WS] Failed to parse message:', e);
                }
            };

            ws.onclose = function(event) {
                isConnecting = false;
                stopPingTimer();
                emitEvent('disconnected', { code: event.code, reason: event.reason });
                scheduleReconnect();
            };

            ws.onerror = function(error) {
                isConnecting = false;
            };

        } catch (e) {
            console.error('[WS] Connection failed:', e);
            isConnecting = false;
            scheduleReconnect();
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    function handleMessage(data) {
        const type = data.type;

        switch (type) {
            case 'connected':
                emitEvent('connected', {
                    authenticated: data.authenticated,
                    is_admin: data.is_admin
                });
                break;

            case 'subscribed':
                // Successfully subscribed to post
                break;

            case 'pong':
                // Keep-alive response, ignore
                break;

            case 'new_comment':
                emitEvent('new_comment', {
                    post_slug: data.post_slug,
                    comment: data.comment
                });
                break;

            case 'comment_deleted':
                emitEvent('comment_deleted', {
                    post_slug: data.post_slug,
                    comment_id: data.comment_id
                });
                break;

            case 'notification':
                emitEvent('notification', data.data);
                break;

            case 'notification_update':
                emitEvent('notification_update', {
                    unread_count: data.unread_count
                });
                break;

            case 'direct_message':
                emitEvent('direct_message', {
                    message: data.message
                });
                break;

            case 'message_count_update':
                emitEvent('message_count_update', {
                    unread_count: data.unread_count
                });
                break;

            case 'presence':
                emitEvent('presence', {
                    user_id: data.user_id,
                    user_name: data.user_name,
                    status: data.status,
                    timestamp: data.timestamp
                });
                break;

            default:
                // Unknown message type, ignore
                break;
        }
    }

    /**
     * Send a message to the WebSocket server
     */
    function sendMessage(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    /**
     * Schedule reconnection
     */
    function scheduleReconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        if (reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
            return;
        }

        reconnectAttempts++;
        const delay = WS_RECONNECT_INTERVAL * Math.min(reconnectAttempts, 5);

        reconnectTimer = setTimeout(connect, delay);
    }

    /**
     * Start ping timer for keep-alive
     */
    function startPingTimer() {
        stopPingTimer();
        pingTimer = setInterval(function() {
            sendMessage({ type: 'ping' });
        }, WS_PING_INTERVAL);
    }

    /**
     * Stop ping timer
     */
    function stopPingTimer() {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
    }

    /**
     * Subscribe to updates for a specific post
     */
    function subscribeToPost(postSlug) {
        subscribedPosts.add(postSlug);
        sendMessage({ type: 'subscribe', post_slug: postSlug });
    }

    /**
     * Unsubscribe from post updates
     */
    function unsubscribeFromPost(postSlug) {
        subscribedPosts.delete(postSlug);
        sendMessage({ type: 'unsubscribe', post_slug: postSlug });
    }

    /**
     * Add event listener
     */
    function on(event, callback) {
        if (eventListeners[event]) {
            eventListeners[event].push(callback);
        }
    }

    /**
     * Remove event listener
     */
    function off(event, callback) {
        if (eventListeners[event]) {
            const idx = eventListeners[event].indexOf(callback);
            if (idx !== -1) {
                eventListeners[event].splice(idx, 1);
            }
        }
    }

    /**
     * Emit event to all listeners
     */
    function emitEvent(event, data) {
        if (eventListeners[event]) {
            eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('[WS] Event handler error:', e);
                }
            });
        }
    }

    /**
     * Check if connected
     */
    function isConnected() {
        return ws && ws.readyState === WebSocket.OPEN;
    }

    /**
     * Disconnect and clean up
     */
    function disconnect() {
        stopPingTimer();
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        reconnectAttempts = WS_MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
        if (ws) {
            ws.close();
            ws = null;
        }
    }

    // Auto-connect when script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connect);
    } else {
        // Small delay to ensure other scripts are loaded
        setTimeout(connect, 100);
    }

    // Reconnect when page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !isConnected()) {
            reconnectAttempts = 0; // Reset attempts when user returns
            connect();
        }
    });

    // Expose public API
    window.WebSocketClient = {
        connect: connect,
        disconnect: disconnect,
        isConnected: isConnected,
        subscribeToPost: subscribeToPost,
        unsubscribeFromPost: unsubscribeFromPost,
        on: on,
        off: off
    };
})();
