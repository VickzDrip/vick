(function(){
  if(window.__DVL_CROSSHAIR_1539__) return;
  window.__DVL_CROSSHAIR_1539__ = true;

  function fmt(v){
    try{
      if(window.fmtPrice) return window.fmtPrice(v);
      if(window.priceFmt) return window.priceFmt(v);
    }catch(_){}
    return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function ensure(){
    if(!document.body) return null;
    var st=document.getElementById("DVL_CROSSHAIR_1539_STYLE");
    if(!st){
      st=document.createElement("style");
      st.id="DVL_CROSSHAIR_1539_STYLE";
      st.textContent=[
        "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
        ".dvlCross1539{position:fixed;z-index:9999;pointer-events:none;background:rgba(130,180,170,.48);display:none}",
        "#dvlCross1539X{height:1px}",
        "#dvlCross1539Y{width:1px}",
        "#dvlCross1539Label{position:fixed;width:75px;height:22px;padding:2px 4px;box-sizing:border-box;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;z-index:10000;display:none;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.25)}"
      ].join("\n");
      document.head.appendChild(st);
    }
    function div(id,cls){
      var e=document.getElementById(id);
      if(!e){ e=document.createElement("div"); e.id=id; e.className=cls; document.body.appendChild(e); }
      return e;
    }
    return {
      hx:div("dvlCross1539X","dvlCross1539"),
      vy:div("dvlCross1539Y","dvlCross1539"),
      lb:div("dvlCross1539Label","")
    };
  }

  function hide(){
    ["dvlCross1539X","dvlCross1539Y","dvlCross1539Label"].forEach(function(id){
      var e=document.getElementById(id); if(e) e.style.display="none";
    });
  }

  function move(ev){
    var wrap=document.getElementById("chartWrap") || document.querySelector(".chartWrap");
    if(!wrap) return hide();
    var r=wrap.getBoundingClientRect();
    if(ev.clientX<r.left || ev.clientX>r.right || ev.clientY<r.top || ev.clientY>r.bottom) return hide();

    var e=ensure(); if(!e) return;
    e.hx.style.left=r.left+"px"; e.hx.style.top=ev.clientY+"px"; e.hx.style.width=r.width+"px"; e.hx.style.display="block";
    e.vy.style.left=ev.clientX+"px"; e.vy.style.top=r.top+"px"; e.vy.style.height=r.height+"px"; e.vy.style.display="block";

    var cfg=window.__dvlLastCrossCfg || {};
    var y0=Number(cfg.y0), y1=Number(cfg.y1), mn=Number(cfg.min), mx=Number(cfg.max);
    if(isFinite(y0)&&isFinite(y1)&&isFinite(mn)&&isFinite(mx)&&y1!==y0){
      var localY=ev.clientY-r.top;
      var p=mx-((localY-y0)/(y1-y0))*(mx-mn);
      e.lb.textContent=fmt(p);
      var x1=isFinite(Number(cfg.x1)) ? r.left+Number(cfg.x1) : r.right-80;
      e.lb.style.left=Math.min(r.right-77,Math.max(r.left,x1+3))+"px";
      e.lb.style.top=Math.min(r.bottom-24,Math.max(r.top+2,ev.clientY-11))+"px";
      e.lb.style.display="block";
    }else{
      e.lb.style.display="none";
    }
  }

  window.addEventListener("pointermove",move,{passive:true});
  window.addEventListener("pointerleave",hide,{passive:true});
  document.addEventListener("mouseleave",hide,{passive:true});
})();
