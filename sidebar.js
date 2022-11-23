function loadNavbarDiv() {
    var navbar_code_str = `
    <script src="https://josh-freeman.github.io/submenus.js"></script>
    <div id="mySidebar" class="sidebar">
    <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">×</a>
  
  
    <submenu>
      <a href="index.html">Home</a>
    </submenu>
  
    <submenu>
      <a href="cv.html">Resume</a>
    </submenu>
    <submenu>
      <a href="projects.html">Projects</a>
      <subsubmenu><a>tCHu</a></subsubmenu>
      <subsubmenu><a>CRYPTKVS</a></subsubmenu>
      <subsubmenu><a>HPShape</a></subsubmenu>
    </submenu>
    <submenu><a href="poetry.html">Poetry</a></submenu>
    <submenu><a href="misc.html">Miscellany</a>
      <subsubmenu><a href="friends.html">Friends</a></subsubmenu>
    </submenu>
  
  
  </div>
  <button id="menubtn" class="openbtn" onclick="openNav()">≡<img src="https://josh-freeman.github.io/icon_blue.png" width="26" height="26"></button>
  `
    $('sidebar').append(navbar_code_str);
}