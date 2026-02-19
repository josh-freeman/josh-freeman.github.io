// Comments System
// Connects to api.joshfreeman.me for comment data

// Use window.COMMENTS_API_BASE to avoid conflicts with page scripts
// Pages can define COMMENTS_API_BASE before this script loads to override
if (typeof window.COMMENTS_API_BASE === 'undefined') {
    window.COMMENTS_API_BASE = 'https://api.joshfreeman.me';
}

// SVG heart icons
const HEART_SVG_PATH = 'M12 21C12 21 3 14.5 3 8.5C3 5.5 5.5 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.5 3 21 5.5 21 8.5C21 14.5 12 21 12 21Z';
const HEART_OUTLINE = `<svg class="comment-heart-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${HEART_SVG_PATH}"/></svg>`;
const HEART_FILLED = `<svg class="comment-heart-icon active" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="${HEART_SVG_PATH}"/></svg>`;

// Inject comment styles early
(function() {
    if (!document.getElementById('comment-styles')) {
        const style = document.createElement('style');
        style.id = 'comment-styles';
        style.textContent = `
            .comment-heart-icon {
                color: var(--text-muted, #8a857c);
                transition: all 0.15s ease;
                vertical-align: middle;
            }
            .comment-heart-icon.active {
                color: #ef4444;
            }
            .like-btn:hover .comment-heart-icon:not(.active) {
                color: #fca5a5;
            }

            /* Nested comments */
            .comment-replies {
                margin-left: 0.75rem;
                padding-left: 0.75rem;
                border-left: 2px solid var(--border-default, rgba(255, 255, 255, 0.1));
                margin-top: 0.5rem;
            }
            .comment-replies .comment {
                margin-bottom: 0.75rem;
                padding-bottom: 0.75rem;
            }
            .comment-replies .comment:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }
            .reply-btn {
                background: none;
                border: none;
                color: var(--text-muted, #8a857c);
                font-size: 0.8rem;
                cursor: pointer;
                padding: 0;
                margin-left: 0.75rem;
            }
            .reply-btn:hover {
                color: var(--accent-primary, #e5a54b);
            }
            .reply-form {
                margin-top: 0.75rem;
                margin-left: 1.5rem;
                padding-left: 1rem;
                border-left: 2px solid var(--border-default, rgba(255, 255, 255, 0.1));
            }
            .reply-form textarea {
                width: 100%;
                min-height: 60px;
                padding: 0.5rem;
                border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
                border-radius: 6px;
                font-size: 0.9rem;
                resize: vertical;
                font-family: inherit;
                background: var(--bg-secondary, #151418);
                color: var(--text-primary, #f5f2ed);
            }
            .reply-form-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            .reply-form-actions button {
                padding: 0.35rem 0.75rem;
                border-radius: 6px;
                font-size: 0.85rem;
                cursor: pointer;
            }
            .reply-form-actions .submit-reply {
                background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a));
                color: var(--bg-primary, #0c0b0d);
                border: none;
                font-weight: 500;
            }
            .reply-form-actions .cancel-reply {
                background: var(--bg-tertiary, #1e1c21);
                border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
                color: var(--text-primary, #f5f2ed);
            }
        `;
        document.head.appendChild(style);
    }
})();

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

