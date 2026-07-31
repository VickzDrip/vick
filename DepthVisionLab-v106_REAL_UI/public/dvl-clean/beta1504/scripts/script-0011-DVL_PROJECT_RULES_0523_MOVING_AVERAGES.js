window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  movingAveragesIndicator: {
    sourceImported: "dvl_moving_averages.js",
    maxAverages: 10,
    supportedTypes: ["SMA","EMA","WMA","VWMA","RMA","HMA","DEMA","TEMA","LSMA","KAMA"],
    uiMustFollow: "DVL Indicator Settings Standard v1",
    nativeControlsForbidden: true,
    resetHeaderOnly: true
  }
});
