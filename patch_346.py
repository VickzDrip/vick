# patch_346.py — Beta 0.346
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.345)
#
# EMERGENCY: stop all auto-reload, version flicker, cache loops,
# BroadcastChannel and duplicate initialization.
#
# Changes:
#  1. Replace BOTH DVL_FORCE_UPDATE_MANAGER blocks with a definitive
#     no-op version: no checkVersion(), no BroadcastChannel, no storage
#     listener, no clearRuntimeCaches, no caches.delete, no SKIP_WAITING,
#     no serviceWorker update.  Only visibilitychange→drawSoon remains.
#  2. Replace first DVL_APP_VERSION block with a single authoritative lock:
#     const DVL_APP_VERSION = "Beta 0.346"; — changelog included.
#  3. Gut second DVL_APP_VERSION block to a comment-only stub.
#  4. Version bump: 0.345 → 0.346 in remaining VER constant + static badges.

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    fixes.append(label)
    return html.replace(old, new)

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    fixes.append('%s (x%d)' % (label, html.count(old)))
    return html.replace(old, new)

# ── 1. Replace both DVL_FORCE_UPDATE_MANAGER blocks ─────────────────────────
# Both copies are byte-identical → rep_all replaces them both in one pass.
OLD_UPD = (
    '<script id="DVL_FORCE_UPDATE_MANAGER">\n'
    '/* ── DVL forced update manager — Beta 0.312 ────────────────────────────────\n'
    '   If /api/version changes, all open tabs reload with cache busting. */\n'
    '(function(){\n'
    '  const CHANNEL = "dvl_updates";\n'
    '  const LOCAL_VERSION = "Beta 0.345";\n'
    '  let remoteSeen = null;\n'
    '  let checking = false;\n'
    '  let bc = null;\n'
    '\n'
    '  function versionSlug(v){\n'
    '    return String(v || "").replace(/[^\\w.-]+/g, "_");\n'
    '  }\n'
    '\n'
    '  async function clearRuntimeCaches(){\n'
    '    try{\n'
    '      if("caches" in window){\n'
    '        const keys = await caches.keys();\n'
    '        await Promise.all(keys.map(k => caches.delete(k)));\n'
    '      }\n'
    '    }catch(e){ console.warn("[DVL Update] cache clear failed", e); }\n'
    '\n'
    '    try{\n'
    '      if(navigator.serviceWorker){\n'
    '        const regs = await navigator.serviceWorker.getRegistrations();\n'
    '        await Promise.all(regs.map(async reg => {\n'
    '          try{ await reg.update(); }catch(_){}\n'
    '          try{ if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"}); }catch(_){}\n'
    '        }));\n'
    '      }\n'
    '    }catch(e){ console.warn("[DVL Update] service worker update failed", e); }\n'
    '  }\n'
    '\n'
    '  async function forceReloadToLatest(version){\n'
    '    /* auto-reload disabled — server version mismatch is expected during patching */\n'
    '    console.warn("[DVL] version check (no reload):", version);\n'
    '  }\n'
    '\n'
    '  async function checkVersion(reason){\n'
    '    if(checking) return;\n'
    '    checking = true;\n'
    '    try{\n'
    '      const r = await fetch("/api/version?ts=" + Date.now(), {cache:"no-store"});\n'
    '      if(!r.ok) return;\n'
    '      const d = await r.json();\n'
    '      const rv = d && (d.v || d.version);\n'
    '      if(!rv) return;\n'
    '      if(!remoteSeen){ remoteSeen = rv; }\n'
    '      const loaded = window.DVL_APP_VERSION || LOCAL_VERSION;\n'
    '      if(rv !== loaded){\n'
    '        console.warn("[DVL Update] version changed", {reason, loaded, remote:rv});\n'
    '        await forceReloadToLatest(rv);\n'
    '      }\n'
    '    }catch(e){\n'
    '      // version endpoint may not exist in local dev; keep silent to avoid noise.\n'
    '    }finally{\n'
    '      checking = false;\n'
    '    }\n'
    '  }\n'
    '\n'
    '  try{\n'
    '    bc = new BroadcastChannel(CHANNEL);\n'
    '    bc.onmessage = function(ev){\n'
    '      const msg = ev.data || {};\n'
    '      if(msg.type === "DVL_FORCE_RELOAD" && msg.version && msg.version !== (window.DVL_APP_VERSION || LOCAL_VERSION)){\n'
    '        forceReloadToLatest(msg.version);\n'
    '      }\n'
    '    };\n'
    '  }catch(_){}\n'
    '\n'
    '  window.addEventListener("storage", function(e){\n'
    '    if(e.key === "dvl_force_reload_signal" && e.newValue){\n'
    '      const version = String(e.newValue).split("|")[0];\n'
    '      if(version && version !== (window.DVL_APP_VERSION || LOCAL_VERSION)) forceReloadToLatest(version);\n'
    '    }\n'
    '  });\n'
    '\n'
    '  /* visibility redraw only — no version check, no reload (forceReloadToLatest is a no-op) */\n'
    '  document.addEventListener("visibilitychange", function(){\n'
    '    if(!document.hidden){ requestAnimationFrame(function(){ try{if(window.drawSoon)window.drawSoon();}catch(_){} }); }\n'
    '  });\n'
    '  document.addEventListener("DOMContentLoaded", function(){\n'
    '    localStorage.setItem("dvl_loaded_version", window.DVL_APP_VERSION || LOCAL_VERSION);\n'
    '  });\n'
    '  /* pageshow/focus/online/interval checkVersion calls removed — polling is pointless since forceReloadToLatest is stubbed */\n'
    '})();\n'
    '</script>'
)
NEW_UPD = (
    '<script id="DVL_FORCE_UPDATE_MANAGER">\n'
    '/* ── DVL update manager — Beta 0.346 ────────────────────────────────────────\n'
    '   Auto-reload REMOVED. No checkVersion, no BroadcastChannel, no storage\n'
    '   listener, no caches.delete, no serviceWorker update, no setInterval.\n'
    '   forceReloadToLatest is a definitive no-op.\n'
    '   visibilitychange → drawSoon only. */\n'
    '(function(){\n'
    '  const LOCAL_VERSION = "Beta 0.346";\n'
    '  function forceReloadToLatest(v){ console.warn("[DVL] version noop:", v); }\n'
    '  document.addEventListener("visibilitychange", function(){\n'
    '    if(!document.hidden){ requestAnimationFrame(function(){ try{if(window.drawSoon)window.drawSoon();}catch(_){} }); }\n'
    '  });\n'
    '  document.addEventListener("DOMContentLoaded", function(){\n'
    '    localStorage.setItem("dvl_loaded_version", window.DVL_APP_VERSION || LOCAL_VERSION);\n'
    '  });\n'
    '})();\n'
    '</script>'
)
html = rep_all(html, OLD_UPD, NEW_UPD, 'DVL_FORCE_UPDATE_MANAGER: remove checkVersion/BroadcastChannel/storage/cache (both copies)')