// Render a single comment (used for both top-level and replies)
function renderSingleComment(comment, user, isReply = false) {
    const canEdit = user && (user.id === comment.author_id || user.is_admin);
    const canDelete = user && (user.id === comment.author_id || user.is_admin);
    const isLiked = userLikedComments.has(comment.id);
    const canReply = user && !isReply; // Only top-level comments can have replies

    return `
        <div class="comment" data-id="${comment.id}">
            <div class="comment-header">
                <a href="/profile.html?id=${comment.author_id}" class="comment-author">${escapeHtml(comment.author_name)}</a>
                <span class="comment-date">${formatDate(comment.created_at)}</span>
                ${canEdit || canDelete ? `
                    <span class="comment-actions">
                        ${canEdit ? `<button class="btn-link" onclick="editComment(${comment.id}, '${escapeHtml(comment.content).replace(/'/g, "\\'").replace(/\n/g, "\\n")}')">edit</button>` : ''}
                        ${canDelete ? `<button class="btn-link btn-danger" onclick="deleteComment(${comment.id})">delete</button>` : ''}
                    </span>
                ` : ''}
            </div>
            <div class="comment-body">
                <p>${escapeHtml(comment.content)}</p>
            </div>
            <div class="comment-footer">
                <button onclick="toggleCommentLike(${comment.id})" class="like-btn" id="like-btn-${comment.id}">
                    <span id="like-icon-${comment.id}">${isLiked ? HEART_FILLED : HEART_OUTLINE}</span>
                    <span id="like-count-${comment.id}">${comment.like_count || 0}</span>
                </button>
                ${comment.like_count > 0 ? `<button onclick="showCommentLikers(${comment.id}, event)" class="see-who-btn">see who</button>` : ''}
                ${canReply ? `<button class="reply-btn" onclick="showReplyForm(${comment.id}, '${escapeHtml(comment.author_name).replace(/'/g, "\\'")}')">reply</button>` : ''}
            </div>
            <div id="reply-form-${comment.id}"></div>
            ${!isReply && comment.replies && comment.replies.length > 0 ? `
                <div class="comment-replies">
                    ${comment.replies.map(reply => renderSingleComment(reply, user, true)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Render comments
function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const user = getUser();

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        return;
    }

    // Pre-populate userLikedComments from the liked_by_me field in comments
    userLikedComments.clear();
    function collectLikes(c) {
        if (c.liked_by_me) userLikedComments.add(c.id);
        if (c.replies) c.replies.forEach(collectLikes);
    }
    comments.forEach(collectLikes);

    const html = comments.map(comment => renderSingleComment(comment, user, false)).join('');
    container.innerHTML = html;
}

// Show reply form
function showReplyForm(parentId, parentAuthorName) {
    const container = document.getElementById(`reply-form-${parentId}`);
    if (!container) return;

    // Close any other open reply forms
    document.querySelectorAll('[id^="reply-form-"]').forEach(el => {
        if (el.id !== `reply-form-${parentId}`) el.innerHTML = '';
    });

    const user = getUser();
    const isAdmin = user && user.is_admin;

    // Admin can notify the parent comment author
    const notifyOption = isAdmin ? `
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary, #c2bdb4); cursor: pointer;" onclick="toggleReplyNotify(${parentId})">
            <input type="checkbox" id="reply-notify-${parentId}" style="display: none;">
            <span class="custom-checkbox-reply">
                <svg class="unchecked" width="18" height="18" viewBox="0 0 24 24" style="color: var(--text-muted, #8a857c);"><use href="/resources/icons.svg#checkbox-empty"></use></svg>
                <svg class="checked" width="18" height="18" viewBox="0 0 24 24" style="color: var(--accent-primary, #e5a54b); display:none;"><use href="/resources/icons.svg#checkbox-checked"></use></svg>
            </span>
            <span>Email notify <strong>${escapeHtml(parentAuthorName || 'author')}</strong></span>
        </label>
    ` : '';

    container.innerHTML = `
        <div class="reply-form">
            <textarea id="reply-content-${parentId}" placeholder="Write a reply..."></textarea>
            ${notifyOption}
            <div class="reply-form-actions">
                <button class="submit-reply" onclick="submitReply(${parentId})">Reply</button>
                <button class="cancel-reply" onclick="hideReplyForm(${parentId})">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById(`reply-content-${parentId}`).focus();
}

// Hide reply form
function hideReplyForm(parentId) {
    const container = document.getElementById(`reply-form-${parentId}`);
    if (container) container.innerHTML = '';
}

// Toggle reply notify checkbox
function toggleReplyNotify(parentId) {
    const input = document.getElementById(`reply-notify-${parentId}`);
    if (!input) return;
    input.checked = !input.checked;
    const label = input.closest('label');
    if (label) {
        const unchecked = label.querySelector('.unchecked');
        const checked = label.querySelector('.checked');
        if (unchecked && checked) {
            unchecked.style.display = input.checked ? 'none' : '';
            checked.style.display = input.checked ? '' : 'none';
        }
    }
}

