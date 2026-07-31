(function(){
  "use strict";

  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function toast(msg){
    try{
      if(typeof showToast === "function"){
        showToast(msg);
        return;
      }
    }catch(_){}

    const el = document.getElementById("toast");
    if(el){
      el.textContent = msg;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 1800);
    }
  }

  function clickHidden(id){
    const b = document.getElementById(id);
    if(b && typeof b.click === "function"){
      b.click();
      return true;
    }
    return false;
  }

  function saveProfile(){
    const btn = document.getElementById("profileSaveBtn");
    try{ btn && btn.classList.add("is-saving"); }catch(_){}

    try{
      const local = {};
      /* NÃO incluir no snapshot as PRÓPRIAS chaves de snapshot/backup: o regex
         abaixo casa com "DVL_..." e, sem esta exclusão, cada save embutia o
         snapshot anterior dentro do novo → o snapshot ~dobrava de tamanho a cada
         save até estourar a cota do localStorage → setItem lançava QuotaExceeded
         → "Erro ao salvar". (A restauração já pulava essas chaves; o save não.) */
      const SKIP_KEYS = { DVL_USER_PROFILE_SNAPSHOT:1, DVL_USER_PROFILE_LAST_SAVE:1, DVL_PROFILE_DRAWINGS_BACKUP:1 };
      for(let i=0; i<localStorage.length; i++){
        const k = localStorage.key(i);
        if(!k || SKIP_KEYS[k]) continue;

        /*
          Save site-specific settings and drawings.
          Keep this profile snapshot focused on DVL/local platform data.
        */
        if(/^DVL|^dvl|^tv_|^paper|^binance|^chart/i.test(k)){
          local[k] = localStorage.getItem(k);
        }
      }

      const snapshot = {
        savedAt:new Date().toISOString(),
        version:(typeof DVL_APP_VERSION !== "undefined" ? DVL_APP_VERSION : "Beta 0.577"),
        symbol:(typeof symbol !== "undefined" ? symbol : null),
        interval:(typeof interval !== "undefined" ? interval : null),
        chart:{
          viewCount:(typeof chartViewCount !== "undefined" ? chartViewCount : null),
          offset:(typeof chartOffsetCandles !== "undefined" ? chartOffsetCandles : null),
          priceCenter:(typeof priceViewCenter !== "undefined" ? priceViewCenter : null),
          priceRange:(typeof priceViewRange !== "undefined" ? priceViewRange : null)
        },
        drawings:(window.S && Array.isArray(S.drawings)) ? S.drawings : [],
        favoriteTools:(function(){
          try{ return JSON.parse(localStorage.getItem("DVL_FAVORITE_DRAW_TOOLS") || "[]"); }catch(_){ return []; }
        })(),
        localStorage:local
      };

      /* Libera o snapshot antigo ANTES de gravar o novo (dá espaço) e, se ainda
         estourar a cota, cai pra um snapshot "lite" sem o blob de localStorage —
         assim drawings/chart/versão continuam salvos e o save nunca falha. */
      try{ localStorage.removeItem("DVL_USER_PROFILE_SNAPSHOT"); }catch(_){}
      try{
        localStorage.setItem("DVL_USER_PROFILE_SNAPSHOT", JSON.stringify(snapshot));
      }catch(_quota){
        const lite = Object.assign({}, snapshot, { localStorage:{}, _lite:true });
        localStorage.setItem("DVL_USER_PROFILE_SNAPSHOT", JSON.stringify(lite));
      }
      localStorage.setItem("DVL_USER_PROFILE_LAST_SAVE", snapshot.savedAt);

      if(window.S && Array.isArray(S.drawings)){
        try{ localStorage.setItem("DVL_PROFILE_DRAWINGS_BACKUP", JSON.stringify(S.drawings)); }catch(_){}
      }

      if(typeof window.__dvlSave === "function") window.__dvlSave();
      else clickHidden("tbSaveBtn");

      toast("Sessão salva ✓");
    }catch(err){
      console.warn(err);
      toast("Erro ao salvar a sessão");
    }finally{
      setTimeout(() => {
        try{ btn && btn.classList.remove("is-saving"); }catch(_){}
      }, 380);
    }
  }

  function undo(){
    if(typeof window.__dvlUndo === "function") window.__dvlUndo();
    else clickHidden("tbUndoBtn");
  }

  function redo(){
    if(typeof window.__dvlRedo === "function") window.__dvlRedo();
    else clickHidden("tbRedoBtn");
  }

  /* Expor saveProfile: o botão "Salvar" do cabeçalho novo (dvl1b_saveBtn) é
     ligado em outro script que chama window.saveProfile — mas saveProfile vive
     dentro deste IIFE e nunca era exposto, então o clique não fazia NADA (nem
     salvava, nem mostrava mensagem). */
  try{ window.saveProfile = saveProfile; }catch(_){}

  ready(function(){
    const profile = document.getElementById("profileSaveBtn");
    const undoBtn = document.getElementById("dvlChartUndoBtn");
    const redoBtn = document.getElementById("dvlChartRedoBtn");

    if(profile && !profile.dataset.dvl575Bound){
      profile.dataset.dvl575Bound = "1";
      profile.addEventListener("click", saveProfile);
    }

    if(undoBtn && !undoBtn.dataset.dvl575Bound){
      undoBtn.dataset.dvl575Bound = "1";
      undoBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        undo();
      });
    }

    if(redoBtn && !redoBtn.dataset.dvl575Bound){
      redoBtn.dataset.dvl575Bound = "1";
      redoBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        redo();
      });
    }
  });
})();
