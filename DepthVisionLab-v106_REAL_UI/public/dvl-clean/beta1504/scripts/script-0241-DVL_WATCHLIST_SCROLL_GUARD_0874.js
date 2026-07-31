(function(){
  "use strict";
  if(window.DVL_WATCHLIST_SCROLL_GUARD_0874)return;
  window.DVL_WATCHLIST_SCROLL_GUARD_0874=true;

  var lastTop=0;

  function panel(){return document.getElementById("dvlWatchlistPanel");}
  function list(){
    var p=panel();
    return p?p.querySelector(".dvlWLList"):null;
  }
  function save(){
    var l=list();
    if(l)lastTop=l.scrollTop||0;
  }
  function restore(){
    var p=panel();
    var l=list();
    if(!p||!l||!p.classList.contains("is-open"))return;
    if(lastTop>0&&l.scrollTop<Math.max(4,lastTop-30)){
      l.scrollTop=Math.min(lastTop,Math.max(0,l.scrollHeight-l.clientHeight));
    }
  }

  document.addEventListener("touchstart",function(e){
    if(e.target&&e.target.closest&&e.target.closest("#dvlWatchlistPanel .dvlWLList"))save();
  },{capture:true,passive:true});

  document.addEventListener("touchmove",function(e){
    if(e.target&&e.target.closest&&e.target.closest("#dvlWatchlistPanel .dvlWLList"))save();
  },{capture:true,passive:true});

  document.addEventListener("touchend",function(e){
    if(e.target&&e.target.closest&&e.target.closest("#dvlWatchlistPanel .dvlWLList")){
      save();
      setTimeout(restore,0);
      setTimeout(restore,80);
      setTimeout(restore,220);
    }
  },{capture:true,passive:true});

  window.addEventListener("scroll",save,true);
})();
