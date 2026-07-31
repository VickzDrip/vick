window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  spikeZonesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.spikeZonesIndicator) || {}, {
    endlessWaitingForbidden: true,
    fallbackAllowed: "full real klines already loaded by platform, not visible window",
    apiPrimary: "independent Binance paginated history",
    statusMustShowActiveHistorySource: true
  })
});
