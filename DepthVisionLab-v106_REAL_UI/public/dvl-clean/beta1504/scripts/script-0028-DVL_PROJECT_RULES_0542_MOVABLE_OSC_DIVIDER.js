window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    dividerMustBeMovable: true,
    dividerDragDirection: "vertical",
    mainTimeScaleHeightWhenOscillatorActivePx: 20,
    oscillatorTimeScaleRemoved: true,
    splitRatioDefault: 0.62,
    splitRatioMin: 0.38,
    splitRatioMax: 0.78
  })
});
