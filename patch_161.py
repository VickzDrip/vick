#!/usr/bin/env python3
"""patch_161.py — Beta 0.161: Fix phantom gear buttons on oscillator panels
   Root causes:
   1. updateBtns() used requestAnimationFrame → 1-frame lag where button
      stayed visible/interactive after panel was turned off
   2. display:none without pointer-events:none → invisible buttons still
      captured taps in some browsers/iOS
   3. hookDraw only installed at 0ms/300ms/1200ms → if another script
      wrapped window.draw after 1200ms, updateBtns stopped being called

   Fix: Replace DVL_BETA_0063 with improved version:
   - updateBtns() called SYNCHRONOUSLY after draw (no RAF lag)
   - pointer-events:none set together with display:none
   - hookDraw re-installs itself periodically (every 2s for 10s)
   - Aggressive hide: any time panelActive=false OR hitbox null → hide + pointer-events:none
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.160') >= 10, 'Beta 0.160 not found'
html = html.replace('Beta 0.160', 'Beta 0.161')

# ── Replace DVL_BETA_0063 with improved version ───────────────────────────────
OLD_063_START = '<script id="DVL_BETA_0063_OSC_GEAR_FIX">'
OLD_063_END   = '})();\n</script>'

assert OLD_063_START in html, 'DVL_BETA_0063 start not found'
s_start = html.index(OLD_063_START)
s_end   = html.index(OLD_063_END, s_start) + len(OLD_063_END)
old_063_block = html[s_start:s_end]

NEW_063 = r"""<script id="DVL_BETA_0063_OSC_GEAR_FIX">
/* Beta 0.161 — Improved DOM overlay buttons for canvas-drawn oscillator gears.
   - updateBtns() runs SYNCHRONOUSLY after draw (no requestAnimationFrame lag)
   - pointer-events:none set on hide (invisible element cannot capture taps)
   - hookDraw re-checks every 2 s to catch late draw-wrappers from other scripts
   - Phantom buttons fully eliminated: hide fires before next paint frame */
