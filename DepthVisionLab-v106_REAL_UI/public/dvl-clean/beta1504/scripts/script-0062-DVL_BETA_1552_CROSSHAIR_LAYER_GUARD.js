(function(){
"use strict";
if(window.__DVL_BETA_1552_CROSSHAIR_LAYER_GUARD__)return;
window.__DVL_BETA_1552_CROSSHAIR_LAYER_GUARD__=true;

var raf=0, mo=null;

function q(id){return document.getElementById(id)}
function visible(el){
  if(!el)return false;
  try{
    var s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity)!==0&&r.width>2&&r.height>2;
  }catch(_){return false}
}
function htmlOpen(){
  return /\bdvl1b-[a-z0-9_-]*open\b/.test(String(document.documentElement.className||""));
}
function menuOpen(){
  if(htmlOpen())return true;
  var sel=[
    ".dvl-drop-list.is-open",
    ".dvl1b-menuwrap.is-open .dvl1b-menu",
    ".assetDropdown.is-open",
    ".assetFavoritesDrawer.is-open",
    ".tfMoreWrap.is-open .tfMoreMenu",
    ".candleTypeWrap.is-open .candleTypeMenu",
    ".fxIndicatorWrap.is-open .indicatorDropdown",
    ".assetToolsShell.is-open .assetToolsMenu",
    ".chartSettingsPanel.is-open",
    ".dvl-vt-panel.is-open",
    ".dvl-custom-menu.is-open",
    ".dvl-custom-select.is-open .dvl-select-pop",
    ".dvl-custom-color.is-open .dvl-color-pop",
    ".orderTypeWrap.is-open .orderTypeMenu",
    ".numberPadOverlay.is-open",
    ".siteColorPicker.is-open",
    ".dvl-keypad.is-open",
    ".dvl-color-palette.is-open",
    ".dvl-ma-palette.is-open",
    ".dvl-sz-palette.is-open",
    ".dvl-vol-palette.is-open",
    ".tradeDrawer.is-open",
    "#dvlDesktopChartContextMenu.is-open",
    "[role='menu'][aria-hidden='false']",
    "[role='listbox'][aria-hidden='false']",
    "[role='dialog'][aria-hidden='false']",
    "[aria-expanded='true']"
  ].join(",");
  try{
    var a=document.querySelectorAll(sel);
    for(var i=0;i<a.length;i++){
      var el=a[i];
      if(!visible(el))continue;
      if(el.id&&/^dvlCross15/.test(el.id))continue;
      if(el.id==="dvlTimeline1546")continue;
      return true;
    }
  }catch(_){}
  return false;
}
function apply(){
  raf=0;
  document.documentElement.classList.toggle("dvl-crosshair-ui-muted", menuOpen());
}
function schedule(){
  if(!raf)raf=requestAnimationFrame(apply);
}
function style(){
  var st=q("DVL_BETA_1552_CROSSHAIR_LAYER_GUARD_STYLE");
  if(st)return;
  st=document.createElement("style");
  st.id="DVL_BETA_1552_CROSSHAIR_LAYER_GUARD_STYLE";
  st.textContent=[
    "#dvlCross1540,#dvlCross1541V,#dvlCross1541H,#dvlCross1541P,#dvlCross1542PriceTag,#dvlCross1543Tag,#dvlCross1544TimeTag,#dvlCrosshairDom1205{z-index:80000!important}",
    "#dvlTimeline1546{z-index:70000!important}",
    "#DVL_UI_OVERLAY_PHASE_1B,#DVL_UI_OVERLAY_PHASE_1B *,.dvl1b-menu,.assetDropdown.is-open,.tfMoreWrap.is-open .tfMoreMenu,.candleTypeWrap.is-open .candleTypeMenu,.fxIndicatorWrap.is-open .indicatorDropdown,.assetToolsShell.is-open .assetToolsMenu,.chartSettingsPanel.is-open,.dvl-vt-panel.is-open,.dvl-custom-menu.is-open,.dvl-custom-select.is-open .dvl-select-pop,.dvl-custom-color.is-open .dvl-color-pop,#dvlDesktopChartContextMenu.is-open{z-index:120000!important}",
    "html.dvl-crosshair-ui-muted #dvlCross1540,html.dvl-crosshair-ui-muted #dvlCross1541V,html.dvl-crosshair-ui-muted #dvlCross1541H,html.dvl-crosshair-ui-muted #dvlCross1541P,html.dvl-crosshair-ui-muted #dvlCross1542PriceTag,html.dvl-crosshair-ui-muted #dvlCross1543Tag,html.dvl-crosshair-ui-muted #dvlCross1544TimeTag,html.dvl-crosshair-ui-muted #dvlCrosshairDom1205{display:none!important;visibility:hidden!important;opacity:0!important}"
  ].join("\n");
  document.head.appendChild(st);
}
function boot(){
  style();
  apply();

  try{
    mo=new MutationObserver(schedule);
    mo.observe(document.documentElement,{attributes:true,attributeFilter:["class","style","aria-expanded","aria-hidden"]});
    if(document.body)mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","aria-expanded","aria-hidden","open"]});
  }catch(_){}

  document.addEventListener("click",schedule,true);
  document.addEventListener("pointerdown",schedule,true);
  document.addEventListener("keyup",schedule,true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
