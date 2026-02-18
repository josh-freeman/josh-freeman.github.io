/**
 * Admin Posts Tab - Post management functionality
 */

// Slug generation state
let slugManuallyEdited = false;

// Notification stats cache
let postStats = null;

// @mention autocomplete state
let mentionState = {
    active: false,
    startPos: 0,
    selectedIndex: 0,
    users: [],
    textarea: null
};

// Default post notification template
const defaultPostTemplate = {
    from_name: "Josh Freeman",
    from_email: "josh@joshfreeman.me",
    subject: "New post: {title}",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">New Post: {title}</h2>
    <p style="color: #4b5563; line-height: 1.6; font-style: italic;">"{excerpt}"</p>
    <p style="margin: 24px 0;">
        <a href="{url}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Read Post
        </a>
    </p>
    <p style="color: #4b5563;">— Josh</p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        You're receiving this because you're a friend on joshfreeman.me
    </p>
</div>`
};

// Load all posts
async function loadPosts() {
    const token = localStorage.getItem('comment_token');
    const container = document.getElementById('post-list');

    try {
        const response = await fetch(`${API_BASE}/admin/posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allPosts = await response.json();
            existingSlugs = allPosts.map(p => p.slug);
            postsVisible = PAGE_SIZE;
            renderPosts();
        } else {
            container.innerHTML = '<p class="error-message">Failed to load posts</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="error-message">Failed to load posts</p>';
    }
}

function renderPosts() {
    const container = document.getElementById('post-list');

    if (allPosts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No posts yet. Create your first post!</p>';
        return;
    }

    const visiblePosts = allPosts.slice(0, postsVisible);
    const hasMore = allPosts.length > postsVisible;

    container.innerHTML = visiblePosts.map(post => `
        <div class="post-item">
            <div class="post-item-info">
                <h3>${escapeHtml(post.title)}</h3>
                <div class="meta">
                    <span class="badge ${post.is_published ? 'badge-published' : 'badge-draft'}">
                        ${post.is_published ? 'Published' : 'Draft'}
                    </span>
                    ${post.is_exclusive ? '<span class="badge badge-exclusive">Exclusive</span>' : ''}
                    &middot; /${post.slug} &middot; ${formatDate(post.created_at)}
                </div>
            </div>
            <div class="post-item-actions">
                <button class="btn" onclick="editPost('${post.slug}')">Edit</button>
                <a href="/blog/post.html?slug=${post.slug}" target="_blank" class="btn" ${!post.is_published ? 'style="opacity: 0.5;"' : ''}>View</a>
            </div>
        </div>
    `).join('') + (hasMore ? `
        <button class="btn" onclick="showMorePosts()" style="width: 100%; margin-top: 0.5rem; background: #f3f4f6; color: #374151;">
            Show more (${allPosts.length - postsVisible} remaining)
        </button>
    ` : '');
}

function showMorePosts() {
    postsVisible += PAGE_SIZE;
    renderPosts();
}

// Slug generation
function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function getUniqueSlug(baseSlug) {
    if (!existingSlugs.includes(baseSlug)) return baseSlug;
    let counter = 2;
    while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
        counter++;
    }
    return `${baseSlug}-${counter}`;
}

function autoGenerateSlug() {
    if (slugManuallyEdited || currentSlug) return;
    const title = document.getElementById('post-title').value;
    const slug = getUniqueSlug(slugify(title));
    document.getElementById('post-slug').value = slug;
}

function markSlugManual() {
    if (!currentSlug) {
        slugManuallyEdited = true;
        document.getElementById('slug-auto-badge').style.display = 'none';
    }
}