(function(){
  'use strict';
  var KEYS=['flow','clarity'];
  var SETTINGS={flow:'flowAccel',clarity:'hvnClarity'};

  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}

  function openSettings(settingsKey){
    var gear=document.querySelector('.gear[data-settings="'+settingsKey+'"]');
    if(typeof window.openInputModal==='function'){
      window.openInputModal(settingsKey,gear||null);
    } else if(gear){
      gear.click();
    }
  }

  function hideBtn(btn){
    btn.style.display='none';
    btn.style.pointerEvents='none';
  }

  function showBtn(btn,b){
    var cx=(b.x1+b.x2)/2,cy=(b.y1+b.y2)/2;
    var w=Math.max(44,b.x2-b.x1),h=Math.max(44,b.y2-b.y1);
    btn.style.left=(cx-w/2)+'px';
    btn.style.top=(cy-h/2)+'px';
    btn.style.width=w+'px';
    btn.style.height=h+'px';
    btn.style.display='block';
    btn.style.pointerEvents='auto';
  }

  function makeBtns(){
    var wrap=document.getElementById('chartWrap');
    if(!wrap)return;
    KEYS.forEach(function(key){
      var id='dvlOscGearOverlay_'+key;
      var old=document.getElementById(id);
      if(old&&old.tagName==='BUTTON')old.remove();
      if(document.getElementById(id))return;
      var btn=document.createElement('div');
      btn.id=id;
      btn.setAttribute('role','button');
      btn.setAttribute('aria-label',key==='flow'?'DVL Flow Settings':'Trend Clarity Settings');
      btn.style.cssText=[
        'position:absolute',
        'background:none',
        'border:none',
        'outline:none',
        'padding:0',
        'margin:0',
        'min-width:44px',
        'min-height:44px',
        'z-index:20',
        'cursor:pointer',
        'touch-action:manipulation',
        'pointer-events:none',
        'display:none',
        '-webkit-tap-highlight-color:transparent',
        'user-select:none',
        '-webkit-user-select:none',
        'box-sizing:border-box'
      ].join(';');
      var sk=SETTINGS[key];
      btn.addEventListener('touchstart',function(e){
        e.stopPropagation();
        e.preventDefault();
        openSettings(sk);
      },{passive:false,capture:false});
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        openSettings(sk);
      },{capture:false});
      wrap.appendChild(btn);
    });
  }

  /* updateBtns — called SYNCHRONOUSLY at end of draw().
     Rule: if panel is not active OR hitbox is null → hide + pointer-events:none.
     Never leave a button visible/interactive when the gear is not drawn. */
  function updateBtns(){
    var hit=window._dvlOscGearHit;
    KEYS.forEach(function(key){
      var btn=document.getElementById('dvlOscGearOverlay_'+key);
      if(!btn)return;
      var indKey=SETTINGS[key];
      var panelActive=!!(window.S&&window.S.inds&&window.S.inds[indKey]&&window.S.candles&&window.S.candles.length);
      if(!panelActive||!hit||!hit[key]){hideBtn(btn);return;}
      showBtn(btn,hit[key]);
    });
  }

  /* hookDraw — wraps window.draw so updateBtns runs after every draw call.
     Re-checks periodically to catch late wrappers from other beta scripts. */
  var _hookAttempts=0;
  function hookDraw(){
    var old=window.draw;
    if(typeof old!=='function'){return;}
    if(old.__dvl063v2GearOverlay){return;}
    var wrapped=function(){
      var res=old.apply(this,arguments);
      updateBtns();
      return res;
    };
    wrapped.__dvl063v2GearOverlay=true;
    // preserve flags from previous wrappers
    ['__dvl063GearOverlay','__dvlBeta0041OscCrossOverlay'].forEach(function(f){
      if(old[f])wrapped[f]=true;
    });
    try{window.draw=wrapped;}catch(_){}
  }

  ready(function(){
    makeBtns();
    hookDraw();
    // Re-check every 2s for 10s — covers late-loading scripts that re-wrap draw
    var _iv=setInterval(function(){
      hookDraw();
      updateBtns();
      _hookAttempts++;
      if(_hookAttempts>=5)clearInterval(_iv);
    },2000);
    window.addEventListener('resize',function(){updateBtns();},{passive:true});
  });

  setTimeout(function(){makeBtns();hookDraw();updateBtns();},300);
  setTimeout(function(){hookDraw();updateBtns();},1500);

  /* Expose so other scripts can call directly after state changes */
  window.__dvlUpdateOscGearBtns=updateBtns;
})();
</script>"""

assert old_063_block in html, 'Full DVL_BETA_0063 block not found in html'
html = html.replace(old_063_block, NEW_063, 1)

# ── Also ensure indicator toggle calls updateBtns immediately ─────────────────
# Find the row switch change handler that toggles S.inds
# The toggle for oscillators goes through the .switch input change handler
# We hook: after any S.inds change that affects clarity/flow, call __dvlUpdateOscGearBtns
OLD_IND_TOGGLE = (
    "if(n.dataset.ind in S.inds){"
    "S.inds[n.dataset.ind]=n.checked;"
)
if OLD_IND_TOGGLE in html:
    html = html.replace(OLD_IND_TOGGLE,
        "if(n.dataset.ind in S.inds){"
        "S.inds[n.dataset.ind]=n.checked;"
        "if(typeof window.__dvlUpdateOscGearBtns==='function')window.__dvlUpdateOscGearBtns();",
        1)
    print('Patched: indicator toggle now calls __dvlUpdateOscGearBtns immediately')
else:
    print('WARNING: indicator toggle anchor not found — only draw-sync fix applied')

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_161.py applied — Beta 0.161')
print('  - DVL_BETA_0063 replaced: updateBtns() now synchronous (no RAF lag)')
print('  - pointer-events:none added to hidden buttons')
print('  - hookDraw re-installs every 2s for 10s (catches late wrappers)')
print('  - S.candles.length check added to panelActive condition')
print('  - window.__dvlUpdateOscGearBtns exposed for immediate calls')
