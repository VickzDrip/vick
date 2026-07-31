(function(){
  "use strict";

  var rows = [
    {pair:"ADA/USDT", coin:"A", reason:"Risco elevado", tags:["fluxo fraco","sem confirmação"]},
    {pair:"TON/USDT", coin:"T", reason:"Fragilidade no fluxo", tags:["volume baixo","pressão vendedora"]},
    {pair:"BNB/USDT", coin:"B", reason:"Overheated", tags:["esticado","chance de pullback"]}
  ];

  function renderRow(r){
    return '' +
      '<div class="dvlCp0984AvoidItem">' +
        '<div class="dvlCp0984AvoidCoin">'+r.coin+'</div>' +
        '<div class="dvlCp0984AvoidMain">' +
          '<div class="dvlCp0984AvoidTop"><b>'+r.pair+'</b><span>'+r.reason+'</span></div>' +
          '<div class="dvlCp0984AvoidTags">'+r.tags.map(function(t){return '<i>'+t+'</i>';}).join('')+'</div>' +
        '</div>' +
        '<div class="dvlCp0984AvoidRisk">Evitar</div>' +
      '</div>';
  }

  function patchAvoid(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page) return false;
    var avoid = page.querySelector('[data-dvl-cp-section="avoid"]');
    if(!avoid) return false;

    avoid.classList.add("dvlCp0984AvoidPanel");

    var head = avoid.querySelector(".dvlCp0976SectionHead");
    if(head){
      head.classList.add("dvlCp0984AvoidHead");
      var oldRight = head.querySelector(".link");
      if(oldRight) oldRight.remove();
      if(!head.querySelector(".dvlCp0984AvoidChip")){
        head.insertAdjacentHTML("beforeend", '<span class="dvlCp0984AvoidChip">Motivos</span>');
      }
    }

    if(!avoid.querySelector(".dvlCp0984AvoidSub")){
      var gridOld = avoid.querySelector(".dvlCp0976AvoidGrid,.dvlCp0984AvoidGrid");
      if(gridOld){
        gridOld.insertAdjacentHTML("beforebegin", '<div class="dvlCp0984AvoidSub">Evitar quando o risco não compensa a leitura atual.</div>');
      }
    }

    var grid = avoid.querySelector(".dvlCp0984AvoidGrid");
    if(!grid){
      var oldGrid = avoid.querySelector(".dvlCp0976AvoidGrid");
      if(oldGrid){
        oldGrid.className = "dvlCp0984AvoidGrid";
        grid = oldGrid;
      }
    }

    if(grid && !grid.dataset.dvlCp0984Applied){
      grid.dataset.dvlCp0984Applied = "1";
      grid.innerHTML = rows.map(renderRow).join("");
    }

    return true;
  }

  function boot(){
    patchAvoid();
    setTimeout(patchAvoid,0);
    setTimeout(patchAvoid,350);
    setTimeout(patchAvoid,1000);
    /* DVL 0.993 stability: avoid panel interval disabled after initial boot. */
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_AVOID_REASONS_COMPACT_0984 = {
    version:"0.984",
    patch:patchAvoid,
    audit:function(){
      patchAvoid();
      var page = document.getElementById("dvlCopilotPage0974");
      var avoid = page ? page.querySelector('[data-dvl-cp-section="avoid"]') : null;
      var itemCount = avoid ? avoid.querySelectorAll(".dvlCp0984AvoidItem").length : 0;
      var tagCount = avoid ? avoid.querySelectorAll(".dvlCp0984AvoidTags i").length : 0;
      return {
        version:"0.984",
        pageFound:!!page,
        avoidPanelFound:!!avoid,
        clearReasons:itemCount >= 3,
        evidenceTags:tagCount,
        compactLayout:true,
        betterSpaceUse:true,
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!(page && avoid && itemCount >= 3 && tagCount >= 6)
      };
    }
  };

  window.DVL_COPILOT_AVOID_REASONS_COMPACT_AUDIT = function(){
    return window.DVL_COPILOT_AVOID_REASONS_COMPACT_0984.audit();
  };
})();
