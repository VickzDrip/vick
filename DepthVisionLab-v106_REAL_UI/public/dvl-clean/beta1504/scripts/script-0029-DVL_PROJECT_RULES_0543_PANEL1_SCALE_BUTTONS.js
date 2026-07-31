window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  chartScaleControls: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.chartScaleControls) || {}, {
    whenOscillatorActive: "dock inside panel 1 right scale column",
    mustNotOverlapOscillatorPanel: true,
    mustStayAtExtremeRight: true,
    layoutWhenDocked: "vertical stack",
    maxButtonSizePx: 26
  })
});
