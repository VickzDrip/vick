# patch_629.py — Beta 0.629
# TARGET: DepthVisionLab-v106_REAL_UI/public/index.html (Beta 0.628)
#
# FIX — Volume Profile panel: substituir todos os controles nativos
#   • <input type="number">  → custom stepper (dvl-feb-step-btn)
#   • <select>               → custom dropdown (dvl-drop-wrap)
#   • <input type="color">   → DVL palette picker (dvl-feb-clr-swatch)
#
# VERSION: 0.628 → 0.629

import sys

DST = 'DepthVisionLab-v106_REAL_UI/public/index.html'

with open(DST, 'r', encoding='utf-8') as f:
    html = f.read()

errors = []
fixes  = []

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

# ── 1. VP: substituir cField() + adicionar helpers vpStepFld / vpDropFld / openVPPalette ──
html = rep(html,
    '  function cField(id, lbl, key){\n'
    '    const val = state[key] || "#18d7ff";\n'
    '    return `<div class="dvl-vt-field"><label>${lbl}</label><input id="${id}" class="dvl-vt-color" type="color" value="${val}"></div>`;\n'
    '  }',

    '  const VP_PALETTE=["#13dc8d","#00e5cc","#4db8ff","#18a8ff","#7b5fff","#b44fff",\n'
    '                    "#ff4a61","#ff8c42","#ffd700","#ffffff","#ff6b35","#c0c0c0",\n'
    '                    "#ed4c67","#00d2d3","#54a0ff","#5f27cd"];\n'
    '  function openVPPalette(btn,key){\n'
    '    document.querySelectorAll(".dvl-feb-pal").forEach(p=>p.remove());\n'
    '    const pal=document.createElement("div");pal.className="dvl-feb-pal";\n'
    '    VP_PALETTE.forEach(clr=>{\n'
    '      const cell=document.createElement("button");\n'
    '      cell.type="button";\n'
    '      cell.className="dvl-feb-pal-cell"+(clr===state[key]?" is-cur":"");\n'
    '      cell.style.background=clr;cell.title=clr;\n'
    '      cell.addEventListener("click",()=>{\n'
    '        state[key]=clr;btn.style.background=clr;btn.dataset.clr=clr;\n'
    '        save();if(typeof drawSoon==="function")drawSoon();pal.remove();\n'
    '      });\n'
    '      pal.appendChild(cell);\n'
    '    });\n'
    '    btn.parentNode.appendChild(pal);\n'
    '    const onOut=e=>{if(!pal.contains(e.target)&&e.target!==btn){pal.remove();document.removeEventListener("pointerdown",onOut,true);}};\n'
    '    setTimeout(()=>document.addEventListener("pointerdown",onOut,true),0);\n'
    '  }\n'
    '  function cField(id,lbl,key){\n'
    '    const val=state[key]||"#18d7ff";\n'
    '    return `<div class="dvl-vt-field"><label>${lbl}</label><div class="dvl-feb-clr-field"><button id="${id}" class="dvl-feb-clr-swatch" type="button" style="background:${val}" data-clr="${val}" aria-label="${lbl}"></button></div></div>`;\n'
    '  }\n'
    '  function vpStepFld(id,val,min,max,step,dec){\n'
    '    const dv=dec>0?(+val).toFixed(dec):String(val);\n'
    '    return `<div class="dvl-feb-step-wrap">`\n'
    '      +`<button class="dvl-feb-step-btn dvl-feb-step-dec" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">−</button>`\n'
    '      +`<span class="dvl-feb-step-val" id="${id}Val">${dv}</span>`\n'
    '      +`<button class="dvl-feb-step-btn dvl-feb-step-inc" type="button" data-id="${id}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">+</button>`\n'
    '      +`</div>`;\n'
    '  }\n'
    '  function vpDropFld(id,opts,cur){\n'
    '    const lbl=opts.find(([v])=>v===cur)?.[1]||cur;\n'
    '    const items=opts.map(([v,l])=>`<button class="dvl-drop-item${v===cur?" is-cur":""}" type="button" data-val="${v}">${l}</button>`).join("");\n'
    '    return `<div class="dvl-drop-wrap" id="${id}Wrap">`\n'
    '      +`<button class="dvl-drop-btn" type="button" id="${id}">${lbl}<i class="dvl-drop-arr">▾</i></button>`\n'
    '      +`<div class="dvl-drop-list" id="${id}List">${items}</div>`\n'
    '      +`</div>`;\n'
    '  }',

    'VP: cField → palette + add vpStepFld + vpDropFld + openVPPalette'
)

