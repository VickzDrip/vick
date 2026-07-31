window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  longShortOscillator: {
    officialized: true,
    rebuiltFromUploadedBase: "dvl_longshort_v325.js",
    usesOscillatorPanelStandardV1: true,
    dataSource: "Binance Futures /futures/data/globalLongShortAccountRatio",
    fallbackFakeDataForbidden: true,
    ownRightScale: true,
    ownHorizontalZoom: true,
    ownHorizontalPan: true,
    noSessionOverlay: true,
    noOwnTimeAxis: true,
    sameMechanicsAsOpenInterest: true
  },
  openInterestOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.openInterestOscillator) || {}, {
    horizontalZoomDirectionCorrected: true
  })
});
