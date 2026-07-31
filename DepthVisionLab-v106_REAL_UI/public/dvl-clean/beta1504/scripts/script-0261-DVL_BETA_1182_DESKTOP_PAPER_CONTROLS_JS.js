(function(){
  "use strict";
  if(window.DVL_DESKTOP_PAPER_CONTROLS_1182) return;

  var MQ=window.matchMedia("(min-width:1100px)");
  var pressed=null;
  var lastActionKey="";
  var lastActionAt=0;

  function desktop(){ return !!MQ.matches; }
  function buttonFrom(target){
    return target&&target.closest ? target.closest(".dvl-pv2p-btn") : null;
  }
  function readAction(btn){
    var controls=btn&&btn.closest(".dvl-pv2p-controls");
    if(!controls) return null;
    var id=controls.dataset.id||"";
    if(!id) return null;
    return {
      id:id,
      kind:controls.dataset.kind||"entry",
      edit:controls.classList.contains("edit"),
      ok:btn.classList.contains("ok"),
      btn:btn
    };
  }
  function stop(ev){
    if(ev.cancelable) ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }
  function releaseVisual(){
    if(pressed&&pressed.btn) pressed.btn.classList.remove("dvl-pv2p-pressed");
  }
  function execute(a){
    var api=window.DVL_PAPER_TRADING_V2_PRO;
    if(!api||!a) return false;
    var key=[a.id,a.kind,a.edit?"edit":"draft",a.ok?"ok":"cancel"].join(":");
    var now=performance.now();
    if(key===lastActionKey&&now-lastActionAt<240) return true;
    lastActionKey=key;
    lastActionAt=now;
    try{
      if(a.edit){
        if(a.ok&&typeof api.confirmTpSlEdit==="function") api.confirmTpSlEdit(a.id,a.kind);
        else if(!a.ok&&typeof api.cancelTpSlEdit==="function") api.cancelTpSlEdit(a.id,a.kind);
      }else{
        if(a.ok&&typeof api.confirmDraft==="function") api.confirmDraft(a.id);
        else if(!a.ok&&typeof api.cancelPaperOrder==="function") api.cancelPaperOrder(a.id);
      }
      if(typeof window.DVL_RELEASE_PAPER_LOCK==="function") window.DVL_RELEASE_PAPER_LOCK();
      return true;
    }catch(err){
      console.error("[DVL 1.182] Paper control action failed",err);
      return false;
    }
  }

  function onPointerDown(ev){
    if(!desktop()||ev.button!==0) return;
    var btn=buttonFrom(ev.target),a=readAction(btn);
    if(!a) return;
    pressed={
      id:a.id,kind:a.kind,edit:a.edit,ok:a.ok,btn:btn,
      pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY
    };
    btn.classList.add("dvl-pv2p-pressed");
    stop(ev);
  }
  function onPointerUp(ev){
    if(!desktop()||!pressed) return;
    if(pressed.pointerId!=null&&ev.pointerId!=null&&pressed.pointerId!==ev.pointerId) return;
    var a=pressed;
    var moved=Math.hypot((ev.clientX||0)-a.x,(ev.clientY||0)-a.y);
    releaseVisual();
    pressed=null;
    stop(ev);
    if(moved<=16) execute(a);
  }
  function onPointerCancel(ev){
    if(!pressed) return;
    releaseVisual();
    pressed=null;
    if(desktop()) stop(ev);
  }
  function onClick(ev){
    if(!desktop()) return;
    var btn=buttonFrom(ev.target),a=readAction(btn);
    if(!a) return;
    stop(ev);
    /* Keyboard-generated click has detail 0 and no pointerup, so execute it here. */
    if(ev.detail===0) execute(a);
  }
  function onKeyDown(ev){
    if(!desktop()||(ev.key!=="Enter"&&ev.key!==" ")) return;
    var btn=buttonFrom(ev.target),a=readAction(btn);
    if(!a) return;
    stop(ev);
    execute(a);
  }

  /* Window capture runs before document/canvas gesture handlers. The action is
     committed on pointerup because this project suppresses the synthetic click
     after Paper interactions on desktop. */
  window.addEventListener("pointerdown",onPointerDown,{capture:true,passive:false});
  window.addEventListener("pointerup",onPointerUp,{capture:true,passive:false});
  window.addEventListener("pointercancel",onPointerCancel,{capture:true,passive:false});
  window.addEventListener("click",onClick,{capture:true,passive:false});
  window.addEventListener("keydown",onKeyDown,{capture:true,passive:false});
  window.addEventListener("blur",function(){releaseVisual();pressed=null;},{passive:true});

  window.DVL_DESKTOP_PAPER_CONTROLS_1182={
    version:"1.183",
    execute:execute,
    audit:function(){
      var tag=document.querySelector(".dvl-pv2p-tag");
      var btn=document.querySelector(".dvl-pv2p-btn");
      return {
        desktop:desktop(),
        tagSize:tag?{width:tag.getBoundingClientRect().width,height:tag.getBoundingClientRect().height}:null,
        buttonSize:btn?{width:btn.getBoundingClientRect().width,height:btn.getBoundingClientRect().height}:null,
        pointerUpCommit:true
      };
    }
  };
})();
