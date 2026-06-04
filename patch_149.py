#!/usr/bin/env python3
"""patch_149.py — Beta 0.149:
   1. normDelta fix (remove ATR from denominator — volume/price unit mismatch caused near-zero bias)
   2. localFlow uses MEAN instead of SUM (scale independent of smooth window)
   3. bias scale factor: tanh(flow*1.5) replaces tanh(flow*3)
   4. isSynth / synthCount tracking in _compute()
   5. drawCloud() rewritten: continuous 3-layer band, smoothed, gradient opacity
   6. drawStatePanel() shows DATA SOURCE row when >10% synthetic
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.148') >= 10, 'Beta 0.148 not found'
html = html.replace('Beta 0.148', 'Beta 0.149')

# ── 1. _compute(): delta + normDelta + localFlow + bias ──────────────────────────
OLD_COMPUTE_CORE = (
    "    /* per-candle delta (footprint or synthetic) */\n"
    "    var delta=new Float64Array(n);\n"
    "    for(var i=0;i<n;i++){\n"
    "      var c=cs[i];\n"
    "      if(c.buy!=null&&c.sell!=null){delta[i]=(c.buy||0)-(c.sell||0);}\n"
    "      else{var range=Math.max(c.h-c.l,1e-12);delta[i]=((c.c-c.l)/range*2-1)*c.v;}\n"
    "    }\n"
    "\n"
    "    /* normDelta = delta/(volMA*atr) — scale-invariant across all history */\n"
    "    var normDelta=new Float64Array(n);\n"
    "    for(var i=0;i<n;i++){normDelta[i]=delta[i]/((volMA[i]||1)*(atr[i]||1)+1e-10);}\n"
    "\n"
    "    /* localFlow: rolling window sum of normDelta over smooth candles */\n"
    "    /* No exponential decay — historical candles reflect LOCAL activity, not decayed cumulative state */\n"
    "    var sm=cfg.smooth;\n"
    "    var localFlow=new Float64Array(n);\n"
    "    for(var i=0;i<n;i++){\n"
    "      var s=0;\n"
    "      for(var j=Math.max(0,i-sm+1);j<=i;j++)s+=normDelta[j];\n"
    "      localFlow[i]=s;\n"
    "    }\n"
    "\n"
    "    /* bias: tanh of localFlow — always meaningful for historical candles */\n"
    "    var bias=new Float32Array(n);\n"
    "    for(var i=0;i<n;i++)bias[i]=Math.tanh(localFlow[i]*3);"
)
assert OLD_COMPUTE_CORE in html, 'compute core anchor not found'

NEW_COMPUTE_CORE = (
    "    /* per-candle delta — real buy/sell when available, else synthetic OHLCV estimate */\n"
    "    /* isSynth flags candles without real orderflow data (footprint buy/sell) */\n"
    "    var delta=new Float64Array(n);\n"
    "    var isSynth=new Uint8Array(n);\n"
    "    var synthCount=0;\n"
    "    for(var i=0;i<n;i++){\n"
    "      var c=cs[i];\n"
    "      if(c.buy!=null&&c.sell!=null){delta[i]=(c.buy||0)-(c.sell||0);}\n"
    "      else{var range=Math.max(c.h-c.l,1e-12);delta[i]=((c.c-c.l)/range*2-1)*c.v;isSynth[i]=1;synthCount++;}\n"
    "    }\n"
    "\n"
    "    /* normDelta = delta/volMA — pure volume ratio, no price-unit mixing.\n"
    "       Previous version divided by volMA*atr (price units) causing near-zero values\n"
    "       for assets like BTC where ATR >> 1, making tanh(localFlow) always flat. */\n"
    "    var normDelta=new Float64Array(n);\n"
    "    for(var i=0;i<n;i++){normDelta[i]=delta[i]/Math.max(volMA[i],1e-10);}\n"
    "\n"
    "    /* localFlow: rolling MEAN of normDelta (mean keeps scale independent of smooth size) */\n"
    "    var sm=cfg.smooth;\n"
    "    var localFlow=new Float64Array(n);\n"
    "    for(var i=0;i<n;i++){\n"
    "      var s=0,cnt=0;\n"
    "      for(var j=Math.max(0,i-sm+1);j<=i;j++){s+=normDelta[j];cnt++;}\n"
    "      localFlow[i]=cnt>0?s/cnt:0;\n"
    "    }\n"
    "\n"
    "    /* bias: tanh(flow*1.5) — scale matches normDelta/volMA magnitude [-3,+3] */\n"
    "    var bias=new Float32Array(n);\n"
    "    for(var i=0;i<n;i++)bias[i]=Math.tanh(localFlow[i]*1.5);"
)
html = html.replace(OLD_COMPUTE_CORE, NEW_COMPUTE_CORE, 1)

# ── 2. _compute() return — add synthCount, isSynth ───────────────────────────────
OLD_RETURN = "    return {bias,pressure,normDelta,delta,aggr,pulse,atr,volMA,events,marketMode,n};"
assert OLD_RETURN in html, 'compute return not found'
html = html.replace(OLD_RETURN,
    "    return {bias,pressure,normDelta,delta,aggr,pulse,atr,volMA,events,marketMode,n,synthCount,isSynth};",
    1)

# ── 3. drawCloud() — continuous 3-layer band replaces per-candle fillRect ────────
OLD_CLOUD = (
    "  /* ── CLOUD (before candles) ────────────────────────────────────────────────── */\n"
    "  function drawCloud(ctx,W,H,AllV,sc,x,bw){\n"
    "    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;\n"
    "    var cfg=_getCfg();if(!cfg.showCloud)return;\n"
    "    var cs=S.candles,n=cs.length;\n"
    "    if(!_cache){var ck=_ck(cs,cfg);if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}}\n"
    "    if(!_cache)return;\n"
    "    var res=_cache;\n"
    "    ctx.save();\n"
    "    for(var i=AllV.a;i<AllV.b;i++){\n"
    "      if(i<0||i>=n)continue;\n"
    "      var b=res.bias[i],p=res.pressure[i],at=res.atr[i]||1;\n"
    "      var cloudH=at*(0.25+p*0.85);\n"
    "      var yTop=sc.y(cs[i].c+cloudH/2),yBot=sc.y(cs[i].c-cloudH/2);\n"
    "      var h=Math.max(1,yBot-yTop);\n"
    "      var col=_biasColor(b,p);\n"
    "      var op=cfg.cloudOp*(0.3+p*0.7);\n"
    "      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+op.toFixed(3)+')';\n"
    "      var cx=x(i),hw=Math.max(bw*0.45,2);\n"
    "      ctx.fillRect(cx-hw,yTop,hw*2,h);\n"
    "    }\n"
    "    ctx.restore();\n"
    "  }"
)
assert OLD_CLOUD in html, 'drawCloud anchor not found'

NEW_CLOUD = (
    "  /* ── CLOUD (before candles) — continuous 3-layer band, smoothed ──────────── */\n"
    "  function drawCloud(ctx,W,H,AllV,sc,x,bw){\n"
    "    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;\n"
    "    var cfg=_getCfg();if(!cfg.showCloud)return;\n"
    "    var cs=S.candles,n=cs.length;\n"
    "    if(!_cache){var ck=_ck(cs,cfg);if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}}\n"
    "    if(!_cache)return;\n"
    "    var res=_cache;\n"
    "\n"
    "    var from=Math.max(0,AllV.a),to=Math.min(n-1,AllV.b);\n"
    "    if(to<from+1)return;\n"
    "    var len=to-from+1;\n"
    "\n"
    "    /* 3 concentric layers: outer (wide+translucent) → mid → core (narrow+opaque) */\n"
    "    var LYR=[\n"
    "      {top:new Float32Array(len),bot:new Float32Array(len),hS:1.00,opM:0.70},\n"
    "      {top:new Float32Array(len),bot:new Float32Array(len),hS:0.58,opM:1.10},\n"
    "      {top:new Float32Array(len),bot:new Float32Array(len),hS:0.28,opM:1.65}\n"
    "    ];\n"
    "    for(var k=0;k<len;k++){\n"
    "      var i=from+k,at=res.atr[i]||1,p=res.pressure[i]||0;\n"
    "      var fh=at*(0.42+p*1.00); /* full half-height in price units */\n"
    "      for(var li=0;li<LYR.length;li++){\n"
    "        var h=fh*LYR[li].hS;\n"
    "        LYR[li].top[k]=sc.y(cs[i].c+h);\n"
    "        LYR[li].bot[k]=sc.y(cs[i].c-h);\n"
    "      }\n"
    "    }\n"
    "    /* 5-point smoothing on pixel bands */\n"
    "    function _sm(arr){\n"
    "      var o=new Float32Array(arr.length);\n"
    "      for(var k=0;k<arr.length;k++){\n"
    "        var s=0,cnt=0;\n"
    "        for(var j=Math.max(0,k-2);j<=Math.min(arr.length-1,k+2);j++){s+=arr[j];cnt++;}\n"
    "        o[k]=s/cnt;\n"
    "      }\n"
    "      return o;\n"
    "    }\n"
    "    for(var li=0;li<LYR.length;li++){LYR[li].top=_sm(LYR[li].top);LYR[li].bot=_sm(LYR[li].bot);}\n"
    "\n"
    "    ctx.save();\n"
    "    /* draw each layer as bias-coloured filled segments */\n"
    "    for(var li=0;li<LYR.length;li++){\n"
    "      var lyr=LYR[li];\n"
    "      var segS=0;\n"
    "      for(var k=0;k<=len;k++){\n"
    "        var isEnd=(k===len);\n"
    "        var brk=false;\n"
    "        if(!isEnd&&k>0){\n"
    "          var bs0=_biasSign(res.bias[Math.min(from+k-1,n-1)]);\n"
    "          var bs1=_biasSign(res.bias[Math.min(from+k,n-1)]);\n"
    "          brk=(bs0!==bs1);\n"
    "        }\n"
    "        if(brk||isEnd){\n"
    "          var se=k-1;\n"
    "          if(se>=segS){\n"
    "            var mi=Math.max(0,Math.min(n-1,from+Math.round((segS+se)/2)));\n"
    "            var col=_biasColor(res.bias[mi],res.pressure[mi]);\n"
    "            var op=Math.min(0.88,cfg.cloudOp*lyr.opM*(0.30+res.pressure[mi]*0.70));\n"
    "            ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+op.toFixed(3)+')';\n"
    "            ctx.beginPath();\n"
    "            ctx.moveTo(x(from+segS),lyr.top[segS]);\n"
    "            for(var j=segS+1;j<=se;j++)ctx.lineTo(x(from+j),lyr.top[j]);\n"
    "            for(var j=se;j>=segS;j--)ctx.lineTo(x(from+j),lyr.bot[j]);\n"
    "            ctx.closePath();ctx.fill();\n"
    "          }\n"
    "          segS=k;\n"
    "        }\n"
    "      }\n"
    "    }\n"
    "    /* synthetic history watermark */\n"
    "    if(res.synthCount>0&&res.synthCount/res.n>0.05){\n"
    "      var rp2=typeof RP==='function'?RP():68;\n"
    "      ctx.font='600 8px monospace';ctx.textAlign='right';ctx.textBaseline='top';\n"
    "      ctx.fillStyle='rgba(200,170,50,0.48)';\n"
    "      ctx.fillText('\\u007e SYNTHETIC HISTORY',W-rp2-8,4);\n"
    "    }\n"
    "    ctx.restore();\n"
    "  }"
)
html = html.replace(OLD_CLOUD, NEW_CLOUD, 1)

# ── 4. drawStatePanel() — add DATA SOURCE row when majority synthetic ─────────────
OLD_STATE_BOX = (
    "    var rp=typeof RP==='function'?RP():68;\n"
    "    var boxW=130,boxH=72,boxX=W-rp-boxW-6,boxY=12;"
)
assert OLD_STATE_BOX in html, 'state box anchor not found'
html = html.replace(OLD_STATE_BOX,
    "    var synthPct=(res.synthCount&&res.n>0)?res.synthCount/res.n:0;\n"
    "    var rp=typeof RP==='function'?RP():68;\n"
    "    var boxW=130,boxH=synthPct>0.10?90:72,boxX=W-rp-boxW-6,boxY=12;",
    1)

# Add DATA SOURCE row after the modeLabel block  (before ctx.restore at end of state panel)
OLD_STATE_RESTORE = (
    "    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+modeR+','+modeG+','+modeB+',0.95)';ctx.textAlign='right';\n"
    "    ctx.fillText(modeLabel,valX,y3);\n"
    "    ctx.restore();\n"
    "  }"
)
assert OLD_STATE_RESTORE in html, 'state panel close anchor not found'
html = html.replace(OLD_STATE_RESTORE,
    "    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+modeR+','+modeG+','+modeB+',0.95)';ctx.textAlign='right';\n"
    "    ctx.fillText(modeLabel,valX,y3);\n"
    "    if(synthPct>0.10){\n"
    "      var y4=y3+rowH;\n"
    "      var dLabel=synthPct>0.50?'~SYNTHETIC':'PARTIAL REAL';\n"
    "      ctx.font='7px monospace';ctx.fillStyle='rgba(90,112,144,0.90)';ctx.textAlign='left';\n"
    "      ctx.fillText('DATA',labelX,y4);\n"
    "      ctx.font='bold 7px monospace';ctx.fillStyle='rgba(200,165,50,0.85)';ctx.textAlign='right';\n"
    "      ctx.fillText(dLabel,valX,y4);\n"
    "    }\n"
    "    ctx.restore();\n"
    "  }",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_149.py applied — Beta 0.149')
print('  + normDelta fix: delta/volMA (removed price-unit ATR from denominator)')
print('  + localFlow: rolling MEAN instead of SUM (scale-independent)')
print('  + bias: tanh(flow*1.5) — matches volume-ratio magnitude')
print('  + isSynth/synthCount tracking in _compute()')
print('  + drawCloud(): 3-layer continuous band, smoothed, visible on mobile')
print('  + drawStatePanel(): DATA row shows ~SYNTHETIC when majority footprint missing')
