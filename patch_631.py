#!/usr/bin/env python3
"""
patch_631.py  —  DVL Beta 0.630 → 0.631
VP Sessão 2: POC·2 / VAH·2 / VAL·2 de um segundo timeframe escolhido
(sem barras de volume, apenas as 3 linhas extras)
"""
import sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ERRO] NOT FOUND: {label}")
        sys.exit(1)
    if count > 1:
        print(f"[ERRO] AMBIGUOUS ({count}x): {label}")
        sys.exit(1)
    print(f"[OK] {label}")
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. Version bump ───────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.630";',
    'const DVL_APP_VERSION = "Beta 0.631";',
    "version constant"
)
html = rep(html,
    '>BETA 0.630</div>',
    '>BETA 0.631</div>',
    "version badge HTML"
)
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Feature: Auto-save — symbol + settings persisted every 30 s, badge salvo HH:MM." },',
    '{ version: DVL_APP_VERSION, note: "Feature: VP Sessão 2 — POC·2/VAH·2/VAL·2 de timeframe independente, sem barras." },\n  { version: "Beta 0.630", note: "Feature: Auto-save — symbol + settings persisted every 30 s, badge salvo HH:MM." },',
    "changelog entry"
)

# ── 2. VP DEFAULTS — add s2 fields ───────────────────────────────────────────
html = rep(html,
    '    showLabels: true\n  };',
    '    showLabels: true,\n    s2on: false,\n    s2tf: \'4h\',\n    s2showPOC: true, s2showVAH: true, s2showVAL: true,\n    s2colorPOC: "#ffd700", s2colorVAH: "#00e5cc", s2colorVAL: "#b44fff"\n  };',
    "DEFAULTS s2 fields"
)

# ── 3. Cache vars — add s2 caches ────────────────────────────────────────────
html = rep(html,
    '  let vpKCache      = null;\n  let vpKFetching   = false;\n  let vpStableLevels = {poc:null, vah:null, val:null, sym:null, tf:null};',
    '  let vpKCache      = null;\n  let vpKFetching   = false;\n  let vpStableLevels = {poc:null, vah:null, val:null, sym:null, tf:null};\n  let vpKCache2     = null;\n  let vpKFetching2  = false;\n  let vpStableLevels2 = {poc:null, vah:null, val:null, sym:null, tf:null};',
    "add s2 cache vars"
)

# ── 4. VP_TF_OPTS_S2 — defined right after VP_TF_OPTS ────────────────────────
html = rep(html,
    "  ];\n  const VP_BASE_TF = {",
    "  ];\n  const VP_TF_OPTS_S2 = VP_TF_OPTS.filter(o => o.v !== 'visible');\n  const VP_BASE_TF = {",
    "VP_TF_OPTS_S2 definition"
)

# ── 5. resolveVPKlines2 — add after resolveVPKlines ──────────────────────────
html = rep(html,
    "    return {klines:defaultView, own:false};\n  }\n\n  // ── Volume Profile computation (triangular close-peaked) ─────────────────",
    """    return {klines:defaultView, own:false};
  }

  function resolveVPKlines2(defaultView, sym){
    const tf = state.s2tf || '4h';
    if(!sym) return {klines:defaultView, own:false};
    const cfg = VP_BASE_TF[tf];
    if(!cfg) return {klines:defaultView, own:false};
    const now = Date.now();
    const periodStart = Math.floor(now / cfg.ms) * cfg.ms;
    const ok = vpKCache2
      && vpKCache2.sym === sym && vpKCache2.tf === tf
      && vpKCache2.periodStart === periodStart
      && Array.isArray(vpKCache2.klines) && vpKCache2.klines.length
      && (now - vpKCache2.ts) < 60000;
    if(!ok && !vpKFetching2){
      vpKFetching2 = true;
      fetchVPKlines(sym, tf).then(kl=>{
        vpKCache2 = {sym, tf, klines:kl||[], ts:Date.now(), periodStart};
        vpKFetching2 = false;
        if(kl && kl.length && typeof drawSoon==='function') drawSoon();
      }).catch(()=>{ vpKFetching2=false; });
    }
    if(vpKCache2 && vpKCache2.sym===sym && vpKCache2.tf===tf && vpKCache2.klines.length){
      return {klines:vpKCache2.klines, own:true};
    }
    return {klines:defaultView, own:false};
  }

  // ── Volume Profile computation (triangular close-peaked) ─────────────────""",
    "resolveVPKlines2 function"
)

