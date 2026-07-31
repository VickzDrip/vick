window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  spikeZonesIndicator: {
    sourceImported: "dvl_spike_zones.js",
    uiMustFollow: "DVL Indicator Settings Standard v1",
    nativeControlsForbidden: true,
    resetHeaderOnly: true,
    mechanics: [
      "volume spike detection versus rolling volume average and volume ATR",
      "5 compressed visual levels",
      "zone source: body/full candle/dominant wick/high-volume segment",
      "merge nearby zones",
      "ATR smart spacing",
      "needle/high concentration core refinement",
      "right-scale invasion forbidden"
    ]
  }
});
