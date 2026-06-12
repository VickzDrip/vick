/* DVL Drawing Tools v4 + Replay — Crosshair-driven, TradingView-like */
(function DVL_DrawReplay(){
'use strict';

/* ─── CONSTANTS & CONFIG ─── */
const HIT_D=9,HIT_M=16,HDL_R_D=6,HDL_R_M=9;
const STYLES={
  line:{color:'#00d4ff',width:1.5,opacity:0.95,dash:'solid'},
  rect:{borderColor:'#00d4ff',fillColor:'#0064b4',fillAlpha:0.07,borderWidth:1,opacity:0.95,dash:'solid',midline:false,midColor:'#00d4ff',midWidth:1,midDash:'dashed'},
  text:{color:'#e8f0ff',fontSize:12,fontFamily:'monospace',bgColor:'rgba(6,12,22,0.72)'},
  arrow:{color:'#00d4ff',width:2.5,opacity:0.97,headSize:18,dash:'solid'}
};
const CFG={snapToCandle:true,keepTool:false};

/* ─── HELPERS ─── */
const el=id=>document.getElementById(id);
const mob=()=>window.matchMedia('(pointer:coarse)').matches;
const HIT=()=>mob()?HIT_M:HIT_D;
const HDL=()=>mob()?HDL_R_M:HDL_R_D;
const uid=()=>Date.now()+Math.floor(Math.random()*1e6);
const ready=fn=>document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);
const clone=o=>JSON.parse(JSON.stringify(o));

/* ─── TIMESTAMP→INDEX CACHE ─── */
let _tic={},_ticN=-1;
function tToIdx(t){
  const n=S.candles.length;
  if(_ticN!==n){_tic={};_ticN=n;}
  if(_tic[t]!==undefined)return _tic[t];
  if(!n)return 0;
  const cs=S.candles;let lo=0,hi=n-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(cs[mid].t<t)lo=mid+1;else hi=mid;}
  if(lo>0&&Math.abs(cs[lo-1].t-t)<Math.abs(cs[lo].t-t))lo--;
  return(_tic[t]=lo);
}

/* ─── COORDINATE SYSTEM ─── */
let _lastCS=null;
function buildCS(){
  const wrap=el('chartWrap');if(!wrap)return null;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const span=Math.max(0.35,S.view.end-S.view.start);
  const cw=CW(W);
  const a=Math.floor(S.view.start),b=Math.ceil(S.view.end);
  const vs=S.candles.slice(Math.max(0,a),Math.min(S.candles.length,b));
  const sc=scale(vs.length?vs:S.candles.slice(-1),H);
  return{
    W,H,cw,span,sc,
    xI:i=>PL+(i-S.view.start+0.5)*cw/span,
    xT:t=>PL+(tToIdx(t)-S.view.start+0.5)*cw/span,
    yP:p=>sc.y(p),
    pY:y=>sc.lo+(1-(y-PT)/(H-PT-PB))*(sc.hi-sc.lo),
    iX:sx=>S.view.start+(sx-PL)*span/cw-0.5
  };
}
function getCS(){return _lastCS||buildCS();}

/* ─── S.cursor: crosshair position in chart coordinates ─── */
function _syncCursor(cs){
  if(!S._cross||!cs||!S.candles.length){S.cursor=null;return;}
  const{cx,cy}=S._cross;
  const raw=cs.iX(cx);
  // Clamp to existing candles for candle-snap, but keep raw for future-space drawing
  const idx=Math.max(0,Math.min(Math.round(raw),S.candles.length-1));
  const c=S.candles[idx];
  S.cursor={active:true,screenX:cx,screenY:cy,index:raw,snapIndex:idx,time:c?c.t:0,price:cs.pY(cy)};
}
function _cursorPoint(){
  if(!S.cursor)return null;
  // index is the raw (possibly future) float; time from nearest real candle
  return{index:S.cursor.index,time:S.cursor.time,price:S.cursor.price};
}

/* ─── COORDINATE CONVERTERS ─── */
function screenToChartPoint(sx,sy,cs){
  cs=cs||getCS();if(!cs)return{index:0,time:0,price:0};
  const raw=cs.iX(sx);
  // Allow raw index past last candle for future-space drawings
  const si=Math.round(Math.max(0,Math.min(raw,S.candles.length-1)));
  const c=S.candles[si];
  return{index:raw,time:c?c.t:0,price:cs.pY(sy)};
}
function chartPointToScreen(p,cs){
  cs=cs||getCS();if(!cs)return{x:0,y:0};
  const n=S.candles.length;
  let idx;
  // If stored index extends past last candle, use it directly (future projection)
  if(p.index!=null&&p.index>n-0.5)idx=p.index;
  else if(p.time)idx=tToIdx(p.time);
  else idx=p.index||0;
  return{x:cs.xI(idx),y:cs.yP(p.price)};
}

/* ─── STATE MACHINE ─── */
const ST={IDLE:'idle',DRAWING:'drawing',SEL:'sel',DRAG_BODY:'drag_body',DRAG_HDL:'drag_hdl',EDIT_TEXT:'edit_text'};
let _sm=ST.IDLE;
let _tool=null;
let _draft=null;
let _selId=null;
let _drag=null;
let _editId=null;
let _lpt=null;
let _ctxMenu=null;
let _dblTap=null;
let _crossDragStart=null;
let _touchMoved=false;
let _history=[],_histPtr=-1;
let _settingsOpen=false;

/* ─── INIT ─── */
ready(()=>{
  if(typeof S==='undefined')return;
  if(!S.drawings)S.drawings=[];
  if(!S.selectedDrawing)S.selectedDrawing=null;
  if(!S.replay)S.replay={enabled:false,index:null,playing:false,speed:1,timer:null,selectingStart:false};
  else if(S.replay.selectingStart===undefined)S.replay.selectingStart=false;
  S.cursor=null;
  _initBtns();_initEvents();_patchDraw();_loadDrawings();_watchSymTf();
  _history=[clone(S.drawings)];_histPtr=0;_syncHistoryBtns();
});

/* ─── BUTTONS ─── */
function _initBtns(){
  [{id:'rpDrawLine',tool:'trendline'},{id:'rpDrawRect',tool:'rectangle'},{id:'rpDrawText',tool:'text'},{id:'rpDrawArrow',tool:'arrow'}]
  .forEach(({id,tool})=>{
    const b=el(id);if(!b)return;
    b.addEventListener('click',()=>_tool===tool?_clearTool():_setTool(tool));
  });
  const dBtn=el('dvlDrawDelete');if(dBtn)dBtn.addEventListener('click',_deleteSelected);
  const gBtn=el('dvlDrawSettingsBtn');if(gBtn){gBtn.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();_toggleSettings();};gBtn.addEventListener('pointerdown',ev=>ev.stopPropagation(),true);}
  const txOk=el('dvlTextOk'),txC=el('dvlTextCancel'),txI=el('dvlTextInput');
  if(txOk)txOk.addEventListener('click',_confirmText);
  if(txC)txC.addEventListener('click',_cancelText);
  if(txI)txI.addEventListener('keydown',e=>{if(e.key==='Enter')_confirmText();if(e.key==='Escape')_cancelText();});
  const rBtn=el('rpReplay');if(rBtn)rBtn.addEventListener('click',()=>S.replay.enabled?_disableReplay():_enableReplay());
  const rPlay=el('dvlRpPlay'),rBack=el('dvlRpBack'),rFwd=el('dvlRpFwd'),rSpd=el('dvlRpSpeed'),rExit=el('dvlRpExit');
  if(rPlay)rPlay.addEventListener('click',()=>S.replay.playing?_pauseReplay():_playReplay());
  if(rBack)rBack.addEventListener('click',_stepBack);
  if(rFwd)rFwd.addEventListener('click',_stepFwd);
  if(rSpd)rSpd.addEventListener('click',()=>{
    const s=[1,2,5],i=s.indexOf(S.replay.speed||1);S.replay.speed=s[(i+1)%s.length];rSpd.textContent=S.replay.speed+'x';
    if(S.replay.playing){_pauseReplay();_playReplay();}
  });
  if(rExit)rExit.addEventListener('click',_disableReplay);
}

/* ─── TOOL STATE ─── */
function _setTool(t){
  _cancelDrawing();_deselect();_tool=t;S.drawingToolActive=true;_sm=ST.IDLE;_updateToolBtns();
  const wrap=el('chartWrap');if(wrap)wrap.style.cursor='crosshair';
  drawSoon();
}
function _clearTool(){
  _tool=null;S.drawingToolActive=false;_draft=null;
  if(_sm===ST.DRAWING)_sm=ST.IDLE;
  _updateToolBtns();
  const wrap=el('chartWrap');if(wrap)wrap.style.cursor='';
  drawSoon();
}
function _cancelDrawing(){_draft=null;if(_sm===ST.DRAWING)_sm=ST.IDLE;if(!_tool)S.drawingToolActive=false;}
function _updateToolBtns(){
  [{id:'rpDrawLine',t:'trendline'},{id:'rpDrawRect',t:'rectangle'},{id:'rpDrawText',t:'text'},{id:'rpDrawArrow',t:'arrow'}]
  .forEach(({id,t})=>{const b=el(id);if(b)b.classList.toggle('dvl-active',t===_tool);});
}

