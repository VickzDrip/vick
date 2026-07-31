/* Logo click → page reload (capture:true fires before any child handler) */
document.addEventListener("click", function(e){
  var t = e.target;
  if(t && t.closest && t.closest(".dvl1b-brand")){
    location.reload();
  }
}, true);
document.addEventListener("touchend", function(e){
  var t = e.target;
  if(t && t.closest && t.closest(".dvl1b-brand")){
    e.preventDefault();
    location.reload();
  }
}, true);
