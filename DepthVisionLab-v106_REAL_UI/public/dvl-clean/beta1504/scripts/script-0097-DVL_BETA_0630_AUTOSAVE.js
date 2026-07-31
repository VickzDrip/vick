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
