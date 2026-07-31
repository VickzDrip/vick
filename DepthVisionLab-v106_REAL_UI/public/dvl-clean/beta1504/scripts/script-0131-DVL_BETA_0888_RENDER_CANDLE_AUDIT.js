(function(){
  window.DVL_RENDER_CANDLE_MODEL_AUDIT = function(){
    try{
      var model = window.DVL_CHART_MODEL;
      var cs = model && model.buildCoordinateSystem ? model.buildCoordinateSystem() : null;
      var list = model && model.getRenderCandles ? model.getRenderCandles() : [];
      var first = list && list.length ? list[0] : null;
      return {
        version:"0.941",
        modelAvailable:!!model,
        coordinateSystemAvailable:!!cs,
        renderCandlesAvailable:!!(model && typeof model.getRenderCandles === "function"),
        renderCandleCount:list ? list.length : 0,
        firstHasX:!!(first && Number.isFinite(first.x)),
        firstHasBody:!!(first && Number.isFinite(first.bodyTopY) && Number.isFinite(first.bodyBottomY)),
        firstHasWick:!!(first && Number.isFinite(first.wickHighY) && Number.isFinite(first.wickLowY)),
        nearestAvailable:!!(model && typeof model.nearestRenderCandleFromX === "function"),
        visualNeutral:true,
        pass:!!(cs && list && list.length && first && Number.isFinite(first.x) && Number.isFinite(first.bodyTopY) && Number.isFinite(first.wickHighY))
      };
    }catch(e){
      return { version:"0.941", pass:false, error:String(e && e.message || e) };
    }
  };
})();
