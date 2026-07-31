(function(){
  "use strict";
  if(window.DVL_PHASE1B_INDICATORS_MENU_0813) return;
  window.DVL_PHASE1B_INDICATORS_MENU_0813 = true;

  var menu=null, open=false, bmExpanded=false, dvlIndSuppressCloseUntil=0;
  function drawNow(){try{if(typeof drawSoon==="function")drawSoon();else if(window.drawSoon)window.drawSoon();}catch(_){}}
  function closeLegacy(){
    try{if(typeof closeIndicatorsDropdown==="function")closeIndicatorsDropdown();}catch(_){}
    try{document.documentElement.classList.remove("dvl1b-ind-open");}catch(_){}
    var old=document.getElementById("fxIndicatorWrap");
    if(old){old.classList.remove("is-open");old.style.left="";old.style.top="";old.style.width="";}
  }
  function apiName(n){try{return window[n]||null;}catch(_){return null;}}
  function isOn(name){
    var a=apiName(name);
    try{if(a&&typeof a.on==="function")return!!a.on();}catch(_){}
    try{if(a&&a.state&&typeof a.state.on!=="undefined")return!!a.state.on;}catch(_){}
    try{if(a&&a.settings&&typeof a.settings.on!=="undefined")return!!a.settings.on;}catch(_){}
    return false;
  }
  function clickPill(id){var p=document.getElementById(id);if(p&&typeof p.click==="function"){p.click();return true;}return false;}

  var FAV_LS="DVL_INDICATOR_FAVORITES_0854";
  var COLLAPSE_LS="DVL_INDICATOR_GROUPS_COLLAPSED_0854";
  var DEFAULT_FAVS=["vol","vp"];

  function readJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k)||"null");return v==null?d:v;}catch(_){return d;}}
  function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}}

  function favs(){
    var v=readJSON(FAV_LS,null);
    if(!Array.isArray(v)){v=DEFAULT_FAVS.slice();writeJSON(FAV_LS,v);}
    var seen={};
    return v.filter(function(k){if(!k||seen[k])return false;seen[k]=1;return true;});
  }

  function isFav(k){return favs().indexOf(k)>=0;}

  function toggleFav(k){
    var f=favs(),i=f.indexOf(k);
    if(i>=0)f.splice(i,1);else f.push(k);
    writeJSON(FAV_LS,f);
  }

  function collapsed(){
    var d=readJSON(COLLAPSE_LS,null);
    if(!d || typeof d!=="object") d={fav:false,osc:true,overlay:true,flow:false,soon:true};
    return d;
  }

  function isCollapsed(k){return !!collapsed()[k];}

  function toggleSection(k){
    var c=collapsed();
    c[k]=!c[k];
    writeJSON(COLLAPSE_LS,c);
  }

  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];
    });
  }

  function starSvg(active){
    return '<svg class="dvl1b-ind0854-star-svg" viewBox="0 0 24 24" fill="none" stroke="#ffd321" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.7l2.5 5.1 5.6.8-4 3.9.95 5.5L12 16.4 7.05 19l.95-5.5-4-3.9 5.5-.8L12 3.7z" '+(active?'fill="#ffd321"':'fill="none"')+' stroke="#ffd321"/></svg>';
  }

  function catFor(m){
    if(m.missing) return "soon";
    if(m.key==="oi"||m.key==="ls"||m.key==="netlong"||m.key==="netshort"||m.key==="netdelta"||m.key==="dv"||m.key==="exr"||m.key==="tv"||m.key==="arion") return "osc";
    if(m.key==="ma"||m.key==="bookmap"||m.key==="dh"||m.key==="frvp"||m.key==="ifvgmagnet"||m.key==="gex") return "overlay";
    return "flow";
  }

  function modules(){
    return [
      {key:"vol",mark:"VOL",title:"DVL Volume",sub:"overlay",api:"DVLVolume",pill:"dvlVolState",row:"dvlVolumeItem"},
      {key:"dv",mark:"DV",title:"DVL Delta Volume",sub:"buy/sell delta · TF selecionável",api:"DVLDeltaVolume",pill:"dvlDeltaVolumeState",row:"dvlDeltaVolumeItem"},
      {key:"arion",mark:"AR",title:"ARION Zone Profile MTF",sub:"zonas · profile · volume MTF",api:"DVLArionZoneProfile",pill:"dvlArionState",row:"dvlArionItem"},
      {key:"exr",mark:"EXR",title:"DVL RSI Exhaustion Pro",sub:"multi-TF exhaustion · beyond 0/100",api:"DVLExhaustionRSI",pill:"dvlExhaustionRSIState",row:"dvlExhaustionRSIItem"},
      {key:"vp",mark:"VP",title:"Volume Profile",sub:"range visível · POC / VAH / VAL",api:"DVLVolumeProfile",pill:"dvlVPState",row:"dvlVolProfileItem"},
      {key:"frvp",mark:"FR",title:"Fixed Range VP",sub:"Delta | Profile · LVN",api:"DVLFixedRangeVP",pill:"dvlFRVPState",row:"dvlFixedRangeVPItem"},
      {key:"gex",mark:"GX",title:"DVL GEX Levels",sub:"Flip · Max Pain · 1D range",api:"DVLGEXLevels",pill:"dvlGEXState",row:"dvlGEXItem"},
      {key:"sz",mark:"SZ",title:"DVL Spike Zones",sub:"overlay",api:"DVLSpikeZones",pill:"dvlSzState",row:"dvlSpikeZonesItem"},
      {key:"fvg",mark:"FV",title:"DVL FVG Firewall",sub:"order flow · smart money",api:"DVL_FVG_FIREWALL_API",pill:"dvlFvgState",row:"dvlFvgFirewallItem"},
      {key:"ifvgmagnet",mark:"IF",title:"DVL FVG Magnet IFVG",sub:"HTF target · LTF trigger · R:R",api:"DVLFVGMagnetIFVG",pill:"dvlFVGMagnetState",row:"dvlFVGMagnetItem"},
      {key:"bubbles",mark:"BB",title:"DVL Bubbles",sub:"big trades · volume · deep proxy",api:"DVL_BUBBLES_API",pill:"dvlBubblesState",row:"dvlBubblesItem"},
      {key:"vpalert",mark:"AL",title:"Alertas VP",sub:"POC/VAH/VAL 1m · Telegram",api:"DVL_VP_ALERTS_API",pill:"dvlVpAlertState",row:"dvlVpAlertItem"},
      {key:"smartdelta",mark:"SD",title:"DVL Smart Delta",sub:"institutional confluence",api:"DVL_SMART_DELTA_ENGINE_API",pill:"dvlSmartDeltaState",row:"dvlSmartDeltaItem"},
      {key:"ma",mark:"MA",title:"Moving Averages",sub:"10 médias · overlay",api:"DVLMovingAverages",pill:"dvlMaState",row:"dvlMovingAveragesItem"},
      {key:"bookmap",mark:"BM",title:"DVL Bookmap Zones",sub:"Order book heatmap · Bookmap style",api:"DVL_BOOKMAP_ZONES_0813"},
      {key:"dh",mark:"DH",title:"DVL Deep Heatmap",sub:"liquidez + consumo confirmado",api:"DVL_DEEP_HEATMAP_API"},
      {key:"tv",mark:"TV",title:"DVL Tick Volume",sub:"tick volume oscillator",api:"DVLTickVolume",pill:"dvlTickVolumeState",row:"dvlTickVolumeItem"}
    ].map(function(m){
      m.missing = m.key==="bookmap" ? false : (!apiName(m.api) && !(m.row&&document.getElementById(m.row)));
      return m;
    });
  }

  function suppressProgrammaticClose0861(ms){
    dvlIndSuppressCloseUntil = Date.now() + (ms || 700);
  }


  function bringIndicatorInputsToFront0862(){
    try{
      var sels=[
        ".dvl-vt-panel.is-open",
        ".dvl-exr-panel.is-open",
        ".dvl-ma-panel.is-open",
        ".dvl-vol-panel.is-open",
        ".dvl-sz-panel.is-open",
        ".dvl-vp-panel.is-open",
        ".dvl-feb-panel.is-open",
        ".dvl-tv-panel.is-open",
        "[id^='dvl'][id$='Panel'].is-open"
      ].join(",");
      document.querySelectorAll(sels).forEach(function(p){
        if(!p || p.id==="dvl1bIndicatorMenu0813") return;
        p.classList.add("dvl-ind-input-front-0862");
        p.style.setProperty("z-index","100020","important");
      });
    }catch(_){}
  }

  function afterOpenInputs0862(){
    suppressProgrammaticClose0861(1000);
    [0,40,120,260].forEach(function(t){
      setTimeout(bringIndicatorInputsToFront0862,t);
    });
  }



  function isInsideIndicatorConfigPanel0863(target){
    if(!target || !target.closest) return false;
    return !!target.closest([
      ".dvl-vt-panel",
      ".dvl-exr-panel",
      ".dvl-ma-panel",
      ".dvl-vol-panel",
      ".dvl-sz-panel",
      ".dvl-vp-panel",
      ".dvl-feb-panel",
      ".dvl-tv-panel",
      ".dvl-ind-input-front-0862",
      "[id^='dvl'][id$='Panel']"
    ].join(","));
  }

  function toggleModule(m){
    if(!m||m.missing)return;
    suppressProgrammaticClose0861(900);
    setTimeout(bringIndicatorInputsToFront0862,60);
    if(m.key==="bookmap"){
      var bm=window.DVL_BOOKMAP_ZONES_0813||window.DVL_BOOKMAP_ZONES_0812||window.DVL_BOOKMAP_ZONES_0808;
      if(bm&&typeof bm.setOn==="function")bm.setOn(!isOn("DVL_BOOKMAP_ZONES_0813"));
      bmExpanded=true;drawNow();return;
    }
    if(m.pill&&clickPill(m.pill)){setTimeout(drawNow,0);return;}
    var a=apiName(m.api);
    try{if(a&&typeof a.setOn==="function"){a.setOn(!isOn(m.api));drawNow();return;}}catch(_){}
  }
  function openModule(m){
    if(!m||m.missing)return;
    suppressProgrammaticClose0861(1000);
    if(m.key==="bookmap"){bmExpanded=!bmExpanded;render();afterOpenInputs0862();return;}

    var a=apiName(m.api);
    try{
      if(a&&typeof a.openPanel==="function"){a.openPanel();afterOpenInputs0862();return;}
      if(a&&typeof a.open==="function"){a.open();afterOpenInputs0862();return;}
    }catch(_){}

    var row=m.row?document.getElementById(m.row):null;
    if(row&&typeof row.click==="function"){row.click();afterOpenInputs0862();return;}
  }
  function bmSettings(){return (window.DVL_BOOKMAP_ZONES_0813&&window.DVL_BOOKMAP_ZONES_0813.settings)||{};}
  function bmSet(k,v){var a=window.DVL_BOOKMAP_ZONES_0813||window.DVL_BOOKMAP_ZONES_0812;if(a&&typeof a.set==="function")a.set(k,v);}
  function bmToggle(k){var s=bmSettings();if(k==="on"){var a=window.DVL_BOOKMAP_ZONES_0813;if(a&&typeof a.setOn==="function")a.setOn(!s.on);}else bmSet(k,!s[k]);}
  function bChoice(k,v,t){var s=bmSettings();return'<button class="dvl1b-bmz0813-choice '+(String(s[k])===String(v)?"is-active":"")+'" type="button" data-bmz-set="'+k+'" data-bmz-val="'+v+'">'+t+'</button>';}
  function bTog(k){var s=bmSettings();return'<button class="dvl1b-bmz0813-toggle '+(s[k]?"is-on":"")+'" type="button" data-bmz-toggle="'+k+'">'+(s[k]?"ON":"OFF")+'</button>';}
  function bStep(k,min,max,step,suf){var s=bmSettings(),val=Number(s[k]);if(!Number.isFinite(val))val=0;return'<div class="dvl1b-bmz0813-step" data-bmz-step="'+k+'" data-min="'+min+'" data-max="'+max+'" data-step="'+step+'"><button type="button" data-dir="-1">−</button><span>'+val+(suf||"")+'</span><button type="button" data-dir="1">+</button></div>';}
  function bField(l,b,full){return'<div class="dvl1b-bmz0813-field '+(full?"full":"")+'"><label>'+l+'</label>'+b+'</div>';}
  function bmInline(){
    return'<div class="dvl1b-bmz0813-settings '+(bmExpanded?"is-open":"")+'"><div class="dvl1b-bmz0813-grid">'+
      bField("Indicador",bTog("on"))+
      bField("Fonte",'<div class="dvl1b-bmz0813-choices">'+bChoice("source","futures","Futures")+bChoice("source","spot","Spot")+'</div>')+
      bField("Depth",'<div class="dvl1b-bmz0813-choices three">'+bChoice("depth",20,"20")+bChoice("depth",100,"100")+bChoice("depth",500,"500")+'</div>')+
      bField("Sensibilidade",'<div class="dvl1b-bmz0813-choices three">'+bChoice("sensitivity","low","Baixa")+bChoice("sensitivity","medium","Média")+bChoice("sensitivity","high","Alta")+'</div>')+
      bField("Máx zonas",bStep("maxZones",2,24,1))+
      bField("Altura",bStep("heightPx",3,18,1,"px"))+
      bField("Labels",bTog("labels"))+
      bField("Glow",bTog("glow"))+
      bField("ATR limiter",bTog("maxDistATR"))+
      bField("Distância ATR",bStep("atrDistance",1,20,1,"x"))+
      bField("Opacidade",bStep("opacity",0.15,0.85,0.05),true)+
      '</div><div class="dvl1b-bmz0813-note">Bookmap ON desenha zonas reais atrás dos candles.</div></div>';
  }
  function ensure(){
    if(menu)return menu;
    menu=document.createElement("div");menu.id="dvl1bIndicatorMenu0813";menu.setAttribute("data-dvl-ui","true");
    menu.innerHTML='<div class="dvl1b-ind0813-head"><b>INDICATORS</b><button class="dvl1b-ind0854-close" type="button" data-ind-close aria-label="Fechar Indicators">×</button></div><div class="dvl1b-ind0813-list" id="dvl1bIndicatorList0813"></div>';
    document.body.appendChild(menu);
    menu.addEventListener("pointerdown",function(e){e.stopPropagation();},true);
    menu.addEventListener("click",onMenuClick,true);
    return menu;
  }
  function render(){
    ensure();var list=document.getElementById("dvl1bIndicatorList0813");if(!list)return;

    var all=modules().filter(function(m){return !m.missing || m.key==="bookmap";});
    var favKeys=favs();
    var by={fav:[],osc:[],overlay:[],flow:[],soon:[]};

    all.forEach(function(m){
      if(m.missing){by.soon.push(m);return;}

      if(favKeys.indexOf(m.key)>=0) by.fav.push(m);
      else by[catFor(m)].push(m);
    });

    // Real soon rows from legacy menu, but keep only as compact section, never as old huge rows.
    modules().filter(function(m){return m.missing;}).forEach(function(m){by.soon.push(m);});

    var meta=[
      {key:"fav",title:"FAVORITES",icon:"star",list:by.fav},
      {key:"osc",title:"OSCILLATORS",icon:"osc",list:by.osc},
      {key:"overlay",title:"OVERLAY",icon:"bars",list:by.overlay},
      {key:"flow",title:"VOLUME & FLOW",icon:"flow",list:by.flow},
      {key:"soon",title:"SOON",icon:"soon",list:by.soon}
    ];

    function secIcon(kind){
      if(kind==="star") return '<span class="dvl1b-ind0854-sec-star">'+starSvg(true)+'</span>';
      if(kind==="osc") return '<span class="dvl1b-ind0854-sec-osc">⌁</span>';
      if(kind==="bars") return '<span class="dvl1b-ind0854-sec-bars"><i></i><i></i><i></i></span>';
      if(kind==="soon") return '<span class="dvl1b-ind0854-sec-soon">♧</span>';
      return '<span class="dvl1b-ind0854-sec-bars flow"><i></i><i></i><i></i></span>';
    }

    function row(m){
      var on=isOn(m.api);
      var fav=isFav(m.key);
      var missing=!!m.missing;
      return '<div class="dvl1b-ind0813-item dvl1b-ind0854-row '+(missing?'is-missing':'')+'" data-ind-key="'+esc(m.key)+'">'+
        '<button class="dvl1b-ind0854-fav '+(fav?'is-fav':'')+'" type="button" data-ind-fav="'+esc(m.key)+'" aria-label="'+(fav?'Desfavoritar ':'Favoritar ')+esc(m.title)+'">'+starSvg(fav)+'</button>'+
        '<span class="dvl1b-ind0813-mark">'+esc(m.mark)+'</span>'+
        '<span class="dvl1b-ind0813-copy"><b>'+esc(m.title)+'</b><small>'+esc(m.sub)+(missing?' · não encontrado':'')+'</small></span>'+
        (missing?'<i class="dvl1b-ind0813-missing">Soon</i>':'<i class="dvl1b-ind0813-switch '+(on?'is-on':'')+'" data-ind-toggle="'+esc(m.key)+'" aria-label="'+(on?'ON':'OFF')+'"></i>')+
      '</div>'+(m.key==="bookmap"?bmInline():'');
    }

    var out="";
    meta.forEach(function(s){
      var closed=isCollapsed(s.key), count=s.list.length;
      out+='<div class="dvl1b-ind0854-section '+(closed?'is-collapsed':'')+'" data-ind-section-wrap="'+s.key+'">'+
        '<button class="dvl1b-ind0854-sectionHead" type="button" data-ind-section="'+s.key+'">'+
          secIcon(s.icon)+
          '<b>'+s.title+'</b>'+
          '<span class="dvl1b-ind0854-count">'+count+'</span>'+
          '<i class="dvl1b-ind0854-chevron"></i>'+
        '</button>'+
        '<div class="dvl1b-ind0854-sectionBody">';
      if(count){
        s.list.forEach(function(m){out+=row(m);});
      }else if(s.key==="fav"){
        out+='<div class="dvl1b-ind0854-empty">Toque na estrela de um indicador para fixar aqui.</div>';
      }
      out+='</div></div>';
    });

    list.innerHTML=out;
  }
  function position(){
    ensure();var btn=document.getElementById("dvl1b_indBtn");if(!btn||!menu)return;
    try{
      var r=btn.getBoundingClientRect(),vw=window.innerWidth||360;
      var W=Math.min(340,Math.max(300,vw-28));
      var left=Math.max(10,Math.min(Math.round(r.left-80),vw-W-10));
      menu.style.width=W+"px";
      menu.style.left=left+"px";
      menu.style.top=Math.round(r.bottom+7)+"px";
    }catch(_){}
  }
  function openMenu(){closeLegacy();ensure();render();position();menu.classList.add("is-open");open=true;var btn=document.getElementById("dvl1b_indBtn");if(btn){btn.classList.add("dvl1b-open");btn.setAttribute("aria-expanded","true");}}
  function closeMenu(){if(menu)menu.classList.remove("is-open");open=false;var btn=document.getElementById("dvl1b_indBtn");if(btn){btn.classList.remove("dvl1b-open");btn.setAttribute("aria-expanded","false");}}
  function toggleMenu(e){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}if(open)closeMenu();else openMenu();}
  function find(k){return modules().filter(function(m){return m.key===k;})[0]||null;}
  function onMenuClick(e){
    var t=e.target,
      close=t&&t.closest?t.closest("[data-ind-close]"):null,
      fav=t&&t.closest?t.closest("[data-ind-fav]"):null,
      sec=t&&t.closest?t.closest("[data-ind-section]"):null,
      tog=t&&t.closest?t.closest("[data-ind-toggle]"):null,
      row=t&&t.closest?t.closest("[data-ind-key]"):null,
      set=t&&t.closest?t.closest("[data-bmz-set]"):null,
      bt=t&&t.closest?t.closest("[data-bmz-toggle]"):null,
      step=t&&t.closest?t.closest("[data-bmz-step]"):null,
      dir=t&&t.closest?t.closest("[data-dir]"):null;

    if(close||fav||sec||tog||row||set||bt||(step&&dir)){
      e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    }

    if(close){closeMenu();return;}
    if(fav){toggleFav(fav.getAttribute("data-ind-fav"));render();return;}
    if(sec){toggleSection(sec.getAttribute("data-ind-section"));render();return;}

    if(tog){var mt=find(tog.getAttribute("data-ind-toggle"));toggleModule(mt);if(mt&&mt.key==="bookmap")bmExpanded=true;setTimeout(render,30);return;}
    if(set){bmSet(set.getAttribute("data-bmz-set"),set.getAttribute("data-bmz-val"));bmExpanded=true;render();return;}
    if(bt){bmToggle(bt.getAttribute("data-bmz-toggle"));bmExpanded=true;render();return;}
    if(step&&dir){var k=step.getAttribute("data-bmz-step"),min=Number(step.getAttribute("data-min")),max=Number(step.getAttribute("data-max")),st=Number(step.getAttribute("data-step")),d=Number(dir.getAttribute("data-dir"));var next=Number(bmSettings()[k])+d*st;if(!Number.isFinite(next))next=min;next=Math.max(min,Math.min(max,next));bmSet(k,Number(next.toFixed(3)));bmExpanded=true;render();return;}

    if(row){
      if(tog||fav) return;
      openModule(find(row.getAttribute("data-ind-key")));return;
    }
  }
  function bind(){
    var btn=document.getElementById("dvl1b_indBtn");if(!btn)return false;if(btn.__dvlInd0813Bound)return true;btn.__dvlInd0813Bound=true;
    btn.addEventListener("click",toggleMenu,true);
    document.addEventListener("click",function(e){if(!open)return;var b=document.getElementById("dvl1b_indBtn"),inBtn=b&&b.contains(e.target),inMenu=menu&&menu.contains(e.target),inCfg=isInsideIndicatorConfigPanel0863(e.target);if(inBtn||inMenu||inCfg)return;if(e&&e.isTrusted===false&&Date.now()<dvlIndSuppressCloseUntil)return;closeMenu();},true);
    window.addEventListener("resize",function(){if(open)position();});
    ensure();return true;
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
  setTimeout(function(){bind();if(open)render();},250);setTimeout(function(){bind();if(open)render();},1100);
  window.DVL_PHASE1B_INDICATORS_MENU_0813_API={open:openMenu,close:closeMenu,toggle:toggleMenu,render:render,expandBookmap:function(){bmExpanded=true;render();}};
})();