# ── 6. Draw — S2 levels before ctx.restore() ─────────────────────────────────
S2_DRAW = """
    // ── Sessão 2: POC·2 / VAH·2 / VAL·2 (sem barras) ───────────────────────
    if(state.s2on !== false){
      const {klines:vpView2, own:ownData2} = resolveVPKlines2(view, sym);
      let vp2Min = min, vp2Max = max;
      if(ownData2 && vpView2.length){
        for(const c of vpView2){
          if(+c.low  < vp2Min) vp2Min = +c.low;
          if(+c.high > vp2Max) vp2Max = +c.high;
        }
        const pad2 = (vp2Max - vp2Min) * 0.005;
        vp2Min -= pad2; vp2Max += pad2;
      }
      const vp2Range = vp2Max - vp2Min || 1;
      const {buy:buy2, sell:sell2} = computeVP(vpView2, vp2Min, vp2Max, rows);

      let max2 = 0, tot2 = 0, poc2Idx = 0;
      for(let i = 0; i < rows; i++){
        const t = buy2[i] + sell2[i];
        tot2 += t;
        if(t > max2){ max2 = t; poc2Idx = i; }
      }

      if(max2 > 0){
        const va2Target = tot2 * Math.max(0.01, Math.min(1, state.valueAreaPct||0.70));
        let va2Vol = buy2[poc2Idx] + sell2[poc2Idx];
        let va2Lo = poc2Idx, va2Hi = poc2Idx;
        while(va2Vol < va2Target && (va2Lo > 0 || va2Hi < rows-1)){
          const nLo2 = va2Lo > 0      ? buy2[va2Lo-1]+sell2[va2Lo-1] : 0;
          const nHi2 = va2Hi < rows-1 ? buy2[va2Hi+1]+sell2[va2Hi+1] : 0;
          if(nHi2 >= nLo2){ va2Hi++; va2Vol += buy2[va2Hi]+sell2[va2Hi]; }
          else             { va2Lo--; va2Vol += buy2[va2Lo]+sell2[va2Lo]; }
        }
        const pricePerRow2 = vp2Range / rows;
        const curS2TF = state.s2tf || '4h';
        if(vpStableLevels2.sym !== sym || vpStableLevels2.tf !== curS2TF){
          vpStableLevels2 = {poc:null, vah:null, val:null, sym, tf:curS2TF};
        }
        const hyst2 = pricePerRow2 * 1.5;
        const nPoc2 = vp2Min + (poc2Idx + 0.5) * pricePerRow2;
        const nVah2 = vp2Min + (va2Hi + 1)     * pricePerRow2;
        const nVal2 = vp2Min +  va2Lo           * pricePerRow2;
        if(vpStableLevels2.poc===null||Math.abs(nPoc2-vpStableLevels2.poc)>hyst2) vpStableLevels2.poc=nPoc2;
        if(vpStableLevels2.vah===null||Math.abs(nVah2-vpStableLevels2.vah)>hyst2) vpStableLevels2.vah=nVah2;
        if(vpStableLevels2.val===null||Math.abs(nVal2-vpStableLevels2.val)>hyst2) vpStableLevels2.val=nVal2;

        // POC·2
        if(state.s2showPOC !== false){
          const poc2Y = rowP(vpStableLevels2.poc);
          ctx.strokeStyle = state.s2colorPOC || "#ffd700";
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([2, 7]);
          ctx.beginPath(); ctx.moveTo(x0, poc2Y); ctx.lineTo(x1, poc2Y); ctx.stroke();
          ctx.setLineDash([]);
          if(state.showLabels !== false){
            ctx.fillStyle    = state.s2colorPOC || "#ffd700";
            ctx.font         = "700 7.5px system-ui";
            ctx.textAlign    = "left";
            ctx.textBaseline = "bottom";
            ctx.globalAlpha  = 0.9;
            ctx.fillText("POC·2", x0 + 3, poc2Y);
            ctx.globalAlpha  = 1;
          }
        }
        // VAH·2
        if(state.s2showVAH !== false){
          const vah2Y = rowP(vpStableLevels2.vah);
          ctx.strokeStyle = state.s2colorVAH || "#00e5cc";
          ctx.lineWidth   = 1;
          ctx.setLineDash([1, 7]);
          ctx.beginPath(); ctx.moveTo(x0, vah2Y); ctx.lineTo(x1, vah2Y); ctx.stroke();
          ctx.setLineDash([]);
          if(state.showLabels !== false){
            ctx.fillStyle    = state.s2colorVAH || "#00e5cc";
            ctx.font         = "700 7.5px system-ui";
            ctx.textAlign    = "left";
            ctx.textBaseline = "bottom";
            ctx.globalAlpha  = 0.9;
            ctx.fillText("VAH·2", x0 + 3, vah2Y);
            ctx.globalAlpha  = 1;
          }
        }
        // VAL·2
        if(state.s2showVAL !== false){
          const val2Y = rowP(vpStableLevels2.val);
          ctx.strokeStyle = state.s2colorVAL || "#b44fff";
          ctx.lineWidth   = 1;
          ctx.setLineDash([1, 7]);
          ctx.beginPath(); ctx.moveTo(x0, val2Y); ctx.lineTo(x1, val2Y); ctx.stroke();
          ctx.setLineDash([]);
          if(state.showLabels !== false){
            ctx.fillStyle    = state.s2colorVAL || "#b44fff";
            ctx.font         = "700 7.5px system-ui";
            ctx.textAlign    = "left";
            ctx.textBaseline = "top";
            ctx.globalAlpha  = 0.9;
            ctx.fillText("VAL·2", x0 + 3, val2Y);
            ctx.globalAlpha  = 1;
          }
        }
      }
    }
"""

