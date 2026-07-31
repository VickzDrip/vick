window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    dividerDragHitArea: "large invisible zone",
    dividerTouchAbovePx: 48,
    dividerTouchBelowPx: 34,
    dividerHitTestMustRunBeforePanelHitTest: true,
    dividerStillMustNotShowCyanMarkers: true
  })
});
