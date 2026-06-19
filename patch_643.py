#!/usr/bin/env python3
"""
patch_643.py — DVL Beta 0.643 / Phase 1.1
Adds refresh(), observe(), count() to DVL_BUTTON_SYSTEM and 7 new selectors
for dynamic buttons. No visual changes; no nested <script> tags.
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-8.before_phase_0643_button_dynamic_refresh.html")

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
    'DVL Binance Live — Beta 0.642',
    'DVL Binance Live — Beta 0.643',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.642";',
    'const DVL_APP_VERSION = "Beta 0.643";',
    "DVL_APP_VERSION")

# ── 3. static badge ──────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.642',
    'BETA 0.643',
    "static badge")

# ── 4. changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Hotfix: corrige DVL_BUTTON_SYSTEM inserido como <script> aninhado dentro do script principal." },',
    '  { version: DVL_APP_VERSION, note: "Phase 1.1: refresh/observer seguro do DVL_BUTTON_SYSTEM para registrar botões dinâmicos sem alteração visual." },\n'
    '  { version: "Beta 0.642", note: "Hotfix: corrige DVL_BUTTON_SYSTEM inserido como <script> aninhado dentro do script principal." },',
    "changelog 0.643")

# ── 5. Replace entire DVL_BUTTON_SYSTEM module block 0642 → 0643 ─────────────
OLD_MODULE = """\
// ===== DVL_BUTTON_SYSTEM_MODULE_0642 =====
(function(){
"use strict";

var SELECTOR_MAP = [
  { selector: '.navItem',               role: 'footer'    },
  { selector: '.tfBtn',                 role: 'timeframe' },
  { selector: '.smallChartBtn',         role: 'header'    },
  { selector: '.indBtn',                role: 'header'    },
  { selector: '.iconBtn',               role: 'icon'      },
  { selector: '.menuBtn',               role: 'dropdown'  },
  { selector: '.panelBtn',              role: 'panel'     },
  { selector: '.panelToggle',           role: 'panel'     },
  { selector: '.tradeAction',           role: 'trade'     },
  { selector: '.orderTypeOption',       role: 'dropdown'  },
  { selector: '.numberPadSheet button', role: 'keypad'    },
  { selector: '.drawerBtn',             role: 'panel'     },
  { selector: '.panelCloseX',           role: 'panel'     }
];

var registry = [];

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

function init(){
  for(var i = 0; i < SELECTOR_MAP.length; i++){
    var m = SELECTOR_MAP[i];
    registerBySelector(m.selector, { role: m.role });
  }
  if(window.DVL_TOUCH_GUARD && typeof window.DVL_TOUCH_GUARD.markUiSurface === 'function'){
    try{ window.DVL_TOUCH_GUARD.markUiSurface(document); }catch(_){}
  }
}

window.DVL_BUTTON_SYSTEM = {
  registry: registry,
  registerButton: registerButton,
  registerBySelector: registerBySelector,
  setState: setState,
  isButtonTarget: isButtonTarget,
  preventChartLeak: preventChartLeak,
  init: init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

NEW_MODULE = """\
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

html = rep(html, OLD_MODULE, NEW_MODULE, "replace DVL_BUTTON_SYSTEM module 0642→0643")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_643 applied: {', '.join(_ok)}")

# ── Verification ──────────────────────────────────────────────────────────────
html2 = SRC.read_text(encoding="utf-8")
assert 'DVL_BUTTON_SYSTEM_MODULE_0643' in html2,           "FAIL: module title 0643 missing"
assert 'DVL_BUTTON_SYSTEM_MODULE_0642' not in html2,       "FAIL: old 0642 title still present"
assert '<script id="DVL_BUTTON_SYSTEM' not in html2,       "FAIL: nested <script> tag found!"
assert 'refresh: refresh' in html2,                        "FAIL: refresh not exported"
assert 'observe: observe' in html2,                        "FAIL: observe not exported"
assert 'count: function()' in html2,                       "FAIL: count not exported"
assert '.dvl-paper-confirm button' in html2,               "FAIL: paper selectors missing"
assert '.dvlDrawCtxBar button' in html2,                   "FAIL: tools selectors missing"
assert 'DVL_TODO_0643' not in html2,                       "FAIL: DVL_TODO_0643 comment still present"
print("[OK] all assertions passed — module 0643 clean, no nested scripts, exports verified")
