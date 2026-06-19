#!/usr/bin/env python3
# patch_648.py — Beta 0.648 / Phase 1.6: panel button migration
# Migrates .panelBtn, .panelToggle, .panelCloseX to DVL_BUTTON_SYSTEM
# Does NOT migrate .drawerBtn, .tradeAction, or any other selector.

import shutil, sys, os

SRC  = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACK = "DepthVisionLab-v106_REAL_UI/public/index-21.before_0648_panel_button_migration.html"

shutil.copy2(SRC, BACK)
print(f"[OK] backup: {BACK}")

html = open(SRC, encoding="utf-8").read()

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERR] not found: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERR] ambiguous ({count}x): {label}")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── 1. Title ─────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.647</title>',
    '<title>DVL Binance Live — Beta 0.648</title>',
    "title 0.648")

# ── 2. Insert DVL_BUTTON_PANEL_MIGRATION_CSS_0648 ─────────────────────────────
# Anchor: last line of 0647 CSS block then the main <style> opening
html = rep(html,
    '.dvl-btn-migrated-menu   {}\n</style>\n\n<style>\n:root{',
    '''.dvl-btn-migrated-menu   {}
</style>

<style id="DVL_BUTTON_PANEL_MIGRATION_CSS_0648">
/* DVL Beta 0.648 — Phase 1.6: panel/control button migration pilot.
   Visual-neutral diagnostic class for migrated panel buttons.
   Does NOT alter height, padding, gap, radius, color, font or layout. */
.dvl-btn-migrated-panel {}
</style>

<style>
:root{''',
    "insert DVL_BUTTON_PANEL_MIGRATION_CSS_0648")

# ── 3. Version + changelog ────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.647";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\ntry{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}\nwindow.DVL_CHANGELOG = [\n  { version: DVL_APP_VERSION, note: "Phase 1.5: migração piloto visual-neutral dos botões de header/toolbar para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.646", note: "Phase 1.4: migração piloto visual-neutral dos botões de timeframe para o DVL_BUTTON_SYSTEM." },',
    'const DVL_APP_VERSION = "Beta 0.648";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\ntry{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}\nwindow.DVL_CHANGELOG = [\n  { version: DVL_APP_VERSION, note: "Beta 0.648 — Phase 1.6: migração piloto visual-neutral dos botões de painel/controles para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.647", note: "Phase 1.5: migração piloto visual-neutral dos botões de header/toolbar para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.646", note: "Phase 1.4: migração piloto visual-neutral dos botões de timeframe para o DVL_BUTTON_SYSTEM." },',
    "version + changelog 0.648")

# ── 4. Replace entire DVL_BUTTON_SYSTEM_MODULE_0647 → 0648 ────────────────────
OLD_MODULE = '''// ===== DVL_BUTTON_SYSTEM_MODULE_0647 =====
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
  el.setAttribute('data-dvl-button-version', '0.647');
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
  if(options && options.role === 'header'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-header');
    el.classList.add('dvl-btn-migrated-header');
  }
  if(options && options.role === 'icon'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-icon');
    el.classList.add('dvl-btn-migrated-icon');
  }
  if(options && options.role === 'dropdown' &&
     el.classList.contains('menuBtn')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-menu');
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

function getMigratedHeaderButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-header')) result.push(el);
  }
  return result;
}

function getMigratedIconButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-icon')) result.push(el);
  }
  return result;
}

function getMigratedMenuButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-menu')) result.push(el);
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
  var headerEls = listByRole('header');
  var headerMigrated = 0;
  for(var i = 0; i < headerEls.length; i++){
    if(headerEls[i].classList.contains('dvl-btn-migrated-header')) headerMigrated++;
  }
  var iconEls = listByRole('icon');
  var iconMigrated = 0;
  for(var i = 0; i < iconEls.length; i++){
    if(iconEls[i].classList.contains('dvl-btn-migrated-icon')) iconMigrated++;
  }
  var menuEls = getMigratedMenuButtons();
  return {
    total:              registry.length,
    roles:              getRoleCounts(),
    registered:         registry.length,
    observed:           observer !== null,
    footerTotal:        footerEls.length,
    footerMigrated:     footerMigrated,
    timeframeTotal:     timeframeEls.length,
    timeframeMigrated:  timeframeMigrated,
    headerTotal:        headerEls.length,
    headerMigrated:     headerMigrated,
    iconTotal:          iconEls.length,
    iconMigrated:       iconMigrated,
    menuTotal:          getMigratedMenuButtons().length,
    menuMigrated:       menuEls.length
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
  getMigratedHeaderButtons:    getMigratedHeaderButtons,
  getMigratedIconButtons:      getMigratedIconButtons,
  getMigratedMenuButtons:      getMigratedMenuButtons,
  audit:                       audit,
  init:                        init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();'''

