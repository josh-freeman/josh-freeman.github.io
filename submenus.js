$(document).ready(function() {
    $('subsubmenu').hide();
    
    $('submenu').hover(function(event) {
      event.stopPropagation();
      $('> subsubmenu', this).slideToggle();
  
    });
  });
  