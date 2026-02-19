/**
 * Admin Core - Shared functionality for admin panel
 */

// Global state
let currentSlug = null;
const PAGE_SIZE = 10;
let allPosts = [];
let allInvites = [];
let allUsers = [];
let postsVisible = PAGE_SIZE;
let invitesVisible = PAGE_SIZE;
let usersVisible = PAGE_SIZE;
let existingSlugs = [];

// Toast notification
function showToast(message, type = 'default') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Check if already logged in
function checkAuth() {
    const token = localStorage.getItem('comment_token');
    const user = localStorage.getItem('comment_user');

    if (token && user) {
        const userData = JSON.parse(user);
        if (userData.is_admin) {
            showAdminPanel(userData);
            return true;
        }
    }
    return false;
}

function showAdminPanel(user) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('user-name').textContent = user.name;
    loadPosts();
}

async function handleLogin(event) {
    event.preventDefault();

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.login : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            if (!data.user.is_admin) {
                errorEl.textContent = 'Admin access required';
                errorEl.style.display = 'block';
                guard.end();
                return;
            }
            localStorage.setItem('comment_token', data.token);
            localStorage.setItem('comment_user', JSON.stringify(data.user));
            showAdminPanel(data.user);
        } else {
            const error = await response.json();
            errorEl.textContent = error.detail || 'Invalid credentials';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Login failed';
        errorEl.style.display = 'block';
    } finally {
        guard.end();
    }
}

function logout() {
    localStorage.removeItem('comment_token');
    localStorage.removeItem('comment_user');
    location.reload();
}

// Tab switching
function showTab(tab) {
    // Hide all views
    document.getElementById('post-list-view').style.display = 'none';
    document.getElementById('post-editor-view').style.display = 'none';
    document.getElementById('invites-view').style.display = 'none';
    document.getElementById('users-view').style.display = 'none';
    document.getElementById('images-view').style.display = 'none';

    // Reset tab styles
    document.getElementById('tab-posts').style.fontWeight = 'normal';
    document.getElementById('tab-invites').style.fontWeight = 'normal';
    document.getElementById('tab-users').style.fontWeight = 'normal';
    document.getElementById('tab-images').style.fontWeight = 'normal';

    // Show selected tab
    if (tab === 'posts') {
        document.getElementById('post-list-view').style.display = 'block';
        document.getElementById('tab-posts').style.fontWeight = '600';
        loadPosts();
        loadPostTemplate();
        loadReplyTemplate();
    } else if (tab === 'invites') {
        document.getElementById('invites-view').style.display = 'block';
        document.getElementById('tab-invites').style.fontWeight = '600';
        loadInvites();
        loadInviteTemplate();
        loadInviteReminderTemplate();
    } else if (tab === 'users') {
        document.getElementById('users-view').style.display = 'block';
        document.getElementById('tab-users').style.fontWeight = '600';
        loadUsers();
    } else if (tab === 'images') {
        document.getElementById('images-view').style.display = 'block';
        document.getElementById('tab-images').style.fontWeight = '600';
        loadImages();
    }
}

// Shared utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Write/Preview tab switching for email templates
function showTemplateTab(templateType, tab) {
    const tabsContainer = document.querySelector(`#${templateType}-tpl-body`).closest('.form-group');
    const tabs = tabsContainer.querySelectorAll('.html-editor-tab');
    const textarea = document.getElementById(`${templateType}-tpl-body`);
    const preview = document.getElementById(`${templateType}-tpl-preview`);
    const iframe = document.getElementById(`${templateType}-tpl-iframe`);

    tabs.forEach((t, i) => {
        t.classList.toggle('active', (tab === 'write' && i === 0) || (tab === 'preview' && i === 1));
    });

    if (tab === 'write') {
        textarea.style.display = 'block';
        preview.classList.remove('active');
    } else {
        textarea.style.display = 'none';
        preview.classList.add('active');

        const html = textarea.value;
        const baseUrl = window.location.origin;
        const sampleData = templateType === 'invite' ? {
            name: 'John Doe',
            url: `${baseUrl}/register.html?token=SAMPLE_TOKEN`,
            expires: '7 days'
        } : {
            name: 'John Doe',
            url: `${baseUrl}/blog/post.html?slug=sample-post`,
            title: 'My Awesome Blog Post',
            excerpt: 'This is a sample excerpt that shows what the post preview will look like...'
        };

        let renderedHtml = html;
        Object.entries(sampleData).forEach(([key, value]) => {
            renderedHtml = renderedHtml.replace(new RegExp(`\\{${key}\\}`, 'g'), escapeHtml(value));
        });

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                </style>
            </head>
            <body>${renderedHtml}</body>
            </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
            try {
                iframe.style.height = Math.max(200, iframeDoc.body.scrollHeight + 32) + 'px';
            } catch (e) {}
        }, 50);
    }
}

// Handle hash-based navigation for editing posts
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#edit/')) {
        const slug = hash.substring(6);
        if (slug) {
            showEditor(slug);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof setupImageUpload === 'function') {
        setupImageUpload();
    }
    if (!checkAuth()) {
        document.getElementById('login-section').style.display = 'block';
    } else {
        handleHashNavigation();
    }
});

window.addEventListener('hashchange', handleHashNavigation);
