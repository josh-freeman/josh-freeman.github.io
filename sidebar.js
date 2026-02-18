// Sidebar Navigation Component
const API_BASE = 'https://api.joshfreeman.me';

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

// Cache for site owner profile
let siteOwnerProfile = null;

async function fetchSiteOwnerProfile() {
    if (siteOwnerProfile) return siteOwnerProfile;
    try {
        const response = await fetch(`${API_BASE}/users/site-owner`);
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
        ? '<submenu><a href="https://joshfreeman.me/admin.html">Admin Console</a></submenu>'
        : '';

    const editProfileBtn = isAdminLoggedIn()
        ? '<button onclick="openProfileEditModal()" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 14px;" title="Edit Profile">✏️</button>'
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
                <a href="/blog.html">
                    Blog
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
function openProfileEditModal() {
    const token = localStorage.getItem('comment_token');
    if (!token) {
        alert('Please log in first');
        return;
    }

    // Fetch current profile
    fetch(`${API_BASE}/admin/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(profile => {
        showProfileEditModal(profile);
    })
    .catch(() => alert('Failed to load profile'));
}

function showProfileEditModal(profile) {
    const modal = document.createElement('div');
    modal.id = 'profile-edit-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;';
    modal.onclick = function(e) { if (e.target === this) this.remove(); };

    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">Edit Profile</h3>
                <button onclick="document.getElementById('profile-edit-modal').remove()" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: #999;">&times;</button>
            </div>

            <div style="margin-bottom: 1.5rem; text-align: center;">
                <img id="profile-preview" src="${profile.profile_picture_url || '/resources/profile.png'}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #e0e0e0;">
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Profile Picture URL</label>
                <input type="text" id="profile-pic-url" value="${profile.profile_picture_url || ''}" placeholder="https://images.joshfreeman.me/..." style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem;">
                <small style="color: #666; font-size: 0.8rem;">Use a URL from images.joshfreeman.me</small>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Bio</label>
                <textarea id="profile-bio" rows="4" placeholder="Tell visitors about yourself..." style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; resize: vertical;">${profile.bio || ''}</textarea>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button onclick="saveProfile()" style="flex: 1; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">Save</button>
                <button onclick="document.getElementById('profile-edit-modal').remove()" style="flex: 1; padding: 0.75rem; background: #e0e0e0; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Live preview for profile picture
    document.getElementById('profile-pic-url').addEventListener('input', function() {
        const preview = document.getElementById('profile-preview');
        if (this.value) {
            preview.src = this.value;
        }
    });
}

function saveProfile() {
    const token = localStorage.getItem('comment_token');
    const bio = document.getElementById('profile-bio').value;
    const profilePictureUrl = document.getElementById('profile-pic-url').value;

    fetch(`${API_BASE}/admin/profile`, {
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
