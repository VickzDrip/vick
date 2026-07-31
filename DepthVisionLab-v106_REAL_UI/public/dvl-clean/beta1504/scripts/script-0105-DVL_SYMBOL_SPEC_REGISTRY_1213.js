(function(){
  "use strict";
  if(window.DVL_SYMBOL_SPEC_REGISTRY) return;
  var B=window.DVL_BROKER_PROFILE_REGISTRY,S=window.DVL_RISK_ENGINE_STORAGE;
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function normalizeKey(v){return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9._-]/g,"")||"BTCUSD";}
  function base(broker,symbol){var p=B.get(broker),k=normalizeKey(symbol);if(p&&p.symbols&&p.symbols[k])return clone(p.symbols[k]);return B.blankSymbol(k);}
  function get(broker,symbol){var k=normalizeKey(symbol),o=S.getOverride(broker,k);return Object.assign(base(broker,k),o||{});}
  function listSymbols(broker){var p=B.get(broker),set={};if(p&&p.symbols)Object.keys(p.symbols).forEach(function(k){set[k]=1;});var ov=(S.get().overrides||{})[broker]||{};Object.keys(ov).forEach(function(k){set[k]=1;});return Object.keys(set).sort();}
  function save(broker,symbol,spec){var k=normalizeKey(symbol),clean=Object.assign(base(broker,k),spec||{});clean.brokerSymbol=normalizeKey(clean.brokerSymbol||k);clean.currency=String(clean.currency||"USD").trim().toUpperCase().slice(0,8);clean.updatedAt=new Date().toISOString();clean.source="manual";S.setOverride(broker,k,clean);return clean;}
  function reset(broker,symbol){S.clearOverride(broker,normalizeKey(symbol));return get(broker,symbol);}
  function num(v){if(v==null||v==="")return null;var s=String(v).trim().replace(/\s/g,"");if(s.indexOf(",")>=0&&s.indexOf(".")>=0){if(s.lastIndexOf(",")>s.lastIndexOf("."))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");}else if(s.indexOf(",")>=0)s=s.replace(",",".");var n=Number(s.replace(/[^0-9+\-.eE]/g,""));return Number.isFinite(n)?n:null;}
  var fields=[
    ["brokerSymbol",/^(?:symbol|símbolo|simbolo)(?:\s+name)?\s*[:=]\s*(.+)$/i,false],
    ["contractSize",/^(?:contract\s*size|tamanho\s+do\s+contrato)\s*[:=]\s*(.+)$/i,true],
    ["tickSize",/^(?:tick\s*size|tamanho\s+do\s+tick)\s*[:=]\s*(.+)$/i,true],
    ["tickValue",/^(?:tick\s*value|valor\s+do\s+tick)\s*[:=]\s*(.+)$/i,true],
    ["volumeMin",/^(?:volume\s*min(?:imum)?|min(?:imum)?\s*lot|lote\s*m[ií]nimo)\s*[:=]\s*(.+)$/i,true],
    ["volumeMax",/^(?:volume\s*max(?:imum)?|max(?:imum)?\s*lot|lote\s*m[aá]ximo)\s*[:=]\s*(.+)$/i,true],
    ["volumeStep",/^(?:volume\s*step|lot\s*step|passo\s+do\s+lote)\s*[:=]\s*(.+)$/i,true],
    ["digits",/^(?:digits|d[ií]gitos)\s*[:=]\s*(.+)$/i,true],
    ["currency",/^(?:account\s*currency|currency|moeda\s+da\s+conta)\s*[:=]\s*(.+)$/i,false],
    ["marginLeverage",/^(?:leverage|margin\s*leverage|alavancagem)\s*[:=]\s*(.+)$/i,true]
  ];
  function parse(text){var out={},recognized=[];String(text||"").split(/\r?\n/).forEach(function(line){line=line.trim();if(!line)return;for(var i=0;i<fields.length;i++){var f=fields[i],m=line.match(f[1]);if(m){out[f[0]]=f[2]?num(m[1]):String(m[1]).trim();recognized.push(f[0]);break;}}});return {values:out,recognized:recognized};}
  window.DVL_SYMBOL_SPEC_REGISTRY={normalizeKey:normalizeKey,get:get,listSymbols:listSymbols,save:save,reset:reset,parse:parse,parseNumber:num};
})();
