/**
 * Admin Invites Tab - Invite link management functionality
 */

// Default invite email template
const defaultInviteTemplate = {
    from_name: "Josh Freeman",
    from_email: "josh@joshfreeman.me",
    subject: "You're invited to joshfreeman.me",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Hey {name}!</h2>
    <p style="color: #4b5563; line-height: 1.6;">
        You've been invited to join my blog as a friend. This gives you access to exclusive posts and the ability to leave comments.
    </p>
    <p style="margin: 24px 0;">
        <a href="{url}" style="background: linear-gradient(135deg, #e5a54b, #c48a3a); color: #0c0b0d; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Accept Invitation
        </a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">
        This invite expires in {expires}. If the button doesn't work, copy this link:<br>
        <a href="{url}" style="color: #c48a3a;">{url}</a>
    </p>
    <p style="color: #4b5563; margin-top: 24px;">— Josh</p>
</div>`
};

// Invite form visibility
function showInviteForm() {
    document.getElementById('invite-form').style.display = 'block';
    document.getElementById('invite-link-display').style.display = 'none';
}

function hideInviteForm() {
    document.getElementById('invite-form').style.display = 'none';
}

// Create new invite
async function createInvite(event) {
    event.preventDefault();

    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.inviteCreate : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');
    const name = document.getElementById('invite-name').value.trim();
    const email = document.getElementById('invite-email').value.trim();
    const expiresMinutes = parseInt(document.getElementById('invite-expires').value) || 10080;
    const sendEmail = event.submitter && event.submitter.dataset.sendEmail === 'true';

    try {
        const response = await fetch(`${API_BASE}/admin/invites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, expires_minutes: expiresMinutes, send_email: sendEmail })
        });

        if (response.ok) {
            const invite = await response.json();
            const link = `${window.location.origin}/register.html?token=${invite.token}`;
            document.getElementById('invite-link-input').value = link;
            document.getElementById('invite-form').style.display = 'none';
            document.getElementById('invite-link-display').style.display = 'block';
            loadInvites();

            if (sendEmail) {
                if (invite.email_sent === true) {
                    showToast(`Invite created and email sent to ${email}`, 'success');
                } else {
                    showToast(`Invite created but email failed: ${invite.email_error || 'Unknown error'}`, 'error');
                }
            }
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to create invite', 'error');
        }
    } catch (error) {
        showToast('Failed to create invite', 'error');
    } finally {
        guard.end();
    }
}

function copyInviteLink() {
    const input = document.getElementById('invite-link-input');
    input.select();
    document.execCommand('copy');
    showToast('Copied!', 'success');
}

function copyInviteLinkById(token) {
    const link = `${window.location.origin}/register.html?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Copied!', 'success');
    });
}

// Load invites list
async function loadInvites() {
    const token = localStorage.getItem('comment_token');
    const container = document.getElementById('invites-list');

    try {
        const response = await fetch(`${API_BASE}/admin/invites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allInvites = await response.json();
            invitesVisible = PAGE_SIZE;
            renderInvites();
        }
    } catch (error) {
        container.innerHTML = '<p class="error-message">Failed to load invites</p>';
    }
}

