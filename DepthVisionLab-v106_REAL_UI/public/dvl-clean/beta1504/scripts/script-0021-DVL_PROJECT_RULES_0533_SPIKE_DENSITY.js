window.DVL_PROJECT_RULES = Object.assign({}, window.DVL_PROJECT_RULES || {}, {
  spikeZonesIndicator: Object.assign({}, (window.DVL_PROJECT_RULES && window.DVL_PROJECT_RULES.spikeZonesIndicator) || {}, {
    defaultExpire: 0,
    defaultMaxZones: 200,
    noGlobalStrongestOnlyCut: true,
    visibleZoneDensityMustBePreserved: true,
    spacingAndProximityMustNotEraseMostZones: true
  })
});