// Editor management
function showEditor(slug = null) {
    currentSlug = slug;
    slugManuallyEdited = false;
    document.getElementById('post-list-view').style.display = 'none';
    document.getElementById('post-editor-view').style.display = 'block';
    document.getElementById('tab-navigation').style.display = 'none';
    document.getElementById('editor-title').textContent = slug ? 'Edit Post' : 'New Post';
    document.getElementById('delete-btn').style.display = slug ? 'inline-block' : 'none';
    document.getElementById('notify-btn').style.display = slug ? 'inline-block' : 'none';
    document.getElementById('post-slug').disabled = !!slug;
    document.getElementById('slug-auto-badge').style.display = slug ? 'none' : 'inline';

    if (slug) {
        loadPost(slug);
    } else {
        document.getElementById('post-form').reset();
        adminToggle.set('published', false);
        adminToggle.set('exclusive', false);
        adminToggle.set('unlisted', false);
        document.getElementById('preview-content').innerHTML = '';
    }
}

function hideEditor() {
    document.getElementById('post-list-view').style.display = 'block';
    document.getElementById('post-editor-view').style.display = 'none';
    document.getElementById('tab-navigation').style.display = 'flex';
    currentSlug = null;
    loadPosts();
}

async function loadPost(slug) {
    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/posts/${slug}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const post = await response.json();
            document.getElementById('post-slug').value = post.slug;
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-excerpt').value = post.excerpt || '';
            document.getElementById('post-content').value = post.content;
            adminToggle.set('published', post.is_published);
            adminToggle.set('exclusive', post.is_exclusive || false);
            adminToggle.set('unlisted', post.is_unlisted || false);
            updatePreview();
        }
    } catch (error) {
        showToast('Failed to load post', 'error');
    }
}

async function savePost(event) {
    event.preventDefault();

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.postSave : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');
    const errorEl = document.getElementById('editor-error');

    const postData = {
        slug: document.getElementById('post-slug').value,
        title: document.getElementById('post-title').value,
        excerpt: document.getElementById('post-excerpt').value,
        content: document.getElementById('post-content').value,
        is_published: adminToggle.get('published'),
        is_exclusive: adminToggle.get('exclusive'),
        is_unlisted: adminToggle.get('unlisted')
    };

    try {
        const url = currentSlug
            ? `${API_BASE}/admin/posts/${currentSlug}`
            : `${API_BASE}/admin/posts`;
        const method = currentSlug ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(postData)
        });

        if (response.status >= 200 && response.status < 300) {
            hideEditor();
        } else {
            const error = await response.json().catch(() => ({}));
            errorEl.textContent = error.detail || `Failed to save post (status: ${response.status})`;
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Failed to save post';
        errorEl.style.display = 'block';
    } finally {
        guard.end();
    }
}

async function deletePost() {
    if (!currentSlug) return;
    if (!confirm('Are you sure you want to delete this post? This will also delete all comments on it.')) return;

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/posts/${currentSlug}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            hideEditor();
        } else {
            showToast('Failed to delete post', 'error');
        }
    } catch (error) {
        showToast('Failed to delete post', 'error');
    }
}

function editPost(slug) {
    showEditor(slug);
}

// Preview functionality
function updatePreview() {
    const content = document.getElementById('post-content').value;
    const preview = document.getElementById('preview-content');
    preview.innerHTML = marked.parse(content);
    stylePreviewBlockquotes();
}

function showPostEditorTab(tab) {
    const container = document.getElementById('post-content').closest('.form-group');
    const tabs = container.querySelectorAll('.html-editor-tab');
    const textarea = document.getElementById('post-content');
    const preview = document.getElementById('post-preview-container');

    tabs.forEach((t, i) => {
        t.classList.toggle('active', (tab === 'write' && i === 0) || (tab === 'preview' && i === 1));
    });

    if (tab === 'write') {
        textarea.style.display = 'block';
        preview.classList.remove('active');
    } else {
        textarea.style.display = 'none';
        preview.classList.add('active');
        updatePreview();
    }
}

