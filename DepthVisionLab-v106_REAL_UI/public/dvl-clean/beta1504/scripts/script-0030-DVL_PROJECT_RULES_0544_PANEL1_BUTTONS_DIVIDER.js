window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  chartScaleControls: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.chartScaleControls) || {}, {
    dockedLayout: "horizontal",
    scaleButtonPosition: "left of gear",
    gearButtonPosition: "right",
    dockedButtonSizePx: 24,
    mustStayAboveOscillatorDivider: true
  }),
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    dividerVisibleStrokePx: 3,
    dividerTouchRadiusPx: 20
  })
});
