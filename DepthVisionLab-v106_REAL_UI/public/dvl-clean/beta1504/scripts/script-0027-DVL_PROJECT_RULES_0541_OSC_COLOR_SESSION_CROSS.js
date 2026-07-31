window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    backgroundMustCopyMainChartBaseColor: true,
    sessionsMustNotAffectOscillatorPanels: true,
    globalCrosshairMustSpanAllPanels: true,
    crosshairMustCreateAndDragInsideOscillator: true,
    crosshairVerticalLegMustTranscendPanels: true
  })
});