function stylePreviewBlockquotes() {
    const blockquotes = document.querySelectorAll('#preview-content blockquote');
    blockquotes.forEach(bq => {
        const text = bq.textContent.toLowerCase().trim();
        bq.classList.remove('warning', 'tip', 'note');
        if (text.includes('⚠️') || /^warning\b/i.test(text) || text.includes('/!\\')) {
            bq.classList.add('warning');
        } else if (text.includes('💡') || /^tip\b/i.test(text)) {
            bq.classList.add('tip');
        } else if (text.includes('ℹ️') || /^note\b/i.test(text)) {
            bq.classList.add('note');
        }
    });
}

// Notification functionality
async function notifyUsersAboutPost() {
    if (!currentSlug) return;

    const postTitle = document.getElementById('post-title').value || 'this post';
    const token = localStorage.getItem('comment_token');

    const modal = document.createElement('div');
    modal.id = 'notify-modal';
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
        padding: 1rem;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 100%;">
            <p style="text-align: center; color: var(--text-muted);">Loading stats...</p>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        const response = await fetch(`${API_BASE}/admin/posts/${currentSlug}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            postStats = await response.json();
            renderNotifyModal(postTitle);
        } else {
            closeNotifyModal();
            showToast('Failed to load stats', 'error');
        }
    } catch (error) {
        closeNotifyModal();
        showToast('Failed to load stats', 'error');
    }
}

function renderNotifyModal(postTitle) {
    const modal = document.getElementById('notify-modal');
    if (!modal || !postStats) return;

    const smartCount = postStats.unnotified_not_viewed_count;
    const viewedCount = postStats.friend_views;
    const anonymousCount = postStats.anonymous_views;

    let userListHtml = '';
    const allUsers = [
        ...postStats.friends_who_viewed.map(u => ({ ...u, viewed: true, notified: postStats.notified_users.some(n => n.id === u.id) })),
        ...postStats.friends_not_viewed.map(u => ({ ...u, viewed: false, notified: postStats.notified_users.some(n => n.id === u.id) }))
    ].sort((a, b) => a.name.localeCompare(b.name));

    for (const user of allUsers) {
        const statusBadges = [];
        if (user.viewed) statusBadges.push('<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">viewed</span>');
        if (user.notified) statusBadges.push('<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">notified</span>');

        userListHtml += `
            <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; cursor: pointer;">
                <input type="checkbox" name="notify-user" value="${user.id}" ${!user.viewed && !user.notified ? 'checked' : ''}>
                <span style="flex: 1;">${escapeHtml(user.name)}</span>
                ${statusBadges.join(' ')}
            </label>
        `;
    }

    modal.querySelector('div').outerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Notify Users
            </h3>
            <p style="color: #4b5563; margin-bottom: 1rem;">
                Post: <strong>"${escapeHtml(postTitle)}"</strong>
            </p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem;">
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                        <span><strong>${viewedCount}</strong> friends viewed</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span><strong>${anonymousCount}</strong> anonymous</span>
                    </div>
                </div>
            </div>

            ${smartCount > 0 ? `
            <div style="background: linear-gradient(135deg, #ede9fe, #e0e7ff); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin: 0 0 0.75rem; font-size: 0.9rem; color: #5b21b6;">
                    <strong>${smartCount} friend${smartCount !== 1 ? 's' : ''}</strong> haven't seen this post yet
                </p>
                <button onclick="sendSmartNotify()" class="btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 0.5rem 1rem; width: 100%;">
                    Notify Them
                </button>
            </div>
            ` : `
            <div style="background: #d1fae5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin: 0; font-size: 0.9rem; color: #065f46;">
                    All friends have either viewed this post or been notified already!
                </p>
            </div>
            `}

            <details style="margin-bottom: 1rem;">
                <summary style="cursor: pointer; font-weight: 500; padding: 0.5rem 0;">Manual selection</summary>
                <div style="margin-top: 0.75rem; max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.75rem;">
                    ${userListHtml || '<p style="color: var(--text-muted); margin: 0;">No users available</p>'}
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    <button onclick="selectAllNotifyUsers(true)" class="btn" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">Select All</button>
                    <button onclick="selectAllNotifyUsers(false)" class="btn" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">Deselect All</button>
                    <button onclick="sendSelectedNotify()" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; margin-left: auto;">Notify Selected</button>
                </div>
            </details>

            <div style="display: flex; gap: 1rem; justify-content: flex-end; border-top: 1px solid #e0e0e0; padding-top: 1rem; margin-top: 0.5rem;">
                <button onclick="closeNotifyModal()" class="btn" style="padding: 0.6rem 1.2rem;">Done</button>
            </div>
        </div>
    `;
}

function selectAllNotifyUsers(select) {
    const checkboxes = document.querySelectorAll('input[name="notify-user"]');
    checkboxes.forEach(cb => cb.checked = select);
}

async function sendSmartNotify() {
    await sendNotification('smart', []);
}

async function sendSelectedNotify() {
    const checkboxes = document.querySelectorAll('input[name="notify-user"]:checked');
    const userIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    if (userIds.length === 0) {
        showToast('No users selected', 'error');
        return;
    }
    await sendNotification('selected', userIds);
}

async function sendNotification(mode, userIds) {
    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.notify : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/posts/${currentSlug}/notify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mode, user_ids: userIds })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.sent > 0 && data.failed === 0) {
                showToast(`Notified ${data.sent} user${data.sent !== 1 ? 's' : ''}`, 'success');
            } else if (data.sent > 0 && data.failed > 0) {
                showToast(`Sent ${data.sent}/${data.total}, ${data.failed} failed`, 'error');
            } else if (data.status === 'no_users') {
                showToast('No users to notify', 'error');
            } else {
                const errorMsg = data.errors && data.errors[0] ? data.errors[0] : 'Check API key';
                showToast(`Email failed: ${errorMsg}`, 'error');
            }
            closeNotifyModal();
            notifyUsersAboutPost();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to send notifications', 'error');
        }
    } catch (error) {
        showToast('Failed to send notifications', 'error');
    } finally {
        guard.end();
    }
}

