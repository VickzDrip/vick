(function(){
  function release(){
    try{
      document.documentElement.classList.remove("dvl1413-no-fouc");
      document.documentElement.classList.add("dvl1413-ready");
    }catch(_){}
  }
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      setTimeout(release, 80);
    });
  });
  setTimeout(release, 3500);
})();
