window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  volumeIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.volumeIndicator) || {}, {
    volumeHeightConfigurable: true,
    defaultHeightMultiplier: 2.0,
    heightMaxMultiplier: 5,
    heightMustNotChangePriceScale: true
  })
});
