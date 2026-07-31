window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  drawingTools: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.drawingTools) || {}, {
    rulerPattern: "select ruler -> drag crosshair freely -> tap to fix first point -> drag preview endpoint -> final tap fixes ruler",
    firstDragSetsOnlyCrosshair: true,
    firstPointRequiresTapConfirmation: true,
    finalPointRequiresTapConfirmation: true,
    rulerDeleteRequiresXButton: true,
    rulerMustHaveGearAndXControls: true,
    chartMustNotPanWhilePlacingDrawingTool: true
  })
});