/* ─── HISTORY ─── */
function _pushHistory(){
  if(_histPtr<_history.length-1)_history.splice(_histPtr+1);
  _history.push(clone(S.drawings));
  if(_history.length>30){_history.shift();}else{_histPtr++;}
  _syncHistoryBtns();
}
function _undo(){
  if(_histPtr<=0)return;
  _histPtr--;S.drawings=clone(_history[_histPtr]);
  _closeSettings();_deselect();_saveDrawings();drawSoon();_syncHistoryBtns();
}
function _redo(){
  if(_histPtr>=_history.length-1)return;
  _histPtr++;S.drawings=clone(_history[_histPtr]);
  _closeSettings();_deselect();_saveDrawings();drawSoon();_syncHistoryBtns();
}
// Expose to topbar buttons and addPosition (outside IIFE scope)
window.__dvlUndo=()=>_undo();
window.__dvlRedo=()=>_redo();
window.__dvlSave=()=>_saveFlash();
window.__dvlSelectId=id=>_select(id);
window.__dvlPushHistory=()=>_pushHistory();
window.__dvlSaveDrawings=()=>_saveDrawings();

/* ─── CTX BAR SYNC (in-chart: settings + delete) ─── */
function _syncCtxBar(){
  const bar=el('dvlDrawCtxBar');
  if(bar)bar.style.display=_selId?'flex':'none';
}
/* ─── TOPBAR HISTORY BUTTONS SYNC ─── */
function _syncHistoryBtns(){
  const ub=el('tbUndoBtn'),rb=el('tbRedoBtn');
  const canUndo=_histPtr>0,canRedo=_histPtr<_history.length-1;
  if(ub){ub.classList.toggle('tb-disabled',!canUndo);}
  if(rb){rb.classList.toggle('tb-disabled',!canRedo);}
}

/* ─── SELECTION ─── */
function _select(id){
  _selId=id;S.selectedDrawing=id?S.drawings.find(d=>d.id===id):null;
  _sm=id?ST.SEL:ST.IDLE;
  if(!id)_closeSettings();
  _syncCtxBar();drawSoon();
}
function _deselect(){
  _selId=null;S.selectedDrawing=null;_drag=null;
  if(_sm===ST.SEL||_sm===ST.DRAG_BODY||_sm===ST.DRAG_HDL)_sm=ST.IDLE;
  _closeSettings();_syncCtxBar();
}
function _getSelected(){return _selId?S.drawings.find(d=>d.id===_selId):null;}
function _deleteSelected(){
  if(!_selId)return;
  S.drawings=S.drawings.filter(d=>d.id!==_selId);
  _selId=null;S.selectedDrawing=null;_sm=ST.IDLE;_drag=null;
  _closeSettings();_syncCtxBar();_pushHistory();_saveDrawings();drawSoon();
}
function _dupSelected(){
  const orig=_getSelected();if(!orig)return;
  const d=clone(orig);d.id=uid();
  const shift=(S.candles.at(-1)?.c||0)*0.001||1;
  if(d.type==='longpos'||d.type==='shortpos'){
    d.x1+=3;d.x2+=3;d.entry+=shift;d.stop+=shift;d.target+=shift;
  } else {
    if(d.p1)d.p1.price+=shift;if(d.p2)d.p2.price+=shift;if(d.p)d.p.price+=shift;
  }
  S.drawings.push(d);_select(d.id);_pushHistory();_saveDrawings();drawSoon();
}

/* ─── SAVE FLASH ─── */
function _saveFlash(){
  _saveDrawings();
  const b=el('tbSaveBtn');if(!b)return;
  const prev=b.innerHTML;
  b.classList.add('tb-save-ok');
  b.innerHTML='<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,8 7,12 13,5"/></svg>';
  setTimeout(()=>{b.innerHTML=prev;b.classList.remove('tb-save-ok');},900);
}

/* ─── EVENTS ─── */
function _initEvents(){
  const wrap=el('chartWrap');if(!wrap)return;
  wrap.addEventListener('mousedown',_onMD,true);
  window.addEventListener('mousemove',_onMM,true);
  window.addEventListener('mouseup',_onMU,true);
  wrap.addEventListener('click',_onCk,true);
  wrap.addEventListener('touchstart',_onTS,{capture:true,passive:false});
  wrap.addEventListener('touchmove',_onTM,{capture:true,passive:false});
  wrap.addEventListener('touchend',_onTE,{capture:true,passive:false});
  window.addEventListener('dblclick',_onDbl,true);
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(_settingsOpen){_closeSettings();return;}
      if(_sm===ST.DRAWING){_cancelDrawing();drawSoon();}
      else{_clearTool();_deselect();_closeCtx();drawSoon();}
    }
    if((e.key==='Delete'||e.key==='Backspace')&&_selId&&document.activeElement===document.body)_deleteSelected();
    if(e.key==='z'&&(e.ctrlKey||e.metaKey)&&!e.shiftKey){e.preventDefault();_undo();}
    if((e.key==='y'&&(e.ctrlKey||e.metaKey))||(e.key==='z'&&(e.ctrlKey||e.metaKey)&&e.shiftKey)){e.preventDefault();_redo();}
  });
  window.addEventListener('contextmenu',e=>{if(_sm===ST.DRAWING){e.preventDefault();_cancelDrawing();drawSoon();}});
  wrap.addEventListener('click',e=>{
    if(!S.replay?.enabled||S.replay.selectingStart||_tool||_selId)return;
    const cs=getCS();if(!cs)return;
    const r=wrap.getBoundingClientRect();
    const idx=Math.round(cs.iX(e.clientX-r.left));
    const all=S._allCandles||S.candles;
    if(idx>=0&&idx<all.length)_setReplayIdx(idx);
  });
}

const _CTX_GUARD='#dvlDrawCtxBar,#dvlDrawSettingsPanel,#dvlDrawDelete,#viewBtnDock,#dvlMiniRefresh';
function _onCk(e){
  if(e.target?.closest?.(_CTX_GUARD))return;
  if(_tool||_sm===ST.DRAWING||S.replay?.selectingStart)e.stopPropagation();
}

function _onMD(e){
  if(e.button!==0)return;
  if(e.target?.closest?.(_CTX_GUARD))return;
  _closeCtx();
  /* P0: replay start selection */
  if(S.replay?.selectingStart){
    e.stopPropagation();e.preventDefault();
    const cs=getCS();if(!cs)return;
    const wrap=el('chartWrap');if(!wrap)return;
    const r=wrap.getBoundingClientRect();
    S._cross={cx:e.clientX-r.left,cy:e.clientY-r.top};
    _syncCursor(cs);
    if(S.cursor){S.replay.selectingStart=false;S.replay.index=S.cursor.index;_showRpBar(true);drawSoon();}
    return;
  }
  const cs=getCS();if(!cs)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const p={x:e.clientX-r.left,y:e.clientY-r.top};
  if(_tool||_sm===ST.DRAWING){
    e.stopPropagation();e.preventDefault();
    if(!S._cross||!S.cursor){S._cross={cx:p.x,cy:p.y};_syncCursor(cs);}
    _handleDrawClick(cs);return;
  }
  const sel=_getSelected();
  if(sel){
    const hh=_hitHandles(p.x,p.y,sel,cs);
    if(hh){e.stopPropagation();_sm=ST.DRAG_HDL;_drag={handle:hh,ox:p.x,oy:p.y,origDraw:clone(sel),started:false};return;}
    if(_hitDrawing(sel,p.x,p.y,cs)){e.stopPropagation();_drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(sel),started:false};return;}
  }
  const hit=_hitAll(p.x,p.y,cs);
  if(hit){e.stopPropagation();_select(hit.id);_drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(hit),started:false};return;}
  if(_selId){_deselect();drawSoon();}
}

/* DRAWING state: no stopPropagation so native mousemove updates S._cross and crosshair shows.
   DRAG states: stop propagation to block chart pan. */
function _onMM(e){
  if(_sm===ST.DRAWING||S.replay?.selectingStart)return;
  const cs=getCS();if(!cs)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const p={x:e.clientX-r.left,y:e.clientY-r.top};
  if(_sm===ST.DRAG_HDL&&_drag){if(!_drag.started&&Math.hypot(p.x-_drag.ox,p.y-_drag.oy)>2)_drag.started=true;_applyHandleDrag(p,cs);e.stopPropagation();drawSoon();return;}
  if(_drag&&!_drag.started&&_selId){
    if(Math.hypot(p.x-_drag.ox,p.y-_drag.oy)>4){
      _drag.started=true;_sm=ST.DRAG_BODY;_applyBodyDrag(p,cs);e.stopPropagation();drawSoon();return;
    }
  }
  if(_sm===ST.DRAG_BODY&&_drag?.started){_applyBodyDrag(p,cs);e.stopPropagation();drawSoon();}
}

