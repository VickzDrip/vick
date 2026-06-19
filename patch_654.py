#!/usr/bin/env python3
# patch_654.py — Beta 0.654 / Phase 1.12: drawerBtn migration

import shutil, sys

SRC  = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACK = "DepthVisionLab-v106_REAL_UI/public/index-14.before_0654_drawer_migration.html"

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
    '<title>DVL Binance Live — Beta 0.653</title>',
    '<title>DVL Binance Live — Beta 0.654</title>',
    "title 0.654")

# ── 2. Insert DVL_BUTTON_DRAWER_MIGRATION_CSS_0654 ───────────────────────────
html = rep(html,
    '.dvl-btn-migrated-paper-edit {}\n</style>\n\n<style>\n:root{',
    '''.dvl-btn-migrated-paper-edit {}
</style>

<style id="DVL_BUTTON_DRAWER_MIGRATION_CSS_0654">
/* DVL Beta 0.654 — Phase 1.12: drawerBtn migration pilot.
   Visual-neutral diagnostic class for migrated drawer buttons.
   Does NOT alter height, padding, gap, radius, color, font or layout. */
.dvl-btn-migrated-drawer {}
</style>

<style>
:root{''',
    "insert DVL_BUTTON_DRAWER_MIGRATION_CSS_0654")

# ── 3. Version + changelog ────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.653";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\ntry{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}\nwindow.DVL_CHANGELOG = [\n  { version: DVL_APP_VERSION, note: "Beta 0.653 — Phase 1.11: migração piloto visual-neutral dos botões paper confirm/edit para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.652", note: "Phase 1.10: migração piloto visual-neutral dos botões de tools/desenhos para o DVL_BUTTON_SYSTEM." },',
    'const DVL_APP_VERSION = "Beta 0.654";\nwindow.DVL_APP_VERSION = DVL_APP_VERSION;\ntry{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}\nwindow.DVL_CHANGELOG = [\n  { version: DVL_APP_VERSION, note: "Beta 0.654 — Phase 1.12: migração piloto visual-neutral do drawerBtn para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.653", note: "Phase 1.11: migração piloto visual-neutral dos botões paper confirm/edit para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.652", note: "Phase 1.10: migração piloto visual-neutral dos botões de tools/desenhos para o DVL_BUTTON_SYSTEM." },',
    "version + changelog 0.654")

