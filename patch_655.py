#!/usr/bin/env python3
"""patch_655.py — Beta 0.655 / Phase 1.13: visual-neutral migration of .tradeAction Buy/Sell to DVL_BUTTON_SYSTEM."""

import shutil, sys, os

SRC  = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK  = "DepthVisionLab-v106_REAL_UI/public/index-15.before_0655_trade_action_migration.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ABORT] not found: {label}"); sys.exit(1)
    if count > 1:
        print(f"[ABORT] ambiguous ({count}x): {label}"); sys.exit(1)
    return html.replace(old, new, 1)

shutil.copy2(SRC, BAK)
print(f"[OK] backup: {BAK}")

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    "<title>DVL Binance Live — Beta 0.654</title>",
    "<title>DVL Binance Live — Beta 0.655</title>",
    "title 0.654→0.655")

# ── 2. Static badge (was stuck at 0.647, fix to 0.655) ───────────────────────
html = rep(html,
    ">BETA 0.647<",
    ">BETA 0.655<",
    "static badge 0.647→0.655")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.654";',
    'const DVL_APP_VERSION = "Beta 0.655";',
    "DVL_APP_VERSION 0.654→0.655")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.654 — Phase 1.12: migração piloto visual-neutral do drawerBtn para o DVL_BUTTON_SYSTEM." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.655 — Phase 1.13: migração piloto visual-neutral dos botões Buy/Sell .tradeAction para o DVL_BUTTON_SYSTEM." },\n  { version: "Beta 0.654", note: "Phase 1.12: migração piloto visual-neutral do drawerBtn para o DVL_BUTTON_SYSTEM." },',
    "changelog 0.655 entry")

# ── 5. CSS block ──────────────────────────────────────────────────────────────
html = rep(html,
    ".dvl-btn-migrated-drawer {}\n</style>\n\n<style>\n:root{",
    ".dvl-btn-migrated-drawer {}\n</style>\n\n<style id=\"DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655\">\n/* DVL Beta 0.655 — Phase 1.13: tradeAction migration pilot.\n   Visual-neutral diagnostic class for migrated Buy/Sell buttons.\n   Does NOT alter height, padding, gap, radius, color, font or layout. */\n.dvl-btn-migrated-trade-action {}\n</style>\n\n<style>\n:root{",
    "insert DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655")

# ── 6. Whole-module replacement 0654 → 0655 ──────────────────────────────────
OLD_MODULE = """// ===== DVL_BUTTON_SYSTEM_MODULE_0654 =====
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

})();"""

NEW_MODULE = """// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====
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
  el.setAttribute('data-dvl-button-version', '0.655');
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
  if(options && options.role === 'trade' &&
     el.classList.contains('tradeAction')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-trade');
    el.classList.add('dvl-btn-migrated-trade-action');
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

function getMigratedTradeActionButtons(){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    var el = registry[i];
    if(el.classList.contains('dvl-btn-migrated-trade-action') &&
       el.classList.contains('tradeAction')) result.push(el);
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
  var tradeEls = listByRole('trade');
  var tradeActionTotal = 0;
  var tradeActionMigrated = 0;
  var buyTradeActionTotal = 0;
  var sellTradeActionTotal = 0;
  for(var i = 0; i < tradeEls.length; i++){
    var el = tradeEls[i];
    if(el.classList.contains('tradeAction')){
      tradeActionTotal++;
      if(el.classList.contains('dvl-btn-migrated-trade-action')) tradeActionMigrated++;
      if(el.classList.contains('buy')) buyTradeActionTotal++;
      if(el.classList.contains('sell')) sellTradeActionTotal++;
    }
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
    tradeActionTotal:          tradeActionTotal,
    tradeActionMigrated:       tradeActionMigrated,
    buyTradeActionTotal:       buyTradeActionTotal,
    sellTradeActionTotal:      sellTradeActionTotal,
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
  getMigratedTradeActionButtons:     getMigratedTradeActionButtons,
  audit:                             audit,
  init:                              init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();"""

html = rep(html, OLD_MODULE, NEW_MODULE, "replace module 0654→0655")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_655 applied: title, badge, DVL_APP_VERSION, badge, changelog 0.655, insert DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655, replace module 0654→0655")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# version strings
assert "<title>DVL Binance Live — Beta 0.655</title>" in content, "FAIL: title"
assert 'const DVL_APP_VERSION = "Beta 0.655";' in content, "FAIL: DVL_APP_VERSION"
assert ">BETA 0.655<" in content, "FAIL: static badge"
assert "data-dvl-button-version', '0.655'" in content, "FAIL: data-dvl-button-version"

# old version strings gone
assert "<title>DVL Binance Live — Beta 0.654</title>" not in content, "FAIL: old title present"
assert 'const DVL_APP_VERSION = "Beta 0.654";' not in content, "FAIL: old DVL_APP_VERSION present"
assert ">BETA 0.647<" not in content, "FAIL: old static badge 0.647 present"
assert "data-dvl-button-version', '0.654'" not in content, "FAIL: old data-dvl-button-version present"

