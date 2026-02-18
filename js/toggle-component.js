/**
 * Toggle Button Component for joshfreeman.me
 *
 * Creates reusable toggle buttons with icons that switch between states.
 * Used for Published/Draft, Friends Only/Public, Unlisted/Listed toggles.
 */

/**
 * Toggle configuration for common toggles
 */
const TOGGLE_CONFIG = {
    published: {
        activeLabel: 'Published',
        inactiveLabel: 'Draft'
    },
    exclusive: {
        activeLabel: 'Friends Only',
        inactiveLabel: 'Public'
    },
    unlisted: {
        activeLabel: 'Unlisted',
        inactiveLabel: 'Listed'
    }
};

/**
 * Create a toggle state manager
 * @param {string} buttonPrefix - Prefix for button IDs (e.g., 'admin-toggle' or 'toggle')
 * @param {string} inputPrefix - Prefix for input IDs (e.g., 'post' or 'edit-post')
 * @returns {Object} Toggle state manager with get, set, toggle methods
 */
function createToggleManager(buttonPrefix, inputPrefix) {
    return {
        /**
         * Set the state of a toggle
         * @param {string} name - Toggle name (published, exclusive, unlisted)
         * @param {boolean} value - New state
         */
        set: function(name, value) {
            const btn = document.getElementById(`${buttonPrefix}-${name}`);
            const input = document.getElementById(`${inputPrefix}-${name}`);

            if (btn && input) {
                input.value = value ? 'true' : 'false';
                btn.classList.toggle('active', value);

                // Update label text
                const label = btn.querySelector('.label-text');
                if (label && TOGGLE_CONFIG[name]) {
                    label.textContent = value
                        ? TOGGLE_CONFIG[name].activeLabel
                        : TOGGLE_CONFIG[name].inactiveLabel;
                }
            }
        },

        /**
         * Get the current state of a toggle
         * @param {string} name - Toggle name
         * @returns {boolean} Current state
         */
        get: function(name) {
            const input = document.getElementById(`${inputPrefix}-${name}`);
            return input && input.value === 'true';
        },

        /**
         * Toggle the state
         * @param {string} name - Toggle name
         */
        toggle: function(name) {
            const newValue = !this.get(name);
            this.set(name, newValue);
        },

        /**
         * Reset all toggles to false
         */
        resetAll: function() {
            Object.keys(TOGGLE_CONFIG).forEach(name => {
                this.set(name, false);
            });
        },

        /**
         * Set multiple toggles at once
         * @param {Object} states - Object with toggle names as keys and boolean values
         */
        setAll: function(states) {
            Object.entries(states).forEach(([name, value]) => {
                this.set(name, value);
            });
        }
    };
}

/**
 * Create toggle button HTML
 * @param {string} name - Toggle name (published, exclusive, unlisted)
 * @param {string} buttonPrefix - Prefix for button ID
 * @param {string} iconOnSvg - SVG string for active state icon
 * @param {string} iconOffSvg - SVG string for inactive state icon
 * @param {string} [title] - Button title attribute
 * @returns {string} HTML string for the toggle button
 */
function createToggleButton(name, buttonPrefix, iconOnSvg, iconOffSvg, title) {
    const config = TOGGLE_CONFIG[name] || { activeLabel: name, inactiveLabel: name };
    const titleAttr = title || `Toggle ${config.activeLabel}/${config.inactiveLabel}`;

    return `
        <button type="button" id="${buttonPrefix}-${name}" class="icon-toggle" title="${titleAttr}">
            <span class="icon-on">${iconOnSvg}</span>
            <span class="icon-off">${iconOffSvg}</span>
            <span class="label-text">${config.inactiveLabel}</span>
        </button>
    `;
}

/**
 * Common SVG icons for toggles
 */
const TOGGLE_ICONS = {
    // Published (globe) / Draft (square-pen)
    published: {
        on: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
        off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>'
    },
    // Friends Only (user-lock) / Public (user)
    exclusive: {
        on: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16v-2a2 2 0 0 0-4 0v2"/><path d="M9.5 15H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><rect x="13" y="16" width="8" height="5" rx=".899"/></svg>',
        off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    },
    // Unlisted (eye-off) / Listed (list-check)
    unlisted: {
        on: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
        off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19H3"/><path d="M16 5H3"/><path d="M16 12H3"/><path d="m15 18 2 2 4-4"/></svg>'
    }
};

/**
 * Generate all three toggle buttons HTML
 * @param {string} buttonPrefix - Prefix for button IDs
 * @returns {string} HTML string for all toggle buttons
 */
function createAllToggleButtons(buttonPrefix) {
    return `
        ${createToggleButton('published', buttonPrefix, TOGGLE_ICONS.published.on, TOGGLE_ICONS.published.off)}
        ${createToggleButton('exclusive', buttonPrefix, TOGGLE_ICONS.exclusive.on, TOGGLE_ICONS.exclusive.off)}
        ${createToggleButton('unlisted', buttonPrefix, TOGGLE_ICONS.unlisted.on, TOGGLE_ICONS.unlisted.off)}
    `;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TOGGLE_CONFIG,
        TOGGLE_ICONS,
        createToggleManager,
        createToggleButton,
        createAllToggleButtons
    };
}