// Submit reply (with loading guard per parent)
async function submitReply(parentId) {
    // Get or create guard for this parent
    const guard = typeof getOrCreateGuard === 'function'
        ? getOrCreateGuard(loadingGuards?.replySubmit || {}, parentId)
        : { start: () => true, end: () => {} };

    if (!guard.start()) return; // Already submitting

    const textarea = document.getElementById(`reply-content-${parentId}`);
    const content = textarea.value.trim();
    if (!content) {
        guard.end();
        return;
    }

    const slug = getPostSlug();
    const token = localStorage.getItem('comment_token');
    if (!token) {
        alert('Please log in to reply');
        guard.end();
        return;
    }

    // Check if admin wants to notify parent author
    const notifyCheckbox = document.getElementById(`reply-notify-${parentId}`);
    const notifyAuthor = notifyCheckbox ? notifyCheckbox.checked : false;

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post_slug: slug,
                content: content,
                parent_id: parentId,
                notify_parent_author: notifyAuthor
            })
        });

        if (response.ok) {
            hideReplyForm(parentId);
            loadComments(); // Reload all comments
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to post reply');
        }
    } catch (error) {
        alert('Failed to post reply');
    } finally {
        guard.end();
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
                    document.getElementById(`like-icon-${commentId}`).innerHTML = HEART_FILLED;
                }
            }
        } catch (e) {}
    }
}

// Toggle like on a comment (with loading guard per comment)
async function toggleCommentLike(commentId) {
    // Get or create guard for this comment
    const guard = typeof getOrCreateGuard === 'function'
        ? getOrCreateGuard(loadingGuards?.commentLike || {}, commentId)
        : { start: () => true, end: () => {} };

    if (!guard.start()) return; // Already processing

    const token = localStorage.getItem('comment_token');
    if (!token) {
        alert('Please log in to like comments');
        guard.end();
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
            document.getElementById(`like-icon-${commentId}`).innerHTML = data.user_liked ? HEART_FILLED : HEART_OUTLINE;

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
    } finally {
        guard.end();
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
        // Include auth token if logged in (needed for exclusive posts)
        // Also include credentials for temporary access cookies
        const token = localStorage.getItem('comment_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${slug}`, { headers, credentials: 'include' });
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
            <form class="comment-form" onsubmit="submitComment(event)" style="position: relative;">
                <p style="margin-bottom: 0.5rem; color: var(--text-muted);">
                    Commenting as <strong>${escapeHtml(user.name)}</strong>
                    (<a href="#" onclick="logout(); return false;">logout</a>${adminLink})
                </p>
                <textarea
                    id="comment-content"
                    placeholder="Write a comment... (use @ to mention users)"
                    required
                ></textarea>
                <div id="mention-dropdown" class="mention-dropdown" style="display: none;"></div>
                <button type="submit" class="btn btn-primary">Post Comment</button>
            </form>
        `;

        // Setup @mention autocomplete
        const textarea = document.getElementById('comment-content');
        if (textarea) {
            setupMentionAutocomplete(textarea, document.getElementById('mention-dropdown'));
        }
    } else {
        container.innerHTML = `
            <p class="comment-login-notice">
                <a href="#" onclick="showLogin(); return false;">Log in</a> to leave a comment.
            </p>
            <p style="background: var(--bg-tertiary, #1e1c21); color: var(--text-secondary, #c4bfb6); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; margin-top: 0.5rem; border-left: 4px solid var(--accent-primary, #e5a54b);">
                <strong style="color: var(--text-accent, #e8c574);">Looking for a signup link?</strong> There isn't one! Comments are invite-only. Ask me (Josh :) for an invite if you think I forgot to send you one!
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
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary, #f5f2ed);">Log in to comment</h3>
            <div style="background: var(--bg-tertiary, #1e1c21); color: var(--text-secondary, #c4bfb6); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1rem; border-left: 4px solid var(--accent-primary, #e5a54b);">
                <strong style="color: var(--text-accent, #e8c574);">No signup?</strong> Correct! This is invite-only. Ask me (Josh :) if you think I forgot to send you one!
            </div>
            <form onsubmit="handleLogin(event)">
                <input
                    type="email"
                    id="login-email"
                    placeholder="Email"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed);"
                >
                <input
                    type="password"
                    id="login-password"
                    placeholder="Password"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed);"
                >
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Log in</button>
                    <button type="button" onclick="closeLogin()" class="btn" style="flex: 1;">Cancel</button>
                </div>
                <p id="login-error" style="color: var(--error, #d4726a); margin-top: 1rem; display: none;"></p>
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

// Handle login form submission (with loading guard)
async function handleLogin(event) {
    event.preventDefault();

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.login : { start: () => true, end: () => {} };
    if (!guard.start()) return;

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
            // Refresh page to show newly accessible content (exclusive posts, comments, etc.)
            window.location.reload();
        } else {
            const error = await response.json();
            errorEl.textContent = error.detail || 'Invalid credentials';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Unable to connect. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        guard.end();
    }
}

