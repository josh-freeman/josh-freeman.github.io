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

            /* Comment author avatar */
            .comment-author-link {
                flex-shrink: 0;
            }
            .comment-author-avatar {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                object-fit: cover;
                vertical-align: middle;
            }
            .comment-author-initial {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a));
                color: var(--bg-primary, #0c0b0d);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: 600;
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

            /* Reply context indicator (↳ @Name) */
            .reply-context {
                color: var(--text-muted, #8a857c);
                font-size: 0.85rem;
                text-decoration: none;
                margin-right: 0.5rem;
                transition: color 0.15s ease;
            }
            .reply-context:hover {
                color: var(--accent-primary, #e5a54b);
            }

            /* Collapsed replies */
            .replies-collapsed {
                display: none;
            }
            .replies-collapsed.expanded {
                display: block;
            }

            /* Show more replies button */
            .show-more-replies {
                background: none;
                border: none;
                color: var(--text-muted, #8a857c);
                font-size: 0.85rem;
                cursor: pointer;
                padding: 0.5rem 0;
                margin-top: 0.25rem;
                transition: color 0.15s ease;
            }
            .show-more-replies:hover {
                color: var(--accent-primary, #e5a54b);
            }

            /* Comment thread wrapper */
            .comment-thread {
                margin-bottom: 1rem;
            }

            /* Replying to context in reply form */
            .replying-to-context {
                font-size: 0.85rem;
                color: var(--text-muted, #8a857c);
                margin-bottom: 0.5rem;
                padding: 0.4rem 0.6rem;
                background: var(--bg-tertiary, #1e1c21);
                border-radius: 4px;
                border-left: 2px solid var(--accent-primary, #e5a54b);
            }
            .replying-to-context strong {
                color: var(--accent-primary, #e5a54b);
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
        const match = path.match(/\/socialnet\/([^\/]+)\.html$/);
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
// isReply: whether this is rendered in the replies section
// showReplyContext: whether to show "↳ @Name" (for replies to replies)
function renderSingleComment(comment, user, isReply = false, showReplyContext = false) {
    const canEdit = user && (user.id === comment.author_id || user.is_admin);
    const canDelete = user && (user.id === comment.author_id || user.is_admin);
    const isLiked = userLikedComments.has(comment.id);
    const canReply = !!user; // Any logged-in user can reply to any comment

    // Show reply context when this is a reply-to-a-reply
    const replyContextHtml = showReplyContext && comment.reply_to_author_name ? `
        <a href="#" class="reply-context" onclick="scrollToParentComment(${comment.parent_id}); return false;">
            ↳ @${escapeHtml(comment.reply_to_author_name)}
        </a>
    ` : '';

    // Author avatar
    const authorAvatar = comment.author_profile_picture_url
        ? `<img src="${comment.author_profile_picture_url}" alt="" class="comment-author-avatar">`
        : `<span class="comment-author-initial">${comment.author_name ? comment.author_name.charAt(0).toUpperCase() : '?'}</span>`;

    return `
        <div class="comment" id="comment-${comment.id}" data-id="${comment.id}" data-parent-id="${comment.parent_id || ''}">
            <div class="comment-header">
                ${replyContextHtml}
                <a href="/profile.html?id=${comment.author_id}" class="comment-author-link">${authorAvatar}</a>
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
        </div>
    `;
}

// Flatten all nested replies into a single array (for visual flattening)
function flattenReplies(replies, parentIsTopLevel = true) {
    let flattened = [];
    for (const reply of replies) {
        // Mark whether this reply's parent is a reply (not top-level)
        reply._showReplyContext = !parentIsTopLevel;
        flattened.push(reply);
        if (reply.replies && reply.replies.length > 0) {
            flattened = flattened.concat(flattenReplies(reply.replies, false));
        }
    }
    return flattened;
}

// Render a top-level comment with all its flattened replies
function renderCommentThread(comment, user) {
    const INITIAL_REPLIES_SHOWN = 5;

    // Flatten all nested replies
    const allReplies = comment.replies && comment.replies.length > 0
        ? flattenReplies(comment.replies, true)
        : [];

    const hasMoreReplies = allReplies.length > INITIAL_REPLIES_SHOWN;
    const visibleReplies = hasMoreReplies ? allReplies.slice(0, INITIAL_REPLIES_SHOWN) : allReplies;
    const hiddenReplies = hasMoreReplies ? allReplies.slice(INITIAL_REPLIES_SHOWN) : [];

    const repliesHtml = allReplies.length > 0 ? `
        <div class="comment-replies" data-root-comment="${comment.id}">
            ${visibleReplies.map(reply => renderSingleComment(reply, user, true, reply._showReplyContext)).join('')}
            ${hasMoreReplies ? `
                <div class="replies-collapsed" id="collapsed-${comment.id}">
                    ${hiddenReplies.map(reply => renderSingleComment(reply, user, true, reply._showReplyContext)).join('')}
                </div>
                <button class="show-more-replies" onclick="toggleReplies(${comment.id}, ${hiddenReplies.length})">
                    <span class="show-more-text">Show ${hiddenReplies.length} more ${hiddenReplies.length === 1 ? 'reply' : 'replies'}</span>
                    <span class="show-less-text" style="display: none;">Show less</span>
                </button>
            ` : ''}
        </div>
    ` : `<div class="comment-replies" data-root-comment="${comment.id}" style="display: none;"></div>`;

    // Wrap in a thread container for proper structure
    return `
        <div class="comment-thread" data-root-id="${comment.id}">
            ${renderSingleComment(comment, user, false, false)}
            ${repliesHtml}
        </div>
    `;
}

// Toggle collapsed replies
function toggleReplies(commentId, count) {
    const collapsed = document.getElementById(`collapsed-${commentId}`);
    const button = collapsed.parentElement.querySelector('.show-more-replies');
    const showMoreText = button.querySelector('.show-more-text');
    const showLessText = button.querySelector('.show-less-text');

    if (collapsed.classList.contains('expanded')) {
        collapsed.classList.remove('expanded');
        showMoreText.style.display = '';
        showLessText.style.display = 'none';
    } else {
        collapsed.classList.add('expanded');
        showMoreText.style.display = 'none';
        showLessText.style.display = '';
    }
}

// Scroll to and highlight parent comment
function scrollToParentComment(parentId) {
    const parentEl = document.getElementById(`comment-${parentId}`);
    if (parentEl) {
        parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        parentEl.classList.add('highlight');
        setTimeout(() => parentEl.classList.remove('highlight'), 3000);
    }
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

    // Use renderCommentThread for each top-level comment (handles flattening)
    const html = comments.map(comment => renderCommentThread(comment, user)).join('');
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

    // Check if we're replying to a reply (show context)
    const parentComment = document.getElementById(`comment-${parentId}`);
    const isReplyingToReply = parentComment && parentComment.dataset.parentId;
    const replyingToContext = isReplyingToReply ? `
        <div class="replying-to-context">
            Replying to <strong>@${escapeHtml(parentAuthorName || 'someone')}</strong>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="reply-form" data-parent-author="${escapeHtml(parentAuthorName || '')}">
            ${replyingToContext}
            <div class="comment-editor-tabs">
                <button type="button" class="comment-editor-tab active" onclick="showCommentTab('write', 'reply-${parentId}')">Write</button>
                <button type="button" class="comment-editor-tab" onclick="showCommentTab('preview', 'reply-${parentId}')">Preview</button>
            </div>
            <div id="comment-write-reply-${parentId}" style="position: relative;">
                <textarea id="reply-content-${parentId}" placeholder="Write a reply... (supports markdown, use @ to mention)"></textarea>
                <div id="mention-dropdown-reply-${parentId}" class="mention-dropdown" style="display: none;"></div>
            </div>
            <div id="comment-preview-reply-${parentId}" class="comment-preview" style="display: none;"></div>
            <div class="reply-form-actions">
                <button class="submit-reply" onclick="submitReply(${parentId})">Reply</button>
                <button class="cancel-reply" onclick="hideReplyForm(${parentId})">Cancel</button>
            </div>
        </div>
    `;

    const textarea = document.getElementById(`reply-content-${parentId}`);
    const dropdown = document.getElementById(`mention-dropdown-reply-${parentId}`);

    // Setup @mention autocomplete for reply form
    if (textarea && dropdown) {
        setupMentionAutocomplete(textarea, dropdown);
    }

    textarea.focus();
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
    const user = getUser();

    if (!token) {
        showFriendsOnlyModal('reply');
        guard.end();
        return;
    }

    // Get parent author name for notification modal
    const replyForm = textarea.closest('.reply-form');
    const parentAuthorName = replyForm ? replyForm.dataset.parentAuthor : null;

    // Check for mentions
    const mentions = extractMentions(content);

    // Admin gets notification modal for parent author and/or mentions
    if (user && user.is_admin && (parentAuthorName || mentions.length > 0)) {
        guard.end(); // Release guard, modal will resubmit
        showReplyNotifyModal(parentId, parentAuthorName, mentions, async (notifyParent, userIdsToNotify) => {
            await doSubmitReply(parentId, content, slug, token, notifyParent, userIdsToNotify);
        });
        return;
    }

    // Non-admin - submit directly without notifications
    await doSubmitReply(parentId, content, slug, token, false, []);
    guard.end();
}

// Actual reply submission
async function doSubmitReply(parentId, content, slug, token, notifyAuthor, mentionedUserIds) {
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
                notify_parent_author: notifyAuthor,
                notify_mentioned_users: mentionedUserIds
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
            <div class="comment-login-notice">
                <p class="login-action">
                    <a href="#" onclick="showLogin(); return false;">Log in</a> to leave a comment
                </p>
                <div class="login-divider">or</div>
                <p class="login-invite">
                    <a href="/subscribe.html">Subscribe</a> to join the conversation, or reach out if we know each other!
                </p>
            </div>
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
                <strong style="color: var(--text-accent, #e8c574);">New here?</strong> <a href="/subscribe.html" style="color: var(--accent-primary, #e5a54b);">Subscribe</a> to join the conversation, or reach out if we know each other!
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

// Extract mentioned user IDs from comment content
function extractMentions(content) {
    // Match markdown links that look like mentions: [@Name](/profile.html?id=uuid)
    const mentionRegex = /\[@([^\]]+)\]\(\/profile\.html\?id=([a-f0-9-]+)\)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push({ name: match[1], id: match[2] });
    }
    return mentions;
}

// Show reply notification modal for admin (combines parent author + mentions)
function showReplyNotifyModal(parentId, parentAuthorName, mentions, onConfirm) {
    const modal = document.createElement('div');
    modal.id = 'reply-notify-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        backdrop-filter: blur(4px);
    `;

    // Build notification items
    let notifyItems = '';
    let itemIndex = 0;

    // Parent author notification option
    if (parentAuthorName) {
        notifyItems += `
            <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; cursor: pointer; border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));" onclick="toggleNotifyItem('parent')">
                <input type="checkbox" id="notify-parent" checked style="display: none;">
                <span class="notify-checkbox" style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                    <svg class="notify-unchecked" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" style="display: none;">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                    </svg>
                    <svg class="notify-checked" width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary, #e5a54b)" stroke="none">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                        <path d="M9 12l2 2 4-4" stroke="var(--bg-primary, #0c0b0d)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </span>
                <span style="flex: 1;">
                    <span style="color: var(--text-primary, #f5f2ed); font-weight: 500;">@${escapeHtml(parentAuthorName)}</span>
                    <span style="color: var(--text-muted, #8a857c); font-size: 0.85rem; margin-left: 0.5rem;">(replying to)</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" title="Email notification">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
            </label>
        `;
    }

    // Mention notification options
    mentions.forEach((m, idx) => {
        notifyItems += `
            <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; cursor: pointer; border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));" onclick="toggleNotifyItem('mention-${idx}')">
                <input type="checkbox" id="notify-mention-${idx}" data-user-id="${m.id}" checked style="display: none;">
                <span class="notify-checkbox" style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                    <svg class="notify-unchecked" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" style="display: none;">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                    </svg>
                    <svg class="notify-checked" width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary, #e5a54b)" stroke="none">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                        <path d="M9 12l2 2 4-4" stroke="var(--bg-primary, #0c0b0d)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </span>
                <span style="flex: 1;">
                    <span style="color: var(--text-primary, #f5f2ed); font-weight: 500;">@${escapeHtml(m.name)}</span>
                    <span style="color: var(--text-muted, #8a857c); font-size: 0.85rem; margin-left: 0.5rem;">(mentioned)</span>
                </span>
                <span style="display: flex; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" title="Email notification">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" title="Bell notification">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </span>
            </label>
        `;
    });

    const totalCount = (parentAuthorName ? 1 : 0) + mentions.length;

    modal.innerHTML = `
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 0; border-radius: 12px; max-width: 400px; width: 90%; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-primary, #f5f2ed);">Send notifications?</h3>
                <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted, #8a857c);">
                    Choose who to notify about this reply.
                </p>
            </div>
            <div style="padding: 0.75rem 1.5rem; max-height: 250px; overflow-y: auto;">
                ${notifyItems}
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button id="notify-skip-btn" style="padding: 0.6rem 1.25rem; background: var(--bg-tertiary, #1e1c21); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 6px; cursor: pointer; color: var(--text-secondary, #c2bdb4); font-size: 0.9rem;">Post without notifying</button>
                <button id="notify-confirm-btn" style="padding: 0.6rem 1.25rem; background: var(--accent-primary, #e5a54b); border: none; border-radius: 6px; cursor: pointer; color: var(--bg-primary, #0c0b0d); font-weight: 600; font-size: 0.9rem;">Notify & Post</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Toggle checkbox handler
    window.toggleNotifyItem = function(itemId) {
        const input = document.getElementById(`notify-${itemId}`);
        if (!input) return;
        input.checked = !input.checked;
        const label = input.closest('label');
        const unchecked = label.querySelector('.notify-unchecked');
        const checked = label.querySelector('.notify-checked');
        unchecked.style.display = input.checked ? 'none' : '';
        checked.style.display = input.checked ? '' : 'none';
    };

    // Button handlers
    document.getElementById('notify-confirm-btn').onclick = () => {
        const notifyParent = parentAuthorName ? document.getElementById('notify-parent')?.checked : false;
        const mentionIds = [];
        mentions.forEach((m, idx) => {
            const checkbox = document.getElementById(`notify-mention-${idx}`);
            if (checkbox && checkbox.checked) {
                mentionIds.push(m.id);
            }
        });
        modal.remove();
        onConfirm(notifyParent, mentionIds);
    };

    document.getElementById('notify-skip-btn').onclick = () => {
        modal.remove();
        onConfirm(false, []); // Post without notifications
    };

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show mention notification modal for admin
function showMentionNotifyModal(mentions, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.id = 'mention-notify-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        backdrop-filter: blur(4px);
    `;

    const mentionItems = mentions.map((m, idx) => `
        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; cursor: pointer; border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));" onclick="toggleMentionNotify(${idx})">
            <input type="checkbox" id="mention-notify-${idx}" data-user-id="${m.id}" checked style="display: none;">
            <span class="mention-checkbox" style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                <svg class="mention-unchecked" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" style="display: none;">
                    <rect x="3" y="3" width="18" height="18" rx="4"/>
                </svg>
                <svg class="mention-checked" width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-primary, #e5a54b)" stroke="none">
                    <rect x="3" y="3" width="18" height="18" rx="4"/>
                    <path d="M9 12l2 2 4-4" stroke="var(--bg-primary, #0c0b0d)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </span>
            <span style="flex: 1; color: var(--text-primary, #f5f2ed); font-weight: 500;">@${escapeHtml(m.name)}</span>
            <span style="display: flex; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" title="Email notification">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #8a857c)" stroke-width="2" title="Bell notification">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
            </span>
        </label>
    `).join('');

    modal.innerHTML = `
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 0; border-radius: 12px; max-width: 380px; width: 90%; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-primary, #f5f2ed);">Notify mentioned users?</h3>
                <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted, #8a857c);">
                    You mentioned ${mentions.length} ${mentions.length === 1 ? 'person' : 'people'} in this comment.
                </p>
            </div>
            <div style="padding: 0.75rem 1.5rem; max-height: 250px; overflow-y: auto;">
                ${mentionItems}
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button id="mention-skip-btn" style="padding: 0.6rem 1.25rem; background: var(--bg-tertiary, #1e1c21); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 6px; cursor: pointer; color: var(--text-secondary, #c2bdb4); font-size: 0.9rem;">Post without notifying</button>
                <button id="mention-confirm-btn" style="padding: 0.6rem 1.25rem; background: var(--accent-primary, #e5a54b); border: none; border-radius: 6px; cursor: pointer; color: var(--bg-primary, #0c0b0d); font-weight: 600; font-size: 0.9rem;">Notify & Post</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Toggle checkbox handler
    window.toggleMentionNotify = function(idx) {
        const input = document.getElementById(`mention-notify-${idx}`);
        input.checked = !input.checked;
        const label = input.closest('label');
        const unchecked = label.querySelector('.mention-unchecked');
        const checked = label.querySelector('.mention-checked');
        unchecked.style.display = input.checked ? 'none' : '';
        checked.style.display = input.checked ? '' : 'none';
    };

    // Button handlers
    document.getElementById('mention-confirm-btn').onclick = () => {
        const toNotify = [];
        mentions.forEach((m, idx) => {
            const checkbox = document.getElementById(`mention-notify-${idx}`);
            if (checkbox && checkbox.checked) {
                toNotify.push(m.id);
            }
        });
        modal.remove();
        onConfirm(toNotify);
    };

    document.getElementById('mention-skip-btn').onclick = () => {
        modal.remove();
        onConfirm([]); // Post without notifications
    };

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
}

// Submit comment (with loading guard)
async function submitComment(event) {
    event.preventDefault();

    const content = document.getElementById('comment-content').value;
    const slug = getPostSlug();
    const token = localStorage.getItem('comment_token');
    const user = getUser();

    if (!content || !slug || !token) {
        return;
    }

    // Check for mentions - admin gets confirmation modal
    const mentions = extractMentions(content);
    if (user && user.is_admin && mentions.length > 0) {
        showMentionNotifyModal(mentions, async (userIdsToNotify) => {
            await doSubmitComment(content, slug, token, userIdsToNotify);
        });
        return;
    }

    // Non-admin or no mentions - submit directly
    await doSubmitComment(content, slug, token, []);
}

// Actual comment submission
async function doSubmitComment(content, slug, token, mentionedUserIds) {
    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.commentSubmit : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    try {
        const response = await fetch(`${window.COMMENTS_API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post_slug: slug,
                content,
                notify_mentioned_users: mentionedUserIds
            })
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
        ? likers.map(l => {
            const avatar = l.profile_picture_url
                ? `<img src="${l.profile_picture_url}" alt="" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; margin-right: 0.5rem;">`
                : `<span style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a)); color: var(--bg-primary, #0c0b0d); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem;">${l.name ? l.name.charAt(0).toUpperCase() : '?'}</span>`;
            return `<li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06)); display: flex; align-items: center;"><a href="/profile.html?id=${l.id}" style="color: var(--text-primary, #f5f2ed); text-decoration: none; font-weight: 500; display: flex; align-items: center;">${avatar}${escapeHtml(l.name)}</a> <span style="color: var(--text-muted, #8a857c); font-size: 0.85rem; margin-left: 0.5rem;">(${new Date(l.liked_at).toLocaleDateString()})</span></li>`;
        }).join('')
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

// Find the root parent (top-level comment) for a given comment
function findRootParentId(commentId) {
    let el = document.getElementById(`comment-${commentId}`);
    while (el) {
        const parentId = el.dataset.parentId;
        if (!parentId) return commentId; // This is a top-level comment
        el = document.getElementById(`comment-${parentId}`);
        if (el && !el.dataset.parentId) return parseInt(parentId); // Found the top-level parent
    }
    return commentId;
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
        // This is a reply - find the root parent's replies container
        const rootParentId = findRootParentId(comment.parent_id);

        // Find the replies container by data attribute
        let repliesContainer = container.querySelector(`.comment-replies[data-root-comment="${rootParentId}"]`);

        if (!repliesContainer) {
            // Create the thread structure if it doesn't exist
            const thread = container.querySelector(`.comment-thread[data-root-id="${rootParentId}"]`);
            if (thread) {
                repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-replies';
                repliesContainer.dataset.rootComment = rootParentId;
                thread.appendChild(repliesContainer);
            }
        }

        if (repliesContainer) {
            // Show the container if it was hidden
            repliesContainer.style.display = '';

            // Determine if we should show reply context (replying to a reply, not to root)
            const isReplyToReply = comment.parent_id !== rootParentId;
            const showReplyContext = isReplyToReply && comment.reply_to_author_name;

            // Add the reply at the end of visible replies (before collapsed section or show-more button)
            const collapsed = repliesContainer.querySelector('.replies-collapsed');
            const showMoreBtn = repliesContainer.querySelector('.show-more-replies');

            if (collapsed) {
                collapsed.insertAdjacentHTML('beforebegin', renderSingleComment(comment, user, true, showReplyContext));
            } else if (showMoreBtn) {
                showMoreBtn.insertAdjacentHTML('beforebegin', renderSingleComment(comment, user, true, showReplyContext));
            } else {
                repliesContainer.insertAdjacentHTML('beforeend', renderSingleComment(comment, user, true, showReplyContext));
            }
        }
    } else {
        // Top-level comment - create a new thread wrapper
        const threadHtml = `
            <div class="comment-thread" data-root-id="${comment.id}">
                ${renderSingleComment(comment, user, false, false)}
                <div class="comment-replies" data-root-comment="${comment.id}" style="display: none;"></div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', threadHtml);
    }

    // Highlight the new comment briefly
    const newCommentEl = document.getElementById(`comment-${comment.id}`);
    if (newCommentEl) {
        newCommentEl.classList.add('highlight');
    }

    // Update comment count
    const header = document.querySelector('.comments-section h2');
    if (header) {
        const allComments = container.querySelectorAll('.comment').length;
        header.textContent = allComments > 0 ? `Comments (${allComments})` : 'Comments';
    }
}
