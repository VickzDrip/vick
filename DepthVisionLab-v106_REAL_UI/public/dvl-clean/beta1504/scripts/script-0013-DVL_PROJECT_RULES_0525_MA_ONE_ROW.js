window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  movingAveragesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.movingAveragesIndicator) || {}, {
    oneAveragePerRow: true,
    neverPlaceMA2BesideMA1: true,
    ma10MustContinueBelowMA9: true,
    rowsMustUseSingleColumnList: true
  })
});
