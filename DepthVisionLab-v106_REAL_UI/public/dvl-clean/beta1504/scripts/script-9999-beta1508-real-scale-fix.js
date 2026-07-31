(function(){
  try{
    window.DVL_APP_VERSION = "Beta 1.508";
    document.title = "DVL - Beta 1.508";
    document.documentElement.style.setProperty("--dvl-price-scale-w","80px","important");

    var b = document.getElementById("dvl1b_versionBadge");
    if(b) b.textContent = "BETA 1.508";

    window.__DVL_VERSION_AUTOUPDATE_DISABLED = true;
    window.DVL_VERSION_AUTOUPDATE_JS = false;
  }catch(_){}
})();
