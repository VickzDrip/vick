/*
  DVL Beta 0.634 — Override __dvlLegacyPriceArea before Paper Trading 0.598
  initialises.  scaleInfo() -> yPrice() will then use the same [y0, y1] bounds
  as drawPriceSection()'s local y(v) function regardless of oscillator state.
*/
(function(){
"use strict";
if(window.__dvl0634AreaFixed) return;
window.__dvl0634AreaFixed = true;

window.__dvlLegacyPriceArea = function(H){
  var priceH = (typeof dvlPricePanelHeight === 'function')
    ? dvlPricePanelHeight(H) : H;
  var timeH = (typeof dvlMainTimeScaleHeight === 'function')
    ? dvlMainTimeScaleHeight() : 20;
  var y0 = 4;
  var y1 = Math.max(y0 + 40, priceH - timeH);
  return { y0: y0, y1: y1, priceH: priceH, timeH: timeH };
};

})();