# ── 2. VP: substituir inputs numéricos por steppers ───────────────────────────
html = rep(html,
    '          <div class="dvl-vt-field"><label>Rows</label><input id="dvlVPRows" class="dvl-vt-input" type="number" min="20" max="500" step="10" value="${Math.round(state.rows||120)}"></div>\n'
    '          <div class="dvl-vt-field"><label>Largura %</label><input id="dvlVPWPct" class="dvl-vt-input" type="number" min="5" max="40" step="1" value="${Math.round((state.widthPct||0.18)*100)}"></div>\n'
    '          <div class="dvl-vt-field"><label>Opacidade %</label><input id="dvlVPOp" class="dvl-vt-input" type="number" min="5" max="100" step="5" value="${Math.round((state.opacity||0.46)*100)}"></div>\n'
    '          <div class="dvl-vt-field"><label>Value Area %</label><input id="dvlVPVAPct" class="dvl-vt-input" type="number" min="10" max="100" step="5" value="${Math.round((state.valueAreaPct||0.70)*100)}"></div>',

    '          <div class="dvl-vt-field"><label>Rows</label>${vpStepFld("dvlVPRows",Math.round(state.rows||120),20,500,10,0)}</div>\n'
    '          <div class="dvl-vt-field"><label>Largura %</label>${vpStepFld("dvlVPWPct",Math.round((state.widthPct||0.18)*100),5,40,1,0)}</div>\n'
    '          <div class="dvl-vt-field"><label>Opacidade %</label>${vpStepFld("dvlVPOp",Math.round((state.opacity||0.46)*100),5,100,5,0)}</div>\n'
    '          <div class="dvl-vt-field"><label>Value Area %</label>${vpStepFld("dvlVPVAPct",Math.round((state.valueAreaPct||0.70)*100),10,100,5,0)}</div>',

    'VP: number inputs → steppers'
)

# ── 3. VP: substituir <select> nativo por dropdown custom ────────────────────
html = rep(html,
    "          <div class=\"dvl-vt-field\" style=\"grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px\"><label style=\"white-space:nowrap\">Timeframe do VP</label><select id=\"dvlVPTF\" style=\"width:100%;background:#0f1623;color:#c8d5e6;border:1px solid #253248;border-radius:3px;padding:4px 6px;font-size:11px;cursor:pointer\">${VP_TF_OPTS.map(o=>`<option value=\"${o.v}\"${(state.vpTF||'visible')===o.v?' selected':''}>${o.l}</option>`).join('')}</select></div>",

    "          <div class=\"dvl-vt-field\" style=\"grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px\"><label style=\"white-space:nowrap\">Timeframe do VP</label>${vpDropFld(\"dvlVPTF\",VP_TF_OPTS.map(o=>[o.v,o.l]),(state.vpTF||'visible'))}</div>",

    'VP: select nativo → vpDropFld'
)

