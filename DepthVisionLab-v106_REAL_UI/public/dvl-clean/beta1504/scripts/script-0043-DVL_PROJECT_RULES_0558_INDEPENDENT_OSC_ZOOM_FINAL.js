window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    independentOscillatorZoomFinalized: true,
    eachOscillatorOwnViewCount: true,
    eachOscillatorOwnOffset: true,
    teste2MustDefineOwnZoomXAt: true,
    openInterestMustDefineOwnZoomXAt: true,
    noOscillatorBodyZoomShouldCallMainZoomChartAt: true
  })
});
