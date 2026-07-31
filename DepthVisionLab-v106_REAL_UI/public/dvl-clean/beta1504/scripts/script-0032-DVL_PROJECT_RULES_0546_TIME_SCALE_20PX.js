window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  timeScale: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.timeScale) || {}, {
    mainPanelHeightPx: 20,
    alwaysUse20px: true,
    labelsMustBeVerticallyCentered: true
  }),
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    dividerTouchCanInvadeMainTimeScale: true,
    dividerTouchInvadeAbovePx: 20,
    dividerTouchLowerPx: 20
  })
});
