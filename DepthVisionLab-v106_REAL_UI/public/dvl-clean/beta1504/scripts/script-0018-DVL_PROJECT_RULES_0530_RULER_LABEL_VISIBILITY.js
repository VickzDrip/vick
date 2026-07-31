window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  rulerToolV2: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.rulerToolV2) || {}, {
    labelsOnlyWhenSelectedOrDraft: true,
    offscreenLabelsForbidden: true,
    labelMustNotClampToChartCorner: true
  })
});
