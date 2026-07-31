window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  oscillatorPanelStandard: {
    firstOfficialTest: "Teste",
    mustAppearInIndicatorsDropdown: true,
    ownChartArea: true,
    ownRightScale: true,
    ownInteractionLayer: true,
    interactionsRequired: ["pan", "wheel zoom", "pinch zoom", "right scale drag zoom", "vertical pan"],
    panelMayBeEmpty: true,
    noNativeControls: true,
    derivativesPanelsRemovedForNow: true
  }
});
