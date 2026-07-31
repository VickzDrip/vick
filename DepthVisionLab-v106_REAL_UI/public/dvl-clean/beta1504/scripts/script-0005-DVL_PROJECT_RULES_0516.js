window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  timeframeHotbar: {
    favoritesMustAutoSortAscending: true,
    sortOrder: "smallest timeframe to largest timeframe",
    manyFavoritesMustRemainUsable: true,
    requiredBehavior: "horizontal scroll, compact buttons, no ugly text clipping"
  },
  indicatorsDropdown: {
    toggleMustReserveRightSpace: true,
    toggleMayNotOverlapTitleOrSubtitle: true,
    titleColumnMustUseMinmaxZero: true
  }
});
