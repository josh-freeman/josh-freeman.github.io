$(document).ready(function() {
    $('subsubmenu').hide();
    
    $('submenu').click(function(event) {
      event.stopPropagation();
      $('> subsubmenu', this).slideToggle();
  
    });
  });
  