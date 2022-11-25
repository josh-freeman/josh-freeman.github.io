
Array.from(document.getElementsByTagName('submenu')).forEach(e=>e.addEventListener('click',event => {event.stopPropagation();Array.from(e.getElementsByTagName('subsubmenu')).forEach(subsub => {$(subsub).slideToggle()})})) 
