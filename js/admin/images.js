/**
 * Admin Images Tab - Image management functionality
 */

// Image data storage
let allImages = [];

// Load all images
async function loadImages() {
    const token = localStorage.getItem('comment_token');
    const grid = document.getElementById('images-grid');
    const stats = document.getElementById('images-stats');

    try {
        const response = await fetch(`${API_BASE}/admin/images`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            allImages = data.images;

            const usedCount = allImages.filter(img => img.is_used).length;
            const unusedCount = allImages.length - usedCount;
            const totalMB = (data.total_size / (1024 * 1024)).toFixed(2);
            stats.innerHTML = `${allImages.length} images (${totalMB} MB) &middot; ${usedCount} used, ${unusedCount} unused`;

            renderImages();
        } else {
            grid.innerHTML = '<p style="color: #e74c3c;">Failed to load images</p>';
        }
    } catch (error) {
        grid.innerHTML = '<p style="color: #e74c3c;">Error loading images</p>';
    }
}

function renderImages() {
    const grid = document.getElementById('images-grid');
    const filterOrphaned = document.getElementById('filter-orphaned').checked;

    let images = allImages;
    if (filterOrphaned) {
        images = allImages.filter(img => !img.is_used);
    }

    if (images.length === 0) {
        grid.innerHTML = filterOrphaned
            ? '<p style="color: var(--text-muted);">No unused images found</p>'
            : '<p style="color: var(--text-muted);">No images uploaded yet</p>';
        return;
    }

    grid.innerHTML = images.map(img => `
        <div class="image-card ${img.is_used ? '' : 'orphaned'}">
            <span class="status-badge ${img.is_used ? 'used' : 'unused'}">${img.is_used ? 'Used' : 'Unused'}</span>
            <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.filename)}" loading="lazy">
            <div class="image-card-info">
                <div class="filename" title="${escapeHtml(img.filename)}">${escapeHtml(img.filename)}</div>
                <div class="meta">
                    <span>${formatFileSize(img.size)}</span>
                    <span>${formatShortDate(img.uploaded)}</span>
                </div>
                <div class="image-card-actions">
                    <button class="btn-copy" onclick="copyImageUrl('${escapeHtml(img.url)}')">Copy URL</button>
                    <button class="btn-delete" onclick="deleteImage('${escapeHtml(img.filename)}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterImages() {
    renderImages();
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Format short date for display
function formatShortDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Copy image URL to clipboard
function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('Copied!', 'success');
    });
}

// Delete image
async function deleteImage(filename) {
    if (!confirm(`Delete image ${filename}? This cannot be undone.`)) {
        return;
    }

    const token = localStorage.getItem('comment_token');

    try {
        const response = await fetch(`${API_BASE}/admin/images/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('Image deleted', 'success');
            loadImages();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to delete image', 'error');
        }
    } catch (error) {
        showToast('Failed to delete image', 'error');
    }
}

// Delete all unused images
async function deleteAllUnusedImages() {
    const unusedImages = allImages.filter(img => !img.is_used);

    if (unusedImages.length === 0) {
        showToast('No unused images to delete', 'error');
        return;
    }

    if (!confirm(`Delete ${unusedImages.length} unused image${unusedImages.length !== 1 ? 's' : ''}?\n\nThis cannot be undone.`)) {
        return;
    }

    // Double confirmation for safety
    if (!confirm(`Are you sure? This will permanently delete ${unusedImages.length} image${unusedImages.length !== 1 ? 's' : ''}.`)) {
        return;
    }

    const token = localStorage.getItem('comment_token');
    let deleted = 0;
    let failed = 0;

    for (const img of unusedImages) {
        try {
            const response = await fetch(`${API_BASE}/admin/images/${img.filename}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                deleted++;
            } else {
                failed++;
            }
        } catch (error) {
            failed++;
        }
    }

    if (failed === 0) {
        showToast(`Deleted ${deleted} unused image${deleted !== 1 ? 's' : ''}`, 'success');
    } else {
        showToast(`Deleted ${deleted}, failed ${failed}`, 'error');
    }

    loadImages();
}
