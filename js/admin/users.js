/**
 * Admin Users Tab - User management functionality
 */

// Load all users
async function loadUsers() {
    const token = localStorage.getItem('comment_token');
    const container = document.getElementById('users-list');

    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allUsers = await response.json();
            usersVisible = PAGE_SIZE;
            renderUsers();
        }
    } catch (error) {
        container.innerHTML = '<p class="error-message">Failed to load users</p>';
    }
}

function getUserBadge(user) {
    if (user.is_admin) {
        return { class: 'badge-published', label: 'Admin' };
    }
    if (user.is_approved) {
        return { class: 'badge-friend', label: 'Friend' };
    }
    // Check for active or canceled-but-still-valid subscription
    const hasActiveSubscription = user.subscription_status === 'active' ||
        (user.subscription_status === 'canceled' && user.subscription_ends_at && new Date(user.subscription_ends_at) > new Date());
    if (hasActiveSubscription) {
        return { class: 'badge-subscriber', label: 'Subscriber' };
    }
    return { class: 'badge-draft', label: 'User' };
}

function isPayingSubscriber(user) {
    return user.subscription_status === 'active' ||
        (user.subscription_status === 'canceled' && user.subscription_ends_at && new Date(user.subscription_ends_at) > new Date());
}

function renderUsers() {
    const container = document.getElementById('users-list');

    if (allUsers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No users yet.</p>';
        return;
    }

    const visibleUsers = allUsers.slice(0, usersVisible);
    const hasMore = allUsers.length > usersVisible;

    container.innerHTML = visibleUsers.map(user => {
        const badge = getUserBadge(user);
        const isPaying = isPayingSubscriber(user);
        return `
        <div class="post-item">
            <div class="post-item-info">
                <h3>${escapeHtml(user.name)}</h3>
                <div class="meta">
                    ${user.email}
                    &middot; <span class="badge ${badge.class}">${badge.label}</span>
                    &middot; Joined: ${formatDate(user.created_at)}
                </div>
            </div>
            <div class="post-item-actions">
                <button class="btn" onclick="editUserName(${user.id}, '${escapeHtml(user.name).replace(/'/g, "\\'")}')">Rename</button>
                ${!user.is_admin ? `<button class="btn" onclick="deleteUser(${user.id}, ${isPaying})" style="background: #e74c3c; color: white;">Delete</button>` : ''}
            </div>
        </div>
    `}).join('') + (hasMore ? `
        <button class="btn" onclick="showMoreUsers()" style="width: 100%; margin-top: 0.5rem; background: var(--bg-tertiary, #1e1c21); color: var(--text-primary, #f5f2ed);">
            Show more (${allUsers.length - usersVisible} remaining)
        </button>
    ` : '');
}

function showMoreUsers() {
    usersVisible += PAGE_SIZE;
    renderUsers();
}

// Edit user name
function editUserName(userId, currentName) {
    const newName = prompt('Enter new name:', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        updateUserName(userId, newName.trim());
    }
}

async function updateUserName(userId, newName) {
    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName })
        });

        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to update user', 'error');
        }
    } catch (error) {
        showToast('Failed to update user', 'error');
    }
}

// Delete user
async function deleteUser(userId, isPaying = false) {
    let confirmMessage = 'Delete this user? This will also delete all their comments.';

    if (isPaying) {
        confirmMessage = '⚠️ This is a PAYING SUBSCRIBER!\n\nDeleting them will:\n• Remove their account and comments\n• NOT automatically cancel their Stripe subscription\n\nYou should cancel their subscription in Stripe first, or they may continue to be billed.\n\nAre you sure you want to delete this user?';
    }

    if (!confirm(confirmMessage)) return;

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadUsers();
        } else {
            showToast('Failed to delete user', 'error');
        }
    } catch (error) {
        showToast('Failed to delete user', 'error');
    }
}