// Logout
function logout() {
    localStorage.removeItem('comment_token');
    localStorage.removeItem('comment_user');
    updateCommentForm();
}

// Submit comment (with loading guard)
async function submitComment(event) {
    event.preventDefault();

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.commentSubmit : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const content = document.getElementById('comment-content').value;
    const slug = getPostSlug();
    const token = localStorage.getItem('comment_token');

    if (!content || !slug || !token) {
        guard.end();
        return;
    }

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
    } finally {
        guard.end();
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
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary, #f5f2ed);">Edit Comment</h3>
            <form onsubmit="submitEdit(event, ${commentId})">
                <textarea
                    id="edit-content"
                    style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; resize: vertical; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed);"
                >${currentContent}</textarea>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save</button>
                    <button type="button" onclick="closeEditModal()" class="btn" style="flex: 1;">Cancel</button>
                </div>
                <p id="edit-error" style="color: var(--error, #d4726a); margin-top: 1rem; display: none;"></p>
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

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.commentEdit : { start: () => true, end: () => {} };
    if (!guard.start()) return;

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
    } finally {
        guard.end();
    }
}

// Delete comment (with loading guard)
async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.commentDelete : { start: () => true, end: () => {} };
    if (!guard.start()) return;

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
    } finally {
        guard.end();
    }
}

