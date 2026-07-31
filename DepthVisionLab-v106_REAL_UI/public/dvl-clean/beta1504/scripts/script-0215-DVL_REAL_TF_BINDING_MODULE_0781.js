(function(){
'use strict';
if(window.DVL_REAL_TF_BINDING_MODULE_0781)return;
window.DVL_REAL_TF_BINDING_MODULE_0781=true;

var DVL_REAL_TF_LIST=["15s","30s","1m","2m","3m","5m","10m","15m","20m","30m","45m","1h","2h","4h","6h","8h","12h","1d","3d","1w","1M"];
window.DVL_REAL_TF_LIST=DVL_REAL_TF_LIST;

window.DVL_REAL_TIMEFRAME_STATE={version:"0.781",activeTf:"5m",lastSavedTf:null};

function normalizeRealTf(tf){
  tf=String(tf||'').trim();
  if(DVL_REAL_TF_LIST.indexOf(tf)>=0)return tf;
  var lower=tf.toLowerCase();
  for(var i=0;i<DVL_REAL_TF_LIST.length;i++){if(DVL_REAL_TF_LIST[i].toLowerCase()===lower)return DVL_REAL_TF_LIST[i];}
  return '5m';
}
window.normalizeRealTf=normalizeRealTf;

function getSavedRealTimeframe(){try{return localStorage.getItem('DVL_SELECTED_TIMEFRAME')||null;}catch(e){return null;}}
window.getSavedRealTimeframe=getSavedRealTimeframe;

function getInitialRealTimeframe(){return normalizeRealTf(getSavedRealTimeframe()||'5m');}
window.getInitialRealTimeframe=getInitialRealTimeframe;

function ensureSaveStatusMini(){
  var el=document.getElementById('dvlSaveStatusMini');if(el)return el;
  var saveBtn=document.getElementById('dvl1b_saveBtn');
  if(!saveBtn||!saveBtn.parentElement)return null;
  el=document.createElement('span');
  el.id='dvlSaveStatusMini';el.className='dvlSaveStatusMini';
  el.dataset.status='idle';el.textContent='';
  saveBtn.parentElement.insertBefore(el,saveBtn.nextSibling);
  return el;
}
window.ensureSaveStatusMini=ensureSaveStatusMini;

function setSaveStatusMini(status,text){
  var el=ensureSaveStatusMini();if(!el)return;
  el.dataset.status=status||'idle';el.textContent=text||'';
  if(status==='saved'||status==='auto'){
    clearTimeout(window.__dvlSaveStatusMiniTimer);
    window.__dvlSaveStatusMiniTimer=setTimeout(function(){el.dataset.status='idle';el.textContent='';},1800);
  }
}
window.setSaveStatusMini=setSaveStatusMini;

function hideUnsupportedSecondTimeframes(){
  var btns=document.querySelectorAll('.tfBtn,.dvl1b-tf,[data-tf],[data-interval]');
  for(var i=0;i<btns.length;i++){
    var raw=btns[i].dataset.tf||btns[i].dataset.interval||btns[i].textContent||'';
    var tf=String(raw).trim().toLowerCase();
    if(tf==='5s'||tf==='15s'||tf==='30s'){btns[i].style.display='none';btns[i].setAttribute('aria-hidden','true');}
  }
}
window.hideUnsupportedSecondTimeframes=hideUnsupportedSecondTimeframes;

function updateExistingTfVisual(tf){
  tf=normalizeRealTf(tf);
  var btns=document.querySelectorAll('.tfBtn,.dvl1b-tf,[data-tf],[data-interval]');
  for(var i=0;i<btns.length;i++){
    var raw=btns[i].dataset.tf||btns[i].dataset.interval||btns[i].textContent||'';
    var btnTf=normalizeRealTf(String(raw).trim());
    btns[i].classList.toggle('active',btnTf===tf);
    btns[i].classList.toggle('is-active',btnTf===tf);
  }
}
window.updateExistingTfVisual=updateExistingTfVisual;

function saveRealTimeframe(tf,mode){
  tf=normalizeRealTf(tf);
  try{
    localStorage.setItem('DVL_SELECTED_TIMEFRAME',tf);
    localStorage.setItem('DVL_SELECTED_TIMEFRAME_SAVED_AT',new Date().toISOString());
    localStorage.setItem('DVL_SELECTED_TIMEFRAME_SAVE_MODE',mode||'manual');
    if(window.DVL_REAL_TIMEFRAME_STATE)window.DVL_REAL_TIMEFRAME_STATE.lastSavedTf=tf;
    if(mode==='autosave')setSaveStatusMini('auto','Auto salvo');
    else setSaveStatusMini('saved','Salvo');
  }catch(e){setSaveStatusMini('error','Erro');}
}
window.saveRealTimeframe=saveRealTimeframe;

function applyRealTimeframe(tf,opts){
  opts=opts||{};tf=normalizeRealTf(tf);
  if(window.DVL_REAL_TIMEFRAME_STATE)window.DVL_REAL_TIMEFRAME_STATE.activeTf=tf;
  window.currentInterval=tf;window.currentTimeframe=tf;window.selectedInterval=tf;
  try{if(typeof currentInterval!=='undefined')currentInterval=tf;}catch(e){}
  try{if(typeof currentTimeframe!=='undefined')currentTimeframe=tf;}catch(e){}
  try{if(typeof selectedInterval!=='undefined')selectedInterval=tf;}catch(e){}
  updateExistingTfVisual(tf);
  if(typeof setIntervalUi==='function'){try{setIntervalUi(tf);}catch(e){}}
  else if(typeof loadKlines==='function'){try{loadKlines(window.currentSymbol||window.symbol,tf);}catch(e){}}
  else if(typeof fetchKlines==='function'){try{fetchKlines(window.currentSymbol||window.symbol,tf);}catch(e){}}
  else if(typeof loadCandles==='function'){try{loadCandles(window.currentSymbol||window.symbol,tf);}catch(e){}}
  try{if(typeof renderChart==='function')renderChart();}catch(e){}
  try{if(typeof draw==='function')draw();}catch(e){}
  try{if(typeof requestChartRender==='function')requestChartRender();}catch(e){}
  if(opts.autosave)saveRealTimeframe(tf,'autosave');
}
window.applyRealTimeframe=applyRealTimeframe;

function stepRealTimeframe(delta){
  var list=DVL_REAL_TF_LIST;
  var current=normalizeRealTf((window.DVL_REAL_TIMEFRAME_STATE?window.DVL_REAL_TIMEFRAME_STATE.activeTf:null)||'5m');
  var idx=list.indexOf(current);
  var nextIdx=Math.max(0,Math.min(list.length-1,idx+delta));
  applyRealTimeframe(list[nextIdx],{autosave:true});
}
window.stepRealTimeframe=stepRealTimeframe;

function bindExistingTfButtons(){
  var btns=document.querySelectorAll('.tfBtn,.dvl1b-tf,[data-tf]');
  for(var i=0;i<btns.length;i++){
    (function(btn){
      if(btn.__dvlRealTfBound)return;
      btn.__dvlRealTfBound=true;
      btn.addEventListener('click',function(ev){
        ev.preventDefault();ev.stopPropagation();
        var raw=btn.dataset.tf||btn.dataset.interval||btn.textContent||'';
        applyRealTimeframe(normalizeRealTf(String(raw).trim()),{autosave:true});
      },true);
    })(btns[i]);
  }
}
window.bindExistingTfButtons=bindExistingTfButtons;

function bindExistingTfRowScroll(){
  var row=document.querySelector('.tfRow')||document.querySelector('.dvl1b-tfScroll')||document.querySelector('#dvl1b_tfPicker')||document.querySelector('[data-role="tf-row"]');
  if(!row||row.__dvlTfScrollBound)return;
  row.__dvlTfScrollBound=true;
  row.addEventListener('wheel',function(ev){ev.preventDefault();ev.stopPropagation();stepRealTimeframe(ev.deltaY>0?1:-1);},{passive:false});
  var startY=null;
  row.addEventListener('touchstart',function(ev){startY=ev.touches&&ev.touches[0]?ev.touches[0].clientY:null;},{passive:true});
  row.addEventListener('touchend',function(ev){
    if(startY==null)return;
    var y=ev.changedTouches&&ev.changedTouches[0]?ev.changedTouches[0].clientY:startY;
    var dy=y-startY;startY=null;
    if(Math.abs(dy)<18)return;
    stepRealTimeframe(dy>0?1:-1);
  },{passive:true});
}
window.bindExistingTfRowScroll=bindExistingTfRowScroll;

function saveDvlProfileManual0781(){
  var tf=normalizeRealTf(window.DVL_REAL_TIMEFRAME_STATE?window.DVL_REAL_TIMEFRAME_STATE.activeTf:'5m');
  saveRealTimeframe(tf,'manual');
  try{if(typeof saveProfile==='function')saveProfile();else if(window.saveProfile)window.saveProfile();}catch(e){}
  var sv=document.getElementById('dvl1b_saveBtn');
  if(sv){try{sv.classList.remove('dvl1b-pulse');void sv.offsetWidth;sv.classList.add('dvl1b-pulse');}catch(_){}}
  setSaveStatusMini('saved','Salvo');
}
window.saveDvlProfileManual0781=saveDvlProfileManual0781;

function bindRealSaveButton0781(){
  var btn=document.getElementById('dvl1b_saveBtn');
  if(!btn||btn.__dvlRealSave0781Bound)return;
  btn.__dvlRealSave0781Bound=true;
  btn.addEventListener('click',function(ev){
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    saveDvlProfileManual0781();
  },true);
}
window.bindRealSaveButton0781=bindRealSaveButton0781;

function installExistingTfUiGuard0781(){
  if(window.__dvlExistingTfUiGuard0781)return;
  window.__dvlExistingTfUiGuard0781=true;
  var target=document.getElementById('DVL_UI_OVERLAY_PHASE_1B')||document.body;
  if(!target||typeof MutationObserver==='undefined')return;
  new MutationObserver(function(){
    hideUnsupportedSecondTimeframes();
    bindExistingTfButtons();
    bindExistingTfRowScroll();
    bindRealSaveButton0781();
    ensureSaveStatusMini();
    updateExistingTfVisual((window.DVL_REAL_TIMEFRAME_STATE?window.DVL_REAL_TIMEFRAME_STATE.activeTf:null)||'5m');
  }).observe(target,{childList:true,subtree:true});
}
window.installExistingTfUiGuard0781=installExistingTfUiGuard0781;

function initRealTimeframeExistingUi0781(){
  hideUnsupportedSecondTimeframes();
  bindExistingTfButtons();
  bindExistingTfRowScroll();
  bindRealSaveButton0781();
  ensureSaveStatusMini();
  var tf=getInitialRealTimeframe();
  if(window.DVL_REAL_TIMEFRAME_STATE)window.DVL_REAL_TIMEFRAME_STATE.activeTf=tf;
  updateExistingTfVisual(tf);
  applyRealTimeframe(tf,{autosave:false,startup:true});
  installExistingTfUiGuard0781();
}
window.initRealTimeframeExistingUi0781=initRealTimeframeExistingUi0781;

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initRealTimeframeExistingUi0781,{once:true});}
else{initRealTimeframeExistingUi0781();}

})();
