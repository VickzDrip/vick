(function(){
  "use strict";
  function run(){
    try{
      if(window.DVLOpenInterestOscillator){
        /* NÃO ligue o OI no boot. Este módulo era o 2º force-on (o outro estava
           no próprio módulo do OI): ele reativava o DVL AGG OI toda vez que a
           página abria, então desligar nunca segurava. Só atualiza os dados se
           ele JÁ estiver ligado; se você desligou, fica desligado. */
        try{
          if(window.DVLOpenInterestOscillator.on() && typeof window.DVLOpenInterestOscillator.refresh === "function")
            window.DVLOpenInterestOscillator.refresh();
        }catch(_){}
      }
      if(window.DVLDeltaVolume && window.DVLDeltaVolume.on()){
        try{ if(typeof window.DVLDeltaVolume.refresh === "function") window.DVLDeltaVolume.refresh(); }catch(_){}
      }
      if(typeof drawSoon === "function") drawSoon();
    }catch(_){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, {once:true});
  else setTimeout(run, 50);
})();