function _onMU(e){
  if(_sm===ST.DRAG_BODY||_sm===ST.DRAG_HDL){_sm=ST.SEL;if(_drag?.started){_pushHistory();_saveDrawings();}; _drag=null;e.stopPropagation();return;}
  if(_drag){_drag=null;e.stopPropagation();}
}

/* Mobile drawing: touchstart → seeds/keeps crosshair, drag is relative (like native cross mode).
   Slide finger to adjust. touchend → confirm point. */
function _onTS(e){
  if(e.touches.length>1)return;
  if(e.target?.closest?.(_CTX_GUARD))return;
  _closeCtx();
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const t=e.touches[0];
  const x=t.clientX-r.left,y=t.clientY-r.top;
  if(S.replay?.selectingStart||_tool||_sm===ST.DRAWING){
    e.stopPropagation();e.preventDefault();
    _touchMoved=false;
    /* Relative drag: crosshair stays where it is, finger delta moves it */
    const baseCX=S._cross?S._cross.cx:x;
    const baseCY=S._cross?S._cross.cy:y;
    S._cross={cx:baseCX,cy:baseCY};
    _crossDragStart={fx:x,fy:y,cx:baseCX,cy:baseCY};
    drawSoon();return;
  }
  const cs=getCS();if(!cs)return;
  const p={x,y};
  const sel=_getSelected();
  if(sel){
    const hh=_hitHandles(p.x,p.y,sel,cs);
    if(hh){e.stopPropagation();e.preventDefault();_sm=ST.DRAG_HDL;_drag={handle:hh,ox:p.x,oy:p.y,origDraw:clone(sel),started:false};return;}
    if(_hitDrawing(sel,p.x,p.y,cs)){
      e.stopPropagation();e.preventDefault();
      _drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(sel),started:false};
      _lpt=setTimeout(()=>{_lpt=null;if(!_drag?.started){_drag=null;_showCtx(sel,p);}},520);return;
    }
  }
  const hit=_hitAll(p.x,p.y,cs);
  if(hit){
    e.stopPropagation();e.preventDefault();
    if(_dblTap&&_dblTap.id===hit.id&&Date.now()-_dblTap.t<400){
      _dblTap=null;if(hit.type==='text'){_select(hit.id);_openTextPopup(p,hit.text,hit.id);return;}
    }
    _dblTap={id:hit.id,t:Date.now()};
    _select(hit.id);
    _drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(hit),started:false};
    _lpt=setTimeout(()=>{_lpt=null;if(!_drag?.started){_drag=null;_showCtx(hit,p);}},520);return;
  }
  if(_selId){_deselect();drawSoon();}
}

function _onTM(e){
  if(e.touches.length>1)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const t=e.touches[0];
  const x=t.clientX-r.left,y=t.clientY-r.top;
  if(S.replay?.selectingStart||_tool||_sm===ST.DRAWING){
    e.stopPropagation();e.preventDefault();
    _touchMoved=true;
    if(_crossDragStart){
      const ncx=clamp(_crossDragStart.cx+(x-_crossDragStart.fx),PL,wrap.clientWidth-RP());
      const ncy=clamp(_crossDragStart.cy+(y-_crossDragStart.fy),PT,wrap.clientHeight-PB);
      S._cross={cx:ncx,cy:ncy};
    }else{S._cross={cx:x,cy:y};}
    drawSoon();return;
  }
  if(!(_sm===ST.DRAG_BODY||_sm===ST.DRAG_HDL||(_drag&&!_drag.started)))return;
  if(_lpt){clearTimeout(_lpt);_lpt=null;}
  e.stopPropagation();e.preventDefault();
  const cs=getCS();if(!cs)return;
  const p={x,y};
  if(_sm===ST.DRAG_HDL&&_drag){if(!_drag.started&&Math.hypot(p.x-_drag.ox,p.y-_drag.oy)>2)_drag.started=true;_applyHandleDrag(p,cs);drawSoon();return;}
  if(_drag&&!_drag.started&&_selId){
    if(Math.hypot(p.x-_drag.ox,p.y-_drag.oy)>4){_drag.started=true;_sm=ST.DRAG_BODY;_applyBodyDrag(p,cs);drawSoon();return;}
  }
  if(_sm===ST.DRAG_BODY&&_drag?.started){_applyBodyDrag(p,cs);drawSoon();}
}

function _onTE(e){
  if(_lpt){clearTimeout(_lpt);_lpt=null;}
  _crossDragStart=null;
  if(S.replay?.selectingStart){
    e.stopPropagation();
    const cs=getCS();if(!cs)return;
    _syncCursor(cs);
    if(S.cursor){S.replay.selectingStart=false;S.replay.index=S.cursor.index;_showRpBar(true);drawSoon();}
    return;
  }
  if(_tool||_sm===ST.DRAWING){
    e.stopPropagation();
    const cs=getCS();if(!cs)return;
    _syncCursor(cs);
    if(_touchMoved){
      // Drag-end: update p2 live but don't confirm — user must tap to finalize
      if(_sm===ST.DRAWING&&_draft&&S.cursor)
        _draft.p2={index:S.cursor.index,time:S.cursor.time,price:S.cursor.price};
      drawSoon();
    }else if(S.cursor){
      _handleDrawClick(cs);
    }
    return;
  }
  if(_sm===ST.DRAG_BODY||_sm===ST.DRAG_HDL){_sm=ST.SEL;if(_drag?.started){_pushHistory();_saveDrawings();}; _drag=null;return;}
  if(_drag)_drag=null;
}

function _onDbl(e){
  const cs=getCS();if(!cs)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const p={x:e.clientX-r.left,y:e.clientY-r.top};
  const hit=_hitAll(p.x,p.y,cs);
  if(hit&&hit.type==='text'){e.stopPropagation();_select(hit.id);_openTextPopup(p,hit.text,hit.id);}
}

/* ─── DRAWING LOGIC ─── */
function _handleDrawClick(cs){
  const cp=_cursorPoint();if(!cp)return;
  if(_tool==='text'){
    const sp=chartPointToScreen(cp,cs);
    _draft={id:uid(),type:'text',p:{...cp},text:'',style:{...STYLES.text},locked:false,visible:true,createdAt:Date.now()};
    _openTextPopup({x:sp.x,y:sp.y},null,null);return;
  }
  if(_sm!==ST.DRAWING){
    _draft=_makeDraft(_tool,cp);_sm=ST.DRAWING;drawSoon();
  }else{
    _updateDraftEnd(cp);_finalize();
  }
}
function _makeDraft(type,cp){
  const base={id:uid(),type,locked:false,visible:true,createdAt:Date.now()};
  if(type==='trendline')return{...base,p1:{...cp},p2:{...cp},style:{...STYLES.line},extendLeft:false,extendRight:false};
  if(type==='rectangle')return{...base,p1:{...cp},p2:{...cp},style:{...STYLES.rect}};
  if(type==='arrow')return{...base,p1:{...cp},p2:{...cp},style:{...STYLES.arrow}};
  return base;
}
function _updateDraftEnd(cp){if(_draft)_draft.p2={...cp};}
function _finalize(){
  if(!_draft)return;
  S.drawings.push(_draft);const id=_draft.id;
  _draft=null;_sm=ST.SEL;if(!CFG.keepTool)_clearTool();
  _select(id);_pushHistory();_saveDrawings();drawSoon();
}


