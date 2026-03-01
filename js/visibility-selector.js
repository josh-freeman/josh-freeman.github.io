/**
 * Reusable Visibility Selector Component
 *
 * Creates a mutually exclusive visibility funnel: Draft → Early Access → Friends → Public
 * Plus a separate Listed/Unlisted toggle.
 *
 * Usage:
 *   const selector = createVisibilitySelector('my-prefix');
 *   container.innerHTML = selector.render();
 *   selector.init();
 *   selector.setFromPost(post);
 *   const fields = selector.getFields();
 */

function createVisibilitySelector(prefix = 'visibility') {
    const ids = {
        selector: `${prefix}-selector`,
        visibility: `${prefix}-value`,
        unlisted: `${prefix}-unlisted`,
        listingToggle: `${prefix}-listing-toggle`,
        listedCheckbox: `${prefix}-listed-checkbox`,
        listingThumb: `${prefix}-listing-thumb`
    };

    const colors = {
        draft: { bg: 'rgba(138, 133, 124, 0.2)', border: 'var(--text-muted, #8a857c)', text: 'var(--text-primary, #f5f2ed)' },
        early_access: { bg: 'rgba(229, 165, 75, 0.15)', border: 'var(--accent-primary, #e5a54b)', text: 'var(--accent-primary, #e5a54b)' },
        friends: { bg: 'rgba(111, 172, 186, 0.15)', border: '#6facba', text: '#6facba' },
        public: { bg: 'rgba(88, 166, 92, 0.15)', border: '#58a65c', text: '#58a65c' }
    };

    const options = [
        { value: 'draft', label: 'Draft', icon: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>' },
        { value: 'early_access', label: 'Early Access', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
        { value: 'friends', label: 'Friends', icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { value: 'public', label: 'Public', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>' }
    ];

    function render() {
        const buttonStyle = 'flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; background: transparent; border: none; border-radius: 8px; color: var(--text-muted, #8a857c); cursor: pointer; font-size: 0.75rem; font-family: var(--font-ui, "DM Sans", sans-serif); font-weight: 500;';

        const buttons = options.map((opt, i) => `
            <button type="button" class="${prefix}-option" data-value="${opt.value}" style="${buttonStyle}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${opt.icon}</svg>
                <span>${opt.label}</span>
            </button>
        `).join('');

        return `
            <input type="hidden" id="${ids.visibility}" value="draft">
            <input type="hidden" id="${ids.unlisted}" value="false">

            <div id="${ids.selector}" style="display: flex; background: var(--bg-tertiary, #1e1c21); border-radius: 10px; padding: 4px; gap: 4px; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));">
                ${buttons}
            </div>

            <label id="${ids.listingToggle}" style="display: none; margin-top: 0.75rem; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none;">
                <input type="checkbox" id="${ids.listedCheckbox}" style="display: none;">
                <span style="width: 36px; height: 20px; background: var(--bg-secondary, #151418); border-radius: 10px; position: relative; transition: background 0.2s ease; border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); display: inline-block;">
                    <span id="${ids.listingThumb}" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--text-muted, #8a857c); border-radius: 50%; transition: all 0.2s ease;"></span>
                </span>
                <span style="font-size: 0.8rem; color: var(--text-secondary, #c4bfb6);">Show in post listing</span>
            </label>
        `;
    }

    function init() {
        // Attach click handlers to visibility options
        const selector = document.getElementById(ids.selector);
        if (selector) {
            selector.addEventListener('click', (e) => {
                const btn = e.target.closest(`.${prefix}-option`);
                if (btn) {
                    setVisibility(btn.dataset.value);
                }
            });
        }

        // Attach change handler to listed checkbox
        const checkbox = document.getElementById(ids.listedCheckbox);
        if (checkbox) {
            checkbox.addEventListener('change', updateListedState);
        }

        // Set initial state
        setVisibility('draft');
    }

    function setVisibility(value) {
        const opts = document.querySelectorAll(`.${prefix}-option`);
        const hiddenInput = document.getElementById(ids.visibility);
        const listingToggle = document.getElementById(ids.listingToggle);
        const listedCheckbox = document.getElementById(ids.listedCheckbox);

        opts.forEach(opt => {
            const isActive = opt.dataset.value === value;
            opt.classList.toggle('active', isActive);
            const c = colors[value] || colors.draft;
            if (isActive) {
                opt.style.background = c.bg;
                opt.style.boxShadow = `inset 0 0 0 1px ${c.border}`;
                opt.style.color = c.text;
            } else {
                opt.style.background = 'transparent';
                opt.style.boxShadow = 'none';
                opt.style.color = 'var(--text-muted, #8a857c)';
            }
        });

        if (hiddenInput) hiddenInput.value = value;

        // Show listing toggle only for non-draft states
        if (listingToggle) {
            listingToggle.style.display = (value !== 'draft') ? 'flex' : 'none';
        }

        // Default to listed for public posts
        if (value === 'public' && listedCheckbox && !listedCheckbox.checked) {
            listedCheckbox.checked = true;
            updateListedState();
        }
    }

    function updateListedState() {
        const checkbox = document.getElementById(ids.listedCheckbox);
        const thumb = document.getElementById(ids.listingThumb);
        const toggle = checkbox?.parentElement?.querySelector('span');
        const hiddenInput = document.getElementById(ids.unlisted);

        if (!checkbox || !thumb || !toggle) return;

        const isListed = checkbox.checked;
        if (hiddenInput) hiddenInput.value = (!isListed).toString();

        if (isListed) {
            toggle.style.background = 'var(--accent-primary, #e5a54b)';
            thumb.style.left = '19px';
            thumb.style.background = 'white';
        } else {
            toggle.style.background = 'var(--bg-secondary, #151418)';
            thumb.style.left = '2px';
            thumb.style.background = 'var(--text-muted, #8a857c)';
        }
    }

    function getFields() {
        const visibility = document.getElementById(ids.visibility)?.value || 'draft';
        const isUnlisted = document.getElementById(ids.unlisted)?.value === 'true';

        return {
            is_published: visibility !== 'draft',
            is_early_access: visibility === 'early_access',
            is_friends_only: visibility === 'friends',
            is_unlisted: isUnlisted
        };
    }

    function setFromPost(post) {
        let visibility = 'draft';
        if (post.is_published) {
            if (post.is_early_access) {
                visibility = 'early_access';
            } else if (post.is_friends_only) {
                visibility = 'friends';
            } else {
                visibility = 'public';
            }
        }

        setVisibility(visibility);

        // Set listed state
        const listedCheckbox = document.getElementById(ids.listedCheckbox);
        if (listedCheckbox) {
            listedCheckbox.checked = !post.is_unlisted;
            updateListedState();
        }
    }

    function getVisibility() {
        return document.getElementById(ids.visibility)?.value || 'draft';
    }

    return {
        render,
        init,
        setVisibility,
        updateListedState,
        getFields,
        setFromPost,
        getVisibility,
        ids
    };
}

// Export for use in modules or make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createVisibilitySelector };
}
