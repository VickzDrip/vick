window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  drawingTools: {
    rulerPattern: "select tool -> drag/tap to place first anchor -> move preview -> tap to finalize",
    firstAnchorDragMustWork: true,
    chartMustNotPanWhilePlacingDrawingTool: true,
    toolPointerEventsMustCaptureBeforeChartPan: true
  }
});