# ── 2. Replace first DVL_APP_VERSION block (in first head, ~line 2460) ───────
OLD_VER1 = (
    '<script id="DVL_APP_VERSION">\n'
    '/* ── DVL Version — increment by +0.001 on EVERY change ── */\n'
    '/* guard: second copy of this script (at line ~8745) does nothing */\n'
    'if(!window.DVL_APP_VERSION){\n'
    '  window.DVL_APP_VERSION = "Beta 0.345";\n'
    '  /* lock: prevents ALL legacy setVersion/forceVersion from overwriting */\n'
    '  try{Object.defineProperty(window,"DVL_APP_VERSION",{\n'
    '    value:"Beta 0.345",writable:false,configurable:false,enumerable:true\n'
    '  });}catch(_){}\n'
    '  /* clear all stale reload and version signals */\n'
    '  ["dvl_force_reload_signal","dvl_last_reload_version","dvl_pending_force_reload",\n'
    '   "dvl308_clean_reload","dvl309_clean_reload","dvl310_clean_reload"].forEach(function(k){\n'
    '    try{localStorage.removeItem(k);}catch(_){}\n'
    '  });\n'
    '  /* enforce badge after all legacy setVersion() timeouts */\n'
    '  var _dvlVLock=window.DVL_APP_VERSION;\n'
    '  function _dvlEnforceBadge(){\n'
    '    document.querySelectorAll(\'#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.version-badge,.beta-badge\').forEach(function(el){\n'
    '      if(el&&el.textContent!==_dvlVLock)el.textContent=_dvlVLock;\n'
    '    });\n'
    '  }\n'
    '  document.addEventListener(\'DOMContentLoaded\',function(){\n'
    '    _dvlEnforceBadge();\n'
    '    setTimeout(_dvlEnforceBadge,3000);\n'
    '  });\n'
    '}\n'
    '\n'
    'function applyDVLVersionBadge(){\n'
    '  var el = document.getElementById(\'dvlVersionBadge\');\n'
    '  if(!el){\n'
    '    var host=document.querySelector(\'.tb-header\')||document.querySelector(\'.topbar\');\n'
    '    if(host){\n'
    '      el=document.createElement(\'span\');\n'
    '      el.id=\'dvlVersionBadge\';\n'
    '      el.className=\'dvl-version-badge dvl-version-header\';\n'
    '      var asset=document.querySelector(\'.tb-asset-wrap\');\n'
    '      if(asset&&asset.parentNode)asset.parentNode.insertBefore(el,asset.nextSibling);\n'
    '      else host.appendChild(el);\n'
    '    }\n'
    '  }\n'
    '  if(el) el.textContent = window.DVL_APP_VERSION;\n'
    '}\n'
    'document.addEventListener(\'DOMContentLoaded\', applyDVLVersionBadge);\n'
    '</script>'
)
NEW_VER1 = (
    '<script id="DVL_APP_VERSION">\n'
    '/* ── DVL Version — Beta 0.346 — single source of truth ─────────────────────\n'
    '   Beta 0.346\n'
    '   - Emergência: removido reload automático/cache-busting/version polling duplicado.\n'
    '   - DVL_FORCE_UPDATE_MANAGER consolidado em um único bloco sem reload.\n'
    '   - Versão centralizada para evitar loop de atualização e flicker. */\n'
    'const DVL_APP_VERSION = "Beta 0.346";\n'
    'window.DVL_APP_VERSION = DVL_APP_VERSION;\n'
    'try{Object.defineProperty(window,"DVL_APP_VERSION",{\n'
    '  value:DVL_APP_VERSION,writable:false,configurable:false,enumerable:true\n'
    '});}catch(_){}\n'
    '["dvl_force_reload_signal","dvl_last_reload_version","dvl_pending_force_reload",\n'
    ' "dvl308_clean_reload","dvl309_clean_reload","dvl310_clean_reload"].forEach(function(k){\n'
    '  try{localStorage.removeItem(k);}catch(_){}\n'
    '});\n'
    'function _dvlEnforceBadge(){\n'
    '  document.querySelectorAll(\'#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.version-badge,.beta-badge\').forEach(function(el){\n'
    '    if(el&&el.textContent!==DVL_APP_VERSION)el.textContent=DVL_APP_VERSION;\n'
    '  });\n'
    '}\n'
    'function applyDVLVersionBadge(){\n'
    '  var el=document.getElementById(\'dvlVersionBadge\');\n'
    '  if(!el){\n'
    '    var host=document.querySelector(\'.tb-header\')||document.querySelector(\'.topbar\');\n'
    '    if(host){\n'
    '      el=document.createElement(\'span\');\n'
    '      el.id=\'dvlVersionBadge\';\n'
    '      el.className=\'dvl-version-badge dvl-version-header\';\n'
    '      var asset=document.querySelector(\'.tb-asset-wrap\');\n'
    '      if(asset&&asset.parentNode)asset.parentNode.insertBefore(el,asset.nextSibling);\n'
    '      else host.appendChild(el);\n'
    '    }\n'
    '  }\n'
    '  if(el)el.textContent=DVL_APP_VERSION;\n'
    '}\n'
    'document.addEventListener(\'DOMContentLoaded\',function(){\n'
    '  _dvlEnforceBadge();\n'
    '  applyDVLVersionBadge();\n'
    '  setTimeout(_dvlEnforceBadge,1000);\n'
    '  setTimeout(_dvlEnforceBadge,4000);\n'
    '});\n'
    '</script>'
)
html = rep(html, OLD_VER1, NEW_VER1, 'DVL_APP_VERSION first block: rewrite with const, single lock, changelog')

