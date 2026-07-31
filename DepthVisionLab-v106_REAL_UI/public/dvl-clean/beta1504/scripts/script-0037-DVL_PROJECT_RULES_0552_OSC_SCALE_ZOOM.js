window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  openInterestOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.openInterestOscillator) || {}, {
    rightScaleDragZoomRequired: true,
    rightScaleWheelZoomRequired: true,
    mainPriceScaleMustNotStealOscillatorScaleTouches: true,
    oscillatorScaleHitAreaExtraPx: 8,
    scaleDragCursor: "ns-resize"
  }),
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    everyOscillatorRightScaleMustZoomVertically: true
  })
});
