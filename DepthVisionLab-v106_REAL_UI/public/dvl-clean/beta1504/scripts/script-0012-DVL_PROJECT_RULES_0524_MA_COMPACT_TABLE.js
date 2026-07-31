window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  movingAveragesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.movingAveragesIndicator) || {}, {
    preferredSettingsLayout: "compact table rows",
    avoidLargeCards: true,
    maColumns: ["ON","MA","PER","TIPO","COR","LARG","EST"],
    autoApply: true
  })
});