# ── 4. VP: substituir bloco de bindings (b() helper) por bindings custom ─────
html = rep(html,
    '    function b(id, fn){ const el=body.querySelector("#"+id); if(el) el.addEventListener("change",()=>{ fn(el); save(); if(typeof drawSoon==="function") drawSoon(); }); }\n'
    '    b("dvlVPOn",    el=>{ state.on=el.checked; updateRow(); });\n'
    '    b("dvlVPLabels",el=>{ state.showLabels=el.checked; });\n'
    '    b("dvlVPRows",  el=>{ state.rows=Math.max(20,Math.min(500,Math.round(+el.value)||120)); });\n'
    '    b("dvlVPWPct",  el=>{ state.widthPct=Math.max(0.05,Math.min(0.40,(+el.value||18)/100)); });\n'
    '    b("dvlVPOp",    el=>{ state.opacity=Math.max(0.05,Math.min(1,(+el.value||46)/100)); });\n'
    '    b("dvlVPVAPct", el=>{ state.valueAreaPct=Math.max(0.10,Math.min(1,(+el.value||70)/100)); });\n'
    '    b("dvlVPTF",    el=>{ state.vpTF=el.value; vpKCache=null; vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null}; });\n'
    '    b("dvlVPCBuy",  el=>{ state.colorBuy=el.value; });\n'
    '    b("dvlVPCSell", el=>{ state.colorSell=el.value; });\n'
    '    b("dvlVPPOC",   el=>{ state.showPOC=el.checked; });\n'
    '    b("dvlVPCPOC",  el=>{ state.colorPOC=el.value; });\n'
    '    b("dvlVPVAH",   el=>{ state.showVAH=el.checked; });\n'
    '    b("dvlVPCVAH",  el=>{ state.colorVAH=el.value; });\n'
    '    b("dvlVPVAL",   el=>{ state.showVAL=el.checked; });\n'
    '    b("dvlVPCVAL",  el=>{ state.colorVAL=el.value; });',

    '    // Toggles\n'
    '    function bSw(id,fn){const el=body.querySelector("#"+id);if(el)el.addEventListener("change",()=>{fn(el.checked);save();if(typeof drawSoon==="function")drawSoon();});}\n'
    '    bSw("dvlVPOn",    v=>{state.on=v;updateRow();});\n'
    '    bSw("dvlVPLabels",v=>{state.showLabels=v;});\n'
    '    bSw("dvlVPPOC",   v=>{state.showPOC=v;});\n'
    '    bSw("dvlVPVAH",   v=>{state.showVAH=v;});\n'
    '    bSw("dvlVPVAL",   v=>{state.showVAL=v;});\n'
    '    // Steppers\n'
    '    const VP_STEP={\n'
    '      dvlVPRows: v=>{state.rows=Math.max(20,Math.min(500,v));},\n'
    '      dvlVPWPct: v=>{state.widthPct=Math.max(0.05,Math.min(0.40,v/100));},\n'
    '      dvlVPOp:   v=>{state.opacity=Math.max(0.05,Math.min(1,v/100));},\n'
    '      dvlVPVAPct:v=>{state.valueAreaPct=Math.max(0.10,Math.min(1,v/100));}\n'
    '    };\n'
    '    body.querySelectorAll(".dvl-feb-step-btn").forEach(btn=>{\n'
    '      btn.addEventListener("click",e=>{\n'
    '        e.stopPropagation();\n'
    '        const id=btn.dataset.id;\n'
    '        const step=parseFloat(btn.dataset.step),mn=parseFloat(btn.dataset.min),mx=parseFloat(btn.dataset.max),dc=parseInt(btn.dataset.dec);\n'
    '        const isInc=btn.classList.contains("dvl-feb-step-inc");\n'
    '        const valEl=body.querySelector("#"+id+"Val");if(!valEl)return;\n'
    '        const cur=parseFloat(valEl.textContent)||0;\n'
    '        const v=isInc?Math.min(mx,+(cur+step).toFixed(dc)):Math.max(mn,+(cur-step).toFixed(dc));\n'
    '        valEl.textContent=dc>0?v.toFixed(dc):String(v);\n'
    '        if(VP_STEP[id])VP_STEP[id](v);\n'
    '        save();if(typeof drawSoon==="function")drawSoon();\n'
    '      });\n'
    '    });\n'
    '    // Dropdown\n'
    '    body.querySelectorAll(".dvl-drop-btn").forEach(btn=>{\n'
    '      btn.addEventListener("click",e=>{\n'
    '        e.stopPropagation();\n'
    '        const list=body.querySelector("#"+btn.id+"List");if(!list)return;\n'
    '        const wasOpen=list.classList.contains("is-open");\n'
    '        body.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));\n'
    '        if(!wasOpen)list.classList.add("is-open");\n'
    '      });\n'
    '    });\n'
    '    body.querySelectorAll(".dvl-drop-item").forEach(item=>{\n'
    '      item.addEventListener("click",e=>{\n'
    '        e.stopPropagation();\n'
    '        const val=item.dataset.val;\n'
    '        const listEl=item.closest(".dvl-drop-list");\n'
    '        const btnId=listEl.id.replace("List","");\n'
    '        const btn=body.querySelector("#"+btnId);\n'
    '        if(btn){const tn=[...btn.childNodes].find(n=>n.nodeType===3);if(tn)tn.textContent=item.textContent;}\n'
    '        listEl.querySelectorAll(".dvl-drop-item").forEach(i=>i.classList.toggle("is-cur",i===item));\n'
    '        listEl.classList.remove("is-open");\n'
    '        if(btnId==="dvlVPTF"){state.vpTF=val;vpKCache=null;vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null};}\n'
    '        save();if(typeof drawSoon==="function")drawSoon();\n'
    '      });\n'
    '    });\n'
    '    // Color palette\n'
    '    const VP_CLR={dvlVPCBuy:"colorBuy",dvlVPCSell:"colorSell",dvlVPCPOC:"colorPOC",dvlVPCVAH:"colorVAH",dvlVPCVAL:"colorVAL"};\n'
    '    body.querySelectorAll(".dvl-feb-clr-swatch").forEach(btn=>{\n'
    '      const key=VP_CLR[btn.id];if(!key)return;\n'
    '      btn.addEventListener("click",()=>openVPPalette(btn,key));\n'
    '    });\n'
    '    // Fechar dropdowns ao clicar fora\n'
    '    body.addEventListener("pointerdown",e=>{\n'
    '      if(!e.target.closest(".dvl-drop-wrap"))body.querySelectorAll(".dvl-drop-list.is-open").forEach(l=>l.classList.remove("is-open"));\n'
    '    });',

    'VP: bindings → custom stepper + dropdown + palette'
)

