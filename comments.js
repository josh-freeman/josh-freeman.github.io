// Comments System
// Connects to api.joshfreeman.me for comment data

// Use window.COMMENTS_API_BASE to avoid conflicts with page scripts
// Pages can define COMMENTS_API_BASE before this script loads to override
if (typeof window.COMMENTS_API_BASE === 'undefined') {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.COMMENTS_API_BASE = isLocalDev ? 'http://localhost:8080' : 'https://api.joshfreeman.me';
}

// Parse markdown content - uses marked if available, otherwise escapes HTML
function parseCommentMarkdown(content) {
    if (typeof marked !== 'undefined') {
        // Configure marked for safe rendering
        marked.setOptions({
            breaks: true, // Convert \n to <br>
            gfm: true,    // GitHub flavored markdown
        });
        // Parse and sanitize - wrap in a div to constrain styles
        return `<div class="comment-markdown">${marked.parse(content)}</div>`;
    }
    // Fallback: escape HTML and convert newlines to <br>
    return escapeHtml(content).replace(/\n/g, '<br>');
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

            /* Comment markdown styles */
            .comment-markdown {
                line-height: 1.6;
            }
            .comment-markdown p {
                margin: 0 0 0.5rem 0;
            }
            .comment-markdown p:last-child {
                margin-bottom: 0;
            }
            .comment-markdown a {
                color: var(--accent-primary, #e5a54b);
            }
            .comment-markdown code {
                background: var(--bg-tertiary, #1e1c21);
                padding: 0.15rem 0.35rem;
                border-radius: 4px;
                font-size: 0.9em;
            }
            .comment-markdown pre {
                background: var(--bg-tertiary, #1e1c21);
                padding: 0.75rem;
                border-radius: 6px;
                overflow-x: auto;
                margin: 0.5rem 0;
            }
            .comment-markdown pre code {
                padding: 0;
                background: none;
            }
            .comment-markdown blockquote {
                border-left: 3px solid var(--accent-primary, #e5a54b);
                margin: 0.5rem 0;
                padding-left: 1rem;
                color: var(--text-secondary, #c2bdb4);
            }
            .comment-markdown ul, .comment-markdown ol {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
            }
            .comment-markdown img {
                max-width: 100%;
                border-radius: 6px;
            }

            /* Write/Preview tabs for comment forms */
            .comment-editor-tabs {
                display: flex;
                gap: 0;
                margin-bottom: 0.5rem;
                border-bottom: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
            }
            .comment-editor-tab {
                padding: 0.4rem 0.75rem;
                background: none;
                border: none;
                color: var(--text-muted, #8a857c);
                cursor: pointer;
                font-size: 0.85rem;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
            }
            .comment-editor-tab:hover {
                color: var(--text-secondary, #c2bdb4);
            }
            .comment-editor-tab.active {
                color: var(--accent-primary, #e5a54b);
                border-bottom-color: var(--accent-primary, #e5a54b);
            }
            .comment-preview {
                min-height: 60px;
                padding: 0.75rem;
                border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
                border-radius: 6px;
                background: var(--bg-secondary, #151418);
                color: var(--text-primary, #f5f2ed);
            }
            .comment-preview-empty {
                color: var(--text-muted, #8a857c);
                font-style: italic;
            }

            /* Highlighted comment (when navigating from email link) */
            .comment.highlight {
                animation: comment-highlight 3s ease-out;
            }
            @keyframes comment-highlight {
                0% {
                    background: var(--accent-primary-glow, rgba(229, 165, 75, 0.3));
                    box-shadow: 0 0 0 4px var(--accent-primary-glow, rgba(229, 165, 75, 0.2));
                }
                100% {
                    background: transparent;
                    box-shadow: none;
                }
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
        <div class="comment" id="comment-${comment.id}" data-id="${comment.id}">
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
                ${parseCommentMarkdown(comment.content)}
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

// Count total comments including replies
function countAllComments(comments) {
    let count = 0;
    function countRecursive(list) {
        for (const c of list) {
            count++;
            if (c.replies && c.replies.length > 0) {
                countRecursive(c.replies);
            }
        }
    }
    countRecursive(comments || []);
    return count;
}

// Render comments
function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const user = getUser();

    // Update the comments header with count
    const header = document.querySelector('.comments-section h2');
    if (header) {
        const totalCount = countAllComments(comments);
        header.textContent = totalCount > 0 ? `Comments (${totalCount})` : 'Comments';
    }

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
            <div class="comment-editor-tabs">
                <button type="button" class="comment-editor-tab active" onclick="showCommentTab('write', 'reply-${parentId}')">Write</button>
                <button type="button" class="comment-editor-tab" onclick="showCommentTab('preview', 'reply-${parentId}')">Preview</button>
            </div>
            <div id="comment-write-reply-${parentId}">
                <textarea id="reply-content-${parentId}" placeholder="Write a reply... (supports markdown)"></textarea>
            </div>
            <div id="comment-preview-reply-${parentId}" class="comment-preview" style="display: none;"></div>
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

// Switch between write/preview tabs for comment forms
function showCommentTab(tab, formId) {
    const writeArea = document.getElementById(`comment-write-${formId}`);
    const previewArea = document.getElementById(`comment-preview-${formId}`);
    const tabs = writeArea ? writeArea.closest('form, .reply-form').querySelectorAll('.comment-editor-tab') : [];

    if (!writeArea || !previewArea) return;

    // Update tab states
    tabs.forEach((t, i) => {
        t.classList.toggle('active', (tab === 'write' && i === 0) || (tab === 'preview' && i === 1));
    });

    if (tab === 'write') {
        writeArea.style.display = 'block';
        previewArea.style.display = 'none';
    } else {
        writeArea.style.display = 'none';
        previewArea.style.display = 'block';

        // Get content from the textarea
        const textarea = writeArea.querySelector('textarea');
        const content = textarea ? textarea.value.trim() : '';

        if (content) {
            previewArea.innerHTML = parseCommentMarkdown(content);
        } else {
            previewArea.innerHTML = '<span class="comment-preview-empty">Nothing to preview</span>';
        }
    }
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
        showFriendsOnlyModal('reply');
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
        showFriendsOnlyModal('like');
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
            showFriendsOnlyModal('like');
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
            highlightLinkedComment();
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
                <div class="comment-editor-tabs">
                    <button type="button" class="comment-editor-tab active" onclick="showCommentTab('write', 'main')">Write</button>
                    <button type="button" class="comment-editor-tab" onclick="showCommentTab('preview', 'main')">Preview</button>
                </div>
                <div id="comment-write-main">
                    <textarea
                        id="comment-content"
                        placeholder="Write a comment... (supports markdown, use @ to mention users)"
                        required
                    ></textarea>
                </div>
                <div id="comment-preview-main" class="comment-preview" style="display: none;"></div>
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
    // Store current page for redirect after auth
    localStorage.setItem('auth_return_to', window.location.href);

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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: var(--text-primary, #f5f2ed);">Log in to comment</h3>
                <button onclick="closeLogin()" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-muted, #8a857c); line-height: 1;">&times;</button>
            </div>
            <div style="background: var(--bg-tertiary, #1e1c21); color: var(--text-secondary, #c4bfb6); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.25rem; border-left: 4px solid var(--accent-primary, #e5a54b);">
                <strong style="color: var(--text-accent, #e8c574);">No signup?</strong> Correct! This is invite-only. Ask me (Josh :) if you think I forgot to send you one!
            </div>

            <!-- Google Sign In Button -->
            <button onclick="signInWithGoogle()" style="width: 100%; padding: 0.75rem; margin-bottom: 1.25rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 0.95rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s ease;">
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            </button>

            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
                <div style="flex: 1; height: 1px; background: var(--border-default, rgba(255, 255, 255, 0.1));"></div>
                <span style="color: var(--text-muted, #8a857c); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">or</span>
                <div style="flex: 1; height: 1px; background: var(--border-default, rgba(255, 255, 255, 0.1));"></div>
            </div>

            <form onsubmit="handleLogin(event)">
                <input
                    type="email"
                    id="login-email"
                    placeholder="Email"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed); box-sizing: border-box;"
                >
                <input
                    type="password"
                    id="login-password"
                    placeholder="Password"
                    required
                    style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed); box-sizing: border-box;"
                >
                <button type="submit" class="btn btn-primary" style="width: 100%;">Log in with email</button>
                <p id="login-error" style="color: var(--error, #d4726a); margin-top: 1rem; display: none; text-align: center;"></p>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Add hover effect to Google button
    const googleBtn = modal.querySelector('button[onclick="signInWithGoogle()"]');
    googleBtn.addEventListener('mouseenter', () => {
        googleBtn.style.background = 'var(--bg-tertiary, #1e1c21)';
        googleBtn.style.borderColor = 'var(--text-muted, #8a857c)';
    });
    googleBtn.addEventListener('mouseleave', () => {
        googleBtn.style.background = 'var(--bg-secondary, #151418)';
        googleBtn.style.borderColor = 'var(--border-default, rgba(255, 255, 255, 0.1))';
    });
}

// Sign in with Google
function signInWithGoogle(inviteToken = null) {
    const url = inviteToken
        ? `${window.COMMENTS_API_BASE}/auth/google?invite_token=${encodeURIComponent(inviteToken)}`
        : `${window.COMMENTS_API_BASE}/auth/google`;
    window.location.href = url;
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
                <div class="comment-editor-tabs">
                    <button type="button" class="comment-editor-tab active" onclick="showCommentTab('write', 'edit')">Write</button>
                    <button type="button" class="comment-editor-tab" onclick="showCommentTab('preview', 'edit')">Preview</button>
                </div>
                <div id="comment-write-edit">
                    <textarea
                        id="edit-content"
                        style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 1rem; resize: vertical; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed);"
                    >${currentContent}</textarea>
                </div>
                <div id="comment-preview-edit" class="comment-preview" style="display: none;"></div>
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
    highlightLinkedComment();
};

// Scroll to and highlight a comment if linked via hash (e.g., #comment-123)
function highlightLinkedComment() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#comment-')) {
        const commentEl = document.querySelector(hash);
        if (commentEl) {
            // Scroll to the comment with some offset
            setTimeout(() => {
                commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight animation
                commentEl.classList.add('highlight');
            }, 100);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if comments were pre-loaded (e.g., from /posts/{slug}/full endpoint)
    if (window.PRELOADED_COMMENTS) {
        renderComments(window.PRELOADED_COMMENTS);
        highlightLinkedComment();
    } else {
        loadComments(); // This calls highlightLinkedComment after rendering
    }
    updateCommentForm();

    // Setup WebSocket for real-time updates
    setupWebSocketComments();
});

// Setup WebSocket for real-time comment updates
function setupWebSocketComments() {
    const slug = getPostSlug();
    if (!slug) return;

    // Wait for WebSocketClient to be available
    if (!window.WebSocketClient) {
        setTimeout(setupWebSocketComments, 100);
        return;
    }

    // Subscribe to this post's comments
    window.WebSocketClient.on('connected', () => {
        window.WebSocketClient.subscribeToPost(slug);
    });

    // If already connected, subscribe now
    if (window.WebSocketClient.isConnected()) {
        window.WebSocketClient.subscribeToPost(slug);
    }

    // Handle new comments
    window.WebSocketClient.on('new_comment', (data) => {
        if (data.post_slug !== slug) return;

        // Only add if this comment doesn't already exist (avoid duplicates from own submission)
        if (document.getElementById(`comment-${data.comment.id}`)) return;

        addCommentToDOM(data.comment);
    });

    // Handle deleted comments
    window.WebSocketClient.on('comment_deleted', (data) => {
        if (data.post_slug !== slug) return;

        const commentEl = document.getElementById(`comment-${data.comment_id}`);
        if (commentEl) {
            commentEl.remove();

            // Check if we need to show "no comments" message
            const container = document.getElementById('comments-container');
            if (container && container.querySelectorAll('.comment').length === 0) {
                container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            }
        }
    });
}

// Add a new comment to the DOM in real-time
function addCommentToDOM(comment) {
    const container = document.getElementById('comments-container');
    if (!container) return;

    // Remove "no comments" message if present
    const noComments = container.querySelector('.no-comments');
    if (noComments) noComments.remove();

    const user = getUser();

    if (comment.parent_id) {
        // This is a reply - add it to the parent's replies container
        const parentComment = document.getElementById(`comment-${comment.parent_id}`);
        if (parentComment) {
            let repliesContainer = parentComment.querySelector('.comment-replies');
            if (!repliesContainer) {
                repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-replies';
                parentComment.appendChild(repliesContainer);
            }
            repliesContainer.insertAdjacentHTML('beforeend', renderSingleComment(comment, user, true));
        }
    } else {
        // Top-level comment - add to the end
        container.insertAdjacentHTML('beforeend', renderSingleComment(comment, user, false));
    }

    // Highlight the new comment briefly
    const newCommentEl = document.getElementById(`comment-${comment.id}`);
    if (newCommentEl) {
        newCommentEl.classList.add('highlight');
    }
}
