window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  spikeZonesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.spikeZonesIndicator) || {}, {
    independentHistoryLoader: "platform fetchKlinesHistory first, raw fetch only as fallback",
    mustPreloadOnBoot: true,
    mustExposeHistoryStatus: true,
    drawMustRetryAfterHistoryLoads: true
  })
});
