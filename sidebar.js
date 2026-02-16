// Sidebar Navigation Component
function loadNavbarDiv() {
    const navbarHTML = `
        <div id="mySidebar" class="sidebar">
            <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>

            <a href="index.html">
                <img src="https://josh-freeman.github.io/resources/profile.png"
                     alt="Joshua Freeman"
                     width="180"
                     height="180"
                     style="padding: 10px;">
            </a>

            <submenu>
                <a href="https://josh-freeman.github.io/index.html">Home</a>
            </submenu>

            <submenu>
                <a href="https://josh-freeman.github.io/resources/cv.pdf" target="_blank" class="external">
                    Curriculum Vitae
                </a>
            </submenu>

            <submenu>
                <a>Projects</a>
                <subsubmenu><a href="https://josh-freeman.github.io/projects.html#tchu">tCHu</a></subsubmenu>
                <subsubmenu><a href="https://josh-freeman.github.io/projects.html#cryptkvs">CRYPTKVS</a></subsubmenu>
                <subsubmenu><a href="https://josh-freeman.github.io/projects.html#hpshape">HPShape</a></subsubmenu>
            </submenu>

            <submenu>
                <a>Miscellany</a>
                <subsubmenu><a href="https://josh-freeman.github.io/notes.html">Notes</a></subsubmenu>
                <subsubmenu><a href="https://josh-freeman.github.io/friends.html">Friends</a></subsubmenu>
                <subsubmenu><a href="https://josh-freeman.github.io/poetry.html">Poetry</a></subsubmenu>
                <subsubmenu><a href="https://github.com/josh-freeman/josh-freeman.github.io" target="_blank" class="external">Source code</a></subsubmenu>
                <subsubmenu><a href="https://www.goodreads.com/review/list/184752391?shelf=read" target="_blank" class="external">Book reviews</a></subsubmenu>
            </submenu>
        </div>

        <button id="menubtn" class="openbtn" onclick="openNav()">
            <span style="margin-right: 4px;">&#9776;</span>
            <img src="https://josh-freeman.github.io/resources/icon_blue.png"
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
