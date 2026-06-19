#!/usr/bin/env python3
"""
patch_644.py — DVL Beta 0.644 / Phase 1.2
Button scaffold tokens/classes CSS + ROLE_CLASS_MAP + metadata + audit exports.
No visual changes, no nested script tags, no classes applied to existing buttons.
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-10.before_0644_button_tokens.html")

shutil.copy2(SRC, BACKUP)
print(f"[OK] backup: {BACKUP}")

html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. title ─────────────────────────────────────────────────────────────────
html = rep(html,
    'DVL Binance Live — Beta 0.643',
    'DVL Binance Live — Beta 0.644',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.643";',
    'const DVL_APP_VERSION = "Beta 0.644";',
    "DVL_APP_VERSION")

# ── 3. static badge ──────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.643',
    'BETA 0.644',
    "static badge")

# ── 4. changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Phase 1.1: refresh/observer seguro do DVL_BUTTON_SYSTEM para registrar botões dinâmicos sem alteração visual." },',
    '  { version: DVL_APP_VERSION, note: "Phase 1.2: adiciona tokens/classes scaffold do sistema de botões sem alteração visual." },\n'
    '  { version: "Beta 0.643", note: "Phase 1.1: refresh/observer seguro do DVL_BUTTON_SYSTEM para registrar botões dinâmicos sem alteração visual." },',
    "changelog 0.644")

# ── 5. Insert DVL_BUTTON_TOKENS_CSS_0644 after DVL_BUTTON_SYSTEM_CSS_0641 ────
TOKENS_CSS = """\
<style id="DVL_BUTTON_TOKENS_CSS_0644">
/* DVL Beta 0.644 — Phase 1.2: button scaffold tokens/classes.
   Defines CSS custom properties and empty scaffold classes for future migration.
   These classes are NOT applied to existing buttons — scaffold only.
   Zero visual change to current UI. */