# ── 4. Replace entire DVL_BUTTON_SYSTEM_MODULE_0653 → 0654 ───────────────────
OLD_MODULE = '''// ===== DVL_BUTTON_SYSTEM_MODULE_0653 =====
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
  el.setAttribute('data-dvl-button-version', '0.653');
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
  if(options && options.role === 'dropdown' &&
     el.classList.contains('orderTypeOption')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-order-option');
  }
  if(options && options.role === 'keypad' &&
     el.closest && el.closest('.numberPadSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-keypad');
    el.classList.add('dvl-btn-migrated-keypad');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetFavoritesSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-asset-favorite');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-asset-dropdown');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.indicatorDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-indicator-dropdown');
  }
  if(options && options.role === 'tools' &&
     el.closest && (el.closest('.dvlDrawCtxBar') || el.closest('.dvlDrawSettingsPanel'))){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-tools');
    el.classList.add('dvl-btn-migrated-tools');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
    el.classList.add('dvl-btn-migrated-paper-confirm');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-edit-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
    el.classList.add('dvl-btn-migrated-paper-edit');
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

function getMigratedOrderOptionButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-order-option') &&
       el.classList.contains('orderTypeOption')) result.push(el);
  }
  return result;
}

function getMigratedKeypadButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-keypad')) result.push(el);
  }
  return result;
}

function getMigratedAssetFavoriteButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) result.push(el);
  }
  return result;
}

function getMigratedAssetDropdownButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) result.push(el);
  }
  return result;
}

function getMigratedIndicatorDropdownButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) result.push(el);
  }
  return result;
}

function getMigratedToolsButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-tools')) result.push(el);
  }
  return result;
}

function getMigratedPaperConfirmButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) result.push(el);
  }
  return result;
}

function getMigratedPaperEditConfirmButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-paper-edit')) result.push(el);
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
  var orderOptionEls = getMigratedOrderOptionButtons();
  var allDropdownEls = listByRole('dropdown');
  var orderOptionTotal = 0;
  var assetFavoriteTotal = 0;
  var assetDropdownTotal = 0;
  var indicatorDropdownTotal = 0;
  for(var i = 0; i < allDropdownEls.length; i++){
    var el = allDropdownEls[i];
    if(el.classList.contains('orderTypeOption')) orderOptionTotal++;
    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) assetFavoriteTotal++;
    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) assetDropdownTotal++;
    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) indicatorDropdownTotal++;
  }
  var keypadEls = listByRole('keypad');
  var keypadMigrated = 0;
  for(var i = 0; i < keypadEls.length; i++){
    if(keypadEls[i].classList.contains('dvl-btn-migrated-keypad')) keypadMigrated++;
  }
  var toolsEls = listByRole('tools');
  var toolsMigrated = 0;
  for(var i = 0; i < toolsEls.length; i++){
    if(toolsEls[i].classList.contains('dvl-btn-migrated-tools')) toolsMigrated++;
  }
  var paperEls = listByRole('paper');
  var paperConfirmTotal = 0;
  var paperEditConfirmTotal = 0;
  for(var i = 0; i < paperEls.length; i++){
    var el = paperEls[i];
    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) paperConfirmTotal++;
    if(el.classList.contains('dvl-btn-migrated-paper-edit')) paperEditConfirmTotal++;
  }
  var paperConfirmMigrated = getMigratedPaperConfirmButtons().length;
  var paperEditConfirmMigrated = getMigratedPaperEditConfirmButtons().length;
  var assetFavoriteMigrated = getMigratedAssetFavoriteButtons().length;
  var assetDropdownMigrated = getMigratedAssetDropdownButtons().length;
  var indicatorDropdownMigrated = getMigratedIndicatorDropdownButtons().length;
  return {
    total:                     registry.length,
    roles:                     getRoleCounts(),
    registered:                registry.length,
    observed:                  observer !== null,
    footerTotal:               footerEls.length,
    footerMigrated:            footerMigrated,
    timeframeTotal:            timeframeEls.length,
    timeframeMigrated:         timeframeMigrated,
    headerTotal:               headerEls.length,
    headerMigrated:            headerMigrated,
    iconTotal:                 iconEls.length,
    iconMigrated:              iconMigrated,
    menuTotal:                 getMigratedMenuButtons().length,
    menuMigrated:              menuEls.length,
    panelControlTotal:         allPanelEls.length,
    panelControlMigrated:      panelControlMigrated,
    orderOptionTotal:          orderOptionTotal,
    orderOptionMigrated:       orderOptionEls.length,
    keypadTotal:               keypadEls.length,
    keypadMigrated:            keypadMigrated,
    toolsTotal:                toolsEls.length,
    toolsMigrated:             toolsMigrated,
    paperConfirmTotal:         paperConfirmTotal,
    paperConfirmMigrated:      paperConfirmMigrated,
    paperEditConfirmTotal:     paperEditConfirmTotal,
    paperEditConfirmMigrated:  paperEditConfirmMigrated,
    assetFavoriteTotal:        assetFavoriteTotal,
    assetFavoriteMigrated:     assetFavoriteMigrated,
    assetDropdownTotal:        assetDropdownTotal,
    assetDropdownMigrated:     assetDropdownMigrated,
    indicatorDropdownTotal:    indicatorDropdownTotal,
    indicatorDropdownMigrated: indicatorDropdownMigrated
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:                          registry,
  registerButton:                    registerButton,
  registerBySelector:                registerBySelector,
  setState:                          setState,
  isButtonTarget:                    isButtonTarget,
  preventChartLeak:                  preventChartLeak,
  refresh:                           refresh,
  observe:                           observe,
  count:                             function(){ return registry.length; },
  getRoleCounts:                     getRoleCounts,
  listByRole:                        listByRole,
  getMigratedFooterButtons:          getMigratedFooterButtons,
  getMigratedTimeframeButtons:       getMigratedTimeframeButtons,
  getMigratedHeaderButtons:          getMigratedHeaderButtons,
  getMigratedIconButtons:            getMigratedIconButtons,
  getMigratedMenuButtons:            getMigratedMenuButtons,
  getMigratedPanelButtons:           getMigratedPanelButtons,
  getMigratedOrderOptionButtons:     getMigratedOrderOptionButtons,
  getMigratedKeypadButtons:          getMigratedKeypadButtons,
  getMigratedAssetFavoriteButtons:   getMigratedAssetFavoriteButtons,
  getMigratedAssetDropdownButtons:   getMigratedAssetDropdownButtons,
  getMigratedIndicatorDropdownButtons: getMigratedIndicatorDropdownButtons,
  getMigratedToolsButtons:           getMigratedToolsButtons,
  getMigratedPaperConfirmButtons:    getMigratedPaperConfirmButtons,
  getMigratedPaperEditConfirmButtons: getMigratedPaperEditConfirmButtons,
  audit:                             audit,
  init:                              init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();'''