NEW_MODULE = '''// ===== DVL_BUTTON_SYSTEM_MODULE_0648 =====
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
  el.setAttribute('data-dvl-button-version', '0.648');
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
  if(options && options.role === 'header'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-header');
    el.classList.add('dvl-btn-migrated-header');
  }
  if(options && options.role === 'icon'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-icon');
    el.classList.add('dvl-btn-migrated-icon');
  }
  if(options && options.role === 'dropdown' &&
     el.classList.contains('menuBtn')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-menu');
  }
  if(options && options.role === 'panel' &&
     (el.classList.contains('panelBtn') ||
      el.classList.contains('panelToggle') ||
      el.classList.contains('panelCloseX'))){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-panel');
    el.classList.add('dvl-btn-migrated-panel');
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

function getMigratedHeaderButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-header')) result.push(el);
  }
  return result;
}

function getMigratedIconButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-icon')) result.push(el);
  }
  return result;
}

function getMigratedMenuButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-menu')) result.push(el);
  }
  return result;
}

function getMigratedPanelButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-panel') &&
       (el.classList.contains('panelBtn') ||
        el.classList.contains('panelToggle') ||
        el.classList.contains('panelCloseX'))) result.push(el);
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
  var headerEls = listByRole('header');
  var headerMigrated = 0;
  for(var i = 0; i < headerEls.length; i++){
    if(headerEls[i].classList.contains('dvl-btn-migrated-header')) headerMigrated++;
  }
  var iconEls = listByRole('icon');
  var iconMigrated = 0;
  for(var i = 0; i < iconEls.length; i++){
    if(iconEls[i].classList.contains('dvl-btn-migrated-icon')) iconMigrated++;
  }
  var menuEls = getMigratedMenuButtons();
  var panelControlEls = getMigratedPanelButtons();
  var allPanelEls = listByRole('panel');
  var panelControlMigrated = panelControlEls.length;
  return {
    total:                registry.length,
    roles:                getRoleCounts(),
    registered:           registry.length,
    observed:             observer !== null,
    footerTotal:          footerEls.length,
    footerMigrated:       footerMigrated,
    timeframeTotal:       timeframeEls.length,
    timeframeMigrated:    timeframeMigrated,
    headerTotal:          headerEls.length,
    headerMigrated:       headerMigrated,
    iconTotal:            iconEls.length,
    iconMigrated:         iconMigrated,
    menuTotal:            getMigratedMenuButtons().length,
    menuMigrated:         menuEls.length,
    panelControlTotal:    allPanelEls.length,
    panelControlMigrated: panelControlMigrated
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
  getMigratedHeaderButtons:    getMigratedHeaderButtons,
  getMigratedIconButtons:      getMigratedIconButtons,
  getMigratedMenuButtons:      getMigratedMenuButtons,
  getMigratedPanelButtons:     getMigratedPanelButtons,
  audit:                       audit,
  init:                        init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();'''

html = rep(html, OLD_MODULE, NEW_MODULE, "replace DVL_BUTTON_SYSTEM_MODULE_0647 → 0648")

# ── Write ─────────────────────────────────────────────────────────────────────
open(SRC, "w", encoding="utf-8").write(html)
print("[OK] patch_648 applied: title, DVL_APP_VERSION, badge, changelog 0.648, "
      "insert DVL_BUTTON_PANEL_MIGRATION_CSS_0648, replace DVL_BUTTON_SYSTEM module 0647→0648")

# ── Assertions ────────────────────────────────────────────────────────────────
content = open(SRC, encoding="utf-8").read()