function closeNotifyModal() {
    const modal = document.getElementById('notify-modal');
    if (modal) modal.remove();
    postStats = null;
}

// Image upload functionality
function setupImageUpload() {
    const textarea = document.getElementById('post-content');

    textarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        textarea.style.borderColor = 'var(--primary-color)';
        textarea.style.background = '#f0f7ff';
    });

    textarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        textarea.style.borderColor = '#e0e0e0';
        textarea.style.background = '';
    });

    textarea.addEventListener('drop', async (e) => {
        e.preventDefault();
        textarea.style.borderColor = '#e0e0e0';
        textarea.style.background = '';

        const files = e.dataTransfer.files;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                await uploadAndInsertImage(file, textarea);
            }
        }
    });

    textarea.addEventListener('paste', async (e) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                await uploadAndInsertImage(file, textarea);
                break;
            }
        }
    });

    setupMentionAutocomplete(textarea);
}

async function uploadAndInsertImage(file, textarea) {
    const token = localStorage.getItem('comment_token');
    if (!token) {
        showToast('Please log in to upload images', 'error');
        return;
    }

    const placeholder = `![Uploading ${file.name}...]()`;
    insertAtCursor(textarea, placeholder);

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/admin/upload-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            const markdown = `![${file.name}](${data.url})`;
            textarea.value = textarea.value.replace(placeholder, markdown);
            updatePreview();
        } else {
            const error = await response.json();
            textarea.value = textarea.value.replace(placeholder, '');
            showToast(error.detail || 'Failed to upload image', 'error');
        }
    } catch (error) {
        textarea.value = textarea.value.replace(placeholder, '');
        showToast('Failed to upload image', 'error');
    }
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

