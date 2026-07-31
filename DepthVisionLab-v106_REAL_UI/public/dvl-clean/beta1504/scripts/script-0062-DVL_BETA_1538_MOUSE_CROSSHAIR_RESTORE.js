/* DVL_BETA_1538_MOUSE_CROSSHAIR_RESTORE */
(function(){
  if(window.DVL_MOUSE_CROSSHAIR_1538) return;
  window.DVL_MOUSE_CROSSHAIR_1538 = true;

  function el(id){
    var n = document.getElementById(id);
    if(n) return n;
    n = document.createElement("div");
    n.id = id;
    document.body.appendChild(n);
    return n;
  }

  function wrap(){
    return document.getElementById("chartWrap") || document.querySelector(".chartWrap");
  }

  var css = document.createElement("style");
  css.id = "DVL_BETA_1538_MOUSE_CROSSHAIR_CSS";
  css.textContent = "#dvlCross1538X,#dvlCross1538Y{position:fixed;display:none;pointer-events:none;z-index:72;background:rgba(16,223,119,.48)}#dvlCross1538X{height:1px}#dvlCross1538Y{width:1px}";
  document.head.appendChild(css);

  var xLine = el("dvlCross1538X");
  var yLine = el("dvlCross1538Y");
  var last = null, raf = 0;

  function hide(){ xLine.style.display = "none"; yLine.style.display = "none"; }

  function paint(){
    raf = 0;
    var w = wrap();
    if(!w || !last) return hide();
    var r = w.getBoundingClientRect();
    var x = last.clientX, y = last.clientY;
    if(x < r.left || x > r.right || y < r.top || y > r.bottom) return hide();

    xLine.style.left = r.left + "px";
    xLine.style.top = Math.round(y) + "px";
    xLine.style.width = r.width + "px";
    xLine.style.display = "block";

    yLine.style.left = Math.round(x) + "px";
    yLine.style.top = r.top + "px";
    yLine.style.height = r.height + "px";
    yLine.style.display = "block";
  }

  document.addEventListener("pointermove", function(ev){
    if(ev.pointerType && ev.pointerType !== "mouse") return;
    last = ev;
    if(!raf) raf = requestAnimationFrame(paint);
  }, {passive:true});

  document.addEventListener("pointerleave", hide, {passive:true});
})();
