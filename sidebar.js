function loadNavbarDiv() {
    var navbar_code_str = `
    <script src="https://josh-freeman.github.io/submenus.js" type="text/javascript"></script>
    <div id="mySidebar" class="sidebar">
    <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">×</a>
  
    <img src="https://josh-freeman.github.io/resources/profile.png">

    <submenu>
      <a href="index.html">Home</a>
    </submenu>
    
    <submenu><a href="poetry.html">Poetry</a></submenu>


    <submenu>
      <a>Projects</a>
      <subsubmenu><a href="projects.html#tchu">tCHu</a></subsubmenu>
      <subsubmenu><a href="projects.html#cryptkvs">CRYPTKVS</a></subsubmenu>
      <subsubmenu><a href="projects.html#hpshape">HPShape</a></subsubmenu>
    </submenu>

    <submenu><a>Miscellany</a>

    <subsubmenu><a href="notes.html">Notes</a></subsubmenu>
    <subsubmenu><a href="friends.html">Friends</a></subsubmenu>
    <subsubmenu><a href="cv.html">Resume</a></subsubmenu>
    <subsubmenu><a href="https://github.com/josh-freeman/josh-freeman.github.io" target="_blank" class="external">Source code</a></subsubmenu>



     </submenu>


  </div>
  <button id="menubtn" class="openbtn" onclick="openNav()">≡<img style="max-width: 100%; vertical-align: middle; image-orientation: from-image;" src="https://josh-freeman.github.io/resources/icon_blue.png" width="26" height="26"></button>

</script>
  `
  Array.from(document.getElementsByTagName('sidebar')).forEach(e => e.innerHTML += navbar_code_str);
}
loadNavbarDiv();
function myFunction(x) {
  if (x.matches) { // If media query matches
    closeNav();
  } else {
   openNav();
  }
}

var x = window.matchMedia("(max-width: 992px)")
myFunction(x) // Call listener function at run time
x.addListener(myFunction) // Attach listener function on state changes

function openNav() {
  document.getElementById("mySidebar").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  document.getElementById("menubtn").onclick = closeNav;
}

function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("main").style.marginLeft= "0";
  document.getElementById("menubtn").onclick = openNav;

}
