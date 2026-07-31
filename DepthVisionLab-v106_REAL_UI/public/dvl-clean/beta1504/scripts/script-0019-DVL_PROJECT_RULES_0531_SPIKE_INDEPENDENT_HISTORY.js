window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  spikeZonesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.spikeZonesIndicator) || {}, {
    detectionMustUseIndependentRealHistory: true,
    mustNotUseVisibleWindowForDetection: true,
    dataSource: "Binance real klines, paginated by configured History",
    noRandomZones: true,
    chartWindowOnlyControlsRendering: true
  })
});
