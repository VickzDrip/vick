window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  rulerToolV2: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.rulerToolV2) || {}, {
    labelAnchor: "center of ruler box",
    labelMustNotFollowEndpoint: true,
    labelMustNotSlideAcrossChart: true
  })
});
