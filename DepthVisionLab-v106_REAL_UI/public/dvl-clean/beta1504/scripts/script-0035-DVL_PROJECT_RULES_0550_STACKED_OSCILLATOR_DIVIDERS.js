window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    stackedDividerMustBeMovable: true,
    dividerBetweenOscillatorsMustUseSameInvisibleDragPattern: true,
    singleRemainingOscillatorMustKeepMovableTopDivider: true,
    topDividerMustWorkEvenIfTeste1IsDisabled: true,
    stackedSplitRatioMin: 0.18,
    stackedSplitRatioMax: 0.82
  })
});
