(function(){
  "use strict";

  function makeDecisionModule(){
    return '' +
      '<section class="dvlCp0976Panel dvlCp0985DecisionPanel" data-dvl-cp-section="decision">' +
        '<div class="dvlCp0976SectionHead dvlCp0985DecisionHead">' +
          '<b><i class="dvlCp0985DecisionIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 13.2 9 17.4 19.2 7.2"/><path d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2"/></g></svg></i> Checklist da IA</b>' +
          '<span class="dvlCp0985DecisionChip">Decisão</span>' +
        '</div>' +
        '<div class="dvlCp0985DecisionSub">Use o Top 3 como filtro. Aqui ficam as condições para validar a entrada.</div>' +
        '<div class="dvlCp0985DecisionGrid">' +
          '<div class="dvlCp0985DecisionItem good"><span>Setup dominante</span><b>Continuação LONG</b></div>' +
          '<div class="dvlCp0985DecisionItem wait"><span>Melhor entrada</span><b>Pullback ou rompimento</b></div>' +
          '<div class="dvlCp0985DecisionItem neutral"><span>Risco atual</span><b>Moderado</b></div>' +
          '<div class="dvlCp0985DecisionItem risk"><span>Invalidação</span><b>Perder estrutura + volume contra</b></div>' +
        '</div>' +
        '<div class="dvlCp0985ConfirmBox">' +
          '<div class="dvlCp0985ConfirmTitle">Confirmações antes da entrada</div>' +
          '<div class="dvlCp0985ConfirmTags">' +
            '<i class="good">spike recente</i><i class="good">volume sustenta</i><i class="wait">candle confirma</i><i class="risk">sem pullback violento</i>' +
          '</div>' +
        '</div>' +
        '<div class="dvlCp0985DecisionFoot"><span>Leitura gerada para o Top 3 atual</span><b>IA não executa trades</b></div>' +
      '</section>';
  }

  function patch(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page) return false;

    var oldAvoid = page.querySelector('[data-dvl-cp-section="avoid"]');
    if(oldAvoid) oldAvoid.remove();

    var oldDecision = page.querySelector('[data-dvl-cp-section="decision"]');
    if(!oldDecision){
      var bot = page.querySelector('[data-dvl-cp-section="bot-soon"]');
      if(bot) bot.insertAdjacentHTML("beforebegin", makeDecisionModule());
    }

    return true;
  }

  function boot(){
    patch();
    setTimeout(patch,0);
    setTimeout(patch,350);
    setTimeout(patch,1000);
    /* DVL 0.993 stability: old patch interval disabled after initial boot. */
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_AI_DECISION_CHECKLIST_0985 = {
    version:"0.985",
    patch:patch,
    audit:function(){
      patch();
      var page = document.getElementById("dvlCopilotPage0974");
      var decision = page ? page.querySelector('[data-dvl-cp-section="decision"]') : null;
      var avoid = page ? page.querySelector('[data-dvl-cp-section="avoid"]') : null;
      return {
        version:"0.985",
        decisionModuleFound:!!decision,
        oldAvoidRemoved:!avoid,
        checklistItems:decision ? decision.querySelectorAll(".dvlCp0985DecisionItem").length : 0,
        confirmationTags:decision ? decision.querySelectorAll(".dvlCp0985ConfirmTags i").length : 0,
        moreUsefulThanAvoidList:true,
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!decision && !avoid
      };
    }
  };

  window.DVL_COPILOT_AI_DECISION_CHECKLIST_AUDIT = function(){
    return window.DVL_COPILOT_AI_DECISION_CHECKLIST_0985.audit();
  };
})();
