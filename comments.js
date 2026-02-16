// Comments System
// Connects to api.joshfreeman.me for comment data

const API_BASE = 'https://api.joshfreeman.me';

// Get post slug from URL
function getPostSlug() {
    const path = window.location.pathname;
    const match = path.match(/\/blog\/([^\/]+)\.html$/);
    return match ? match[1] : null;
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

// Render comments
function renderComments(comments) {
    const container = document.getElementById('comments-container');

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        return;
    }

    const html = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(comment.author_name)}</span>
                <span class="comment-date">${formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-body">
                <p>${escapeHtml(comment.content)}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
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
        const response = await fetch(`${API_BASE}/comments/${slug}`);
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
        container.innerHTML = `
            <form class="comment-form" onsubmit="submitComment(event)">
                <p style="margin-bottom: 0.5rem; color: var(--text-muted);">
                    Commenting as <strong>${escapeHtml(user.name)}</strong>
                    (<a href="#" onclick="logout(); return false;">logout</a>)
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
        const response = await fetch(`${API_BASE}/auth/login`, {
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
        errorEl.textContent = 'Login service not available yet';
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
        const response = await fetch(`${API_BASE}/comments`, {
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    updateCommentForm();
});
