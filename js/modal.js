/**
 * Modal Component for joshfreeman.me
 *
 * Provides reusable modal creation, management, and utilities.
 */

/**
 * Create and show a modal
 * @param {string} id - Unique modal ID
 * @param {string} content - HTML content for the modal
 * @param {Object} options - Modal options
 * @param {boolean} options.wide - Use wide modal (800px max-width)
 * @param {boolean} options.closeOnOverlay - Close when clicking overlay (default: true)
 * @param {Function} options.onClose - Callback when modal is closed
 * @returns {HTMLElement} The modal element
 */
function createModal(id, content, options = {}) {
    // Remove existing modal with same ID
    closeModal(id);

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    `;

    const maxWidth = options.wide ? '800px' : '500px';
    modal.innerHTML = `
        <div class="modal-content" style="
            background: var(--bg-elevated, #262329);
            color: var(--text-primary, #f5f2ed);
            padding: 1.75rem;
            border-radius: 12px;
            max-width: ${maxWidth};
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
        ">
            ${content}
        </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    if (options.closeOnOverlay !== false) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(id);
                if (options.onClose) options.onClose();
            }
        });
    }

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(id);
            if (options.onClose) options.onClose();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    return modal;
}

/**
 * Close and remove a modal
 * @param {string} id - Modal ID to close
 */
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.remove();
    }
    // Also try to remove any tooltip that might be associated
    const tooltip = document.getElementById(`${id}-tooltip`);
    if (tooltip) tooltip.remove();
}

/**
 * Create a confirm modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {Object} options - Options
 * @param {string} options.confirmText - Confirm button text (default: 'Confirm')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.confirmStyle - Confirm button style ('danger', 'primary')
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
function confirmModal(title, message, options = {}) {
    return new Promise((resolve) => {
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const confirmBg = options.confirmStyle === 'danger'
            ? 'background: var(--error, #d4726a);'
            : 'background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a));';

        const content = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: var(--text-primary, #f5f2ed);">${escapeHtml(title)}</h3>
                <button onclick="closeModal('confirm-modal')" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-muted, #8a857c);">&times;</button>
            </div>
            <p style="color: var(--text-secondary, #c4bfb6); margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="confirm-modal-cancel" style="padding: 0.6rem 1.2rem; background: var(--bg-tertiary, #1e1c21); color: var(--text-primary, #f5f2ed); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; cursor: pointer;">${escapeHtml(cancelText)}</button>
                <button id="confirm-modal-confirm" style="padding: 0.6rem 1.2rem; ${confirmBg} color: var(--bg-primary, #0c0b0d); border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">${escapeHtml(confirmText)}</button>
            </div>
        `;

        createModal('confirm-modal', content, {
            onClose: () => resolve(false)
        });

        document.getElementById('confirm-modal-cancel').onclick = () => {
            closeModal('confirm-modal');
            resolve(false);
        };

        document.getElementById('confirm-modal-confirm').onclick = () => {
            closeModal('confirm-modal');
            resolve(true);
        };
    });
}

/**
 * Create an alert modal
 * @param {string} title - Modal title
 * @param {string} message - Alert message
 * @param {string} buttonText - Button text (default: 'OK')
 * @returns {Promise<void>}
 */
function alertModal(title, message, buttonText = 'OK') {
    return new Promise((resolve) => {
        const content = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: var(--text-primary, #f5f2ed);">${escapeHtml(title)}</h3>
                <button onclick="closeModal('alert-modal')" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-muted, #8a857c);">&times;</button>
            </div>
            <p style="color: var(--text-secondary, #c4bfb6); margin-bottom: 1.5rem;">${message}</p>
            <div style="display: flex; justify-content: flex-end;">
                <button id="alert-modal-ok" style="padding: 0.6rem 1.2rem; background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a)); color: var(--bg-primary, #0c0b0d); border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">${escapeHtml(buttonText)}</button>
            </div>
        `;

        createModal('alert-modal', content, {
            onClose: () => resolve()
        });

        document.getElementById('alert-modal-ok').onclick = () => {
            closeModal('alert-modal');
            resolve();
        };
    });
}

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // Set background based on type
    const backgrounds = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)'
    };
    toast.style.background = backgrounds[type] || backgrounds.info;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Modal header HTML helper
 * @param {string} title - Modal title
 * @param {string} modalId - Modal ID for close button
 * @param {string} iconSvg - Optional icon SVG
 * @returns {string} HTML string
 */
function modalHeader(title, modalId, iconSvg = '') {
    return `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary, #f5f2ed);">
                ${iconSvg}
                ${escapeHtml(title)}
            </h3>
            <button onclick="closeModal('${modalId}')" style="background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--text-muted, #8a857c); line-height: 1;">&times;</button>
        </div>
    `;
}

// Helper function for escaping HTML (uses global if available)
function escapeHtml(text) {
    if (typeof window.escapeHtml === 'function') {
        return window.escapeHtml(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show a friendly modal explaining membership options
 * @param {string} feature - The feature being restricted ('react', 'comment', 'reply')
 */
function showFriendsOnlyModal(feature = 'react') {
    const featureText = {
        react: 'Reactions',
        comment: 'Comments',
        reply: 'Replies',
        like: 'Likes'
    };

    const title = featureText[feature] || 'This feature';

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('comment_token') && localStorage.getItem('comment_user');

    const content = `
        <div style="text-align: center; padding: 0.5rem 0;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">👋</div>
            <h3 style="margin: 0 0 1rem 0; color: var(--text-primary, #f5f2ed);">${title} are for members</h3>
            <p style="color: var(--text-secondary, #c4bfb6); margin-bottom: 1rem; line-height: 1.6;">
                This is a small personal blog. If you'd like to join the conversation, there are two ways:
            </p>
            <div style="text-align: left; background: var(--bg-tertiary, #1e1c21); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                <p style="color: var(--text-primary, #f5f2ed); margin: 0 0 0.75rem 0;">
                    <span style="color: var(--accent-primary);">Friends</span> — If we know each other, just reach out and I'll add you.
                </p>
                <p style="color: var(--text-primary, #f5f2ed); margin: 0;">
                    <span style="color: var(--accent-primary);">Subscribers</span> — €5/mo to help cover infra costs.
                </p>
            </div>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                ${isLoggedIn ? `
                    <a href="/subscribe.html" style="padding: 0.6rem 1.5rem; background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a)); color: var(--bg-primary, #0c0b0d); border: none; border-radius: 8px; cursor: pointer; font-weight: 500; text-decoration: none;">Subscribe</a>
                ` : `
                    <a href="/subscribe.html" style="padding: 0.6rem 1.5rem; background: linear-gradient(135deg, var(--accent-primary, #e5a54b), var(--accent-primary-dim, #c48a3a)); color: var(--bg-primary, #0c0b0d); border: none; border-radius: 8px; cursor: pointer; font-weight: 500; text-decoration: none;">Sign in to subscribe</a>
                `}
                <button onclick="closeModal('friends-only-modal')" style="padding: 0.6rem 1.5rem; background: var(--bg-secondary, #151418); color: var(--text-primary, #f5f2ed); border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1)); border-radius: 8px; cursor: pointer;">Maybe later</button>
            </div>
        </div>
    `;

    createModal('friends-only-modal', content);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createModal,
        closeModal,
        confirmModal,
        alertModal,
        showToast,
        modalHeader,
        showFriendsOnlyModal
    };
}
