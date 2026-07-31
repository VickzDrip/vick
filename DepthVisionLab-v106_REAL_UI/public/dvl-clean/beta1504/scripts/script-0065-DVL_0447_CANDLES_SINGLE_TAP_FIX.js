(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function(){
    const wrap = document.getElementById("candleTypeWrap");
    const btn = document.getElementById("candleTypeBtn");
    const menu = document.getElementById("candleTypeMenu");
    const label = document.getElementById("candleTypeLabel");
    const options = Array.from(document.querySelectorAll(".candleTypeOption"));
    if(!wrap || !btn || !menu) return;

    const labels = {
      candles:"Candles",
      hollow:"Hollow",
      heikin:"Heikin Ashi",
      footprint:"Footprint",
      renko:"Renko"
    };

    let lastButtonTap = 0;
    let lastOptionTap = 0;

    function stop(ev){
      if(!ev) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }

    function openMenu(){
      wrap.classList.add("is-open");
      btn.classList.add("is-active");
      btn.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
    }

    function closeMenu(){
      wrap.classList.remove("is-open");
      btn.classList.remove("is-active");
      btn.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
    }

    function toggleMenu(ev){
      stop(ev);

      const now = Date.now();
      if(now - lastButtonTap < 280) return;
      lastButtonTap = now;

      if(wrap.classList.contains("is-open")) closeMenu();
      else openMenu();
    }

    function applyMode(mode, ev){
      stop(ev);

      const now = Date.now();
      if(now - lastOptionTap < 220) return;
      lastOptionTap = now;

      const safe = labels[mode] ? mode : "candles";

      if(typeof window.setCandleMode === "function") window.setCandleMode(safe);
      else {
        try { setCandleMode(safe); } catch(e) {}
      }

      options.forEach(opt => {
        opt.classList.toggle("activeCandleType", opt.dataset.candleMode === safe);
      });

      if(label) label.textContent = labels[safe] || "Candles";
      closeMenu();

      if(typeof window.drawSoon === "function") window.drawSoon();
      else {
        try { drawSoon(); } catch(e) {}
      }
    }

    // Do not toggle on pointerdown; that caused open + immediate close on normal tap.
    btn.onclick = null;
    btn.onpointerdown = null;
    btn.onpointerup = null;
    btn.ontouchend = null;

    btn.addEventListener("pointerup", toggleMenu, true);
    btn.addEventListener("click", function(ev){
      // fallback for browsers without pointer events; dedupe prevents double toggle
      toggleMenu(ev);
    }, true);

    menu.addEventListener("pointerdown", function(ev){
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, true);

    menu.addEventListener("click", function(ev){
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, true);

    options.forEach(opt => {
      opt.onclick = null;
      opt.onpointerdown = null;
      opt.onpointerup = null;
      opt.ontouchend = null;

      const handler = function(ev){
        applyMode(opt.dataset.candleMode || "candles", ev);
      };

      opt.addEventListener("pointerup", handler, true);
      opt.addEventListener("click", handler, true);
    });

    document.addEventListener("pointerup", function(ev){
      if(!wrap.contains(ev.target)) closeMenu();
    }, true);
  });
})();
