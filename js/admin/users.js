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

function renderUsers() {
    const container = document.getElementById('users-list');

    if (allUsers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No users yet.</p>';
        return;
    }

    const visibleUsers = allUsers.slice(0, usersVisible);
    const hasMore = allUsers.length > usersVisible;

    container.innerHTML = visibleUsers.map(user => `
        <div class="post-item">
            <div class="post-item-info">
                <h3>${escapeHtml(user.name)}</h3>
                <div class="meta">
                    ${user.email}
                    &middot; <span class="badge ${user.is_admin ? 'badge-published' : 'badge-draft'}">${user.is_admin ? 'Admin' : 'User'}</span>
                    &middot; Joined: ${formatDate(user.created_at)}
                </div>
            </div>
            <div class="post-item-actions">
                <button class="btn" onclick="editUserName(${user.id}, '${escapeHtml(user.name).replace(/'/g, "\\'")}')">Rename</button>
                ${!user.is_admin ? `<button class="btn" onclick="deleteUser(${user.id})" style="background: #e74c3c; color: white;">Delete</button>` : ''}
            </div>
        </div>
    `).join('') + (hasMore ? `
        <button class="btn" onclick="showMoreUsers()" style="width: 100%; margin-top: 0.5rem; background: #f3f4f6; color: #374151;">
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
async function deleteUser(userId) {
    if (!confirm('Delete this user? This will also delete all their comments.')) return;

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
