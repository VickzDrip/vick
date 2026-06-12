(function(){
  function initRuler(){
    if(!window.S)return setTimeout(initRuler,100);
    S._rulers=[];
    S._rulerNew=null;
    S._rulerDragSv=null;

    const btn=document.createElement('button');
    btn.id='btnRuler';btn.className='mini-btn';
    btn.title='Régua %';btn.textContent='📏';
    btn.style.cssText='font-size:15px;padding:0 6px;';
    const ref=document.getElementById('btnShort');
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(btn,ref.nextSibling);

    const wrap=document.getElementById('chartWrap');
    if(!wrap)return;

    function syncBtn(){
      btn.classList.toggle('tool-active',S.tool==='ruler'||S._rulers.length>0||!!S._rulerNew);
    }
    function tfMins(){
      const m=(S.tf||'').match(/^(\d+)(m|h|d|w)$/i);if(!m)return 1;
      const n=parseInt(m[1]);
      return m[2]==='m'?n:m[2]==='h'?n*60:m[2]==='d'?n*1440:n*10080;
    }
    function fmtDur(bars){
      const t=Math.max(1,bars)*tfMins();if(t<60)return t+'m';
      const h=Math.floor(t/60),m=t%60;return m?h+'h '+m+'m':h+'h';
    }
    function getCrossChartPoint(){
      if(!S._cross)return null;
      const rect=wrap.getBoundingClientRect(),W=rect.width,H=rect.height;
      const cx=clamp(S._cross.cx,PL,W-RP());
      const cy=clamp(S._cross.cy,PT,H-PB);
      const sc=scale(visible().cs,H);
      return{cx,cy,idx:idxFromX(cx,W),price:priceFromY(cy,H,sc)};
    }
    function hitSaved(xp,yp,W,H,sc){
      const right=W-RP();
      for(let i=S._rulers.length-1;i>=0;i--){
        const r=S._rulers[i];
        const x1p=PL+(r.idx1-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const x2p=PL+(r.idx2-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const y1=sc.y(r.price1),y2=sc.y(r.price2);
        if(Math.hypot(xp-x1p,yp-y1)<=14)return{index:i,part:'p1'};
        if(Math.hypot(xp-x2p,yp-y2)<=14)return{index:i,part:'p2'};
        const xa=clamp(Math.min(x1p,x2p),PL,right),xb=clamp(Math.max(x1p,x2p),PL,right);
        if(xp>=xa-12&&xp<=xb+12&&yp>=Math.min(y1,y2)-12&&yp<=Math.max(y1,y2)+12)return{index:i,part:'body'};
      }
      return null;
    }

    let _tapX=0,_tapY=0,_rulerJustConfirmed=false;
    let _rulerTouchId=-1,_rulerTapMoved=false,_tapTX=0,_tapTY=0,_crossDragX=0,_crossDragY=0;

    function handleRulerConfirm(){
      if(!S._rulerNew){
        const p=getCrossChartPoint();if(!p)return;
        S._rulerNew={idx1:p.idx,price1:p.price,idx2:p.idx,price2:p.price};
        syncBtn();drawSoon();
      }else{
        const n=S._rulerNew;
        S._rulers.push({idx1:n.idx1,price1:n.price1,idx2:n.idx2,price2:n.price2});
        S._rulerNew=null;S.tool=null;
        _rulerJustConfirmed=true;
        if(typeof syncToolBtns==='function')syncToolBtns();
        syncBtn();draw();
      }
    }

    btn.addEventListener('click',function(){
      if(S.tool==='ruler'||S._rulerNew){
        S.tool=null;S._rulerNew=null;S._cross=null;_rulerTouchId=-1;
        if(typeof syncToolBtns==='function')syncToolBtns();
      }else if(S._rulers.length>0){S._rulers=[];S.tool=null;}
      else{
        S.tool='ruler';S._rulerNew=null;
        const W=wrap.clientWidth,H=wrap.clientHeight;
        if(W&&H)S._cross={cx:Math.round((PL+(W-RP()))/2),cy:Math.round((PT+(H-PB))/2)};
        if(typeof closeMobilePanel==='function')closeMobilePanel();
        if(typeof syncToolBtns==='function')syncToolBtns();
      }
      syncBtn();draw();
    });

    // ── Desktop (mouse/pointer) ──────────────────────────────────────────────

    wrap.addEventListener('pointerdown',function(ev){
      if(ev.button!==0)return;
      _tapX=ev.clientX;_tapY=ev.clientY;
      if(S.tool==='ruler'){
        const rect=wrap.getBoundingClientRect();
        const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
        const W=rect.width,H=rect.height;
        if(ev.pointerType!=='touch'&&x>=PL&&x<=W-RP()&&y>=PT&&y<=H-PB){
          handleRulerConfirm();
        }
        ev.stopImmediatePropagation();ev.preventDefault();return;
      }
      if(S._rulers.length>0&&!S.tool){
        const rect=wrap.getBoundingClientRect();
        const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
        const W=rect.width,H=rect.height;
        const sc=scale(visible().cs,H);
        const hit=hitSaved(x,y,W,H,sc);
        if(hit){S._rulerDragSv={...hit,lastX:ev.clientX,lastY:ev.clientY};ev.stopImmediatePropagation();ev.preventDefault();}
      }
    },{capture:true,passive:false});

    window.addEventListener('pointermove',function(ev){
      if(ev.pointerType==='touch')return;
      if(S.tool==='ruler'){
        const rect=wrap.getBoundingClientRect();
        const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
        const W=rect.width,H=rect.height;
        if(x>=PL&&x<=W-RP()&&y>=PT&&y<=H-PB){
          S._cross={cx:x,cy:y};
          if(S._rulerNew){
            const sc=scale(visible().cs,H);
            S._rulerNew.idx2=idxFromX(x,W);
            S._rulerNew.price2=priceFromY(y,H,sc);
          }
          drawSoon();
        }
        return;
      }
      if(S._rulerDragSv){
        const r=S._rulers[S._rulerDragSv.index];if(!r)return;
        const rect=wrap.getBoundingClientRect(),W=rect.width,H=rect.height;
        const sc=scale(visible().cs,H);
        const dIdx=(ev.clientX-S._rulerDragSv.lastX)*(S.view.end-S.view.start)/CW(W);
        const dP=priceFromY(ev.clientY-rect.top,H,sc)-priceFromY(S._rulerDragSv.lastY-rect.top,H,sc);
        if(S._rulerDragSv.part==='p1'){r.idx1+=dIdx;r.price1+=dP;}
        else if(S._rulerDragSv.part==='p2'){r.idx2+=dIdx;r.price2+=dP;}
        else{r.idx1+=dIdx;r.idx2+=dIdx;r.price1+=dP;r.price2+=dP;}
        S._rulerDragSv.lastX=ev.clientX;S._rulerDragSv.lastY=ev.clientY;
        drawSoon();
      }
    });

    window.addEventListener('pointerup',function(ev){
      if(S._rulerDragSv){S._rulerDragSv=null;draw();return;}
      if(_rulerJustConfirmed){_rulerJustConfirmed=false;return;}
      const dx=ev.clientX-_tapX,dy=ev.clientY-_tapY,isTap=Math.sqrt(dx*dx+dy*dy)<8;
      if(isTap&&S._rulers.length>0&&!S.tool&&!S._rulerNew){S._rulers=[];syncBtn();draw();}
    });

    // ── Mobile (touch) — capture:true fires before native handlers and DVL ──

    wrap.addEventListener('touchstart',function(e){
      if(S.tool==='ruler'){
        if(e.touches.length!==1)return;
        const rect=wrap.getBoundingClientRect();
        const t=e.touches[0];
        const tx=t.clientX-rect.left,ty=t.clientY-rect.top;
        if(tx<PL||tx>rect.width-RP()||ty<PT||ty>rect.height-PB)return;
        _rulerTouchId=t.identifier;
        _tapX=t.clientX;_tapY=t.clientY;_rulerTapMoved=false;
        _tapTX=tx;_tapTY=ty;
        _crossDragX=S._cross?S._cross.cx:tx;
        _crossDragY=S._cross?S._cross.cy:ty;
        e.stopImmediatePropagation();e.preventDefault();
        return;
      }
      if(S._rulers.length>0&&!S._rulerNew&&e.touches.length===1){
        const rect=wrap.getBoundingClientRect();
        const t=e.touches[0];
        const x=t.clientX-rect.left,y=t.clientY-rect.top;
        const sc=scale(visible().cs,rect.height);
        const hit=hitSaved(x,y,rect.width,rect.height,sc);
        if(hit){S._rulerDragSv={...hit,lastX:t.clientX,lastY:t.clientY,touchId:t.identifier};e.stopImmediatePropagation();e.preventDefault();}
      }
    },{capture:true,passive:false});

    wrap.addEventListener('touchmove',function(e){
      if(S.tool==='ruler'){
        if(_rulerTouchId<0)return;
        let t=null;
        for(let i=0;i<e.touches.length;i++){if(e.touches[i].identifier===_rulerTouchId){t=e.touches[i];break;}}
        if(!t)return;
        e.stopImmediatePropagation();e.preventDefault();
        const rect=wrap.getBoundingClientRect();
        if(Math.hypot(t.clientX-_tapX,t.clientY-_tapY)>8)_rulerTapMoved=true;
        if(_rulerTapMoved){
          const ncx=clamp(_crossDragX+(t.clientX-_tapX),PL,rect.width-RP());
          const ncy=clamp(_crossDragY+(t.clientY-_tapY),PT,rect.height-PB);
          S._cross={cx:ncx,cy:ncy};
          if(S._rulerNew){
            const sc=scale(visible().cs,rect.height);
            S._rulerNew.idx2=idxFromX(ncx,rect.width);
            S._rulerNew.price2=priceFromY(ncy,rect.height,sc);
          }
          drawSoon();
        }
        return;
      }
      if(S._rulerDragSv&&S._rulerDragSv.touchId!==undefined){
        let t=null;
        for(let i=0;i<e.touches.length;i++){if(e.touches[i].identifier===S._rulerDragSv.touchId){t=e.touches[i];break;}}
        if(!t)return;
        e.stopImmediatePropagation();e.preventDefault();
        const r=S._rulers[S._rulerDragSv.index];if(!r)return;
        const rect=wrap.getBoundingClientRect(),W=rect.width,H=rect.height;
        const sc=scale(visible().cs,H);
        const dIdx=(t.clientX-S._rulerDragSv.lastX)*(S.view.end-S.view.start)/CW(W);
        const dP=priceFromY(t.clientY-rect.top,H,sc)-priceFromY(S._rulerDragSv.lastY-rect.top,H,sc);
        if(S._rulerDragSv.part==='p1'){r.idx1+=dIdx;r.price1+=dP;}
        else if(S._rulerDragSv.part==='p2'){r.idx2+=dIdx;r.price2+=dP;}
        else{r.idx1+=dIdx;r.idx2+=dIdx;r.price1+=dP;r.price2+=dP;}
        S._rulerDragSv.lastX=t.clientX;S._rulerDragSv.lastY=t.clientY;
        drawSoon();
      }
    },{capture:true,passive:false});

    wrap.addEventListener('touchend',function(e){
      if(S.tool==='ruler'){
        if(_rulerTouchId<0)return;
        let found=false;
        for(let i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===_rulerTouchId){found=true;break;}}
        if(!found)return;
        _rulerTouchId=-1;
        e.stopImmediatePropagation();
        if(!_rulerTapMoved)handleRulerConfirm();
        return;
      }
      if(S._rulerDragSv&&S._rulerDragSv.touchId!==undefined){
        for(let i=0;i<e.changedTouches.length;i++){
          if(e.changedTouches[i].identifier===S._rulerDragSv.touchId){S._rulerDragSv=null;draw();break;}
        }
      }
    },{capture:true,passive:false});

    // ── Drawing ──────────────────────────────────────────────────────────────

    const _base=window.draw;
    window.draw=function(){_base();drawRulers();};

    function drawBand(ctx,x1px,x2px,y1,y2,W,H,a){
      const right=W-RP();
      const xa=clamp(Math.min(x1px,x2px),PL,right),xb=clamp(Math.max(x1px,x2px),PL,right);
      const yTop=Math.min(y1,y2),yBot=Math.max(y1,y2);
      const rgb=y2<y1?'0,160,255':'255,61,87';
      ctx.fillStyle=`rgba(${rgb},${(0.12*a).toFixed(2)})`;
      ctx.fillRect(xa,yTop,Math.max(1,xb-xa),Math.max(1,yBot-yTop));
      ctx.setLineDash([]);ctx.lineWidth=1;
      ctx.strokeStyle=`rgba(100,140,220,${(0.52*a).toFixed(2)})`;
      if(x1px>PL-2&&x1px<right+2){ctx.beginPath();ctx.moveTo(x1px,PT);ctx.lineTo(x1px,H-PB);ctx.stroke();}
      if(x2px>PL-2&&x2px<right+2){ctx.beginPath();ctx.moveTo(x2px,PT);ctx.lineTo(x2px,H-PB);ctx.stroke();}
      ctx.strokeStyle=`rgba(160,185,230,${(0.45*a).toFixed(2)})`;
      ctx.beginPath();ctx.moveTo(PL,y1);ctx.lineTo(right,y1);ctx.stroke();
      ctx.strokeStyle=`rgba(${rgb},${(0.88*a).toFixed(2)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(PL,y2);ctx.lineTo(right,y2);ctx.stroke();
      const ax=xb+5;
      ctx.strokeStyle=`rgba(${rgb},${(0.65*a).toFixed(2)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(ax,y1);ctx.lineTo(ax,y2);ctx.stroke();
      const dir=y2<y1?1:-1;
      ctx.beginPath();ctx.moveTo(ax-5,y2+dir*7);ctx.lineTo(ax,y2);ctx.lineTo(ax+5,y2+dir*7);ctx.stroke();
      ctx.fillStyle=`rgba(30,130,230,${a.toFixed(2)})`;
      ctx.strokeStyle=`rgba(5,9,20,${(0.75*a).toFixed(2)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(x2px,y2,4.5,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=`rgba(220,235,255,${(0.95*a).toFixed(2)})`;
      ctx.strokeStyle=`rgba(5,9,20,${(0.75*a).toFixed(2)})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(x1px,y1,4.5,0,Math.PI*2);ctx.fill();ctx.stroke();
    }

    function drawLabel(ctx,line1,line2,line3,x2px,y2,W,H,a){
      const right=W-RP();
      ctx.font='bold 12px Inter,Arial,monospace';const w1=ctx.measureText(line1).width;
      ctx.font='10px Inter,Arial,monospace';const w2=ctx.measureText(line2).width;
      const w3=ctx.measureText(line3||'').width;
      const bw=Math.max(w1,w2,w3)+16,bh=line3?46:32,rd=5;
      const lx=clamp(x2px+8,PL,right-bw-2),ly=clamp(y2-bh/2,PT+2,H-PB-bh-2);
      ctx.fillStyle=`rgba(30,100,220,${(0.90*a).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(lx+rd,ly);ctx.lineTo(lx+bw-rd,ly);ctx.arcTo(lx+bw,ly,lx+bw,ly+rd,rd);
      ctx.lineTo(lx+bw,ly+bh-rd);ctx.arcTo(lx+bw,ly+bh,lx+bw-rd,ly+bh,rd);
      ctx.lineTo(lx+rd,ly+bh);ctx.arcTo(lx,ly+bh,lx,ly+bh-rd,rd);
      ctx.lineTo(lx,ly+rd);ctx.arcTo(lx,ly,lx+rd,ly,rd);
      ctx.closePath();ctx.fill();
      ctx.fillStyle=`rgba(255,255,255,${(0.96*a).toFixed(2)})`;
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.font='bold 12px Inter,Arial,monospace';ctx.fillText(line1,lx+8,ly+10);
      ctx.font='10px Inter,Arial,monospace';ctx.fillText(line2,lx+8,ly+23);
      if(line3)ctx.fillText(line3,lx+8,ly+36);
    }

    function drawRulers(){
      const cvs=document.getElementById('chart');if(!cvs)return;
      const W=wrap.clientWidth,H=wrap.clientHeight;if(!W||!H)return;
      const sc=scale(visible().cs,H);
      const ctx=cvs.getContext('2d');
      if(!S._rulers.length&&!S._rulerNew&&!(S.tool==='ruler'&&S._cross))return;
      ctx.save();window.__ETX_SKIP_COLORMAP=true;
      if(S._rulerNew){
        const n=S._rulerNew;
        const x1px=PL+(n.idx1-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const x2px=PL+(n.idx2-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const y1=sc.y(n.price1),y2=sc.y(n.price2);
        drawBand(ctx,x1px,x2px,y1,y2,W,H,0.75);
        const priceDiff=n.price2-n.price1,pct=priceDiff/n.price1*100;
        const nb=Math.max(1,Math.abs(Math.round(n.idx2-n.idx1)));
        drawLabel(ctx,(priceDiff>=0?'+':'')+priceDiff.toFixed(2)+' pts',(pct>=0?'+':'')+pct.toFixed(2)+'%',nb+' barra'+(nb!==1?'s':'')+'  '+fmtDur(nb),x2px,y2,W,H,0.75);
      }
      S._rulers.forEach(function(r){
        const x1px=PL+(r.idx1-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const x2px=PL+(r.idx2-S.view.start+.5)*CW(W)/(S.view.end-S.view.start);
        const y1=sc.y(r.price1),y2=sc.y(r.price2);
        drawBand(ctx,x1px,x2px,y1,y2,W,H,1.0);
        const priceDiff=r.price2-r.price1,pct=priceDiff/r.price1*100;
        const nb=Math.max(1,Math.abs(Math.round(r.idx2-r.idx1)));
        drawLabel(ctx,(priceDiff>=0?'+':'')+priceDiff.toFixed(2)+' pts',(pct>=0?'+':'')+pct.toFixed(2)+'%',nb+' barra'+(nb!==1?'s':'')+'  '+fmtDur(nb),x2px,y2,W,H,1.0);
      });
      if(S.tool==='ruler'&&S._cross){
        const cx=clamp(S._cross.cx,PL,W-RP());
        const cy=clamp(S._cross.cy,PT,H-PB);
        ctx.fillStyle='rgba(0,212,255,0.9)';
        ctx.strokeStyle='rgba(5,9,20,0.75)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      window.__ETX_SKIP_COLORMAP=false;ctx.restore();
    }
    syncBtn();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRuler);
  else initRuler();
})();
</script>