window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  derivativesFlowIndicator: {
    officialized: true,
    panels: ["Open Interest (Candles)", "Long/Short Ratio (Accounts)"],
    dataSource: "Binance public futures data by default; CoinGlass exact API optional with key",
    openInterestEndpoint: "/futures/data/openInterestHist",
    accountRatioEndpoint: "/futures/data/globalLongShortAccountRatio",
    maxHistory: 500
  }
});