/* ─── DRAG ─── */
function _applyBodyDrag(p,cs){
  const d=_getSelected();if(!d||!_drag)return;
  const orig=_drag.origDraw;
  if(d.type==='longpos'||d.type==='shortpos'){
    const dIdx=cs.iX(p.x)-cs.iX(_drag.ox);
    const dp=cs.pY(p.y)-cs.pY(_drag.oy);
    d.x1=orig.x1+dIdx;d.x2=orig.x2+dIdx;
    d.entry=orig.entry+dp;d.stop=orig.stop+dp;d.target=orig.target+dp;
    return;
  }
  const di=cs.iX(p.x)-cs.iX(_drag.ox);
  const dp=cs.pY(p.y)-cs.pY(_drag.oy);
  const clampIdx=v=>Math.max(0,Math.min(v,Math.max(S.candles.length-1,v)));
  const idxOf=pt=>Number.isFinite(+pt.index)?+pt.index:tToIdx(pt.time);
  const timeFor=idx=>{const ri=Math.max(0,Math.min(Math.round(idx),S.candles.length-1));return S.candles[ri]?.t||0;};
  if(d.type==='text'){
    const ni=clampIdx(idxOf(orig.p)+di);
    d.p={index:ni,time:timeFor(ni)||orig.p.time,price:orig.p.price+dp};
  } else {
    const ni1=clampIdx(idxOf(orig.p1)+di);
    const ni2=clampIdx(idxOf(orig.p2)+di);
    d.p1={index:ni1,time:timeFor(ni1)||orig.p1.time,price:orig.p1.price+dp};
    d.p2={index:ni2,time:timeFor(ni2)||orig.p2.time,price:orig.p2.price+dp};
  }
}
function _applyHandleDrag(p,cs){
  const d=_getSelected();if(!d||!_drag)return;
  const h=_drag.handle;
  if(d.type==='longpos'||d.type==='shortpos'){
    const isLong=d.type==='longpos';
    if(h==='h_entry'){
      // Clamp entry between stop and target so it never leaves the zone
      const lo=Math.min(d.stop,d.target),hi=Math.max(d.stop,d.target);
      d.entry=Math.max(lo,Math.min(hi,cs.pY(p.y)));
    } else if(h==='h_target'){
      d.target=cs.pY(p.y);
      // TP crossed entry → flip type and swap TP/SL
      if((isLong&&d.target<d.entry)||(!isLong&&d.target>d.entry)){
        const tmp=d.stop;d.stop=d.target;d.target=tmp;
        d.type=isLong?'shortpos':'longpos';
      }
    } else if(h==='h_stop'){
      d.stop=cs.pY(p.y);
      // SL crossed entry → flip type and swap TP/SL
      if((isLong&&d.stop>d.entry)||(!isLong&&d.stop<d.entry)){
        const tmp=d.target;d.target=d.stop;d.stop=tmp;
        d.type=isLong?'shortpos':'longpos';
      }
    } else if(h==='h_right'){
      d.x2=cs.iX(p.x);
    }
    return;
  }
  const cp=screenToChartPoint(p.x,p.y,cs);
  if(d.type==='trendline'||d.type==='arrow'){
    if(h==='h1')d.p1={...cp};else if(h==='h2')d.p2={...cp};
  } else if(d.type==='rectangle'){
    if(h==='h1')d.p1={...cp};
    else if(h==='h2')d.p2={...cp};
    else if(h==='h3'){d.p2={...d.p2,index:cp.index,time:cp.time};d.p1={...d.p1,price:cp.price};}
    else if(h==='h4'){d.p1={...d.p1,index:cp.index,time:cp.time};d.p2={...d.p2,price:cp.price};}
  } else if(d.type==='text'){d.p={...cp};}
}

/* ─── HIT TESTING ─── */
function _hitAll(mx,my,cs){
  for(let i=S.drawings.length-1;i>=0;i--){
    const d=S.drawings[i];if(d.visible!==false&&_hitDrawing(d,mx,my,cs))return d;
  }return null;
}
function _hitDrawing(d,mx,my,cs){
  if(!d||d.visible===false)return false;const R=HIT();
  if(d.type==='trendline'){
    const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
    return _ptSegDist(mx,my,s1.x,s1.y,s2.x,s2.y)<R;
  }
  if(d.type==='rectangle'){
    const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
    const xMin=Math.min(s1.x,s2.x),xMax=Math.max(s1.x,s2.x),yMin=Math.min(s1.y,s2.y),yMax=Math.max(s1.y,s2.y);
    const nb=(mx>=xMin-R&&mx<=xMax+R&&my>=yMin-R&&my<=yMax+R)&&(Math.abs(mx-xMin)<R||Math.abs(mx-xMax)<R||Math.abs(my-yMin)<R||Math.abs(my-yMax)<R);
    return(mx>=xMin&&mx<=xMax&&my>=yMin&&my<=yMax)||nb;
  }
  if(d.type==='text'){
    const sp=chartPointToScreen(d.p,cs);const fs=d.style?.fontSize||12;
    return mx>=sp.x-4&&mx<=sp.x+d.text.length*fs*0.62+12&&my>=sp.y-fs-2&&my<=sp.y+4;
  }
  if(d.type==='arrow'){
    const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
    return _ptSegDist(mx,my,s1.x,s1.y,s2.x,s2.y)<R;
  }
  if(d.type==='longpos'||d.type==='shortpos'){
    const right=cs.W-RP();
    const xa=clamp(Math.min(cs.xI(d.x1),cs.xI(d.x2)),PL,right);
    const xb=clamp(Math.max(cs.xI(d.x1),cs.xI(d.x2)),PL,right);
    const ye=cs.yP(d.entry),ys=cs.yP(d.stop),yt=cs.yP(d.target);
    const top=Math.min(ye,ys,yt),bot=Math.max(ye,ys,yt);
    // Hit the box area (lines and fills are all within xa→xb)
    if(mx>=xa-R&&mx<=xb+R&&my>=top-R&&my<=bot+R)return true;
    return false;
  }
  return false;
}
function _hitHandles(mx,my,d,cs){
  const R=HDL()+5;
  if(d.type==='trendline'||d.type==='arrow'){
    const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
    if(Math.hypot(mx-s1.x,my-s1.y)<R)return'h1';if(Math.hypot(mx-s2.x,my-s2.y)<R)return'h2';
  } else if(d.type==='rectangle'){
    const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
    if(Math.hypot(mx-s1.x,my-s1.y)<R)return'h1';if(Math.hypot(mx-s2.x,my-s2.y)<R)return'h2';
    if(Math.hypot(mx-s2.x,my-s1.y)<R)return'h3';if(Math.hypot(mx-s1.x,my-s2.y)<R)return'h4';
  } else if(d.type==='longpos'||d.type==='shortpos'){
    const right=cs.W-RP();
    const xa=clamp(Math.min(cs.xI(d.x1),cs.xI(d.x2)),PL,right);
    const xb=clamp(Math.max(cs.xI(d.x1),cs.xI(d.x2)),PL,right);
    const ye=cs.yP(d.entry),ys=cs.yP(d.stop),yt=cs.yP(d.target);
    const Rp=R+4;
    if(Math.hypot(mx-xa,my-ye)<Rp)return'h_entry';
    if(Math.hypot(mx-xa,my-yt)<Rp)return'h_target';
    if(Math.hypot(mx-xa,my-ys)<Rp)return'h_stop';
    const mid=clamp((ye+yt+ys)/3,Math.min(yt,ys,ye),Math.max(yt,ys,ye));
    if(Math.hypot(mx-xb,my-mid)<Rp)return'h_right';
  }
  return null;
}
function _ptSegDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay;if(!dx&&!dy)return Math.hypot(px-ax,py-ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}

/* ─── TEXT POPUP ─── */
function _openTextPopup(sp,existingText,editId){
  const pop=el('dvlTextPopup');if(!pop)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  let lx=r.left+sp.x+12,ly=r.top+sp.y-72;
  lx=Math.min(lx,window.innerWidth-230);ly=Math.max(ly,8);
  pop.style.left=lx+'px';pop.style.top=ly+'px';pop.style.display='flex';pop.style.flexDirection='column';
  const inp=el('dvlTextInput');
  if(inp){inp.value=existingText||'';setTimeout(()=>{inp.focus();inp.select();},50);}
  _editId=editId||null;_sm=ST.EDIT_TEXT;
}
function _confirmText(){
  const pop=el('dvlTextPopup');if(pop)pop.style.display='none';
  const txt=el('dvlTextInput')?.value||'';
  if(_editId){const d=S.drawings.find(x=>x.id===_editId);if(d)d.text=txt;_editId=null;_sm=ST.SEL;_pushHistory();_saveDrawings();drawSoon();return;}
  if(_draft){
    if(txt){_draft.text=txt;S.drawings.push(_draft);const id=_draft.id;_draft=null;_sm=ST.SEL;if(!CFG.keepTool)_clearTool();_select(id);_pushHistory();_saveDrawings();}
    else{_draft=null;_sm=ST.IDLE;if(!CFG.keepTool)_clearTool();}
  }drawSoon();
}
function _cancelText(){
  const pop=el('dvlTextPopup');if(pop)pop.style.display='none';
  _draft=null;_editId=null;if(_sm===ST.EDIT_TEXT)_sm=_selId?ST.SEL:ST.IDLE;
  if(!CFG.keepTool)_clearTool();drawSoon();
}

