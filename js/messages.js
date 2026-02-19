/**
 * Direct Messages Component
 * Ephemeral DMs - users can message admin, admin can message anyone
 * Shows message icon next to notification bell for logged-in users
 */

(function() {
    'use strict';

    let messagesPanelOpen = false;
    let currentConversation = null;  // public_id of user we're chatting with
    let isAdmin = false;
    let adminPublicId = null;  // Cache admin's public_id for non-admin users

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
     * Get current user info
     */
    function getCurrentUser() {
        try {
            const user = localStorage.getItem('comment_user');
            return user ? JSON.parse(user) : null;
        } catch (e) {}
        return null;
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
     * Initialize the messages component
     */
    function initMessages() {
        if (!isUserLoggedIn()) return;

        const user = getCurrentUser();
        isAdmin = user && user.is_admin;

        createMessagesButton();
        fetchUnreadCount();

        // Listen for real-time updates
        if (window.WebSocketClient) {
            window.WebSocketClient.on('direct_message', function(data) {
                // New message received
                fetchUnreadCount();

                // If panel is open and we're in this conversation, add the message
                if (messagesPanelOpen && currentConversation === data.message.sender_id) {
                    appendMessage(data.message);
                    markConversationRead(data.message.sender_id);
                }
            });

            window.WebSocketClient.on('message_count_update', function(data) {
                updateBadge(data.unread_count);
            });
        }

        // Close panel on outside click
        document.addEventListener('click', handleOutsideClick);
    }

    /**
     * Create the messages button
     */
    function createMessagesButton() {
        const container = document.createElement('div');
        container.id = 'messages-container';
        container.innerHTML = `
            <button id="messages-btn" class="messages-btn" onclick="window.MessagesComponent.togglePanel(event)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                </svg>
                <span id="messages-badge" class="messages-badge" style="display: none;">0</span>
            </button>
            <div id="messages-panel" class="messages-panel" style="display: none;">
                <div class="messages-panel-header">
                    <button id="messages-back-btn" class="messages-back-btn" style="display: none;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                    </button>
                    <span id="messages-panel-title">Messages</span>
                    <button id="messages-delete-btn" class="messages-delete-btn" style="display: none;" title="Delete conversation">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" x2="10" y1="11" y2="17"/>
                            <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                    </button>
                </div>
                <div id="messages-search-bar" class="messages-search-bar" style="display: none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.34-4.34"/>
                    </svg>
                    <input type="text" id="user-search-input" placeholder="Search users..." autocomplete="off" />
                </div>
                <div id="messages-content" class="messages-content">
                    <div class="messages-loading">Loading...</div>
                </div>
                <div id="messages-input-area" class="messages-input-area" style="display: none;">
                    <input type="text" id="message-input" class="message-input" placeholder="Write a message..." maxlength="2000" />
                    <button id="send-message-btn" class="send-message-btn" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
                            <path d="m21.854 2.147-10.94 10.939"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Insert after notification bell
        const notifContainer = document.getElementById('notification-bell-container');
        if (notifContainer) {
            notifContainer.parentNode.insertBefore(container, notifContainer);
        } else {
            document.body.appendChild(container);
        }

        // Handle enter key and send button
        setTimeout(() => {
            const input = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-message-btn');

            if (input) {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                    }
                });
            }

            if (sendBtn) {
                // Use both click and touchend for mobile reliability
                sendBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    sendMessage(e);
                });
            }

            const deleteBtn = document.getElementById('messages-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteConversation();
                });
            }

            const backBtn = document.getElementById('messages-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showConversationList();
                });
            }

            // Search input for admin
            const searchInput = document.getElementById('user-search-input');
            if (searchInput) {
                let debounceTimer;
                searchInput.addEventListener('input', function() {
                    clearTimeout(debounceTimer);
                    const query = this.value.trim();
                    if (query) {
                        debounceTimer = setTimeout(() => searchUsers(query), 300);
                    } else {
                        // Show conversations when search is cleared
                        showConversationList();
                    }
                });
                searchInput.addEventListener('focus', function() {
                    if (!this.value.trim()) {
                        // Keep showing conversations
                    }
                });
            }
        }, 100);
    }

    /**
     * Toggle the messages panel
     */
    function togglePanel(event) {
        event.stopPropagation();
        const panel = document.getElementById('messages-panel');

        if (messagesPanelOpen) {
            panel.style.display = 'none';
            messagesPanelOpen = false;
            currentConversation = null;
        } else {
            // Close notification dropdown if open
            if (window.closeNotificationDropdown) {
                window.closeNotificationDropdown();
            }
            panel.style.display = 'flex';
            messagesPanelOpen = true;

            if (isAdmin) {
                showConversationList();
            } else {
                // Non-admin goes directly to chat with admin
                openAdminChat();
            }
        }
    }

    /**
     * Close the messages panel (called externally)
     */
    function closePanel() {
        const panel = document.getElementById('messages-panel');
        if (panel && messagesPanelOpen) {
            panel.style.display = 'none';
            messagesPanelOpen = false;
            currentConversation = null;
        }
    }

    /**
     * Handle clicks outside the panel
     */
    function handleOutsideClick(event) {
        if (!messagesPanelOpen) return;

        const container = document.getElementById('messages-container');
        if (container && !container.contains(event.target)) {
            const panel = document.getElementById('messages-panel');
            panel.style.display = 'none';
            messagesPanelOpen = false;
            currentConversation = null;
        }
    }

    /**
     * Fetch unread message count
     */
    async function fetchUnreadCount() {
        try {
            const data = await fetchWithAuth('/messages/unread-count');
            updateBadge(data.count);
        } catch (e) {
            console.error('Failed to fetch message count:', e);
        }
    }

    /**
     * Update the badge count
     */
    function updateBadge(count) {
        const badge = document.getElementById('messages-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Show conversation list (admin only)
     */
    async function showConversationList(event) {
        if (event) event.stopPropagation();

        currentConversation = null;

        const content = document.getElementById('messages-content');
        const inputArea = document.getElementById('messages-input-area');
        const backBtn = document.getElementById('messages-back-btn');
        const deleteBtn = document.getElementById('messages-delete-btn');
        const searchBar = document.getElementById('messages-search-bar');
        const searchInput = document.getElementById('user-search-input');
        const title = document.getElementById('messages-panel-title');

        inputArea.style.display = 'none';
        backBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        searchBar.style.display = isAdmin ? 'flex' : 'none';
        if (searchInput) searchInput.value = '';
        title.textContent = 'Messages';
        content.innerHTML = '<div class="messages-loading">Loading...</div>';

        try {
            const data = await fetchWithAuth('/messages');

            if (data.conversations.length === 0) {
                content.innerHTML = `
                    <div class="messages-empty">
                        <p>No messages yet</p>
                        <p class="messages-empty-hint">Your conversations will appear here</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = data.conversations.map(conv => `
                <div class="conversation-item ${conv.unread_count > 0 ? 'has-unread' : ''}"
                     data-user-id="${conv.user_id}"
                     data-user-name="${escapeAttr(conv.user_name)}"
                     role="button"
                     tabindex="0">
                    <div class="conversation-avatar">
                        ${conv.user_profile_picture
                            ? `<img src="${conv.user_profile_picture}" alt="" />`
                            : `<span>${conv.user_name.charAt(0).toUpperCase()}</span>`
                        }
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${escapeHtml(conv.user_name)}</div>
                        <div class="conversation-preview">${escapeHtml(conv.last_message)}</div>
                    </div>
                    ${conv.unread_count > 0
                        ? `<span class="conversation-unread">${conv.unread_count}</span>`
                        : ''
                    }
                </div>
            `).join('');

            // Attach click handlers via event delegation
            attachConversationListeners();
        } catch (e) {
            content.innerHTML = '<div class="messages-error">Failed to load messages</div>';
        }
    }

    /**
     * Fetch admin's public_id from site-owner endpoint
     */
    async function fetchAdminPublicId() {
        if (adminPublicId) return adminPublicId;

        try {
            const response = await fetch(`${window.API_BASE}/users/site-owner`);
            if (response.ok) {
                const data = await response.json();
                adminPublicId = data.public_id;
                return adminPublicId;
            }
        } catch (e) {
            console.error('Failed to fetch admin public_id:', e);
        }
        return null;
    }

    /**
     * Open admin chat (for non-admin users)
     */
    async function openAdminChat() {
        const content = document.getElementById('messages-content');
        const title = document.getElementById('messages-panel-title');
        const inputArea = document.getElementById('messages-input-area');

        title.textContent = 'Chat with Josh';
        content.innerHTML = '<div class="messages-loading">Loading...</div>';

        try {
            // Fetch admin's public_id first
            const adminId = await fetchAdminPublicId();
            if (!adminId) {
                content.innerHTML = '<div class="messages-error">Could not connect to chat</div>';
                return;
            }

            // Check if we have existing messages with admin
            const data = await fetchWithAuth('/messages');

            if (data.conversations.length > 0) {
                // Open existing conversation
                openConversation(data.conversations[0].user_id, data.conversations[0].user_name);
            } else {
                // No conversation yet - show empty state with input ready to go
                content.innerHTML = getEphemeralHint() + `
                    <div class="messages-empty">
                        <p>Send a message to Josh</p>
                        <p class="messages-empty-hint">Start the conversation!</p>
                    </div>
                `;

                // Set currentConversation to admin's actual public_id
                currentConversation = adminId;
                inputArea.style.display = 'flex';

                // Focus input
                setTimeout(() => {
                    const input = document.getElementById('message-input');
                    if (input) input.focus();
                }, 100);
            }
        } catch (e) {
            content.innerHTML = '<div class="messages-error">Failed to load chat</div>';
        }
    }

    /**
     * Open a specific conversation
     */
    async function openConversation(userId, userName) {
        currentConversation = userId;

        const content = document.getElementById('messages-content');
        const inputArea = document.getElementById('messages-input-area');
        const backBtn = document.getElementById('messages-back-btn');
        const deleteBtn = document.getElementById('messages-delete-btn');
        const searchBar = document.getElementById('messages-search-bar');
        const title = document.getElementById('messages-panel-title');

        title.textContent = userName;
        backBtn.style.display = isAdmin ? 'flex' : 'none';
        deleteBtn.style.display = isAdmin ? 'flex' : 'none';
        searchBar.style.display = 'none';
        inputArea.style.display = 'flex';
        content.innerHTML = '<div class="messages-loading">Loading...</div>';

        try {
            const data = await fetchWithAuth(`/messages/${userId}`);

            if (data.messages.length === 0) {
                content.innerHTML = getEphemeralHint() + `
                    <div class="messages-empty">
                        <p>No messages yet</p>
                        <p class="messages-empty-hint">Start the conversation!</p>
                    </div>
                `;
            } else {
                renderMessages(data.messages);
            }

            // Update unread count
            fetchUnreadCount();

            // Focus input
            setTimeout(() => {
                const input = document.getElementById('message-input');
                if (input) input.focus();
            }, 100);
        } catch (e) {
            content.innerHTML = '<div class="messages-error">Failed to load messages</div>';
        }
    }

    /**
     * Get ephemeral hint HTML
     */
    function getEphemeralHint() {
        return `
            <div class="messages-ephemeral-hint" title="Oldest messages are automatically deleted when the limit is reached">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 22h14"/>
                    <path d="M5 2h14"/>
                    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
                    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
                </svg>
                <span>Ephemeral (30 max)</span>
            </div>
        `;
    }

    /**
     * Render messages in the chat
     */
    function renderMessages(messages) {
        const content = document.getElementById('messages-content');

        content.innerHTML = getEphemeralHint() + messages.map(msg => `
            <div class="message ${msg.is_mine ? 'message-mine' : 'message-theirs'}">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">${formatTime(msg.created_at)}</div>
            </div>
        `).join('');

        // Scroll to bottom
        content.scrollTop = content.scrollHeight;
    }

    /**
     * Append a single message to the chat
     */
    function appendMessage(msg) {
        const content = document.getElementById('messages-content');

        // Remove empty state if present
        const empty = content.querySelector('.messages-empty');
        if (empty) empty.remove();

        const msgEl = document.createElement('div');
        msgEl.className = `message ${msg.is_mine ? 'message-mine' : 'message-theirs'}`;
        msgEl.innerHTML = `
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${formatTime(msg.created_at)}</div>
        `;
        content.appendChild(msgEl);

        // Scroll to bottom
        content.scrollTop = content.scrollHeight;
    }

    /**
     * Send a message
     */
    async function sendMessage(event) {
        if (event) event.preventDefault();

        const input = document.getElementById('message-input');
        const messageContent = input.value.trim();

        if (!messageContent || !currentConversation) return;

        const recipientId = currentConversation;
        const sendBtn = document.getElementById('send-message-btn');

        input.value = '';
        input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        try {
            const msg = await fetchWithAuth(`/messages/${recipientId}`, {
                method: 'POST',
                body: JSON.stringify({ content: messageContent })
            });

            appendMessage(msg);
        } catch (e) {
            console.error('Failed to send message:', e);
            input.value = messageContent;  // Restore the message
        } finally {
            input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            input.focus();
        }
    }

    /**
     * Mark conversation as read
     */
    async function markConversationRead(userId) {
        try {
            await fetchWithAuth(`/messages/${userId}/read-all`, { method: 'PUT' });
            fetchUnreadCount();
        } catch (e) {
            console.error('Failed to mark as read:', e);
        }
    }

    /**
     * Delete entire conversation (admin only)
     */
    async function deleteConversation() {
        if (!currentConversation || !isAdmin) return;

        const confirmed = confirm('Delete this entire conversation? This cannot be undone.');
        if (!confirmed) return;

        try {
            await fetchWithAuth(`/messages/${currentConversation}`, { method: 'DELETE' });

            // Go back to conversation list
            showConversationList();
            fetchUnreadCount();
        } catch (e) {
            console.error('Failed to delete conversation:', e);
            alert('Failed to delete conversation');
        }
    }

    /**
     * Search users by name
     */
    async function searchUsers(query) {
        const content = document.getElementById('messages-content');
        if (!content || !query.trim()) return;

        content.innerHTML = '<div class="messages-loading">Searching...</div>';

        try {
            const data = await fetchWithAuth(`/users/search?q=${encodeURIComponent(query)}`);

            if (data.length === 0) {
                content.innerHTML = '<div class="messages-empty"><p>No users found</p></div>';
                return;
            }

            content.innerHTML = data.map(user => `
                <div class="user-search-item"
                     data-user-id="${user.id}"
                     data-user-name="${escapeAttr(user.name)}"
                     role="button"
                     tabindex="0">
                    <div class="conversation-avatar">
                        <span>${user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="user-search-name">${escapeHtml(user.name)}</div>
                </div>
            `).join('');

            // Attach click handlers
            content.querySelectorAll('.user-search-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();  // Prevent bubbling to outside-click handler
                    const userId = this.dataset.userId;
                    const userName = this.dataset.userName;
                    if (userId && userName) {
                        openConversation(userId, userName);
                    }
                });
            });
        } catch (e) {
            console.error('Search failed:', e);
            content.innerHTML = '<div class="messages-error">Search failed</div>';
        }
    }

    /**
     * Format timestamp (backend sends UTC without 'Z', so we add it)
     */
    function formatTime(dateString) {
        // Ensure the date is parsed as UTC by appending 'Z' if missing
        let isoString = dateString;
        if (!dateString.endsWith('Z') && !dateString.includes('+')) {
            isoString = dateString + 'Z';
        }

        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        // Today - show time
        if (diff < 86400000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // This week - show day
        if (diff < 604800000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }

        // Older - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape for HTML attributes
     */
    function escapeAttr(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Attach click listeners to conversation items (event delegation)
     */
    function attachConversationListeners() {
        const content = document.getElementById('messages-content');
        if (!content) return;

        content.addEventListener('click', handleConversationClick);
        content.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                handleConversationClick(e);
            }
        });
    }

    /**
     * Handle click on conversation item
     */
    function handleConversationClick(e) {
        const item = e.target.closest('.conversation-item');
        if (!item) return;

        e.preventDefault();
        e.stopPropagation();

        const userId = item.dataset.userId;
        const userName = item.dataset.userName;

        if (userId && userName) {
            openConversation(userId, userName);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMessages);
    } else {
        initMessages();
    }

    // Export functions for global access
    window.MessagesComponent = {
        togglePanel,
        closePanel,
        showConversationList,
        openConversation,
        sendMessage
    };
})();