NEW_MODULE = '''// ===== DVL_BUTTON_SYSTEM_MODULE_0654 =====
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
  el.setAttribute('data-dvl-button-version', '0.654');
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
  if(options && options.role === 'dropdown' &&
     el.classList.contains('orderTypeOption')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-order-option');
  }
  if(options && options.role === 'keypad' &&
     el.closest && el.closest('.numberPadSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-keypad');
    el.classList.add('dvl-btn-migrated-keypad');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetFavoritesSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-asset-favorite');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-asset-dropdown');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.indicatorDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
    el.classList.add('dvl-btn-migrated-indicator-dropdown');
  }
  if(options && options.role === 'tools' &&
     el.closest && (el.closest('.dvlDrawCtxBar') || el.closest('.dvlDrawSettingsPanel'))){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-tools');
    el.classList.add('dvl-btn-migrated-tools');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
    el.classList.add('dvl-btn-migrated-paper-confirm');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-edit-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
    el.classList.add('dvl-btn-migrated-paper-edit');
  }
  if(options && options.role === 'panel' &&
     el.classList.contains('drawerBtn')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-panel');
    el.classList.add('dvl-btn-migrated-drawer');
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

function getMigratedOrderOptionButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-order-option') &&
       el.classList.contains('orderTypeOption')) result.push(el);
  }
  return result;
}

function getMigratedKeypadButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-keypad')) result.push(el);
  }
  return result;
}

function getMigratedAssetFavoriteButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) result.push(el);
  }
  return result;
}

function getMigratedAssetDropdownButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) result.push(el);
  }
  return result;
}

function getMigratedIndicatorDropdownButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) result.push(el);
  }
  return result;
}

function getMigratedToolsButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-tools')) result.push(el);
  }
  return result;
}

function getMigratedPaperConfirmButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) result.push(el);
  }
  return result;
}

function getMigratedPaperEditConfirmButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-paper-edit')) result.push(el);
  }
  return result;
}

function getMigratedDrawerButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-drawer') &&
       el.classList.contains('drawerBtn')) result.push(el);
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
  var orderOptionEls = getMigratedOrderOptionButtons();
  var allDropdownEls = listByRole('dropdown');
  var orderOptionTotal = 0;
  var assetFavoriteTotal = 0;
  var assetDropdownTotal = 0;
  var indicatorDropdownTotal = 0;
  for(var i = 0; i < allDropdownEls.length; i++){
    var el = allDropdownEls[i];
    if(el.classList.contains('orderTypeOption')) orderOptionTotal++;
    if(el.classList.contains('dvl-btn-migrated-asset-favorite')) assetFavoriteTotal++;
    if(el.classList.contains('dvl-btn-migrated-asset-dropdown')) assetDropdownTotal++;
    if(el.classList.contains('dvl-btn-migrated-indicator-dropdown')) indicatorDropdownTotal++;
  }
  var keypadEls = listByRole('keypad');
  var keypadMigrated = 0;
  for(var i = 0; i < keypadEls.length; i++){
    if(keypadEls[i].classList.contains('dvl-btn-migrated-keypad')) keypadMigrated++;
  }
  var toolsEls = listByRole('tools');
  var toolsMigrated = 0;
  for(var i = 0; i < toolsEls.length; i++){
    if(toolsEls[i].classList.contains('dvl-btn-migrated-tools')) toolsMigrated++;
  }
  var paperEls = listByRole('paper');
  var paperConfirmTotal = 0;
  var paperEditConfirmTotal = 0;
  for(var i = 0; i < paperEls.length; i++){
    var el = paperEls[i];
    if(el.classList.contains('dvl-btn-migrated-paper-confirm')) paperConfirmTotal++;
    if(el.classList.contains('dvl-btn-migrated-paper-edit')) paperEditConfirmTotal++;
  }
  var drawerEls = getMigratedDrawerButtons();
  var drawerTotal = 0;
  for(var i = 0; i < allPanelEls.length; i++){
    if(allPanelEls[i].classList.contains('drawerBtn')) drawerTotal++;
  }
  var paperConfirmMigrated = getMigratedPaperConfirmButtons().length;
  var paperEditConfirmMigrated = getMigratedPaperEditConfirmButtons().length;
  var assetFavoriteMigrated = getMigratedAssetFavoriteButtons().length;
  var assetDropdownMigrated = getMigratedAssetDropdownButtons().length;
  var indicatorDropdownMigrated = getMigratedIndicatorDropdownButtons().length;
  return {
    total:                     registry.length,
    roles:                     getRoleCounts(),
    registered:                registry.length,
    observed:                  observer !== null,
    footerTotal:               footerEls.length,
    footerMigrated:            footerMigrated,
    timeframeTotal:            timeframeEls.length,
    timeframeMigrated:         timeframeMigrated,
    headerTotal:               headerEls.length,
    headerMigrated:            headerMigrated,
    iconTotal:                 iconEls.length,
    iconMigrated:              iconMigrated,
    menuTotal:                 getMigratedMenuButtons().length,
    menuMigrated:              menuEls.length,
    panelControlTotal:         allPanelEls.length,
    panelControlMigrated:      panelControlMigrated,
    drawerTotal:               drawerTotal,
    drawerMigrated:            drawerEls.length,
    orderOptionTotal:          orderOptionTotal,
    orderOptionMigrated:       orderOptionEls.length,
    keypadTotal:               keypadEls.length,
    keypadMigrated:            keypadMigrated,
    toolsTotal:                toolsEls.length,
    toolsMigrated:             toolsMigrated,
    paperConfirmTotal:         paperConfirmTotal,
    paperConfirmMigrated:      paperConfirmMigrated,
    paperEditConfirmTotal:     paperEditConfirmTotal,
    paperEditConfirmMigrated:  paperEditConfirmMigrated,
    assetFavoriteTotal:        assetFavoriteTotal,
    assetFavoriteMigrated:     assetFavoriteMigrated,
    assetDropdownTotal:        assetDropdownTotal,
    assetDropdownMigrated:     assetDropdownMigrated,
    indicatorDropdownTotal:    indicatorDropdownTotal,
    indicatorDropdownMigrated: indicatorDropdownMigrated
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:                          registry,
  registerButton:                    registerButton,
  registerBySelector:                registerBySelector,
  setState:                          setState,
  isButtonTarget:                    isButtonTarget,
  preventChartLeak:                  preventChartLeak,
  refresh:                           refresh,
  observe:                           observe,
  count:                             function(){ return registry.length; },
  getRoleCounts:                     getRoleCounts,
  listByRole:                        listByRole,
  getMigratedFooterButtons:          getMigratedFooterButtons,
  getMigratedTimeframeButtons:       getMigratedTimeframeButtons,
  getMigratedHeaderButtons:          getMigratedHeaderButtons,
  getMigratedIconButtons:            getMigratedIconButtons,
  getMigratedMenuButtons:            getMigratedMenuButtons,
  getMigratedPanelButtons:           getMigratedPanelButtons,
  getMigratedOrderOptionButtons:     getMigratedOrderOptionButtons,
  getMigratedKeypadButtons:          getMigratedKeypadButtons,
  getMigratedAssetFavoriteButtons:   getMigratedAssetFavoriteButtons,
  getMigratedAssetDropdownButtons:   getMigratedAssetDropdownButtons,
  getMigratedIndicatorDropdownButtons: getMigratedIndicatorDropdownButtons,
  getMigratedToolsButtons:           getMigratedToolsButtons,
  getMigratedPaperConfirmButtons:    getMigratedPaperConfirmButtons,
  getMigratedPaperEditConfirmButtons: getMigratedPaperEditConfirmButtons,
  getMigratedDrawerButtons:          getMigratedDrawerButtons,
  audit:                             audit,
  init:                              init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();'''