html = rep(html,
    "\n    } finally { ctx.restore(); }\n  }\n\n  // ── Settings panel",
    S2_DRAW + "\n    } finally { ctx.restore(); }\n  }\n\n  // ── Settings panel",
    "draw S2 levels"
)

# ── 7. renderPanel HTML — add Sessão 2 section ───────────────────────────────
S2_SECTION = """
      <div class="dvl-vt-section">
        <div class="dvl-vt-section-title"><span>Sessão 2 — POC·2 / VAH·2 / VAL·2</span></div>
        <div class="dvl-vt-grid">
          <div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="dvlVPS2On" type="checkbox" ${state.s2on!==false?"checked":""}><i></i><b></b></label></div>
          <div class="dvl-vt-field"><label>POC·2</label><label class="dvl-switch"><input id="dvlVPS2POC" type="checkbox" ${state.s2showPOC!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2POC","Cor POC·2","s2colorPOC")}
          <div class="dvl-vt-field"><label>VAH·2</label><label class="dvl-switch"><input id="dvlVPS2VAH" type="checkbox" ${state.s2showVAH!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2VAH","Cor VAH·2","s2colorVAH")}
          <div class="dvl-vt-field"><label>VAL·2</label><label class="dvl-switch"><input id="dvlVPS2VAL" type="checkbox" ${state.s2showVAL!==false?"checked":""}><i></i><b></b></label></div>
          ${cField("dvlVPCS2VAL","Cor VAL·2","s2colorVAL")}
          <div class="dvl-vt-field" style="grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:4px"><label style="white-space:nowrap">Timeframe da Sessão 2</label>${vpDropFld("dvlVPS2TF",VP_TF_OPTS_S2.map(o=>[o.v,o.l]),(state.s2tf||'4h'))}</div>
        </div>
      </div>"""

html = rep(html,
    "\n    `;\n\n    // Toggles\n    function bSw(id,fn){",
    S2_SECTION + "\n    `;\n\n    // Toggles\n    function bSw(id,fn){",
    "renderPanel S2 section HTML"
)

# ── 8. renderPanel toggles — add s2 toggles ──────────────────────────────────
html = rep(html,
    "    bSw(\"dvlVPVAL\",   v=>{state.showVAL=v;});",
    "    bSw(\"dvlVPVAL\",   v=>{state.showVAL=v;});\n    bSw(\"dvlVPS2On\",  v=>{state.s2on=v;});\n    bSw(\"dvlVPS2POC\", v=>{state.s2showPOC=v;});\n    bSw(\"dvlVPS2VAH\", v=>{state.s2showVAH=v;});\n    bSw(\"dvlVPS2VAL\", v=>{state.s2showVAL=v;});",
    "renderPanel S2 toggles"
)

# ── 9. VP_CLR color map — add s2 colors ──────────────────────────────────────
html = rep(html,
    '    const VP_CLR={dvlVPCBuy:"colorBuy",dvlVPCSell:"colorSell",dvlVPCPOC:"colorPOC",dvlVPCVAH:"colorVAH",dvlVPCVAL:"colorVAL"};',
    '    const VP_CLR={dvlVPCBuy:"colorBuy",dvlVPCSell:"colorSell",dvlVPCPOC:"colorPOC",dvlVPCVAH:"colorVAH",dvlVPCVAL:"colorVAL",dvlVPCS2POC:"s2colorPOC",dvlVPCS2VAH:"s2colorVAH",dvlVPCS2VAL:"s2colorVAL"};',
    "VP_CLR s2 colors"
)

# ── 10. Dropdown handler — handle dvlVPS2TF ───────────────────────────────────
html = rep(html,
    '        if(btnId==="dvlVPTF"){state.vpTF=val;vpKCache=null;vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null};}',
    '        if(btnId==="dvlVPTF"){state.vpTF=val;vpKCache=null;vpStableLevels={poc:null,vah:null,val:null,sym:null,tf:null};}\n        if(btnId==="dvlVPS2TF"){state.s2tf=val;vpKCache2=null;vpStableLevels2={poc:null,vah:null,val:null,sym:null,tf:null};}',
    "dropdown handler dvlVPS2TF"
)

# ── 11. VP version bump ───────────────────────────────────────────────────────
html = rep(html,
    'window.DVLVolumeProfile = { version:"0.629", on, setOn, draw, openPanel,',
    'window.DVLVolumeProfile = { version:"0.631", on, setOn, draw, openPanel,',
    "VP module version"
)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_631 aplicado — {SRC}")
