#!/usr/bin/env python3
"""
patch_641.py — DVL Beta 0.641
Phase 1: DVL_BUTTON_SYSTEM scaffold.

1. Create backup index-6.before_phase_0641_button_system.html
2. Update title, DVL_APP_VERSION, static badge → Beta 0.641
3. Add changelog entry
4. Insert neutral CSS block DVL_BUTTON_SYSTEM_CSS_0641 (no visual change)
5. Insert window.DVL_BUTTON_SYSTEM module after DVL_TOUCH_GUARD_MODULE_0640
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-6.before_phase_0641_button_system.html")

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
    'DVL Binance Live — Beta 0.640',
    'DVL Binance Live — Beta 0.641',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.640";',
    'const DVL_APP_VERSION = "Beta 0.641";',
    "DVL_APP_VERSION")

# ── 3. static badge ──────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.640',
    'BETA 0.641',
    "static badge")

# ── 4. changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Touch guard selector patch: inclui paper layer e confirmação de edição para impedir vazamento de eventos ao gráfico." },',
    '  { version: DVL_APP_VERSION, note: "Phase 1: scaffold do DVL_BUTTON_SYSTEM para padronização futura de botões sem alteração visual." },\n'
    '  { version: "Beta 0.640", note: "Touch guard selector patch: inclui paper layer e confirmação de edição para impedir vazamento de eventos ao gráfico." },',
    "changelog 0.641")

# ── 5. neutral CSS block after DVL_UI_TOUCH_GUARD_CSS ────────────────────────
BUTTON_CSS = """\
<style id="DVL_BUTTON_SYSTEM_CSS_0641">
/* DVL Beta 0.641 — Phase 1: neutral touch-highlight suppression for registered buttons.
   Does NOT alter height, padding, color, border, radius or layout. */
[data-dvl-button="true"]{ -webkit-tap-highlight-color: transparent; }
</style>
"""

html = rep(html,
    '.numberPadSheet button{ touch-action: manipulation; }\n</style>\n<style>\n:root{',
    '.numberPadSheet button{ touch-action: manipulation; }\n</style>\n\n' + BUTTON_CSS + '<style>\n:root{',
    "insert DVL_BUTTON_SYSTEM_CSS_0641")

# ── 6. DVL_BUTTON_SYSTEM module after touch guard IIFE ───────────────────────
BUTTON_SYSTEM_MODULE = """\


<script id="DVL_BUTTON_SYSTEM_MODULE_0641">
// ===== DVL_BUTTON_SYSTEM_MODULE_0641 =====
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

})();
</script>
"""

html = rep(html,
    '})();\n\nwindow.DVL_SECTION_SIZES_PX = {',
    '})();' + BUTTON_SYSTEM_MODULE + '\nwindow.DVL_SECTION_SIZES_PX = {',
    "insert DVL_BUTTON_SYSTEM module")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_641 applied: {', '.join(_ok)}")
