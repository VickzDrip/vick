(function(){
  "use strict";
  if(window.DVLRuntime && window.DVLRuntime.version === "1.205") return;

  var queue = new Map();
  var listeners = Object.create(null);
  var raf = 0;

  function flush(){
    raf = 0;
    var jobs = Array.from(queue.entries());
    queue.clear();

    for(var i = 0; i < jobs.length; i++){
      try{ jobs[i][1](); }catch(err){
        try{ console.error("[DVLRuntime] job failed:", jobs[i][0], err); }catch(_){}
      }
    }

    if(queue.size && !raf) raf = requestAnimationFrame(flush);
  }

  function invalidate(key, job){
    if(typeof job !== "function") return;
    queue.set(String(key || "anonymous"), job);
    if(!raf) raf = requestAnimationFrame(flush);
  }

  function on(name, fn){
    if(typeof fn !== "function") return function(){};
    var bucket = listeners[name] || (listeners[name] = new Set());
    bucket.add(fn);
    return function(){ bucket.delete(fn); };
  }

  function emit(name, detail){
    var bucket = listeners[name];
    if(!bucket || !bucket.size) return;
    Array.from(bucket).forEach(function(fn){
      try{ fn(detail); }catch(err){
        try{ console.error("[DVLRuntime] listener failed:", name, err); }catch(_){}
      }
    });
  }

  function installDrawBridge(){
    var current = window.draw;
    if(typeof current !== "function") return false;
    if(current.__dvlRuntimeBridge1201) return true;

    function bridgedDraw(){
      var result = current.apply(this, arguments);
      emit("chart:draw");
      return result;
    }

    bridgedDraw.__dvlRuntimeBridge1201 = true;
    bridgedDraw.__dvlRuntimeOriginal = current;
    window.draw = bridgedDraw;
    return true;
  }

  window.DVLRuntime = {
    version: "1.205",
    invalidate: invalidate,
    on: on,
    emit: emit,
    installDrawBridge: installDrawBridge,
    pending: function(){ return queue.size; }
  };
})();