# ── 5. Version bump 0.628 → 0.629 ────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.628";',
    'const DVL_APP_VERSION = "Beta 0.629";',
    'DVL_APP_VERSION 0.628→0.629'
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: FEB V2 — presets Clean/Normal/Scanner + suspect mini-bubbles + stronger mechanics." },',
    '{ version: DVL_APP_VERSION, note: "Fix: Volume Profile panel — custom stepper/dropdown/palette, zero native controls." },\n'
    '  { version: "Beta 0.628", note: "Feature: FEB V2 — presets Clean/Normal/Scanner + suspect mini-bubbles + stronger mechanics." },',
    'DVL_CHANGELOG 0.629'
)
html = rep(html,
    'BETA 0.628</div>',
    'BETA 0.629</div>',
    'versionBadge 0.628→0.629'
)
html = rep(html,
    '<title>DVL Binance Live — Beta 0.628</title>',
    '<title>DVL Binance Live — Beta 0.629</title>',
    'title 0.628→0.629'
)
html = rep(html,
    '  window.DVLVolumeProfile = { version:"0.628",',
    '  window.DVLVolumeProfile = { version:"0.629",',
    'DVLVolumeProfile version 0.629'
)

# ── Result ─────────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS (%d):' % len(errors))
    for e in errors: print('  ', e)
    print('Aborting write.')
    sys.exit(1)
else:
    print('All checks passed.')

print('Applied (%d fixes):' % len(fixes))
for f in fixes: print('  +', f)

with open(DST, 'w', encoding='utf-8') as f:
    f.write(html)

print()
print('Written to', DST)
print('Total lines after patch: %d' % (html.count('\n') + 1))
