(function(){
  'use strict';
  var LS='DVL_BOOKMAP_ZONES_0808';
  var DEFAULTS={on:false,source:'futures',depth:100,sensitivity:'medium',maxZones:10,heightPx:7,labels:true,glow:true,maxDistATR:true,atrDistance:5,opacity:0.52};
  var panel=null;
  function bm(){ return window.DVL_BOOKMAP_ZONES_0813 || window.DVL_BOOKMAP_ZONES_0812 || window.DVL_BOOKMAP_ZONES_0808 || null; }
  function st(){ var a=bm(); return (a && (a.settings || a.state)) || Object.assign({},DEFAULTS); }
  function saveState(s){ try{ localStorage.setItem(LS, JSON.stringify(s)); }catch(_){} }
  function drawSoonSafe(){ try{ if(typeof window.drawSoon==='function') window.drawSoon(); }catch(_){} }
  function setVal(k,v){ var a=bm(); if(a && typeof a.set==='function') a.set(k,v); else { var s=Object.assign({},st()); s[k]=v; saveState(s); drawSoonSafe(); } }
  function setOn(v){ var a=bm(); if(a && typeof a.setOn==='function') a.setOn(!!v); else { var s=Object.assign({},st()); s.on=!!v; saveState(s); drawSoonSafe(); } }
  function reset(){ var a=bm(); Object.keys(DEFAULTS).forEach(function(k){ if(k==='on') setOn(DEFAULTS.on); else setVal(k, DEFAULTS[k]); }); render(); }
  function close(){ if(panel) panel.classList.remove('is-open'); }
  function choice(k,v,label){ var s=st(); return '<button class="dvl-bm94-choice '+(String(s[k])===String(v)?'is-active':'')+'" type="button" data-bm94-set="'+k+'" data-bm94-val="'+v+'">'+label+'</button>'; }
  function tog(k){ var s=st(); return '<button class="dvl-bm94-toggle '+(s[k]?'is-on':'')+'" type="button" data-bm94-toggle="'+k+'">'+(s[k]?'ON':'OFF')+'</button>'; }
  function step(k,min,max,inc,suf){ var s=st(), val=Number(s[k]); if(!Number.isFinite(val)) val=Number(DEFAULTS[k])||0; var txt = Math.abs(inc)<1 ? Number(val).toFixed(2).replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1') : String(Math.round(val)); return '<div class="dvl-bm94-step" data-bm94-step="'+k+'" data-min="'+min+'" data-max="'+max+'" data-step="'+inc+'"><button type="button" data-dir="-1">−</button><span>'+txt+(suf||'')+'</span><button type="button" data-dir="1">+</button></div>'; }
  function field(lbl, body, full){ return '<div class="dvl-bm94-field '+(full?'full':'')+'"><label>'+lbl+'</label>'+body+'</div>'; }
  function section(title, body, note){ return '<div class="dvl-bm94-section"><h4>'+title+'</h4><div class="dvl-bm94-grid">'+body+'</div>'+(note?'<div class="dvl-bm94-note">'+note+'</div>':'')+'</div>'; }
  function ensure(){
    if(panel) return panel;
    panel=document.createElement('div');
    panel.id='dvlBookmapPanel0942';
    panel.className='dvl-bm94-panel';
    panel.setAttribute('data-dvl-ui','true');
    document.body.appendChild(panel);
    panel.addEventListener('click', function(ev){
      var t=ev.target;
      var c=t.closest && t.closest('[data-bm94-close]');
      var r=t.closest && t.closest('[data-bm94-reset]');
      var set=t.closest && t.closest('[data-bm94-set]');
      var tg=t.closest && t.closest('[data-bm94-toggle]');
      var stepBox=t.closest && t.closest('[data-bm94-step]');
      var dir=t.closest && t.closest('[data-dir]');
      if(c||r||set||tg||(stepBox&&dir)){
        ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
      if(c){ close(); return; }
      if(r){ reset(); return; }
      if(set){ var k=set.getAttribute('data-bm94-set'); var v=set.getAttribute('data-bm94-val'); if(['depth','maxZones','heightPx'].indexOf(k)>=0) v=Number(v); setVal(k,v); render(); return; }
      if(tg){ var k2=tg.getAttribute('data-bm94-toggle'); var s=st(); if(k2==='on') setOn(!s.on); else setVal(k2, !s[k2]); render(); return; }
      if(stepBox && dir){ var k3=stepBox.getAttribute('data-bm94-step'); var min=Number(stepBox.getAttribute('data-min')); var max=Number(stepBox.getAttribute('data-max')); var inc=Number(stepBox.getAttribute('data-step')); var cur=Number(st()[k3]); if(!Number.isFinite(cur)) cur=Number(DEFAULTS[k3])||0; var next=cur + Number(dir.getAttribute('data-dir'))*inc; next=Math.max(min, Math.min(max, next)); setVal(k3, Number(next.toFixed(3))); render(); return; }
    }, true);
    panel.addEventListener('pointerdown', function(ev){ ev.stopPropagation(); }, true);
    return panel;
  }
  function render(){
    var p=ensure(), body='';
    body += '<div class="dvl-bm94-head"><div class="dvl-bm94-icon">BM</div><div class="dvl-bm94-title"><b>DVL Bookmap Zones</b><small>Order book heatmap · Bookmap style</small></div><button class="dvl-bm94-hbtn reset" type="button" data-bm94-reset aria-label="Reset">↻</button><button class="dvl-bm94-hbtn close" type="button" data-bm94-close aria-label="Fechar">×</button></div>';
    body += '<div class="dvl-bm94-body">';
    body += section('General',
      field('Indicator', tog('on'))+
      field('Source','<div class="dvl-bm94-choices">'+choice('source','futures','Futures')+choice('source','spot','Spot')+'</div>')+
      field('Depth','<div class="dvl-bm94-choices three">'+choice('depth',20,'20')+choice('depth',100,'100')+choice('depth',500,'500')+'</div>')+
      field('Sensitivity','<div class="dvl-bm94-choices three">'+choice('sensitivity','low','Baixa')+choice('sensitivity','medium','Média')+choice('sensitivity','high','Alta')+'</div>')
    );
    body += section('Visual',
      field('Max Zones', step('maxZones',2,24,1))+
      field('Height', step('heightPx',3,18,1,'px'))+
      field('Labels', tog('labels'))+
      field('Glow', tog('glow'))+
      field('ATR limiter', tog('maxDistATR'))+
      field('ATR Distance', step('atrDistance',1,20,1,'x'))+
      field('Opacity', step('opacity',0.15,0.85,0.05), true),
      'Bookmap ON desenha zonas reais atrás dos candles.'
    );
    body += '</div>';
    p.innerHTML=body;
  }
  function open(){ render(); ensure().classList.add('is-open'); }
  function overrideApi(){
    var a=bm(); if(!a) return false;
    a.openPanel=open; a.open=open;
    try{ window.DVL_BOOKMAP_ZONES_0813=a; window.DVL_BOOKMAP_ZONES_0812=a; window.DVL_BOOKMAP_ZONES_0808=a; }catch(_){ }
    return true;
  }
  document.addEventListener('click', function(ev){
    var row = ev.target && ev.target.closest ? ev.target.closest('[data-ind-key="bookmap"]') : null;
    if(row){
      var toggle = ev.target.closest('[data-ind-toggle]');
      var fav = ev.target.closest('[data-ind-fav]');
      var sec = ev.target.closest('[data-ind-section]');
      if(!toggle && !fav && !sec){
        ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        open();
        return;
      }
    }
  }, true);
  function boot(){ overrideApi(); setTimeout(overrideApi, 250); setTimeout(overrideApi, 1200); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  window.DVL_BOOKMAP_FLOATING_STANDARD_0942={open:open,close:close,render:render,overrideApi:overrideApi,version:'0.942'};
})();
