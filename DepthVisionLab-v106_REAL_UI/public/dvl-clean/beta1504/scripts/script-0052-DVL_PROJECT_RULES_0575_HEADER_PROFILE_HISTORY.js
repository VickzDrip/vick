window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  header: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.header) || {}, {
    removeLeftHamburger: true,
    replaceWalletAndAlertWithProfileSave: true,
    profileButtonSavesAllSiteChanges: true
  }),
  chart: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.chart) || {}, {
    topRightUndoRedo: true,
    drawingContextBarBelowUndoRedo: true,
    avoidToolGearDeleteOverlap: true
  })
});
