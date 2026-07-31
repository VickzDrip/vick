window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    autoFitButtonMustFitAllActiveOscillators: true,
    lowerPanelTouchesMustNotBeCapturedByMainChart: true,
    everyOscillatorMustExposeFitToCurrent: true
  }),
  openInterestOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.openInterestOscillator) || {}, {
    autoFitResetsManualScaleToVisibleCurrentData: true,
    rightScaleDragZoomFixedByPointerOwnership: true
  })
});
