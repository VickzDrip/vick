/* script-0297-DVL_REMOVED_INDICATORS_CLEANUP.js
   Remoção de indicadores do produto (Beta 1.633). Os indicadores abaixo foram
   tirados do menu (registry do script-0230). Como os seus ENGINES continuam
   carregados (outros indicadores mantidos dependem deles — ex.: Deep Heatmap lê
   o Bookmap, RSI Exhaustion referencia o ARION), aqui apenas garantimos que eles
   fiquem DESLIGADOS e sem linha no menu legado, para que ninguém que já tivesse
   um deles ligado continue vendo o desenho sem ter como desligar.

   Indicadores removidos: ARION Zone Profile MTF, DVL FVG Firewall,
   DVL FVG Magnet IFVG, Alertas VP (indicador), DVL Smart Delta,
   DVL Bookmap Zones, Liquidity Bands. */
(function(){
  "use strict";
  if(window.__dvlRemovedIndCleanup) return;
  window.__dvlRemovedIndCleanup=true;

  // {apis:[globais possíveis], row:[ids da linha legada]}
  var REMOVED=[
    { apis:["DVLArionZoneProfile"],                                  rows:["dvlArionItem"] },
    { apis:["DVL_FVG_FIREWALL_API"],                                 rows:["dvlFvgFirewallItem"] },
    { apis:["DVLFVGMagnetIFVG"],                                     rows:["dvlFVGMagnetItem"] },
    { apis:["DVL_VP_ALERTS_API"],                                    rows:["dvlVpAlertItem"] },
    { apis:["DVL_SMART_DELTA_ENGINE_API"],                           rows:["dvlSmartDeltaItem"] },
    { apis:["DVL_BOOKMAP_ZONES_0813","DVL_BOOKMAP_ZONES_0812","DVL_BOOKMAP_ZONES_0808"], rows:["dvlBookmapItem","dvlBookmapZonesItem"] },
    { apis:["DVL_LIQ_BANDS_API"],                                    rows:["dvlLiqBandsItem"] }
  ];

  function isOn(api){
    try{
      if(typeof api.isOn==="function") return !!api.isOn();
      if(typeof api.on==="function")   return !!api.on();
      if(api.state && typeof api.state.on!=="undefined") return !!api.state.on;
    }catch(_){}
    return false;
  }
  function sweep(){
    REMOVED.forEach(function(g){
      // 1) desliga o engine (se existir e estiver ligado)
      for(var i=0;i<g.apis.length;i++){
        var api=window[g.apis[i]];
        if(api && typeof api.setOn==="function"){
          try{ if(isOn(api)) api.setOn(false); }catch(_){}
        }
      }
      // 2) remove a linha do menu legado (#indicatorDropdown), se existir
      (g.rows||[]).forEach(function(id){
        var el=document.getElementById(id);
        if(el && el.parentNode) try{ el.parentNode.removeChild(el); }catch(_){}
      });
    });
  }

  // roda algumas vezes: os engines carregam em tempos diferentes e alguns
  // reinserem a própria linha no menu legado após o boot.
  function boot(){
    sweep();
    var n=0, iv=setInterval(function(){ sweep(); if(++n>10) clearInterval(iv); }, 1000);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