/* ─── CONTEXT MENU ─── */
function _showCtx(d,sp){
  _closeCtx();const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  let lx=r.left+sp.x,ly=r.top+sp.y;
  if(lx+145>window.innerWidth)lx=window.innerWidth-155;if(ly+180>window.innerHeight)ly=ly-180;
  const m=document.createElement('div');
  m.style.cssText='position:fixed;left:'+lx+'px;top:'+ly+'px;z-index:9999;background:rgba(6,12,22,0.97);border:1px solid rgba(0,212,255,0.28);border-radius:9px;overflow:hidden;font-family:monospace;font-size:11px;min-width:130px;box-shadow:0 8px 28px rgba(0,0,0,0.65);';
  const items=[{lbl:'Deletar',clr:'#ff5252',fn:()=>{_select(d.id);_deleteSelected();}},{lbl:'Duplicar',clr:'#c8d8f0',fn:()=>{_select(d.id);_dupSelected();}}];
  if(d.type==='text')items.splice(1,0,{lbl:'Editar texto',clr:'#00d4ff',fn:()=>{_select(d.id);_openTextPopup(sp,d.text,d.id);}});
  items.push({lbl:'Cancelar',clr:'#6a7fa0',fn:()=>{}});
  items.forEach(({lbl,clr,fn},i)=>{
    const div=document.createElement('div');div.textContent=lbl;
    div.style.cssText='padding:10px 14px;cursor:pointer;color:'+clr+';'+(i<items.length-1?'border-bottom:1px solid rgba(30,42,64,0.35);':'');
    div.addEventListener('mouseover',()=>div.style.background='rgba(0,212,255,0.08)');
    div.addEventListener('mouseout',()=>div.style.background='');
    div.addEventListener('click',()=>{_closeCtx();fn();});m.appendChild(div);
  });
  document.body.appendChild(m);_ctxMenu=m;
  setTimeout(()=>document.addEventListener('click',_closeCtx,{once:true}),50);
}
function _closeCtx(){if(_ctxMenu){_ctxMenu.remove();_ctxMenu=null;}}

/* ─── DRAW() PATCH ─── */
function _patchDraw(){
  const _orig=draw;
  draw=function(){
    if(S.replay?.enabled&&S.replay.index!=null&&!S.replay.selectingStart){
      const full=S._allCandles||S.candles;S._allCandles=full;
      S.candles=full.slice(0,Math.min(Math.floor(S.replay.index)+1,full.length));
      try{_orig();}finally{S.candles=full;}
    } else {S._allCandles=null;_orig();}
    _lastCS=buildCS();
    _syncCursor(_lastCS);
    /* Keep draft endpoint anchored to crosshair for live preview */
    if(_sm===ST.DRAWING&&_draft&&S.cursor)
      _draft.p2={index:S.cursor.index,time:S.cursor.time,price:S.cursor.price};

    const c=el('chart');if(!c)return;
    const ctx=c.getContext('2d');
    ctx.save();
    try{
      _renderAll(ctx,_lastCS);
      if(S._posDraft&&S.cursor)_drawPosDraft(ctx,_lastCS);
      if(S.replay?.enabled){
        if(S.replay.selectingStart)_renderReplaySelect(ctx,_lastCS);
        else if(S.replay.index!=null)_renderReplayCursor(ctx,_lastCS);
      }
      _renderToolHint(ctx);
    }catch(_){}
    ctx.restore();
  };
}

/* ─── POSITION DRAFT PREVIEW ─── */
function _drawPosDraft(ctx,cs){
  if(!S._posDraft||!S.cursor)return;
  const W=cs.W,H=cs.H,sc=cs.sc;
  const entry=S.cursor.price,idx=S.cursor.index;
  const risk=Math.max(entry*.002,(sc.hi-sc.lo)*.035);
  const isLong=S._posDraft.type==='long';
  const stop=isLong?entry-risk:entry+risk;
  const target=isLong?entry+risk:entry-risk;
  const right=W-RP();
  const x1=cs.xI(idx),x2=cs.xI(idx+36);
  const xa=clamp(Math.min(x1,x2),PL,right),xb=clamp(Math.max(x1,x2),PL,right);
  const visW=Math.max(40,xb-xa);
  const ye=cs.yP(entry),ys=cs.yP(stop),yt=cs.yP(target);
  const pRgb=isLong?'0,230,118':'255,61,87',sRgb=isLong?'255,61,87':'0,230,118';
  ctx.save();ctx.globalAlpha=0.6;
  ctx.setLineDash([4,3]);
  ctx.fillStyle=`rgba(${pRgb},0.07)`;ctx.fillRect(xa,Math.min(ye,yt),visW,Math.abs(yt-ye));
  ctx.fillStyle=`rgba(${sRgb},0.06)`;ctx.fillRect(xa,Math.min(ye,ys),visW,Math.abs(ys-ye));
  ctx.lineWidth=0.8;ctx.strokeStyle=`rgba(${pRgb},0.45)`;ctx.strokeRect(xa,Math.min(ye,yt)+.5,visW,Math.abs(yt-ye));
  ctx.strokeStyle=`rgba(${sRgb},0.4)`;ctx.strokeRect(xa,Math.min(ye,ys)+.5,visW,Math.abs(ys-ye));
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(200,216,240,0.75)';ctx.beginPath();ctx.moveTo(xa,ye);ctx.lineTo(right,ye);ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle=`rgba(${pRgb},0.65)`;ctx.beginPath();ctx.moveTo(xa,yt);ctx.lineTo(right,yt);ctx.stroke();
  ctx.strokeStyle=`rgba(${sRgb},0.6)`;ctx.beginPath();ctx.moveTo(xa,ys);ctx.lineTo(right,ys);ctx.stroke();
  ctx.setLineDash([]);
  const lx=Math.min(xb+8,right-90);
  ctx.font='9px monospace';ctx.textAlign='left';
  ctx.fillStyle='rgba(200,216,240,0.75)';ctx.fillText('Entry '+priceFmt(entry),lx,ye+4);
  ctx.fillStyle=`rgba(${pRgb},0.75)`;ctx.fillText('TP '+priceFmt(target),lx,yt+4);
  ctx.fillStyle=`rgba(${sRgb},0.75)`;ctx.fillText('SL '+priceFmt(stop),lx,ys+4);
  const hdrY=clamp(Math.min(ye,yt,ys)-18,PT+2,H-PB-20),hdrX=clamp(xa,PL,right-70);
  ctx.fillStyle=isLong?'rgba(0,230,118,0.18)':'rgba(255,61,87,0.18)';
  ctx.strokeStyle=isLong?'rgba(0,230,118,0.45)':'rgba(255,61,87,0.45)';
  ctx.lineWidth=0.8;ctx.fillRect(hdrX,hdrY,44,14);ctx.strokeRect(hdrX,hdrY,44,14);
  ctx.fillStyle=isLong?'#00e676':'#ff3d57';ctx.font='8px monospace';ctx.textAlign='center';
  ctx.fillText(isLong?'LONG':'SHORT',hdrX+22,hdrY+10);
  ctx.restore();
}

