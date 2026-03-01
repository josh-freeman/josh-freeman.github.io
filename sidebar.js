// Sidebar Navigation Component
// Set API_BASE - auto-detect local dev
if (typeof window.API_BASE === 'undefined') {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.API_BASE = isLocalDev ? 'http://localhost:8080' : 'https://api.joshfreeman.me';
}
// Also set COMMENTS_API_BASE for comments.js compatibility
if (typeof window.COMMENTS_API_BASE === 'undefined') {
    window.COMMENTS_API_BASE = window.API_BASE;
}

function isAdminLoggedIn() {
    try {
        const user = localStorage.getItem('comment_user');
        if (user) {
            const userData = JSON.parse(user);
            return userData.is_admin === true;
        }
    } catch (e) {}
    return false;
}

function isUserLoggedIn() {
    try {
        const token = localStorage.getItem('comment_token');
        const user = localStorage.getItem('comment_user');
        return !!(token && user);
    } catch (e) {}
    return false;
}

function shouldShowSubscribeLink() {
    // Show subscribe link to logged-in users who are not approved (not friends)
    // and don't have an active subscription
    // Friends and active subscribers already have full access
    try {
        const userStr = localStorage.getItem('comment_user');
        if (!userStr) return false;
        const user = JSON.parse(userStr);
        // Don't show if they're already a friend or admin
        if (user.is_approved || user.is_admin) return false;
        // Don't show if they have an active subscription
        if (user.subscription_status === 'active') return false;
        return true;
    } catch (e) {}
    return false;
}

// Cache for site owner profile
let siteOwnerProfile = null;

async function fetchSiteOwnerProfile() {
    if (siteOwnerProfile) return siteOwnerProfile;
    try {
        const response = await fetch(`${window.API_BASE}/users/site-owner`);
        if (response.ok) {
            siteOwnerProfile = await response.json();
            return siteOwnerProfile;
        }
    } catch (e) {
        console.error('Failed to fetch site owner profile:', e);
    }
    return null;
}