html = rep(html, OLD_MODULE, NEW_MODULE, "replace DVL_BUTTON_SYSTEM_MODULE_0653 → 0654")

# ── Write ─────────────────────────────────────────────────────────────────────
open(SRC, "w", encoding="utf-8").write(html)
print("[OK] patch_654 applied: title, DVL_APP_VERSION, badge, changelog 0.654, "
      "insert DVL_BUTTON_DRAWER_MIGRATION_CSS_0654, replace module 0653→0654")

# ── Assertions ────────────────────────────────────────────────────────────────
content = open(SRC, encoding="utf-8").read()

# Version
assert '<title>DVL Binance Live — Beta 0.654</title>' in content,                      "FAIL: title 0.654"
assert 'const DVL_APP_VERSION = "Beta 0.654"' in content,                              "FAIL: DVL_APP_VERSION 0.654"
assert 'DVL_APP_VERSION).toUpperCase()' in content,                                    "FAIL: badge auto-update"
assert '"Beta 0.654 — Phase 1.12:' in content,                                         "FAIL: changelog 0.654 entry"
assert '"Beta 0.653", note: "Phase 1.11:' in content,                                  "FAIL: changelog 0.653 preserved"

# CSS
assert 'id="DVL_BUTTON_DRAWER_MIGRATION_CSS_0654"' in content,                         "FAIL: drawer CSS id"
assert '.dvl-btn-migrated-drawer {}' in content,                                       "FAIL: dvl-btn-migrated-drawer class"
assert 'id="DVL_BUTTON_PAPER_CONFIRM_MIGRATION_CSS_0653"' in content,                  "FAIL: 0653 CSS preserved"
assert 'id="DVL_BUTTON_TOOLS_MIGRATION_CSS_0652"' in content,                          "FAIL: 0652 CSS preserved"
assert 'id="DVL_BUTTON_KEYPAD_MIGRATION_CSS_0650"' in content,                         "FAIL: 0650 CSS preserved"