# ── 3. Gut second DVL_APP_VERSION block (in second body area, ~line 8758) ────
OLD_VER2 = (
    '<script id="DVL_APP_VERSION">\n'
    '/* ── DVL Version — increment by +0.001 on EVERY change ── */\n'
    '/* guard: second copy of this script (at line ~8745) does nothing */\n'
    'if(!window.DVL_APP_VERSION){\n'
    '  window.DVL_APP_VERSION = "Beta 0.345";\n'
    '  /* lock: prevents ALL legacy setVersion/forceVersion from overwriting */\n'
    '  try{Object.defineProperty(window,"DVL_APP_VERSION",{\n'
    '    value:"Beta 0.345",writable:false,configurable:false,enumerable:true\n'
    '  });}catch(_){}\n'
    '  /* clear all stale reload and version signals */\n'
    '  ["dvl_force_reload_signal","dvl_last_reload_version","dvl_pending_force_reload",\n'
    '   "dvl308_clean_reload","dvl309_clean_reload","dvl310_clean_reload"].forEach(function(k){\n'
    '    try{localStorage.removeItem(k);}catch(_){}\n'
    '  });\n'
    '}\n'
    '\n'
    'function applyDVLVersionBadge(){\n'
    '  var el = document.getElementById(\'dvlVersionBadge\');\n'
    '  if(!el){\n'
    '    var host=document.querySelector(\'.tb-header\')||document.querySelector(\'.topbar\');\n'
    '    if(host){\n'
    '      el=document.createElement(\'span\');\n'
    '      el.id=\'dvlVersionBadge\';\n'
    '      el.className=\'dvl-version-badge dvl-version-header\';\n'
    '      var asset=document.querySelector(\'.tb-asset-wrap\');\n'
    '      if(asset&&asset.parentNode)asset.parentNode.insertBefore(el,asset.nextSibling);\n'
    '      else host.appendChild(el);\n'
    '    }\n'
    '  }\n'
    '  if(el) el.textContent = window.DVL_APP_VERSION;\n'
    '}\n'
    'document.addEventListener(\'DOMContentLoaded\', applyDVLVersionBadge);\n'
    '</script>'
)
NEW_VER2 = (
    '<script id="DVL_APP_VERSION">\n'
    '/* Beta 0.346: version already locked by first DVL_APP_VERSION block — intentionally empty */\n'
    '</script>'
)
html = rep(html, OLD_VER2, NEW_VER2, 'DVL_APP_VERSION second block: gut to empty stub')

