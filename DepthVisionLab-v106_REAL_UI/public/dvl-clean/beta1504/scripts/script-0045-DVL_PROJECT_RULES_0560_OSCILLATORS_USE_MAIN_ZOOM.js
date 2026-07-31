window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    horizontalZoomMustUseMainChartEngine: true,
    oscillatorsMustNotCreateSeparateHorizontalMechanics: true,
    oscillatorWheelBodyCallsZoomChartAt: true,
    oscillatorPinchUsesChartViewCount: true,
    oscillatorPanUsesChartOffsetCandles: true,
    independentOscillatorHorizontalViewportRemoved: true,
    oscillatorKeepsOnlyIndependentVerticalScale: true
  })
});
