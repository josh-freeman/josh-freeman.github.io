// Conway's Game of Life - Interactive Background
const CELL_SIZE = 28;
const GRID_COLOR = 'rgba(200, 200, 200, 0.1)';
const ALIVE_COLOR = '#463F5C';
const DYING_COLOR = '#818181';
const BIRTH_COLOR = '#6B5B95';
const UPDATE_INTERVAL = 150;
const INITIAL_DENSITY = 0.06;
const LOGO_PROBABILITY = 0.03; // Chance a cell gets a logo (rare easter egg)

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let cols, rows;
let grid, nextGrid;
let cellStates; // Track animation states
let lastUpdate = 0;
let isRunning = true;
let mouseDown = false;

// Logo easter egg
const logoSources = [
    { src: 'resources/logos/meta.png', name: 'Meta' },
    { src: 'resources/logos/harvard-med.png', name: 'Harvard Med' },
    { src: 'resources/logos/yale.png', name: 'Yale' },
    { src: 'resources/logos/eth.png', name: 'ETH' },
    { src: 'resources/logos/whatsapp.png', name: 'WhatsApp' }
];
const logos = [];
let logosLoaded = false;

// Load logo images
function loadLogos() {
    let loaded = 0;
    logoSources.forEach((logoInfo, index) => {
        const img = new Image();
        img.onload = () => {
            logos[index] = img;
            loaded++;
            if (loaded === logoSources.length) {
                logosLoaded = true;
            }
        };
        img.onerror = () => {
            logos[index] = null; // Mark as failed
            loaded++;
            if (loaded === logoSources.length) {
                logosLoaded = true;
            }
        };
        img.src = logoInfo.src;
    });
}

// Get a random logo index (only from loaded logos)
function getRandomLogoIndex() {
    const validIndices = logos.map((logo, i) => logo ? i : -1).filter(i => i >= 0);
    if (validIndices.length === 0) return null;
    return validIndices[Math.floor(Math.random() * validIndices.length)];
}

// Initialize the grid
function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    cols = Math.ceil(canvas.width / CELL_SIZE);
    rows = Math.ceil(canvas.height / CELL_SIZE);

    grid = createGrid();
    nextGrid = createGrid();
    cellStates = createStateGrid();

    // Random initial state
    randomize();
}

function createGrid() {
    return new Array(cols).fill(null).map(() => new Array(rows).fill(0));
}

function createStateGrid() {
    return new Array(cols).fill(null).map(() => new Array(rows).fill(null).map(() => ({
        alpha: 0,
        targetAlpha: 0,
        logoIndex: null // Easter egg: some cells show logos
    })));
}

function randomize() {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const alive = Math.random() < INITIAL_DENSITY ? 1 : 0;
            grid[i][j] = alive;
            cellStates[i][j].alpha = alive;
            cellStates[i][j].targetAlpha = alive;
            // Assign logo with some probability
            if (alive && Math.random() < LOGO_PROBABILITY) {
                cellStates[i][j].logoIndex = getRandomLogoIndex();
            } else {
                cellStates[i][j].logoIndex = null;
            }
        }
    }
}

// Count live neighbors
function countNeighbors(x, y) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nx = (x + i + cols) % cols;
            const ny = (y + j + rows) % rows;
            count += grid[nx][ny];
        }
    }
    return count;
}

// Apply Game of Life rules
function update() {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const neighbors = countNeighbors(i, j);
            const alive = grid[i][j];

            if (alive && (neighbors < 2 || neighbors > 3)) {
                nextGrid[i][j] = 0;
                // Cell is dying, clear logo
                cellStates[i][j].logoIndex = null;
            } else if (!alive && neighbors === 3) {
                nextGrid[i][j] = 1;
                // Cell is being born, maybe assign a logo
                if (Math.random() < LOGO_PROBABILITY) {
                    cellStates[i][j].logoIndex = getRandomLogoIndex();
                }
            } else {
                nextGrid[i][j] = alive;
            }

            cellStates[i][j].targetAlpha = nextGrid[i][j];
        }
    }

    // Swap grids
    [grid, nextGrid] = [nextGrid, grid];
}