# changelog
assert 'Beta 0.655 — Phase 1.13: migração piloto visual-neutral dos botões Buy/Sell .tradeAction para o DVL_BUTTON_SYSTEM.' in content, "FAIL: changelog 0.655"
assert '"Beta 0.654", note: "Phase 1.12:' in content, "FAIL: old 0.654 changelog entry"

# CSS block
assert '<style id="DVL_BUTTON_TRADE_ACTION_MIGRATION_CSS_0655">' in content, "FAIL: CSS style tag"
assert '.dvl-btn-migrated-trade-action {}' in content, "FAIL: CSS class"
assert '<style id="DVL_BUTTON_DRAWER_MIGRATION_CSS_0654">' in content, "FAIL: drawer CSS still present"

# module
assert 'DVL_BUTTON_SYSTEM_MODULE_0655' in content, "FAIL: module 0655"
assert 'DVL_BUTTON_SYSTEM_MODULE_0654' not in content, "FAIL: old module 0654 still present"

# tradeAction migration block in registerButton
assert "options.role === 'trade' &&\n     el.classList.contains('tradeAction')" in content, "FAIL: tradeAction guard"
assert "el.classList.add('dvl-btn-trade')" in content, "FAIL: dvl-btn-trade class add"
assert "el.classList.add('dvl-btn-migrated-trade-action')" in content, "FAIL: dvl-btn-migrated-trade-action add"

# getMigratedTradeActionButtons defined and exported
assert "function getMigratedTradeActionButtons()" in content, "FAIL: getMigratedTradeActionButtons defined"
assert "el.classList.contains('dvl-btn-migrated-trade-action') &&\n       el.classList.contains('tradeAction')" in content, "FAIL: getMigratedTradeActionButtons body"
assert "getMigratedTradeActionButtons:     getMigratedTradeActionButtons," in content, "FAIL: getMigratedTradeActionButtons exported"

# audit tradeAction fields
assert "tradeActionTotal" in content, "FAIL: tradeActionTotal in audit"
assert "tradeActionMigrated" in content, "FAIL: tradeActionMigrated in audit"
assert "buyTradeActionTotal" in content, "FAIL: buyTradeActionTotal"
assert "sellTradeActionTotal" in content, "FAIL: sellTradeActionTotal"
assert "tradeActionTotal:          tradeActionTotal," in content, "FAIL: tradeActionTotal in return"
assert "tradeActionMigrated:       tradeActionMigrated," in content, "FAIL: tradeActionMigrated in return"
assert "buyTradeActionTotal:       buyTradeActionTotal," in content, "FAIL: buyTradeActionTotal in return"
assert "sellTradeActionTotal:      sellTradeActionTotal," in content, "FAIL: sellTradeActionTotal in return"

# no size classes applied in JS
assert "classList.add('dvl-btn-xs')" not in content, "FAIL: dvl-btn-xs applied"
assert "classList.add('dvl-btn-sm')" not in content, "FAIL: dvl-btn-sm applied"
assert "classList.add('dvl-btn-md')" not in content, "FAIL: dvl-btn-md applied"

# no nested script
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script tag"

# zero DVL_TODO_0655
assert 'DVL_TODO_0655' not in content, "FAIL: DVL_TODO_0655 remaining"

# prior migrations preserved
assert "dvl-btn-migrated-footer" in content, "FAIL: footer migration"
assert "dvl-btn-migrated-timeframe" in content, "FAIL: timeframe migration"
assert "dvl-btn-migrated-header" in content, "FAIL: header migration"
assert "dvl-btn-migrated-icon" in content, "FAIL: icon migration"
assert "dvl-btn-migrated-menu" in content, "FAIL: menu migration"
assert "dvl-btn-migrated-panel" in content, "FAIL: panel migration"
assert "dvl-btn-migrated-order-option" in content, "FAIL: order-option migration"
assert "dvl-btn-migrated-keypad" in content, "FAIL: keypad migration"
assert "dvl-btn-migrated-asset-favorite" in content, "FAIL: asset-favorite migration"
assert "dvl-btn-migrated-asset-dropdown" in content, "FAIL: asset-dropdown migration"
assert "dvl-btn-migrated-indicator-dropdown" in content, "FAIL: indicator-dropdown migration"
assert "dvl-btn-migrated-tools" in content, "FAIL: tools migration"
assert "dvl-btn-migrated-paper-confirm" in content, "FAIL: paper-confirm migration"
assert "dvl-btn-migrated-paper-edit" in content, "FAIL: paper-edit migration"
assert "dvl-btn-migrated-drawer" in content, "FAIL: drawer migration"

# Buy/Sell HTML buttons untouched (no new classes on them statically)
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML changed"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML changed"

# DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# drawer still separate
assert "options.role === 'panel' &&\n     el.classList.contains('drawerBtn')" in content, "FAIL: drawerBtn block"
assert "getMigratedDrawerButtons:          getMigratedDrawerButtons," in content, "FAIL: getMigratedDrawerButtons exported"

print("[OK] all 44 assertions passed — 0655 clean, tradeAction migrated (independent block), prior migrations preserved")
