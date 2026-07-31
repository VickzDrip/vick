window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  volumeIndicator: {
    officialized: true,
    name: "DVL Volume",
    mustUseOwnSettings: true,
    candleColorSettingsMustNotControlVolume: true,
    requiredControls: ["ON/OFF", "MA ON/OFF", "MA Length", "Bull color", "Bear color", "Opacity"],
    nativeControlsForbidden: true,
    resetHeaderOnly: true
  }
});
