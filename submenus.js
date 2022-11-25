$(document).ready(function() {    
    $('submenu').click(function(event) {
      event.stopPropagation();
      $('> subsubmenu', this).slideToggle();
  
    });
  });
  