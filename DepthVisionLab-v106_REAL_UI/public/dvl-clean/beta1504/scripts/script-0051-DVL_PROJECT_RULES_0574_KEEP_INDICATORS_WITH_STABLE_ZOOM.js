window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  rollbackCorrection: {
    previousCleanRollbackRemovedIndicators: true,
    keepCurrentIndicators: true,
    keepCurrentUiTools: true,
    keepStableZoomFrom0487: true,
    doNotRollbackWholeHtmlAgain: true,
    onlyPatchZoomConflictsWhenNeeded: true
  }
});