# ── 4. Version bump: VER constant in DVL_BETA_0334 script ────────────────────
html = rep(html,
    "  const VER='Beta 0.345';",
    "  const VER='Beta 0.346';",
    'VER 0.345→0.346 in DVL_BETA_0334 script'
)

# ── 5. Update static badge HTML (both topbar copies, 4 spans total) ──────────
html = rep_all(html,
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.345</span>',
    'id="dvlVersionBadge" class="dvl-version-badge dvl-version-header">Beta 0.346</span>',
    'static dvlVersionBadge 0.345→0.346'
)
html = rep_all(html,
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.345</span>',
    'class="dvl-version-badge dvl-version-logo-hidden">Beta 0.346</span>',
    'static dvl-version-logo-hidden 0.345→0.346'
)

# ── 6. Update changelog note ─────────────────────────────────────────────────
html = rep(html,
    "'Beta 0.345: Removed stray </head><body> tags, moved </body></html> to end of file (patches now inside body).'",
    "'Beta 0.346: Emergency — removed auto-reload/BroadcastChannel/checkVersion/caches.delete; single DVL_FORCE_UPDATE_MANAGER no-op; const DVL_APP_VERSION lock.'",
    'changelog note 0.346'
)

# ── result ────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors:
        print('  ', e)
    if len(errors) > 3:
        print('Too many errors — aborting write.')
        import sys; sys.exit(1)
else:
    print('All replacements succeeded.')

if fixes:
    print('Applied (%d fixes):' % len(fixes))
    for f in fixes:
        print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)
print()
print('Written to', DST)
print()
print('Beta 0.346:')
print('  - DVL_FORCE_UPDATE_MANAGER (both copies): checkVersion/BroadcastChannel/')
print('    storage listener/clearRuntimeCaches/caches.delete/serviceWorker removed')
print('  - forceReloadToLatest: definitive no-op (console.warn only)')
print('  - visibilitychange: drawSoon only, no version check')
print('  - DVL_APP_VERSION first block: const DVL_APP_VERSION = "Beta 0.346" (single lock)')
print('  - DVL_APP_VERSION second block: gutted to empty stub')
print('  - Static badges: 0.345→0.346')
print('  - Version: Beta 0.346')