:root {
  --dvl-btn-radius-xs: 4px;
  --dvl-btn-radius-sm: 6px;
  --dvl-btn-radius-md: 10px;
  --dvl-btn-height-xs: 24px;
  --dvl-btn-height-sm: 32px;
  --dvl-btn-height-md: 40px;
  --dvl-btn-pad-x-xs: 8px;
  --dvl-btn-pad-x-sm: 12px;
  --dvl-btn-pad-x-md: 16px;
  --dvl-btn-font-xs: 10px;
  --dvl-btn-font-sm: 12px;
  --dvl-btn-font-md: 13px;
}
/* scaffold — not applied yet */
.dvl-btn          { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.dvl-btn-xs       { border-radius: var(--dvl-btn-radius-xs); height: var(--dvl-btn-height-xs); padding: 0 var(--dvl-btn-pad-x-xs); font-size: var(--dvl-btn-font-xs); }
.dvl-btn-sm       { border-radius: var(--dvl-btn-radius-sm); height: var(--dvl-btn-height-sm); padding: 0 var(--dvl-btn-pad-x-sm); font-size: var(--dvl-btn-font-sm); }
.dvl-btn-md       { border-radius: var(--dvl-btn-radius-md); height: var(--dvl-btn-height-md); padding: 0 var(--dvl-btn-pad-x-md); font-size: var(--dvl-btn-font-md); }
.dvl-btn-icon     { display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.dvl-btn-footer   {}
.dvl-btn-header   {}
.dvl-btn-panel    {}
.dvl-btn-trade    {}
.dvl-btn-dropdown {}
.dvl-btn-keypad   {}
.dvl-btn-tools    {}
.dvl-btn-paper    {}
</style>

"""

html = rep(html,
    '[data-dvl-button="true"]{ -webkit-tap-highlight-color: transparent; }\n</style>\n<style>\n:root{',
    '[data-dvl-button="true"]{ -webkit-tap-highlight-color: transparent; }\n</style>\n\n' + TOKENS_CSS + '<style>\n:root{',
    "insert DVL_BUTTON_TOKENS_CSS_0644")

# ── 6. Replace entire DVL_BUTTON_SYSTEM module 0643 → 0644 ───────────────────
OLD_MODULE = """\
// ===== DVL_BUTTON_SYSTEM_MODULE_0643 =====
(function(){
"use strict";

var SELECTOR_MAP = [
  { selector: '.navItem',                       role: 'footer'    },
  { selector: '.tfBtn',                         role: 'timeframe' },
  { selector: '.smallChartBtn',                 role: 'header'    },
  { selector: '.indBtn',                        role: 'header'    },
  { selector: '.iconBtn',                       role: 'icon'      },
  { selector: '.menuBtn',                       role: 'dropdown'  },
  { selector: '.panelBtn',                      role: 'panel'     },
  { selector: '.panelToggle',                   role: 'panel'     },
  { selector: '.tradeAction',                   role: 'trade'     },
  { selector: '.orderTypeOption',               role: 'dropdown'  },
  { selector: '.numberPadSheet button',         role: 'keypad'    },
  { selector: '.drawerBtn',                     role: 'panel'     },
  { selector: '.panelCloseX',                   role: 'panel'     },
  { selector: '.dvl-paper-confirm button',      role: 'paper'     },
  { selector: '.dvl-paper-edit-confirm button', role: 'paper'     },
  { selector: '.dvlDrawCtxBar button',          role: 'tools'     },
  { selector: '.dvlDrawSettingsPanel button',   role: 'tools'     },
  { selector: '.assetFavoritesSheet button',    role: 'dropdown'  },
  { selector: '.assetDropdown button',          role: 'dropdown'  },
  { selector: '.indicatorDropdown button',      role: 'dropdown'  }
];

var registry = [];
var observer = null;
var refreshScheduled = false;

function registerButton(el, options){
  if(!el || el.__dvlButtonRegistered) return;
  el.__dvlButtonRegistered = true;
  el.setAttribute('data-dvl-button', 'true');
  el.setAttribute('data-dvl-ui', 'true');
  if(options && options.role)
    el.setAttribute('data-dvl-button-role', options.role);
  registry.push(el);
}

function registerBySelector(selector, options){
  var els = document.querySelectorAll(selector);
  for(var i = 0; i < els.length; i++) registerButton(els[i], options);
}

function setState(el, state, value){
  if(!el) return;
  el.setAttribute('data-dvl-state-' + state, String(value));
}

function isButtonTarget(ev){
  var t = ev && ev.target;
  if(!t) return false;
  return !!(t.closest && t.closest('[data-dvl-button="true"]'));
}

function preventChartLeak(ev){
  if(!isButtonTarget(ev)) return;
  ev.stopPropagation();
}

function refresh(root){
  var scope = root || document;
  for(var i = 0; i < SELECTOR_MAP.length; i++){
    var m = SELECTOR_MAP[i];
    var els = scope.querySelectorAll(m.selector);
    for(var j = 0; j < els.length; j++) registerButton(els[j], { role: m.role });
  }
  if(window.DVL_TOUCH_GUARD && typeof window.DVL_TOUCH_GUARD.markUiSurface === 'function'){
    try{ window.DVL_TOUCH_GUARD.markUiSurface(scope); }catch(_){}
  }
  return registry.length;
}

function observe(root){
  if(!window.MutationObserver) return;
  if(observer) return;
  var target = root || document.body;
  observer = new MutationObserver(function(mutations){
    var hasNew = false;
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].addedNodes.length){ hasNew = true; break; }
    }
    if(!hasNew || refreshScheduled) return;
    refreshScheduled = true;
    if(window.requestAnimationFrame){
      requestAnimationFrame(function(){ refreshScheduled = false; refresh(document); });
    } else {
      setTimeout(function(){ refreshScheduled = false; refresh(document); }, 50);
    }
  });
  observer.observe(target, { childList: true, subtree: true });
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry: registry,
  registerButton: registerButton,
  registerBySelector: registerBySelector,
  setState: setState,
  isButtonTarget: isButtonTarget,
  preventChartLeak: preventChartLeak,
  refresh: refresh,
  observe: observe,
  count: function(){ return registry.length; },
  init: init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

NEW_MODULE = """\
// ===== DVL_BUTTON_SYSTEM_MODULE_0644 =====
(function(){
"use strict";

var ROLE_CLASS_MAP = {
  footer:    'dvl-btn-footer',
  timeframe: 'dvl-btn-header',
  header:    'dvl-btn-header',
  icon:      'dvl-btn-icon',
  dropdown:  'dvl-btn-dropdown',
  panel:     'dvl-btn-panel',
  trade:     'dvl-btn-trade',
  keypad:    'dvl-btn-keypad',
  paper:     'dvl-btn-paper',
  tools:     'dvl-btn-tools'
};

var SELECTOR_MAP = [
  { selector: '.navItem',                       role: 'footer'    },
  { selector: '.tfBtn',                         role: 'timeframe' },
  { selector: '.smallChartBtn',                 role: 'header'    },
  { selector: '.indBtn',                        role: 'header'    },
  { selector: '.iconBtn',                       role: 'icon'      },
  { selector: '.menuBtn',                       role: 'dropdown'  },
  { selector: '.panelBtn',                      role: 'panel'     },
  { selector: '.panelToggle',                   role: 'panel'     },
  { selector: '.tradeAction',                   role: 'trade'     },
  { selector: '.orderTypeOption',               role: 'dropdown'  },
  { selector: '.numberPadSheet button',         role: 'keypad'    },
  { selector: '.drawerBtn',                     role: 'panel'     },
  { selector: '.panelCloseX',                   role: 'panel'     },
  { selector: '.dvl-paper-confirm button',      role: 'paper'     },
  { selector: '.dvl-paper-edit-confirm button', role: 'paper'     },
  { selector: '.dvlDrawCtxBar button',          role: 'tools'     },
  { selector: '.dvlDrawSettingsPanel button',   role: 'tools'     },
  { selector: '.assetFavoritesSheet button',    role: 'dropdown'  },
  { selector: '.assetDropdown button',          role: 'dropdown'  },
  { selector: '.indicatorDropdown button',      role: 'dropdown'  }
];

var registry = [];
var observer = null;
var refreshScheduled = false;

function registerButton(el, options){
  if(!el || el.__dvlButtonRegistered) return;
  el.__dvlButtonRegistered = true;
  el.setAttribute('data-dvl-button', 'true');
  el.setAttribute('data-dvl-ui', 'true');
  el.setAttribute('data-dvl-button-version', '0.644');
  el.setAttribute('data-dvl-button-scaffold', 'true');
  if(options && options.role)
    el.setAttribute('data-dvl-button-role', options.role);
  registry.push(el);
}

function registerBySelector(selector, options){
  var els = document.querySelectorAll(selector);
  for(var i = 0; i < els.length; i++) registerButton(els[i], options);
}

function setState(el, state, value){
  if(!el) return;
  el.setAttribute('data-dvl-state-' + state, String(value));
}

function isButtonTarget(ev){
  var t = ev && ev.target;
  if(!t) return false;
  return !!(t.closest && t.closest('[data-dvl-button="true"]'));
}

function preventChartLeak(ev){
  if(!isButtonTarget(ev)) return;
  ev.stopPropagation();
}

function refresh(root){
  var scope = root || document;
  for(var i = 0; i < SELECTOR_MAP.length; i++){
    var m = SELECTOR_MAP[i];
    var els = scope.querySelectorAll(m.selector);
    for(var j = 0; j < els.length; j++) registerButton(els[j], { role: m.role });
  }
  if(window.DVL_TOUCH_GUARD && typeof window.DVL_TOUCH_GUARD.markUiSurface === 'function'){
    try{ window.DVL_TOUCH_GUARD.markUiSurface(scope); }catch(_){}
  }
  return registry.length;
}

function observe(root){
  if(!window.MutationObserver) return;
  if(observer) return;
  var target = root || document.body;
  observer = new MutationObserver(function(mutations){
    var hasNew = false;
    for(var i = 0; i < mutations.length; i++){
      if(mutations[i].addedNodes.length){ hasNew = true; break; }
    }
    if(!hasNew || refreshScheduled) return;
    refreshScheduled = true;
    if(window.requestAnimationFrame){
      requestAnimationFrame(function(){ refreshScheduled = false; refresh(document); });
    } else {
      setTimeout(function(){ refreshScheduled = false; refresh(document); }, 50);
    }
  });
  observer.observe(target, { childList: true, subtree: true });
}

function getRoleCounts(){
  var counts = {};
  for(var i = 0; i < registry.length; i++){
    var role = registry[i].getAttribute('data-dvl-button-role') || 'unknown';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function listByRole(role){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    if(registry[i].getAttribute('data-dvl-button-role') === role) result.push(registry[i]);
  }
  return result;
}

function audit(){
  return {
    total:      registry.length,
    roles:      getRoleCounts(),
    registered: registry.length,
    observed:   observer !== null
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:          registry,
  registerButton:    registerButton,
  registerBySelector:registerBySelector,
  setState:          setState,
  isButtonTarget:    isButtonTarget,
  preventChartLeak:  preventChartLeak,
  refresh:           refresh,
  observe:           observe,
  count:             function(){ return registry.length; },
  getRoleCounts:     getRoleCounts,
  listByRole:        listByRole,
  audit:             audit,
  init:              init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

html = rep(html, OLD_MODULE, NEW_MODULE, "replace DVL_BUTTON_SYSTEM module 0643→0644")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_644 applied: {', '.join(_ok)}")

# ── Verification ──────────────────────────────────────────────────────────────
html2 = SRC.read_text(encoding="utf-8")
assert 'DVL_BUTTON_SYSTEM_MODULE_0644' in html2,          "FAIL: module title 0644 missing"
assert 'DVL_BUTTON_SYSTEM_MODULE_0643' not in html2,      "FAIL: old 0643 title still present"
assert '<script id="DVL_BUTTON_SYSTEM' not in html2,      "FAIL: nested <script> tag found!"
assert 'DVL_BUTTON_TOKENS_CSS_0644' in html2,             "FAIL: tokens CSS missing"
assert '--dvl-btn-radius-xs' in html2,                    "FAIL: CSS tokens missing"
assert 'ROLE_CLASS_MAP' in html2,                         "FAIL: ROLE_CLASS_MAP missing"
assert 'data-dvl-button-version' in html2,                "FAIL: metadata version attribute missing"
assert 'data-dvl-button-scaffold' in html2,               "FAIL: metadata scaffold attribute missing"
assert 'getRoleCounts:' in html2,                         "FAIL: getRoleCounts not exported"
assert 'listByRole:' in html2,                            "FAIL: listByRole not exported"
assert 'audit:' in html2,                                 "FAIL: audit not exported"
assert 'DVL_TODO_0644' not in html2,                      "FAIL: DVL_TODO_0644 still present"
assert '.dvl-btn-footer   {}' in html2,                   "FAIL: scaffold classes missing"
print("[OK] all assertions passed — 0644 clean, tokens CSS, ROLE_CLASS_MAP, audit exports verified")
