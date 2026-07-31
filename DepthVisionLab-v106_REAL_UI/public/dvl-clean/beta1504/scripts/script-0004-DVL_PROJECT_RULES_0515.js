window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  indicatorSettingsStandard: "v1",
  mustReuseExistingDvlComponents: true,
  indicatorControls: {
    nativeDropdownsAllowed: false,
    nativeNumericKeyboardAllowed: false,
    nativeColorPickerAllowed: false,
    requiredControlStyle: "DVL custom controls only",
    requiredSwitchClass: "dvl-switch",
    compactInputHeightPx: 22,
    preferredGridColumns: 3
  },
  indicatorReset: {
    bodyResetButtonAllowed: false,
    requiredLocation: "panel header beside close button",
    requiredVisual: "circular reset icon only",
    textLabelAllowed: false
  },
  futureIndicatorWorkflow: {
    step1: "reuse DVL standard settings shell",
    step2: "add only indicator mechanics",
    step3: "do not redesign controls unless user explicitly approves a new standard"
  }
});
