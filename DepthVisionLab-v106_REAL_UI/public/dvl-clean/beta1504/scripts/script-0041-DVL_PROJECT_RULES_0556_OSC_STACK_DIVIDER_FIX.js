window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    openInterestMustCountAsStackedOscillator: true,
    stackDividerBetweenOiAndOtherOscillatorsMustDrag: true,
    lowerOscillatorPanelsMustNotStealStackDividerTouch: true,
    stackDividerHitAreaPx: 42,
    threeOscillatorLayoutMustNotOverflow: true
  })
});
