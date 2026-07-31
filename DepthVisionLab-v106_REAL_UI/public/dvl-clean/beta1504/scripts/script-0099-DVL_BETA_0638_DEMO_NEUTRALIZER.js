/*
  DVL Beta 0.638 — Neutralize native _toggleDemoPos listeners.

  DVL registers click handlers on #dvlBuyBtn/#dvlSellBtn at parse time
  (lines ~14964-14965) that call _toggleDemoPos('long'/'short'), which
  creates a DVL-native demo position and draws "SHORT/LONG price..." text
  on the chart line in addition to our 0598 overlay.

  We clone-replace both buttons at DOMContentLoaded (runs before 0598.js's
  DOMContentLoaded since this script comes first in the HTML). The clone
  has identical DOM/attributes/style but no event listeners. 0598.js then
  registers its handlers on the clean clone — only our overlay fires.
*/
(function(){
"use strict";
function neutralize(){
  ['dvlBuyBtn','dvlSellBtn'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.parentNode){
      el.parentNode.replaceChild(el.cloneNode(true), el);
    }
  });
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', neutralize, {once:true});
} else {
  neutralize();
}
})();