function renderInvites() {
    const container = document.getElementById('invites-list');
    const showInactive = document.getElementById('filter-inactive-invites').checked;
    const cleanupBtn = document.getElementById('cleanup-invites-btn');

    if (allInvites.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No invites yet.</p>';
        cleanupBtn.style.display = 'none';
        return;
    }

    const now = new Date();

    const filteredInvites = allInvites.filter(invite => {
        const expired = new Date(invite.expires_at) < now;
        const isInactive = invite.used || expired;
        return showInactive ? isInactive : !isInactive;
    });

    const inactiveCount = allInvites.filter(invite => {
        const expired = new Date(invite.expires_at) < now;
        return invite.used || expired;
    }).length;

    cleanupBtn.style.display = (showInactive && inactiveCount > 0) ? 'inline-block' : 'none';
    if (inactiveCount > 0) {
        cleanupBtn.textContent = `Delete all inactive (${inactiveCount})`;
    }

    if (filteredInvites.length === 0) {
        container.innerHTML = showInactive
            ? '<p style="color: var(--text-muted);">No used or expired invites.</p>'
            : '<p style="color: var(--text-muted);">No active invites.</p>';
        return;
    }

    const visibleInvites = filteredInvites.slice(0, invitesVisible);
    const hasMore = filteredInvites.length > invitesVisible;

    container.innerHTML = visibleInvites.map(invite => {
        const expired = new Date(invite.expires_at) < now;
        const status = invite.used ? 'Used' : (expired ? 'Expired' : 'Active');
        const statusClass = invite.used ? 'badge-published' : (expired ? 'badge-draft' : 'badge-published');

        return `
            <div class="post-item ${(invite.used || expired) ? 'inactive' : ''}" style="${(invite.used || expired) ? 'opacity: 0.7; background: rgba(229, 165, 75, 0.1);' : ''}">
                <div class="post-item-info">
                    <h3 style="font-family: monospace; font-size: 0.9rem;">${invite.token.substring(0, 16)}...</h3>
                    <div class="meta">
                        <span class="badge ${statusClass}">${status}</span>
                        &middot; ${escapeHtml(invite.name)} (${escapeHtml(invite.email)})
                        &middot; Expires: ${formatDateTime(invite.expires_at)}
                    </div>
                </div>
                <div class="post-item-actions">
                    ${!invite.used && !expired ? `<button class="btn" onclick="sendInviteReminder(${invite.id}, '${escapeHtml(invite.email)}')" style="background: var(--info, #7da8c9); color: var(--bg-primary, #0c0b0d);">Remind</button>` : ''}
                    ${!invite.used && !expired ? `<button class="btn" onclick="copyInviteLinkById('${invite.token}')">Copy Link</button>` : ''}
                    <button class="btn" onclick="deleteInvite(${invite.id})" style="background: var(--error, #d4726a); color: var(--bg-primary, #0c0b0d);">Delete</button>
                </div>
            </div>
        `;
    }).join('') + (hasMore ? `
        <button class="btn" onclick="showMoreInvites()" style="width: 100%; margin-top: 0.5rem; background: var(--bg-tertiary, #1e1c21); color: var(--text-primary, #f5f2ed);">
            Show more (${filteredInvites.length - invitesVisible} remaining)
        </button>
    ` : '');
}

function filterInvites() {
    invitesVisible = PAGE_SIZE;
    renderInvites();
}

function showMoreInvites() {
    invitesVisible += PAGE_SIZE;
    renderInvites();
}

// Cleanup inactive invites
async function cleanupInvites() {
    const now = new Date();
    const inactiveInvites = allInvites.filter(invite => {
        const expired = new Date(invite.expires_at) < now;
        return invite.used || expired;
    });

    if (inactiveInvites.length === 0) return;

    if (!confirm(`Delete ${inactiveInvites.length} used/expired invite(s)?`)) return;

    const token = localStorage.getItem('comment_token');
    let deleted = 0;

    for (const invite of inactiveInvites) {
        try {
            const response = await fetch(`${API_BASE}/admin/invites/${invite.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) deleted++;
        } catch (error) {
            console.error('Failed to delete invite', invite.id);
        }
    }

    showToast(`Deleted ${deleted} invite(s)`, 'success');
    loadInvites();
}

// Send reminder email for pending invite
async function sendInviteReminder(inviteId, email) {
    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/invites/${inviteId}/remind`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast(`Reminder sent to ${email}`, 'success');
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to send reminder', 'error');
        }
    } catch (error) {
        showToast('Failed to send reminder', 'error');
    }
}

// Delete single invite
async function deleteInvite(inviteId) {
    if (!confirm('Delete this invite?')) return;

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/invites/${inviteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadInvites();
        } else {
            showToast('Failed to delete invite', 'error');
        }
    } catch (error) {
        showToast('Failed to delete invite', 'error');
    }
}

