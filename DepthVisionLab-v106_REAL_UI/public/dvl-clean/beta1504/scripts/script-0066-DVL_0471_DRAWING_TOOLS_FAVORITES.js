(function(){
  const TOOL_ICON = {
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="20" x2="20" y2="4"/></svg>',
    rect: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>',
    long: '<svg viewBox="0 0 48 48" aria-hidden="true" class="dvl-oc-pos-icon dvl-oc-pos-long"><path class="dvl-oc-solid" d="M7 11H41M7 37H41"/><path class="dvl-oc-dash" d="M7 24H41"/><path class="dvl-oc-arrow" d="M24 35V16M15.5 24.5L24 16l8.5 8.5"/></svg>',
    short: '<svg viewBox="0 0 48 48" aria-hidden="true" class="dvl-oc-pos-icon dvl-oc-pos-short"><path class="dvl-oc-solid" d="M7 11H41M7 37H41"/><path class="dvl-oc-dash" d="M7 24H41"/><path class="dvl-oc-arrow" d="M24 13V32M15.5 23.5L24 32l8.5-8.5"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="7" x2="6" y2="11"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="14" y1="7" x2="14" y2="11"/><line x1="18" y1="7" x2="18" y2="13"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M12 6v12M9 18h6"/></svg>'
  };

  const TOOLS = [
    { id:"cross", label:"Cross", cls:"" },
    { id:"trend", label:"Trend", cls:"" },
    { id:"rect", label:"Rect", cls:"" },
    { id:"long", label:"Long", cls:"toolLong" },
    { id:"short", label:"Short", cls:"toolShort" },
    { id:"ruler", label:"Ruler", cls:"" },
    { id:"arrow", label:"Arrow", cls:"" },
    { id:"text", label:"Text", cls:"textIcon" }
  ];

  const DEFAULT_FAVS = ["cross","trend","rect"];
  let favoriteTools = loadFavoriteTools();
  let selectedTool = "";

  function byId(id){ return document.getElementById(id); }

  function loadFavoriteTools(){
    try{
      const parsed = JSON.parse(localStorage.getItem("DVL_FAVORITE_DRAW_TOOLS") || "[]");
      const valid = Array.isArray(parsed) ? parsed.filter(id => TOOLS.some(t => t.id === id)) : [];
      return valid.length ? valid : DEFAULT_FAVS.slice();
    }catch(_){
      return DEFAULT_FAVS.slice();
    }
  }

  function saveFavoriteTools(){
    try{ localStorage.setItem("DVL_FAVORITE_DRAW_TOOLS", JSON.stringify(favoriteTools)); }catch(_){}
  }

  function isFavoriteTool(id){
    return favoriteTools.includes(id);
  }

  function toolById(id){
    return TOOLS.find(t => t.id === id);
  }

  function toolButtonMarkup(tool){
    const isSelected = selectedTool === tool.id;
    const extra = `${tool.cls || ""} ${isSelected ? "is-selected" : ""}`.trim();
    return `
      <button class="assetToolBtn ${extra}" type="button" data-draw-tool="${tool.id}" aria-label="${tool.label}">
        ${TOOL_ICON[tool.id] || ""}
      </button>
    `;
  }

  function toolMenuMarkup(tool){
    const fav = isFavoriteTool(tool.id);
    const active = selectedTool === tool.id;
    const posClass = tool.id === "long" ? "toolLong" : tool.id === "short" ? "toolShort" : "";
    const iconClass = tool.id === "text" ? "assetToolMenuIcon textIcon" : `assetToolMenuIcon ${posClass}`.trim();
    return `
      <button class="assetToolMenuItem ${posClass} ${fav ? "is-favorite" : ""} ${active ? "is-active" : ""}" type="button" data-menu-draw-tool="${tool.id}">
        <span class="${iconClass}">${TOOL_ICON[tool.id] || ""}</span>
        <span class="label">${tool.label}</span>
        <b class="toolMenuStar">${fav ? "★" : "☆"}</b>
      </button>
    `;
  }

  function renderFavoriteTools(){
    const strip = byId("assetToolsStrip");
    if(!strip) return;
    const tools = favoriteTools.map(toolById).filter(Boolean);
    strip.innerHTML = tools.map(toolButtonMarkup).join("");
    strip.querySelectorAll("[data-draw-tool]").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        selectTool(btn.dataset.drawTool);
      });
    });
  }

  function renderToolsMenu(){
    const list = byId("assetToolsMenuList");
    if(!list) return;
    list.innerHTML = TOOLS.map(toolMenuMarkup).join("");

    list.querySelectorAll("[data-menu-draw-tool]").forEach(btn => {
      let longTimer = null;
      let longPressed = false;
      const id = btn.dataset.menuDrawTool;

      const toggleFav = () => {
        longPressed = true;
        toggleFavoriteTool(id);
      };

      btn.addEventListener("pointerdown", () => {
        longPressed = false;
        clearTimeout(longTimer);
        longTimer = setTimeout(toggleFav, 520);
      });

      ["pointerup","pointercancel","pointerleave"].forEach(evt => {
        btn.addEventListener(evt, () => clearTimeout(longTimer));
      });

      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        if(longPressed){
          ev.preventDefault();
          return;
        }
        selectTool(id);
        closeToolsMenu();
      });
    });
  }

  function toggleFavoriteTool(id){
    if(!toolById(id)) return;

    if(isFavoriteTool(id)){
      favoriteTools = favoriteTools.filter(x => x !== id);
      if(!favoriteTools.length) favoriteTools = DEFAULT_FAVS.slice(0, 1);
    }else{
      favoriteTools = [...favoriteTools, id];
    }

    saveFavoriteTools();
    renderFavoriteTools();
    renderToolsMenu();
  }

  function selectTool(id){
    if(!toolById(id)) return;
    selectedTool = id;
    renderFavoriteTools();
    renderToolsMenu();
    if(typeof window.__dvlActivateApprovedTool === "function"){
      window.__dvlActivateApprovedTool(id);
    }else if(typeof showToast === "function"){
      showToast(`${toolById(id).label} tool em breve`);
    }
  }

  function openToolsMenu(){
    try{ window.dvlCloseFloatingPanelsExcept?.("drawTools"); }catch(_){}
    const shell = byId("assetToolsShell");
    const menu = byId("assetToolsMenu");
    const gear = byId("assetToolsGear");
    renderToolsMenu();
    shell?.classList.add("is-open");
    menu?.setAttribute("aria-hidden", "false");
    gear?.setAttribute("aria-expanded", "true");
  }

  function closeToolsMenu(){
    const shell = byId("assetToolsShell");
    const menu = byId("assetToolsMenu");
    const gear = byId("assetToolsGear");
    shell?.classList.remove("is-open");
    menu?.setAttribute("aria-hidden", "true");
    gear?.setAttribute("aria-expanded", "false");
  }

  function toggleToolsMenu(){
    const shell = byId("assetToolsShell");
    if(shell?.classList.contains("is-open")) closeToolsMenu();
    else openToolsMenu();
  }

  function init(){
    renderFavoriteTools();
    renderToolsMenu();

    const gear = byId("assetToolsGear");
    if(gear){
      gear.addEventListener("click", ev => {
        ev.stopPropagation();
        toggleToolsMenu();
      });
      gear.addEventListener("pointerdown", ev => {
        ev.stopPropagation();
      });
    }

    document.addEventListener("click", ev => {
      const shell = byId("assetToolsShell");
      if(shell && !shell.contains(ev.target)) closeToolsMenu();
    });

    window.dvlCloseDrawToolsMenu = closeToolsMenu;
    window.dvlRenderFavoriteDrawTools = renderFavoriteTools;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
