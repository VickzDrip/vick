/* ═══════════════════════════════════════════════════════════════
   DVL VERSION ROOT — ALTERE APENAS ESTE NÚMERO
   Badge, título e changelog são atualizados automaticamente.

   REGRA FIXA (não pule isso): TODA mudança que afeta o que o usuário vê
   ou percebe no app exige um bump de versão + entrada no changelog —
   inclusive mudanças SÓ NO BACKEND (dvl-scanner-backend/) que mudam o
   comportamento/dado que aparece no app (ex.: card "Aprendizado (ML)" do
   Copilot, contadores zerando, fonte de OI/LSR mudando). Só pula o bump
   quando a mudança é 100% invisível ao usuário (ex.: refactor interno,
   teste, comentário). Na dúvida, BUMPA.
   ═══════════════════════════════════════════════════════════════ */
window.DVL_APP_VERSION = "Beta 1.598";
/* DVL Beta 0.806 — Header De-overlap Fix
   Add dvl-has-ui-1b to <html> synchronously here in <head>, before
   any body HTML is parsed, so the old chrome (.top/.marketRow/.toolbar)
   is NEVER visible at first paint. Must stay at the top of this script. */
document.documentElement.classList.add("dvl-has-ui-1b");
/* Central version-badge sync — single source (window.DVL_APP_VERSION). Call it
   any time (boot, or after a header rebuild) and it updates every badge in one
   place. Idempotent: only writes when the text actually differs. */
window.DVL_syncVersionBadge = function(){
  try{
    var v = String(window.DVL_APP_VERSION || '').toUpperCase();
    if(!v) return;
    document.querySelectorAll('#dvl1b_versionBadge, #versionBadge, [data-dvl-version], .dvlVersionBadge').forEach(function(el){
      if(el.textContent !== v) el.textContent = v;
    });
  }catch(_){}
};
document.addEventListener('DOMContentLoaded', function(){
  document.title = 'DVL - ' + window.DVL_APP_VERSION;
  window.DVL_syncVersionBadge();
}, {once:true});