// Invite email template management
async function loadInviteTemplate() {
    const token = localStorage.getItem('comment_token');
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/invite`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const tpl = await response.json();
            document.getElementById('invite-tpl-from-name').value = tpl.from_name || defaultInviteTemplate.from_name;
            document.getElementById('invite-tpl-from-email').value = tpl.from_email || defaultInviteTemplate.from_email;
            document.getElementById('invite-tpl-subject').value = tpl.subject || defaultInviteTemplate.subject;
            document.getElementById('invite-tpl-body').value = tpl.body || defaultInviteTemplate.body;
        } else {
            resetInviteTemplate();
        }
    } catch (error) {
        resetInviteTemplate();
    }
}

async function saveInviteTemplate() {
    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.templateSave : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');
    const data = {
        from_name: document.getElementById('invite-tpl-from-name').value,
        from_email: document.getElementById('invite-tpl-from-email').value,
        subject: document.getElementById('invite-tpl-subject').value,
        body: document.getElementById('invite-tpl-body').value
    };
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/invite`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        showToast(response.ok ? 'Invite template saved' : 'Failed to save template', response.ok ? 'success' : 'error');
    } catch (error) {
        showToast('Failed to save template', 'error');
    } finally {
        guard.end();
    }
}

function resetInviteTemplate() {
    document.getElementById('invite-tpl-from-name').value = defaultInviteTemplate.from_name;
    document.getElementById('invite-tpl-from-email').value = defaultInviteTemplate.from_email;
    document.getElementById('invite-tpl-subject').value = defaultInviteTemplate.subject;
    document.getElementById('invite-tpl-body').value = defaultInviteTemplate.body;
}

// Default invite reminder email template
const defaultInviteReminderTemplate = {
    from_name: "Josh Freeman",
    from_email: "josh@joshfreeman.me",
    subject: "Reminder: Your invitation to joshfreeman.me",
    body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Hey {name}!</h2>
    <p style="color: #4b5563; line-height: 1.6;">
        Just a friendly reminder — you have a pending invitation to join my blog! I'd love to have you as part of the community.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">
        As a friend, you'll get access to exclusive posts and be able to join the conversation with comments.
    </p>
    <p style="margin: 24px 0;">
        <a href="{url}" style="background: linear-gradient(135deg, #e5a54b, #c48a3a); color: #0c0b0d; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Accept Invitation
        </a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">
        This invite expires in {expires}. If the button doesn't work, copy this link:<br>
        <a href="{url}" style="color: #c48a3a;">{url}</a>
    </p>
    <p style="color: #4b5563; margin-top: 24px;">— Josh</p>
</div>`
};

// Invite reminder email template management
async function loadInviteReminderTemplate() {
    const token = localStorage.getItem('comment_token');
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/invite_reminder`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const tpl = await response.json();
            document.getElementById('invite-reminder-tpl-from-name').value = tpl.from_name || defaultInviteReminderTemplate.from_name;
            document.getElementById('invite-reminder-tpl-from-email').value = tpl.from_email || defaultInviteReminderTemplate.from_email;
            document.getElementById('invite-reminder-tpl-subject').value = tpl.subject || defaultInviteReminderTemplate.subject;
            document.getElementById('invite-reminder-tpl-body').value = tpl.body || defaultInviteReminderTemplate.body;
        } else {
            resetInviteReminderTemplate();
        }
    } catch (error) {
        resetInviteReminderTemplate();
    }
}

async function saveInviteReminderTemplate() {
    const guard = typeof loadingGuards !== 'undefined' ? loadingGuards.templateSave : { start: () => true, end: () => {} };
    if (!guard.start()) return;

    const token = localStorage.getItem('comment_token');
    const data = {
        from_name: document.getElementById('invite-reminder-tpl-from-name').value,
        from_email: document.getElementById('invite-reminder-tpl-from-email').value,
        subject: document.getElementById('invite-reminder-tpl-subject').value,
        body: document.getElementById('invite-reminder-tpl-body').value
    };
    try {
        const response = await fetch(`${API_BASE}/admin/settings/email-templates/invite_reminder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        showToast(response.ok ? 'Reminder template saved' : 'Failed to save template', response.ok ? 'success' : 'error');
    } catch (error) {
        showToast('Failed to save template', 'error');
    } finally {
        guard.end();
    }
}

function resetInviteReminderTemplate() {
    document.getElementById('invite-reminder-tpl-from-name').value = defaultInviteReminderTemplate.from_name;
    document.getElementById('invite-reminder-tpl-from-email').value = defaultInviteReminderTemplate.from_email;
    document.getElementById('invite-reminder-tpl-subject').value = defaultInviteReminderTemplate.subject;
    document.getElementById('invite-reminder-tpl-body').value = defaultInviteReminderTemplate.body;
}
