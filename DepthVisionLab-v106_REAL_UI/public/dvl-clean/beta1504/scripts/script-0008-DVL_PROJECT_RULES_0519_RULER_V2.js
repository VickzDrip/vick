window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  rulerToolV2: {
    implementation: "independent overlay module",
    legacyRulerRuntimeMustBeBypassed: true,
    flow: [
      "select ruler",
      "drag to move crosshair only",
      "tap to fix initial point",
      "drag to preview final point",
      "tap to finalize ruler",
      "delete only with X control"
    ],
    chartPanWhileRulerActive: false
  }
});
