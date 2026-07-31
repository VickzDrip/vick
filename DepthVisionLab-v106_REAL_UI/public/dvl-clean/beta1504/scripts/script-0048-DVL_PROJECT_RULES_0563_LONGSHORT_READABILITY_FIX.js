window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  longShortOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.longShortOscillator) || {}, {
    coinglassReferenceMatchedCloser: true,
    tightVisibleAutoScaleRequired: true,
    hugeManualRangeMustBeIgnored: true,
    storageKey: "dvl_longshort_oscillator_v2",
    lineOnlyNoAreaFill: true,
    decimalPrecision: 4
  }),
  openInterestOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.openInterestOscillator) || {}, {
    candleBodyMustBeFullSolidLikeMainChart: true
  }),
  chart: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.chart) || {}, {
    panSensitivity: 0.55
  })
});