// @mention autocomplete
function setupMentionAutocomplete(textarea) {
    mentionState.textarea = textarea;
    const dropdown = document.getElementById('mention-dropdown');

    textarea.addEventListener('input', async (e) => {
        const cursorPos = textarea.selectionStart;
        const text = textarea.value.substring(0, cursorPos);
        const lastAtIndex = text.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = text.substring(lastAtIndex + 1);
            const isValidMention = /^[a-zA-Z\s'-]*$/.test(textAfterAt) && textAfterAt.length <= 50;

            if (isValidMention) {
                mentionState.active = true;
                mentionState.startPos = lastAtIndex;
                await searchAndShowMentions(textAfterAt, textarea);
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

async function searchAndShowMentions(query, textarea) {
    const token = localStorage.getItem('comment_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const users = await response.json();
            mentionState.users = users;
            mentionState.selectedIndex = 0;
            showMentionDropdown(textarea);
        }
    } catch (error) {
        console.error('Failed to search users:', error);
    }
}

function showMentionDropdown(textarea) {
    const dropdown = document.getElementById('mention-dropdown');

    if (mentionState.users.length === 0) {
        dropdown.innerHTML = '<div class="mention-dropdown-empty">No users found</div>';
    } else {
        dropdown.innerHTML = mentionState.users.map((user, index) =>
            `<div class="mention-dropdown-item ${index === mentionState.selectedIndex ? 'selected' : ''}" data-user-id="${user.id}">
                @${escapeHtml(user.name)}
            </div>`
        ).join('');
    }

    const rect = textarea.getBoundingClientRect();
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;

    dropdown.style.display = 'block';
    dropdown.style.left = `${rect.left + 10}px`;
    dropdown.style.top = `${rect.top + (currentLineIndex + 1) * lineHeight + 30}px`;
}

function hideMentionDropdown() {
    mentionState.active = false;
    mentionState.users = [];
    document.getElementById('mention-dropdown').style.display = 'none';
}

function updateMentionSelection() {
    const items = document.querySelectorAll('.mention-dropdown-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === mentionState.selectedIndex);
    });
}

function selectMention(user) {
    const textarea = mentionState.textarea;
    const before = textarea.value.substring(0, mentionState.startPos);
    const after = textarea.value.substring(textarea.selectionStart);

    const mention = `[@${user.name}](/profile.html?id=${user.id})`;
    textarea.value = before + mention + after;

    const newPos = before.length + mention.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
    textarea.focus();

    hideMentionDropdown();
    updatePreview();
}

// Post notification template
async function loadPostTemplate() {
    const token = localStorage.getItem('comment_token');
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/post`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const tpl = await response.json();
            document.getElementById('post-tpl-from-name').value = tpl.from_name || defaultPostTemplate.from_name;
            document.getElementById('post-tpl-from-email').value = tpl.from_email || defaultPostTemplate.from_email;
            document.getElementById('post-tpl-subject').value = tpl.subject || defaultPostTemplate.subject;
            document.getElementById('post-tpl-body').value = tpl.body || defaultPostTemplate.body;
        } else {
            resetPostTemplate();
        }
    } catch (error) {
        resetPostTemplate();
    }
}

async function savePostTemplate() {
    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.templateSave : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');
    const data = {
        from_name: document.getElementById('post-tpl-from-name').value,
        from_email: document.getElementById('post-tpl-from-email').value,
        subject: document.getElementById('post-tpl-subject').value,
        body: document.getElementById('post-tpl-body').value
    };
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/post`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        showToast(response.ok ? 'Post template saved' : 'Failed to save template', response.ok ? 'success' : 'error');
    } catch (error) {
        showToast('Failed to save template', 'error');
    } finally {
        guard.end();
    }
}

function resetPostTemplate() {
    document.getElementById('post-tpl-from-name').value = defaultPostTemplate.from_name;
    document.getElementById('post-tpl-from-email').value = defaultPostTemplate.from_email;
    document.getElementById('post-tpl-subject').value = defaultPostTemplate.subject;
    document.getElementById('post-tpl-body').value = defaultPostTemplate.body;
}