# Module
assert '// ===== DVL_BUTTON_SYSTEM_MODULE_0654 =====' in content,                      "FAIL: module title 0654"
assert '// ===== DVL_BUTTON_SYSTEM_MODULE_0653 =====' not in content,                  "FAIL: old module title still present"
assert "data-dvl-button-version', '0.654'" in content,                                "FAIL: data-dvl-button-version 0.654"
assert "data-dvl-button-version', '0.653'" not in content,                            "FAIL: old data-dvl-button-version still present"

# drawerBtn migration — separate block from panelBtn/panelToggle/panelCloseX
assert "el.classList.contains('drawerBtn')" in content,                                "FAIL: drawerBtn guard"
assert "el.classList.add('dvl-btn-migrated-drawer')" in content,                       "FAIL: dvl-btn-migrated-drawer add"
assert 'function getMigratedDrawerButtons()' in content,                               "FAIL: getMigratedDrawerButtons function"
assert 'getMigratedDrawerButtons:          getMigratedDrawerButtons' in content,       "FAIL: getMigratedDrawerButtons export"

# audit() expansion
assert 'drawerTotal:' in content,                                                      "FAIL: audit drawerTotal"
assert 'drawerMigrated:' in content,                                                   "FAIL: audit drawerMigrated"

# Separate block — panelBtn guard still present without drawerBtn
assert "el.classList.contains('panelBtn') ||\n      el.classList.contains('panelToggle') ||\n      el.classList.contains('panelCloseX')" in content, "FAIL: panelBtn block still intact separate from drawerBtn"

# No nested script tag
assert '<script id="DVL_BUTTON_SYSTEM' not in content,                                 "FAIL: nested script tag"

# No xs/sm/md applied
assert "classList.add('dvl-btn-xs')" not in content,                                   "FAIL: dvl-btn-xs applied"
assert "classList.add('dvl-btn-sm')" not in content,                                   "FAIL: dvl-btn-sm applied"
assert "classList.add('dvl-btn-md')" not in content,                                   "FAIL: dvl-btn-md applied"

# No DVL_TODO_0654 remaining
assert 'DVL_TODO_0654' not in content,                                                 "FAIL: DVL_TODO_0654 still present"

# Previous migrations preserved
assert 'dvl-btn-migrated-footer' in content,                                           "FAIL: footer migration lost"
assert 'dvl-btn-migrated-timeframe' in content,                                        "FAIL: timeframe migration lost"
assert 'dvl-btn-migrated-header' in content,                                           "FAIL: header migration lost"
assert 'dvl-btn-migrated-icon' in content,                                             "FAIL: icon migration lost"
assert 'dvl-btn-migrated-menu' in content,                                             "FAIL: menu migration lost"
assert 'dvl-btn-migrated-panel' in content,                                            "FAIL: panel migration lost"
assert 'dvl-btn-migrated-order-option' in content,                                     "FAIL: order option migration lost"
assert 'dvl-btn-migrated-keypad' in content,                                           "FAIL: keypad migration lost"
assert 'dvl-btn-migrated-asset-favorite' in content,                                   "FAIL: asset-favorite migration lost"
assert 'dvl-btn-migrated-asset-dropdown' in content,                                   "FAIL: asset-dropdown migration lost"
assert 'dvl-btn-migrated-indicator-dropdown' in content,                               "FAIL: indicator-dropdown migration lost"
assert 'dvl-btn-migrated-tools' in content,                                            "FAIL: tools migration lost"
assert 'dvl-btn-migrated-paper-confirm' in content,                                    "FAIL: paper-confirm migration lost"
assert 'dvl-btn-migrated-paper-edit' in content,                                       "FAIL: paper-edit migration lost"

print("[OK] all 40 assertions passed — 0654 clean, drawerBtn migrated (separate block), prior migrations preserved")
