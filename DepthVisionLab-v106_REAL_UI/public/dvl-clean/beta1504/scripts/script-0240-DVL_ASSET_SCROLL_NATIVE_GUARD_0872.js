(function(){
  "use strict";
  if(window.DVL_ASSET_SCROLL_NATIVE_GUARD_0872) return;
  window.DVL_ASSET_SCROLL_NATIVE_GUARD_0872 = true;

  function dd(){ return document.getElementById("assetDropdown"); }
  function list(){ var d=dd(); return d?d.querySelector(".assetDropdownList"):null; }

  var lastTop = 0;
  var touching = false;

  function save(){
    var l = list();
    if(l) lastTop = l.scrollTop || 0;
  }

  function restore(){
    var d = dd();
    var l = list();
    if(!d || !l || !d.classList.contains("is-open")) return;
    if(lastTop > 0 && l.scrollTop < Math.max(4, lastTop - 30)){
      l.scrollTop = Math.min(lastTop, Math.max(0, l.scrollHeight - l.clientHeight));
    }
  }

  document.addEventListener("touchstart", function(e){
    if(e.target && e.target.closest && e.target.closest("#assetDropdown .assetDropdownList")){
      touching = true;
      save();
    }
  }, {capture:true, passive:true});

  document.addEventListener("touchmove", function(e){
    if(e.target && e.target.closest && e.target.closest("#assetDropdown .assetDropdownList")){
      touching = true;
      save();
    }
  }, {capture:true, passive:true});

  document.addEventListener("touchend", function(){
    if(!touching) return;
    touching = false;
    save();
    setTimeout(restore, 0);
    setTimeout(restore, 80);
    setTimeout(restore, 180);
    setTimeout(restore, 420);
  }, {capture:true, passive:true});

  window.addEventListener("scroll", save, true);
})();
