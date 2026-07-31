window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    mainChartZoomIsTheOnlyHorizontalZoomEngine: true,
    oscillatorHorizontalZoomMustCallZoomChartAt: true,
    oscillatorHorizontalPanMustUpdateChartOffsetCandles: true,
    oscillatorPinchMustUpdateChartViewCount: true,
    oscillatorCandleSpacingMustUseChartViewCount: true,
    oscillatorLocalViewCountAndOffsetAreDeprecated: true,
    oscillatorVerticalScaleMayRemainIndependent: true
  })
});
