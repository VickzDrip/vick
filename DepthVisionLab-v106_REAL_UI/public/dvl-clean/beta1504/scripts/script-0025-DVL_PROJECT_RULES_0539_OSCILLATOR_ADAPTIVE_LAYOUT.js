window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    topChartMustClipToPanelBoundary: true,
    oscillatorMustMirrorTopChartXViewport: true,
    oscillatorMustNotDrawPriceCandlesOrVolume: true,
    lowerPanelMustUseSameGridAndTimeAxisPattern: true,
    oscillatorPanZoomShouldKeepPanelsAligned: true
  })
});
