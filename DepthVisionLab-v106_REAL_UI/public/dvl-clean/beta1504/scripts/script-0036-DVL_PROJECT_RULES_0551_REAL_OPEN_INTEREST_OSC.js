window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  openInterestOscillator: {
    officialized: true,
    name: "DVL Open Interest",
    usesOscillatorPanelStandardV1: true,
    dataSource: "Binance Futures /futures/data/openInterestHist",
    mustUseRealDataOnly: true,
    fallbackFakeDataForbidden: true,
    ownRightScale: true,
    noSessionOverlay: true,
    noOwnTimeAxis: true
  }
});
