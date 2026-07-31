(function(){
  "use strict";
  if(window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989) return;

  function page(){
    return document.getElementById("dvlCopilotPage0974");
  }

  function findChat(p){
    return p ? p.querySelector("[data-dvl-cp-section='ai-chat']") : null;
  }

  function findPreMomentum(p){
    return p ? p.querySelector("[data-dvl-cp-section='decision'][data-dvl-cp-section-version='0986'], [data-dvl-cp-section='decision']") : null;
  }

  function findBot(p){
    return p ? p.querySelector("[data-dvl-cp-section='bot-soon']") : null;
  }

  function ensureChatExists(p){
    var chat = findChat(p);
    if(chat) return chat;
    try{
      if(window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988 && typeof window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988.patch === "function"){
        window.DVL_COPILOT_AI_CHAT_SITE_HELPER_0988.patch();
      }
    }catch(_){ }
    return findChat(p);
  }

  function patch(){
    var p = page();
    if(!p) return false;

    var bot = findBot(p);
    if(!bot) return false;

    var chat = ensureChatExists(p);
    if(!chat) return false;

    /*
      Ordem final desejada:
      Pré-Momentum -> Chat IA DVL -> DVL BOT SOON
      O chat fica penúltimo porque o Bot Soon deve continuar sendo o último painel.
    */
    if(chat.nextElementSibling !== bot){
      bot.parentNode.insertBefore(chat, bot);
    }

    return chat.nextElementSibling === bot;
  }

  function boot(){
    patch();
    setTimeout(patch,0);
    setTimeout(patch,250);
    setTimeout(patch,700);
    setTimeout(patch,1400);
    /* DVL 0.993 stability: chat position loop disabled after initial boot. */
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989 = {
    version:"0.989",
    patch:patch,
    audit:function(){
      patch();
      var p = page();
      var pre = findPreMomentum(p);
      var chat = findChat(p);
      var bot = findBot(p);
      var preBeforeChat = !!(pre && chat && (pre.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING));
      var chatBeforeBot = !!(chat && bot && chat.nextElementSibling === bot);
      return {
        version:"0.989",
        preMomentumFound:!!pre,
        chatPanelFound:!!chat,
        botSoonFound:!!bot,
        preMomentumBeforeChat:preBeforeChat,
        chatIsPenultimateBeforeBot:chatBeforeBot,
        noTradeExecution:true,
        noOrdersSent:true,
        noApiTouch:true,
        noIndicatorsTouch:true,
        noDrawingsTouch:true,
        noTradePanelTouch:true,
        noFallbackTouch:true,
        pass:!!(pre && chat && bot && preBeforeChat && chatBeforeBot)
      };
    }
  };

  window.DVL_COPILOT_AI_CHAT_PENULTIMATE_AUDIT = function(){
    return window.DVL_COPILOT_AI_CHAT_PENULTIMATE_0989.audit();
  };
})();
