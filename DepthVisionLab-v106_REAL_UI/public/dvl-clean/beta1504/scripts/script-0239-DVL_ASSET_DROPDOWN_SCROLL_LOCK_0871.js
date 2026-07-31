(function(){
  "use strict";
  if(window.DVL_ASSET_DROPDOWN_SCROLL_LOCK_0871) return;
  window.DVL_ASSET_DROPDOWN_SCROLL_LOCK_0871 = true;

  function getDropdown(){
    return document.getElementById("assetDropdown");
  }

  function getList(dd){
    return dd ? dd.querySelector(".assetDropdownList") : null;
  }

  function getSearch(dd){
    return dd ? dd.querySelector(".dvlFutSearch") : null;
  }

  function getOpenState(dd){
    return !!(dd && dd.classList && dd.classList.contains("is-open"));
  }

  function filterDropdown(dd, value){
    var q = String(value || "").trim().toUpperCase();
    var opts = dd ? dd.querySelectorAll(".assetOption[data-symbol]") : [];
    for(var i=0;i<opts.length;i++){
      var sym = String(opts[i].getAttribute("data-symbol") || "").toUpperCase();
      opts[i].style.display = (!q || sym.indexOf(q) > -1) ? "" : "none";
    }
  }

  function captureState(){
    var dd = getDropdown();
    var list = getList(dd);
    var search = getSearch(dd);
    var active = document.activeElement;
    return {
      open: getOpenState(dd),
      scrollTop: list ? list.scrollTop : 0,
      scrollHeight: list ? list.scrollHeight : 0,
      searchValue: search ? search.value : "",
      searchFocused: !!(search && active === search),
      selectionStart: search && typeof search.selectionStart === "number" ? search.selectionStart : null,
      selectionEnd: search && typeof search.selectionEnd === "number" ? search.selectionEnd : null
    };
  }

  function restoreState(st){
    if(!st || !st.open) return;

    var dd = getDropdown();
    if(!dd) return;

    var search = getSearch(dd);
    if(search && st.searchValue){
      search.value = st.searchValue;
      filterDropdown(dd, st.searchValue);
      if(st.searchFocused){
        try{
          search.focus({preventScroll:true});
          if(st.selectionStart !== null && st.selectionEnd !== null){
            search.setSelectionRange(st.selectionStart, st.selectionEnd);
          }
        }catch(_){}
      }
    }

    var list = getList(dd);
    if(list){
      var maxTop = Math.max(0, list.scrollHeight - list.clientHeight);
      var top = Math.max(0, Math.min(st.scrollTop || 0, maxTop));
      list.scrollTop = top;
    }
  }

  function restoreMany(st){
    restoreState(st);
    if(!st || !st.open) return;
    requestAnimationFrame(function(){ restoreState(st); });
    setTimeout(function(){ restoreState(st); }, 40);
    setTimeout(function(){ restoreState(st); }, 120);
    setTimeout(function(){ restoreState(st); }, 260);
  }

  function wrapRender(){
    var fn = window.renderAssetDropdown;
    if(typeof fn !== "function" || fn.__dvlScrollLock0871) return false;

    var wrapped = function(){
      var st = captureState();
      var out = fn.apply(this, arguments);
      restoreMany(st);
      return out;
    };
    wrapped.__dvlScrollLock0871 = true;
    window.renderAssetDropdown = wrapped;
    return true;
  }

  function boot(){
    wrapRender();

    var dd = getDropdown();
    if(dd){
      dd.addEventListener("scroll", function(e){
        if(e.target && e.target.classList && e.target.classList.contains("assetDropdownList")){
          e.stopPropagation();
        }
      }, true);

      dd.addEventListener("touchmove", function(e){
        var list = e.target && e.target.closest ? e.target.closest(".assetDropdownList") : null;
        if(list) e.stopPropagation();
      }, {capture:true, passive:true});

      dd.addEventListener("wheel", function(e){
        var list = e.target && e.target.closest ? e.target.closest(".assetDropdownList") : null;
        if(list) e.stopPropagation();
      }, {capture:true, passive:true});
    }

    // Some older modules wrap renderAssetDropdown later. Re-wrap a few times only.
    [80, 240, 700, 1500, 3000].forEach(function(t){
      setTimeout(wrapRender, t);
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  }else{
    boot();
  }
})();
