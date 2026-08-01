/* ── Auto-update guard ──────────────────────────────────────────────
   The single index.html is served no-store, but a long-lived tab or an
   installed PWA (manifest display:standalone) keeps the ALREADY-LOADED
   page in memory across visits (back/forward cache / app resume) and
   never refetches — so a fresh deploy goes unseen until a manual hard
   refresh. That's why the app "shows an old version when it updates".

   Fix: poll the server's /api/version, which reports the version of the
   CURRENTLY DEPLOYED index.html (re-read server-side every 15s). When it
   no longer matches the version THIS page booted with, a newer build is
   live, so we pull it in.
     - Checks 8s after boot, every 60s, and whenever the tab/app regains
       focus (the moment that matters most on mobile PWAs resuming from
       memory).
     - Never yanks the page from under an active user: while the tab is
       visible it shows a tap-to-update banner; it only auto-reloads when
       the tab is hidden/backgrounded, so no click is lost mid-trade.
     - reload() defeats the bfcache and the no-store header defeats the
       HTTP cache, so the next load is the real file.
     - Loop guard (sessionStorage): auto-reloads AT MOST ONCE per new
       deployed version. If we reload for version X and still don't come
       back as X (e.g. a stubborn upstream/CDN cache serving stale HTML),
       we stop auto-reloading and only offer the manual banner — never an
       infinite reload loop. */
(function(){
  if(window.__DVL_VER_GUARD) return; window.__DVL_VER_GUARD = true;
  // RUNNING é lido TARDE (no 1º check), não na carga do script: a versão
  // autoritativa é setada por um <script> inline mais ABAIXO no index.html, então
  // ler window.DVL_APP_VERSION agora pegaria um valor provisório antigo (ex.: o
  // hardcode do script-0003) e o banner "Nova versão" ficaria aparecendo pra
  // sempre / reaparecendo após atualizar.
  var RUNNING = "";
  var pending = null, banner = null, reloading = false, autoBlocked = false;
  var LAST_TRIED = null;
  try { LAST_TRIED = sessionStorage.getItem("dvlUpdTo"); } catch(_){}

  function doReload(){
    if(reloading) return; reloading = true;
    try { if(pending) sessionStorage.setItem("dvlUpdTo", pending); } catch(_){}
    try { location.reload(); } catch(_){ location.href = location.pathname + "?v=" + Date.now(); }
  }
  function showBanner(v){
    if(banner) return;
    banner = document.createElement("div");
    banner.id = "dvlUpdateBanner";
    banner.setAttribute("role","button");
    banner.textContent = "Nova versão (" + v + ") — toque para atualizar";
    banner.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);"
      + "transform:translateX(-50%);z-index:2147483647;background:#0d6b3f;color:#eafff2;"
      + "font:600 13px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;padding:10px 16px;"
      + "border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.45);cursor:pointer;max-width:92vw;"
      + "text-align:center;border:1px solid #12a862;";
    banner.addEventListener("click", doReload);
    (document.body || document.documentElement).appendChild(banner);
  }
  function onNewVersion(v){
    pending = v;
    if(LAST_TRIED === v){ autoBlocked = true; showBanner(v); return; } // already tried; don't loop
    if(document.hidden){ doReload(); return; }
    showBanner(v);
  }
  /* "Beta 1.155" → 100155, pra comparar versão como NÚMERO (major*1e5 + minor),
     não string. Assim "1.16" (minor 16) NÃO é tratado como maior que "1.155". */
  function verNum(s){
    var m = String(s || "").match(/(\d+)\s*\.\s*(\d+)/);
    return m ? (parseInt(m[1], 10) * 100000 + parseInt(m[2], 10)) : NaN;
  }
  function check(){
    if(!RUNNING){ RUNNING = String(window.DVL_APP_VERSION || "").trim(); }
    if(!RUNNING) return;
    fetch("/api/version", { cache: "no-store" })
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .then(function(j){
        if(!j || !j.v) return;
        var deployed = String(j.v).trim();
        if(!deployed || deployed === RUNNING) return;
        /* Só avisa pra ir PRA FRENTE. Se o servidor estiver momentaneamente
           servindo um arquivo mais ANTIGO (deploy no meio, rollback, ou os dois
           caminhos servidos fora de sincronia), NÃO fica pedindo pra rebaixar —
           era exatamente o "fica pedindo pra atualizar pra versão anterior". */
        var dn = verNum(deployed), rn = verNum(RUNNING);
        if(isFinite(dn) && isFinite(rn) && dn <= rn) return;
        onNewVersion(deployed);
      })
      .catch(function(){});
  }

  document.addEventListener("visibilitychange", function(){
    if(document.hidden){ if(pending && !autoBlocked) doReload(); }
    else { check(); }
  });
  window.addEventListener("focus", check);
  setTimeout(check, 8000);
  setInterval(check, 60000);
})();
