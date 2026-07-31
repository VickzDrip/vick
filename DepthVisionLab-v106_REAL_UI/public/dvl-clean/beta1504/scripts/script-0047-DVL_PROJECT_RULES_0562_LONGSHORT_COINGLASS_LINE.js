window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  longShortOscillator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.longShortOscillator) || {}, {
    renderStyle: "CoinGlass-style moving ratio line",
    columnsForbidden: true,
    showRatioLine: true,
    showMidlineAtOne: true,
    risingLineMeans: "longs entering / shorts exiting",
    fallingLineMeans: "shorts entering / longs exiting",
    currentRatioTagRequired: true
  })
});
