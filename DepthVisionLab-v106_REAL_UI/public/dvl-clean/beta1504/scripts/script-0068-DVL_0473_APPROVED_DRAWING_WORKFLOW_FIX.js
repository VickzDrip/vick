(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function moveApprovedControlsIntoChart(){
    const chartWrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
    if(!chartWrap) return;

    const ctxBar = document.getElementById("dvlDrawCtxBar");
    if(ctxBar && ctxBar.parentElement !== chartWrap) chartWrap.appendChild(ctxBar);

    const replayBar = document.getElementById("dvlReplayBar");
    if(replayBar && replayBar.parentElement !== chartWrap) chartWrap.appendChild(replayBar);
  }

  function chartPointFromClient(clientX, clientY){
    const wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
    if(!wrap || !window.S) return null;
    let rect = null;
    try{
      const api = window.DVL_DOM_CROSSHAIR_1205;
      if(api && typeof api.rect === "function") rect = api.rect();
    }catch(_){}
    if(!rect) rect = wrap.getBoundingClientRect();
    const rp = typeof RP === "function" ? RP() : 55;
    const left = typeof PL === "number" ? PL : 0;
    const top = typeof PT === "number" ? PT : 4;
    const bottomPad = typeof PB === "number" ? PB : 24;
    const x = clamp(clientX - rect.left, left, rect.width - rp);
    const y = clamp(clientY - rect.top, top, rect.height - bottomPad);
    return { x, y };
  }

  function approvedToolIsActive(){
    if(!window.S) return false;
    return !!(
      S.drawingToolActive ||
      S._posDraft ||
      S.tool === "ruler" ||
      S.tool === "long" ||
      S.tool === "short"
    );
  }

  let lastApprovedX = NaN;
  let lastApprovedY = NaN;
  let lastPreviewDrawAt = 0;
  let previewDrawTimer = 0;
  const PREVIEW_DRAW_GAP = 1000 / 30;

  function requestApprovedPreviewDraw(){
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const wait = PREVIEW_DRAW_GAP - (now - lastPreviewDrawAt);
    if(wait <= 0){
      lastPreviewDrawAt = now;
      if(previewDrawTimer){ clearTimeout(previewDrawTimer); previewDrawTimer = 0; }
      if(typeof drawSoon === "function") drawSoon();
      return;
    }
    if(previewDrawTimer) return;
    previewDrawTimer = setTimeout(function(){
      previewDrawTimer = 0;
      lastPreviewDrawAt = (window.performance && performance.now) ? performance.now() : Date.now();
      if(typeof drawSoon === "function") drawSoon();
    }, Math.max(0, wait));
  }

  window.DVL_APPROVED_DRAWING_HOVER_1205 = function(clientX, clientY){
    if(!approvedToolIsActive()) return false;
    const p = chartPointFromClient(clientX, clientY);
    if(!p) return false;
    const x = Math.round(p.x * 2) / 2;
    const y = Math.round(p.y * 2) / 2;
    if(x === lastApprovedX && y === lastApprovedY) return true;
    lastApprovedX = x;
    lastApprovedY = y;
    S._cross = { cx:x, cy:y };
    requestApprovedPreviewDraw();
    return true;
  };

  function syncCtxBarVisibility(){
    const bar = document.getElementById("dvlDrawCtxBar");
    if(!bar || !window.S) return;
    const hasSelected = !!S.selectedDrawing;
    bar.style.display = hasSelected ? "flex" : "none";
  }

  function init(){
    moveApprovedControlsIntoChart();

    const deleteBtn = document.getElementById("dvlDrawDelete");
    if(deleteBtn){
      deleteBtn.setAttribute("title", "Delete selected drawing");
      deleteBtn.setAttribute("aria-label", "Delete selected drawing");
    }

    const settingsBtn = document.getElementById("dvlDrawSettingsBtn");
    if(settingsBtn){
      settingsBtn.setAttribute("title", "Drawing settings");
      settingsBtn.setAttribute("aria-label", "Drawing settings");
    }

    ["pointerup","click","keyup"].forEach(function(type){
      document.addEventListener(type, syncCtxBarVisibility, true);
    });
    window.addEventListener("dvl:drawing-selection-change", syncCtxBarVisibility, true);
    setTimeout(syncCtxBarVisibility, 300);
  }

  ready(init);
})();
