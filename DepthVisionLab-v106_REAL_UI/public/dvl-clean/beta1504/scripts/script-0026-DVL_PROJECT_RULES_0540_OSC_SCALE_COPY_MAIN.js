window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.oscillatorPanelStandard) || {}, {
    scaleMustCopyMainChart: true,
    useMainScaleConstants: ["PRICE_SCALE_W", "PRICE_LABEL_GAP", "PRICE_LABEL_W"],
    oscillatorPlotX1MustEqualMainPlotX1: true,
    oscillatorScaleLabelStyleMustEqualMain: true,
    doNotInventSeparateScaleMeasurements: true
  })
});