/* ─── RENDERING ─── */
function _renderAll(ctx,cs){
  if(!S.drawings?.length&&!_draft)return;
  ctx.save();
  const sorted=S.drawings.filter(d=>d.visible!==false).slice().sort((a,b)=>a.id===_selId?1:b.id===_selId?-1:0);
  sorted.forEach(d=>_renderOne(ctx,cs,d,d.id===_selId));
  if(_draft)_renderDraft(ctx,cs);
  ctx.restore();
}
function _renderOne(ctx,cs,d,sel){
  ctx.save();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.globalAlpha=1;
  if(d.type==='trendline')_rLine(ctx,cs,d,sel);
  else if(d.type==='rectangle')_rRect(ctx,cs,d,sel);
  else if(d.type==='text')_rText(ctx,cs,d,sel);
  else if(d.type==='arrow')_rArrow(ctx,cs,d,sel);
  else if(d.type==='longpos'||d.type==='shortpos')_rPos(ctx,cs,d,sel);
  ctx.restore();
}
/* dash helper: solid/dashed/dotted */
function _applyDash(ctx,dash,lw){
  const w=lw||1;
  if(dash==='dashed')ctx.setLineDash([w*5,w*3]);
  else if(dash==='dotted')ctx.setLineDash([w,w*2.5]);
  else ctx.setLineDash([]);
}
function _rLine(ctx,cs,d,sel){
  const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
  const lw=sel?(d.style?.width||1.5)+0.8:(d.style?.width||1.5);
  ctx.strokeStyle=d.style?.color||'#00d4ff';ctx.lineWidth=lw;
  ctx.globalAlpha=d.style?.opacity||0.95;
  _applyDash(ctx,d.style?.dash,lw);
  if(sel){ctx.shadowColor='rgba(0,212,255,0.5)';ctx.shadowBlur=6;}
  ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.stroke();
  ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.setLineDash([]);
  if(sel){_rHandle(ctx,s1.x,s1.y);_rHandle(ctx,s2.x,s2.y);}
}
function _rRect(ctx,cs,d,sel){
  const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
  const rx=Math.min(s1.x,s2.x),ry=Math.min(s1.y,s2.y),rw=Math.abs(s2.x-s1.x),rh=Math.abs(s2.y-s1.y);
  // fill
  ctx.fillStyle=d.style?.fillColor||'#0064b4';ctx.globalAlpha=d.style?.fillAlpha??0.07;ctx.fillRect(rx,ry,rw,rh);
  // border
  const bw=d.style?.borderWidth||1;
  ctx.globalAlpha=d.style?.opacity||0.95;ctx.strokeStyle=d.style?.borderColor||'#00d4ff';
  ctx.lineWidth=sel?bw+0.8:bw;
  if(sel){ctx.shadowColor='rgba(0,212,255,0.4)';ctx.shadowBlur=4;}_applyDash(ctx,d.style?.dash,bw);
  ctx.strokeRect(rx,ry,rw,rh);ctx.setLineDash([]);ctx.shadowBlur=0;
  // midline 50%
  if(d.style?.midline&&rh>4){
    const mw=d.style?.midWidth||1;
    ctx.strokeStyle=d.style?.midColor||'#00d4ff';ctx.lineWidth=mw;
    _applyDash(ctx,d.style?.midDash||'dashed',mw);
    const midY=ry+rh/2;
    ctx.beginPath();ctx.moveTo(rx,midY);ctx.lineTo(rx+rw,midY);ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha=1;
  if(sel){_rHandle(ctx,s1.x,s1.y);_rHandle(ctx,s2.x,s2.y);_rHandle(ctx,s2.x,s1.y);_rHandle(ctx,s1.x,s2.y);}
}
function _rText(ctx,cs,d,sel){
  const sp=chartPointToScreen(d.p,cs);const fs=d.style?.fontSize||12;
  ctx.font='bold '+fs+'px '+(d.style?.fontFamily||'monospace');ctx.globalAlpha=0.95;
  if(d.text){
    const tw=ctx.measureText(d.text).width;
    if(d.style?.bgColor){ctx.fillStyle=d.style.bgColor;ctx.fillRect(sp.x-3,sp.y-fs-1,tw+6,fs+6);}
    if(sel){ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(0,212,255,0.45)';ctx.lineWidth=1;ctx.strokeRect(sp.x-3,sp.y-fs-1,tw+6,fs+6);ctx.setLineDash([]);ctx.shadowColor='rgba(0,212,255,0.4)';ctx.shadowBlur=5;}
    ctx.fillStyle=d.style?.color||'#e8f0ff';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(d.text,sp.x,sp.y);
  }
  ctx.shadowBlur=0;ctx.globalAlpha=1;
}
function _rArrow(ctx,cs,d,sel){
  const s1=chartPointToScreen(d.p1,cs),s2=chartPointToScreen(d.p2,cs);
  const dx=s2.x-s1.x,dy=s2.y-s1.y;
  const len=Math.hypot(dx,dy);if(len<2)return;
  const ux=dx/len,uy=dy/len;
  const col=d.style?.color||'#00d4ff';
  const hs=d.style?.headSize||18;
  const baseLw=d.style?.width||2.5;
  const lw=sel?baseLw+1:baseLw;
  const alpha=d.style?.opacity||0.97;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.strokeStyle=col;
  ctx.fillStyle=col;
  ctx.lineWidth=lw;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  if(sel){ctx.shadowColor='rgba(0,212,255,0.6)';ctx.shadowBlur=8;}
  _applyDash(ctx,d.style?.dash,lw);
  // Shaft — stop just before the head base so head tip is sharp
  ctx.beginPath();
  ctx.moveTo(s1.x,s1.y);
  ctx.lineTo(s2.x-ux*hs*0.65,s2.y-uy*hs*0.65);
  ctx.stroke();
  ctx.setLineDash([]);
  // Filled arrowhead — wider angle for clear visibility
  const a=Math.atan2(dy,dx);
  const spread=Math.PI/5;
  ctx.shadowBlur=0;
  ctx.beginPath();
  ctx.moveTo(s2.x,s2.y);
  ctx.lineTo(s2.x-hs*Math.cos(a-spread),s2.y-hs*Math.sin(a-spread));
  ctx.lineTo(s2.x-hs*0.4*Math.cos(a),s2.y-hs*0.4*Math.sin(a)); // notch
  ctx.lineTo(s2.x-hs*Math.cos(a+spread),s2.y-hs*Math.sin(a+spread));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if(sel){_rHandle(ctx,s1.x,s1.y);_rHandle(ctx,s2.x,s2.y);}
}
function _rHandle(ctx,x,y){
  const r=HDL();ctx.save();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(6,12,22,0.92)';ctx.fill();
  ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
}
function _rPosHandle(ctx,x,y,color){
  const r=HDL();ctx.save();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(6,12,22,0.92)';ctx.fill();
  ctx.strokeStyle=color||'#00d4ff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
}
function _rrect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function _rPos(ctx,cs,d,sel){
  const W=cs.W,H=cs.H,right=W-RP();
  const x1=cs.xI(d.x1),x2=cs.xI(d.x2);
  const xa=clamp(Math.min(x1,x2),PL,right);
  const xb=clamp(Math.max(x1,x2),PL,right);
  const bW=Math.max(20,xb-xa);
  const ye=cs.yP(d.entry),ys=cs.yP(d.stop),yt=cs.yP(d.target);
  const isLong=d.type==='longpos';
  const pCol=d.style?.tpColor||(isLong?'#00dc82':'#ff5a46');
  const sCol=d.style?.slColor||(isLong?'#ff4664':'#00dc82');
  const eCol=d.style?.entryColor||'#ffffff';
  const h2r=hex=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`;};
  const pRgb=h2r(pCol),sRgb=h2r(sCol),eRgb=h2r(eCol);
  const alpha=d.style?.fillAlpha??0.12;
  ctx.save();
  ctx.globalCompositeOperation='source-over';
  // Zone fills — strictly within box
  ctx.fillStyle=`rgba(${pRgb},${alpha})`;
  ctx.fillRect(xa,Math.min(ye,yt),bW,Math.abs(yt-ye));
  ctx.fillStyle=`rgba(${sRgb},${alpha*0.833})`;
  ctx.fillRect(xa,Math.min(ye,ys),bW,Math.abs(ys-ye));
  // Zone dashed borders — within box
  ctx.setLineDash([4,4]);ctx.lineWidth=1;
  ctx.strokeStyle=`rgba(${pRgb},${sel?0.90:0.65})`;
  ctx.strokeRect(xa+0.5,Math.min(ye,yt)+0.5,bW-1,Math.abs(yt-ye));
  ctx.strokeStyle=`rgba(${sRgb},${sel?0.90:0.65})`;
  ctx.strokeRect(xa+0.5,Math.min(ye,ys)+0.5,bW-1,Math.abs(ys-ye));
  ctx.setLineDash([]);
  // Price lines — contained within box
  ctx.lineWidth=sel?2:1.5;
  ctx.strokeStyle=`rgba(${eRgb},${sel?0.88:0.52})`;
  ctx.beginPath();ctx.moveTo(xa,ye);ctx.lineTo(xb,ye);ctx.stroke();
  ctx.lineWidth=sel?1.5:1;
  ctx.strokeStyle=`rgba(${pRgb},${sel?0.92:0.60})`;
  ctx.beginPath();ctx.moveTo(xa,yt);ctx.lineTo(xb,yt);ctx.stroke();
  ctx.strokeStyle=`rgba(${sRgb},${sel?0.92:0.60})`;
  ctx.beginPath();ctx.moveTo(xa,ys);ctx.lineTo(xb,ys);ctx.stroke();
  // Selected state: pill labels + handles
  if(sel){
    if(d.style?.showLabels!==false){
      const LW=96,LH=26,LR=3;
      const fPct=v=>(v>=0?'+':'')+v.toFixed(2)+'%';
      const tpPct=d.entry?(d.target-d.entry)/Math.abs(d.entry)*100:0;
      const slPct=d.entry?(d.stop-d.entry)/Math.abs(d.entry)*100:0;
      // Outside: to the right of box; inside: pinned to xa
      const outside=xb+LW+12<right;
      const lx0=clamp(outside?xb+8:xa+6,PL+2,right-LW-4);
      const pill=(name,price,pctVal,color,lineY,inside_below)=>{
        const rgb=h2r(color);
        const line1=name+'  '+priceFmt(price);
        const line2=fPct(pctVal);
        // Vertical: outside → centered on line; inside → TP below line, SL above line, Entry centered
        let ly;
        if(outside)ly=lineY-LH/2;
        else if(inside_below===true)ly=lineY+4;
        else if(inside_below===false)ly=lineY-LH-4;
        else ly=lineY-LH/2;
        ly=clamp(ly,PT+2,H-PB-LH-2);
        ctx.save();
        _rrect(ctx,lx0,ly,LW,LH,LR);
        ctx.fillStyle='rgba(5,9,20,0.90)';ctx.fill();
        ctx.strokeStyle=`rgba(${rgb},0.55)`;ctx.lineWidth=1;ctx.stroke();
        ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.shadowBlur=0;
        ctx.fillStyle=color;ctx.fillText(line1,lx0+5,ly+11);
        ctx.font='8px monospace';
        ctx.fillStyle=`rgba(${rgb},0.78)`;ctx.fillText(line2,lx0+5,ly+21);
        ctx.restore();
      };
      // inside_below: true = below line (TP zone interior), false = above line (SL zone), null = centered (Entry)
      pill('TP',d.target,tpPct,pCol,yt,!outside?true:null);
      pill('Entry',d.entry,0,eCol,ye,null);
      pill('SL',d.stop,slPct,sCol,ys,!outside?false:null);
    }
    // Handles
    _rPosHandle(ctx,xa,ye,eCol);
    _rPosHandle(ctx,xa,yt,pCol);
    _rPosHandle(ctx,xa,ys,sCol);
    const midY=clamp((ye+yt+ys)/3,Math.min(yt,ys,ye),Math.max(yt,ys,ye));
    _rPosHandle(ctx,xb,midY,'#00d4ff');
  }
  ctx.restore();
}

/* Preview: endpoint tracks crosshair; fallback to last p2 if cursor gone */
function _renderDraft(ctx,cs){
  if(!_draft)return;
  let endX,endY;
  if(S.cursor){endX=S.cursor.screenX;endY=S.cursor.screenY;}
  else if(_draft.p2){const sp=chartPointToScreen(_draft.p2,cs);endX=sp.x;endY=sp.y;}
  else return;
  const s1=chartPointToScreen(_draft.p1,cs);
  ctx.save();ctx.globalAlpha=0.65;ctx.setLineDash([5,4]);ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;
  if(_draft.type==='trendline'){
    ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.lineTo(endX,endY);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.arc(s1.x,s1.y,HDL(),0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();
    ctx.beginPath();ctx.arc(endX,endY,4,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.55)';ctx.fill();
  } else if(_draft.type==='rectangle'){
    const rx=Math.min(s1.x,endX),ry=Math.min(s1.y,endY),rw=Math.abs(endX-s1.x),rh=Math.abs(endY-s1.y);
    ctx.fillStyle='rgba(0,100,180,0.06)';ctx.fillRect(rx,ry,rw,rh);ctx.strokeRect(rx,ry,rw,rh);
    ctx.setLineDash([]);ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.arc(s1.x,s1.y,HDL(),0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();
    ctx.beginPath();ctx.arc(endX,endY,4,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.55)';ctx.fill();
  } else if(_draft.type==='arrow'){
    const dx=endX-s1.x,dy=endY-s1.y,len=Math.hypot(dx,dy);
    if(len>2){
      const ux=dx/len,uy=dy/len,hs=10;
      ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.lineTo(endX-ux*hs*0.5,endY-uy*hs*0.5);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=0.82;ctx.fillStyle='#00d4ff';
      const ang=Math.atan2(dy,dx),a=Math.PI/6;
      ctx.beginPath();ctx.moveTo(endX,endY);
      ctx.lineTo(endX-hs*Math.cos(ang-a),endY-hs*Math.sin(ang-a));
      ctx.lineTo(endX-hs*Math.cos(ang+a),endY-hs*Math.sin(ang+a));
      ctx.closePath();ctx.fill();
    }
    ctx.setLineDash([]);ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.arc(s1.x,s1.y,HDL(),0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();
    ctx.beginPath();ctx.arc(endX,endY,4,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.55)';ctx.fill();
  }
  ctx.restore();
}
function _renderToolHint(ctx){
  let hint='';
  if(S._posDraft){
    const label=S._posDraft.type==='long'?'▲ Long':'▼ Short';
    hint=label+' — clique para confirmar';
  }else if(S.tool==='long'||S.tool==='short'){
    const label=S.tool==='long'?'▲ Long':'▼ Short';
    hint=label+' — clique para posicionar';
  }else if(_tool){
    const labels={trendline:'↗ Linha',rectangle:'▭ Retângulo',text:'T Texto',arrow:'→ Seta'};
    const state=_sm===ST.DRAWING?' — clique para finalizar':' — clique para iniciar';
    hint=(labels[_tool]||'')+state;
  }
  if(!hint)return;
  ctx.save();ctx.font='bold 10px monospace';ctx.fillStyle='rgba(0,212,255,0.82)';ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillText(hint,PL+6,PT+6);ctx.restore();
}
function _renderReplayCursor(ctx,cs){
  if(!S.replay?.enabled||S.replay.index==null)return;
  const sx=cs.xI(Math.floor(S.replay.index));if(sx<PL||sx>cs.W-RP())return;
  ctx.save();ctx.strokeStyle='rgba(255,200,50,0.65)';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(sx,PT);ctx.lineTo(sx,cs.H-PB);ctx.stroke();ctx.setLineDash([]);
  ctx.font='bold 9px monospace';ctx.fillStyle='rgba(255,200,50,0.85)';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('REPLAY',sx,PT+14);ctx.restore();
}
function _renderReplaySelect(ctx,cs){
  if(!S.replay?.selectingStart||!S.cursor)return;
  const sx=cs.xI(S.cursor.index);if(sx<PL||sx>cs.W-RP())return;
  ctx.save();
  ctx.strokeStyle='rgba(255,200,50,0.80)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.moveTo(sx,PT);ctx.lineTo(sx,cs.H-PB);ctx.stroke();ctx.setLineDash([]);
  const txt='▶ Iniciar Replay Aqui';
  ctx.font='bold 11px monospace';
  const tw=ctx.measureText(txt).width;
  const bw=tw+16,bh=22,bx=Math.min(sx+6,cs.W-RP()-bw-4),by=PT+20;
  const rd=5;
  ctx.fillStyle='rgba(40,30,5,0.90)';
  ctx.beginPath();
  ctx.moveTo(bx+rd,by);ctx.lineTo(bx+bw-rd,by);ctx.arcTo(bx+bw,by,bx+bw,by+rd,rd);
  ctx.lineTo(bx+bw,by+bh-rd);ctx.arcTo(bx+bw,by+bh,bx+bw-rd,by+bh,rd);
  ctx.lineTo(bx+rd,by+bh);ctx.arcTo(bx,by+bh,bx,by+bh-rd,rd);
  ctx.lineTo(bx,by+rd);ctx.arcTo(bx,by,bx+rd,by,rd);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,200,50,0.70)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='rgba(255,200,50,0.95)';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(txt,bx+8,by+bh/2);
  ctx.restore();
}

/* ─── DRAW SETTINGS PANEL ─── */
function _toggleSettings(){_settingsOpen?_closeSettings():_openSettings();}
window.__dvlToggleDrawSettings=_toggleSettings;
window.__dvlCloseDrawSettings=_closeSettings;
function _openSettings(){
  const d=_getSelected();if(!d)return;
  _settingsOpen=true;
  _buildSettingsPanel(d);
  const p=el('dvlDrawSettingsPanel');if(p)p.style.display='block';
  const b=el('dvlDrawSettingsBtn');if(b)b.classList.add('dvl-active');
}
function _closeSettings(){
  _settingsOpen=false;
  const p=el('dvlDrawSettingsPanel');if(p)p.style.display='none';
  const b=el('dvlDrawSettingsBtn');if(b)b.classList.remove('dvl-active');
}
function _buildSettingsPanel(d){
  const inner=el('dvlDrawSettingsPanelInner');if(!inner)return;
  inner.innerHTML='';
  if(!d.style)d.style={};
  const original=d;
  const work=clone(d);
  if(!work.style)work.style={};
  const preview=()=>{drawSoon();};
  const apply=()=>{
    if(!original.style)original.style={};
    original.style=clone(work.style||{});
    _pushHistory();_saveDrawings();drawSoon();_closeSettings();
  };
  const hdr=document.createElement('div');
  hdr.className='dvl-drag-handle';
  hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;color:#00d4ff;font-size:10px;letter-spacing:.13em;text-transform:uppercase;margin:-2px 0 10px;font-weight:800;opacity:.9;min-height:28px;';
  const names={trendline:'Linha',rectangle:'Retângulo',text:'Texto',arrow:'Seta',longpos:'Long Position',shortpos:'Short Position'};
  const title=document.createElement('span');title.textContent=names[work.type]||work.type;hdr.appendChild(title);
  const mini=document.createElement('span');mini.textContent='ARRASTE';mini.style.cssText='font-size:8px;color:#6a7fa0;letter-spacing:.1em;';hdr.appendChild(mini);
  inner.appendChild(hdr);
  const row=(lbl,ctrl)=>{
    const div=document.createElement('div');div.className='dvl-setting-row';
    const l=document.createElement('span');l.textContent=lbl;
    div.appendChild(l);div.appendChild(ctrl);inner.appendChild(div);
  };
  const mkColor=(val,cb)=>{const i=document.createElement('input');i.type='color';i.value=val||'#00d4ff';i.addEventListener('input',e=>{cb(e.target.value);preview();});return i;};
  const mkNum=(val,min,max,step,cb)=>{const i=document.createElement('input');i.type='number';i.value=val;i.min=min;i.max=max;i.step=step;i.style.cssText='width:62px;padding:4px 6px;font-family:monospace;font-size:11px;';i.addEventListener('change',e=>{cb(+e.target.value);preview();});return i;};
  const mkDash=(val,cb)=>{const s=document.createElement('select');s.style.cssText='width:112px;padding:5px 8px;font-family:monospace;font-size:11px;';[['solid','Sólida'],['dashed','Tracejada'],['dotted','Pontilhada']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===val)o.selected=true;s.appendChild(o);});s.addEventListener('change',e=>{cb(e.target.value);preview();});return s;};
  const mkRange=(val,min,max,step,cb)=>{const wrap2=document.createElement('div');wrap2.style.cssText='display:flex;align-items:center;gap:8px;';const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.step=step;r.value=val;r.style.cssText='width:96px;';const lbl2=document.createElement('span');lbl2.textContent=Math.round(val*100)+'%';lbl2.style.cssText='color:#7f91a8;font-size:10px;width:34px;text-align:right;';r.addEventListener('input',e=>{cb(+e.target.value);lbl2.textContent=Math.round(+e.target.value*100)+'%';preview();});wrap2.appendChild(r);wrap2.appendChild(lbl2);return wrap2;};
  const mkCheck=(val,cb)=>{const i=document.createElement('input');i.type='checkbox';i.checked=!!val;i.style.cssText='accent-color:#00d4ff;width:16px;height:16px;cursor:pointer;';i.addEventListener('change',e=>{cb(e.target.checked);preview();});return i;};
  if(work.type==='trendline'||work.type==='arrow'){
    row('Cor',mkColor(work.style.color,v=>work.style.color=v));
    row('Espessura',mkNum(work.style.width||1.5,0.5,8,0.5,v=>work.style.width=v));
    row('Estilo',mkDash(work.style.dash||'solid',v=>work.style.dash=v));
  }
  if(work.type==='rectangle'){
    row('Cor da borda',mkColor(work.style.borderColor||'#00d4ff',v=>work.style.borderColor=v));
    row('Espessura borda',mkNum(work.style.borderWidth||1,0.5,6,0.5,v=>work.style.borderWidth=v));
    row('Estilo borda',mkDash(work.style.dash||'solid',v=>work.style.dash=v));
    row('Cor do fundo',mkColor(work.style.fillColor||'#0064b4',v=>work.style.fillColor=v));
    row('Opacidade fundo',mkRange(work.style.fillAlpha??0.07,0,0.4,0.01,v=>work.style.fillAlpha=v));
    row('Linha 50%',mkCheck(work.style.midline,v=>work.style.midline=v));
    row('Cor linha 50%',mkColor(work.style.midColor||'#00d4ff',v=>work.style.midColor=v));
    row('Espessura 50%',mkNum(work.style.midWidth||1,0.5,4,0.5,v=>work.style.midWidth=v));
    row('Estilo 50%',mkDash(work.style.midDash||'dashed',v=>work.style.midDash=v));
  }
  if(work.type==='text'){
    row('Cor do texto',mkColor(work.style.color||'#e8f0ff',v=>work.style.color=v));
    row('Tamanho',mkNum(work.style.fontSize||12,8,28,1,v=>work.style.fontSize=v));
  }
  if(work.type==='longpos'||work.type==='shortpos'){
    const isLong=work.type==='longpos';const rr=work.entry!==work.stop?Math.abs((work.target-work.entry)/(work.stop-work.entry)):1;
    const badge=document.createElement('div');badge.style.cssText=`text-align:center;padding:7px 9px;border-radius:9px;margin-bottom:8px;font-size:10px;font-weight:800;letter-spacing:.08em;background:${isLong?'rgba(0,230,118,0.10)':'rgba(255,61,87,0.10)'};color:${isLong?'#00e676':'#ff3d57'};border:1px solid ${isLong?'rgba(0,230,118,0.28)':'rgba(255,61,87,0.28)'};`;badge.textContent=(isLong?'▲ LONG':'▼ SHORT')+' — R:R '+rr.toFixed(2)+'x';inner.appendChild(badge);
    const defTp=isLong?'#00dc82':'#ff5a46',defSl=isLong?'#ff4664':'#00dc82';
    row('Cor Entry',mkColor(work.style.entryColor||'#ffffff',v=>{work.style.entryColor=v;}));
    row('Cor TP',mkColor(work.style.tpColor||defTp,v=>{work.style.tpColor=v;}));
    row('Cor SL',mkColor(work.style.slColor||defSl,v=>{work.style.slColor=v;}));
    row('Opacidade fundo',mkRange(work.style.fillAlpha??0.12,0,0.40,0.01,v=>{work.style.fillAlpha=v;}));
    row('Mostrar labels',mkCheck(work.style.showLabels!==false,v=>{work.style.showLabels=v;}));
  }
  const actions=document.createElement('div');actions.className='dvl-setting-actions';
  const close=document.createElement('button');close.textContent='Fechar';close.className='dvl-setting-close';close.addEventListener('click',_closeSettings);
  const saveBtn=document.createElement('button');saveBtn.textContent='Save';saveBtn.className='dvl-setting-save';saveBtn.addEventListener('click',apply);
  actions.appendChild(close);actions.appendChild(saveBtn);inner.appendChild(actions);
}
/* ─── PERSISTENCE ─── */
function _sKey(){return 'dvl_drawings_'+(S.sym||'')+'_ALLTF';}
function _legacyDrawingKeys(){
  const sym=S.sym||'';
  const keys=['dvl_drawings_'+sym+'_'+(S.tf||''),'dvl_drawings_'+sym];
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf('dvl_drawings_'+sym+'_')===0&&k!==_sKey())keys.push(k);}}catch(_){}
  return [...new Set(keys)];
}
function _validDrawing(d){
  if(d.type==='text')return d.p&&d.p.time!==undefined;
  if(d.type==='longpos'||d.type==='shortpos')return typeof d.entry==='number'&&typeof d.x1==='number';
  return d.p1&&d.p1.time!==undefined&&['trendline','rectangle','arrow'].includes(d.type);
}
function _saveDrawings(){try{localStorage.setItem(_sKey(),JSON.stringify(S.drawings||[]));}catch(_){}}
function _loadDrawings(){
  try{
    let arr=JSON.parse(localStorage.getItem(_sKey())||'null');
    if(!Array.isArray(arr)){
      const merged=[],seen=new Set();
      for(const k of _legacyDrawingKeys()){
        try{const a=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(a))for(const d of a){const id=d&&d.id?d.id:JSON.stringify(d);if(!seen.has(id)){seen.add(id);merged.push(d);}}}catch(_){}
      }
      arr=merged;
      if(arr.length)try{localStorage.setItem(_sKey(),JSON.stringify(arr));}catch(_){}
    }
    S.drawings=(arr||[]).filter(_validDrawing);
  }catch(_){S.drawings=[];}drawSoon();
}
function _watchSymTf(){
  let _lk=_sKey();setInterval(()=>{const k=_sKey();if(k!==_lk){_lk=k;_loadDrawings();}},800);
}

/* ─── REPLAY ─── */
function _enableReplay(){
  S.replay.enabled=true;S.replay.playing=false;S.replay.selectingStart=true;
  const b=el('rpReplay');if(b)b.classList.add('dvl-active');drawSoon();
}
function _disableReplay(){
  S.replay.enabled=false;S.replay.playing=false;S.replay.index=null;S.replay.selectingStart=false;
  if(S.replay.timer){clearInterval(S.replay.timer);S.replay.timer=null;}
  if(S._allCandles){S.candles=S._allCandles;S._allCandles=null;}
  _showRpBar(false);const b=el('rpReplay');if(b)b.classList.remove('dvl-active');drawSoon();
}
function _showRpBar(show){const bar=el('dvlReplayBar');if(bar)bar.style.display=show?'flex':'none';}
function _setReplayIdx(idx){
  const all=S._allCandles||S.candles;S.replay.index=Math.max(0,Math.min(idx,all.length-1));
  const p=el('dvlRpPlay');if(p)p.textContent='▶';drawSoon();
}
function _playReplay(){
  if(!S.replay.enabled)return;
  S.replay.playing=true;const p=el('dvlRpPlay');if(p)p.textContent='⏸';
  if(S.replay.timer)clearInterval(S.replay.timer);
  const ms=Math.round(800/(S.replay.speed||1));
  S.replay.timer=setInterval(()=>{
    if(!S.replay.enabled||!S.replay.playing){clearInterval(S.replay.timer);S.replay.timer=null;return;}
    const all=S._allCandles||S.candles;if(S.replay.index>=all.length-1){_pauseReplay();return;}
    S.replay.index++;drawSoon();
  },ms);
}
function _pauseReplay(){
  S.replay.playing=false;if(S.replay.timer){clearInterval(S.replay.timer);S.replay.timer=null;}
  const p=el('dvlRpPlay');if(p)p.textContent='▶';
}
function _stepFwd(){_pauseReplay();const all=S._allCandles||S.candles;if(S.replay.index<all.length-1)_setReplayIdx(S.replay.index+1);}
function _stepBack(){_pauseReplay();if(S.replay.index>0)_setReplayIdx(S.replay.index-1);}

})();