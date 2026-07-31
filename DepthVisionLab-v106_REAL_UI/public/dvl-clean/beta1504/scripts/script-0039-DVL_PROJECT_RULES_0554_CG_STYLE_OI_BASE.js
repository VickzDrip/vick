window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  openInterestOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.openInterestOscillator) || {}, {
    rebuiltFromUploadedBase: "dvl_open_interest_longshort.js",
    renderStyle: "CoinGlass-style AGG OI candlesticks",
    uglyHybridLineBarsForbidden: true,
    mustUseCandleLikeOpenHighLowCloseOI: true,
    mustShowSourceLabel: true,
    fitButtonMustResetManualScale: true,
    rightScaleDragZoomRequired: true
  })
});
