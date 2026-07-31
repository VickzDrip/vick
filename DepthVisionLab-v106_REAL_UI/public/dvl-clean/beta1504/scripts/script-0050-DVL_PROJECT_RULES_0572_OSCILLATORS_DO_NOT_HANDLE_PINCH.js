window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  chart: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.chart) || {}, {
    zoomEngineSource: "Beta 0.487 user-provided stable file",
    originalPinchEngineMustOwnAllTwoFingerGestures: true
  }),
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    oscillatorsMustIgnoreTwoFingerPinch: true,
    oscillatorsMustNotWriteChartViewCountDuringPinch: true,
    oscillatorsMustNotBlockPinchEvents: true,
    oneFingerOscillatorScaleDragAllowed: true
  })
});