// Smooth alpha transitions
function updateAlphas() {
    const smoothing = 0.15;
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const state = cellStates[i][j];
            state.alpha += (state.targetAlpha - state.alpha) * smoothing;
        }
    }
}

// Draw the grid
function draw() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells with smooth transitions
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const state = cellStates[i][j];
            if (state.alpha > 0.01) {
                const x = i * CELL_SIZE;
                const y = j * CELL_SIZE;
                const alpha = state.alpha;
                const padding = 2;

                // Check if this cell has a logo
                if (state.logoIndex !== null && logos[state.logoIndex]) {
                    ctx.globalAlpha = alpha * 0.9;
                    const logoSize = CELL_SIZE - padding * 2;
                    ctx.drawImage(logos[state.logoIndex],
                                  x + padding, y + padding,
                                  logoSize, logoSize);
                } else {
                    // Regular colored cell
                    ctx.globalAlpha = alpha * 0.8;

                    // Color based on state
                    if (state.targetAlpha > state.alpha) {
                        ctx.fillStyle = BIRTH_COLOR;
                    } else if (state.targetAlpha < state.alpha) {
                        ctx.fillStyle = DYING_COLOR;
                    } else {
                        ctx.fillStyle = ALIVE_COLOR;
                    }

                    // Draw rounded rectangle
                    const radius = 3;
                    roundRect(ctx, x + padding, y + padding,
                             CELL_SIZE - padding * 2, CELL_SIZE - padding * 2, radius);
                }
            }
        }
    }

    ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Toggle cell at mouse position
function toggleCell(x, y) {
    const i = Math.floor(x / CELL_SIZE);
    const j = Math.floor(y / CELL_SIZE);

    if (i >= 0 && i < cols && j >= 0 && j < rows) {
        grid[i][j] = 1;
        cellStates[i][j].alpha = 1;
        cellStates[i][j].targetAlpha = 1;
        // Maybe assign a logo
        if (Math.random() < LOGO_PROBABILITY) {
            cellStates[i][j].logoIndex = getRandomLogoIndex();
        }

        // Add some neighbors for more interesting patterns
        const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of offsets) {
            const ni = (i + dx + cols) % cols;
            const nj = (j + dy + rows) % rows;
            if (Math.random() < 0.5) {
                grid[ni][nj] = 1;
                cellStates[ni][nj].alpha = 1;
                cellStates[ni][nj].targetAlpha = 1;
                if (Math.random() < LOGO_PROBABILITY) {
                    cellStates[ni][nj].logoIndex = getRandomLogoIndex();
                }
            }
        }
    }
}

// Add a glider at position
function addGlider(x, y) {
    const i = Math.floor(x / CELL_SIZE);
    const j = Math.floor(y / CELL_SIZE);

    const glider = [
        [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
    ];

    for (const [dx, dy] of glider) {
        const ni = (i + dx + cols) % cols;
        const nj = (j + dy + rows) % rows;
        grid[ni][nj] = 1;
        cellStates[ni][nj].alpha = 1;
        cellStates[ni][nj].targetAlpha = 1;
    }
}

// Main animation loop
function animate(timestamp) {
    updateAlphas();
    draw();

    if (isRunning && timestamp - lastUpdate > UPDATE_INTERVAL) {
        update();
        lastUpdate = timestamp;
    }

    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', () => {
    init();
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add a glider on click for more interesting patterns
    if (e.shiftKey) {
        addGlider(x, y);
    } else {
        toggleCell(x, y);
    }
});

canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
});

canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        toggleCell(x, y);
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    toggleCell(touch.clientX - rect.left, touch.clientY - rect.top);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    toggleCell(touch.clientX - rect.left, touch.clientY - rect.top);
});

// Initialize and start
loadLogos();
init();
requestAnimationFrame(animate);