function loadNavbarDiv() {
    const adminLink = isAdminLoggedIn()
        ? '<submenu><a href="/admin.html">Admin Console</a></submenu>'
        : '';

    // Show subscribe link for logged-in non-friend users
    const subscribeLink = shouldShowSubscribeLink()
        ? '<submenu><a href="/subscribe.html" style="color: var(--accent-primary);">Subscribe</a></submenu>'
        : '';

    // Account widget - shows login link or user info with logout
    let accountWidget = '';
    if (isUserLoggedIn()) {
        try {
            const user = JSON.parse(localStorage.getItem('comment_user'));
            const userName = user.name || 'User';
            accountWidget = `
                <div class="sidebar-account">
                    <div class="sidebar-account-row">
                        <a href="/profile.html" class="sidebar-account-info">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span>${userName}</span>
                        </a>
                        <button onclick="sidebarLogout()" class="sidebar-logout-btn" title="Log out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            accountWidget = '';
        }
    } else {
        accountWidget = `
            <div class="sidebar-account">
                <a href="/login.html" class="sidebar-login-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>
                    Log in
                </a>
            </div>
        `;
    }

    const editProfileBtn = isAdminLoggedIn()
        ? '<button onclick="openProfileEditModal()" style="position:absolute; bottom:10px; right:10px; background:var(--accent-primary, #e5a54b); border:2px solid var(--bg-primary, #0c0b0d); border-radius:50%; width:30px; height:30px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;" title="Edit Profile"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary, #0c0b0d)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>'
        : '';

    const navbarHTML = `
        <div id="mySidebar" class="sidebar">
            <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>

            <div style="position: relative; display: inline-block;">
                ${editProfileBtn}
                <a href="/index.html">
                    <img id="sidebar-profile-pic"
                         src="/resources/profile.png?v=2"
                         alt="Joshua Freeman"
                         width="180"
                         height="180"
                         style="padding: 10px;">
                </a>
            </div>

            <submenu>
                <a href="/index.html">Home</a>
            </submenu>

            <submenu>
                <a href="/cv.html">
                    Curriculum Vitae
                </a>
            </submenu>

            <submenu>
                <a href="/socialnet.html">
                    SocialNet
                </a>
            </submenu>

            <submenu>
                <a>Miscellany</a>
                <subsubmenu><a href="/notes.html">Notes</a></subsubmenu>
                <subsubmenu><a href="/friends.html">Friends</a></subsubmenu>
                <subsubmenu><a href="/poetry.html">Poetry</a></subsubmenu>
                <subsubmenu><a href="https://github.com/josh-freeman/josh-freeman.github.io" target="_blank" class="external">Source code</a></subsubmenu>
                <subsubmenu><a href="https://www.goodreads.com/review/list/184752391?shelf=read" target="_blank" class="external">Book reviews</a></subsubmenu>
            </submenu>

            ${adminLink}
            ${subscribeLink}

            ${accountWidget}
        </div>

        <button id="menubtn" class="openbtn" onclick="openNav()">
            <span style="margin-right: 4px;">&#9776;</span>
            <img src="/resources/icon_blue.png"
                 alt=""
                 width="24"
                 height="24">
        </button>
    `;

    document.querySelectorAll('sidebar').forEach(el => {
        el.innerHTML = navbarHTML;
    });
}

// Logout function for sidebar
function sidebarLogout() {
    localStorage.removeItem('comment_token');
    localStorage.removeItem('comment_user');
    window.location.reload();
}

// Inject sidebar account styles
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-account {
            margin-top: auto;
            padding: 0.5rem 0;
            border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
        }
        .sidebar-account a {
            display: flex !important;
            padding: 0.75rem 1.25rem !important;
        }
        .sidebar-account-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.25rem;
            border-left: 2px solid transparent;
        }
        .sidebar-account-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary, #c4bfb6);
            font-size: var(--text-sm, 0.875rem);
            font-family: var(--font-ui, 'DM Sans', sans-serif);
            min-width: 0;
            text-decoration: none;
            transition: color 0.2s ease;
        }
        .sidebar-account-info:hover {
            color: var(--text-primary, #f5f2ed);
        }
        .sidebar-account-info span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .sidebar-account-info svg {
            flex-shrink: 0;
            color: var(--text-muted, #8a857c);
        }
        .sidebar-logout-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.4rem;
            border-radius: 6px;
            color: var(--text-muted, #8a857c);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .sidebar-logout-btn:hover {
            background: rgba(212, 114, 106, 0.15);
            color: var(--error, #d4726a);
        }
        .sidebar-login-link {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary, #c4bfb6);
            text-decoration: none;
            font-size: var(--text-sm, 0.875rem);
            font-family: var(--font-ui, 'DM Sans', sans-serif);
            padding: 0.75rem 1.25rem;
            border-left: 2px solid transparent;
            transition: all 0.2s ease;
        }
        .sidebar-login-link:hover {
            background: var(--bg-hover, rgba(255,255,255,0.05));
            color: var(--text-primary, #f5f2ed);
            border-left-color: var(--accent-primary, #e5a54b);
        }
        .sidebar-login-link svg {
            color: var(--accent-primary, #e5a54b);
            flex-shrink: 0;
        }
    `;
    document.head.appendChild(style);
})();

// Initialize sidebar
loadNavbarDiv();

// Update profile picture from API
fetchSiteOwnerProfile().then(profile => {
    if (profile && profile.profile_picture_url) {
        const img = document.getElementById('sidebar-profile-pic');
        if (img) {
            img.src = profile.profile_picture_url;
        }
    }
    // Also update bio if on index page
    if (profile && profile.bio) {
        const bioEl = document.getElementById('dynamic-bio');
        if (bioEl) {
            bioEl.textContent = profile.bio;
        }
    }
});

// Profile edit modal for admin
let profileModalLoading = false;

function openProfileEditModal() {
    // Prevent duplicate modals or concurrent requests
    if (document.getElementById('profile-edit-modal') || profileModalLoading) {
        return;
    }

    const token = localStorage.getItem('comment_token');
    if (!token) {
        alert('Please log in first');
        return;
    }

    profileModalLoading = true;

    // Fetch current profile
    fetch(`${window.API_BASE}/admin/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(profile => {
        profileModalLoading = false;
        showProfileEditModal(profile);
    })
    .catch(() => {
        profileModalLoading = false;
        alert('Failed to load profile');
    });
}

function showProfileEditModal(profile) {
    // Get current displayed bio as fallback if API bio is empty
    const currentDisplayedBio = document.getElementById('dynamic-bio')?.textContent || '';
    const bioToShow = profile.bio || currentDisplayedBio;

    const modal = document.createElement('div');
    modal.id = 'profile-edit-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;';
    modal.onclick = function(e) { if (e.target === this) this.remove(); };

    modal.innerHTML = `
        <div style="background: var(--bg-elevated, #262329); color: var(--text-primary, #f5f2ed); padding: 2rem; border-radius: 12px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));" onclick="event.stopPropagation()">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: var(--text-primary, #f5f2ed);">Edit Profile</h3>
                <button onclick="document.getElementById('profile-edit-modal').remove()" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-muted, #8a857c);">&times;</button>
            </div>

            <div style="margin-bottom: 1.5rem; text-align: center;">
                <div style="position: relative; display: inline-block; cursor: pointer;" onclick="document.getElementById('profile-pic-input').click()">
                    <img id="profile-preview" src="${profile.profile_picture_url || '/resources/profile.png'}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-default, rgba(255, 255, 255, 0.1));">
                    <div style="position: absolute; bottom: 0; right: 0; background: var(--accent-primary, #e5a54b); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 3px solid var(--bg-elevated, #262329);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary, #0c0b0d)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    </div>
                </div>
                <input type="file" id="profile-pic-input" accept="image/*" style="display: none;">
                <input type="hidden" id="profile-pic-url" value="${profile.profile_picture_url || ''}">
                <p id="upload-status" style="font-size: 0.85rem; color: var(--text-muted, #8a857c); margin-top: 0.5rem;">Click to upload a new photo</p>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary, #f5f2ed);">Bio</label>
                <textarea id="profile-bio" rows="4" placeholder="Tell visitors about yourself..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; font-size: 0.9rem; resize: vertical; box-sizing: border-box; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed);"></textarea>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button onclick="saveProfile()" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a)); color: var(--bg-primary, #0c0b0d); border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 500;">Save</button>
                <button onclick="document.getElementById('profile-edit-modal').remove()" style="flex: 1; padding: 0.75rem; background: var(--bg-tertiary, #1e1c21); color: var(--text-primary, #f5f2ed); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; cursor: pointer; font-size: 1rem;">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Set bio value after DOM insertion to avoid escaping issues
    document.getElementById('profile-bio').value = bioToShow;

    // Handle file upload
    document.getElementById('profile-pic-input').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        const statusEl = document.getElementById('upload-status');
        const preview = document.getElementById('profile-preview');
        const urlInput = document.getElementById('profile-pic-url');

        statusEl.textContent = 'Uploading...';
        statusEl.style.color = 'var(--accent-primary, #e5a54b)';

        try {
            const token = localStorage.getItem('comment_token');
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${window.API_BASE}/admin/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();

            // Update preview and hidden input
            preview.src = result.url;
            urlInput.value = result.url;

            statusEl.textContent = 'Uploaded! Click Save to apply.';
            statusEl.style.color = '#22c55e';
        } catch (err) {
            console.error('Upload error:', err);
            statusEl.textContent = 'Upload failed. Try again.';
            statusEl.style.color = '#ef4444';
        }
    });
}

