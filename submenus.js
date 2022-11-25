document.ready(function() {    

  Array.from(document.getElementsByTagName('submenu')).forEach(e=>e.addEventListener('click',event => {event.stopPropagation();Array.from(e.getElementsByTagName('subsubmenu')).forEach(subsub => {console.log(subsub.text); subsub.slideToggle()});console.log("clicked");})) 
  });
  