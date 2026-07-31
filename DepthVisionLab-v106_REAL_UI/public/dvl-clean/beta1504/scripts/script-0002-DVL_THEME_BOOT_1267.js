/* Beta 1.267 — DVL Theme Studio: registro central de temas + aplicação ANTES do
   primeiro paint (sem flash). Re-aponta as variáveis CSS que o app já usa (--bg0/1/2,
   --panel*, --text, --muted, --accent, --b-*, --dvl-desktop-*, --dvl-panel-line*) com
   !important inline (vence o !important das folhas de estilo), então uma paleta muda
   o app inteiro pelas mesmas variáveis. Semânticas (buy/sell/TP/SL/candles) NÃO mudam
   — os acentos ficam sempre na família verde/teal pra não confundir compra. */
(function(){
  "use strict";
  /* Cada tema define: tokens (variáveis CSS que o app JÁ declara — bg/superfície/borda/
     texto/muted + as dvl-*), canvasBg (a cor com que o GRÁFICO é pintado no <canvas> via
     JS — não dá pra trocar por CSS, então usamos um hook no fillStyle) e domBg (fundo do
     body). Acentos/verde-vermelho/velas NÃO mudam: só o fundo/superfícies/chrome. */
  var P = window.DVL_THEME_PRESETS = {
    teal: { name:"DVL Teal", swatch:["#020806","#0b1721","#10df77"], canvasBg:"#020806", domBg:"#020806", tokens:{
      "--bg0":"#020806","--bg1":"#030d0a","--bg2":"#0b1721","--card":"#03100c","--card2":"#040e0c",
      "--text":"#f4f8fb","--muted":"#8ea0af","--muted2":"#5f6d80",
      "--b-text":"#f4f8fb","--b-muted":"#8ea0af","--b-border":"rgba(142,174,190,.16)",
      "--dvl-panel-line":"rgba(142,174,190,.20)","--dvl-panel-line-strong":"rgba(142,174,190,.30)",
      "--dvl-desktop-surface":"#0b1721","--dvl-desktop-border":"rgba(142,174,190,.16)",
      "--dvl-pos-text":"#f4f8fb","--dvl-pos-muted":"#8ea0af",
      "--dvl-bg-0":"#020806","--dvl-bg-1":"#030d0a","--dvl-surface-1":"#0b1721","--dvl-surface-2":"#0e1c27","--dvl-border":"rgba(142,174,190,.14)","--dvl-text":"#f4f8fb","--dvl-muted":"#8ea0af" } },
    ocean: { name:"Ocean", swatch:["#04101c","#0a1c30","#2ad4c0"], canvasBg:"#04101c", domBg:"#04101c", tokens:{
      "--bg0":"#04101c","--bg1":"#061726","--bg2":"#0a1c30","--card":"#0a1c30","--card2":"#0c2033",
      "--text":"#eef4fb","--muted":"#90a4bd","--muted2":"#63758c",
      "--b-text":"#eef4fb","--b-muted":"#90a4bd","--b-border":"rgba(120,160,205,.20)",
      "--dvl-panel-line":"rgba(120,160,205,.24)","--dvl-panel-line-strong":"rgba(120,160,205,.36)",
      "--dvl-desktop-surface":"#0a1c30","--dvl-desktop-border":"rgba(120,160,205,.20)",
      "--dvl-pos-text":"#eef4fb","--dvl-pos-muted":"#90a4bd",
      "--dvl-bg-0":"#04101c","--dvl-bg-1":"#061726","--dvl-surface-1":"#0a1c30","--dvl-surface-2":"#0e2338","--dvl-border":"rgba(120,160,205,.18)","--dvl-text":"#eef4fb","--dvl-muted":"#90a4bd" } },
    carbon: { name:"Carbon", swatch:["#0b0e11","#1a1f25","#3fb98f"], canvasBg:"#0d1116", domBg:"#0b0e11", tokens:{
      "--bg0":"#0b0e11","--bg1":"#0e1216","--bg2":"#14181d","--card":"#14181d","--card2":"#1a1f25",
      "--text":"#eef1f4","--muted":"#98a0a8","--muted2":"#6b7178",
      "--b-text":"#eef1f4","--b-muted":"#98a0a8","--b-border":"rgba(160,170,180,.16)",
      "--dvl-panel-line":"rgba(160,170,180,.20)","--dvl-panel-line-strong":"rgba(160,170,180,.30)",
      "--dvl-desktop-surface":"#14181d","--dvl-desktop-border":"rgba(160,170,180,.16)",
      "--dvl-pos-text":"#eef1f4","--dvl-pos-muted":"#98a0a8",
      "--dvl-bg-0":"#0b0e11","--dvl-bg-1":"#0e1216","--dvl-surface-1":"#14181d","--dvl-surface-2":"#1a1f25","--dvl-border":"rgba(160,170,180,.15)","--dvl-text":"#eef1f4","--dvl-muted":"#98a0a8" } }
  };

  /* ── hook do <canvas>: o gráfico é limpo com fillStyle="#020806"; fillRect(0,…) a cada
     frame, então CSS não pega. Aqui trocamos APENAS os near-blacks de fundo conhecidos
     pela cor de fundo do tema; qualquer outra cor (velas verde/vermelho, textos, acentos,
     zonas) passa intacta. Um único hook global no protótipo, instalado uma vez. */
  var BG_REMAP = { "#020806":1, "#010806":1, "#010705":1, "#020710":1, "#021018":1 };
  window.__DVL_THEME_CANVAS_BG = "#020806";
  (function installCanvasHook(){
    try{
      if(window.__DVL_CANVAS_HOOK_ON) return;
      var C = window.CanvasRenderingContext2D; if(!C || !C.prototype) return;
      var d = Object.getOwnPropertyDescriptor(C.prototype, "fillStyle"); if(!d || !d.set || !d.get) return;
      /* caminho quente (chamado por vela/frame): só toca strings hex "#…"; lookup direto */
      function remap(v){ if(typeof v==="string" && v.charCodeAt(0)===35 && BG_REMAP[v]) return window.__DVL_THEME_CANVAS_BG; return v; }
      Object.defineProperty(C.prototype, "fillStyle", {
        configurable:true, enumerable:d.enumerable,
        get:function(){ return d.get.call(this); },
        set:function(v){ d.set.call(this, remap(v)); }
      });
      window.__DVL_CANVAS_HOOK_ON = true;
    }catch(_){}
  })();

  /* ── REMAPEADOR GLOBAL DE CORES (DOM) ────────────────────────────────────
     O app tem cor hardcoded em regras CSS e em style="" inline (inclusive nos
     BOTÕES). Aqui reescrevemos, em runtime, só as FAMÍLIAS NEUTRAS + o ACENTO:
       fundo · superfície/painel · borda · texto · muted · acento(verde)
     Vermelho (venda), amarelo/laranja (alerta), roxo, ciano e as velas do
     gráfico NÃO são tocados — semântica preservada. Sempre remapeamos a partir
     do style ORIGINAL guardado (data-dvl-o), então dá pra alternar temas à
     vontade. Regras CSS viram uma folha de override reconstruída a cada troca. */
  function hexToRgb(h){ h=h.replace("#",""); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  /* papel de cada cor-fonte do app (hex minúsculo, sem espaço) */
  var SROLE = {};
  ["#020806","#010806","#010705","#020710","#021018","#030d0a","#010504","#03100c","#040e0c","#010b08","#03110b","#041410","#02100a","#010806","#02120b","#03100b"].forEach(function(c){ SROLE[c]="bg"; });
  ["#0b1721","#0e1c27","#0c1a16","#0a1512","#0d1a15","#05120d","#061710","#0b1a15","#0e1a16","#091712","#0e1c27","#0b1b15","#0c1c17"].forEach(function(c){ SROLE[c]="surface"; });
  ["#f4f6f4","#f5f9ff","#f4f7f4","#f4f8fb","#dfeeff","#dcebe4","#eafff4","#eef4fb","#e9f6ef","#eaf4ef"].forEach(function(c){ SROLE[c]="text"; });
  ["#8aa99b","#7f9c8e","#a5aaa9","#9fb3c8","#75827d","#8999ad","#9aa6a1","#8ea0af","#9fb5d3","#7f91a7","#bcd3e2","#5f6d80","#9fb3c8","#7db8a5","#89a99b"].forEach(function(c){ SROLE[c]="muted"; });
  ["#10df77","#13dc8d","#20e6ba","#0bb864","#14d8a0","#0ecb6c"].forEach(function(c){ SROLE[c]="accent"; });
  /* papel de triplas rgb (para rgba(...)) */
  var SRGB = { "5,14,12":"surface","7,18,14":"surface","3,10,8":"bg","2,8,6":"bg","6,16,12":"bg","11,23,33":"surface","9,20,29":"surface","142,174,190":"muted","94,135,178":"muted","120,160,205":"muted","16,223,119":"accent" };
  /* cores por PAPEL em cada tema (accentLight = tom claro do verde, p/ gradientes/glows) */
  var RTHEME = {
    teal:   { bg:"#020806", surface:"#0b1721", text:"#f4f8fb", muted:"#8ea0af", accent:"#10df77", accentLight:"#7cf0c8" },
    ocean:  { bg:"#04101c", surface:"#0a1c30", text:"#eef4fb", muted:"#90a4bd", accent:"#2ad4c0", accentLight:"#7fe6da" },
    carbon: { bg:"#0b0e11", surface:"#1a1f25", text:"#eef1f4", muted:"#98a0a8", accent:"#3fb98f", accentLight:"#86e0bf" }
  };
  /* Detecção ALGORÍTMICA do PAPEL de uma cor — pega QUALQUER tom da família, não só a
     lista. Conservadora e preserva o que é semântico:
       • verde de destaque → accent / accentLight (verde domina R e B)
       • fundo escuro (near-black, não preto puro p/ manter sombras) → bg / surface
       • cinza/sage médio dessaturado → muted
     PRESERVA: preto puro, vermelho/laranja/amarelo (tons quentes), ciano/azul e roxo. */
  function autoRole(r,g,b){
    var mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    if(g>125 && g>r+45 && g>b+15) return ((r>=120&&b>=120)||(r+g+b)/3>=175) ? "accentLight" : "accent";
    var warm = (r>g+8 && r>b+8);                 /* vermelho/laranja/amarelo/marrom → não mexe */
    if(!warm){
      if(mx>=6 && mx<=30 && mn<=24) return "bg";        /* fundo profundo (>preto puro) */
      if(mx>30 && mx<=52 && mn<=42) return "surface";   /* painel/superfície escura */
      if(mn>=80 && mx<=205 && (mx-mn)<62) return "muted"; /* cinza/sage/azul-acinzentado médio */
    }
    return null;
  }
  /* Registramos as cores DE SAÍDA de cada tema com o mesmo papel, pra que trocar de tema
     reconheça a cor já aplicada e mapeie pro novo — assim NÃO guardamos style original. */
  Object.keys(RTHEME).forEach(function(k){ var rt=RTHEME[k];
    Object.keys(rt).forEach(function(role){ var hex=(rt[role]||"").toLowerCase(); if(/^#[0-9a-f]{6}$/.test(hex)){ SROLE[hex]=role; var rgb=hexToRgb(hex); SRGB[rgb[0]+","+rgb[1]+","+rgb[2]]=role; } });
  });
  /* Deriva SRGB a partir de TODO o SROLE (hex): o CSSOM serializa cores hex das REGRAS
     como rgb(), então sem isso o override das folhas não pegava fundo de cabeçalho/rodapé. */
  Object.keys(SROLE).forEach(function(hex){ if(/^#[0-9a-f]{6}$/.test(hex)){ var rgb=hexToRgb(hex), key=rgb[0]+","+rgb[1]+","+rgb[2]; if(SRGB[key]==null) SRGB[key]=SROLE[hex]; } });
  function remapStr(str, rt){
    if(!str || str.indexOf("#")<0 && str.indexOf("rgb")<0) return str;
    /* hex #rrggbb / #rgb */
    str = str.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, function(m){
      var lm=m.toLowerCase(), role=SROLE[lm];
      if(role && rt[role]) return rt[role];
      if(lm.length===7){ var r=parseInt(lm.slice(1,3),16),g=parseInt(lm.slice(3,5),16),b=parseInt(lm.slice(5,7),16); var gr=autoRole(r,g,b); if(gr && rt[gr]) return rt[gr]; }
      return m;
    });
    /* rgb()/rgba() */
    str = str.replace(/rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)/g, function(m,r,g,b,a){
      r=+r; g=+g; b=+b;
      var role=SRGB[r+","+g+","+b] || autoRole(r,g,b); if(!role || !rt[role]) return m;
      var rgb=hexToRgb(rt[role]); return a!=null ? "rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+a+")" : "rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
    });
    return str;
  }
  function skipEl(el){ /* não mexer em overlays que redesenham por frame / camada da foto / canvas */
    var id=el.id||""; if(id.indexOf("dvlCrosshair")===0 || id==="chart" || id==="dvlThemeBg" || id==="dvlThemeBgImg") return true;
    if(el.closest && el.closest(".canvasWrap,#dvlThemeBg")) return true;
    return false;
  }
  /* IDEMPOTENTE e NÃO-DESTRUTIVO: remapeia as CORES do style ATUAL do elemento pro tema
     corrente (reconhece cores-fonte e cores de qualquer tema). Não guarda original, não
     reseta nada — então mudanças de layout/opacidade que o app faz no inline são mantidas. */
  function tintEl(el, rt){
    if(el.nodeType!==1 || skipEl(el)) return;
    var cur=el.getAttribute("style"); if(!cur || (cur.indexOf("#")<0 && cur.indexOf("rgb")<0)) return;
    var out=remapStr(cur, rt);
    if(out!==cur) el.setAttribute("style", out);
  }
  var _sweeping=false;
  function sweepDom(rt){
    if(_sweeping) return; _sweeping=true;
    try{
      var nodes=document.querySelectorAll("[style]");
      for(var i=0;i<nodes.length;i++) tintEl(nodes[i], rt);
    }catch(_){}
    _sweeping=false;
  }
  /* override das regras CSS (folhas): reconstrói do zero a cada troca a partir das
     folhas originais (que nunca são mutadas). Só declarações que mudam de cor.
     RECORRE em @media/@supports — muito do chrome do desktop (cabeçalho, rodapé, trilhos,
     dica do mouse) fica dentro de @media, então precisa entrar nos grupos. */
  function walkRules(rules, rt){
    var out="";
    for(var r=0;r<rules.length;r++){
      var rule=rules[r];
      if((rule.type===4 || rule.type===12) && rule.cssRules){      /* @media / @supports */
        var cond = (rule.media && rule.media.mediaText) || rule.conditionText || "";
        var kw = rule.type===4 ? "@media" : "@supports";
        var inner = walkRules(rule.cssRules, rt);
        if(inner) out += kw+" "+cond+"{\n"+inner+"}\n";
        continue;
      }
      if(rule.type!==1 || !rule.style || !rule.selectorText) continue;
      var ct=rule.cssText; if(ct.indexOf("#")<0 && ct.indexOf("rgb")<0) continue;
      var decl="";
      for(var pi=0; pi<rule.style.length; pi++){
        var prop=rule.style[pi], val=rule.style.getPropertyValue(prop);
        if(val.indexOf("#")<0 && val.indexOf("rgb")<0) continue;
        var nv=remapStr(val, rt);
        if(nv!==val) decl+=prop+":"+nv+" !important;";
      }
      if(decl) out+=rule.selectorText+"{"+decl+"}\n";
    }
    return out;
  }
  function buildRuleOverride(rt){
    var out="";
    try{
      var sheets=document.styleSheets;
      for(var s=0;s<sheets.length;s++){
        if(sheets[s].ownerNode && sheets[s].ownerNode.id && sheets[s].ownerNode.id.indexOf("dvlThemeRules")===0) continue;
        var rules; try{ rules=sheets[s].cssRules; }catch(_){ continue; } if(!rules) continue;
        out += walkRules(rules, rt);
      }
    }catch(_){}
    return out;
  }
  var _sweepTimer=0, _curThemeId="teal";
  window.DVL_THEME_DOM_REMAP = function(themeId){
    var rt=RTHEME[themeId]||RTHEME.teal; _curThemeId=themeId;
    /* folha de override das regras CSS — anexada ao FIM do <body> (muitos estilos do app
       ficam em <style> dentro do body; pra vencer no empilhamento a nossa precisa vir por
       último). Movemos pro fim a cada troca. */
    try{
      var rs=document.getElementById("dvlThemeRules");
      if(!rs){ rs=document.createElement("style"); rs.id="dvlThemeRules"; }
      rs.textContent = (themeId==="teal") ? "" : buildRuleOverride(rt);
      var host=document.body||document.head||document.documentElement; host.appendChild(rs);   /* appendChild move pro fim */
    }catch(_){}
    /* varre o DOM (style inline) */
    sweepDom(rt);
    /* re-varredura leve periódica p/ elementos criados depois (painéis, botões dinâmicos) */
    if(!_sweepTimer){ _sweepTimer=setInterval(function(){ sweepDom(RTHEME[_curThemeId]||RTHEME.teal); }, 1600); }
  };

  window.__DVL_THEME_CUR = "teal";
  /* (re)constrói o override de superfícies + a cor de fundo do canvas. O gráfico fica
     SEMPRE opaco (ele se limpa pintando o próprio fundo a cada frame — deixá-lo
     translúcido causaria rastro). A foto de fundo aparece por uma CAMADA por cima em
     baixa opacidade (ver o módulo do Theme Studio), sem tocar no desenho do gráfico. */
  window.DVL_THEME_REFRESH_SURFACE = function(){
    var P2=window.DVL_THEME_PRESETS, th=P2 && P2[window.__DVL_THEME_CUR]; if(!th) return;
    var t=th.tokens||{}, bg=th.domBg||t["--bg0"], cbg=th.canvasBg||t["--bg0"]||"#020806";
    window.__DVL_THEME_CANVAS_BG=cbg;
    try{
      var st=document.getElementById("dvlThemeSurface");
      if(!st){ st=document.createElement("style"); st.id="dvlThemeSurface"; }
      st.textContent =
        'html,body{background-color:'+bg+' !important}'+
        'html,body{background-image:radial-gradient(900px 420px at 50% -180px,rgba(11,53,42,.10),transparent 64%),linear-gradient(180deg,'+t["--bg0"]+','+t["--bg1"]+' 46%,'+bg+') !important}'+
        '#chart,.canvasWrap,#chartWrap{background-color:'+cbg+' !important}';
      (document.body||document.head||document.documentElement).appendChild(st);   /* mantém por último no cascade */
    }catch(_){}
    try{ var m=document.querySelector('meta[name="theme-color"]'); if(!m){ m=document.createElement("meta"); m.setAttribute("name","theme-color"); document.head.appendChild(m);} m.setAttribute("content", bg); }catch(_){}
    try{ if(typeof window.drawSoon==="function") window.drawSoon(); }catch(_){}
    try{ if(typeof window.draw==="function") window.draw(); }catch(_){}
  };

  window.DVL_THEME_APPLY_TOKENS = function(themeId){
    var P2 = window.DVL_THEME_PRESETS, th = P2 && P2[themeId]; if(!th) return;
    var t = th.tokens || {};
    window.__DVL_THEME_CUR = themeId;
    var root=document.documentElement.style;
    for(var k in t){ try{ root.setProperty(k, t[k], "important"); }catch(_){ try{ root.setProperty(k,t[k]); }catch(__){} } }
    /* fundo do gráfico + folha de superfícies (respeita a foto se ligada) */
    window.DVL_THEME_REFRESH_SURFACE();
    /* remapeia a interface toda (regras CSS + style inline dos botões/painéis) */
    try{ window.DVL_THEME_DOM_REMAP(themeId); }catch(_){}
  };
  try{
    var saved=JSON.parse(localStorage.getItem("dvl.themeStudio.v1")||"null");
    if(saved && saved.themeId && P[saved.themeId]) window.DVL_THEME_APPLY_TOKENS(saved.themeId);
  }catch(_){}
  /* quando o DOM terminar de montar, refaz a varredura (o boot roda no <head>) */
  try{ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){ try{ var s=JSON.parse(localStorage.getItem("dvl.themeStudio.v1")||"null"); window.DVL_THEME_DOM_REMAP(s&&s.themeId?s.themeId:"teal"); }catch(_){} },{once:true}); }catch(_){}
})();
