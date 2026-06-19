#!/usr/bin/env python3
"""
patch_646.py — DVL Beta 0.646 / Phase 1.4
Timeframe button migration pilot: applies dvl-btn/dvl-btn-header/dvl-btn-migrated-timeframe
to .tfBtn only. Footer migration from 0.645 is preserved. No visual change.
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-18.before_0646_timeframe_migration.html")

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
    'DVL Binance Live — Beta 0.645',
    'DVL Binance Live — Beta 0.646',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.645";',
    'const DVL_APP_VERSION = "Beta 0.646";',
    "DVL_APP_VERSION")

# ── 3. static badge ──────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.645',
    'BETA 0.646',
    "static badge")

# ── 4. changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Phase 1.3: migração piloto visual-neutral dos botões do footer para o DVL_BUTTON_SYSTEM." },',
    '  { version: DVL_APP_VERSION, note: "Phase 1.4: migração piloto visual-neutral dos botões de timeframe para o DVL_BUTTON_SYSTEM." },\n'
    '  { version: "Beta 0.645", note: "Phase 1.3: migração piloto visual-neutral dos botões do footer para o DVL_BUTTON_SYSTEM." },',
    "changelog 0.646")

# ── 5. Insert DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646 ─────────────────────────
TIMEFRAME_CSS = """\
<style id="DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646">
/* DVL Beta 0.646 — Phase 1.4: timeframe button migration pilot.
   Visual-neutral diagnostic class for migrated .tfBtn buttons.
   Does NOT alter height, padding, gap, radius, color, font or layout. */
.dvl-btn-migrated-timeframe {}
</style>

"""

html = rep(html,
    '.dvl-btn-migrated-footer {}\n</style>\n\n<style>\n:root{',
    '.dvl-btn-migrated-footer {}\n</style>\n\n' + TIMEFRAME_CSS + '<style>\n:root{',
    "insert DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646")

# ── 6. Replace entire DVL_BUTTON_SYSTEM module 0645 → 0646 ───────────────────
OLD_MODULE = """\
// ===== DVL_BUTTON_SYSTEM_MODULE_0645 =====
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
  el.setAttribute('data-dvl-button-version', '0.645');
  el.setAttribute('data-dvl-button-scaffold', 'true');
  if(options && options.role)
    el.setAttribute('data-dvl-button-role', options.role);
  if(options && options.role === 'footer'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-footer');
    el.classList.add('dvl-btn-migrated-footer');
  }
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

function getMigratedFooterButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-footer') &&
       el.classList.contains('navItem')) result.push(el);
  }
  return result;
}

function audit(){
  var footerEls = listByRole('footer');
  var migrated = 0;
  for(var i = 0; i < footerEls.length; i++){
    if(footerEls[i].classList.contains('dvl-btn-migrated-footer')) migrated++;
  }
  return {
    total:          registry.length,
    roles:          getRoleCounts(),
    registered:     registry.length,
    observed:       observer !== null,
    footerTotal:    footerEls.length,
    footerMigrated: migrated
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:                registry,
  registerButton:          registerButton,
  registerBySelector:      registerBySelector,
  setState:                setState,
  isButtonTarget:          isButtonTarget,
  preventChartLeak:        preventChartLeak,
  refresh:                 refresh,
  observe:                 observe,
  count:                   function(){ return registry.length; },
  getRoleCounts:           getRoleCounts,
  listByRole:              listByRole,
  getMigratedFooterButtons:getMigratedFooterButtons,
  audit:                   audit,
  init:                    init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

NEW_MODULE = """\
// ===== DVL_BUTTON_SYSTEM_MODULE_0646 =====
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
  el.setAttribute('data-dvl-button-version', '0.646');
  el.setAttribute('data-dvl-button-scaffold', 'true');
  if(options && options.role)
    el.setAttribute('data-dvl-button-role', options.role);
  if(options && options.role === 'footer'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-footer');
    el.classList.add('dvl-btn-migrated-footer');
  }
  if(options && options.role === 'timeframe'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-header');
    el.classList.add('dvl-btn-migrated-timeframe');
  }
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

function getMigratedFooterButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-footer') &&
       el.classList.contains('navItem')) result.push(el);
  }
  return result;
}

function getMigratedTimeframeButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-timeframe') &&
       el.classList.contains('tfBtn')) result.push(el);
  }
  return result;
}

function audit(){
  var footerEls = listByRole('footer');
  var footerMigrated = 0;
  for(var i = 0; i < footerEls.length; i++){
    if(footerEls[i].classList.contains('dvl-btn-migrated-footer')) footerMigrated++;
  }
  var timeframeEls = listByRole('timeframe');
  var timeframeMigrated = 0;
  for(var i = 0; i < timeframeEls.length; i++){
    if(timeframeEls[i].classList.contains('dvl-btn-migrated-timeframe')) timeframeMigrated++;
  }
  return {
    total:              registry.length,
    roles:              getRoleCounts(),
    registered:         registry.length,
    observed:           observer !== null,
    footerTotal:        footerEls.length,
    footerMigrated:     footerMigrated,
    timeframeTotal:     timeframeEls.length,
    timeframeMigrated:  timeframeMigrated
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:                    registry,
  registerButton:              registerButton,
  registerBySelector:          registerBySelector,
  setState:                    setState,
  isButtonTarget:              isButtonTarget,
  preventChartLeak:            preventChartLeak,
  refresh:                     refresh,
  observe:                     observe,
  count:                       function(){ return registry.length; },
  getRoleCounts:               getRoleCounts,
  listByRole:                  listByRole,
  getMigratedFooterButtons:    getMigratedFooterButtons,
  getMigratedTimeframeButtons: getMigratedTimeframeButtons,
  audit:                       audit,
  init:                        init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

html = rep(html, OLD_MODULE, NEW_MODULE, "replace DVL_BUTTON_SYSTEM module 0645→0646")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_646 applied: {', '.join(_ok)}")

# ── Verification ──────────────────────────────────────────────────────────────
html2 = SRC.read_text(encoding="utf-8")
assert 'DVL_BUTTON_SYSTEM_MODULE_0646' in html2,              "FAIL: module title 0646 missing"
assert 'DVL_BUTTON_SYSTEM_MODULE_0645' not in html2,          "FAIL: old 0645 title still present"
assert '<script id="DVL_BUTTON_SYSTEM' not in html2,          "FAIL: nested <script> tag found!"
assert 'DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646' in html2,    "FAIL: timeframe migration CSS missing"
assert 'dvl-btn-migrated-timeframe' in html2,                 "FAIL: migrated-timeframe class missing"
assert "options.role === 'timeframe'" in html2,               "FAIL: timeframe role branch missing"
assert "options.role === 'footer'" in html2,                  "FAIL: footer role branch missing (regression)"
assert 'dvl-btn-migrated-footer' in html2,                    "FAIL: footer migration regressed"
assert 'timeframeTotal' in html2,                             "FAIL: timeframeTotal missing in audit"
assert 'timeframeMigrated' in html2,                          "FAIL: timeframeMigrated missing in audit"
assert 'getMigratedTimeframeButtons' in html2,                "FAIL: getMigratedTimeframeButtons missing"
assert 'getMigratedFooterButtons' in html2,                   "FAIL: getMigratedFooterButtons missing (regression)"
assert "data-dvl-button-version', '0.646'" in html2,          "FAIL: version 0.646 metadata missing"
assert 'DVL_TODO_0646' not in html2,                          "FAIL: DVL_TODO_0646 still present"
print("[OK] all assertions passed — 0646 clean, timeframe migration, footer preserved, audit expanded")
