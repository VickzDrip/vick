/* Beta 1.266 — Histórico de Alertas no Copilot. Um capturador GLOBAL grava todo
   alerta disparado (hoje: dvl:smart-delta-alert) no localStorage — com mensagem,
   timestamp, TF e ativo — mesmo com o Copilot fechado. Um card "Alertas" no
   Copilot lista tudo (recentes primeiro) com o tempo relativo ("há 4h", "há 10
   min") e o TF quando o alerta é de um timeframe específico. */
(function(){
  "use strict";
  if(window.__DVL_ALERTS_LOG_ON) return; window.__DVL_ALERTS_LOG_ON=true;
  var LS="dvl_alerts_log_v1", CAP=200;
  function load(){ try{ return JSON.parse(localStorage.getItem(LS)||"[]")||[]; }catch(_){ return []; } }
  function save(a){ try{ localStorage.setItem(LS, JSON.stringify(a.slice(-CAP))); }catch(_){} }
  function esc(v){ return String(v==null?"":v).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }
  function add(entry){
    var a=load();
    // dedup: mesma mensagem nos últimos 4s
    var last=a[a.length-1];
    if(last && last.msg===entry.msg && (entry.ts-last.ts)<4000) return;
    a.push(entry); save(a);
    try{ window.dispatchEvent(new CustomEvent("dvl:alerts-log-update")); }catch(_){}
  }
  /* capturador global */
  window.addEventListener("dvl:smart-delta-alert", function(ev){
    try{ var d=ev&&ev.detail||{}; var s=d.snap||{};
      add({ msg:String(d.message||"Alerta"), ts:Date.now(), tf:(s.tf||""), sym:(s.symbol||""), kind:(d.confluence?"confluencia":"smartdelta") });
    }catch(_){}
  }, {passive:true});
  window.DVL_ALERTS_LOG={ list:load, clear:function(){ save([]); try{ window.dispatchEvent(new CustomEvent("dvl:alerts-log-update")); }catch(_){} }, add:add };

  /* ── card no Copilot ── */
  function ago(ts){ var s=Math.max(0,Math.floor((Date.now()-ts)/1000));
    if(s<60) return "há "+s+"s";
    var m=Math.floor(s/60); if(m<60) return "há "+m+" min";
    var h=Math.floor(m/60); if(h<24) return "há "+h+"h"+(m%60?" "+(m%60)+"m":"");
    var d=Math.floor(h/24); return "há "+d+"d"+(h%24?" "+(h%24)+"h":""); }
  function sideColor(msg){ if(/COMPRA|compra/.test(msg)) return "#13dc8d"; if(/VENDA|venda/.test(msg)) return "#ff6b81"; if(/exaust/i.test(msg)) return "#ffd321"; return "#9fb6ab"; }
  function isOpen(){ try{ return document.body.classList.contains("dvlCopilotOpen0974") || !!(document.getElementById("dvlCopilotPage0974")&&document.getElementById("dvlCopilotPage0974").classList.contains("is-open")); }catch(_){ return false; } }

  function rowHTML(e){
    var chip = e.tf ? '<span style="font-size:8.5px;color:#bcd8ff;background:rgba(120,200,255,.12);border:1px solid rgba(120,200,255,.25);border-radius:5px;padding:1px 5px;margin-left:6px">TF '+esc(e.tf)+'</span>' : '';
    var sym = e.sym ? '<span style="color:#7f9c8e;font-size:9px;margin-left:6px">'+esc(String(e.sym).replace(/USDT$/,""))+'</span>' : '';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid rgba(129,166,151,.10)">'
      +'<span style="width:6px;height:6px;border-radius:50%;background:'+sideColor(e.msg)+';margin-top:5px;flex:0 0 auto"></span>'
      +'<div style="flex:1;min-width:0"><div style="color:#dcebe4;font-size:11px;line-height:1.35">'+esc(e.msg)+chip+sym+'</div>'
      +'<div style="color:#8aa99b;font-size:9.5px;margin-top:1px">'+ago(e.ts)+'</div></div></div>';
  }
  function bodyHTML(){
    var a=load().slice().reverse();
    var head='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><b style="font-size:13px;color:#eafff4">Alertas</b>'
      +'<span style="display:flex;gap:8px;align-items:center"><span style="font-size:10px;color:#7f9c8e">'+a.length+'</span>'
      +'<button type="button" data-dvl-alerts-clear style="font:700 10px system-ui;color:#bcd3e2;background:rgba(145,175,165,.12);border:1px solid rgba(145,175,165,.25);border-radius:7px;padding:3px 8px;cursor:pointer">Limpar</button></span></div>';
    if(!a.length) return head+'<div style="padding:14px 2px;color:#8aa99b;font-size:11px">Nenhum alerta ainda. Ligue os <b>Smart Alerts</b> no DVL Smart Delta (⚙) — inclusive o alerta de confluência — pra os avisos aparecerem aqui com o horário.</div>';
    var rows=a.slice(0,60).map(rowHTML).join("");
    return head+'<div style="max-height:340px;overflow-y:auto">'+rows+'</div>';
  }
  function mount(){
    var page=document.getElementById("dvlCopilotPage0974"); if(!page) return null;
    var el=document.getElementById("dvlAlertsCard");
    if(!el){ el=document.createElement("section"); el.id="dvlAlertsCard"; el.className="dvlCp0976Panel";
      el.style.cssText="margin:10px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(180deg,rgba(10,16,22,.92),rgba(4,8,12,.92));border:1px solid rgba(120,200,255,.16);color:#dcebe4;font:600 12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif";
      var anchor=document.getElementById("dvlVrsiCard");
      if(anchor&&anchor.parentNode){ if(anchor.nextSibling) anchor.parentNode.insertBefore(el,anchor.nextSibling); else anchor.parentNode.appendChild(el); }
      else { var first=page.querySelector(".dvlCp0976Panel:not(#dvlAlertsCard)"); if(first&&first.parentNode) first.parentNode.insertBefore(el,first); else page.insertBefore(el,page.firstChild); }
      el.addEventListener("click",function(ev){ var b=ev.target&&ev.target.closest?ev.target.closest("[data-dvl-alerts-clear]"):null; if(b){ ev.stopPropagation(); if(window.DVL_ALERTS_LOG) window.DVL_ALERTS_LOG.clear(); render(); } });
    }
    return el;
  }
  function render(){ var el=mount(); if(!el) return; el.innerHTML=bodyHTML(); el.style.display="block"; }
  function tick(){ try{ if(isOpen()) render(); }catch(_){} }
  function boot(){ setInterval(tick, 20000); tick();
    try{ window.addEventListener("dvl:alerts-log-update",function(){ if(isOpen()) render(); }); }catch(_){}
    document.addEventListener("click",function(){ setTimeout(tick,200); },true);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
