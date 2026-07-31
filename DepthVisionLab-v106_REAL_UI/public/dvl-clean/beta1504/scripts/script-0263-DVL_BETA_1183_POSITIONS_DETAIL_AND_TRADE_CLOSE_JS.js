(function(){
  "use strict";
  if(window.DVL_DESKTOP_POSITIONS_TRADE_FIX_1183) return;

  var MQ=window.matchMedia("(min-width:1100px)");
  var pressed=null;
  var lastKey="",lastAt=0;

  function desktop(){return !!MQ.matches;}
  function stop(ev){
    if(ev&&ev.cancelable)ev.preventDefault();
    if(ev)ev.stopPropagation();
    if(ev&&ev.stopImmediatePropagation)ev.stopImmediatePropagation();
  }
  function detailsPanel(){return document.getElementById("dvlPositionDetailsV2");}
  function positionsHost(){return document.getElementById("dvlPositionsPanelV2");}
  function placeDetails(){
    var p=detailsPanel();
    if(!p)return;
    var target=desktop()?positionsHost():document.body;
    if(target&&p.parentElement!==target)target.appendChild(p);
  }
  function schedulePlace(){requestAnimationFrame(placeDetails);}

  function closeTradeButton(target){
    return target&&target.closest?target.closest(".dvl-pv2p-close[data-close-trade='1']"):null;
  }
  function closeTradeAction(btn){
    if(!btn)return false;
    var tag=btn.closest(".dvl-pv2p-tag");
    var id=tag&&tag.dataset?tag.dataset.id:"";
    if(!id)return false;
    var api=window.DVL_PAPER_TRADING_V2_PRO;
    if(!api)return false;
    var state=null,order=null;
    try{
      state=typeof api.getState==="function"?api.getState():null;
      if(state&&Array.isArray(state.orders))order=state.orders.find(function(o){return o&&String(o.id)===String(id);})||null;
    }catch(_){ }
    try{
      if(order&&String(order.status).toLowerCase()==="open"&&typeof api.closePaperTrade==="function")api.closePaperTrade(id);
      else if(typeof api.cancelPaperOrder==="function")api.cancelPaperOrder(id);
      if(typeof window.DVL_RELEASE_PAPER_LOCK==="function")window.DVL_RELEASE_PAPER_LOCK();
      return true;
    }catch(err){
      console.error("[DVL 1.183] close trade failed",err);
      return false;
    }
  }
  function dedupe(key,fn){
    var now=performance.now();
    if(key===lastKey&&now-lastAt<260)return true;
    lastKey=key;lastAt=now;
    return fn();
  }

  function onPointerDown(ev){
    if(!desktop()||ev.button!==0)return;
    var btn=closeTradeButton(ev.target);
    if(!btn)return;
    var tag=btn.closest(".dvl-pv2p-tag");
    pressed={btn:btn,id:tag&&tag.dataset?tag.dataset.id:"",pid:ev.pointerId,x:ev.clientX,y:ev.clientY};
    btn.classList.add("dvl-pv2p-pressed");
    stop(ev);
  }
  function onPointerUp(ev){
    if(!desktop()||!pressed)return;
    if(pressed.pid!=null&&ev.pointerId!=null&&pressed.pid!==ev.pointerId)return;
    var p=pressed;pressed=null;
    p.btn.classList.remove("dvl-pv2p-pressed");
    var moved=Math.hypot((ev.clientX||0)-p.x,(ev.clientY||0)-p.y);
    stop(ev);
    if(moved<=16)dedupe("close:"+p.id,function(){return closeTradeAction(p.btn);});
  }
  function onPointerCancel(ev){
    if(!pressed)return;
    pressed.btn.classList.remove("dvl-pv2p-pressed");pressed=null;
    if(desktop())stop(ev);
  }
  function onClick(ev){
    if(!desktop())return;
    var btn=closeTradeButton(ev.target);
    if(!btn)return;
    stop(ev);
    if(ev.detail===0){
      var tag=btn.closest(".dvl-pv2p-tag"),id=tag&&tag.dataset?tag.dataset.id:"";
      dedupe("close:"+id,function(){return closeTradeAction(btn);});
    }
  }

  /* Extra hardening for the detail panel controls in the dock. */
  function onDetailPointerUp(ev){
    if(!desktop()||ev.button!==0)return;
    var close=ev.target.closest&&ev.target.closest("[data-dvl-detail-close]");
    if(close){
      stop(ev);
      if(window.DVL_POSITION_DETAILS_PANEL_0724&&typeof window.DVL_POSITION_DETAILS_PANEL_0724.close==="function")window.DVL_POSITION_DETAILS_PANEL_0724.close();
      return;
    }
    var fullClose=ev.target.closest&&ev.target.closest('[data-dvl-detail-act="close"]');
    if(!fullClose)return;
    stop(ev);
    var id=String(window.DVL_SELECTED_POSITION_ID||"");
    if(!id)return;
    var api=window.DVL_PAPER_TRADING_V2_PRO;
    var handled=false;
    try{
      if(api&&typeof api.closePaperTrade==="function"){
        var st=typeof api.getState==="function"?api.getState():null;
        var found=st&&Array.isArray(st.orders)&&st.orders.some(function(o){return o&&String(o.id)===id&&String(o.status).toLowerCase()==="open";});
        if(found){api.closePaperTrade(id);handled=true;}
      }
    }catch(_){ }
    if(!handled){
      try{
        var p=typeof window.getPaperPositionById==="function"?window.getPaperPositionById(id):null;
        if(p&&typeof window.closePaperTradeToHistory==="function"){
          var sym=String(p.symbol||"").replace(/[^A-Z0-9]/gi,"").toUpperCase();
          var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
          var px=lp&&Number(lp.price)>0?Number(lp.price):Number(p.entry);
          window.closePaperTradeToHistory(p,px,"Manual",Date.now());handled=true;
        }
      }catch(_){ }
    }
    if(window.DVL_POSITION_DETAILS_PANEL_0724&&typeof window.DVL_POSITION_DETAILS_PANEL_0724.close==="function")window.DVL_POSITION_DETAILS_PANEL_0724.close();
    try{if(typeof window.DVL_POSITIONS_REFRESH==="function")window.DVL_POSITIONS_REFRESH();}catch(_){ }
  }

  window.addEventListener("pointerdown",onPointerDown,{capture:true,passive:false});
  window.addEventListener("pointerup",onPointerUp,{capture:true,passive:false});
  window.addEventListener("pointercancel",onPointerCancel,{capture:true,passive:false});
  window.addEventListener("click",onClick,{capture:true,passive:false});
  window.addEventListener("pointerup",onDetailPointerUp,{capture:true,passive:false});
  document.addEventListener("dvl:position-detail-open",schedulePlace,{passive:true});
  window.addEventListener("resize",schedulePlace,{passive:true});
  if(MQ.addEventListener)MQ.addEventListener("change",schedulePlace);

  var obs=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      if(muts[i].type==="childList"||muts[i].attributeName==="class"){schedulePlace();break;}
    }
  });
  function init(){
    placeDetails();
    obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();

  window.DVL_DESKTOP_POSITIONS_TRADE_FIX_1183={
    version:"1.183",
    placeDetails:placeDetails,
    audit:function(){
      var p=detailsPanel(),host=positionsHost(),tag=document.querySelector(".dvl-pv2p-tag"),x=document.querySelector(".dvl-pv2p-close");
      return{
        desktop:desktop(),
        detailInsidePositions:!!(p&&host&&p.parentElement===host),
        detailOpen:!!(p&&p.classList.contains("is-open")),
        tagSize:tag?{width:tag.getBoundingClientRect().width,height:tag.getBoundingClientRect().height}:null,
        closeSize:x?{width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}:null,
        closeUsesPointerUp:true
      };
    }
  };
})();
