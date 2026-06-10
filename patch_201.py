# patch_201.py — Beta 0.201
# 1. Infinite TP/SL edit: only check _mod buttons when _pendingMod is non-null
#    so stale _drawCache entries don't block drag after confirm
# 2. Buttons: explicit background on inner <button> elements — WebKit ignores
#    container bg when button has system appearance even with background:none

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

errors = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    return html.replace(old, new)

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    return html.replace(old, new)

# ── 1. version bump ──────────────────────────────────────────────────────────
html = rep_all(html, 'Beta 0.200', 'Beta 0.201', 'version bump')

# ── 2. CSS: explicit bg on inner button elements (WebKit fix) ─────────────────
# Replace the .dtb-main and .dtb-arrow color rules with explicit background
html = rep(html,
    '.dtb-main{flex:1;background:none;border:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;padding:0 8px;text-align:left;height:100%;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.dtb-main{flex:1;background:transparent;border:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;padding:0 8px;text-align:left;height:100%;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-appearance:none;appearance:none;}',
    'dtb-main base'
)
html = rep(html,
    '.dtb-main.buy{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);}\n'
    '.dtb-main.buy:hover{background:rgba(255,255,255,.08);}\n'
    '.dtb-main.buy:active{background:rgba(255,255,255,.18);}\n'
    '.dtb-main.sell{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);}\n'
    '.dtb-main.sell:hover{background:rgba(255,255,255,.08);}\n'
    '.dtb-main.sell:active{background:rgba(255,255,255,.18);}',
    '.dtb-main.buy{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);background:#009e3c;}\n'
    '.dtb-main.buy:hover{background:#00b544;}\n'
    '.dtb-main.buy:active{background:#00cc4e;}\n'
    '.dtb-main.sell{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);background:#b81422;}\n'
    '.dtb-main.sell:hover{background:#cc1828;}\n'
    '.dtb-main.sell:active{background:#e01d2e;}',
    'dtb-main buy/sell explicit bg'
)
html = rep(html,
    '.dtb-arrow{width:26px;flex-shrink:0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;height:100%;transition:background .1s;padding:0;}',
    '.dtb-arrow{width:26px;flex-shrink:0;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;height:100%;transition:background .1s;padding:0;-webkit-appearance:none;appearance:none;}',
    'dtb-arrow base'
)
html = rep(html,
    '.dtb-arrow.buy{border-left:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.80);}\n'
    '.dtb-arrow.buy:hover{background:rgba(255,255,255,.12);color:#fff;}\n'
    '.dtb-arrow.buy:active{background:rgba(255,255,255,.22);}\n'
    '.dtb-arrow.sell{border-left:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.80);}\n'
    '.dtb-arrow.sell:hover{background:rgba(255,255,255,.12);color:#fff;}\n'
    '.dtb-arrow.sell:active{background:rgba(255,255,255,.22);}',
    '.dtb-arrow.buy{border-left:1px solid rgba(255,255,255,.28);color:#fff;background:#007a2f;}\n'
    '.dtb-arrow.buy:hover{background:#009036;}\n'
    '.dtb-arrow.buy:active{background:#00a33e;}\n'
    '.dtb-arrow.sell{border-left:1px solid rgba(255,255,255,.28);color:#fff;background:#8f0f1a;}\n'
    '.dtb-arrow.sell:hover{background:#a3131f;}\n'
    '.dtb-arrow.sell:active{background:#b81422;}',
    'dtb-arrow buy/sell explicit bg'
)

# ── 3. Infinite TP/SL edit: guard _mod check with _pendingMod != null ─────────
# Stale _mod entries in _drawCache (from last render frame) would intercept
# touch events right after _confirmMod/_cancelMod cleared _pendingMod, blocking
# the very next drag attempt. Wrapping in if(_pendingMod) prevents this.
html = rep(html,
    '    /* check _pendingMod confirm/cancel buttons */\n'
    '    for(var mi=0;mi<_drawCache.length;mi++){\n'
    '      var mb=_drawCache[mi];\n'
    "      if(mb.posId==='_mod'&&cx>=mb.x&&cx<=mb.x+mb.w&&cy>=mb.y&&cy<=mb.y+mb.h){\n"
    '        e.preventDefault();e.stopPropagation();\n'
    "        if(mb.field==='mod_confirm')_confirmMod();\n"
    "        else if(mb.field==='mod_cancel')_cancelMod();\n"
    '        return;\n'
    '      }\n'
    '    }',
    '    /* check _pendingMod confirm/cancel buttons — only when pendingMod is live */\n'
    '    if(_pendingMod){\n'
    '      for(var mi=0;mi<_drawCache.length;mi++){\n'
    '        var mb=_drawCache[mi];\n'
    "        if(mb.posId==='_mod'&&cx>=mb.x&&cx<=mb.x+mb.w&&cy>=mb.y&&cy<=mb.y+mb.h){\n"
    '          e.preventDefault();e.stopPropagation();\n'
    "          if(mb.field==='mod_confirm')_confirmMod();\n"
    "          else if(mb.field==='mod_cancel')_cancelMod();\n"
    '          return;\n'
    '        }\n'
    '      }\n'
    '    }',
    '_mod guard with if(_pendingMod)'
)

# ── result ───────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS:')
    for e in errors:
        print(' ', e)
else:
    with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('patch_201.py applied — Beta 0.201')
    print('  + Buttons: explicit bg on dtb-main/dtb-arrow (#009e3c / #b81422) + -webkit-appearance:none')
    print('  + Infinite TP/SL edit: _mod button check wrapped in if(_pendingMod)')
    print('    stale cache entries no longer intercept drag after confirm/cancel')