// Show who liked a comment (public) - in a modal
async function showCommentLikers(commentId, event) {
    event.stopPropagation();

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments/${commentId}/likers`);

        if (response.ok) {
            const data = await response.json();
            showLikersModal(data.likers);
        }
    } catch (error) {
        console.log('Could not load likers');
    }
}

// Show likers modal
function showLikersModal(likers, title = 'Liked by') {
    const modal = document.createElement('div');
    modal.id = 'likers-modal';
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

    const likersList = likers.length > 0
        ? likers.map(l => `<li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));"><a href="/profile.html?id=${l.id}" style="color: var(--text-primary, #f5f2ed); text-decoration: none; font-weight: 500;">${escapeHtml(l.name)}</a> <span style="color: var(--text-muted, #8a857c); font-size: 0.85rem;">(${new Date(l.liked_at).toLocaleDateString()})</span></li>`).join('')
        : '<li style="color: var(--text-muted, #8a857c);">No likes yet</li>';

    modal.innerHTML = `
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 1.5rem; border-radius: 12px; max-width: 350px; width: 90%; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary, #f5f2ed);">${title}</h3>
            <ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
                ${likersList}
            </ul>
            <button onclick="document.getElementById('likers-modal').remove()" style="margin-top: 1rem; width: 100%; padding: 0.75rem; background: var(--bg-tertiary, #1e1c21); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; cursor: pointer; color: var(--text-primary, #f5f2ed);">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// @mention autocomplete
let mentionState = {
    active: false,
    startPos: 0,
    selectedIndex: 0,
    users: [],
    textarea: null,
    dropdown: null
};

function setupMentionAutocomplete(textarea, dropdown) {
    mentionState.textarea = textarea;
    mentionState.dropdown = dropdown;

    // Add CSS for dropdown if not already present
    if (!document.getElementById('mention-styles')) {
        const style = document.createElement('style');
        style.id = 'mention-styles';
        style.textContent = `
            .mention-dropdown {
                position: absolute;
                background: var(--bg-elevated, #262329);
                border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                box-shadow: var(--shadow-lg, 0 8px 30px rgba(0, 0, 0, 0.6));
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                min-width: 180px;
                bottom: 100%;
                left: 0;
                margin-bottom: 0.5rem;
            }
            .mention-dropdown-item {
                padding: 0.5rem 0.75rem;
                cursor: pointer;
                font-size: 0.9rem;
                color: var(--text-primary, #f5f2ed);
            }
            .mention-dropdown-item:hover,
            .mention-dropdown-item.selected {
                background: var(--bg-hover, #2d2a31);
            }
            .mention-dropdown-item.selected {
                background: var(--accent-primary, #e5a54b);
                color: var(--bg-primary, #0c0b0d);
            }
            .mention-dropdown-empty {
                padding: 0.5rem 0.75rem;
                color: var(--text-muted, #8a857c);
                font-size: 0.85rem;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    textarea.addEventListener('input', async () => {
        const cursorPos = textarea.selectionStart;
        const text = textarea.value.substring(0, cursorPos);
        const lastAtIndex = text.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = text.substring(lastAtIndex + 1);
            const isValidMention = /^[a-zA-Z\s'-]*$/.test(textAfterAt) && textAfterAt.length <= 50;

            if (isValidMention) {
                mentionState.active = true;
                mentionState.startPos = lastAtIndex;
                await searchAndShowMentions(textAfterAt);
                return;
            }
        }
        hideMentionDropdown();
    });

    textarea.addEventListener('keydown', (e) => {
        if (!mentionState.active) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            mentionState.selectedIndex = Math.min(mentionState.selectedIndex + 1, mentionState.users.length - 1);
            updateMentionSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            mentionState.selectedIndex = Math.max(mentionState.selectedIndex - 1, 0);
            updateMentionSelection();
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            if (mentionState.users.length > 0) {
                e.preventDefault();
                selectMention(mentionState.users[mentionState.selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideMentionDropdown();
        }
    });

    textarea.addEventListener('blur', () => {
        setTimeout(() => hideMentionDropdown(), 150);
    });

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.mention-dropdown-item');
        if (item) {
            const userId = item.dataset.userId;
            const user = mentionState.users.find(u => u.id === userId);
            if (user) selectMention(user);
        }
    });
}

async function searchAndShowMentions(query) {
    const token = localStorage.getItem('comment_token');
    if (!token) return;

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const users = await response.json();
            mentionState.users = users;
            mentionState.selectedIndex = 0;
            showMentionDropdown();
        }
    } catch (error) {
        console.error('Failed to search users:', error);
    }
}

function showMentionDropdown() {
    const dropdown = mentionState.dropdown;

    if (mentionState.users.length === 0) {
        dropdown.innerHTML = '<div class="mention-dropdown-empty">No users found</div>';
    } else {
        dropdown.innerHTML = mentionState.users.map((user, index) =>
            `<div class="mention-dropdown-item ${index === mentionState.selectedIndex ? 'selected' : ''}" data-user-id="${user.id}">
                @${escapeHtml(user.name)}
            </div>`
        ).join('');
    }

    dropdown.style.display = 'block';
}

function hideMentionDropdown() {
    mentionState.active = false;
    mentionState.users = [];
    if (mentionState.dropdown) {
        mentionState.dropdown.style.display = 'none';
    }
}

function updateMentionSelection() {
    const items = mentionState.dropdown.querySelectorAll('.mention-dropdown-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === mentionState.selectedIndex);
    });
}

function selectMention(user) {
    const textarea = mentionState.textarea;
    const before = textarea.value.substring(0, mentionState.startPos);
    const after = textarea.value.substring(textarea.selectionStart);

    // Insert the mention as a link
    const mention = `[@${user.name}](/profile.html?id=${user.id})`;
    textarea.value = before + mention + after;

    const newPos = before.length + mention.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
    textarea.focus();

    hideMentionDropdown();
}

// Allow pre-loading comments from batched API
// Parent page can set window.PRELOADED_COMMENTS before DOMContentLoaded
window.initCommentsWithData = function(comments) {
    renderComments(comments);
    updateCommentForm();
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if comments were pre-loaded (e.g., from /posts/{slug}/full endpoint)
    if (window.PRELOADED_COMMENTS) {
        renderComments(window.PRELOADED_COMMENTS);
    } else {
        loadComments();
    }
    updateCommentForm();
});
