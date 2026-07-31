(function(){
  "use strict";
  function safe(fn, fallback){ try{ return fn(); }catch(e){ return fallback; } }
  function fnText(fn){ return safe(function(){ return typeof fn === "function" ? String(fn) : ""; }, ""); }
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var chart = window.DVL_CHART_MODEL || null;
    var point = window.DVL_TOOL_POINT_MODEL || null;
    var cs = safe(function(){ return chart && chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null; }, null);
    var chartAudit = safe(function(){ return window.DVL_CHART_MODEL_AUDIT ? window.DVL_CHART_MODEL_AUDIT() : null; }, null);
    var pointAudit = safe(function(){ return window.DVL_TOOL_POINT_MODEL_AUDIT ? window.DVL_TOOL_POINT_MODEL_AUDIT() : null; }, null);
    var snapText = chart ? fnText(chart.snapToCandle) : "";
    var renderSnapText = chart ? fnText(chart.renderSnapLevels) : "";
    var shouldSnapLong = safe(function(){ return point.shouldSnap("long", true); }, null);
    var shouldSnapArrow = safe(function(){ return point.shouldSnap("arrow", true); }, null);
    var out = {
      version:"0.941",
      appVersion:window.DVL_APP_VERSION || null,
      chartModelAvailable:!!chart,
      pointModelAvailable:!!point,
      coordinateSystemAvailable:!!cs,
      renderCandleModelAvailable:!!(chart && typeof chart.getRenderCandles === "function" && typeof chart.getRenderCandleAtIndex === "function"),
      renderSnapBridgeAvailable:!!(chart && typeof chart.renderSnapLevels === "function" && snapText.indexOf("renderCandleFromModel") >= 0),
      toolPointAdapterAvailable:!!(point && typeof point.pointFromLocal === "function" && typeof point.toScreen === "function"),
      cursorModelBridgeActive:!!window.__DVL_CURSOR_MODEL_BRIDGE_ACTIVE,
      dragModelBridgeActive:!!window.__DVL_DRAG_MODEL_BRIDGE_ACTIVE,
      longShortSnapDisabled:shouldSnapLong === false,
      drawingSnapEnabled:shouldSnapArrow === true,
      renderSnapLevelsHasVisualY:renderSnapText.indexOf("wickHighY") >= 0 && renderSnapText.indexOf("bodyTopY") >= 0,
      chartAudit:chartAudit,
      pointAudit:pointAudit
    };
    out.pass = !!(
      out.chartModelAvailable &&
      out.pointModelAvailable &&
      out.coordinateSystemAvailable &&
      out.renderCandleModelAvailable &&
      out.renderSnapBridgeAvailable &&
      out.toolPointAdapterAvailable &&
      out.cursorModelBridgeActive &&
      out.dragModelBridgeActive &&
      out.longShortSnapDisabled &&
      out.drawingSnapEnabled &&
      out.renderSnapLevelsHasVisualY
    );
    return out;
  };
})();