# Version assertions
assert '<title>DVL Binance Live — Beta 0.648</title>' in content,            "FAIL: title 0.648"
assert 'const DVL_APP_VERSION = "Beta 0.648"' in content,                          "FAIL: DVL_APP_VERSION 0.648"
assert 'DVL_APP_VERSION).toUpperCase()' in content,                                "FAIL: badge auto-update"
assert '"Beta 0.648 — Phase 1.6:' in content,                                "FAIL: changelog 0.648 entry"
assert '"Beta 0.647", note: "Phase 1.5:' in content,                              "FAIL: changelog 0.647 preserved"

# CSS assertions
assert 'id="DVL_BUTTON_PANEL_MIGRATION_CSS_0648"' in content,                      "FAIL: panel CSS id"
assert '.dvl-btn-migrated-panel {}' in content,                                    "FAIL: dvl-btn-migrated-panel class"
assert 'id="DVL_BUTTON_HEADER_MIGRATION_CSS_0647"' in content,                     "FAIL: 0647 CSS preserved"
assert 'id="DVL_BUTTON_TIMEFRAME_MIGRATION_CSS_0646"' in content,                  "FAIL: 0646 CSS preserved"
assert 'id="DVL_BUTTON_FOOTER_MIGRATION_CSS_0645"' in content,                     "FAIL: 0645 CSS preserved"

# Module assertions
assert '// ===== DVL_BUTTON_SYSTEM_MODULE_0648 =====' in content,                  "FAIL: module title 0648"
assert '// ===== DVL_BUTTON_SYSTEM_MODULE_0647 =====' not in content,              "FAIL: old module title still present"
assert "data-dvl-button-version', '0.648'" in content,                             "FAIL: data-dvl-button-version 0.648"
assert "data-dvl-button-version', '0.647'" not in content,                         "FAIL: old data-dvl-button-version still present"

# Panel migration assertions
assert "options.role === 'panel'" in content,                                       "FAIL: panel role check"
assert "el.classList.contains('panelBtn')" in content,                             "FAIL: panelBtn guard"
assert "el.classList.contains('panelToggle')" in content,                          "FAIL: panelToggle guard"
assert "el.classList.contains('panelCloseX')" in content,                          "FAIL: panelCloseX guard"
assert "el.classList.add('dvl-btn-migrated-panel')" in content,                    "FAIL: dvl-btn-migrated-panel add"

# getMigratedPanelButtons assertion
assert 'function getMigratedPanelButtons()' in content,                            "FAIL: getMigratedPanelButtons function"
assert 'getMigratedPanelButtons:     getMigratedPanelButtons' in content,          "FAIL: getMigratedPanelButtons export"

# audit() expansion assertions
assert 'panelControlTotal:' in content,                                            "FAIL: audit panelControlTotal"
assert 'panelControlMigrated:' in content,                                         "FAIL: audit panelControlMigrated"

# No nested script tag
assert '<script id="DVL_BUTTON_SYSTEM' not in content,                             "FAIL: nested script tag"

# No xs/sm/md applied in module
assert "classList.add('dvl-btn-xs')" not in content,                               "FAIL: dvl-btn-xs applied"
assert "classList.add('dvl-btn-sm')" not in content,                               "FAIL: dvl-btn-sm applied"
assert "classList.add('dvl-btn-md')" not in content,                               "FAIL: dvl-btn-md applied"

# No DVL_TODO_0648 remaining
assert 'DVL_TODO_0648' not in content,                                             "FAIL: DVL_TODO_0648 still present"

# Previous migrations preserved
assert 'dvl-btn-migrated-footer' in content,                                       "FAIL: footer migration lost"
assert 'dvl-btn-migrated-timeframe' in content,                                    "FAIL: timeframe migration lost"
assert 'dvl-btn-migrated-header' in content,                                       "FAIL: header migration lost"
assert 'dvl-btn-migrated-icon' in content,                                         "FAIL: icon migration lost"
assert 'dvl-btn-migrated-menu' in content,                                         "FAIL: menu migration lost"

# drawerBtn guard: .drawerBtn is in SELECTOR_MAP with role 'panel'
# but registerButton() only adds dvl-btn-migrated-panel for panelBtn/panelToggle/panelCloseX
# Verify the guard does NOT include drawerBtn
assert "el.classList.contains('drawerBtn')" not in content,                        "FAIL: drawerBtn guard should not be in migration condition"

print("[OK] all 27 assertions passed — 0648 clean, panel migration, prior migrations preserved")
