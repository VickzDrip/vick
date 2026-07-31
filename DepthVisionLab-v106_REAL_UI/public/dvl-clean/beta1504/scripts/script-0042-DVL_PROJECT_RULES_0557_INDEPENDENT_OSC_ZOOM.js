window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    eachOscillatorMustHaveIndependentHorizontalZoom: true,
    eachOscillatorMustHaveIndependentHorizontalPan: true,
    oscillatorZoomMustNotChangeMainChart: true,
    oscillatorBodyWheelMustZoomOnlyThatOscillator: true,
    oscillatorBodyDragMustPanOnlyThatOscillator: true,
    oscillatorPinchMustZoomOnlyThatOscillator: true,
    autoFitMustResetEachOscillatorOwnViewport: true
  })
});