function saveProfile() {
    const token = localStorage.getItem('comment_token');
    const bio = document.getElementById('profile-bio').value;
    const profilePictureUrl = document.getElementById('profile-pic-url').value;

    fetch(`${window.API_BASE}/admin/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            bio: bio || null,
            profile_picture_url: profilePictureUrl || null
        })
    })
    .then(r => {
        if (!r.ok) throw new Error('Failed to save');
        return r.json();
    })
    .then(profile => {
        // Update the sidebar image
        const sidebarImg = document.getElementById('sidebar-profile-pic');
        if (sidebarImg && profile.profile_picture_url) {
            sidebarImg.src = profile.profile_picture_url;
        }
        // Update bio if on index page
        const bioEl = document.getElementById('dynamic-bio');
        if (bioEl && profile.bio) {
            bioEl.textContent = profile.bio;
        }
        // Update cache
        siteOwnerProfile = profile;
        // Close modal
        document.getElementById('profile-edit-modal')?.remove();
        alert('Profile saved!');
    })
    .catch(() => alert('Failed to save profile'));
}

// Responsive behavior
function handleResize(mediaQuery) {
    if (mediaQuery.matches) {
        closeNav();
    } else {
        openNav();
    }
}

const mediaQuery = window.matchMedia("(max-width: 992px)");
handleResize(mediaQuery);
mediaQuery.addEventListener('change', handleResize);

// Navigation functions
function openNav() {
    const sidebar = document.getElementById("mySidebar");
    const main = document.getElementById("main");
    const btn = document.getElementById("menubtn");
    const isMobile = window.innerWidth <= 768;

    if (sidebar) sidebar.style.width = isMobile ? "100%" : "260px";
    if (main) main.style.marginLeft = isMobile ? "0" : "260px";
    if (btn) btn.onclick = closeNav;
}

function closeNav() {
    const sidebar = document.getElementById("mySidebar");
    const main = document.getElementById("main");
    const btn = document.getElementById("menubtn");

    if (sidebar) sidebar.style.width = "0";
    if (main) main.style.marginLeft = "0";
    if (btn) btn.onclick = openNav;
}

// Load WebSocket client for real-time updates (all users)
const wsScript = document.createElement('script');
wsScript.src = '/js/websocket.js';
document.head.appendChild(wsScript);

// Load notification bell and messages for all logged-in users
if (isUserLoggedIn()) {
    // Wait for WebSocket script to load first
    wsScript.onload = function() {
        // Load notifications
        const notifScript = document.createElement('script');
        notifScript.src = '/js/notifications.js';
        document.head.appendChild(notifScript);

        // Load messages
        const messagesScript = document.createElement('script');
        messagesScript.src = '/js/messages.js';
        document.head.appendChild(messagesScript);
    };
}
