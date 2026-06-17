#!/usr/bin/env python3
"""
patch_630.py  —  DVL Beta 0.629 → 0.630
Auto-save: persiste symbol + timer 30s + badge "salvo HH:MM"
"""
import sys, os

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
OUT = SRC

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

# ── 1. Version bump ──────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.629";',
    'const DVL_APP_VERSION = "Beta 0.630";',
    "version constant"
)

html = rep(html,
    '>BETA 0.629</div>',
    '>BETA 0.630</div>',
    "version badge HTML"
)

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Fix: Volume Profile panel — custom stepper/dropdown/palette, zero native controls." },',
    '{ version: DVL_APP_VERSION, note: "Feature: Auto-save — symbol + settings persisted every 30 s, badge salvo HH:MM." },\n  { version: "Beta 0.629", note: "Fix: Volume Profile panel — custom stepper/dropdown/palette, zero native controls." },',
    "changelog entry"
)

# ── 2. saveAppSettings — add symbol ─────────────────────────────────────────
html = rep(html,
    "      sessionsOn, sessionActive: Object.assign({}, sessionActive), interval\n    }));",
    "      sessionsOn, sessionActive: Object.assign({}, sessionActive), interval, symbol\n    }));",
    "saveAppSettings add symbol"
)

# ── 3. loadAppSettings — restore symbol ─────────────────────────────────────
html = rep(html,
    "    if(s.interval && /^[1-9]\\d*(s|m|h|d|w)$/.test(s.interval)) interval = s.interval;\n  }catch(_){}",
    "    if(s.interval && /^[1-9]\\d*(s|m|h|d|w)$/.test(s.interval)) interval = s.interval;\n    if(s.symbol && typeof s.symbol===\"string\" && symbols.includes(s.symbol)){ symbolIndex=symbols.indexOf(s.symbol); symbol=s.symbol; }\n  }catch(_){}",
    "loadAppSettings restore symbol"
)

# ── 4. selectSymbol — save on change ────────────────────────────────────────
html = rep(html,
    "  updateHeader();\n  loadAll();\n}\n\n\nfunction updateHeader(){",
    "  updateHeader();\n  saveAppSettings();\n  loadAll();\n}\n\n\nfunction updateHeader(){",
    "selectSymbol saveAppSettings call"
)

# ── 5. Auto-save badge + timer script before </body></html> ─────────────────
AUTOSAVE_SCRIPT = """<script id="DVL_BETA_0630_AUTOSAVE">
(function(){
  /* ── inject badge CSS ── */
  var style = document.createElement("style");
  style.textContent = [
    ".dvl-autosave-badge{",
    "  display:inline-flex;align-items:center;gap:4px;",
    "  font-size:9px;font-weight:600;letter-spacing:.4px;",
    "  color:#16d86f;opacity:.55;",
    "  transition:opacity .3s;",
    "  cursor:default;user-select:none;",
    "  margin-left:6px;vertical-align:middle;",
    "}",
    ".dvl-autosave-badge.is-active{opacity:1;}",
    ".dvl-autosave-badge .dvl-as-dot{",
    "  width:5px;height:5px;border-radius:50%;",
    "  background:#16d86f;",
    "  animation:none;",
    "}",
    ".dvl-autosave-badge.is-active .dvl-as-dot{",
    "  animation:dvlAsPulse .8s ease-out forwards;",
    "}",
    "@keyframes dvlAsPulse{",
    "  0%{transform:scale(1);opacity:1;}",
    "  60%{transform:scale(1.8);opacity:.6;}",
    "  100%{transform:scale(1);opacity:1;}",
    "}"
  ].join("");
  document.head.appendChild(style);

  /* ── inject badge DOM next to versionBadge ── */
  var vb = document.getElementById("versionBadge");
  var badge = document.createElement("span");
  badge.id = "dvlAutoSaveBadge";
  badge.className = "dvl-autosave-badge";
  badge.innerHTML = '<span class="dvl-as-dot"></span><span class="dvl-as-lbl"></span>';
  if(vb && vb.parentNode) vb.parentNode.insertBefore(badge, vb.nextSibling);

  var lbl = badge.querySelector(".dvl-as-lbl");

  function pad(n){ return n < 10 ? "0"+n : ""+n; }
  function nowHHMM(){
    var d = new Date();
    return pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function tick(){
    if(typeof saveAppSettings === "function") saveAppSettings();
    var t = nowHHMM();
    if(lbl) lbl.textContent = "salvo "+t;
    badge.classList.add("is-active");
    setTimeout(function(){ badge.classList.remove("is-active"); }, 2000);
  }

  /* first save 5 s after load, then every 30 s */
  setTimeout(function(){ tick(); setInterval(tick, 30000); }, 5000);
})();
</script>

</body>
</html>"""

html = rep(html,
    "\n</body>\n</html>",
    "\n" + AUTOSAVE_SCRIPT,
    "inject autosave script before </body>"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✓ patch_630 aplicado — {OUT}")
