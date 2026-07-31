/* ── Alertas VP (Telegram) — vigiados no BACKEND ───────────────────────────
   Painel de configuração de um motor que roda no servidor (vpAlerts.js): calcula
   o Volume Profile de 1m (hoje → POC/VAH/VAL, dia anterior → OPOC/OVAH/OVAL),
   acompanha o preço ao vivo e dispara no Telegram quando o preço chega perto de
   QUALQUER linha, independente de qual seja. Como roda no backend, funciona mesmo
   com o app fechado. Aqui é só a UI: liga/desliga, símbolo, credenciais do Telegram,
   sensibilidade e cooldown; o estado real vem de /api/dvl/vpalerts/status. */
(function(){
  "use strict";
  if(window.__DVL_VP_ALERTS_ON) return; window.__DVL_VP_ALERTS_ON=true;

  function gsym(){ try{ if(typeof symbol!=="undefined"&&symbol) return String(symbol).toUpperCase(); }catch(_){} try{ if(window.ticker&&window.ticker.symbol) return String(window.ticker.symbol).toUpperCase(); }catch(_){} return "BTCUSDT"; }
  function api(p){ try{ var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023; if(br&&typeof br.api==="function") return br.api(p); }catch(_){} return p; }
  function getStatus(){ return fetch(api("/api/dvl/vpalerts/status"),{cache:"no-store"}).then(function(r){return r.json();}).catch(function(){return {ok:false,error:"sem conexão com o backend"};}); }
  function postCfg(body){ return fetch(api("/api/dvl/vpalerts/config"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}).then(function(r){return r.json();}).catch(function(e){return {ok:false,error:String(e)};}); }
  function postTest(body){ return fetch(api("/api/dvl/vpalerts/test"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}).then(function(r){return r.json();}).catch(function(e){return {ok:false,error:String(e)};}); }
  function postDiscover(body){ return fetch(api("/api/dvl/vpalerts/discover"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}).then(function(r){return r.json();}).catch(function(e){return {ok:false,error:String(e)};}); }

  var last={ enabled:false };   // último status conhecido (p/ o pill do menu)
  function updateItem(){ var el=document.getElementById("dvlVpAlertState"); if(el){ el.textContent=last.enabled?"ON":"OFF"; el.classList.toggle("is-on",!!last.enabled); } }

  window.DVL_VP_ALERTS_API={
    isOn:function(){ return !!last.enabled; },
    on:function(){ return !!last.enabled; },
    setOn:function(v){ var want=(v===undefined?!last.enabled:!!v);
      if(want){ openPanel(); postCfg({enabled:true,symbol:gsym()}).then(function(r){ if(r&&r.config){ last.enabled=r.config.enabled; } updateItem(); refresh(); }); }
      else { postCfg({enabled:false}).then(function(r){ if(r&&r.config){ last.enabled=r.config.enabled; } updateItem(); refresh(); }); }
    },
    openPanel:function(){ openPanel(); }, open:function(){ openPanel(); }
  };

  var panel=null, pollT=0;

  function fmt(p){ p=+p; if(!isFinite(p)) return "?"; if(p>=1000) return p.toLocaleString("pt-BR",{maximumFractionDigits:1}); if(p>=1) return p.toFixed(2); return p.toPrecision(4); }
  function seg(label,key,cur,opts){ return '<div class="dvl-bb-field"><label>'+label+'</label><div class="dvl-bb-seg">'
    +opts.map(function(o){ return '<button type="button" data-alseg="'+key+'" data-val="'+o[0]+'" class="'+(String(cur)===String(o[0])?"is-on":"")+'">'+o[1]+'</button>'; }).join("")+'</div></div>'; }
  function sw(label,key,val){ return '<div class="dvl-bb-field"><label>'+label+'</label><label class="dvl-switch"><input type="checkbox" data-alsw="'+key+'" '+(val?"checked":"")+'><i></i><b></b></label></div>'; }
  function num(label,key,val,min,max,step){ return '<div class="dvl-bb-field"><label>'+label+'</label><input class="dvl-bb-num" type="number" data-alnum="'+key+'" value="'+val+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'"></div>'; }
  function txt(label,key,val,ph,pw){ return '<div class="dvl-bb-field" style="flex-direction:column;align-items:stretch;gap:4px"><label>'+label+'</label><input class="dvl-bb-num" style="width:100%" type="'+(pw?"password":"text")+'" data-altxt="'+key+'" value="'+(val||"")+'" placeholder="'+(ph||"")+'"></div>'; }

  function statusHTML(s){
    if(!s||s.ok===false) return '<span style="color:#ff6b6b">backend indisponível'+(s&&s.error?" — "+s.error:"")+'</span>';
    var out="";
    if(!s.enabled) out+='<span style="color:#f4b942">desligado — ligue no interruptor acima</span><br>';
    else if(!s.hasCreds) out+='<span style="color:#f4b942">ligado, mas o Telegram não está configurado</span> (preencha token + chat id e toque em Testar)<br>';
    else out+='<span style="color:#16c784">ligado e vigiando '+ (s.symbol||"") +'</span>'+(s.lastPrice?(' · preço '+fmt(s.lastPrice)):"")+'<br>';
    if(s.levels&&s.levels.length){
      out+='<div style="margin-top:4px;color:#9fb3c8">';
      out+=s.levels.map(function(l){ return (l.near?'<b style="color:#35e0ff">● ':'○ ')+l.name+'</b> '+fmt(l.price)+'<small style="color:#7f9c8e"> ('+l.group+')</small>'; }).join(' · ');
      out+='</div>';
    } else if(s.enabled) out+='<div style="color:#7f9c8e;margin-top:4px">calculando níveis do VP de 1m…</div>';
    if(s.lastNotice){ var d=new Date(s.lastNotice.at); var hh=("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
      out+='<div style="margin-top:5px;color:'+(s.lastNotice.sent?"#16c784":"#ff6b6b")+'">último: '+hh+' '+s.lastNotice.name+' '+(s.lastNotice.sent?"enviado":("falhou — "+(s.lastNotice.err||"?")))+'</div>'; }
    if(s.lastError) out+='<div style="margin-top:3px;color:#ff9b6b;font-size:9.5px">'+s.lastError+'</div>';
    return out;
  }

  function bodyHTML(s){
    s=s||{};
    return '<div class="dvl-bb-field" style="border-bottom:1px solid rgba(129,166,151,.16);padding-bottom:8px"><label>Alertas ligados</label><label class="dvl-switch"><input type="checkbox" data-alpower '+(s.enabled?"checked":"")+'><i></i><b></b></label></div>'
      +'<div style="font-size:10.5px;margin:2px 0 8px" id="dvlVpAlertStatus">'+statusHTML(s)+'</div>'
      +'<div class="dvl-bb-field"><label>Símbolo</label><div style="display:flex;gap:6px;align-items:center"><input class="dvl-bb-num" style="width:96px" type="text" data-altxt="symbol" value="'+(s.symbol||gsym())+'"><button type="button" class="dvl-vt-close" data-aluse style="font-size:11px;width:auto;padding:0 8px">usar atual</button></div></div>'
      +seg("Sensibilidade","sensitivity",s.sensitivity||"media",[["baixa","Baixa"],["media","Média"],["alta","Alta"]])
      +'<div style="font-size:9.5px;color:#7f9c8e;margin:-4px 0 6px">Baixa = só avisa bem perto · Alta = avisa de mais longe (banda adaptada ao ATR do 1m)</div>'
      +num("Cooldown por linha (min)","cooldownMin",s.cooldownMin||20,1,240,1)
      +sw("Hoje: POC / VAH / VAL","watchToday",s.watchToday!==false)
      +sw("Dia anterior: OPOC / OVAH / OVAL","watchPrevDay",s.watchPrevDay!==false)
      +'<div style="border-top:1px solid rgba(129,166,151,.16);margin-top:8px;padding-top:8px">'
      +txt("Telegram — Bot Token","tgToken","","cole aqui (fica só no servidor)",true)
      +txt("Telegram — Chat ID","tgChatId","","ex: 123456789")
      +'<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button type="button" class="dvl-vt-close" data-aldiscover style="font-size:11px;width:auto;padding:3px 10px;background:rgba(180,150,255,.16)">Descobrir chat id</button><button type="button" class="dvl-vt-close" data-altest style="font-size:11px;width:auto;padding:3px 10px;background:rgba(53,224,255,.14)">Testar envio</button><span id="dvlVpAlertTestMsg" style="font-size:10px;align-self:center;color:#7f9c8e"></span></div>'
      +'<div style="font-size:9.5px;color:#7f9c8e;margin-top:6px;line-height:1.5">Como obter: 1) no Telegram fale com <b>@BotFather</b> → /newbot → copie o <b>token</b>. 2) mande <b>/start</b> pro seu bot. 3) cole o token acima e toque em <b>Descobrir chat id</b> (pego sozinho). Ou pegue o id manualmente no <b>@userinfobot</b>.</div>'
      +'</div>';
  }

  function renderPanel(s){ if(!panel) return; var b=panel.querySelector("#dvlVpAlertBody"); if(!b) return; b.innerHTML=bodyHTML(s); bind(b); }
  function refreshStatusOnly(){ if(!panel||!panel.classList.contains("is-open")) return; getStatus().then(function(s){ last.enabled=!!(s&&s.enabled); updateItem(); var el=panel&&panel.querySelector("#dvlVpAlertStatus"); if(el) el.innerHTML=statusHTML(s); }); }

  function bind(b){
    var pw=b.querySelector("[data-alpower]"); if(pw) pw.addEventListener("change",function(){ postCfg({enabled:pw.checked, symbol:b.querySelector('[data-altxt="symbol"]').value}).then(function(r){ if(r&&r.config) last.enabled=r.config.enabled; updateItem(); refresh(); }); });
    b.querySelectorAll("[data-alseg]").forEach(function(el){ el.addEventListener("click",function(){ var o={}; o[el.getAttribute("data-alseg")]=el.getAttribute("data-val"); postCfg(o).then(refresh); }); });
    b.querySelectorAll("[data-alsw]").forEach(function(el){ el.addEventListener("change",function(){ var o={}; o[el.getAttribute("data-alsw")]=el.checked; postCfg(o).then(refresh); }); });
    b.querySelectorAll("[data-alnum]").forEach(function(el){ el.addEventListener("change",function(){ var o={}; o[el.getAttribute("data-alnum")]=Number(el.value)||0; postCfg(o); }); });
    b.querySelectorAll('[data-altxt="symbol"]').forEach(function(el){ el.addEventListener("change",function(){ postCfg({symbol:el.value}).then(refresh); }); });
    var use=b.querySelector("[data-aluse]"); if(use) use.addEventListener("click",function(){ var el=b.querySelector('[data-altxt="symbol"]'); if(el){ el.value=gsym(); postCfg({symbol:el.value}).then(refresh); } });
    var test=b.querySelector("[data-altest]"); if(test) test.addEventListener("click",function(){
      var tok=b.querySelector('[data-altxt="tgToken"]').value, cid=b.querySelector('[data-altxt="tgChatId"]').value;
      var msg=b.querySelector("#dvlVpAlertTestMsg"); if(msg){ msg.style.color="#7f9c8e"; msg.textContent="enviando…"; }
      postTest({tgToken:tok, tgChatId:cid}).then(function(r){ if(msg){ msg.style.color=r&&r.ok?"#16c784":"#ff6b6b"; msg.textContent=r&&r.ok?"enviado! confira o Telegram":("falhou — "+(r&&r.error||"?")); } });
    });
    var disc=b.querySelector("[data-aldiscover]"); if(disc) disc.addEventListener("click",function(){
      var tok=b.querySelector('[data-altxt="tgToken"]').value;
      var msg=b.querySelector("#dvlVpAlertTestMsg"); if(msg){ msg.style.color="#7f9c8e"; msg.textContent="procurando…"; }
      postDiscover({tgToken:tok}).then(function(r){ if(!msg) return;
        if(r&&r.ok){ msg.style.color="#16c784"; msg.textContent="achei: "+(r.name||r.chatId)+" — configurado!"; var ci=b.querySelector('[data-altxt="tgChatId"]'); if(ci) ci.value=r.chatId; refresh(); }
        else { msg.style.color="#ff6b6b"; msg.textContent="não achei — mande /start pro bot e tente de novo"+(r&&r.error?(" ("+r.error+")"):""); }
      });
    });
  }

  function refresh(){ getStatus().then(function(s){ last.enabled=!!(s&&s.enabled); updateItem(); renderPanel(s); }); }

  function openPanel(){
    if(!panel){ panel=document.createElement("div"); panel.id="dvlVpAlertPanel"; panel.className="dvl-vt-panel dvl-bb-panel";
      panel.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>Alertas VP</b><small>POC/VAH/VAL 1m · Telegram</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlVpAlertClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlVpAlertBody"></div>';
      document.body.appendChild(panel);
      panel.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
      panel.querySelector("#dvlVpAlertClose").addEventListener("click",function(){ panel.classList.remove("is-open"); clearInterval(pollT); });
    }
    refresh();
    panel.classList.add("is-open");
    clearInterval(pollT); pollT=setInterval(refreshStatusOnly,3000);
  }

  function boot(){ getStatus().then(function(s){ last.enabled=!!(s&&s.enabled); updateItem(); }); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
