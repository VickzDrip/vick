(function(){
  "use strict";

  const RULE = "DVL_INDICATOR_CONTROLS_RULE: no native dropdowns or native numeric keyboards in indicator config panels.";

  const paletteColors = [
    "#13dc8d", "#ff4a61", "#18d7ff", "#f3c768",
    "#8f7cff", "#ff9f43", "#ffffff", "#7f91a7",
    "#00d68f", "#ff3355", "#00b8ff", "#ffc857"
  ];

  let menu = null;
  let keypad = null;
  let keypadTarget = null;
  let keypadValue = "";
  let palette = null;
  let paletteTarget = null;

  function closeMenu(){
    if(menu) menu.classList.remove("is-open");
  }

  function closePalette(){
    if(palette) palette.classList.remove("is-open");
    paletteTarget = null;
  }

  function fire(el){
    try{
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
    }catch(_){}
  }

  function ensureMenu(){
    if(menu) return menu;
    menu = document.createElement("div");
    menu.className = "dvl-custom-menu";
    document.body.appendChild(menu);
    menu.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    return menu;
  }

  function positionBox(box, anchor, width){
    const r = anchor.getBoundingClientRect();
    const w = width || Math.max(96, Math.min(190, r.width));
    const left = Math.max(5, Math.min(window.innerWidth - w - 5, r.left));
    const below = r.bottom + 4;
    const above = r.top - 220;
    box.style.width = w + "px";
    box.style.left = left + "px";
    box.style.top = ((below + 180 < window.innerHeight) ? below : Math.max(8, above)) + "px";
  }

  function upgradeSelect(select){
    if(!select || select.dataset.dvlCustomSelect === "1") return;
    select.dataset.dvlCustomSelect = "1";
    select.tabIndex = -1;

    const wrap = document.createElement("div");
    wrap.className = "dvl-custom-select-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dvl-custom-select-btn";
    btn.innerHTML = "<span></span>";
    const label = btn.querySelector("span");

    function syncLabel(){
      const opt = select.options[select.selectedIndex];
      label.textContent = opt ? opt.textContent : select.value;
    }
    syncLabel();

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    wrap.appendChild(btn);

    select.addEventListener("change", syncLabel);
    select.addEventListener("input", syncLabel);

    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      closePalette();
      const m = ensureMenu();

      if(m.classList.contains("is-open") && m.dataset.forId === (select.id || "")){
        closeMenu();
        return;
      }

      m.dataset.forId = select.id || "";
      m.innerHTML = "";

      Array.from(select.options).forEach(opt => {
        const item = document.createElement("div");
        item.className = "dvl-custom-option" + (opt.value === select.value ? " is-selected" : "");
        item.textContent = opt.textContent;
        item.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          select.value = opt.value;
          syncLabel();
          fire(select);
          closeMenu();
        });
        m.appendChild(item);
      });

      positionBox(m, btn, Math.max(104, btn.getBoundingClientRect().width));
      m.classList.add("is-open");
    });
  }

  function ensureKeypad(){
    if(keypad) return keypad;

    keypad = document.createElement("div");
    keypad.className = "dvl-keypad";
    keypad.innerHTML = `
      <div class="dvl-keypad-display" id="dvlKeypadDisplay">0</div>
      <div class="dvl-keypad-grid">
        <button type="button" data-k="1">1</button>
        <button type="button" data-k="2">2</button>
        <button type="button" data-k="3">3</button>
        <button type="button" data-k="4">4</button>
        <button type="button" data-k="5">5</button>
        <button type="button" data-k="6">6</button>
        <button type="button" data-k="7">7</button>
        <button type="button" data-k="8">8</button>
        <button type="button" data-k="9">9</button>
        <button type="button" data-k=".">.</button>
        <button type="button" data-k="0">0</button>
        <button type="button" data-k="back">⌫</button>
        <button type="button" class="danger" data-k="clear">CLR</button>
        <button type="button" data-k="cancel">Cancel</button>
        <button type="button" class="ok" data-k="ok">OK</button>
      </div>
    `;
    document.body.appendChild(keypad);

    keypad.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    keypad.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-k]");
      if(!b) return;
      const k = b.dataset.k;

      if(k === "cancel"){
        closeKeypad();
        return;
      }
      if(k === "ok"){
        applyKeypad();
        return;
      }
      if(k === "clear"){
        keypadValue = "";
        renderKeypad();
        return;
      }
      if(k === "back"){
        keypadValue = keypadValue.slice(0, -1);
        renderKeypad();
        return;
      }
      if(k === "."){
        if(!keypadValue.includes(".")) keypadValue = keypadValue ? keypadValue + "." : "0.";
        renderKeypad();
        return;
      }
      keypadValue = (keypadValue === "0" ? "" : keypadValue) + k;
      if(keypadValue.length > 10) keypadValue = keypadValue.slice(0, 10);
      renderKeypad();
    });

    return keypad;
  }

  function renderKeypad(){
    const d = document.getElementById("dvlKeypadDisplay");
    if(d) d.textContent = keypadValue || "0";
  }

  function openKeypad(input){
    closeMenu();
    closePalette();
    ensureKeypad();
    keypadTarget = input;
    keypadValue = String(input.value || "").replace(",", ".");
    renderKeypad();
    keypad.classList.add("is-open");
  }

  function applyKeypad(){
    if(!keypadTarget){
      closeKeypad();
      return;
    }
    const value = keypadValue || "0";
    keypadTarget.value = value;
    fire(keypadTarget);
    closeKeypad();
  }

  function closeKeypad(){
    if(keypad) keypad.classList.remove("is-open");
    keypadTarget = null;
    keypadValue = "";
  }

  function upgradeNumber(input){
    if(!input || input.dataset.dvlCustomNumber === "1") return;
    const t = (input.getAttribute("type") || "").toLowerCase();
    if(t !== "number") return;

    input.dataset.dvlCustomNumber = "1";
    input.readOnly = true;
    input.inputMode = "none";
    input.setAttribute("autocomplete", "off");

    input.addEventListener("focus", ev => {
      ev.preventDefault();
      input.blur();
      openKeypad(input);
    });

    input.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      input.blur();
      openKeypad(input);
    });
  }

  function ensurePalette(){
    if(palette) return palette;
    palette = document.createElement("div");
    palette.className = "dvl-color-palette";
    palette.innerHTML = '<div class="dvl-color-grid">' + paletteColors.map(c => `<button type="button" class="dvl-color-swatch" data-color="${c}" style="background:${c}"></button>`).join("") + '</div>';
    document.body.appendChild(palette);
    palette.addEventListener("pointerdown", ev => ev.stopPropagation(), true);
    palette.addEventListener("click", ev => {
      const sw = ev.target.closest(".dvl-color-swatch");
      if(!sw || !paletteTarget) return;
      paletteTarget.value = sw.dataset.color;
      fire(paletteTarget);
      closePalette();
    });
    return palette;
  }

  function openPaletteFor(input, anchor){
    closeMenu();
    closeKeypad();
    const p = ensurePalette();
    paletteTarget = input;
    positionBox(p, anchor, 154);
    p.classList.add("is-open");
  }

  function bindColorButton(btnId, inputId){
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if(!btn || !input || btn.dataset.dvlPalette === "1") return;

    btn.dataset.dvlPalette = "1";
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openPaletteFor(input, btn);
    }, true);
  }

  function upgradePanel(root){
    root = root || document;

    if(root.nodeType===1 && root.matches){
      if(root.matches(".dvl-vt-select")) upgradeSelect(root);
      if(root.matches(".dvl-vt-input")) upgradeNumber(root);
    }
    if(root.querySelectorAll){
      root.querySelectorAll(".dvl-vt-select").forEach(upgradeSelect);
      root.querySelectorAll(".dvl-vt-input").forEach(upgradeNumber);
    }

    bindColorButton("dvlVtBuyerColorBtn", "dvlVtBuyerColor");
    bindColorButton("dvlVtSellerColorBtn", "dvlVtSellerColor");
  }

  function boot(){
    upgradePanel(document);
    const obs = new MutationObserver((muts) => {
      for(const m of muts){
        for(const n of m.addedNodes){
          if(n && n.nodeType===1) upgradePanel(n);
        }
      }
    });
    obs.observe(document.body, {childList:true, subtree:true});

    document.addEventListener("pointerdown", ev => {
      if(menu && !ev.target.closest(".dvl-custom-menu") && !ev.target.closest(".dvl-custom-select-btn")) closeMenu();
      if(palette && !ev.target.closest(".dvl-color-palette") && !ev.target.closest(".dvl-vt-color-btn")) closePalette();
      if(keypad && !ev.target.closest(".dvl-keypad") && !ev.target.closest(".dvl-vt-input")) closeKeypad();
    }, true);

    window.DVL_UI_RULES = Object.assign({}, window.DVL_UI_RULES || {}, {
      indicatorControls: RULE,
      configInputHeightPx: 22,
      nativeDropdownsAllowed:false,
      nativeNumericKeyboardAllowed:false,
      resetButtonLocation:"indicator panel header beside close X",
      bodyResetButtonAllowed:false,
      resetButtonTextAllowed:false,
      indicatorSettingsStandard:"v1",
      dvlSwitchRequired:true,
      futureIndicatorUiMustReuseStandard:true
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.DVLIndicatorCustomControls = {
    version:"0.577",
    rule:RULE,
    upgrade:upgradePanel
  };
})();
