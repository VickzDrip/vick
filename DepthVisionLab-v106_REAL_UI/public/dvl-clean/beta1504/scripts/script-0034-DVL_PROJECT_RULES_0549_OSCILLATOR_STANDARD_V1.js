window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    officialStandardVersion: "DVL Oscillator Panel Standard v1",
    basePanel: "Teste",
    secondReferencePanel: "Teste 2",
    everyFutureOscillatorMustUseThisPanelStructure: true,
    stackedOscillatorsSupported: true,
    required: [
      "no session overlay",
      "no own time axis",
      "same main chart grid and colors",
      "same right scale constants",
      "independent right scale tag",
      "registered bounds in window.__dvlOscillatorPanelBounds"
    ]
  })
});
