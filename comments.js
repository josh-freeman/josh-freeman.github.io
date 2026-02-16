// Comments System
// Connects to api.joshfreeman.me for comment data

// Use window.COMMENTS_API_BASE to avoid conflicts with page scripts
// Pages can define COMMENTS_API_BASE before this script loads to override
if (typeof window.COMMENTS_API_BASE === 'undefined') {
    window.COMMENTS_API_BASE = 'https://api.joshfreeman.me';
}

// Get post slug from URL - can be overridden by page
if (typeof getPostSlug === 'undefined') {
    var getPostSlug = function() {
        // Try URL parameter first
        const params = new URLSearchParams(window.location.search);
        const paramSlug = params.get('slug');
        if (paramSlug) return paramSlug;

        // Fall back to path-based slug
        const path = window.location.pathname;
        const match = path.match(/\/blog\/([^\/]+)\.html$/);
        return match ? match[1] : null;
    };
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Track which comments the user has liked
let userLikedComments = new Set();

// Render comments
function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const user = getUser();

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        return;
    }

    const html = comments.map(comment => {
        const canEdit = user && (user.id === comment.author_id || user.is_admin);
        const canDelete = user && (user.id === comment.author_id || user.is_admin);
        const isLiked = userLikedComments.has(comment.id);

        return `
            <div class="comment" data-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.author_name)}</span>
                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                    ${canEdit || canDelete ? `
                        <span class="comment-actions">
                            ${canEdit ? `<button class="btn-link" onclick="editComment(${comment.id}, '${escapeHtml(comment.content).replace(/'/g, "\\'")}')">edit</button>` : ''}
                            ${canDelete ? `<button class="btn-link btn-danger" onclick="deleteComment(${comment.id})">delete</button>` : ''}
                        </span>
                    ` : ''}
                </div>
                <div class="comment-body">
                    <p>${escapeHtml(comment.content)}</p>
                </div>
                <div class="comment-footer" style="margin-top: 0.5rem;">
                    <button onclick="toggleCommentLike(${comment.id})" style="background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--text-muted);" id="like-btn-${comment.id}">
                        <span id="like-icon-${comment.id}">${isLiked ? '❤️' : '🤍'}</span>
                        <span id="like-count-${comment.id}">${comment.like_count || 0}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Load user's likes if logged in
    if (user) {
        loadUserLikes(comments.map(c => c.id));
    }
}

// Load which comments the user has liked
async function loadUserLikes(commentIds) {
    const token = localStorage.getItem('comment_token');
    if (!token) return;

    for (const commentId of commentIds) {
        try {
            const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${commentId}/likes/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user_liked) {
                    userLikedComments.add(commentId);
                    document.getElementById(`like-icon-${commentId}`).textContent = '❤️';
                }
            }
        } catch (e) {}
    }
}

// Toggle like on a comment
async function toggleCommentLike(commentId) {
    const token = localStorage.getItem('comment_token');
    if (!token) {
        alert('Please log in to like comments');
        return;
    }

    const isLiked = userLikedComments.has(commentId);
    const method = isLiked ? 'DELETE' : 'POST';

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${commentId}/likes`, {
            method,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById(`like-count-${commentId}`).textContent = data.count;
            document.getElementById(`like-icon-${commentId}`).textContent = data.user_liked ? '❤️' : '🤍';

            if (data.user_liked) {
                userLikedComments.add(commentId);
            } else {
                userLikedComments.delete(commentId);
            }
        } else if (response.status === 401) {
            alert('Please log in to like comments');
        }
    } catch (error) {
        console.log('Could not update like');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load comments
async function loadComments() {
    const slug = getPostSlug();
    if (!slug) return;

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${slug}`);
        if (response.ok) {
            const comments = await response.json();
            renderComments(comments);
        } else {
            document.getElementById('comments-container').innerHTML =
                '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        }
    } catch (error) {
        console.log('Comments API not available yet');
        document.getElementById('comments-container').innerHTML =
            '<p class="no-comments">Comments coming soon.</p>';
    }
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('comment_token');
    return token !== null;
}

// Get stored user info
function getUser() {
    const userStr = localStorage.getItem('comment_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Show comment form if logged in
function updateCommentForm() {
    const container = document.getElementById('comment-form-container');
    const user = getUser();

    if (user) {
        const adminLink = user.is_admin ? ' &middot; <a href="/admin.html">admin</a>' : '';
        container.innerHTML = `
            <form class="comment-form" onsubmit="submitComment(event)">
                <p style="margin-bottom: 0.5rem; color: var(--text-muted);">
                    Commenting as <strong>${escapeHtml(user.name)}</strong>
                    (<a href="#" onclick="logout(); return false;">logout</a>${adminLink})
                </p>
                <textarea
                    id="comment-content"
                    placeholder="Write a comment..."
                    required
                ></textarea>
                <button type="submit" class="btn btn-primary">Post Comment</button>
            </form>
        `;
    } else {
        container.innerHTML = `
            <p class="comment-login-notice">
                Comments are invite-only. <a href="#" onclick="showLogin(); return false;">Log in</a> to leave a comment.
            </p>
        `;
    }
}

// Show login modal
function showLogin() {
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin-bottom: 1rem;">Log in to comment</h3>
            <form onsubmit="handleLogin(event)">
                <input
                    type="email"
                    id="login-email"
                    placeholder="Email"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                >
                <input
                    type="password"
                    id="login-password"
                    placeholder="Password"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                >
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Log in</button>
                    <button type="button" onclick="closeLogin()" class="btn" style="flex: 1; background: #e0e0e0;">Cancel</button>
                </div>
                <p id="login-error" style="color: #e74c3c; margin-top: 1rem; display: none;"></p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Close login modal
function closeLogin() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.remove();
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('comment_token', data.token);
            localStorage.setItem('comment_user', JSON.stringify(data.user));
            closeLogin();
            updateCommentForm();
        } else {
            const error = await response.json();
            errorEl.textContent = error.detail || 'Invalid credentials';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Unable to connect. Please try again.';
        errorEl.style.display = 'block';
    }
}

// Logout
function logout() {
    localStorage.removeItem('comment_token');
    localStorage.removeItem('comment_user');
    updateCommentForm();
}

// Submit comment
async function submitComment(event) {
    event.preventDefault();
    const content = document.getElementById('comment-content').value;
    const slug = getPostSlug();
    const token = localStorage.getItem('comment_token');

    if (!content || !slug || !token) return;

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post_slug: slug, content })
        });

        if (response.ok) {
            document.getElementById('comment-content').value = '';
            loadComments();
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to post comment');
        }
    } catch (error) {
        alert('Comment service not available yet');
    }
}

// Edit comment
function editComment(commentId, currentContent) {
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin-bottom: 1rem;">Edit Comment</h3>
            <form onsubmit="submitEdit(event, ${commentId})">
                <textarea
                    id="edit-content"
                    style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; resize: vertical;"
                >${currentContent}</textarea>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save</button>
                    <button type="button" onclick="closeEditModal()" class="btn" style="flex: 1; background: #e0e0e0;">Cancel</button>
                </div>
                <p id="edit-error" style="color: #e74c3c; margin-top: 1rem; display: none;"></p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.remove();
}

async function submitEdit(event, commentId) {
    event.preventDefault();
    const content = document.getElementById('edit-content').value;
    const token = localStorage.getItem('comment_token');
    const errorEl = document.getElementById('edit-error');

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            closeEditModal();
            loadComments();
        } else {
            const error = await response.json();
            errorEl.textContent = error.detail || 'Failed to edit comment';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Failed to edit comment';
        errorEl.style.display = 'block';
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadComments();
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to delete comment');
        }
    } catch (error) {
        alert('Failed to delete comment');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    updateCommentForm();
});
