const DVL_APP_VERSION = String(window.DVL_APP_VERSION || "Beta 1.554");
window.DVL_APP_VERSION = DVL_APP_VERSION;
try{ var _dvlVB = document.getElementById("versionBadge"); if(_dvlVB) _dvlVB.textContent = String(DVL_APP_VERSION).toUpperCase(); var _dvlVB1b = document.getElementById("dvl1b_versionBadge"); if(_dvlVB1b) _dvlVB1b.textContent = String(DVL_APP_VERSION).toUpperCase(); }catch(_){}
/* ── Rede de segurança da SESSÃO salva (só PREENCHE o que falta) ──
   O botão "Salvar" grava um snapshot das chaves do app. Os indicadores já
   guardam sozinhos o próprio estado no localStorage (ligado/desligado, configs),
   e o localStorage sobrevive ao recarregar por conta própria. Então aqui a gente
   NÃO sobrescreve nada que já tenha valor vivo — só restaura chaves que ESTÃO
   FALTANDO (ex.: navegador novo/limpo). Antes a gente reescrevia por cima do
   snapshot antigo, e isso RESSUSCITAVA um indicador que você tinha tirado depois
   do último Salvar (você tirava, recarregava e ele voltava). Com "só preenche o
   que falta", o que você mudou por último SEMPRE vale, e o snapshot vira só uma
   rede de segurança pro que se perderia. */
try{
  var _dvlSnapRaw = localStorage.getItem("DVL_USER_PROFILE_SNAPSHOT");
  if(_dvlSnapRaw){
    var _dvlSnap = JSON.parse(_dvlSnapRaw);
    if(_dvlSnap && _dvlSnap.localStorage && typeof _dvlSnap.localStorage === "object"){
      Object.keys(_dvlSnap.localStorage).forEach(function(k){
        try{
          if(k === "DVL_USER_PROFILE_SNAPSHOT" || k === "DVL_USER_PROFILE_LAST_SAVE") return;
          if(localStorage.getItem(k) != null) return;   // já tem valor vivo → NÃO sobrescreve
          var v = _dvlSnap.localStorage[k];
          if(v != null) localStorage.setItem(k, v);
        }catch(_){}
      });
    }
  }
}catch(_){}
window.DVL_CHANGELOG = [
  { version: "Beta 1.651", note: "DVL_BODY_REVERSAL_SCOUT_1651 - novo marcador informativo de possivel reversao baseado somente em sequencias de corpos dominantes fechados de 15s/30s. Projeta o sinal intrabar no candle correspondente de ate 5m sem lookahead. Historico visual de segundos ampliado para 8000 candles." },
  { version: "Beta 1.650", note: "DVL_LIVE_VOLUME_FALLBACK_1650 - Volume intrabar agora acompanha os candles ao vivo. Em 15s/30s, se aggTrade falhar mas o kline-base continuar, o delta cumulativo de volume preenche a barra sem duplicar quando os trades voltam. O poll REST tambem recupera volume nativo e os aliases volume/v/baseVolume ficam sincronizados." },
  { version: "Beta 1.633", note: "Remocao de indicadores. Sairam do menu de indicadores: ARION Zone Profile MTF, DVL FVG Firewall, DVL FVG Magnet IFVG, Alertas VP (o INDICADOR — os alertas do novo Alerts Hub NAO foram mexidos), DVL Smart Delta, DVL Bookmap Zones e Liquidity Bands. Alem de tira-los do menu, um passo de limpeza desliga quem porventura estava com algum deles ligado (pra ninguem ficar com o desenho na tela sem ter como desligar) e remove a linha residual do menu antigo. Os engines seguem carregados nos bastidores porque outros indicadores mantidos dependem deles (ex.: Deep Heatmap usa o Bookmap, RSI Exhaustion referencia o ARION). So frontend." },
  { version: "Beta 1.632", note: "Correcao — o site travava (freeze) logo apos carregar por causa do novo DWC. O 'a prova de rebuild' do menu do DWC observava a arvore inteira do documento e, ao reposicionar o proprio item, disparava o observer de novo, entrando numa tempestade de mutacoes/microtasks que congelava a aba (acontecia pra todos, mesmo com o DWC desligado, pois o observer roda no boot). Agora a insercao e IDEMPOTENTE (nao mexe no DOM se o item ja esta no lugar), com guarda de re-entrancia (ignora as mutacoes que nos mesmos causamos) e debounce de 200ms no observer. O cache do baseline de volume tambem passou a usar comprimento+tempo dos candles em vez da referencia do array (evita rebuild por frame). So frontend." },
  { version: "Beta 1.631", note: "Novo indicador — DVL Dominant Wick Candles (DWC). Em candles com VOLUME acima da media (SMA/EMA configuravel, padrao 20), o MAIOR pavio vira o corpo do candle e a direcao passa a ser definida pelo pavio dominante — nao pela cor original (um candle verde com pavio superior maior vira VENDEDOR; um vermelho com pavio inferior maior vira COMPRADOR). O lado que virou corpo some como pavio (fica so 1 pavio). Empate de pavios mantem o candle original. 3 modos de render: Replace (padrao, substitui visualmente), Overlay (desenha por cima translucido) e Markers (so um marcador de direcao). Reage intrabar: o candle atual pode cruzar a media e mudar de dominancia durante a barra. E uma camada VISUAL derivada — nao altera o OHLCV base (Volume/RSI/VP/Risk/Replay seguem lendo a serie original). Painel padrao DVL (Main/Volume Filter/Rendering/Visual). So frontend." },
  { version: "Beta 1.630", note: "Alertas — Recentes agora inclui os alertas do Telegram disparados com o DVL FECHADO. O servidor guarda um historico dos alertas que foram pro Telegram (inclusive os avaliados server-side com o navegador fechado); ao abrir o painel, o 'Recentes' MESCLA esse historico com o log local, deduplicando e marcando com a tag TG. Antes o Recentes so tinha o que disparava com a aba aberta. Frontend + backend." },
  { version: "Beta 1.629", note: "Alertas Telegram — avaliacao SERVER-SIDE 24/7 (Fase 4a: Preco). As regras com Telegram ligado sao sincronizadas pro servidor; quando o DVL esta FECHADO, o backend roda as condicoes de Preco (cruza nivel, movimento rapido %) a partir dos klines da Binance e entrega no Telegram — sem precisar do site aberto. Enquanto o DVL esta aberto, um heartbeat avisa o servidor pra NAO avaliar (o cliente ja entrega), evitando duplicidade. Idempotencia por candle no triggerId. Fontes MA/VWAP/VP/Cruzamento entram nas proximas etapas; por ora seguem client-session. So a fonte Preco ja funciona com o site fechado. Frontend + backend." },
  { version: "Beta 1.628", note: "Alertas — canal Telegram (UI). Nova secao 'Telegram' no painel de Alertas (entre Novo alerta e Meus alertas): estado da conexao (Nao conectado / Conectado · Chat privado / Ativo ate… / Pausado), seletor de duracao e botoes Conectar / Testar / Pausar / Renovar / Desconectar. O 'Conectar Telegram' abre o bot @DvlalertsBot por deep-link e detecta a confirmacao automaticamente. Cada alerta ganhou um switch 'Telegram' (desligado ate conectar; tocar leva a secao). Quando um alerta com Telegram dispara, o evento vai pro backend (fila assincrona) alem do toast/som; Recentes marca as entradas com uma tag 'TG'. O disparo, o cooldown e o rearme continuam sendo do motor local — o Telegram e so mais um canal. So frontend (backend ja no ar)." },
  { version: "Beta 1.627", note: "Alerts Hub — TF e RSI Exhaustion. (1) O dropdown de Timeframe perdeu o 'Qualquer' e agora começa em 'Chart (TF atual)': a regra casa com o TF do gráfico (ou um TF fixo escolhido), evitando 1 alerta disparar em vários TFs de uma vez. (2) RSI Exhaustion ganhou um sinal combinado 'Exaustão (topo ou fundo)' — uma regra só cobre as DUAS exaustões (mais barato), e a notificação diz se foi TOPO (▼) ou FUNDO (▲). Regras antigas com TF vazio passam a valer como 'Chart'. So frontend." },
  { version: "Beta 1.626", note: "Alerts Hub — nova fonte 'Cruzamentos (combinar)' pra COMBINAR indicadores: voce escolhe a Linha A, a Linha B e a direcao (pra cima / pra baixo / ambas). Cobre casos como EMA × VWAP, Preco × borda do VWAP (±1σ/±2σ), Media × VP (POC/VAH/VAL), etc. So aparecem as linhas dos indicadores LIGADOS. O motor detecta o cruzamento comparando o sinal de (A−B) a cada tick. Dica: pra pegar as duas direcoes no mesmo candle, use o rearme 'A cada candle + direcao'. VWAP passou a expor seus valores (linha + bandas) pro hub. So frontend." },
  { version: "Beta 1.625", note: "Alerts Hub — Timeframe e Rearme melhorados. (1) O Timeframe do alerta agora e um DROPDOWN com os TFs do hotbar (favoritos do DVL_TF_MENU) + o TF atual + 'Qualquer'; conforme voce favorita mais TFs, a lista cresce. (2) O antigo 'Cooldown (s)' virou 'Rearmar' com opcoes alem de tempo: 'Por tempo (s)' (cooldown em segundos, mostra o campo), 'A cada candle fechado' (dispara no maximo 1× por candle) e 'A cada candle + direcao' (1× por candle por direcao — permite um disparo de alta e um de baixa no mesmo candle). O gating de re-arme e aplicado no motor pra todas as fontes. So frontend." },
  { version: "Beta 1.624", note: "Alerts Hub — posicionamento do dropdown corrigido. O painel usa transform + overflow:hidden, entao o menu (fixed/absolute interno) saia deslocado la pra baixo e cortado. Agora o menu e renderizado como um float FILHO DO BODY, posicionado na viewport colado ao botao (abre pra cima quando nao cabe embaixo), com os textos das opcoes completos (quebram linha em vez de cortar). Fecha ao escolher, tocar fora, rolar ou redimensionar. So frontend." },
  { version: "Beta 1.623", note: "Alerts Hub — dropdowns refeitos. O <select> nativo do Android pintava a opcao selecionada de VERDE SOLIDO tapando o texto e ignorava CSS. Troquei por um dropdown CUSTOMIZADO (botao + lista propria): a opcao selecionada aparece com um leve realce + bolinha marcadora, mostrando o que esta escolhido SEM cobrir o texto. Menu com position:fixed (nao e mais cortado pelo scroll do painel), abre pra cima quando nao cabe embaixo, e fecha ao tocar fora ou rolar. Vale pra todos os seletores do painel (indicador, sinal, media, nivel do VP, direcao). So frontend." },
  { version: "Beta 1.622", note: "Alerts Hub — novas fontes e ajuste do dropdown. (1) MEDIAS MOVEIS: alerta de 'preco cruza a media' com um seletor de QUAL media (so lista as medias LIGADas, ex. SMA 20 · valor atual) + direcao; cada media pode ter seu proprio alerta. (2) VOLUME PROFILE: alerta de 'preco bate no nivel' com seletor POC/VAH/VAL/qualquer (le os niveis ao vivo do indicador; precisa do VP ligado). Introduzido um sistema de PARAMETROS por-sinal (o construtor de regra mostra seletores especificos de cada fonte). (3) Corrigido o dropdown do painel: a opcao selecionada aparecia como uma barra verde solida tapando o texto — agora usa tema escuro nativo (color-scheme) com contraste correto. So frontend." },
  { version: "Beta 1.621", note: "Alerts Hub — o botao certo agora. A barra de baixo VISIVEL e a nav V2 (Copilot · Scanner · Trade · Positions · Watchlist), montada pelo script-0120; na 1.620 eu troquei a nav LEGADA (escondida), por isso continuava aparecendo 'Scanner'. Agora o 2º botao da nav V2 virou 'Alertas' (icone de sino) e abre o DVL Alerts Hub; o Scanner nao abre mais por ele (o motor do scanner continua no codigo, so nao ligado a esse botao). So frontend." },
  { version: "Beta 1.620", note: "DVL Alerts Hub — estrutura GENERICA de alertas. O antigo botao Scanner virou o botao 'Alertas' (mesmo padrao do site), que abre um painel central onde voce monta regras em cima de QUALQUER indicador: escolhe indicador -> sinal -> filtros (direcao, nivel, timeframe, cooldown) -> canais (toast no grafico, som, historico). Cada indicador registra os sinais que sabe detectar (DVL_ALERTS.registerSource) e dispara quando acontece (DVL_ALERTS.emit); reusa o DVL_ALERTS_LOG como historico. Fontes ja ligadas: Preco (cruza acima/abaixo de nivel, movimento rapido %), Smart Delta (compra/venda/confluencia), RSI Exhaustion (exaustao de topo/fundo) e Liquidity Bands (busca de liquidez em cima/baixo). Canais deste release: no app (toast + som + log). So frontend." },
  { version: "Beta 1.613", note: "Crosshair MOBILE agora mostra a data/hora na timeline. O rotulo de tempo e um elemento DOM (#dvlCross1544TimeTag) que fica acima do canvas da timeline; no desktop ele era agendado pelo pointermove, mas o handler saia cedo p/ toque, entao no mobile o cross de long-press nunca reagendava e a data/hora nao aparecia. Exposto um hook (DVL_CROSS_TIME_TAG_1544_SYNC) que a draw() chama enquanto o cross mobile esta ativo (e ao ser dispensado), mostrando/escondendo o tag conforme crosshair.visible. Removido o rotulo de tempo redundante do canvas (ficava coberto pela timeline). So frontend." },
  { version: "Beta 1.612", note: "Crosshair MOBILE corrigido: no celular o cross 'nem aparecia de forma alguma'. Causa raiz — a funcao drawCrosshair (que pinta o cross direto no canvas) foi perdida na extracao monolito->modular; o crosshair DOM so funciona no desktop, entao no mobile a draw() caia no ramo que chamava drawCrosshair e batia num ReferenceError, abortando o render do cross. Restaurei a funcao original (perna vertical atravessando os dois paineis, perna horizontal + dot, tag de preco e label de tempo). Desktop segue usando o cross DOM, intacto. So frontend." },
  { version: "Beta 1.611", note: "Liquidity Bands: voltou a ser BANDAS (serie temporal) que ficam no historico pra estudar pontos passados — a parede ASK dominante (topo) e BID (base) tracam o trajeto da liquidez ao longo do tempo, com canal sombreado. O grab de liquidez agora e um LABEL (triangulo) no topo (buscou ask) ou na base (buscou bid) do candle que varreu a banda e voltou pra dentro, mostrando qual lado foi buscado. So frontend." },
  { version: "Beta 1.610", note: "Liquidity Bands redesenhado como NIVEIS HORIZONTAIS VIVOS: em vez de bandas presas ao tempo dos candles, agora as paredes de liquidez dominantes (ASK acima / BID abaixo) sao linhas horizontais no preco delas, atravessando o grafico e se movendo conforme a liquidez sobe/desce (o trajeto). Quando um candle recente toca o nivel (foi buscar liquidez), o nivel ganha glow + marcador. Motor e solver iguais; mudou so o render. So frontend." },
  { version: "Beta 1.609", note: "Novo indicador: DVL Liquidity Bands — usa o motor do Deep Heatmap (order book) pra desenhar duas bandas que rodeiam o preço: a parede de ASK dominante acima e a de BID dominante abaixo, suavizadas (o 'caminho' das ordens), com canal sombreado e marcadores de liquidez absorvida (consume) e retirada (pull). Fica no menu de indicadores (seção Overlay, selo LB); liga o motor do Deep Heatmap sozinho ao ativar. Cálculo por solver isolado testado offline. Só frontend." },
  { version: "Beta 1.608", note: "Crosshair do mouse agora ATRAVESSA o painel dos osciladores (RSI Exhaustion etc.): a linha vertical (tempo) se estende do preço até o fundo do painel inferior, alinhando o candle com o valor do oscilador. Antes ela parava no fim do painel de preço. Ajustado nos renderizadores do crosshair native (1547/1550/1551) usando dvlCrossPanelBottom; a horizontal e o rótulo de preço seguem restritos ao painel de preço. Só frontend." },
  { version: "Beta 1.607", note: "Causa raiz do RSI Exhaustion não plotar a linha (em NENHUM timeframe): o objeto global window.__dvlLastCrossCfg — que carrega a view e a função x do gráfico — deixou de ser publicado quando o app foi extraído do HTML monolítico para o build modular (o setter ficou só nos index-*.html antigos). Sem ele, o xForTime do RSI retornava NaN e nenhum ponto era plotado. Restaurado o setter no render do core (junto do __DVL_DRAWCFG). Também beneficia os labels de crosshair, que liam esse config. Só frontend." },
  { version: "Beta 1.606", note: "Fix do RSI Exhaustion nos timeframes em segundos (15s/30s): a linha não plotava. Causa: a função tfMs() do indicador só reconhecia m/h/d e ignorava o sufixo 's', caindo no default de 60000ms — então no 15s/30s o closeTime das velas (filtro do normalizeRows) e o mapeamento do desenho (bounds/step por tfMs(chartTf())) ficavam errados e a série era descartada, independente do TF de cálculo. Agora tfMs aceita segundos (15s→15000, 30s→30000), com m/h/d idênticos ao anterior (zero mudança no 1m+). Só frontend." },
  { version: "Beta 1.605", note: "Painel do Spline Quantile Channel padronizado no visual do app: seções (Geral / Quantis & Forecast / Cores) com grid, switches ON-OFF, inputs e select no tema escuro, e seletor de cor por paleta — igual aos demais indicadores (VWAP etc.). Antes os controles vinham crus/amontoados. Só frontend." },
  { version: "Beta 1.604", note: "Spline Quantile Channel finalmente aparece no menu de Indicators. Causa raiz: o menu novo (Phase 1B) é montado a partir de um registro interno de módulos (modules()), não do #indicatorDropdown legado onde o indicador se registrava — então ele nunca era listado, apesar de carregado. Agora o Spline Quantile Channel está no registro, na seção Overlay (ao lado do VWAP), com toggle/painel/estado ON-OFF integrados ao UI novo. Só frontend." },
  { version: "Beta 1.603", note: "Fix do Spline Quantile Channel: o item não aparecia no menu de Indicators em alguns casos porque o novo UI reconstrói o menu depois que o registro inicial já rodou. Agora o item é (re)inserido no exato momento em que você abre os Indicators (mesmo padrão à prova de rebuild/timing do Deep Heatmap), além do boot com reintento. Só frontend." },
  { version: "Beta 1.602", note: "Novo indicador: DVL Spline Quantile Channel — canal de regressão quantílica por spline cúbica truncada, com 3 curvas (superior/mediana/inferior) e projeção (forecast). Fica no menu de indicadores com o selo SQ, ao lado do VWAP; painel com janela, nós (knots), iterações do IRLS, quantis superior/inferior, forecast, preenchimento, espessura e cores, tudo persistido. O cálculo pesado (IRLS quantílico) roda num Web Worker off-thread com scheduler somente-o-último e token de geração (não trava o gráfico), com fallback no main-thread. Implementação independente a partir da matemática (spline cúbica + IRLS + Cholesky), não é cópia de código de terceiros. Só frontend." },
  { version: "Beta 1.554", note: "CANDLE FLUIDO DE VERDADE (tick a tick). Diagnóstico pelo próprio medidor do app (DVL_PERF): fps=2, renderMs=6ms (desenho rápido!), tickMs=0 — ou seja, o desenho era rápido, mas o feed de NEGÓCIOS ao vivo (@aggTrade) numa conexão separada NÃO entregava dados, então a vela só andava no ritmo do @kline (~2/s = aos saltos). Correção: juntei @kline + @aggTrade numa ÚNICA conexão (combined stream) — o aggTrade passa a andar de carona na conexão do kline (que funciona) e a vela se move a cada negócio. Vale pros TFs de minuto e também pros agregados (15s/30s). Agora deve ficar liso." },
  { version: "Beta 1.554", note: "Feed não morre mais sozinho (fim do 'para de gerar e só volta no F5'). Os WebSockets da Binance às vezes ficavam 'abertos' mas paravam de mandar dados (morte silenciosa) — e como o reconnect só olhava se o socket estava fechado, o feed congelava até você dar F5 (ex.: barras de volume paravam de nascer). Agora tem um watchdog: se um feed fica mudo por >20s, ele é forçado a reconectar na hora. Também revalida os feeds ao voltar a aba do background. Isso mantém candle/volume/indicadores vivos sem refresh." },
  { version: "Beta 1.554", note: "Vela mais fluida (tick a tick). O render ao vivo ia por um setTimeout com 'gap adaptativo' (16–60ms) ANTES do requestAnimationFrame — isso adicionava latência e deixava a vela 'aos saltos'. Agora o update ao vivo vai DIRETO pro requestAnimationFrame (caminho rápido do spec §10): a vela desenha no próximo frame do monitor, coalescendo os negócios em 1 frame por refresh, sem gap extra. Deve ficar bem mais lisa em quem tem o gráfico leve. (Se ainda travar, o gargalo passa a ser o custo do desenho completo — aí eu faço o render só da última vela.)" },
  { version: "Beta 1.554", note: "Fim do 'candle piscando' — versão certa (a 1.385 quebrou o fluxo e foi revertida). Agora o @aggTrade continua movendo o OHLC da vela a cada negócio (fluidez), mas o @kline (em lote, atrasado) NÃO sobrescreve mais o OHLC no meio da vela — ele só traz o VOLUME e assume o OHLC inteiro no FECHAMENTO. E a 'cola' com o ticker REST (~2s) vira no-op quando há kline ao vivo. Não mexi na prioridade de preço que tinha quebrado a 1.385. Vela fluida e sem piscar em todos os TFs." },
  { version: "Beta 1.554", note: "P0 — CANDLE AO VIVO CONSERTADO em todos os timeframes. Causa raiz: os WebSockets do candle/preço ao vivo apontavam pra FUTUROS da Binance (fstream), que é geo-bloqueado no Brasil — então nenhum candle atualizava sozinho e a vela só mudava ao recarregar a página (o histórico funcionava porque o REST cai pro spot). Troquei os três feeds ao vivo do gráfico (kline, aggTrade e o kline base dos TFs agregados) pro SPOT (stream.binance.com), que é alcançável e casa com o histórico. O resto do pipeline (aplicar a vela aberta com closed=false, nascer vela nova na fronteira, roteamento por símbolo/TF, reconexão, isolamento do Replay) já estava correto. Agora a vela atual se mexe ao vivo, sem refresh. (15s/30s reais entram depois, conforme o P0.)" },
  { version: "Beta 1.554", note: "Correção do clique em 15s/30s. O timeframe não trocava ao clicar em 15s/30s porque o sistema de TF tem módulos legados sobrepostos que engoliam a seleção de segundos. Agora um handler dedicado força a troca de forma confiável (só pra 15s/30s, sem tocar nos TFs de minuto). Além disso, os candles de 15s/30s passam a carregar PRIMEIRO do recorder do próprio servidor DVL (/api/market/candles) — candles reais com histórico mais confiável — caindo pro builder de aggTrades da corretora se precisar. Recarregue a página pra pegar a correção." },
  { version: "Beta 1.554", note: "Timeframes de 15s e 30s no gráfico. Agora 15s e 30s aparecem FIXADOS na barra de timeframe (e no menu de TFs) — é só clicar pra ver os candles reais de 15s/30s no gráfico, montados de aggTrades reais. Antes o menu de TF só listava de 1m pra cima; os segundos existiam no motor mas nunca eram mostrados. (Se você tirar o 15s/30s da barra, não volta sozinho.) Obs: o histórico inicial vem dos aggTrades da corretora; o recorder do servidor vai deixando o histórico mais fundo com o tempo." },
  { version: "Beta 1.554", note: "Backend — motor de candles reais 15s/30s agora usa SPOT. Confirmado que a Binance bloqueia o IP do VPS pro mercado de FUTUROS (REST HTTP 418 = IP banido, WebSocket sem dados). O spot funciona no host e é praticamente idêntico ao futuro pra sinal de RSI Exhaustion (a diferença de preço spot/futuro é mínima). O mesmo motor (OHLCV verdadeiro, volume buy/sell, delta, dedupe, reconnect, correção, candles vazios) agora grava candles de SPOT 24/7; acompanhe em /api/market/health e /api/market/candles. Configurável por env pra voltar a futuros se o host tiver acesso um dia. Próximo: Fase 1b (Motor Intrabar no RSI Exhaustion Pro). Visual não muda ainda." },
  { version: "Beta 1.554", note: "Backend — diagnóstico do feed de futuros. O motor conectava mas não chegava nenhum trade (provável restrição geo/IP da Binance derivativos pro IP do VPS). Adicionado diagnóstico em /api/market/health (estado do WebSocket, nº de mensagens, código de fechamento, erro, status do REST) e um status STARVED pra quando conecta sem receber dados. Sem impacto no visual." },
  { version: "Beta 1.554", note: "Backend — motor de candles reais 15s/30s de FUTUROS LIGADO. Com o 502 resolvido (era o arquivo não copiado no deploy), o motor agora sobe por padrão e começa a gravar candles OHLCV verdadeiros de 15s/30s a partir dos aggTrades de futuros (binance-usdm), 24/7. Dá pra acompanhar em /api/market/health e /api/market/candles. Protegido: se os futuros não forem alcançáveis do servidor, reporta OFFLINE/DEGRADED sem afetar o site (e dá pra desligar com DVL_SUBSECOND=0). Assim que confirmar que está formando candles, entra a Fase 1b: Motor Intrabar no RSI Exhaustion Pro. Visual não muda ainda." },
  { version: "Beta 1.554", note: "Backend — CAUSA do 502 encontrada e corrigida. O motor de candles 15s/30s tinha caído porque o script de deploy do VPS copiava só server.js e index.html pro diretório vivo — o novo arquivo subsecondCandles.js nunca era copiado, então o require estourava 'Cannot find module' e o pm2 reiniciava em loop (502). Correção: (1) o server.js agora carrega o módulo de forma DEFENSIVA (se faltar, roda sem o motor em vez de derrubar o site) e (2) o deploy.sh passou a copiar subsecondCandles.js ANTES do server.js e reinicia uma vez só. O motor de candles reais de futuros (15s/30s, testado) continua DESLIGADO por padrão (liga com DVL_SUBSECOND=1). Nada no visual muda." },
  { version: "Beta 1.554 (revertida)", note: "Deploy de isolamento (sem guardas process.on) — usado só pra diagnosticar o 502; revertido." },
  { version: "Beta 1.554", note: "Backend — motor de candles REAIS de 15s/30s (Fase 1a) entregue DESLIGADO por padrão. O motor completo (aggTrades reais de futuros → OHLCV 15s/30s, volume buy/sell, delta, dedupe, reconnect, resync, candles vazios, correção com revision, REST /api/market/candles + /api/market/health + WebSocket ao vivo, 28 testes determinísticos passando) está no servidor, mas fica DESLIGADO até ligar a env DVL_SUBSECOND=1. Motivo: nas primeiras tentativas o feed de futuros ligado derrubou o servidor em produção (não reproduz local); então agora o deploy é seguro (site igual ao estável) e ligar o feed é um switch reversível pela env. Assim que o feed subir estável, entra a Fase 1b: Motor Intrabar no RSI Exhaustion Pro. Nada no visual muda." },
  { version: "Beta 1.554 (revertida)", note: "Backend — motor de candles REAIS de 15s e 30s (Fase 1a, versão robusta). O servidor constrói candles OHLCV verdadeiros de 15s/30s a partir de aggTrades REAIS de FUTUROS (binance-usdm), sem nunca cortar/interpolar candles de 1m: o timestamp do negócio escolhe o bucket UTC (00/15/30/45s). Inclui volume de compra/venda agressiva, delta, dedupe por aggTradeId, reconexão com backoff, detecção de buraco + resync via REST, candles vazios pra continuidade e correção de trades atrasados (revision). Grava 24/7 e expõe REST /api/market/candles + /api/market/health e um canal WebSocket ao vivo. Robustez: os candle_update ao vivo são COALESCIDOS (~5/s por intervalo, não 1 por trade) e o motor roda totalmente isolado sob guardas de processo, então nada nele pode derrubar o site. 28 testes determinísticos passando (OHLCV exato, fronteira, fora de ordem, 30s = união de dois 15s, candle vazio, correção tardia, dedupe). Próximo passo (Fase 1b): ligar como Motor Intrabar no RSI Exhaustion Pro. Nada no visual muda ainda." },
  { version: "Beta 1.554", note: "Deep Heatmap — DUAS coisas. (1) Agora as paredes de liquidez PASSADAS ficam salvas: o book fundo que se forma ao vivo (com as paredes até a faixa toda) é gravado localmente no seu navegador (IndexedDB) e RESTAURADO ao abrir/religar o indicador — então você já entra com o histórico real daquelas liquidezes do tempo em que o indicador ficou aberto, sem re-acumular. Antes o histórico do servidor era raso (só topo do book), por isso as paredes só \"nasciam\" no candle atual. (2) Novo botão \"Fluxo ao vivo (paredes formando)\": desligue pra CONGELAR — para de acrescentar as paredes que estão se formando agora, mas as passadas continuam visíveis, ótimo pra estudar um nível sem o mapa mexer. Obs: o histórico salvo cobre o tempo em que o indicador esteve aberto (por símbolo e mesma faixa vertical). Só frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap — a detecção de CONSUMO agora roda também sobre o histórico de ~2h que abre pronto, não só ao vivo. Aquelas paredes de liquidez que ficavam fixas: agora dá pra ver, olhando o passado, se elas JÁ FORAM PEGAS (▲ compra / ▼ venda) ou se apenas foram retiradas — assim você sabe na hora se aquele nível de liquidez já foi consumido antes de você chegar. Ao semear o book e os trades das 2h, a varredura de consumo é reconstruída sobre todos os snapshots do histórico. Só frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap — a matiz (liquidez já formada) agora abre pronta com ~2h TODA vez, sem re-acumular. O seed do histórico passou a bater direto no recorder de depth do próprio servidor DVL (same-origin), que já tem muitas horas gravadas — antes ia por um caminho que às vezes caía num backend recém-reiniciado com pouco histórico, dando a sensação de \"recomeçar\" ao religar o indicador. Ligar/desligar não perde mais o mapa (ele já persistia em memória e agora re-semeia na hora). Obs: é normal a matiz ser mais rala nas EXTREMIDADES (topo/base do preço e borda mais antiga) — a liquidez do book se concentra perto do preço; longe do meio há poucas ordens paradas. Só frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap — modo \"Heatmap\" agora é estilo DeepCharts de verdade: PREENCHE a largura toda. No painel, em Visual, escolha Heatmap (ou Linha) — o eixo de preço passa a ser DIRIGIDO PELOS DADOS (cobre o book de todas as colunas visíveis) em vez do eixo fixo das velas, então a liquidez aparece de ponta a ponta, com escala de preço própria à direita e a linha de preço branca por cima (velas ocultas nesse modo). No modo Candles segue como overlay (mostra a liquidez perto do preço atual). Só frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap — o histórico de ~2h (na real ~16h) já EXISTIA no servidor (/api/depth_history), mas o mapa não semeava porque o parser só aceitava {snapshots}/{data} e o endpoint devolve um array cru [{time,bids,asks}]. Agora o parser aceita o array cru também — então, ao ligar o DH, o heatmap já abre preenchido com o histórico do book do servidor (não começa mais vazio). Removido o gravador redundante que eu tinha posto no backend do scanner (o servidor DVL já grava). Frontend + backend (limpeza)." },
  { version: "Beta 1.554", note: "Deep Heatmap — histórico de ~2h já carregado na entrada. Novo gravador de order book no BACKEND (depthHistory.js): faz polling do depth da Binance Spot a cada 8s e mantém um anel de ~2h por símbolo (BTC/ETH/SOL gravados desde o boot; outros sob demanda). Endpoint /api/depth_history serve os snapshots e o Deep Heatmap semeia o mapa com eles ao ligar (agora pede 120 min). Assim, ao abrir, o heatmap já vem preenchido em vez de começar vazio. OBS: como é em memória, logo após um deploy o servidor recomeça do zero e enche até ~2h. Frontend + backend." },
  { version: "Beta 1.554", note: "Deep Heatmap — visual repaginado pra ficar mais legível (estilo DeepCharts): nova rampa de cor \"hot\" (teal dim = liquidez leve → ciano → amarelo → laranja → VERMELHO nas paredes fortes), então dá pra ver num olhar pra onde a liquidez se acumula. O campo agora PREENCHE (contraste/gamma suavizados) em vez de mostrar só linhas esparsas, e ganhou um fundo escuro atrás das velas pra as cores ressaltarem (as velas seguem nítidas por cima). Os ▲/▼ de consumo continuam como marcadores. Só frontend." },
  { version: "Beta 1.554", note: "DVL Deep Heatmap — troquei o motor da Fase 1 pelo MODELO COMPLETO e comprovado (base 1.354) que você mandou, adaptado à base atual: agora carrega as zonas de verdade. Já inclui a Fase 2: consumo CONFIRMADO (verde ▲ compra consumindo ASK / vermelho ▼ venda consumindo BID, correlacionando queda do book com aggTrades do lado agressor), retiradas (pull) opcionais em cinza, e Volume Bubbles próprias. Heatmap azul/ciano=liquidez parada, amarelo=forte, com cache offscreen. Feed combinado depth+aggTrade com failover Futures→Spot e multi-host REST; opcionalmente semeia histórico do backend. Ao ligar, suspende Bubbles/Bookmap antigos e restaura ao desligar. Pausa no Replay. Painel completo no padrão DVL. Registrado no menu de Indicators (OVERLAY). Só frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap — 2 correcoes: (1) o feed ficava travado em CONNECTING/RESYNC no Auto porque insistia no Futures (bloqueado no BR) e, se o snapshot REST falhava, entrava em loop na mesma fonte. Agora o Auto cai pro Spot de verdade: sem dados em 4s ou snapshot indisponivel numa fonte, avanca pra proxima; resync mantem a fonte que funciona (Spot) em vez de recomecar do Futures. (2) O HUD de status saiu de baixo (cobrindo os candles) pro CANTO SUPERIOR ESQUERDO do grafico. Teste: com Futures bloqueado, cai pro Spot e chega em LIVE SPOT com colunas amostradas. So frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap agora aparece de verdade no menu de Indicators. O menu visível é o categorizado (FAVORITES/OSCILLATORS/OVERLAY/VOLUME & FLOW) montado por um registro próprio — e o item DH estava sendo inserido no dropdown legado escondido. Registrei o 'DVL Deep Heatmap' nesse registro, na seção OVERLAY (ao lado do Bookmap), com switch ON/OFF real e abertura do painel. Ajustei o contrato da API do DH (on() como função, settings, openPanel) pra casar com o registro. So frontend." },
  { version: "Beta 1.554", note: "Deep Heatmap (DH) — reforço de registro no menu de Indicators: além do boot e do reintento periódico, o item 'DVL Deep Heatmap' agora é (re)inserido no exato momento em que você abre os Indicators, à prova de rebuild/timing do novo UI. Se não aparecia por conta de cache antigo, recarregar já resolve. (O item entra no topo da lista de Indicators.) Só frontend." },
  { version: "Beta 1.554", note: "DVL Deep Heatmap (Fase 1) — novo indicador nativo 'DH' na lista de Indicators: matriz preço×tempo do ORDER BOOK (Level 2) mostrando a liquidez resting — azul/ciano = normal, amarelo = concentração forte (percentil superior). Alimentado pelo feed @depth via WebSocket do navegador (tenta Binance Futures e cai pro Spot) + snapshot REST com resync automático em caso de gap de sequência. Camada de FUNDO (atrás das velas), presa a preço/tempo (acompanha zoom/pan). HUD de status (OFF/CONNECTING/SYNC/LIVE/RESYNC/PAUSED REPLAY/ERROR). Painel com Source, History, Sample, Price span, contrastes, opacidade e cell size (padrão DVL, sem dropdown nativo). Ao ligar, suspende o Bookmap antigo; ao desligar, restaura. Pausa no Replay; limpa socket/timers na troca de ativo e no OFF. 100% leitura. PRÓXIMA FASE: consumo confirmado (▲ compra→ASK / ▼ venda→BID por correlação com aggTrades), bubbles e pulls. Só frontend." },
  { version: "Beta 1.554", note: "Painel de performance (FPS/jank/draw/heap) agora liga/desliga APENAS por um botão nas Configurações do gráfico (⚙️ → 'Propriedades'). Removi os gestos antigos que o abriam sem querer — P×3 no desktop e 3 toques com 2 dedos no mobile — que disparavam durante o uso/arraste e atrapalhavam. O estado continua salvo por aparelho; ?perf=1/0 na URL ainda força. Só frontend." },
  { version: "Beta 1.554", note: "Fix — botão Salvar dava 'Erro ao salvar'. Causa: o snapshot do perfil copiava TODAS as chaves 'DVL...' do localStorage, incluindo o PRÓPRIO snapshot anterior — então cada save embutia o snapshot antigo dentro do novo e o tamanho ~dobrava a cada vez, até estourar a cota do navegador (QuotaExceeded) e o save falhar. Agora o save exclui as chaves de snapshot/backup (DVL_USER_PROFILE_SNAPSHOT/LAST_SAVE/DRAWINGS_BACKUP), libera o snapshot antigo antes de gravar o novo e, se ainda faltar espaço, grava um snapshot 'lite' (sem o blob de localStorage) — mantendo drawings/chart/versão e nunca falhando. Só frontend." },
  { version: "Beta 1.554", note: "Risk Express — 2 correções: (1) as linhas/labels do Risk (Entry/SL/TP) agora têm PRIORIDADE máxima no gráfico — passaram a ser desenhadas por último, então nunca mais ficam cobertas por MAX PAIN, FLIP, Volume Profile, GEX etc. (2) o arraste do painel voltou a funcionar: a alça (⠿) estava sendo bloqueada por um stopPropagation em fase de captura na própria toolbar (matava o pointerdown da alça antes dele chegar); agora a alça é isenta e o arraste do painel funciona no toque e no mouse. Só UI." },
  { version: "Beta 1.554", note: "Risk Express — agora dá pra OCULTAR o painel deixando só as linhas no gráfico, e o painel virou ARRASTÁVEL. Botão '⌄ ocultar' na toolbar esconde o painel mantendo Entry/SL/TP no gráfico (as linhas continuam vivas e arrastáveis); o botão flutuante 🛡 ganha um pontinho âmbar quando o painel está oculto e um toque nele traz o painel de volta (outro toque oculta de novo). '✕ fechar' continua desligando tudo. A toolbar ganhou uma alça (⠿) à esquerda pra arrastar e reposicionar onde quiser — a posição fica salva. Só ajuste de UI; cálculo, drag das linhas e sincronização com o painel completo inalterados." },
  { version: "Beta 1.554", note: "Risk Express — proporção no mobile ajustada: as linhas e labels do Entry/SL/TP estavam exageradas e se sobrepondo no celular. Reduzi as fontes (LOT de 18→12px no mobile, valores NET de 14→10px), afinei as linhas (entry 3,4→2px, SL/TP 3→1,5px), diminuí o padding/raio das caixas e juntei o preço do TP com o R:R numa linha só (caixa do TP passou de 3 pra 2 linhas). Agora os labels ficam compactos e não cobrem os candles nem a escala de preço. Só ajuste visual — cálculo, drag e sincronização com o painel inalterados." },
  { version: "Beta 1.554", note: "Risk Management Express — botão flutuante (🛡) no gráfico que, com um toque, plota Entry/SL/TP no ativo atual e mostra o LOTE líquido GRANDE na própria linha Entry, já com comissão, buffer, teto de notional e Net R:R. As três linhas continuam arrastáveis e recalculam lote/risco/comissões/TP líquido em tempo real. NÃO recria cálculo: chama a MESMA API do Risk Engine (1.355) que alimenta o painel completo — os valores são idênticos nos dois. Labels repaginados (maiores, com caixa de alto contraste): ENTRY|LOT|RISCO, SL|−$ NET, TP|+$ NET|1:1, e badges CAP/CUSTO ALTO/TP MANUAL/AJUSTE SL. Mini-toolbar compacta: BUY/SELL, chips de risco ($100/$250/$500/0,5%/1%), Net R:R ±, TP Auto/Manual, Copiar lote (toque no lote copia só o número), Reset e Fechar. Botão arrastável e com posição persistida; pressão longa abre o painel completo. Só planejamento/cópia — nunca envia ordem. Cenário de referência do spec valida lote 2.740 e risco líquido US$315,90. Replay Pro e demais módulos intactos. Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine — modo 'Net R:R (fees included)'. O TP automático deixou de ser 1:1 BRUTO (que a comissão da CFT depois comia) e passou a ser 1:1 LÍQUIDO: o alvo já embute a comissão de entrada e saída (0,0325%/lado) + buffer de execução, então um 1:1 vira 1:1 financeiro de verdade. Novidades: teto de NOTIONAL (padrão $175.000) que limita o lote com o badge NOTIONAL CAPPED; badges de status (RISK BASED / NOTIONAL CAPPED / LOT CAPPED / COST HIGH / INVALID); eficiência de custo (verde ≤20%, amarelo ≤25%, vermelho >25%); TP bruto vs TP líquido lado a lado; buffer de execução e Net R:R alvo editáveis. Preset data-driven 'CFT Break 50K — BTC MT5/Match' (registro central DVL_PROP_RISK_PRESETS: risco $300, net R:R 1, notional máx $175k, buffer $0). O lote continua arredondado SEMPRE para baixo e nunca ultrapassa o notional. O modo antigo (bruto/priceOnly) segue disponível. Replay Pro, scanner e demais módulos intactos. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — motor de MESCLA de aglomerados. Quando muitas bolhas caíam na mesma região (mesmo preço + tempo), elas se sobrepunham e viravam um borrão ilegível. Agora um motor agrupa as bolhas que ficariam coladas numa só, SOMANDO o fluxo real (compra/venda, volume e nº de execuções) — o que faz sentido: uma rajada de prints no mesmo nível já é um único evento de agressão/absorção. É greedy ancorado no MAIOR print da região e acelerado por grade de pixels (barato e estável no pan/zoom). A bolha mesclada ganha um halo fininho concêntrico pra indicar que é um cluster, e o tooltip mostra o fluxo somado. Dois controles novos no painel: 'Mesclar aglomerados' (liga/desliga) e 'Força da mescla' (o quão perto elas precisam estar pra juntar). Ligado por padrão. Só frontend." },
  { version: "Beta 1.554", note: "Fix — a notificação de 'salvo' (toast) aparecia ATRÁS da barra de timeline do Replay. O toast tinha z-index 40 e a barra 45, então a barra cobria o aviso quando os dois se sobrepunham embaixo. Subi o z-index do toast pra ficar acima da barra de timeline (e também acima dos painéis de config), então a notificação fica sempre visível. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — visual repaginado (estilo Tape Aggression): bolhas com tracinhos de preço (rastros) e agora SOBREPOSTAS aos candles em vez de atrás deles — o hook de desenho passou a rodar DEPOIS do render dos corpos/pavios das velas, então as bolhas ficam sempre visíveis por cima. O painel de ajustes ganhou controles numéricos '− valor +' (mais fáceis no mobile) pros parâmetros de sensibilidade/tamanho/rastro. Consome o mesmo histórico de aggTrades reais do backend (1.351). Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — histórico agora usa aggTrades REAIS da Binance Futures (backend). A janela recente (~20 min) é agregada no servidor a partir dos negócios crus reais: bucket de tempo + faixa de preço por tickSize, lado agressor correto (comprador/vendedor via flag maker), dedup por aggId e contagem de execuções — contrato normalizado. O histórico mais antigo continua por klines de 1s (barato) pra cobrir até 2h sem puxar milhões de trades. O overlay abre populado com dados reais e segue no feed ao vivo por cima (sem duplicar). O endpoint aceita bucketMs e priceBucketTicks. Backend (bubbleHistory.js) — sem mudança de comportamento no frontend. (Escopo do live via WebSocket same-origin fica pra um passo futuro; o live atual continua via aggTrade do navegador.)" },
  { version: "Beta 1.554", note: "Hollow Candles — candles de VENDA agora também ficam ocos (hollow), igual aos de compra. Antes só o candle comprador ficava vazado; o vendedor era sólido. Agora ambos mostram o corpo vazio com a borda na cor direcional (verde compra / vermelho venda) e pavios na cor direcional. Dojis/corpos minúsculos mantêm ao menos uma borda visível. Modos Normal e Footprint inalterados; cores customizadas preservadas. Só frontend." },
  { version: "Beta 1.554", note: "DVL GEX Levels — o badge de regime agora mostra o VALOR do Net GEX com sinal (ex.: 'G+ · REJEIÇÃO · +34.7M' ou 'G− · EXPANSÃO · −12.3M'), formatado em K/M/B. Só frontend." },
  { version: "Beta 1.554", note: "DVL GEX Levels — integração backend same-origin. O overlay agora busca os níveis (Flip · Max Pain · faixa 1D · Net GEX) por uma rota do próprio DVL (/api/dvl/gex-levels?asset=BTC|ETH|SOL) que faz o proxy server-side pro GEX Monitor, normaliza a resposta (contrato estável com stale/availability), usa cache por ativo e nunca expõe chave no cliente. Prioridade: (1) backend do DVL → (2) API direta (fallback) → (3) valores manuais. Sem CORS, sem reload, stale-while-revalidate. Além disso, os fundos do Theme Studio foram reencodados de PNG (36MB) para WebP (1,6MB) — mesmas imagens, arquivo ~5MB (era 39MB) pra não sobrecarregar o servidor. Nenhum outro módulo alterado. Backend: novo src/gexLevels.js + rota no server.js." },
  { version: "Beta 1.554", note: "Novo overlay DVL GEX Levels com Flip, Max Pain, 1D Max e 1D Min, regime visual, zonas acima/abaixo do Flip, atualização automática pelos endpoints públicos do GEX Monitor e valores manuais como fallback. Fixed Range VP ganha âncora explícita no candle inicial/final; o padrão passa a ser Candle inicial e o preset Daily fica preso ao primeiro candle da janela 00:00→00:00 do timezone escolhido, em vez de desenhar o corpo no último candle da sessão. Rows Layout, RSI, Replay e cálculos de VP permanecem intactos." },
  { version: "Beta 1.554", note: "Ticks Per Row mantém a precisão real por tick no cálculo de VP e Fixed Range, mas a densidade visual passa a ser normalizada automaticamente pela quantidade de linhas do modo Number of Rows. Buckets muito finos são agrupados somente no render, preservando POC/VAH/VAL/LVNs e preços exatos enquanto o corpo do profile continua legível e proporcional. Os dois botões de escala/configuração do canto inferior direito foram movidos para cima da timeline com clearance dinâmico. Replay, RSI e motores de sessão/âncora não foram alterados." },
  { version: "Beta 1.554", note: "Volume Profile principal e Fixed Range VP recebem Rows Layout completo: Number of Rows preserva o comportamento atual; Ticks Per Row cria buckets por múltiplos inteiros do tick real da Binance, com Row Size configurável e alinhamento dos preços à grade do ativo. A métrica é aplicada também aos profiles auxiliares do VP (Previous Week, Developing, Overnight e Previous Day) e a todos os profiles repetidos do Fixed Range, incluindo Delta, POC/VAH/VAL e LVNs. Inputs centrais dos dois painéis aceitam digitação direta mantendo o visual − / valor / +. Fixed Range continua ancorado ao candle exato da Beta 1.554; Replay, RSI e demais módulos não foram alterados." },

  { version: "Beta 1.554", note: "Fixed Range VP ancorado diretamente aos candles globais do gráfico. O início e o fim de cada sessão deixam de usar interpolação temporal/fracionária e passam a resolver índices inteiros dos candles reais: primeiro candle da sessão e último candle pertencente ao range. Durante zoom in/out ou pan, o mesmo índice global é convertido pelo mesmo x() usado pelas velas, mantendo Profile, Delta e origem das linhas presos ao candle exato. A geometria relativa da Beta 1.554, os cálculos, sessões, LVNs, Overnight, RSI, VP principal e Replay foram preservados." },
  { version: "Beta 1.554", note: "Fixed Range VP corrigido para permanecer preso à largura temporal real de cada sessão. A geometria de Profile e Delta volta a ser calculada como porcentagem do span da própria sessão, em vez de largura fixa em pixels. Ao afastar ou aproximar o zoom, o bloco transforma junto com os candles, permanece dentro do range correspondente e não atravessa sessões nem se desloca para a borda. POC/VAH/VAL, Overnight, LVNs, snapshots e ancoragem temporal da Beta 1.554 foram preservados. Nenhum código de RSI, VP principal, Replay ou demais indicadores foi alterado." },
  { version: "Beta 1.554", note: "Fixed Range VP isolado do zoom: o profile atual deixa de usar tanto Date.now fracionário quanto o fim futuro oficial da sessão como posição visual. A âncora passa a ser o fechamento do último candle realmente disponível dentro da sessão, quantizado pelo intervalo baixado; históricos continuam presos ao fim real. Durante pan/zoom o módulo reutiliza integralmente o último snapshot estável de profiles, POC/VAH/VAL, Delta, LVNs e âncoras, impedindo recálculo ou troca de pacote no meio do gesto. Ao soltar, uma única atualização final aplica dados novos. Nenhum código de RSI, VP principal, Replay ou demais indicadores foi alterado." },
  { version: "Beta 1.554", note: "Fixed Range VP corrigido na raiz: o estado do indicador passa a usar uma chave isolada v2, impedindo que configurações gravadas por um HTML contaminem versões antigas e desloquem sessões/horários. A chave v1 antiga é limpa uma única vez para que builds anteriores também voltem aos padrões. O profile atual deixa de ancorar o corpo em effectiveEnd/Date.now e passa a usar o fim fixo da sessão; somente os dados continuam evoluindo até o momento atual. Assim, colunas, Delta e origem das linhas não caminham horizontalmente enquanto a sessão está aberta. Nenhum cálculo de RSI, VP principal, Replay ou demais indicadores foi alterado." },
  { version: "Beta 1.554", note: "Reconstruída diretamente sobre a Beta 1.554 estável para garantir que o Fixed Range VP permaneça byte a byte igual ao motor anterior. O RSI Exhaustion Pro preserva a Escada de Estágios TOP/FUNDO da Beta 1.554 — faixas, hachuras, badges, trilho lateral e espessura progressiva — mas remove completamente neon, glow e sombras do canvas. A linha usa apenas um stroke por segmento e as hachuras são suspensas durante pan/zoom, reduzindo o custo gráfico sem perder a leitura quando o gráfico está parado. Nenhum cálculo ou configuração do Fixed Range VP, VP principal, Replay ou outros indicadores foi alterado." },
  { version: "Beta 1.554", note: "Correção real do render tonal do DVL RSI Exhaustion Pro. A Beta 1.554 calculava as novas tonalidades, mas o render principal sobrescrevia qualquer valor acima da zona superior com a mesma cor vermelha e qualquer valor abaixo da zona inferior com a mesma cor verde; por isso visualmente parecia não mudar. Agora cada segmento usa o valor extremo real: acima de 100 progride de vermelho para magenta, abaixo de 0 de verde para ciano, com espessura, glow, faixas, linhas de nível, marcadores e escala lateral variando pela profundidade do excesso. Backgrounds de 12 imagens e rotação de 5 minutos permanecem intactos. Replay Pro e demais motores não foram alterados." },
  { version: "Beta 1.554", note: "RSI Exhaustion Pro agora comunica visualmente a profundidade dos extremos: acima de 100, cada novo nível muda progressivamente do vermelho para magenta neon; abaixo de 0, do verde para ciano neon. A intensidade também aumenta por nível através de glow, opacidade, espessura da linha, marcador atual e faixas graduadas, facilitando distinguir 125 de 175/200 e −25 de −75/−100. Theme Studio atualizado para o novo pacote de 12 backgrounds enviado pelo usuário, removendo os quatro fundos antigos da rotação; troca automática sincronizada a cada 5 minutos, com crossfade e preload. Replay Pro e demais motores permanecem intactos." },
  { version: "Beta 1.554", note: "DVL RSI Exhaustion Pro rompe a barreira clássica de 0–100 sem trocar a base do indicador. O RSI normal continua sendo o centro, mas a pressão multi-TF — especialmente quando ponderada pelos níveis N1–N10 do ARION — pode avançar para níveis positivos acima de 100 e negativos abaixo de 0. Nova Escala Pro adaptativa (ON por padrão), Extensão além de 0/100 e Passo dos níveis; linhas graduadas e zonas progressivas mostram 100, 125, 150… e 0, −25, −50… conforme a força real exige. O auto-fit mantém 0–100 visível e expande somente quando há excesso, evitando comprimir a leitura normal. Replay Pro, VP, Fixed Range, Smart Delta e demais módulos permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Smart Delta ganha magnitude visual real relativa sem perder sua inteligência proprietária: a direção, Confidence, Continuation, Exhaustion, alertas e classificação continuam usando o score original, enquanto a altura do histograma passa a combinar o delta bruto/estimado do candle relativo a uma referência EMA anterior com a qualidade/confluência do Smart Delta. Isso evita colunas quase iguais e deixa spikes realmente grandes visualmente maiores. Novos controles Magnitude real, Janela magnitude e Peso inteligência; o modo novo vem ON por padrão e pode ser desligado para restaurar a escala antiga. Volume Profile, Fixed Range VP, Replay Pro e demais indicadores permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Volume Profile principal estabilizado contra zoom e pan: o cálculo deixa de usar os limites variáveis da escala visível e passa a usar somente o range real dos candles do próprio profile. No modo Range Visível, uma âncora fixa preserva exatamente o mesmo conjunto de candles durante movimentos de câmera; novo toggle Travar ao zoom/pan vem ON por padrão e o botão Reancorar no range atual permite escolher outra janela conscientemente. POC/VAH/VAL e colunas não recalculam nem respiram após soltar o zoom. Fixed Range VP, Replay Pro e demais indicadores permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "RSI Exhaustion ganha seleção individual dos níveis ARION N1–N10: é possível usar todos os níveis ou ligar apenas níveis específicos, como somente N5. Níveis desligados deixam de contribuir para a exaustão. A ponderação foi reforçada para aplicar de fato o multiplicador do nível antes do Push, com proteção final contra saturação extrema; o efeito deixa de ser apenas sutil. O toggle principal continua OFF por padrão e todos os níveis vêm selecionados quando ativado. Inputs numéricos editáveis permanecem como padrão. Replay Pro e demais módulos permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Inputs numéricos do RSI Exhaustion deixam de depender apenas dos botões +/−: o valor central mantém o mesmo formato visual, mas agora pode receber foco e ser digitado diretamente, com Enter para confirmar, Esc para cancelar, validação automática de mínimo/máximo e suporte a vírgula decimal. O mesmo padrão foi aplicado aos parâmetros do RSI dentro dos filtros do Scanner. O limite de Volume MA do RSI foi ampliado de 200/100 para 5000 em todas as rotas relacionadas. Replay Pro e demais módulos permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Theme Studio simplificado: removido o pacote de 6 fundos cristãos e mantidos somente os 4 cenários originais (Montanhas, Cidade noturna, Floresta e Vale/Lago), agora disponíveis em rotação automática sincronizada a cada 10 minutos, com migração do antigo modo Cristãos Auto. DVL Exhaustion RSI recebe o toggle experimental ‘Peso ARION por nível’, desligado por padrão: quando ligado, cada spike dos timeframes menores é classificado pelos multiplicadores N1–N10 configurados no ARION e sua contribuição de exaustão é multiplicada pelo nível antes da composição multi-TF. Replay Pro e demais indicadores permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Hotfix estável do DVL FVG Magnet IFVG construído diretamente sobre a Beta 1.554, descartando integralmente a implementação de histórico da Beta 1.554 que causou conflitos no sistema de indicadores. Adicionado apenas o input opcional ‘Usar cada FVG uma única vez’: desligado preserva o comportamento original; ligado faz o primeiro IFVG compatível consumir o FVG-alvo e impede reutilizações posteriores enquanto esse FVG permanecer aberto. Menus, limite de osciladores, demais indicadores e Replay Pro permanecem inalterados. Só frontend." },
  { version: "Beta 1.554", note: "Novo indicador DVL FVG Magnet IFVG: usa um FVG não preenchido de timeframe superior como alvo/magnet e procura um IFVG no timeframe inferior na direção desse alvo. Padrão operacional 15m → 1m, com seleção automática ou manual de alvo acima/abaixo, filtro de gap por ATR, idade máxima do gatilho e validação mínima de R:R. Desenha zona alvo, zona IFVG, Entry, SL, TP, direção e status do setup; dados Binance com cache e suporte ao Replay quando o gráfico está no timeframe de entrada. Toggle, painel compacto, persistência, Reset no cabeçalho e integração aos menus DVL. Replay Pro permanece travado. Só frontend." },
  { version: "Beta 1.554", note: "ARION Zone Profile MTF refinado: qualquer âncora de sessão mantém o Profile à frente da janela pela mesma distância configurável do modo Preço atual. Na sessão atual, a origem visual usa o término efetivo até o candle corrente, evitando que o Profile seja lançado para o fechamento futuro da sessão; sessões anteriores usam o fechamento real mais a mesma distância. Adicionadas âncoras 1H, 4H e 1 Semana, todas com opções Atual/Anterior e integração completa ao cálculo do Profile, POC e regiões fortes. Replay Pro permanece travado. Só frontend." },
  { version: "Beta 1.554", note: "ARION Zone Profile MTF recebe ancoragem por sessão. O Zone Profile pode continuar no preço atual ou ser calculado e preso ao fim da sessão Daily, Ásia, Londres, Nova York ou Overnight, com escolha entre sessão atual e anterior. Quando uma sessão é escolhida, somente as zonas pertencentes àquela janela entram no Profile, POC e regiões fortes; a posição usa timestamp real e não é empurrada para o fim da tela. Replay Pro e demais módulos permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Novo indicador ARION Zone Profile MTF integrado ao protocolo DVL: toggle persistente, painel compacto com Reset no cabeçalho, chips customizados de timeframe/tipo/seleção, níveis N1–N10, cores, zonas, Zone Profile, POC e regiões fortes projetadas. O indicador cria um oscilador de volume do timeframe do gráfico com média e linhas N1–N5, colore barras/candles por nível e usa timeframe independente para as zonas, com dados reais Binance e fallback agregado. Adicionado ao registry de osciladores, limite de 3, menu moderno e lista legada. Replay Pro permanece travado. Só frontend." },
  { version: "Beta 1.554", note: "Correção estrutural fora do Replay: timeline passa a viver em um canvas permanente dentro do chartWrap, acima do gráfico e abaixo dos controles, sem condições de hide, timers ou dependência do ciclo de pintura do canvas principal; permanece visível no PC/mobile durante pan, zoom, loading e movimentos bruscos. Fixed Range VP travado à sessão: timestamps são convertidos pelo índice global contínuo do gráfico e a largura visual de Profile/Delta deixa de variar com o zoom, mantendo o bloco ancorado no início/fim real da sessão sem respirar ou deslizar. Replay Pro Beta 1.554 preservado integralmente. Só frontend." },
  { version: "Beta 1.554", note: "Timeline unificada no desktop e mobile, mantendo o Replay Pro da Beta 1.554 integralmente travado. Corrigida a condição em que apenas o DVL Volume overlay estava ativo: como ele não pertence ao registry de osciladores, a timeline persistente da Beta 1.554 não era chamada no PC e sobrava a escala antiga baseada em candles locais. Agora a escala global é desenhada sempre, com ou sem painel inferior, e a rotina antiga foi removida para impedir duplicidade e desaparecimento em espaço vazio/futuro. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro da Beta 1.554 permanece integralmente travado. Corrigido o desaparecimento real dos horários da timeline durante pan brusco: a escala deixa de procurar candles apenas em posições fixas da janela — condição que podia produzir zero labels — e passa a calcular o tempo diretamente pelo índice global contínuo, interpolando entre candles e extrapolando espaços vazios/futuros pelo timeframe. A timeline mantém cache do último conjunto válido e agora é desenhada depois de crosshair e todas as demais camadas do canvas. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro da Beta 1.554 preservado e travado sem alterações. Timeline inferior corrigida na raiz: deixa de depender do canvas DOM flutuante, timers e estado transitório do registry de osciladores, passando a ser desenhada como última camada do próprio canvas principal nos 20px já reservados abaixo do volume. Pan, zoom, refresh e reconstruções do painel não conseguem mais esconder a escala; removida a camada duplicada externa. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro isolado completamente do mercado ao vivo: fast poll, recuperação automática de feed, cola da vela em formação, WebSocket agregado de timeframes não nativos e respostas assíncronas de loadAll passam a ignorar/abortar qualquer atualização enquanto o Replay estiver ativo. Isso elimina os repiques em que o preço atual contaminava momentaneamente o último candle histórico e depois voltava. O avanço candle a candle e a câmera livre foram preservados. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro corrigido para interação real em touch: removida a execução dupla causada pelo pointerup seguido do click sintético do Android, que fazia Play virar Pause instantaneamente e anterior/próximo avançarem duas vezes. Cada comando agora executa exatamente uma vez no pointerup; teclado usa keydown próprio. Play no fim reinicia automaticamente do início selecionado e volta a reproduzir. Barra mobile reorganizada em duas linhas compactas para não cortar o botão de saída, com estados pressionado/desabilitado claros. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro corrigido na raiz do clique atravessando: cada pointer iniciado dentro da barra, botões, timeline, menu, alça ou diálogo recebe um lock por pointerId no próprio motor do gráfico; pan, pinch e crosshair ignoram esse ponteiro até o pointerup/cancel. Os comandos deixam de depender do click sintético e passam a confirmar no pointerup, eliminando falhas no desktop e Android. Barra reproporcionada e responsiva, sem forçar largura excessiva; estado fechado volta a ficar realmente oculto. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro refinado visualmente e no bloqueio de eventos: a barra inferior recebe proporções melhores (botões maiores, alturas consistentes, espaçamento limpo, velocidade e relógio mais legíveis) e passa a capturar os eventos com prioridade real para impedir qualquer clique ou toque atravessando para o gráfico. Botões, menu de velocidade e timeline do Replay agora usam bloqueio dedicado de pointer/click/touch, evitando pan e crosshair acidental. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro desacoplado da câmera: Play, ticks, Pause, passos, seek e reinício deixam de reancorar ou centralizar o gráfico. O motor preserva o índice absoluto visível antes de trocar entre histórico completo e candles revelados, permitindo pan/zoom livre durante a reprodução sem retorno forçado ao preço atual. Timeline inferior reconstruída como camada fixa única fora do canvas principal, com posição sincronizada ao chartWrap, z-index estável abaixo do Replay e acima do gráfico, atraso anti-flicker para estados transitórios e remoção do desenho duplicado que causava piscadas/sumiços sob o painel de volume. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro recebe confirmação transacional na própria linha: botões ✓ e ✕ ficam anexados à alça vertical. Ao iniciar um drag, a posição anterior é preservada; ✓ confirma o novo candle inicial e ✕ restaura exatamente a posição anterior. Play confirma automaticamente uma alteração pendente. Corrigido também o atravessamento dos comandos: Replay Bar, alça, botões da linha, menu de velocidade e diálogo passam a possuir o gesto antes do motor do gráfico, impedindo pan/crosshair e garantindo que os cliques executem seus comandos no mobile e desktop. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro com drag exclusivo e timeline real: ao tocar na linha vertical, o motor principal do gráfico reconhece a área do Replay antes de iniciar pan/crosshair, zera qualquer gesto concorrente e bloqueia o movimento do gráfico durante todo o arraste. A seleção do candle deixa de executar o refresh completo a cada pixel e passa a atualizar apenas cursor/linha em RAF, melhorando muito a fluidez no mobile e no PC. Adicionada timeline DOM dedicada de 20px abaixo do último oscilador/volume, sempre acima do rodapé e sem ser coberta pela barra do Replay. Só frontend." },
  { version: "Beta 1.554", note: "Replay Pro: corrigido o arraste da linha vertical de início no mobile e desktop. A área de toque foi ampliada, o pointer capture agora é feito na própria alça válida em vez do documentElement, e o drag continua mesmo quando o dedo sai da linha. Adicionado fallback touch com preventDefault, atualização do cursor limitada a um requestAnimationFrame e busca binária do candle, evitando travamento durante o arraste. Fora da linha, o gráfico continua panável normalmente. Só frontend." },
  { version: "Beta 1.554", note: "Patch de performance do DVL Volume: a Value Area 40% e os candles amarelos deixam de ser reavaliados a cada frame/candle desenhado e passam a usar cache por sessão e candle fechado, com verificação espaçada. As duas médias de volume agora são calculadas uma vez por estrutura de klines e recebem atualização incremental apenas no candle ao vivo; o render usa somente o trecho visível e remove alocações/spreads pesados por frame. O último resultado válido permanece disponível durante pan/zoom. A lógica visual e os critérios da Beta 1.554 permanecem idênticos. Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume reformulado: removido por completo o destaque Spike pós-flat do indicador e do candle renderer. A nova leitura usa a sessão configurada no Fixed Range VP, recalcula internamente uma Value Area fixa de 40% e destaca em amarelo somente candles fechados de volume alto cujo corpo/fechamento permanecem fora dessa área. Volume alto é comparado à maior das duas médias do DVL Volume, com multiplicador configurável. O histograma correspondente também recebe a mesma cor para manter ligação visual. Scanner e demais motores de spike permanecem intactos; apenas o DVL Volume foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Linha do tempo restaurada na base do gráfico quando há osciladores: a escala temporal deixa de ocupar a faixa entre o preço e o primeiro painel inferior e passa a ficar abaixo do último oscilador, imediatamente antes do rodapé. O canvas reserva 20px reais para a timeline, desenha divisória superior e horários/datas sincronizados com o mesmo pan/zoom do gráfico. Volume e demais painéis não cobrem mais a escala de tempo. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP refinado visualmente: todos os nomes das linhas ficam sempre na parte superior delas, reduzindo poluição visual quando várias linhas se aproximam. Isso vale para POC / VAH / VAL, ON POC / ON VAH / ON VAL e LVN UP / LVN DOWN. Nenhum cálculo de profiles, overnight, toggles ou extensão foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP: todas as linhas do Profile 1 atual passam a usar estilo sólido obrigatório, incluindo POC/VAH/VAL e ON POC/ON VAH/ON VAL, independentemente do estilo configurado para históricos. Profiles 2–5 que tiverem o toggle de extensão ligado recebem numeração nos títulos projetados até o presente: POC 2, VAH 2, VAL 2 e ON POC 2, seguindo a mesma regra até o Profile 5. Profile 1 permanece sem número. Nenhum cálculo ou extensão de LVN foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP limitado a no máximo 5 profiles. O profile atual é sempre o Profile 1 e continua projetando POC/VAH/VAL e ON POC/ON VAH/ON VAL até o presente. Quatro toggles independentes controlam Profiles 2, 3, 4 e 5: ON faz as linhas do profile histórico escolhido seguirem até o presente; OFF mantém o encerramento no início do profile seguinte. LVNs preservam sua extensão própria. Painel, persistência, reset, versão e changelog atualizados. Só frontend." },
  { version: "Beta 1.554", note: "Overnight refinado visualmente: ON POC / ON VAH / ON VAL deixam de usar um pequeno node roxo separado e passam a se projetar apenas até o node real do volume profile da sessão correspondente, ficando visualmente conectados ao profile em vez de flutuantes. Mantido o carregamento estável sem apagar o VP durante refresh; nenhum cálculo de overnight, delta, LVN ou das demais linhas foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP estabilizado: as linhas do Overnight deixam de parecer flutuantes e passam a nascer de pequenos nodes roxos proporcionais ao volume de ON POC / ON VAH / ON VAL, sem recriar um profile Overnight completo. O carregamento ao vivo agora usa stale-while-revalidate: durante atualização das klines, o último profile válido permanece desenhado, eliminando o desaparecimento/reaparecimento que causava flickering em pan, zoom e refresh. Adicionada margem de estabilidade na viewport; cálculos de VP, Delta, LVN e níveis permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP refinado nas linhas: POC, VAH, VAL, ON POC, ON VAH, ON VAL e LVNs agora nascem na ponta real do node correspondente, em vez de começarem de um ponto flutuante fixo. O corpo do profile continua ancorado à sessão, apenas a sessão atual projeta até a extrema direita e as sessões antigas seguem parando no início da seguinte. Nenhum cálculo do VP, overnight, delta ou LVN foi alterado; somente a origem visual das linhas e labels foi corrigida. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP refinado: apenas a sessão atual mantém POC/VAH/VAL e ON POC/ON VAH/ON VAL projetados até a extrema direita. Sessões antigas passam a estender suas linhas somente até o início da sessão mais nova seguinte, parando automaticamente quando surge um novo profile, sem avançar até o preço atual. Ajustado também o frontend para reduzir o piscar durante pan/zoom, com bounds mais estáveis na borda da viewport e desenho mais consistente do bloco fixo. Nenhum cálculo do profile, delta, LVN, overnight ou VP principal foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP com corpo realmente ancorado à sessão: as colunas Delta | Profile deixam de ser recortadas e reposicionadas na borda da viewport durante pan/zoom e permanecem na coordenada temporal em que foram calculadas. POC, VAH e VAL passam a se projetar somente para a frente até a extrema direita do gráfico, com seus títulos alinhados no fim de cada linha. ON POC / ON VAH / ON VAL seguem a mesma projeção a partir da abertura da sessão principal; LVNs preservam a regra própria de extensão. Nenhum cálculo, fundo automático, VP principal ou outro indicador foi alterado. Só frontend." },
  { version: "Beta 1.554", note: "Volume Profiles com colunas mais retas + Fundos Cristãos automáticos. O arredondamento do Volume Profile principal e do Fixed Range VP agora usa escala compacta 0–3, com migração única para 1px. O Theme Studio recebeu os 6 fundos cristãos em WebP embutido e o modo Cristãos Auto: troca sincronizada a cada 30 minutos nos marcos :00 e :30, crossfade real em duas camadas, próxima imagem pré-carregada, pausa com a aba oculta e retomada sincronizada, sem reload e sem alterar zoom, candles, drawings ou indicadores. Só frontend." },
  { version: "Beta 1.554", note: "Indicators cleanup: removidos da lista de indicadores Net Delta, Net Long, Net Short, Long/Short Ratio (LSR) e Open Interest. Os cinco osciladores também são desligados visualmente no boot caso tenham ficado salvos como ativos; seus motores internos permanecem disponíveis para módulos que dependem dos dados, como Smart Delta, sem ocupar a lista nem o painel do gráfico. Fixed Range VP, Delta | Profile, LVNs e demais indicadores permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP — Low Volume Nodes por sessão: adicionadas linhas LVN independentes para cada profile, com quantidade configurável por VP, labels LVN UP/LVN DOWN, classificação dinâmica em relação ao preço atual, cor azul para níveis acima e amarela para níveis abaixo, ambas personalizáveis. Novo modo de extensão permite prolongar apenas os profiles anteriores escolhidos — por exemplo, extensão 2 usa o penúltimo e o antepenúltimo, excluindo o profile atual — até o profile mais à direita. Estilo, espessura, opacidade, labels e quantidade de profiles estendidos seguem o painel compacto DVL. Delta | Profile, linhas roxas do Overnight e Volume Profile original permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP — Delta por sessão: novo toggle Delta dos profiles. Cada sessão passa a desenhar um bloco composto DELTA | PROFILE, com o Delta líquido à esquerda, divisor central e o Volume Profile normal de uma única cor à direita. Delta positivo usa a cor de compradores e Delta negativo usa a cor de vendedores, calculados pelo taker buy/sell volume das klines Binance com fallback estrutural quando indisponível. O Overnight deixa de desenhar profile/barras próprias e mantém somente ON POC / ON VAH / ON VAL, todas fixadas em roxo. Painel, persistência, reset, versão e registro do indicador atualizados; Volume Profile original permanece intacto. Só frontend." },
  { version: "Beta 1.554", note: "Fixed Range VP refinado: o Overnight de cada profile passa a usar exclusivamente a sessão oficial de New York (18:00 do dia anterior até 09:30, timezone America/New_York), independentemente do timezone do profile principal. Os horários manuais do Overnight foram removidos do painel para evitar configuração ambígua. Labels das linhas principais deixam de usar o prefixo FR e passam a mostrar somente POC / VAH / VAL; linhas do Overnight permanecem ON POC / ON VAH / ON VAL. Cálculo, cores, linhas, quantidade de profiles e Volume Profile original permanecem intactos. Só frontend." },
  { version: "Beta 1.554", note: "NOVO indicador separado Fixed Range VP: plota de 1 a 12 Volume Profiles repetidos por sessão escolhida (Daily, Weekly, Asia, London, New York, Overnight ou Custom), cada profile preso ao próprio intervalo e com UMA cor de barras. Personalização completa de POC/VAH/VAL, estilo/espessura, largura, opacidade, rows, Value Area, posição e labels. Overnight opcional por profile: calcula a janela anterior configurável e a desenha dentro da sessão correspondente, no lado oposto e com menor opacidade, incluindo linhas ON. Toggle, painel compacto DVL, persistência, reset no cabeçalho, registro moderno/clássico e cache independente do pan/zoom. Volume Profile original permanece intacto. Só frontend." },
  { version: "Beta 1.554", note: "Limpeza do Volume Profile: removidos por completo o Developing POC Trail e o DVL Volume Memory (painel, estado, persistência, cálculo e desenho). O Corner Radius das colunas foi preservado e movido para a seção Geral. Previous Week, Developing, Previous Day, Overnight e o perfil principal permanecem intactos. VPA/VP Arrival continua fora desta build. Só frontend." },
  { version: "Beta 1.554", note: "Volume Profile reorganizado em cima da build atual enviada pelo usuário: (1) o perfil principal mantém Range Visível + todas as variantes existentes; (2) a antiga Sessão 2 deixa de ter timeframe e vira Previous Week fixo — semana anterior fechada, com W-POC/W-VAH/W-VAL; (3) Previous Day e Overnight permanecem intactos; (4) Developing mantém suas variantes, mas é migrado uma vez para 1 Dia como padrão. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — (1) o botão do Replay saiu de cima do gráfico e foi pra dentro das CONFIGURAÇÕES do gráfico (⚙️): abra o ⚙️ e toque em 'DVL Replay Pro'. (2) O arraste da linha de início agora é CONTÍNUO de verdade — segurar, arrastar e soltar (usa pointer capture + trava o scroll do toque enquanto arrasta), em vez de precisar ficar clicando. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — arraste da linha de início agora captura o toque no DOCUMENT em fase de captura (acima de TODAS as camadas do gráfico), então segurar a linha e arrastar funciona mesmo com crosshair/desenhos/pan ativos. A alça no topo da linha ficou maior e mais visível (o ⇆). Fora da linha, o gráfico continua panável. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — conserta o arraste da linha de início que não pegava: as camadas do gráfico (crosshair/desenhos/pan) estavam capturando o toque antes. Agora tem uma alça invisível que fica ACIMA dessas camadas, exatamente sobre a linha, e acompanha ela. Você segura em cima da linha e arrasta; solta e ela fixa. Fora da alça, o gráfico continua panável normal. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — a linha de início agora fica FIXA no lugar e só se move quando você segura a própria linha e arrasta (antes ela seguia o mouse sem parar porque o 'soltar' não encerrava o arraste). Agora o arraste é solto em qualquer lugar da tela. E a linha virou CHEIA (sólida) em vez de pontilhada. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — seletor de início virou uma LINHA VERTICAL arrastável (substitui o clique). Ao ativar o Replay, aparece uma linha vertical marcando onde o replay vai começar, com o 'futuro' (à direita da linha) escurecido. Você arrasta a linha (pelo topo/perto dela) livremente pra escolher exatamente o ponto de início — o gráfico continua panável quando você segura longe da linha. A linha SOME quando dá Play e REAPARECE quando pausa, reinicia ou o replay chega ao fim. Removido o antigo botão '◎ Início'. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — seletor de início + marca d'água + saída sem popup nativo. (1) Botão '◎ Início' na barra: revela todo o histórico e você CLICA no gráfico pra escolher exatamente onde o replay começa (o candle escolhido vai pra borda direita e o resto vira o 'futuro' escondido). (2) Marca d'água 'replay' bem fosca no fundo do gráfico enquanto o modo está ativo. (3) Ao encerrar o Replay, agora aparece um diálogo do próprio DVL (Cancelar/Encerrar) em vez do popup nativo do navegador. Só frontend." },
  { version: "Beta 1.554", note: "DVL Replay Pro — ao ativar, MANTÉM o enquadramento atual (antes o gráfico pulava pra outro lugar/zoom). Agora o Replay começa no candle que está na borda direita do que você está vendo e re-ancora o scroll pra os mesmos candles ficarem exatamente na mesma posição e no mesmo zoom — sem pulo. O 'futuro' escondido passa a ser o que estava à direita da vela visível (role o gráfico pra trás antes de ativar pra ter mais candles pra reproduzir), e a timeline continua deixando escolher de onde começar. Só frontend." },
  { version: "Beta 1.554", note: "NOVO — DVL Replay Pro (Fase 1: Candle Replay, sem lookahead). Botão 'Replay' na hotbar do gráfico + barra de controle acima do rodapé. Reproduz o histórico no MESMO gráfico, revelando candle a candle: durante o Replay o array de candles é limitado ao cursor, então NENHUM indicador enxerga o futuro (VP, Bubbles, osciladores etc. só veem o histórico já revelado). Arquitetura definitiva já montada: relógio virtual central (window.DVLReplayClock) e barramento de mercado único (window.DVLMarketBus) com campo source=live|replay. Controles: ⟳ reiniciar, ◀ candle anterior, ▶ play/pause, ▶❘ próximo candle, velocidade 0,25x–25x (menu customizado), timeline arrastável e ✕ encerrar. Atalhos: Espaço=play/pause, →/←=próximo/anterior candle, R=reiniciar, Esc=encerrar. Ao encerrar, o feed ao vivo é reassinado e os dados frescos recarregados sem reload da página (o feed ao vivo fica pausado durante o Replay pra não contaminar o histórico). Próximas fases (por spec): Paper Trading dentro do Replay + diário, depois Intrabar/Full Market. Só frontend." },
  { version: "Beta 1.554", note: "Alertas VP — botão 'Descobrir chat id' (Telegram). Agora não precisa do @userinfobot: basta colar o token do bot, mandar /start pro seu bot e tocar em 'Descobrir chat id' — o backend lê o getUpdates do bot e preenche/salva o chat id sozinho. Novo endpoint /api/dvl/vpalerts/discover. Backend + frontend." },
  { version: "Beta 1.554", note: "NOVO — Alertas VP no Telegram (vigiados no backend, funcionam com o app FECHADO). Novo item 'Alertas VP' no menu de Indicadores. O servidor calcula o Volume Profile de 1m e dispara um alerta no seu Telegram quando o preço chega perto de QUALQUER linha, independente de qual seja: hoje (POC/VAH/VAL) e dia anterior/overnight (OPOC/OVAH/OVAL). Critério de proximidade: banda ADAPTATIVA ao ATR(14) do 1m (mercado agitado = banda maior; parado = aperta), com piso/teto em % do preço; dispara na ENTRADA da banda (não repete), com histerese pra re-armar e cooldown por linha. Sensibilidade (Baixa/Média/Alta) controla quão cedo avisa. Config no painel: liga/desliga, símbolo (botão 'usar atual'), token+chat id do Telegram (ficam só no servidor) com botão Testar, cooldown e quais grupos vigiar. Backend (novo vpAlerts.js + endpoints /api/dvl/vpalerts/*) + frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — 'Zonas horizontais' agora FUNCIONA. Antes o interruptor existia no painel mas não desenhava nada (era só um flag morto do spec). Agora, ao ligar, o indicador agrega o nocional dos grupos visíveis por faixa de preço (histograma de 40 níveis) e pinta BANDAS HORIZONTAIS nos níveis onde o fluxo mais se acumulou — cor pelo lado dominante (compra=ciano / venda=rosa) e opacidade pela força; níveis muito fortes ganham uma linha central. As bandas ficam ATRÁS das bolhas (não tapam), é um 'mapa de níveis de agressão' (onde o dinheiro grande atuou repetidamente). Barato: no máx. ~2500 grupos e 40 baldes por frame. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — bolhas PRESAS na região da vela + fim do sumiço ao mover o gráfico. (1) Cada bolha agora fica presa à faixa [mínima,máxima] da vela correspondente: o histórico spot pode ter base de preço diferente do mercado do gráfico e algumas bolhas 'flutuavam' fora da vela — agora o preço da bolha é limitado ao low/high daquela vela, ficando sempre na região do candle. (2) O corte de tamanho (threshold automático) passou a ser calculado sobre TODO o buffer em cache (~1,5s), não só sobre a janela visível: antes, ao mover/dar zoom, o percentil mudava e bolhas na borda piscavam (sumiam e voltavam). (3) Quando há bolhas demais para desenhar, mantém as MAIORES (seleção estável por tamanho) em vez das 'primeiras 600' (que mudavam conforme o pan). Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — HISTÓRICO de ~2h ao abrir (backend) + bolhas CENTRALIZADAS na vela. (1) Novo endpoint no backend /api/dvl/bubbles/history: o servidor busca klines de 1 SEGUNDO da Binance (spot) das últimas 2h e agrega cada segundo numa bolha (nocional comprador/vendedor via taker-buy volume) — leve (poucas chamadas, nada de milhões de trades crus) e feito no servidor (sem o bloqueio de região do navegador). Ao ligar o indicador (ou trocar de ativo), o gráfico já abre populado com ~2h de fluxo e segue ao vivo por cima. (2) As bolhas agora CENTRALIZAM na vela: várias bolhas na mesma vela alinham no centro dela (antes espalhavam pelo tempo dentro da vela e ficavam 'tortas'). Backend (reinicia o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — FEED PRÓPRIO com fallback pro SPOT (conserta o 'sem trades' no Brasil). O diagnóstico do usuário mostrou 'ligado, 0 trades': a Binance FUTUROS (fstream) é bloqueada em algumas regiões (Brasil), então o @aggTrade de futuros que o app usava nunca conectava e as bolhas ficavam sem fonte. Agora o indicador abre um WebSocket PRÓPRIO só quando ligado, tentando Binance futuros e caindo automaticamente pro Binance SPOT (stream.binance.com, acessível onde futuros é bloqueado) — com reconexão e troca por símbolo. Quando o feed próprio sobe, o fan-out do core é ignorado pra não contar trade em dobro; se o próprio não subir, o do core serve de fallback. A linha de status agora mostra a FONTE (futures/spot) e o debug() traz feedSrc/ownFeed. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — diagnóstico VISÍVEL no painel (sem console). A linha de status dentro do painel do indicador agora diz exatamente o que está acontecendo: 'ligado, mas SEM trades chegando' (feed @aggTrade da Binance não respondeu — rede/região pode bloquear a Binance), 'recebendo trades mas o gráfico não chamou o desenho', 'trades OK mas nada na faixa de preço visível' (role até o preço atual / diminua o filtro), ou 'desenhando N bolhas' quando está tudo certo — sempre com os números (trades recebidos, grupos, bolhas na tela). Assim dá pra ver a causa na hora, no celular, sem abrir console. Também corrigi o atalho: agora tanto DVL_BUBBLES.debug() quanto DVL_BUBBLES_API.debug() funcionam. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — validado ponta-a-ponta (as bolhas DESENHAM no gráfico) e diagnóstico mais fino. Teste offline com velas reais + trades injetados confirmou as bolhas renderizando ancoradas a preço+tempo sobre os candles (compra ciano / venda rosa), consistente em várias execuções. O window.DVL_BUBBLES.debug() agora também mostra drawnOnScreen (quantas bolhas de fato foram desenhadas no frame) e offX/offY (quantas caíram fora da área visível), pra fechar qualquer diagnóstico na hora. Só frontend." },
  { version: "Beta 1.554", note: "DVL Bubbles — conserta 'não aparece' e deixa o ligar à prova de erro. (1) Abrir as configurações do indicador agora JÁ LIGA as bolhas (o caso comum era abrir o painel mas não virar o interruptor no menu). (2) Novo interruptor ON/OFF e uma linha de STATUS ao vivo dentro do painel ('ligado · N trades · M bolhas na tela' / 'aguardando trades…'), pra ficar claro se está recebendo fluxo. (3) Filtro automático agora é ADAPTATIVO à janela visível (percentil calculado sobre os grupos que estão na tela, não sobre um buffer que ficava desatualizado) — some o caso em que o limiar automático escondia tudo. (4) window.DVL_BUBBLES.debug() no console mostra o diagnóstico (trades recebidos, grupos, chamadas de desenho, símbolo) se precisar investigar. Só frontend." },
  { version: "Beta 1.554", note: "NOVO indicador DVL BUBBLES — as bolhas de fluxo agora são um overlay NATIVO do gráfico (não um protótipo à parte). Registrado no menu Indicadores (ao lado do FVG Firewall), com três modos no mesmo módulo: BIG TRADES (bolhas de negócios agressivos acima do filtro — azul-ciano compra no Ask, rosa venda no Bid), VOLUME BUBBLES (Ask/Bid split, Delta ou Volume) e DEEP PROXY (círculo vazio/cheio, quadrado = absorção estimada, losango = batalha estimada — dados públicos, rotulado como ESTIMATIVA, não é MBO real). As bolhas ficam ancoradas a preço+tempo (acompanham pan, zoom, troca de TF e resize) desenhadas pela mesma função de overlay dos outros indicadores. Consome o feed @aggTrade que já existe (fan-out, sem abrir WebSocket novo). Agrupamento por lado+tempo+preço (auto/tempo/preço), filtro significativo automático (percentil P90/P96/P98,5 sobre janela móvel) ou manual em USDT, escala Linear/SQRT/Log com tamanho mín/máx e opacidade, tooltip por toque/hover (não bloqueia pan), cores por tokens do tema (--dvl-bubble-buy/sell/absorption/battle, seguem o Theme Studio). Performance: ring buffer de 5.000 trades, filtro por range visível, teto de bolhas por frame e cap de raio no mobile. Painel no padrão DVL com Restaurar. 100% leitura — não envia ordens. Só frontend." },
  { version: "Beta 1.554", note: "MARKET MATRIX opera MUITO mais. O bot era honesto mas lento: pulava TODO o histórico e só operava setups novos que resolvessem daqui pra frente — por isso ficava em 3 trades num ativo. Agora ele SEMEIA a partir da janela de teste OUT-OF-SAMPLE do modelo (os ~30% mais recentes das amostras — o mesmo conjunto validado que o card de backtest reporta) e depois segue AO VIVO pra frente. Combinado com operar todos os combos validados (1.274), a Matrix já começa cheia: patrimônio, retorno, acerto, drawdown, ranking por ativo e trades recentes de verdade, com taxa + slippage por ativo. Também aumentei a cobertura do universo (18 símbolos/ciclo em vez de 12) pra acumular mais rápido ao vivo. O estado antigo do bot é descartado (schema novo) e re-semeado. Continua 100% simulado — não é ordem real. Backend (reinicia o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "(1) CONFLUÊNCIA VP entre sessões no modelo — o otimizador agora testa exigir que a zona (VAL/VAH/POC) esteja ALINHADA em ≥2 ou 3 sessões (janela/hoje/véspera) ao mesmo tempo, como você pediu no spec. Isso deixa a entrada mais seletiva (tende a subir o acerto e baixar a variância, principalmente da compra). O combo aprendido mostra 'confl. N sessões' no card quando usa confluência. (2) MARKET MATRIX opera MAIS — antes o bot só entrava no ÚNICO melhor combo por TF/lado (poucos casamentos, 3 trades num ativo). Agora ele opera TODOS os combos que passam no teste out-of-sample (best + os demais que generalizam), por TF e lado, sem repetir o mesmo setup — mais atividade e mais ativos, mantendo a honestidade (todo combo foi validado fora da amostra). Backend (reinicia o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Lado COMPRA do modelo VP+RSI-V: diagnóstico + busca ampliada + status honesto. O card mostrava 'sem combo confiável' pra compra sem explicar; agora ele mostra o MELHOR CANDIDATO de cada lado com status claro (ex.: 'aguardando · melhor combo ainda PERDE out-of-sample no regime atual · teste −4,4% · acerto 47%') e a contagem de amostras por lado. O diagnóstico revelou o motivo real: NÃO falta amostra de compra (1m tem 10.161 amostras long vs 9.338 short) — é o regime: no período coletado, comprar no VAL/POC perdeu enquanto vender no VAH/POC rendeu (+7,7% no 1m, +29,1% no 5m). O modelo se recusa (corretamente) a operar um combo perdedor. Pra dar chance justa à compra quando o regime virar, ampliei a busca: stop mais justo (0.6×ATR) e RSI de sobrevenda mais forte (≤25) — assim um long seletivo de reversão aparece automaticamente assim que passar no teste out-of-sample. Backend (reinicia o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Cabeçalho, RODAPÉ e o resto do chrome agora seguem o tema. Achei duas causas de cores teimosas: (1) o CSSOM devolve as cores das REGRAS já em rgb(), então o override das folhas não casava com a lista (que era hex) — passei a derivar as triplas rgb de toda a lista; (2) MUITO do chrome do desktop (cabeçalho, rodapé, trilhos, dica do mouse) mora dentro de blocos @media, e o gerador de override só olhava as regras de nível raiz — agora ele RECORRE em @media/@supports. Também troquei a detecção por uma classificação algorítmica de PAPEL: além do verde→acento, fundos escuros (near-black, menos o preto puro pra manter sombras) viram o fundo/superfície do tema e cinzas/sages dessaturados viram o muted — preservando preto puro, vermelho/amarelo (quentes), ciano/azul e roxo. E a folha de override vai pro fim do <body> pra vencer os <style> internos do app. Resultado: header + footer + trilhos + dica do mouse acompanham Teal/Ocean/Carbon. Só frontend." },
  { version: "Beta 1.554", note: "Agora TODO verde do app acompanha o tema — não só os botões da lista. Antes o remapeador só reconhecia uma mão-cheia de tons de verde; o app usa DEZENAS (botões, glows, bordas, gradientes, chips). Troquei por uma DETECÇÃO ALGORÍTMICA: qualquer verde de destaque (onde o verde domina o vermelho e o azul) vira o acento do tema — verde forte/médio → acento, verde claro/pastel → acento claro (pra gradientes e brilhos não ficarem chapados). Ciano/azul, vermelho (venda), amarelo/laranja (alerta) e roxo continuam intactos, e o teste confirma: #10df77, #13dc8d, limão, esmeralda, teal-verde e verde escuro TODOS viram o acento; #00d4ff, #ff4a61, #ffd321 e #8b5cff ficam iguais. Vale pras regras CSS e pro style inline, e a re-varredura periódica pega verdes de botões criados na hora. Só frontend." },
  { version: "Beta 1.554", note: "Tema agora se aplica na INTERFACE TODA — botões, painéis, chips, bordas — não só no gráfico. Como as cores estão hardcoded em regras CSS e em style=\"\" inline (inclusive nos botões), adicionei um REMAPEADOR GLOBAL em runtime: ele reescreve só as famílias NEUTRAS + o ACENTO (fundo, superfície/painel, borda, texto, muted e o verde de destaque) tanto nas folhas CSS quanto no style inline de cada elemento. É IDEMPOTENTE e não-destrutivo: recolore a partir do estado atual (reconhece as cores de qualquer tema), então dá pra alternar à vontade e o app continua livre pra animar/mexer no inline sem ser revertido. Vermelho (venda), amarelo/laranja (alerta), roxo, ciano e as velas do gráfico NÃO são tocados (semântica preservada). Uma re-varredura leve periódica pega botões/painéis criados depois. Três paletas: DVL Teal (padrão), Ocean (azul-marinho) e Carbon (grafite). Além disso: as 4 FOTOS DE FUNDO que você mandou entraram (Montanhas, Cidade noturna, Floresta, Vale/Lago) — WebP embutido, aplicadas como uma camada cinematográfica em baixa opacidade por cima do app (o gráfico se limpa pintando o próprio fundo, então a foto entra como overlay suave — sem rastro), controlável no Theme Studio (opacidade/escurecimento/blur/saturação/contraste/posição). Só frontend." },
  { version: "Beta 1.554", note: "Theme Studio AGORA MUDA AS CORES DE VERDADE. Na 1.267/1.268 a troca de tema era quase invisível: o app não usa as variáveis CSS que eu re-apontava — as cores estão hardcoded, inclusive o FUNDO DO GRÁFICO, que é pintado no <canvas> por JS (fillStyle='#020806') e por isso CSS nenhum pegava. Correção: (1) um hook único no canvas troca SÓ os near-blacks de fundo conhecidos pela cor de fundo do tema — velas verde/vermelho, textos, acentos e zonas passam intactos (semântica preservada); (2) as variáveis agora usam os nomes REAIS que o app declara (--bg0/1/2, --card, --text, --muted, --dvl-desktop-surface/-border, --dvl-panel-line…), retintando header, trilhos e superfícies que são baseadas em variável; (3) uma folha de override força o fundo do body e a moldura do gráfico. Três paletas bem distintas: DVL Teal (padrão, igual a hoje), Ocean (azul-marinho) e Carbon (grafite neutro). O fundo do gráfico — a maior área da tela — muda claramente entre elas. Painéis profundos ainda seguem por fases. Só frontend." },
  { version: "Beta 1.554", note: "Theme Studio agora tem botão APLICAR. Antes o tema/fundo mudava e já salvava no clique; agora mexer nos controles (paleta, cenário, opacidade, escurecimento, blur, saturação, contraste, posição, ligar/desligar fundo) faz só uma PRÉ-VISUALIZAÇÃO ao vivo — você vê o resultado na hora, mas nada é salvo até clicar em 'Aplicar' no rodapé do painel. O botão fica aceso ('Aplicar') quando há alterações pendentes e vira 'Aplicado ✓' quando está tudo salvo. Fechar o painel (×) sem aplicar DESCARTA a pré-visualização e volta pro último estado aplicado. 'Restaurar padrão' (⟲) continua aplicando na hora. Só frontend." },
  { version: "Beta 1.554", note: "DVL THEME STUDIO (v1): sistema central de tema global + fundos. Novo painel 'Aparência' (botão 🎨 no cabeçalho, ao lado do ⚙) com 3 paletas — DVL Teal, Ocean e Carbon — que trocam o app INTEIRO de uma vez (fundo, painéis, textos, bordas, acentos) re-apontando as variáveis CSS que o app já usa, com !important, então nada fica na paleta antiga. Compra/venda, TP/SL e velas mantêm o significado (não recoloram). Camada de fundo cinematográfico atrás do gráfico com controles completos (ativar, cenário, opacidade, escurecimento, nitidez/blur, saturação, contraste, posição) + Restaurar no cabeçalho. Persiste por localStorage e aplica ANTES do primeiro paint (sem flash). As fotos reais (WebP) entram em DVL_THEME_BG_IMAGES quando você enviar; enquanto isso o fundo mostra um véu discreto na cor do tema. Migração das superfícies principais nesta v1; componentes profundos seguem por fases. Só frontend." },
  { version: "Beta 1.554", note: "Novo card ALERTAS no Copilot: histórico de todos os alertas disparados (recentes primeiro), com o TEMPO relativo em que foram gerados ('há 4h', 'há 10 min') e o TF quando o alerta é de um timeframe específico (ex.: 'TF 5m'). Um capturador global grava cada alerta (hoje os Smart Alerts do Smart Delta — threshold e confluência temporal) no aparelho, mesmo com o Copilot fechado, então nada se perde. Botão 'Limpar' pra zerar. Só frontend." },
  { version: "Beta 1.554", note: "Market Matrix no PC: conserta o 'zoom' ao abrir. O Scanner Pro no desktop escalava um canvas FIXO de 880px (transform:scale) dimensionado pela largura da JANELA e não do painel, então dava aquele zoom que depois reenquadrava. Como o Matrix é fluido, neutralizamos o scale + largura fixa e escondemos o cabeçalho de colunas do scanner antigo (o Matrix tem título próprio). Agora enquadra certo de primeira no PC e no mobile. Só frontend." },
  { version: "Beta 1.554", note: "Remove a seção 'DETECTADOS (24h)' que sobrava embaixo da tabela do Scanner — ela ainda rodava no motor antigo (client-side), então não faz sentido com o scanner virado Market Matrix. Escondida. Só frontend." },
  { version: "Beta 1.554", note: "MARKET MATRIX — a página do Scanner vira o placar do bot paper. Um bot 100% SIMULADO (nunca manda ordem real) opera o combo aprendido pelo modelo VP+RSI-V (vzin do RSI numa zona → alvo no POC, stop por ATR) nos TOP-50 ativos por liquidez, WALK-FORWARD: pula o histórico que o modelo treinou e só opera os setups NOVOS que resolvem daqui pra frente — cada trade já com TAXA + SLIPPAGE por ativo (alt fino escorrega mais). A tela mostra patrimônio ($1000 inicial), retorno, acerto, drawdown, custo médio, RANKING por ativo (quem mais deu lucro) e os trades recentes. Começa 'coletando' e vai enchendo conforme os setups resolvem. Backend (bot + endpoint /bot-state) + frontend. Reversível: window.DVL_SCANNER_PAUSED=false pra voltar o scanner antigo." },
  { version: "Beta 1.554", note: "Conserta o que a 1.261 não conseguiu aplicar: os scripts novos (card VP+RSI-V e o pause do scanner) tinham 'id' igual ao nome da variável de guarda, e no navegador um elemento com id vira uma global window[id] — então o 'if(window.X) return' saía na hora e o código nunca rodava. Renomeadas as guardas. Agora de fato: (1) o card 'Backtest financeiro' antigo (dvlCpBt1124) some; (2) o Scanner fica PAUSADO de verdade — o motor client-side (que lia a MEXC direto, por isso ainda mostrava ativos mesmo com o backend parado) é esvaziado e a página do Scanner mostra 'Scanner pausado — em breve, Market Matrix'; os cards do Copilot que dependiam do scanner ficam vazios; (3) o card do novo modelo VP+RSI-V passa a renderizar. Reversível: window.DVL_SCANNER_PAUSED=false. Só frontend." },
  { version: "Beta 1.554", note: "Limpeza pós-troca do ML: (1) escondido também o card 'Modelo pré-pump / pré-short' que tinha ficado no Copilot mostrando 'aguardando' — não existe mais modelo pré-pump, ele foi substituído pelo VP+RSI-V. (2) Scanner PAUSADO a pedido (vai ganhar outra função com o Market Matrix): a lista de ativos agora fica vazia. O backend ainda busca os candidatos (o modelo VP+RSI-V precisa da lista de símbolos) mas publica snapshots vazios; dá pra religar com DVL_SCAN_ENABLED=1. Só frontend + config do backend." },
  { version: "Beta 1.554", note: "NOVO Machine Learning (VP + RSI-V) substitui o ML antigo (pré-pump/pré-short). O modelo antigo foi REMOVIDO por inteiro do backend (train/tree/pumpModel/outcomes/analyze + todos os backtests do pump) e os cards 'Aprendizado (ML)' e 'Backtest financeiro' saíram do Copilot. O novo modelo aprende a SUA estratégia real: RSI vzinho (DVL Exhaustion RSI) numa zona de Volume Profile → alvo no POC, stop por ATR além da zona (VAL na compra, VAH na venda). É um otimizador adaptativo: registra cada setup real, resolve o resultado pela trajetória, e varre out-of-sample (treino/teste) qual SESSÃO de VP (dia anterior / hoje / janela), ZONA, proximidade, limiar do RSI, stop-ATR e alvo (POC vs ATR fixo) mais rende — separado por 1m e 5m e por lado (compra/venda). Novo card no Copilot mostra os combos aprendidos + o BACKTEST FINANCEIRO ($1000, risco 1%/trade, retorno, acerto, drawdown). Começa 'coletando' e vai ficando pronto conforme os setups resolvem ao vivo. O scanner segue rodando (vai ganhar outra função com o Market Matrix). Backend (reinicia o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Alertas de CONFLUÊNCIA TEMPORAL institucional (§13). Além dos Smart Alerts por limiar (|Delta|/Confidence/Exhaustion), agora dá pra ligar um alerta que dispara quando os módulos direcionais (Net Delta, Net Long, Net Short) estão alinhados no MESMO viés (compra ou venda) há pelo menos X minutos — usando o contexto temporal já rastreado (não recalcula). Novos controles na seção Smart Delta > Smart Alerts: 'Alerta confluência' (on/off), 'Módulos alinhados ≥' (2 ou 3) e 'Tempo mín (min)'. O aviso vem como toast + evento dvl:smart-delta-alert com a narrativa temporal (ex.: 'Confluência institucional de COMPRA · Net Delta acima há 12m · Net Long acima há 9m · …'). Dispara uma vez por episódio (não repete a cada candle enquanto a confluência persiste) e só rearma quando ela se desfaz. Só frontend." },
  { version: "Beta 1.554", note: "Contexto temporal institucional no Copilot (§13 do spec). O motor da tabela (DVL_SMART_DELTA_STATE) agora expõe getConfluence() e narrative(): a confluência de Net Delta/Net Long/Net Short/OI/LSR ordenada por HÁ MAIS TEMPO no estado, com viés compra/venda — sem recalcular nada. O Chat IA do Copilot passa a EXPLICAR essa ordem temporal: pergunte 'institucional', 'net delta', 'ordem temporal' ou toque no atalho 'Institucional' e ele responde algo como 'OI acima da média há 30m · LSR abaixo há 25m · Net Delta acima há 5m — viés institucional de compra', ajudando a ver se a confluência está nascendo, madura ou exausta. Mesmo bridge fica disponível pra Market Matrix/Alerts futuros. Só frontend." },
  { version: "Beta 1.554", note: "Tabela institucional do Smart Delta — modo de exibição e opacidade (§10 do spec). Novo seletor 'Exibição' na config: Auto (mobile mínima / PC completa, como estava), Detalhado (força a versão completa com palavra+valor+distância em qualquer tela), Compacto (força só setinha+tempo em qualquer tela) e Colapsado (só cabeçalho + rodapé Confidence/Continuation/Exh, sem linhas). Novo controle de Opacidade (0.4–1) pra tabela ficar mais translúcida e não tapar as velas. Usa uma chave nova (view) — quem já usava continua no Auto, sem regressão. Só frontend." },
  { version: "Beta 1.554", note: "Config da tabela institucional do Smart Delta: nova seção 'Tabela institucional (overlay)' dentro das configurações do indicador (toque no ⚙ / no item DVL Smart Delta). Dá pra ajustar: Confirmação (Fechamento do candle × Intrabar — quando o estado é confirmado, evitando reset falso), Banda neutra % (tolerância pra considerar 'na média' antes de virar Acima/Abaixo), Média (MA) usada como referência de cada módulo, e Duração exibida (Candles + tempo / só candles / só tempo). Também dá pra escolher quais Módulos aparecem (Net Delta, Net Long, Net Short, OI, LSR). Tudo aplica na hora e persiste (a config já era salva por trás; agora tem UI). Consome o motor de estado existente (DVL_SMART_DELTA_STATE) sem recalcular. Só frontend." },
  { version: "Beta 1.554", note: "Tabela institucional do Smart Delta agora é RESPONSIVA. No MOBILE ela encolhe ao máximo pra não estorvar o gráfico: fonte menor, padding e largura mínimos (até ~56% da tela), rodapé abreviado (Conf/Cont/Exh) e cada linha só com rótulo + setinha (▲/▼) + tempo. No PC/desktop ela fica maior e mais completa — volta a mostrar a palavra Acima/Abaixo, o valor (ex.: 1.44B) e a distância % ao lado da setinha e do tempo, com fonte e espaçamento maiores pra leitura confortável. O toque numa linha continua abrindo o detalhe completo em qualquer tela. Só frontend." },
  { version: "Beta 1.554", note: "Tabela institucional do Smart Delta enxuta a pedido: cada linha agora mostra só RÓTULO + SETINHA (▲/▼) + TEMPO no estado. Removidos da linha a palavra 'Acima/Abaixo', o valor (ex.: 1.44B) e a distância % — o que importa na leitura rápida é a direção e há quanto tempo. O valor e o detalhe completo (valor, média, distância %, estado, duração, tendência) continuam a um TOQUE de distância: tocar na linha abre o mini-painel. Rodapé Confidence/Continuation/Exhaustion mantido. Só frontend." },
  { version: "Beta 1.554", note: "Tabela institucional do Smart Delta: leitura imediata ao carregar. Antes, logo após abrir, todas as linhas mostravam '– Média / 0c' mesmo com o valor claramente acima/abaixo da própria média — porque o estado só é CONFIRMADO no fechamento do candle (regra anti-flicker) e nenhum candle tinha fechado ainda desde que os dados carregaram. Agora, quando um estado é visto pela PRIMEIRA vez (símbolo|TF novo), ele já é semeado com o estado atual (Acima/Abaixo) na hora, em vez de esperar até 1 minuto no 1m. Estados já persistidos (ao recarregar) continuam intactos, mantendo a duração acumulada — o seed só vale pra estados realmente novos. Mudanças posteriores seguem exigindo confirmação no candle. Só frontend." },
  { version: "Beta 1.554", note: "Corrige a tabela institucional do Smart Delta que aparecia VAZIA (só cabeçalho + Confidence/Continuation/Exhaustion, sem as linhas Net Delta/Net Long/Net Short/OI/LSR). Eram dois problemas: (1) o leitor procurava um campo genérico 'value' que esses osciladores não têm — cada motor guarda o número no próprio campo (netDelta/netLong/netShort no Net*, close no OI, ratio no Long/Short); agora lê o campo certo por módulo. (2) os osciladores só buscavam dados quando LIGADOS no gráfico, então com eles desligados a tabela ficava sem fonte; adicionamos um método prime() que faz cada motor buscar seus dados em segundo plano (sem desenhar painel, sem ocupar espaço) e a tabela passa a preencher sozinha mesmo sem ligar OI/LSR/Net* na mão. OI é buscado primeiro (Net Delta/Long/Short derivam dele). Throttle de 8s por módulo + 45s de cache evita flood de rede; se a busca falhar (offline) não repete a cada segundo. Enquanto carrega, mostra 'carregando dados institucionais…' em vez de painel vazio. Continua sem recalcular nada (consome os motores existentes). Só frontend." },
  { version: "Beta 1.554", note: "Tabela institucional do Smart Delta com TEMPO NO ESTADO. A tabela overlay agora mostra Net Delta, Net Long, Net Short, OI e LSR — cada um com estado (acima/abaixo da própria média), valor e HÁ QUANTO TEMPO está nesse estado (candles + tempo), além de Confidence/Continuation/Exhaustion no rodapé. Consome os osciladores já existentes (sem recalcular). Histerese (banda neutra) + confirmação no fechamento do candle evitam reset falso ao tocar a média; rastreia dois tempos independentes (estado vs média e tendência). Persiste por símbolo|timeframe (não mistura ativo/TF) e restaura ao recarregar. Toque numa linha abre um mini-painel com valor, média, distância %, estado, duração e tendência. Um ticker central único atualiza as durações (sem timer por linha). Novo bridge window.DVL_SMART_DELTA_STATE pra Copilot/Alerts consumirem o mesmo contexto temporal. Osciladores originais seguem funcionando. Só frontend." },
  { version: "Beta 1.554", note: "Volume Profile: (1) novo input 'Fonte dos textos (px)' em Geral pra controlar o tamanho da fonte de TODOS os labels do VP (POC/VAH/VAL e das demais sessões). (2) Nova sessão Previous Day (dia anterior): 3 linhas — PD POC, PD VAH e PD VAL — calculadas sobre o VP do dia anterior inteiro (00:00→24:00). Com liga/desliga por linha, cores próprias, estilo/espessura e timezone (UTC/Exchange/Local/NY/Bruxelas). Reaproveita o mesmo cálculo de VP das outras sessões. Só frontend." },
  { version: "Beta 1.554", note: "Ultra Low Latency (fase 1) — foco em TF baixo (1s–1m). O último preço vira prioridade e o desenho passa por um scheduler único de frame com GAP ADAPTATIVO: o app mede o custo real de cada render e ajusta a cadência sozinho (render rápido → até ~60fps; render pesado → recua pra não congelar), em vez do teto fixo de ~14fps. O último tick do WebSocket é sempre o que vale (os intermediários são descartados naturalmente entre frames). Adicionada instrumentação de performance (window.DVL_PERF: FPS, frame, render, latência do tick e atraso do WS) com um HUD opcional no canto (DVL_PERF_HUD(true) ou ?perf=1 na URL). Não altera nenhum indicador — só a cadência e a priorização do desenho. Só frontend." },
  { version: "Beta 1.554", note: "O glow do Volume Memory agora vem por padrão com as cores de compra/venda (verde comprador / vermelho vendedor). Migração única liga o 'Cor por lado' pra quem estava com ele desligado; dá pra desligar de novo depois (volta pra Glow Color neutra). Só frontend." },
  { version: "Beta 1.554", note: "Volume Memory: o glow agora é pintado pela FORÇA do fluxo. A cor continua indicando o lado (verde comprador / vermelho vendedor), mas a intensidade do brilho passa a refletir o quão UNILATERAL foi o fluxo naquele nível — fluxo bem de um lado só = glow forte; fluxo equilibrado = quase apagado. Assim só os níveis com força de verdade se destacam. Só frontend." },
  { version: "Beta 1.554", note: "Volume Memory agora acompanha o MOVIMENTO ao vivo. Antes o gatilho do glow era relativo ao POC (volume acumulado de horas), então o fluxo que entra em tempo real — minúsculo perto do POC — quase nunca acendia. Agora a referência é o volume NOVO de cada ciclo: acende os níveis que estão absorvendo o fluxo agora (verde comprador / vermelho vendedor), atualizando ~4,5x por segundo. A config 'Minimum Growth %' virou 'Sensibilidade % (fluxo)' = fração mínima do fluxo do ciclo pra um nível acender (menor = mais sensível; padrão 5%). Continua reutilizando os buckets do VP, com histórico por tempo e persistência. Só frontend." },
  { version: "Beta 1.554", note: "Preço em tempo real muito mais fluido (essencial pra TF baixo). Causa do 'salto': a linha/etiqueta de preço usava o ticker, que só era atualizado por REST a cada ~2s — então o preço pulava de 2 em 2 segundos. Agora: (1) a linha de preço usa o close da vela em formação (atualizado por WebSocket), não o ticker lento; (2) adicionei um stream @aggTrade que traz CADA negócio e move o preço/vela em tempo real entre as mensagens de kline; (3) o render ao vivo ficou um pouco mais fluido (~14fps). O @kline continua como fonte autoritativa de OHLC/volume no fechamento. Só frontend." },
  { version: "Beta 1.554", note: "Correção do glow do Volume Memory quando o profile usa uma COR ÚNICA (Buy e Sell na mesma cor): antes o glow saía exatamente na cor da barra e se fundia nela, parecendo que não funcionava. Agora o núcleo do glow é sempre uma versão mais clara (mistura pro branco) da cor, então ele salta mesmo em profile monocromático; o halo mantém a cor original (verde/vermelho no modo por lado, ou a Glow Color neutra). Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume Memory agora tem HISTÓRICO e não some ao recarregar: o glow passou a degradar por TEMPO (janela configurável, padrão 10 min) em vez de sumir em ~2s, e o mapa é salvo no navegador e RESTAURADO ao recarregar a página (mostrando o crescimento dos últimos ~10 min na hora). A config 'Memory Depth' virou 'Histórico (min)' com 3/5/10/20 min. Também adicionei tons de AZUL na paleta de cores do VP (servem pra Buy, Sell e todos os níveis). Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume Memory agora é um MAPA CONTÍNUO: em vez de acender só 1 coluna por evento, ele marca TODAS as colunas que recebem volume novo e vai apagando conforme o volume cessa (frescor decai por ciclo; Memory Depth = quantos ciclos até apagar). E o glow passa a ter COR POR LADO: verde quando o volume novo foi majoritariamente comprador (agressor de compra) e vermelho quando foi vendedor — usando o buyVolume (taker buy) da Binance, o mesmo dado do CVD/Delta. Novo toggle 'Cor por lado (compra/venda)' (ligado por padrão); desligado, usa a Glow Color neutra. Continua reutilizando os buckets do VP, sem recalcular, sem flicker. Só frontend." },
  { version: "Beta 1.554", note: "Cor do glow do DVL Volume Memory trocada: era âmbar (#ffe08a), que se confundia com a linha dourada do POC. Agora o padrão é ciano elétrico (#35e0ff), que contrasta com as barras verde/vermelho e com o POC. Quem estava no padrão antigo é migrado automaticamente; cor personalizada é preservada. Dá pra mudar em Volume Profile → DVL Volume Memory → Glow Color. Só frontend." },
  { version: "Beta 1.554", note: "Volume Profile mais profissional + novo DVL Volume Memory (só apresentação — os cálculos do VP não mudaram). (1) Colunas mais robustas: largura vai até 60% (cap maior) e cantos levemente arredondados na ponta externa (Corner Radius). (2) DVL Volume Memory: quando um nível recebe volume NOVO relevante, só a ponta recém-crescida acende um glow; o glow degrada por EVENTOS de crescimento (nível 5→4→3→2→cor base), criando uma memória visual dos últimos crescimentos. Se o MESMO nível continua crescendo, ele segue no topo (não reinicia). Filtro anti-ruído (Minimum Growth %) e Memory Depth (3/5/10 eventos). Reutiliza os buckets do VP (sem recalcular), detecta só em range estável (ignora pan/zoom) e sem flicker. Novas configs: Ativar, Memory Depth, Glow Strength, Glow Color, Minimum Growth, Corner Radius. Só frontend." },
  { version: "Beta 1.554", note: "As linhas Entry/TP/SL do Risk Manager agora CONTINUAM visíveis mesmo com o painel fechado (antes sumiam ao fechar). No mobile o painel cobre o gráfico, então agora dá pra planejar, fechar o painel e ver as linhas no gráfico. A visibilidade passa a depender só do toggle 'Mostrar no gráfico' — ligou, as linhas ficam (aberto ou fechado); desligou, somem. Só frontend." },
  { version: "Beta 1.554", note: "Ajuste do acesso mobile ao Risk Manager: na 1.237 a barra no topo empurrava o conteúdo e as linhas do painel (Wallet/Entry/Lev e Buy/Sell) se sobrepunham. Agora o acesso é um botão 🛡 INLINE na linha de cima do Trade Panel, ao lado do ✕ — sem adicionar altura, então nada colide. A linha de cima vira 6 colunas pra encaixar o 🛡. Abre o Risk Manager sem fechar o painel e mantém os valores. Desktop inalterado (botão escondido, launcher flutuante intacto). Só frontend." },
  { version: "Beta 1.554", note: "Acesso ao Risk Manager no mobile resolvido. Antes o botão ficava no rodapé do Trade Panel e escorregava pra trás da barra inferior, ficando inacessível. Agora, no mobile, existe uma barra '🛡 Risk Manager' no TOPO do Trade Panel — sempre visível, sem posição fixa, nunca atrás do rodapé. Abre o Risk Management sem fechar o Trade Panel e mantém todos os valores preenchidos. O desktop NÃO muda: continua com o launcher flutuante de sempre. Só frontend." },
  { version: "Beta 1.554", note: "Duas coisas: (1) Removido o runner de backtest de ESTRATÉGIAS do Copilot (📊 Volume Profile, 📈 RSI Exaustão, 🎯 Combinado, 🔺 Sinais V, com os chips de timeframe/período). O card agora mostra sempre o 'Backtest financeiro' (pré-pump/pré-short — quanto teria rendido), e o card 'Backtest financeiro' do ML continua igual. (2) Risk Engine bem enquadrado no mobile: o cabeçalho (‹ voltar / título / ✕) ficava atrás da barra do navegador porque a altura usava vh (viewport grande, com a barra recolhida). Agora usa dvh (viewport dinâmica) e o cabeçalho respeita o safe-area, então os botões aparecem inteiros e clicáveis. Só frontend." },
  { version: "Beta 1.554", note: "Correção GLOBAL do piscar de indicadores presos a preço (POC, VAH, VAL e demais níveis/linhas que saltavam de posição por alguns frames e voltavam sozinhos). Causa raiz: a escala vertical do gráfico (centro/alcance do autoscale) é recalculada por percentil a cada frame; um valor transitório errado de 1 frame deslocava a escala inteira — e como TODO indicador ancorado a preço deriva dessa mesma escala, todos saltavam juntos e retornavam. A correção é no NÚCLEO de renderização, não por indicador: um salto grande e súbito da escala SEM gatilho estrutural (troca de ativo/timeframe, zoom, pan, nova vela, lock ou interação) só é adotado após confirmar por 2 frames; assim um glitch de 1 frame nunca chega a ser desenhado, enquanto mudanças legítimas passam na hora. Escala inválida nunca substitui a última válida. Só frontend." },
  { version: "Beta 1.554", note: "Correção: ao remover outros osciladores do gráfico, o Smart Delta (e o Net Long) sumia junto. A visibilidade do painel inferior era decidida por uma lista fixa que esquecia esses dois — então, sem nenhum dos osciladores 'antigos' ligado, o painel inteiro fechava. Agora essa visibilidade vem da MESMA lista que realmente desenha os osciladores, então qualquer oscilador ativo (atual ou futuro) mantém o painel aberto e o Smart Delta continua sozinho no gráfico se for o único ligado. Só frontend." },
  { version: "Beta 1.554", note: "Smart Delta (visual): a barra do histograma agora BRILHA de verdade quando é um extremo/spike — cor bem mais forte e saturada (tipo o pico verde-limão do TradingView), opacidade cheia sem escurecer por confiança e um leve glow, enquanto as barras normais seguem em tom médio. Só aparência; o motor e os cálculos não mudaram. Só frontend." },
  { version: "Beta 1.554", note: "Refinamento visual do histograma DVL Smart Delta (só aparência, o motor e os cálculos permanecem intactos): barras mais largas, opacidade proporcional à confiança da leitura, escala automática do painel, intensidade de cor por extremidade (média × extrema), média móvel mais espessa, linha zero mais clara e cabeçalho com Δ e MA. O painel do histograma ficou totalmente independente, desacoplado do oscilador Exhaustion RSI. Novas configs no painel de configuração: Largura da barra, Escala automática, Opacidade por confiança (com máx./mín.) e Espessura da média. Só frontend." },
  { version: "Beta 1.554", note: "Separated DVL Smart Delta into a chart overlay summary and a dedicated histogram oscillator while preserving a single Smart Delta Engine. Correção visual: o histograma NÃO fica mais em cima dos candles — a tabela Smart Delta continua como overlay no canto do gráfico, e o histograma (verde acima / vermelho abaixo da linha zero, mais intenso nos spikes, com média móvel amarela e escala independente) foi movido para um PAINEL PRÓPRIO de oscilador, separado do painel de Volume, e acompanha zoom/pan como os demais osciladores (uma coluna por candle). Ambos consomem o mesmo motor, sem duplicar cálculo. Novas configs: Histograma on/off, Média (MA) on/off + MA Length, Spike ×, Linha zero, e Tabela detalhada (compacta/detalhada). Registrado na lista real de osciladores. Só frontend." },
  { version: "Beta 1.554", note: "DVL Smart Delta Engine — Stage 3 (fonte única de leitura + Smart Alerts): o motor agora publica a leitura atual num único lugar — window.DVL_SMART_DELTA_LAST e o evento dvl:smart-delta (símbolo, timeframe, delta, confidence, continuation, exhaustion, classe e componentes) — mais DVL_SMART_DELTA_ENGINE_API.getSnapshot(), para Scanner, Copilot, Market Matrix e Smart Alerts consumirem SEM duplicar lógica. Adicionado o Smart Alerts: quando o candle cruza os limiares configurados (|Delta| ≥, Confidence ≥, ou Exhaustion ≥), dispara um alerta (toast + evento dvl:smart-delta-alert), uma vez por candle. Novos controles no painel de configuração (Alertas on/off e limiares). Observação: Market Matrix e Smart Alerts ainda não existiam como telas no app — o Smart Alerts foi criado agora; a coluna do Scanner por símbolo depende de cálculo no backend (footprint por símbolo) e fica para um próximo passo. Só frontend." },
  { version: "Beta 1.554", note: "DVL Smart Delta Engine — Stage 2 (confluência institucional externa): o motor agora incorpora Open Interest + variação do OI, Long/Short Ratio e os níveis do Volume Profile (POC/VAH/VAL) na pontuação, lendo os indicadores/VP que já existem no DVL (sem duplicar cálculo). OI confirmando a direção (OI subindo junto com o preço) aumenta Confidence e Continuation; OI caindo eleva o Exhaustion (desmontagem de posição); LSR confirmando soma continuação; e a proximidade do candle a VAL/VAH/POC entra como suporte/resistência/equilíbrio. O delta do candle continua intrínseco — a confluência ajusta só Confidence/Continuation/Exhaustion, e quando os dados não estão disponíveis nada é penalizado. Painel ganha uma linha de confluência (OI · LSR · VP). Adicionado DVLVolumeProfile.getLevels() para expor POC/VAH/VAL atuais. Só frontend." },
  { version: "Beta 1.554", note: "Added DVL Smart Delta Engine with institutional confidence scoring, continuation probability, exhaustion analysis and unified confluence model. Motor proprietário (não é Footprint, não simula Bid x Ask): a partir de volume/spike, corpo, pavios, posição do fechamento, velocidade, flat/spike, absorção, rejeição e do delta real do footprint (quando disponível), calcula Institutional Confidence (0–100), Smart Delta assinado (histograma leve: verde compra, vermelho venda, cinza neutro, amarelo indecisão), Continuation Probability (0–100) e Exhaustion Score (0–100). Painel compacto no gráfico (Delta / Confidence / Continuation / Exhaustion do candle atual) e API window.DVL_SMART_DELTA_ENGINE_API (latest/at/series) pronta para Scanner, Copilot, Market Matrix e Smart Alerts nos próximos estágios. Módulos CORE/SCORE/ENGINE/RENDER/STORAGE, cache incremental por candle fechado. Registrado no menu real de indicadores (VOLUME & FLOW). Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine — linhas de planejamento, dois ajustes: (1) o gráfico NÃO se move mais ao arrastar Entry/TP/SL — o handler de pan agora ignora o toque quando ele começa numa linha do Risk Engine (mesma trava que o Paper Trading já usa), então no mobile a linha arrasta sem levar o gráfico junto; (2) ao FECHAR o Risk Engine as linhas somem do gráfico (e as faixas de toque também), reaparecendo quando você reabre — os valores de Entry/Stop/TP continuam salvos. Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine — linhas interativas de planejamento no gráfico (Stage 1): Entry, Take Profit e Stop Loss viram três linhas arrastáveis, ligadas ao MESMO estado central do Risk Engine (sem cópia dupla). Arrastar a linha atualiza o painel e vice-versa. Ao mover Entry ou Stop, o lote MT5 e o risco real são recalculados ao vivo pelas specs da corretora; mover só o TP muda o R:R e mantém o lote. Entry começa no último preço (market) e vira fixa (manual) na primeira interação; TP segue R:R 1:1 automático (botão 'TP Auto R:R' religa) e vira manual se você arrastar o TP; estrutura inválida (Stop/TP do lado errado) mostra as linhas mas bloqueia o lote, sem inverter a direção sozinho. Botão 'Mostrar no gráfico' cria/remove as linhas sem apagar valores. Desenhadas no canvas (acompanham pan/zoom) com faixa de toque generosa e trava de pan no arrasto (mobile), via novo módulo DVL_RISK_ENGINE_CHART_LINES. Não são ordens nem Paper Trading. Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume Profile Avançado — Stage 3 (Overnight Profile + timezone): novo perfil Overnight com POC/VAH/VAL de uma janela configurável (hora/minuto de início e fim) num timezone à escolha (UTC / Exchange / Local / Bruxelas / New York), tratando janelas que cruzam a meia-noite e horário de verão. Sessão Atual ou Anterior; modo Developing calcula ao vivo enquanto a janela está aberta e congela quando ela fecha. Cada linha (O-POC / O-VAH / O-VAL) com cor, estilo e espessura próprios. Reaproveita o motor de distribuição do VP; Current, Previous, Developing e Value Area intactos. Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume Profile Avançado — Stage 2 (Developing Profile + POC Trail): novo perfil Developing que mostra POC/VAH/VAL da SESSÃO em curso (timeframe configurável, padrão 1 dia) e se atualiza ao vivo conforme entram velas/volume — independente do Current (range visível) e da Sessão 2. Cada linha tem cor, estilo e espessura próprios (D-POC / D-VAH / D-VAL). Adicionado o Developing POC Trail: o caminho histórico do POC dentro da sessão, desenhado como polilinha, com cor/estilo/espessura/opacidade e máximo de pontos (padrão 300, cria ponto só quando o POC muda). Reaproveita o mesmo motor de distribuição/fetch por período já existente; Current, Previous e Value Area intactos. Só frontend." },
  { version: "Beta 1.554", note: "DVL Volume Profile Avançado — Stage 1 (customização de linha): cada grupo de níveis (Current e Sessão 2) agora tem estilo de linha configurável (Sólida, Tracejada, Pontilhada, Traço-ponto) e espessura de 1 a 4 px, e os labels ganharam modos Full / Short / Price Only / Hidden com opção de mostrar o preço ao lado do nome. Tudo aplicado no renderizador real do Volume Profile existente, sem tocar no cálculo de distribuição, sessões ou Value Area — Current e Previous (Sessão 2) permanecem intactos, sem regressão. Próximos estágios: Developing e Overnight profiles, timezone, POC trail e zonas de confluência. Só frontend." },
  { version: "Beta 1.554", note: "Fix DVL FVG Firewall not showing in the Indicadores menu: the app has two indicator menus, and the live UI is built from the modules() registry (dvl1bIndicatorMenu0813), not the legacy #indicatorDropdown the module was inserting into. Registered DVL FVG Firewall in the real modules() registry (VOLUME & FLOW section) and added the api methods the menu drives it with — on(), setOn(), openPanel()/open() — so the toggle, the settings gear and the ON/OFF state all work from the menu you actually see. Frontend only." },
  { version: "Beta 1.554", note: "Fix DVL FVG Firewall: zones never appeared because the module read the app candles via window.klines, but klines/interval/symbol/ticker are declared with let (global lexical scope, not on window), so it always saw an empty candle set and detected nothing. Now it reads them by bare identifier with a typeof guard — the same pattern the rest of the app uses — so detection runs on the real candles and VALID/WEAK/FAKE zones draw. Verified end-to-end: bull and bear FVGs detected and rendered, 0 console errors. Frontend only." },
  { version: "Beta 1.554", note: "Added DVL FVG Firewall with real-trade footprint aggregation, flow-based FVG scoring, VALID/WEAK/FAKE classification, mitigation tracking, cached rendering and performance-safe worker processing." },
  { version: "Beta 1.554", note: "Added commission-aware CFT MT5 risk sizing over the Beta 1.554 base, including verified BTCUSDT.cft contract specifications, entry and exit fees, safe lot rounding, net profit, technical and net R:R, and estimated margin." },
  { version: "Beta 1.554", note: "Risk Engine — conserta o Stop mostrando lixo tipo '-44,3' no modo 'entrada pelo último preço' (e o TP ficando '--' por causa disso). Causa: sem trade selecionado, um Stop inválido salvo no navegador (negativo, do lado errado da entrada, ou absurdamente longe) passava direto e nunca era corrigido — e sem stop válido o TP 1:1 não conseguia ser derivado, então RR e Profit também sumiam. Agora o Risk Engine SANEIA o stop: se ele não for um preço válido do lado certo da entrada, entra um default de 0,3% da entrada (ex.: entry 65.190 → stop 64.994), o TP 1:1 é recalculado e RR/Profit voltam a aparecer. Stop válido que você já pôs NÃO é alterado. É só um ponto de partida coerente — arraste/edite o stop pro seu nível real normalmente. Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine — conserta o R:R e o Profit no TP que apareciam como '--'. Causa: o cálculo só computava R:R e lucro quando havia um TP explícito; em trade manual (ou ordem sem TP definido), o TP vinha vazio e ambos ficavam em branco, mesmo com Entry e Stop preenchidos. Agora, quando falta o TP, o cálculo DERIVA o TP no padrão do app (R:R 1:1) a partir do Entry e do Stop, então R:R e Profit sempre aparecem. Se você definir um TP manual, ele é respeitado normalmente (ex.: TP 2:1 mostra R:R 1:2 e o dobro do lucro). Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine — perfil da Crypto Fund Trader (CFT) já vem PREENCHIDO de fábrica pro BTC, então não aparece mais 'Contract Size ausente / Lote mínimo ausente / …'. Valores reais do MT5 da CFT (símbolo BTCUSDT.cft): Contract Size 1, Tick Size 0.1, Tick Value 0.1, Volume min 0.001, max 10.000.000.000, step 0.001, Digits 1, moeda USD, cálculo por Tick Value, comissão 0,0325% por lado (guardada no perfil). O perfil abre como 'validado' e o cálculo de lote funciona na hora — ex.: risco US$100 com stop de US$500 dá lote 0.200. Se ainda aparecer 'ausente' no seu navegador (perfil salvo antigo em cache), toque em 'Restaurar perfil' pra carregar o padrão novo. Obs.: a comissão fica gravada no perfil mas ainda NÃO entra no cálculo do lote (o risco do stop é separado da comissão sobre o nominal) — se quiser que ela entre, é o próximo passo. Só frontend." },
  { version: "Beta 1.554", note: "Risk Engine sync hardening: TP/SL/Entry passam a ser importados diretamente do evento do Paper V2, sem depender apenas do selectedId global. Ao mover o SL no gráfico, o TP é reposicionado automaticamente em R:R 1:1 quando o stop estiver no lado válido; mover Entry preserva a estrutura, e o painel recalcula imediatamente." },
  { version: "Beta 1.554", note: "Risk Engine market-entry default + automatic R:R 1:1: sem trade selecionado, o Entry passa a usar o último preço disponível do ativo ao abrir a calculadora ou trocar de ativo. Ao definir ou alterar Entry/Stop/lado, o TP padrão é reposicionado automaticamente para a mesma distância do risco, respeitando Buy/Sell. O TP continua editável manualmente depois do preenchimento automático." },
  { version: "Beta 1.554", note: "Added DVL Risk Engine with broker-specific MT5 lot calculation, account profiles, configurable contract specifications, risk-based sizing, real-risk validation and lot copy support. Integra o cálculo ao Trading Panel e às linhas Entry/SL/TP do Paper V2 sem executar ordens reais; Crypto Fund Trader e perfil personalizado ficam preparados para dados reais do MT5, sem números inventados." },
  { version: "Beta 1.554", note: "VERSION SOURCE FIX — corrige a segunda declaração interna que ainda definia DVL_APP_VERSION como Beta 1.554 depois do boot e sobrescrevia o badge/HUD, mesmo quando o arquivo e o patch de zoom já eram Beta 1.554. Agora a versão interna herda a fonte única window.DVL_APP_VERSION e não pode rebaixar a identificação da build. Mantém integralmente as otimizações e o comportamento da Fase 11." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 11 — corrige o gargalo específico do zoom por roda no desktop: o listener Desktop Pro capturava o wheel e interrompia o handler principal antes que o estado global de interação fosse ativado. Com isso o zoom continuava em DPR 2.5, mantinha glow completo e recalculava Auto Range/Volume Profile de Range Visível em cada passo da roda. Agora o controlador desktop assume oficialmente o ciclo de interação, usa DPR 1.0 e congela os cálculos dependentes da janela durante a sequência de wheel, liberando e recalculando uma única vez após 160ms sem novos eventos. O percentil de autoescala também reutiliza o último resultado enquanto há interação. Crosshair, pan, mobile, dados e resultado final do Range Visível permanecem iguais." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 10 — reduce CPU and garbage inside the real canvas draw path without touching the fluid 1.209 mouse controller: visible candle slices are reused while the fractional viewport remains inside the same candle boundaries; Heikin display candles are cached until source OHLC changes; volume scaling no longer allocates arrays/spreads on every frame; Moving Averages stop remapping the entire kline history before every cached draw; Volume Profile computation is cached, rate-limited for live-candle updates and frozen only during active pan/zoom, then recomputed on the existing final sharp repaint. Crosshair/hover behavior from 1.209 is locked and unchanged." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 9 — remove layout thrash from the mouse/render hot path: oscillator divider hover joins the single desktop rAF hover controller and stops calling getBoundingClientRect at raw mouse polling rate; divider drag reuses the rect captured on pointerdown; oscillator bounds, Paper layer anchoring and scale dock no longer read/write DOM after every canvas draw and now synchronize only when the chart layout signature changes; redundant clearRect removed before the opaque background fill; interaction DPR drops temporarily to 1.0 on desktop (1.15 touch) and returns fully sharp on release. Layout, data, indicators, Paper Trading and mobile behavior preserved." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 8 — remove trabalho invisível restante no idle e no boot. Bookmap deixa de pedir redraw duplicado a cada ciclo; refreshes de Scanner/Copilot/Watchlist passam a existir somente enquanto seus painéis estão abertos; observadores globais e tempestades de retry dos indicadores antigos são eliminados ou limitados à superfície correta; indicadores pausam fetch durante pan/zoom e com aba oculta. Mantém os dados e o comportamento funcional, reduzindo callbacks, DOM scans e frames perdidos." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 7 — congela os motores de análise quando suas superfícies estão fechadas. Scanner backend, modelo aprendido, backtests, ML, Fast Bots e cards do Copilot deixam de manter polling de rede/DOM fora de uso; timers são criados somente ao abrir Scanner/Copilot e destruídos ao fechar ou ocultar a aba. A bridge do Scanner passa a buscar universo/modelo apenas quando Scanner ou Copilot estão visíveis, e backtest somente quando o Copilot está aberto. Cards de modelo/backtest ficam event-driven. Ao reabrir, cada módulo faz um catch-up imediato e retoma o ritmo normal, preservando estado, dados e resultados do backend." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 6 — remove o reload completo de candles/OI/LSR a cada 15 segundos e transforma o feed em recuperação por stale-state: o histórico só é recarregado quando não há candles ou o preço realmente ficou sem atualização; o fallback REST deixa de rodar com WebSocket/preço saudável; a colagem da vela em formação passa a reagir ao evento de preço em vez de usar relógio próprio; a lista global de tickers só atualiza sob demanda ao abrir Assets/Watchlist e não reconstrói dropdowns fechados. Reduz rede, parsing, DOM e redraws ociosos sem alterar pan, zoom, indicadores, Paper Trading ou mobile." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 5 — unifica o hover desktop e remove a cadeia dupla de eventos do crosshair/desenhos: o mouse agora passa por um único pointermove coalescido por frame; cursor de escala só altera classes quando a zona realmente muda; o crosshair DOM pinta no mesmo frame do hover (remove o segundo requestAnimationFrame que deixava a cruz atrasada); o motor principal não chama mais o compositor DOM como se fosse desenho de canvas; o workflow aprovado de desenhos deixa de registrar mousemove + pointermove duplicados e passa a ser acionado pelo controlador desktop central; remove o bridge 0.475 redundante. Mobile continua usando o crosshair de canvas, e preview de ferramentas continua redesenhando apenas enquanto uma ferramenta está ativa e fica limitado a 30 FPS, enquanto a cruz DOM segue a 60 FPS." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 4 — torna o Paper Trading e o feed ao vivo orientados a eventos: remove dois wrappers legados de drawSoon, dois MutationObservers e o polling do overlay antigo; o Paper V2 passa a renderizar depois de chart:draw e paper-price via scheduler único, sem reconstrução a cada 900ms; coalesce ticks aggTrade por símbolo preservando extremos para TP/SL; o motor Paper recebe preço diretamente do feed do gráfico, só atualiza Positions quando a aba está aberta e reduz fallbacks ociosos; WebSocket, fast poll e forming candle passam por um limitador de redraw e não redesenham o gráfico durante pan/zoom. Remove também os dois audits históricos restantes que geravam erros falsos no console. Mantém ordens, fees, TP/SL, múltiplos ativos, indicadores e layouts desktop/mobile." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 3 — congela trabalho ocioso da interface: remove o redraw global obrigatório de 1s; reduz o fallback REST do gráfico de 2s para 8s e o pausa com aba oculta/interação; troca watchdogs periódicos de drawings, dock da escala e bounds do Paper por eventos/ResizeObserver; Copilot e Scanner deixam de varrer DOM quando fechados; Watchlist só atualiza preços continuamente quando aberta; watchdog de readiness deixa de rodar a cada 5s. Mantém WebSockets, candles, indicadores, paper trading, layout desktop/mobile e fallbacks de reconexão." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 2 — aposenta a suíte legada de auditoria 0.665–0.688 e remove cinco blocos históricos malformados que quebravam o parser JavaScript (0675/0676, 0687/0688, 0699, 0763 e 0781). Esses módulos faziam inventários, gates e verificações de versões antigas; não eram motores visuais. Mantém todo CSS funcional e todos os módulos de gráfico, dados, indicadores, desenhos, paper trading e painéis. O HTML passa a ter todos os scripts inline sintaticamente válidos, sem timers/listeners/observers novos; adiciona apenas um marcador estático de inventário sem trabalho automático." },
  { version: "Beta 1.554", note: "DESMANTLE PHASE 1 — cria um Runtime Core único com scheduler por requestAnimationFrame e barramento de eventos; Long/Short deixa de limpar/recriar o DOM a cada 250ms, deixa de envolver drawSoon(), migra para atualização por evento após draw real e ignora renders quando viewport/escala/posições não mudaram. A limpeza de runtime antigo passa a ocorrer somente no boot. Remove completamente o crosshair canvas 1.197 (canvas, ResizeObserver e listeners), em vez de apenas escondê-lo sob o crosshair DOM 1.200. Mantém HTML único, layout, mobile, cálculos, dados e paper trading." },
  { version: "Beta 1.554", note: "PERFORMANCE — crosshair desktop trocado de canvas full-screen DPR 2.5 por camada DOM composta (linhas, ponto e labels via transform). O overlay antigo limpava e repintava milhões de pixels a cada frame só ao mover o mouse, causando travadas mesmo com draw() principal baixo. Agora não há clearRect/rasterização full-screen no hover; texto só recalcula quando candle/preço exibido muda; estados de cursor só alteram DOM quando mudam. Mobile e cálculos preservados." },
  { version: "Beta 1.554", note: "PERFORMANCE — o CULPADO do 'trava só mexendo o mouse': o handler de hover (cursor + crosshair) estava ligado direto no pointermove, que dispara na TAXA DO MOUSE (mouse gamer = até 1000 eventos por segundo), não nos 60fps da tela. Rodar isso 1000x/s (cada vez mexendo classes/estado do cursor) era o 'algo sendo reescrito' que fritava a CPU só passando o mouse — mesmo com gráfico parado e sem osciladores. O 1.197 até criou uma variável (hoverRAF) pra jogar isso num requestAnimationFrame, mas ela NUNCA foi ligada. Agora liguei: o hover é coalescido pra no máximo 1 processamento por frame (60fps), usando o último evento. O crosshair continua acompanhando o mouse igual, mas a CPU despenca. Só frontend." },
  { version: "Beta 1.554", note: "PERFORMANCE: limita o recomputo do Exhaustion RSI. O cache da 1.196 incluía o último preço na assinatura, então a cada tick do preço ao vivo o RSI refazia o resample multi-TF inteiro — caro, ainda mais com o RSI ligado o tempo todo pros sinais de V. Agora separo 'estrutura' (vela nova / mudança de 1m / parâmetro → recomputa na hora) do preço ao vivo (mesma vela, só o close mexendo → recomputa no máximo ~3x/s). Arrastar/zoom continua cache hit. O RSI fica no máximo ~300ms atrás do preço, imperceptível. Só frontend." },
  { version: "Beta 1.554", note: "PERFORMANCE CORE: crosshair desktop agora usa canvas overlay próprio e não redesenha candles/volume/osciladores a cada movimento do mouse; cache único do rect do canvas no hover; redraw ocioso cai de 4x/s para 1x/s; resolução dinâmica durante pan/zoom reduz pixels rasterizados e volta nítida ao soltar; linha do Exhaustion RSI é batched em 3 paths durante interação; polls visuais e observer desktop foram desacelerados/coalescidos. Sem mudar cálculos, dados, paper trading ou layout. Mobile preservado visualmente." },
  { version: "Beta 1.554", note: "PERFORMANCE (o vilão do heap/GC): o DVL Exhaustion RSI recalculava TUDO a cada frame — resamplava o 1m inteiro em 5 timeframes e recomputava a exaustão de cada barra de cada TF, sem cache. Com o RSI ligado o tempo todo (pros sinais de V), isso enchia a memória de lixo (heap chegando a 277MB) e causava pausas de GC gigantes — inclusive um frame de 36 SEGUNDOS no HUD. Agora o cálculo é CACHEADO: só refaz quando os dados ou os parâmetros realmente mudam. Arrastando/zoomando (dados parados) vira cache hit e a EXR fica de graça; quando o preço anda, recalcula uma vez. Deve derrubar o heap, matar as travadas de GC e melhorar o FPS com o RSI ligado. Só frontend. (Se ainda travar, o próximo alvo é a linha do RSI e as barras de volume, que ainda desenham segmento a segmento.)" },
  { version: "Beta 1.554", note: "Conserta o backtest de Sinais V que 'demorava e não mostrava nada': quando o run terminava mas o grid vinha sem sinais suficientes (ex.: TF/período pesado com poucos candles), o backend devolvia ready:false e o app ficava POLANDO pra sempre achando que ainda estava rodando. Agora, quando o run TERMINA, ele sempre devolve ready:true — o status do grid em si vai à parte, e o card mostra o resultado OU uma mensagem clara ('poucos candles no período'), em vez de girar sem fim. Também protege o cálculo com try/catch pra um erro não pendurar o run. Obs.: no BTC 15m/1 ano o sinal cru de exaustão deu NEGATIVO (long ~-42%, short ~-22% no teste), então o card mostra 'NADA confiável' — é resultado real, não bug. Backend (dvl-scanner reinicia sozinho)." },
  { version: "Beta 1.554", note: "Conserta o botão '🔺 Sinais V' do backtest que não ativava: o clique no seletor de tipo tinha uma lista que só aceitava vp/rsi/combo, então 'vsignal' caía de volta pra Volume Profile. Agora seleciona certo e dispara o backtest de Sinais V. Só frontend." },
  { version: "Beta 1.554", note: "NOVO tipo de backtest: '🔺 Sinais V' — testa SÓ os triângulos do gráfico (a exaustão por excursão do RSI), a pedido. Regra idêntica à do gráfico: quando o RSI SAI de uma zona, entra o trade — saiu da sobrevenda = COMPRA (long), saiu da sobrecompra = VENDA (short) — e o resultado é resolvido pelas velas seguintes com SL/TP em ATR (o mesmo simulador dos outros backtests). Varre as zonas (upper/lower) × alvo, COMPRA e VENDA separadas cada uma com $1000, com o mesmo critério anti-sorte: só conta como 'segura' se for VERDE no TREINO E no TESTE (ranking pelo pior dos dois). Mostra também quantas compras/vendas o indicador gerou nas suas zonas atuais no período. É só escolher '🔺 Sinais V' no seletor de tipo do card de backtest, com os chips de TF (5m/15m/30m/1h) e período (1/2 anos). Backend + frontend — o dvl-scanner reinicia sozinho pelo deploy." },
  { version: "Beta 1.554", note: "Reescreve a regra do V do RSI pra ser EXAUSTÃO de verdade (os falsos continuavam porque numa subida em escada o RSI faz vários topinhos com pullback, e todos passavam como 'pivô'). Agora o sinal é uma EXCURSÃO na zona: o RSI ENTRA na zona (sobrecompra/sobrevenda), guarda o extremo, e o triângulo só CONFIRMA quando ele SAI da zona — ou seja, a reversão realmente aconteceu. Resultado: enquanto o RSI fica subindo dentro do vermelho, NÃO aparece venda nenhuma; quando ele finalmente cai e sai do vermelho, aparece UM triângulo de venda no topo daquela excursão (e o espelho pro verde/compra). Um sinal por excursão, no vértice do Λ/V, sem repintar (só confirma ao sair). Muito mais limpo em tendência. Só frontend." },
  { version: "Beta 1.554", note: "Conserta os sinais de V do RSI: antes qualquer 'engasgada' de 1 vela dentro da zona virava triângulo (você marcou os microkinks que NÃO são V de verdade no meio da tendência). Agora só conta V DE VERDADE: o pivô precisa ser o extremo numa janela de 2 velas de cada lado E ter profundidade mínima nas DUAS pernas do V (o RSI tem que cair/subir de forma relevante entrando E saindo do pivô), senão é tremidinha e é ignorado. Isso derruba os falsos positivos de subida/descida contínua. O pivô agora confirma na 2ª vela seguinte (continua sem repintar). Dá pra calibrar ao vivo pelo console: window.__dvlRsiVMinDepth (profundidade mínima em pontos de RSI, padrão 3 — aumente pra ter menos sinais e só os fortes) e window.__dvlRsiVWindow (velas de cada lado, padrão 2). Me diga o valor que ficar bom que eu fixo. Só frontend." },
  { version: "Beta 1.554", note: "NOVO: sinais de COMPRA/VENDA no preço a partir dos 'vzinhos' (pivôs) do DVL Exhaustion RSI. Quando o RSI faz um V dentro das zonas, aparece um triângulo no gráfico de preço, na direção da cor do RSI: RSI VERDE (sobrevendido, exausto no fundo) fazendo um vale (V) → triângulo VERDE pra CIMA abaixo da mínima = compra; RSI VERMELHO (sobrecomprado, exausto no topo) fazendo um pico (Λ) → triângulo VERMELHO pra BAIXO acima da máxima = venda. O pivô só confirma na vela seguinte (usa a vela i+1), então o sinal NÃO repinta. Aparece só com o Exhaustion RSI ligado, usa as suas zonas (Upper/Lower) e as cores do próprio oscilador. Custo ~zero: o oscilador já calcula os valores, então só detecto o pivô e publico; o gráfico de preço lê e desenha. Só frontend. Obs.: as cores casam com o RSI quando o Calculation TF do oscilador está em 'Chart' (padrão)." },
  { version: "Beta 1.554", note: "PERFORMANCE (render) — batch dos pavios das velas: com o glow já desligado no arraste (1.188), o HUD ainda mostrava ~50ms/frame no zoom out (centenas de velas). Motivo: cada vela desenhava o pavio (wick) com um ctx.stroke() próprio — centenas de 'flushes' de rasterização por frame. Agora os pavios são acumulados por cor num Path2D e desenhados em ~2 strokes no lugar de centenas. Truque pra não mudar NADA visual nem a ordem: só as partes do pavio que ficam FORA do corpo entram no batch (o corpo nunca as cobre, então tanto faz desenhar depois). Cores exatas (agrupadas pela cor real de cada vela, inclusive as amarelas de spike), footprint intocado (continua no render bridge). Verificado renderizando de verdade: arrasta/zoom sem erro. Só frontend. (Se ainda faltar no zoom out, próximo alvo é a linha do RSI de exaustão, que também desenha centenas de segmentos.)" },
  { version: "Beta 1.554", note: "PERFORMANCE (render) — glow off durante o arraste/zoom: o HUD mostrou que, mesmo com o layout-thrash já morto (1.187), o gráfico ficava a 12 FPS movendo de um lado pro outro — cada redesenho completo custa ~83ms. Causa nº1: shadowBlur (o brilho/glow das velas, linhas e do RSI de exaustão) é o op MAIS caro do canvas — recalcula uma sombra borrada do caminho inteiro a cada traço, ainda por cima em retina (2,5× os pixels). Solução sem perder o visual: um interceptor no shadowBlur do canvas desliga o glow APENAS enquanto você está arrastando/dando zoom/pinça (ninguém admira brilho no meio do gesto) e, ao soltar, repinta uma vez COM o glow de volta — parado fica 100% igual. Não precisei tocar nos 37 pontos de glow: é um único hook, reversível, que não muda o valor lógico lido pelo código. Bônus de diagnóstico: ?glow=0 na URL força o glow desligado sempre (pra medir o custo dele no HUD), ?glow=1 desfaz. Verificado renderizando de verdade: hook instalado, leitura/escrita do shadowBlur intactas, arraste sem erro, glow volta ao soltar. Só frontend. (Se ainda faltar, próximos alvos: alocação por frame e memória/GC de 222–270MB.)" },
  { version: "Beta 1.554", note: "PERFORMANCE (interação) — mata o layout-thrash do pan/zoom: o HUD da 1.186 mostrou o gráfico a 12 FPS (frame de 83ms, 78/90 frames travando). Causa raiz nas interações: getBoundingClientRect() do canvas — que FORÇA um reflow síncrono do layout — era chamado a CADA pointermove no arrastar/zoom/pinça (mouse de alta taxa = dezenas de reflows por segundo). Agora o retângulo do canvas é cacheado e só recalculado quando muda de verdade: invalida em resize, scroll, orientationchange e via um ResizeObserver no próprio canvas (pega resize do painel do desktop e do divisor do oscilador), com validade máxima de 200ms que auto-cura qualquer mudança não capturada (no pior caso 200ms desatualizado, imperceptível, sem coordenada presa). As 7 leituras no caminho de arrastar/zoom/pinça/crosshair viraram 1 leitura cacheada. Verificado renderizando de verdade: arrasta e dá zoom sem erro, crosshair e clique continuam alinhados. Só frontend, nada visual mudou. (Próximos alvos, medindo pelo HUD: baixar o custo do próprio draw() ~22ms e a memória/GC ~222MB que causam os picos de 1,5s.)" },
  { version: "Beta 1.554", note: "HUD de performance (medição da fluidez) — DESLIGADO por padrão, mobile intocado, só frontend, custo ZERO quando off. Serve pra medir a interação (zoom/arraste) no SEU aparelho em vez de chutar. Liga/desliga: no desktop aperte a tecla P três vezes rápido; no mobile toque 3x com dois dedos; ou use ?perf=1 (liga) / ?perf=0 (desliga) na URL — o estado fica salvo no aparelho. Mostra: FPS + tempo de cada frame (mediana e máximo), nº de frames travados (>50ms), long tasks (bloqueios de main-thread >50ms) e o custo do draw() quando capturável. O overlay não bloqueia toque (pointer-events:none). É só um medidor — não altera nada do gráfico, dos indicadores nem do paper trading. Serve pra você me mandar um print e eu atacar exatamente o gargalo da interação com número antes/depois." },
  { version: "Beta 1.554", note: "PERFORMANCE (carregamento) — servidor: antes o app (HTML único de 3,16 MB) era enviado SEM compressão e com 'no-store', então TODA abertura/refresh rebaixava os 3,16 MB inteiros de novo, sem cache. Agora o servidor: (1) manda o HTML comprimido — brotli ~523 KB (6× menor) para navegadores modernos, gzip ~700 KB de fallback; (2) usa cache com revalidação por ETag de conteúdo, então recarregar a mesma versão responde 304 (~0 byte) em vez de rebaixar tudo — e um deploy novo (ETag muda) aparece na hora; (3) comprime também as respostas JSON grandes da API (klines/trades/footprint/depth_history). O brotli é gerado UMA vez fora do event loop, então não trava o servidor. Nada do HTML/1.184 foi reescrito — o render (já otimizado com um único frame por paint desde a 1.181) ficou intacto de propósito, porque a fluidez de interação precisa ser medida no site no ar antes de mexer no código frágil do gráfico. Só servidor (+ este changelog)." },
  { version: "Beta 1.554", note: "Oscillator Divider Release Fix: corrige o divisor vertical dos osciladores que continuava preso ao mouse depois de soltar; o drag agora encerra por pointerup, mouseup, pointercancel, lostpointercapture, blur, troca de aba e também automaticamente quando o mouse já está sem botão pressionado. Um novo clique encerra qualquer drag residual, o canvas libera o pointer capture e os eventos do gráfico não disputam mais o mesmo gesto. Visual e mobile preservados. Só frontend." },
  { version: "Beta 1.554", note: "Desktop Positions Detail + Trade Labels Fix: mantém as estatísticas/detalhes da posição dentro da própria aba Positions, encaixadas na parte inferior sem cobrir o gráfico; corrige o X do trade aberto com captura de pointerup antes do canvas; amplia novamente labels TP/ENTRY/SL, tipografia, X e controles no desktop; preserva o mobile. Só frontend." },
  { version: "Beta 1.554", note: "Desktop Paper Trade Controls Fix: torna os botões de confirmar/cancelar do TP, SL e ordens draft realmente clicáveis no mouse ao executar a ação no pointerup antes dos handlers do gráfico; impede o canvas de engolir o clique; aumenta no desktop os labels TP/ENTRY/SL e os botões de confirmação para leitura e uso confortáveis, preservando o tamanho mobile. Só frontend." },
  { version: "Beta 1.554", note: "Desktop Interaction Fix: corrige o dropdown TF removendo handlers duplicados que abriam e fechavam no mesmo clique; o botão Copilot agora alterna abrir/fechar como Scanner, Positions e Watchlist; elimina atraso do crosshair no mouse e o leve travamento ao mover o gráfico ao trocar o agendamento de render por um único frame pendente, sem cancelar o frame a cada pointermove; remove o RAF extra do hover e desativa o long-press mobile durante drag com mouse. Mobile preservado. Só frontend." },
  { version: "Beta 1.554", note: "Desktop Alignment + Right Dock Fix: alinha todo o cabeçalho em uma única linha central com alturas e espaçamentos consistentes; aplica o layout desktop apenas pela largura da tela para não depender da detecção de mouse do navegador; trava Scanner, Copilot, Positions, Watchlist e Trade no painel direito; corrige o Scanner Pro para escalar pela largura real do dock; corrige o painel de Trade para abrir à direita com controles, métricas, Buy/Sell e liquidações organizados em grades alinhadas. Mobile preservado. Só frontend." },
  { version: "Beta 1.554", note: "DESKTOP PRO completo: o PC agora tem layout próprio em vez do mobile esticado. Cabeçalho horizontal em tamanho legível, navegação vertical fixa à esquerda, gráfico ocupando toda a área útil e Copilot/Scanner/Positions/Watchlist/Trade docados à direita sem cobrir o gráfico. O painel direito pode ser redimensionado pelo mouse. Interações de desktop adicionadas: zoom suave pela roda ancorado no cursor, zoom vertical na escala de preço, Shift+roda para navegar no tempo, crosshair instantâneo no hover sem roubar o drag, arrastar para mover, duplo clique para auto-fit, menu de contexto do gráfico, cursores corretos e atalhos de teclado. Mobile preservado porque tudo roda apenas em tela grande com mouse fino. Só frontend." },
  { version: "Beta 1.554", note: "Desktop estilo TradingView — ETAPA 2 (navegação lateral): no PC o rodapé (Copilot/Scanner/Trade/Positions/Watchlist) deixou de ser uma pílula embaixo e virou uma BARRA DE ÍCONES VERTICAL na lateral esquerda, começando abaixo do cabeçalho — igual ao sidebar do TradingView. O gráfico fica grande no centro e a página escolhida abre no painel à direita. Agora dá pra navegar entre Copilot/Scanner/Positions com o gráfico sempre visível. Verificado renderizando de verdade. Mobile intacto (só min-width:1000px)." },
  { version: "Beta 1.554", note: "Desktop estilo TradingView — ETAPA 1 (barra de cima): antes os botões inchavam no PC porque o cabeçalho escala por uma unidade (var(--px)) que no PC batia no teto e aumentava tudo ~38%. Agora, em telas grandes, essa unidade fica travada num tamanho compacto e o seletor de ativo para de esticar na largura toda — a barra superior fica enxuta e encostada à esquerda (símbolo + timeframes + Velas/Indicadores/Desenhos), em tamanho normal de desktop, com o gráfico grande embaixo. Verificado renderizando de verdade. Próximas etapas: rodapé virar abas de ícone na lateral, régua de ferramentas de desenho à esquerda. Mobile intacto (só min-width:1000px)." },
  { version: "Beta 1.554", note: "PORT DESKTOP DE VERDADE (substitui a coluna centralizada da 1.175): agora em telas grandes (a partir de 1000px) o app vira um TERMINAL de 2 colunas — o gráfico ocupa a tela toda (grande de verdade) e as páginas (Copilot, Scanner, Positions, Watchlist) docam num PAINEL LATERAL fixo à DIREITA, ao lado do gráfico, em vez de cobrir tudo em tela cheia como no celular. O rodapé de navegação fica na base da coluna do gráfico. Assim dá pra ver o gráfico E o Copilot/Scanner ao mesmo tempo, tipo TradingView/Binance. Verificado por render real no navegador (gráfico à esquerda + painel à direita). Continua tudo dentro de @media (min-width:1000px) — no CELULAR nada muda. Só frontend." },
  { version: "Beta 1.554", note: "PC: o app parou de esticar feio na tela larga. Antes, no computador, cabeçalho/gráfico/rodapé espalhavam na largura inteira (era 100% mobile). Agora, em telas grandes (a partir de 900px), o app fica centralizado numa coluna com proporção de aplicativo (480px), com um fundo suave em volta e uma sombra de moldura — cabeçalho, gráfico, rodapé, Copilot, Scanner e Positions todos alinhados na mesma coluna. A centralização usa margin (não transform), então as animações de abrir/fechar continuam funcionando. Importante: TUDO isso está dentro de um @media (min-width:900px) — no CELULAR nada muda, continua igualzinho. Só frontend." },
  { version: "Beta 1.554", note: "Novo 3º tipo de backtest: '🎯 Combinado' — junta os TRÊS ao mesmo tempo: gatilho pré-volume + RSI na zona + entrada perto de uma linha do Volume Profile (VAL/POC/VAH). Um sinal só conta quando as três coisas batem (confluência). Varre zona × linha × distância × janela × lado × alvo, long e short cada um $1000, com o mesmo critério anti-sorte (verde no treino E no teste) e mínimo de trades REFORÇADO — porque confluência deixa os sinais raros e amostra pequena engana. Roda no volume REAL do MEXC (não tick volume). É só escolher '🎯 Combinado' no seletor de tipo. Backend + frontend." },
  { version: "Beta 1.554", note: "CONSERTA o backtest travando no 5m e não rodando em 2 anos. Causa raiz: a montagem dos sinais refazia a conta em cima de TODO o histórico a cada vela (O(n²)) — no 5m/2 anos (100 mil+ velas) isso levava mais de 3 MINUTOS, então o poll do app desistia e dava 'erro'. Agora usa uma janela fixa de 500 velas (mais que suficiente pras médias), o que deixou O(n): o RSI 5m/2anos caiu de ~211s pra ~33s e o VP pra ~1,5s. Além disso: (1) cada teste passou a usar no máximo os 1500 sinais mais recentes (o card avisa quando corta), pra o tempo ser previsível em qualquer TF; (2) a busca de candles ganhou timeout de 15s por página, pra uma página travada não pendurar o run de 2 anos pra sempre; (3) o app não desiste mais no primeiro erro de rede — tenta de novo várias vezes antes de mostrar erro. Backend + frontend." },
  { version: "Beta 1.554", note: "PERFORMANCE do backtest: agora quando você roda um grid (VP ou RSI Exaustão), ele PULA os diagnósticos caros que você nem estava olhando naquele momento (3× o otimizador de 640 combos, calibração, mineração e o RSI-confirm) — esse era o maior peso. Além disso, no BTC (1 ativo) a conta base deixou de ser calculada DUAS vezes (era per-ativo + agregado idênticos), e cada sinal só monta a janela de velas que aquele teste precisa (VP não carrega mais a janela do RSI e vice-versa). No grid de RSI, os combos com push=0 (que independem do volume) deixaram de ser recalculados 30× à toa. Resultado: bem mais rápido, mesmo resultado." },
  { version: "Beta 1.554", note: "Novo seletor de TIPO de teste no card do backtest: '📊 Volume Profile' ou '📈 RSI Exaustão'. O RSI Exaustão testa pré-volume baixo + o SEU oscilador (comprimento × push × spike × médVol × zonas × alvo), SEM Volume Profile — é a versão mais portável pro MT5, e serve pra ver se o seu RSI segura sozinho. Aplicei o MESMO critério anti-sorte do VP também no RSI: só conta como 'seguro' se for VERDE no treino E no teste, ranqueado pelo pior dos dois. Continua com os chips de TF (5m/15m/30m/1h) e Período (1/2 anos). Testes separados, não misturam." },
  { version: "Beta 1.554", note: "Backtest de Volume Profile agora aceita 2 ANOS (a pedido): novo seletor de Período (1 ano / 2 anos) abaixo dos chips de TF. 2 anos = mais sinais = teste mais robusto. O limite do backend subiu pra 760 dias. Obs.: no 5m, 2 anos pode ficar um pouco abaixo do período cheio por limite de dados/velas, mas nos outros TFs (15m/30m/1h) pega os 2 anos completos." },
  { version: "Beta 1.554", note: "Backtest de Volume Profile com critério ANTI-SORTE: antes eu ranqueava os combos só pelo resultado do TESTE, então o vencedor às vezes tinha treino vermelho e teste verde — isso é sorte de teste (escolher o melhor de 800+ combos no teste), não edge de verdade. Agora um combo só conta como 'seguro' se for VERDE no TREINO **E** no TESTE, e o ranking é pelo PIOR dos dois (o mais conservador). Se nenhum combo passa nesse filtro, o lado mostra em vermelho 'NADA confiável' em vez de te vender um falso positivo. Assim o card para de enganar. Só afeta o backtest de VP." },
  { version: "Beta 1.554", note: "Novo backtest de VOLUME PROFILE (e removi o Grid gigante de RSI): a tese do gráfico — spike pós pré-volume-baixo PERTO da região do VAL costuma correr pra cima. Agora o cartão reconstrói o mesmo Volume Profile da plataforma (POC/VAH/VAL, fiel ao gráfico) em cada sinal de 1 ano do BTC e mede quão perto o spike entrou de cada linha. Varre VÁRIAS combinações — linha (VAL/POC/VAH) × distância até a linha (em ATR) × lado (abaixo/acima/qualquer) × janela do perfil × alvo — pra cada direção, e mostra o combo MAIS LUCRATIVO de long e de short (cada um $1000), ranqueado pelo teste fora da amostra, com a tabela dos melhores. Continua com os chips de TF (5m/15m/30m/1h) — o VP é calculado no TF escolhido. É um teste SEPARADO, não mistura com o de RSI. Backend + frontend — dvl-scanner reinicia sozinho pelo deploy." },
  { version: "Beta 1.554", note: "Grid GIGANTE de RSI agora roda em vários timeframes: 5m, 15m, 30m e 1h (a pedido). Aparecem uns botõezinhos de TF em cima do botão do grid — escolhe o TF e roda; ele busca ~1 ano daquele candle no BTC e varre as mesmas 60.480 combinações (RSI + pré-volume) naquele TF, long e short cada um $1000. O oscilador é reconstruído no próprio TF escolhido (a exaustão é calculada nas velas daquele TF). Obs.: no 5m, por causa do volume de dados/tempo, o período pode ficar um pouco menor que 1 ano cheio, mas ainda é uma amostra bem grande. Backend + frontend — exige o dvl-scanner reiniciado (agora automático pelo deploy)." },
  { version: "Beta 1.554", note: "Backtest simplificado: tirei o backtest anual de VÁRIOS ativos (BTC/ETH/SOL/BNB/XRP) e deixei UM só — o Grid GIGANTE de RSI no BTC. E potencializei ao máximo: agora são 60.480 combinações de RSI + pré-volume varridas (comprimento 14 valores × push 9 × spike de volume 6 × média de volume 5 × zonas 8+8), cada uma ainda testando 8 alvos por dentro. Long e short continuam separados, cada um com $1000, ranqueados pelo teste fora da amostra, mostrando a config COMPLETA vencedora de cada lado + a tabela das melhores. Um clique só: '🔬 Grid GIGANTE de RSI · BTC'. Roda ~15–40s em background (pode sair da tela). Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "O Grid de RSI agora varre TODOS os inputs do oscilador da plataforma, não só o comprimento. Antes só mexia no comprimento e na zona; agora testa combinações de comprimento × push × spike de volume × média de volume × zona de sobrevenda × zona de sobrecompra × alvo — os mesmos parâmetros que ficam em Filtros. Pra isso cada sinal do backtest anual passou a guardar a janela de velas de 15m, então o valor do oscilador é RECONSTRUÍDO em cada combinação (o push, o spike e a média de volume agora movem o valor de verdade). Long e short continuam separados, cada um $1000, ranqueados pelo teste fora da amostra, e o cartão mostra a config COMPLETA vencedora de cada lado (RSI, push, spike, médVol, zona, alvo) + a tabela das melhores. Obs.: no histórico anual a exaustão é calculada no próprio 15m (sem a granularidade de 1m), mas todos os parâmetros influenciam. Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Novo: GRID DE RSI massivo em 1 ativo/1 ano, a pedido ('uma caralhada de combinação'). Um botão '🔬 Grid de RSI' no cartão do backtest varre um monte de combinações — comprimento do RSI (5,7,9,11,14,18,21,28,35) × zona (sobrevendido/sobrecomprado) × alvo — em cima de ~1 ano de 15m do ativo que está no gráfico. A direção sai da PRÓPRIA zona do RSI (sobrevendido→LONG, sobrecomprado→SHORT, sua regra), e LONG e SHORT são otimizados SEPARADAMENTE, cada um com $1000. Mostra o melhor RSI de cada lado (comprimento + zona + alvo), o resultado no TESTE fora da amostra, e uma tabelinha com as melhores combinações ranqueadas pelo teste. Ideal pra descobrir 'qual valor de RSI presta pra long e qual pra short' nesse ativo. Detalhe: no histórico anual o RSI é 15m base (sem push de 1m), então o que varia de verdade é o comprimento e a zona. Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Backtest anual agora quebra o resultado POR ATIVO, a pedido: cada um dos 5 (BTC, ETH, SOL, BNB, XRP) roda com $1000 PRÓPRIO (conta separada, não compartilhada), com LONG e SHORT separados e mostrando os vários tipos de saída testados (Scalp/Equilibrado/Runner/Adaptativo — cada um com o alvo/trailing que rendeu). Cada cartão de ativo mostra o ganho/perda ($ e %), a taxa de acerto e o drawdown do lado long e do short em separado, além da melhor saída escolhida. Continua tendo a visão agregada (os 5 juntos) com o otimizador fora da amostra e a separação long/short do 1.161. Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Novo: BACKTEST ANUAL em 5 ativos (BTC, ETH, SOL, BNB, XRP), a pedido, usando os MESMOS critérios do backtest ao vivo (spike pós-flat confirmado no fechamento + RSI Exhaustion 15m). Um botão '📅 Backtest anual' no cartão do backtest busca ~1 ano de velas de 15m de cada ativo pelo backend, detecta cada sinal do histórico, lê o RSI e resolve o trade pelas próprias velas seguintes — e roda toda a análise (melhor modo, otimizador fora da amostra, calibração, mineração de edge e a separação long/short do 1.161) em cima disso. Mostra o resultado por ativo e no total, e dá pra voltar pro ao vivo a qualquer momento. Detalhe honesto: pra um ano inteiro não dá pra baixar o 1m, então o RSI usa a base de 15m sem o empurrão intraday (o valor fica um tiquinho diferente do gráfico, mas a zona sobrevendido/sobrecomprado fica próxima); o gatilho e o resultado dos trades são 100% fiéis. É pesado (busca muito candle), então roda em segundo plano com uma barrinha e guarda o resultado por 10 min. Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Separa o resultado do backtest por LADO, a pedido — os shorts estavam puxando o edge do long pra baixo. Antes o melhor modo, o take-profit e o gatilho eram otimizados no conjunto MISTURADO (long+short) e depois aplicados a cada lado, então o número do long vinha diluído pelo short ruim. Agora CADA direção é otimizada SOZINHA: o long acha o melhor combo só com os trades de long, o short idem, e cada um é validado fora da amostra por conta própria. No cartão do backtest, os quadros Pré-pump (long) e Pré-short (short) passam a mostrar o resultado já separado, e aparecem dois blocos 'Melhor combo LONG' e 'Melhor combo SHORT' independentes, além do combo geral (long+short) pra comparar. Assim dá pra ver o edge real do long sem o short mascarando. Backend + frontend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Conserta posições (demo) que continuavam ABERTAS mesmo depois do TP ou SL bater. Antes o TP/SL só era conferido no tick do PRÓPRIO ativo — se você estava vendo outro gráfico, ou o preço daquele ativo caía num slot com a chave gravada diferente, o alvo batia e a posição não fechava. Agora tem uma varredura a cada 1s que passa por TODA posição aberta, pega o último preço em cache de cada ativo e fecha na hora quem bateu TP/SL — não importa qual ativo está na tela nem por qual fonte veio o preço. E ao fechar, o pedido é removido de TODOS os slots (podia estar salvo sob uma chave crua/antiga e voltar a aparecer aberto) — então trade fechado não ressuscita. Só frontend." },
  { version: "Beta 1.554", note: "O backtest para de demorar DIAS pra achar sinais. Antes o scanner só gravava o sinal da vela ATUAL a cada ciclo, e cada um leva ~5h (20 velas de 15m) pra 'resolver' — então os sinais completos pingavam devagar e um RSI que você operou agora não aparecia tão cedo. Agora o backend faz um BACKFILL HISTÓRICO: em toda varredura ele minera TODAS as velas de 15m já baixadas (janela de ~160 velas ≈ 40h por ativo), acha cada spike pós-flat confirmado no fechamento, lê o RSI Exhaustion naquele momento e RESOLVE o sinal usando as próprias velas seguintes (o futuro já é conhecido no histórico). Resultado: centenas de sinais completos aparecem de imediato, em vez de acumular ao vivo. É idempotente (não duplica entre ciclos nem após reiniciar). Backend — EXIGE atualizar e reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Conserta o 'Preço atual' e o PnL que apareciam como '--' em algumas posições. Dois motivos: (1) o painel procurava o preço pela chave do símbolo SEM normalizar — uma ordem gravada como 'TRX/USDT' virava a chave 'TRX/USDT', mas o mapa de preços é indexado por 'TRXUSDT', então não achava e ainda mostrava o par com barra dupla ('TRX//USDT'). Agora o símbolo é normalizado (bate a chave e o nome sai certo). (2) O preço das posições que NÃO são o ativo do gráfico vinha só da Binance — então ativo só-MEXC (ex.: ANSEM) nunca tinha preço, e pior: um símbolo inválido no lote fazia a Binance recusar o request inteiro (aí nem o TRX vinha). Agora, pra toda posição aberta que continua sem preço, a gente puxa do mapa de preços da MEXC pelo backend — a mesma fonte que o resto do app já usa. Só frontend." },
  { version: "Beta 1.554", note: "Acha o motivo REAL do indicador que voltava sozinho: o DVL AGG OI (Open Interest) se forçava LIGADO em toda inicialização. Ele lia o estado salvo e, se estivesse desligado, reescrevia on:true no boot (e ainda regravava isso no localStorage) — então você desligava, recarregava e ele voltava, e nem o Salvar segurava. Tirei esse force-on: o padrão continua ligado pra quem nunca mexeu, mas quem DESLIGA de propósito agora fica desligado após recarregar. Junto com o 1.155 (a restauração não sobrescreve mais o que você mudou por último), os indicadores que você tira ficam tirados. Só frontend." },
  { version: "Beta 1.554", note: "Conserta o aviso de 'Nova versão' que ficava pedindo pra atualizar TODA HORA pra uma versão ANTERIOR. O verificador comparava a versão como texto e só olhava se era DIFERENTE — então, quando o servidor estava servindo um arquivo mais antigo por um instante (deploy no meio do caminho ou os dois caminhos servidos fora de sincronia), ele achava que 1.154 era 'nova' e insistia em te rebaixar. Agora a versão é comparada como NÚMERO (major.minor de verdade, então 1.16 não passa na frente de 1.155) e o aviso SÓ aparece pra ir pra frente — nunca pra trás. Só frontend." },
  { version: "Beta 1.554", note: "Conserta DE VERDADE a busca de ativos e o Salvar (achei a causa raiz dos dois testando a página num navegador de verdade). (1) BUSCA: o código do filtro rodava certo, mas escondia o item com um display:none COMUM — e existe uma regra CSS .assetOption{display:grid!important} que vencia o none, então a lista NUNCA sumia por mais que você digitasse. Agora escondo com prioridade !important (e mostro removendo o inline), então digita SOL e a lista filtra na hora. (2) SALVAR: a restauração da sessão (1.153) estava SOBRESCREVENDO o estado vivo com um snapshot antigo — por isso um indicador que você tirava DEPOIS do último Salvar RESSUSCITAVA ao recarregar. Os indicadores já guardam o próprio estado no localStorage (que sobrevive ao reload sozinho), então agora a restauração SÓ preenche o que está faltando e nunca passa por cima do que você mudou por último: tirou o indicador, ele fica tirado. Só frontend." },
  { version: "Beta 1.554", note: "Conserta a busca de ativos que não filtrava. A lista de ativos é re-renderizada ao vivo (os preços atualizam sozinhos), e cada re-render recriava a lista e apagava o filtro — então você digitava e a lista voltava cheia. Agora o texto da busca fica guardado e o filtro é RE-APLICADO depois de cada atualização, então ele gruda: digita SOL/Solana e a lista filtra e continua filtrada. Abre sempre com a lista completa. Só frontend." },
  { version: "Beta 1.554", note: "O botão Salvar agora SALVA de verdade a sessão. Antes ele gravava, mas nada era restaurado ao recarregar — então, por exemplo, um indicador que você tirava voltava. Agora, assim que a página carrega (antes dos indicadores ligarem), a gente restaura o último estado salvo: indicadores ligados/desligados, desenhos e configs voltam exatamente como você deixou quando clicou em Salvar. Funciona como um ponto de restauração: o que você mudar DEPOIS de salvar, sem salvar de novo, volta pro último save ao recarregar. Só frontend." },
  { version: "Beta 1.554", note: "Adiciona uma barra de PESQUISA no seletor de ativos (Assets): dá pra digitar o símbolo (ex.: SOL) ou o nome (ex.: Solana) e a lista filtra na hora. Mostra 'Nenhum ativo encontrado' quando não bate nada. Só frontend." },
  { version: "Beta 1.554", note: "Backtest no modo Só sinais completos agora roda em PRELIMINAR a partir de 8 sinais completos (antes travava em aguardando até 20), com um aviso amarelo de amostra pequena. Assim dá pra ir vendo a análise do RSI enquanto os sinais acumulam, sem confiar 100% ainda. Contexto: os completos sobem devagar de propósito — um sinal só conta depois de RESOLVER (20 velas = ~5h no 15m), e o spike confirma no fechamento. Backend (exige reiniciar o dvl-scanner)." },
  { version: "Beta 1.554", note: "Corrige por que só poucos sinais ficavam 'completos' (com leitura de RSI) no backtest. O scanner gravava sinais em TODOS os timeframes (1m, 3m, 5m, 15m…), mas só o 15m carrega a leitura do RSI Exhaustion — então os sinais de 1m/3m/5m entravam SEM RSI e nunca ficavam completos, inflando o total (ex.: 2818) e deixando a fração de completos minúscula (ex.: 12). Como todo o modelo é 15m + RSI, agora o scanner grava sinais SÓ no 15m: todo sinal novo já vem com a leitura do RSI, ou seja, todo sinal novo é completo. Isso NÃO adiciona os antigos de uma vez (eles vão acumulando conforme novos spikes pós-flat de 15m disparam), mas para de diluir e faz a fração de completos subir de verdade daqui pra frente. Enquanto acumula, dá pra desligar 'Só sinais completos' pra rodar o backtest com todos os sinais já resolvidos. Backend (exige reiniciar o dvl-scanner)." },
  { version: "Beta 1.554", note: "Duas coisas no scanner. (1) Novo BLOQUINHO de RSI: além de pré-volume (V) e spike (S), agora tem o bloco R do RSI Exhaustion — ele acende quando o oscilador (15m) está numa zona, VERDE = sobrevendido e VERMELHO = sobrecomprado. Entra no score junto com os outros dois, então quando bate os três (pré-volume + spike + RSI na zona) o score vai a 99 e a confluência vira 🔥 3/3. O peso do bloco RSI é editável em Filtros > Pesos dos blocos. (2) As médias do scanner agora seguem À RISCA as do indicador DVL Volume: o comprimento das médias de volume (rápida e lenta) que você define no DVL Volume é empurrado pro motor do scanner, então o spike/ignição e o marcador 'spike pós-flat' usam exatamente as mesmas médias que aparecem no gráfico (antes o scanner tinha as dele, fixas). Só frontend." },
  { version: "Beta 1.554", note: "Conserta o botão 'Salvar' do cabeçalho, que não fazia NADA (nem salvava, nem avisava). Motivo: o handler do botão chamava window.saveProfile, mas a função saveProfile vivia dentro de um IIFE e nunca era exposta no window — então o clique caía no vazio. Agora saveProfile é exposta corretamente, então o botão salva a sessão (símbolo, TF, desenhos, configs e um snapshot no navegador) e mostra uma mensagem breve ('Sessão salva ✓') que some sozinha depois de ~1,8s. Só frontend." },
  { version: "Beta 1.554", note: "Estabiliza o histograma de VOLUME que ficava mudando a cada segundo. A escala do painel (volMax) incluía a vela AO VIVO: conforme o volume da vela em formação crescia, o máximo subia e TODAS as barras fechadas encolhiam — e quando abria vela nova elas voltavam, dando a impressão de que o volume inteiro ficava mexendo. Agora a escala usa só as velas FECHADAS (a vela ao vivo é detectada pelo horário de fechamento, então continua certo mesmo com scroll), e a barra ao vivo é limitada à altura do painel — ela continua visível no topo sem esmagar as outras. As barras fechadas param de balançar. Só frontend." },
  { version: "Beta 1.554", note: "Conserta o DVL Exhaustion RSI que ficava se MEXENDO sozinho (a linha inteira mudava de forma e o valor pulava 48→49→50 sem o preço andar). Causa: o oscilador reamostrava os dados de 1m em timeframes menores AGRUPANDO POR POSIÇÃO no array (fatias de N velas a partir do índice 0). Como o gráfico rebusca o 1m a cada ~25s numa janela deslizante, cada rebusca reagrupava velas diferentes → a exaustão de TODAS as barras históricas mudava e a linha do RSI balançava. Agora reamostra por RELÓGIO (cada barra de 3m/5m/15m sempre contém as mesmas velas de 1m do mesmo horário), então o oscilador fica estável entre atualizações — o valor só muda quando o preço realmente muda. Apliquei a mesma correção no RSI do backend (scanner) pra os dois continuarem batendo. Frontend + backend (exige reiniciar o dvl-scanner)." },
  { version: "Beta 1.554", note: "Conserta o marcador de spike pós-flat do DVL Volume que ficava PULANDO entre velas (aparecia numa vela, sumia, ia pra outra e voltava). A regra 'só velas fechadas' cortava cegamente o último item do array — mas o feed às vezes inclui a vela ao vivo e às vezes não, então a última vela FECHADA entrava e saía do destaque a cada atualização. Agora a decisão é pelo TEMPO: a última vela só é ignorada se o fechamento dela ainda não passou (duração inferida do espaçamento entre velas). Assim uma vela fechada é sempre marcada de forma consistente, com ou sem a vela em formação no array — o destaque para de pular. Só frontend." },
  { version: "Beta 1.554", note: "Conserta a RÉGUA que ficava sempre em 0%. A conta da porcentagem dividia pelo maior valor entre o preço inicial e 1 (Math.max(preço, 1)) — então em qualquer ativo abaixo de $1 (quase toda cripto da MEXC: AIOT 0.037, ZBT 0.097, DODO 0.026…) ela dividia por 1 em vez do preço real, e a % saía perto de zero, arredondando pra 0.00%. Agora divide pelo preço inicial de verdade (com proteção só contra preço exatamente zero), então a régua mostra a variação correta em qualquer faixa de preço. Só frontend." },
  { version: "Beta 1.554", note: "O tempo 'Spike há' do scanner agora conta a partir do ÚLTIMO spike pré-volume+flat (a vela de ignição confirmada no fechamento), não da primeira vez que a moeda entrou na lista. Se a mesma moeda dá um novo spike pós-flat mais tarde, o tempo reseta pro spike mais recente (e ela sobe pro topo). Além disso o tempo passa a ser ancorado na hora de fechamento da própria vela de ignição (igual ao candle do gráfico), em vez da hora em que o scan rodou. Só backend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "Faz o sinal de spike do scanner BATER com o marcador do gráfico. O gráfico só marca 'spike pós-flat' em velas FECHADAS (confirma no fechamento da vela); o scanner estava detectando na vela AO VIVO (extrapolava o volume da vela em formação), então acendia antes e divergia — e às vezes sumia se o volume não se sustentava. Agora o scanner confirma o spike pós-flat só na última vela de 15m FECHADA, com o MESMO cálculo do marcador do gráfico (calmaria abaixo da média + primeiro cruzamento acima), igual à sua regra 'no fechamento do candle'. O score de spike ao vivo continua aparecendo pra tabela não ficar vazia no meio da vela, mas o SINAL (o que entra na lista e é gravado) só dispara no fechamento. Sobre o RSI: a fórmula do scanner é idêntica à do oscilador — o que faz não bater é o input 'Calculation TF' do Exhaustion RSI do gráfico, que vem como 'Chart' (segue o TF que você está olhando). O scanner é fixo em 15m, então deixe o gráfico em 15m (ou ponha o Calculation TF do oscilador em 15m) pra os dois casarem. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Limpa o menu Filtros do Scanner pra bater com o novo tipo de varredura (RSI da plataforma + pré-volume/spike). Tirei tudo que era do modelo antigo: Mercado (presets), TF detecção (fica fixo em 15m), Spike mínimo, Máximo de ativos, Spike acima da média e as Entradas do motor antigas (MA rápida/lenta, RSI(14) sobrevenda/lookback, médias de OI e LSR). Ficou só o que importa agora: os inputs do RSI Exhaustion (comprimento, push, spike de volume, média de volume e as zonas de sobrecompra/sobrevenda) e, embaixo, os Pesos do score e os Pesos dos blocos do Spike Score. Os valores antigos seguem nos defaults por baixo (ainda vão pro backend), só saíram da tela. Só frontend." },
  { version: "Beta 1.554", note: "Scanner refeito em cima do RSI da plataforma, a pedido. (1) Tirei as colunas OI e LSR da tabela — as setinhas não faziam mais sentido pro seu operacional. (2) A coluna RSI agora mostra o RSI Exhaustion DA PLATAFORMA (15m), com a cor do oscilador no momento da leitura: VERDE quando está sobrevendido (exausto no fundo) e VERMELHO quando sobrecomprado (exausto no topo). Agora aparece em TODAS as moedas do scanner, não só nas que dispararam — assim você vê sobrevenda/sobrecompra a todo momento. (3) Dentro de Filtros tem os MESMOS inputs do oscilador (comprimento, push, spike de volume, média de volume e as zonas de sobrecompra/sobrevenda) pra você calibrar o RSI que é calculado. (4) O card do ML parou de seguir o modelo antigo (só pré-volume+spike em ATR) e passou a seguir o RSI: pré-pump lista as sobrevendidas, pré-short as sobrecompradas, ⚡ marca quando o spike pós-flat fechou (o gatilho). Padrão: RSI sobrevendido + spike pós-flat no fechamento = compra; RSI sobrecomprado + spike pós-flat = venda. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Agora dá pra rodar o backtest só nos sinais NOVOS — os que já carregam a leitura do RSI Exhaustion (15m) e a trajetória exata do preço. Um botão 'Só sinais completos' no topo do cartão de backtest alterna a visão: ligado, toda a análise (modos, otimizador, heatmap, calibração, mineração e o filtro do RSI) roda apenas nesses sinais completos; desligado, volta a usar todos os ~900 sinais resolvidos. Nada é apagado — é só um filtro reversível, sua escolha fica salva. O cartão mostra quantos sinais completos existem do total. Assim você acompanha o backtest 'reiniciado' no formato novo sem perder o histórico. Backend + frontend (exige reiniciar o dvl-scanner)." },
  { version: "Beta 1.554", note: "Traz o RSI pra aba do modelo (ML) pra você acompanhar ali mesmo: cada moeda das listas pré-pump/pré-short mostra a leitura do RSI Exhaustion (15m) — ex.: [RSI 31] —, verde quando o oscilador confirma a direção (long = exausto embaixo, short = exausto no topo) e cinza quando neutro. Embaixo, uma linha de status com a melhor config aprendida no backtest (comprimento e zonas) e o resultado fora da amostra. Só aparece a leitura das moedas cujo sinal disparou no 15m (o RSI é lido no disparo). Só frontend." },
  { version: "Beta 1.554", note: "Sua descoberta virou sistema: RSI Exhaustion (15m) + pré-volume/spike, no backtest E no scanner. Portei o oscilador Exhaustion RSI fiel pro backend (mesma fórmula do gráfico: RSI dos closes + push de exaustão multi-TF, TF fixo em 15m). No BACKTEST tem um bloco novo que VARRE os inputs do RSI (comprimento, push e as zonas de long/short) e mostra a melhor config validada FORA da amostra, comparando com o resultado sem o filtro do RSI — assim dá pra ver se o RSI realmente adiciona edge. No SCANNER, o cartão pré-pump/pré-short marca com 'RSI' as moedas onde o Exhaustion confirma a direção (long = exausto embaixo, short = exausto no topo). O gatilho do sinal continua sendo só pré-volume+spike; o RSI entra como confirmação em cima, com os parâmetros do gráfico. Só vale pra sinais NOVOS (o RSI é lido no disparo). Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Corrige a taxa do backtest pro valor REAL da MEXC: taxa taker de 0.02%/lado (antes eu tinha 0.04%, o dobro). Com slippage de 0.02%/lado, o custo total por trade cai de ~0.12% pra ~0.08% round-trip — mais justo com a corretagem de verdade. Isso deixa o edge um pouco menos penalizado no backtest. (Dá pra ajustar taxa/slippage por query se você tiver desconto do token MX, que zera mais ainda.) Só backend — exige reiniciar o dvl-scanner." },
  { version: "Beta 1.554", note: "O modelo agora é PURO pré-volume + spike, a pedido. Tirei RSI, OI, LSR, variação 24h e priceGlue das features — o modelo só olha o que é volume: barras de calmaria (pré-volume), planura da base, força do spike, força do cruzamento e spike vs volume anterior (5 features, todas de pré-volume+spike). O gatilho de sinal já era só pré-volume+spike (volBelowMaBars + cruzamento acima da média); agora a previsão e a análise 'onde está o edge' também são 100% disso — nada de RSI/OI/LSR aparece mais. Os 900+ sinais já resolvidos foram migrados (o resultado deles não muda, só reencaixei as features); o modelo antigo foi descartado e retreina do zero nas 5 features. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Mais TIPOS de saída no otimizador (além de bracket, breakeven e trailing): (1) PARCIAL/scale-out — realiza metade no primeiro alvo e deixa a runner correr com stop no zero a zero + trailing (o 'tira metade e segura o resto'); (2) SAÍDA POR TEMPO — fecha depois de N velas se não bateu alvo/stop, em vez de segurar até o fim do horizonte. Agora o otimizador testa ~640 combos em 5 famílias diferentes e valida o melhor fora da amostra como antes. O bloco 'Melhor combo' descreve o tipo escolhido (ex.: 'parcial: 50% em 2× + trailing 1×' ou 'stop 1× / alvo 3× · sai em 8 velas'). Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Análise MUITO mais profunda no backtest (a pedido). Duas camadas novas que um quant usa quando o backtest simples dá vermelho: (1) CALIBRAÇÃO — separa os sinais por faixa de expectativa que o modelo previu e mostra, em cada faixa, o movimento REAL médio e quantas vezes chegou no previsto. Revela se o '4× ATR' do modelo bate com a realidade (spoiler comum: ele superestima, e essa é a raiz do problema — não o TP/SL). (2) ONDE ESTÁ O EDGE — quebra os sinais por CADA feature (RSI, força do spike, barras de calmaria, OI…), acha as condições que mais melhoram o resultado e valida cada uma no teste fora da amostra; marca com ✓ as que seguram no teste. Assim você vê se o edge está escondido num subconjunto (ex.: só RSI baixo) em vez de operar tudo. Também adicionei profit factor, ganho/perda médio e maior sequência de perdas no motor. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Agora o backtest usa TODOS os sinais resolvidos do modelo (antes o modo Adaptativo/trailing só usava os que tinham trajetória de preço guardada — os novos — e por isso aparecia com poucos trades tipo 76 de 900+). O trailing e o breakeven passaram a rodar também nos sinais antigos via uma aproximação conservadora do resumo (subiu/desceu em ATR): quando tem a trajetória exata, usa ela; quando não tem, aproxima sem inflar o resultado. Assim todos os modos e o otimizador enxergam a base inteira. Também tirei do scanner mais ações/ETFs tokenizados que apareciam (NVIDIA, TESLA, EWY, DRAM, MICROSTRATEGY, COINBASE, MICRON…). Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "OTIMIZADOR de saída (o 'machine learning de TP/SL' que você pediu): em vez de modos fixos, ele varre CENTENAS de combos de saída — stop × alvo, com/sem breakeven, e trailing — num motor unificado, e escolhe o melhor. E, o mais importante, com trava anti-autoengano: separa os sinais em TREINO (mais antigos) e TESTE (mais novos, nunca vistos), otimiza no treino e mostra o resultado no teste (walk-forward). Se o combo dá +34% no treino mas -8% no teste, o card diz 'não generaliza — foi curve-fitting'. Só vale confiar quando o TESTE também é verde. Novo bloco 'Melhor combo — validado fora da amostra' com treino vs teste e veredito. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Duas coisas no backtest: (1) modo ADAPTATIVO — um trailing stop em ATR, que em vez de alvo fixo sobe o stop atrás do preço, deixa o lucro correr e protege quando vira; entra na comparação de modos junto com Scalp/Equilibrado/Runner e costuma ganhar em drawdown. (2) MAPA DE CALOR sem pontos cegos: em vez de só alguns pontos, mostra o retorno líquido de TODA combinação de stop × alvo numa grade colorida (verde lucro, vermelho prejuízo, ★ no melhor). Assim dá pra ver se o melhor é uma ZONA robusta ou um pico sortudo — e escolher com o terreno inteiro à vista. Obs.: o modo adaptativo usa só sinais com trajetória de preço guardada (os novos), então o nº de trades dele cresce com o tempo. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Backtest financeiro agora testa MODOS DE RISCO diferentes em vez de um SL/TP único: Scalp (stop 0.8× ATR, alvos curtos), Equilibrado (stop 1.2×) e Runner (stop 2.0×, alvos longos). Pra cada modo ele acha o melhor take-profit + o gatilho de conviction (tudo líquido, com taxas) e mostra os três lado a lado com retorno e drawdown, destacando com ★ o que mais rendeu. O topo do card passa a operar no melhor modo. Assim dá pra ver que scalp apertado costuma morrer nas taxas enquanto deixar correr (runner) segura o edge — e escolher com base em dado, não achismo. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Novo GATILHO aprendido do backtest: em vez de operar todo sinal, o sistema varre o limiar de conviction (a expectativa em ATR) e descobre o ponto acima do qual dá lucro LÍQUIDO (depois das taxas). O card do backtest mostra 'só operar quando a expectativa for ≥ X× ATR na direção' e diz, por lado, se vale operar (▲ long / ▼ short) ou evitar por ora — porque abaixo do limiar as taxas comem o edge. O card do modelo pré-pump/pré-short passa a marcar com ✓ as moedas que já passam do gatilho num lado que vale operar, então bate o olho e sabe direção + se a confirmação presta. O sweep tem trava anti-overfit (exige um mínimo de trades pra escolher o limiar). Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "O backtest financeiro agora desconta CUSTOS REALISTAS de cada trade (taxa + slippage), então o edge que aparece é líquido, não fantasia. O custo é uma % do notional (padrão ~0.04%/lado de taxa MEXC taker + ~0.02%/lado de slippage) e — a parte importante — ele escala com a volatilidade de CADA ativo: como pra arriscar 1% com stop de 1 ATR você usa um notional maior em moeda de baixa volatilidade, ela paga proporcionalmente mais taxa (custo em ATR = custo% × preço/ATR). O card mostra o resultado LÍQUIDO e, pra comparar, quanto daria sem custos (dá pra ver a taxa comendo o edge). O sweep do melhor take-profit também já roda com custos (fee empurra o alvo ideal pra cima). Dá pra ajustar taxa/slippage por query (feePct/slipPct). Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Backtest financeiro agora usa TODOS os sinais já resolvidos pelo modelo na hora (antes esperava juntar sinais novos com trajetória de preço). Como todo sinal guarda o quanto andou pra cima/baixo em ATR, dá pra simular já: sinais antigos usam aproximação conservadora (MFE — se bateu stop e alvo, assume o stop primeiro), e os novos usam a trajetória exata; o card mostra quantos já usam a exata. Além disso o resultado agora vem SEPARADO entre pré-pump (long) e pré-short (short) — cada um uma conta de $1000 própria, com retorno e taxa de acerto por lado. Também tira o SOXL e outros ETFs alavancados (SOXS, TQQQ, SQQQ, SPXL, TSLL…) que tinham escapado do filtro. Backend (exige reiniciar o dvl-scanner) + frontend." },
  { version: "Beta 1.554", note: "Novo: BACKTEST FINANCEIRO do modelo pré-pump/pré-short (novo cartão no Copilot, logo abaixo do modelo). Pega cada sinal resolvido, segue a direção que o modelo previu e simula uma conta de $1000 com gestão de risco: arrisca 1% da conta por trade, stop em 1× ATR, e o tamanho da posição se ajusta pra bater exatamente esse 1% (então a conta compõe). Mostra pra quanto os $1000 teriam ido, o retorno %, o DRAWDOWN máximo e a taxa de acerto. E responde sua pergunta do 'quanto segurar': faz um sweep do take-profit (0.5× a 5× ATR) e mostra o ponto de saída que mais rendeu no conjunto de sinais. Honesto: é estimativa in-sample (o modelo treinou nos mesmos sinais), sem corretagem/slippage — calibra, não promete; e nunca abre ordem. Precisa de sinais com trajetória de preço guardada (registrados a partir desta versão), então o cartão mostra 'coletando' até juntar uns 20. Backend (pumpBacktest + endpoint + testes) exige reiniciar o dvl-scanner. Backend + frontend." },
  { version: "Beta 1.554", note: "Tira do scanner (e do modelo pré-pump/pré-short) as AÇÕES, ÍNDICES, COMMODITIES e FOREX tokenizados da MEXC — SKHYNIXSTOCK, MUSTOCK, SAMSUNGSTOCK, NAS100, SPX500, XAU, WTI etc. Motivo: esses ativos quase não se mexem, então qualquer micro-variação vira 'muitos ATRs' e eles entupiam o topo do ranking de pré-pump/pré-short com ruído (e nem são cripto, não dava pra caçar pump neles). Filtro conservador por nome (contém STOCK + lista exata de índices/metais/energia/forex), com match EXATO pra nunca esconder cripto real tipo SPX6900 ou AAVE. Backend (novo módulo symbolFilter + teste) exige reiniciar o dvl-scanner; o card do Copilot já filtra no front como rede de segurança. Backend + frontend." },
  { version: "Beta 1.554", note: "Conserta o bug do preço/escala que 'demorava pra voltar ao normal' em ativos só-MEXC (ex.: HYPE). Causa: a vela em formação só era atualizada ao vivo pelo WebSocket da Binance, que não conecta pra esses ativos — então a vela congelava no último refresh (a cada 15s) enquanto o preço ao vivo (fonte MEXC) continuava andando. O marcador verde descolava das velas e o eixo ficava com a escala velha (o mesmo sintoma no painel de OI). Agora a vela em formação é 'grudada' no preço ao vivo a cada 1s (atualiza fecho/máxima/mínima com o mesmo preço já mostrado no marcador) e, se a escala estiver travada, ela expande pra incluir o preço. Tem trava de sanidade (ignora preço absurdo, nunca mexe em vela fechada) e é no-op pra ativos da Binance. Só frontend." },
  { version: "Beta 1.554", note: "Conserta o layout do cartão pré-pump/pré-short no Copilot que estava vazando pra fora da tela: a coluna PRÉ-SHORT ficava cortada e valores como '6.6× ATR' quebravam em duas linhas quando o nome era longo (SKHYNIXSTOCK, SAMSUNGSTOCK). Agora as colunas encolhem certo, o nome trunca com '…' se precisar, o valor fica sempre numa linha (só o número + '×', a unidade ATR está no texto acima) e o cartão nunca ultrapassa a largura da tela. Só frontend." },
  { version: "Beta 1.554", note: "O modelo pré-pump/pré-short agora aparece também no Copilot (antes só estava no Scanner). Novo cartão no topo do Copilot: enquanto aprende, mostra a barra de progresso 'N/40 amostras'; quando treina, lista as moedas com maior expectativa de ALTA (pré-pump) e de QUEDA (pré-short) nas próximas 20 velas, em ATR. Só leitura, não abre ordem. Só frontend." },
  { version: "Beta 1.554", note: "Novo: modelo que aprende a pegar pré-pumps e pré-shorts SEPARADAMENTE, sem números fixos de %. Ele não usa um limite chutado — aprende sozinho o tamanho esperado do movimento nas próximas 20 velas, medido em ATR (volatilidade do próprio ativo), então 'grande' se ajusta a cada moeda. São dois modelos de regressão: um para a alta esperada (pré-pump/LONG) e outro para a queda esperada (pré-short/SHORT). Ele NÃO inventa dados: começa vazio e só aprende conforme os sinais 'spike pós-flat' disparam e resolvem 20 velas depois — leva dias/semanas de scanner rodando até prever. Enquanto aprende, o topo do scanner mostra 'Modelo aprendendo: N/40 amostras'; quando treina, cada moeda ganha uma etiqueta PUMP/SHORT com a expectativa em ATR. Backend + frontend." },
  { version: "Beta 1.554", note: "Conserta o marcador 'spike pós-flat' do gráfico que ficava mudando/piscando. Causa: ele marcava também a vela AO VIVO (ainda em formação), cujo volume muda a cada tick — então o destaque aparecia e sumia. Agora ele só marca velas FECHADAS: o spike pós-flat confirma no fechamento da vela e fica fixo (não muda mais depois). Só frontend." },
  { version: "Beta 1.554", note: "Casei o bloco 'Spike' do scanner com o marcador 'spike pós-flat' do gráfico: agora o gatilho é a vela CRUZAR acima da média (fator >1.0) após a calmaria — exatamente o que pinta as velas de volume no gráfico. Antes o scanner exigia um pouco mais (≥1.3×); agora toda vela que o gráfico marca de spike pós-flat vira um sinal no scanner. O fator continua ajustável em Filtros (sobe pra 1.15/1.3 se quiser filtrar cruzamentos fracos). Migração automática reseta esse parâmetro pro novo padrão (preservando teus outros filtros). Só frontend." },
  { version: "Beta 1.554", note: "Scanner refeito pra pré-pump — agora são só 2 bloquinhos. (1) 'Pré-volume (calmaria)': as velas antes ficaram abaixo da média (base morta) — a pré-análise. (2) 'Spike': a vela atual se destaca das menores por um fator MODERADO (padrão ≥1.3× a média — não precisa ser descomunal). O sinal 'detectado' acende quando os 2 batem juntos (calmaria → coluna que rompe). Score vira 50/50 (2 blocos = 99). Saíram do scanner os blocos de RSI, OI, LSR e prev-volume. Os dois limiares são ajustáveis em Filtros (nº de velas da base + fator do spike). Só frontend — não precisa reiniciar o backend." },
  { version: "Beta 1.554", note: "Enxugada: removidos o Fast Bots, o Aprendizado (ML), o Backteste 30 dias e o Backteste Financeiro. O Copilot continua (só sem esses 4 cards), e Scanner, Gráfico, Positions e Watchlist seguem intactos. No backend, parei o treino do ML no ciclo do worker e removi os endpoints de backteste (economiza recurso do servidor) — o score do scanner NÃO muda, ele já rodava nos pesos que você ajusta em Filtros. Também limpei o código morto das tentativas de provedor de OI (Coinalyze/Sharpe). Exige atualizar/reiniciar o backend. Próximo passo: refazer o scanner pra detectar 'volume acordando' (pré-pump)." },
  { version: "Beta 1.554", note: "Ajustes finos do DVL Open Interest (Fase A). (1) Conserta o artefato visual: quando a coleta de um ativo só-MEXC começou há pouco, o lado esquerdo do gráfico (antes da coleta) esticava o primeiro candle numa barra chapada e a linha de média despencava cruzando o vazio. Agora, onde não há OI coletado, fica vazio de verdade — média e candles só desenham sobre o período realmente coletado. (2) Blinda o arranque: o backend carrega o contractSize ANTES da primeira amostra, então logo após reiniciar não aparece mais aquele -96%/escala errada de transição. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "DVL Open Interest (Fase A) — candles de OI REAIS da MEXC. O backend agora amostra o holdVol (contratos em aberto) + fairPrice de todo ativo MEXC a cada 30s num coletor dedicado, guarda os snapshots com carimbo de tempo e monta candles OHLC (abertura/máxima/mínima/fechamento do holdVol) no timeframe do gráfico. Candles fechados são imutáveis; o histórico persiste no servidor (sobrevive a restart) e só cresce pra frente (a MEXC não dá OI passado — nada é inventado). Conversão de unidade por ativo usando o contractSize real da MEXC (nunca o mesmo pra todos): Contratos = holdVol, Moeda base = holdVol×contractSize, USDT = base×fairPrice — escolhível no ícone de config do painel. A cor do candle vem do próprio movimento do OI (fecha ≥ abre = verde), não da cor do preço. Também troquei a linha de média do painel de OI de azul para dourado (tema DVL, sem azul). O painel Long/Short (proxy) segue como estava — vira 'Long/Short Pressure — Estimated' na Fase B. Exige atualizar/reiniciar o backend (coletor de OI + endpoint /mexc-oi)." },
  { version: "Beta 1.554", note: "Long/Short dos ativos só-MEXC deixa de ser uma linha reta: agora o proxy puxa o HISTÓRICO REAL de funding da MEXC (a MEXC publica o histórico de funding, só não o de OI). Então a linha tem profundidade de verdade na hora, sem esperar encher. O OI continua sendo o único que só cresce pra frente — a MEXC não expõe histórico de OI na API pública (só o valor atual), e histórico de preço não contém OI (são dados separados). Também consertei um bug antigo: o cabeçalho do OI mostrava o valor sempre com a unidade 'BTC' fixa (aparecia '56.0K BTC' em qualquer ativo) — agora usa a moeda certa (ex.: 'DEXE'). Exige atualizar/reiniciar o backend (backfill de funding no /mexc-derivs)." },
  { version: "Beta 1.554", note: "OI e Long/Short agora carregam pra ativos só-MEXC (tipo ANSEM), com dado REAL da MEXC — não inventado. Como funciona: o backend já recebe o OI (holdVol) e o funding de TODO ativo MEXC no mesmo ticker que puxa a cada ciclo; agora ele guarda isso com carimbo de tempo e monta uma série. O painel de OI, quando não acha dado na fonte antiga (ativo que não existe lá), passa a usar essa série real da MEXC (selo 'MEXC'). O painel de Long/Short, como a MEXC NÃO tem long/short ratio de verdade na API, usa um PROXY de sentimento derivado do funding real (selo 'MEXC · proxy funding', pra deixar claro que é aproximação, não o ratio verdadeiro). Detalhe honesto: a série começa curtinha e vai enchendo daqui pra frente (a MEXC não dá histórico retroativo de OI/funding) — em algumas horas já tem linha decente. Exige atualizar/reiniciar o backend (endpoint novo /mexc-derivs + amostragem por ciclo)." },
  { version: "Beta 1.554", note: "Tirei o '<CoinGlass>' do título do painel de Long/Short — agora é só 'Long/Short Ratio', sem marca de terceiro na tela. As legendas do indicador também deixaram de citar 'CoinGlass-style'. Só rótulo, o cálculo é o mesmo. Frontend-only." },
  { version: "Beta 1.554", note: "Tirei o 'BINANCE' dos rótulos dos indicadores. O selo que ficava no canto dos painéis de Open Interest e Long/Short agora é neutro: OI mostra 'AGREGADO' e o LSR mostra 'TOP TRADERS' (ou 'GLOBAL'), sem citar exchange. Só o nomezinho — os dados e o cálculo continuam iguais. (Sobre os osciladores que às vezes não carregam: o OI e o LSR vêm de dados de futuros que só existem pra ativos listados naquela fonte. Ativo só-MEXC, tipo ANSEM, não tem OI/LSR nessa fonte, então esses dois painéis ficam vazios pra ele — o gráfico de candles carrega normal porque agora vem da MEXC. Pra ativos que existem nas duas pontas, tipo SOL, os osciladores carregam certinho.)" },
  { version: "Beta 1.554", note: "Gráfico MUITO mais rápido, MEXC como fonte principal e sem 'Binance' na cara. (1) A MEXC virou a PRIMEIRA fonte de candles do gráfico (não mais só reserva): uma chamada rápida via backend, então trocar de ativo/timeframe carrega quase instantâneo em vez de 10-20s. Antes o gráfico tentava 6 endpoints da Binance em sequência (cada um tinha que dar timeout) antes de desistir — por isso a demora e o 'CARREGANDO' travado. (2) Ativos só-MEXC como VIRTUAL no 3m agora ABREM: a MEXC não tem candle nativo de 3m, então o backend monta o 3m a partir do 1m (vale pra qualquer timeframe que a MEXC não tenha nativo). (3) O gráfico DESENHA assim que os candles chegam — o OI/LSR (que podem travar quando a Binance está off) carregam depois e não seguram mais o desenho. (4) Tirei o 'Binance' do que aparece na tela: título vira só 'DVL', o overlay vira 'CARREGANDO...' e a mensagem do scanner não cita mais exchange. Exige atualizar/reiniciar o backend (endpoint /mexc-klines agora serve qualquer timeframe)." },
  { version: "Beta 1.554", note: "Failover automático de exchange NO GRÁFICO: quando a Binance está off, o chart agora puxa os candles da MEXC sozinho, então a plataforma não fica offline. Antes, com a Binance banida, clicar num ativo só-MEXC dava erro de fallback e o gráfico não abria (a última peça que ainda dependia só da Binance). Agora, se TODOS os endpoints da Binance falharem, o gráfico busca o mesmo candle na MEXC via backend (o navegador não alcança a MEXC direto) e desenha normal — o ticker/preço se reconstrói dos próprios candles. Cobre 1m/5m/15m/30m/1h/4h/1d (a MEXC não tem 3m/segundos nativo, então esses seguem só na Binance). Painéis de OI/LSR ainda vêm da Binance e podem ficar de fora enquanto ela está off, mas o gráfico fica de pé. Exige atualizar/reiniciar o backend (endpoint novo /mexc-klines)." },
  { version: "Beta 1.554", note: "Conserta a tabela do Scanner ficando VAZIA e 'recarregando' ao clicar num ativo. Quando você clicava numa linha, o feed re-consultava por um instante e a tabela piscava vazia com 'Carregando…'. Agora, se já tem tabela na tela, ela FICA (não pisca vazio) — o placeholder de carregando só aparece na primeira vez, quando não há nada pra manter. (O gráfico em si ainda depende da Binance pra abrir o ativo; com a Binance off, o chart de um ativo só-MEXC não carrega — isso é uma limitação maior, separada.) Só frontend." },
  { version: "Beta 1.554", note: "Conserta o score inflado (vários 99) e o OI aparecendo ↑ em TUDO. Causa: quando o backend reinicia, o histórico de OI de cada ativo ainda não encheu, e a função de tendência devolvia 'up' por padrão quando faltava dado — então TODO ativo lia 'OI acima da média', acendia esse bloquinho e empurrava o score pro teto (99). Agora, sem dado suficiente (ou empate), a tendência é NEUTRA ('flat'), não 'up' — o bloco de OI só acende com OI realmente acima da média. Os scores voltam ao normal conforme o histórico de OI enche (uns 40min depois de reiniciar). Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Scanner MEXC de verdade: o snapshot do backend só guardava os sinais 'ignitados' (por isso vinha vazio na MEXC recém-reiniciada). Agora o backend expõe a VARREDURA COMPLETA que ele já calcula todo ciclo (todos os ~80 ativos por volume, não só os que deram spike) num endpoint novo /universe, e a ponte do Scanner puxa dele — então a tabela cheia aparece na MEXC (o navegador não alcança a MEXC direto). O scan do navegador continua rodando como reserva: se o backend cair, volta pra ele. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Scanner passa a puxar do BACKEND (funciona com a MEXC mesmo com a Binance off). O navegador não consegue buscar a MEXC direto (contract.mexc.com é bloqueado na página), só o servidor consegue — e existia uma 'ponte' pro backend que nunca era ligada, então a tabela ao vivo ficava travada no scan do navegador (que só faz Binance). Agora a ponte liga sozinha, na mesma origem (o /api/dvl/scanner já é servido ao lado do backend), e a tabela mostra os dados do servidor: com MEXC selecionado, vêm os candles/OI/LSR da MEXC. Seguro: a ponte só assume quando o backend realmente devolve linhas — se o backend estiver fora, cai de volta no scan do navegador. Atualiza a cada 30s mesmo se o WebSocket não estiver disponível. Só frontend." },
  { version: "Beta 1.554", note: "Scanner agora GUARDA os sinais: nova seção 'Detectados (24h)' embaixo da tabela ao vivo. Antes, quando o spike passava ou o RSI recuperava, a linha sumia do ao vivo (o score caía abaixo do filtro — e com 'Pesos aprendidos' ligado, sumia até mais rápido). Agora todo sinal que aparece no ao vivo é registrado no instante em que surge, com o HORÁRIO em que foi gerado (spike há), e FICA na lista por 24h mesmo depois de sair de cima — marcado '● ao vivo' enquanto está lá e 'saiu' quando deixa a tabela. Guarda por ativo+timeframe (15m e 1h não se sobrescrevem). Tem botão Limpar. Só frontend, não precisa reiniciar o backend." },
  { version: "Beta 1.554", note: "Correção importante de conceito no backteste: até agora eu testei os combos como PARES soltos (2 blocos), que são comuns e fracos — por isso tudo dava cara-ou-coroa. Agora o backteste usa o SETUP de verdade: uma CONFLUÊNCIA única de 4 blocos — RSI sobrevenda como base (podendo ter acontecido nas últimas ~4 velas), MAIS pré-volume baixo, OI acima da média e LSR abaixo da média, todos alinhados. É bem mais raro (menos trades), mas é o padrão certo, não a média de sinais fracos. Testado com as 5 saídas, 15 ativos, 15m/30m/1h, com taxa. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Fast Bots reformulados: (1) timeframes mudam de 1m/3m/5m pra 5m / 15m / 30m / 1h; (2) cada bot agora mostra o resultado SEPARADO POR TIMEFRAME (bloco 'Por timeframe' dentro do card: trades, % de acerto e P&L de cada TF) — assim dá pra ver em qual TF cada combo realmente ganha, em vez de tudo misturado. A janela de 'sinal fresco' escala por TF (30min no 5m até 2h no 1h) pra não faltar entrada nos TFs lentos. Como os TFs mudaram, as 7 carteiras reiniciam do zero ($1.000) pra os números por TF nascerem limpos. Só frontend — não precisa reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste vira teste de SAÍDAS: a entrada fica FIXA (Spike + RSI sobrevenda, o combo mais consistente) e agora as LINHAS da tabela são 5 tipos de TP/SL pra ver se alguma saída vira o jogo: (1) Scalp 1:1 (SL 1×ATR, TP +1R); (2) 1:2 parcial (SL 1.5×ATR, ½ no +1R→b.e., resto +2R); (3) 1:3 corre (SL 2×ATR, ½ no +1.5R→b.e., resto +3R); (4) Trailing (SL/trailing 2×ATR); (5) % fixo (SL −1%, TP +2%). Tudo líquido de taxa, com o bruto em cinza e a 'taxa ~X R' de cada saída na própria linha (cada saída tem um stop diferente, então a taxa pesa diferente). Roda em 15m/30m/1h, 15 ativos. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste muda pra timeframe ALTO: sai 1m/3m/5m, entra 15m/30m/1h. Motivo: no TF baixo a gente provou que não tem saída — stop apertado tem edge mas a taxa mata; stop largo mata a taxa mas também mata o edge. No TF alto o movimento é grande em % por natureza, então um stop NORMAL (2×ATR, piso 0,3%) já é bem maior que a taxa sem precisar sufocar o sinal — os alvos voltam pra perto (parcial +1R → breakeven, resto +2R, timeout 8h), que é o perfil que tinha edge de verdade. É o teste onde a física taxa-vs-movimento finalmente pode fechar. Candles 15m/30m/1h são nativos da MEXC (busca mais rápida, ~3-4 min). Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Novo stop no backteste, pra brigar com a taxa: o stop de 1,5×ATR era apertado demais no 1m (a taxa comia ~1R por trade). Agora é um stop LARGO — 3×ATR com PISO de 0,6% do preço — então o R vira um movimento de verdade e a taxa (taxa-em-R = taxa% ÷ stop%) para de dominar. Alvos também mais longe (parcial no +1,5R → breakeven, resto no +3R) e segura mais tempo (timeout 3h) pra dar espaço ao movimento maior. Menos trades e mais largos = menos mordida de taxa. Vamos ver se com stop largo sobra edge depois do custo. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste agora desconta TAXA realista (~0,10% por rodada, ida+volta, taker) de cada trade — e ela pesa diferente em cada timeframe de propósito: como a taxa é uma % fixa e o stop no 1m é bem menor (ATR menor), ela come uma fatia MUITO maior de cada R no 1m do que no 5m. Por isso o custo é calculado em R usando o stop real de cada trade. Agora as colunas Acerto/R méd/Retorno/Máx queda são todas LÍQUIDAS (com taxa); o número cinza embaixo do retorno é o bruto (sem taxa), e o título de cada TF mostra 'taxa ~X R/trade' pra você ver o peso. Spoiler: no 1m a taxa é brutal (o stop é minúsculo). Slippage nem entrou na conta, então é até otimista. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Conserta o layout da aba Copilot 'fugindo da página' (conteúdo cortado na direita, com rolagem horizontal) em telas estreitas (~360px). Causa: a página é uma coluna só (grid), e um item de grid não encolhe abaixo do próprio conteúdo — a mini-tabela do Scanner tem colunas de largura fixa (~341px) que não cabem num celular estreito, então ela empurrava a coluna inteira (e todos os cards junto) pra fora da tela. Agora a coluna é fixada na largura disponível, os cards podem encolher, a tabela do Scanner rola dentro da própria caixa, e qualquer sobra é cortada em vez de vazar. Testado a 360px e 412px. Só frontend, não precisa reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste focado + maior: pega os TOP 2 combos de cada timeframe da rodada anterior (união = 4 combos: RSI+OI, Spike+RSI, OI+Pré-volume, Pré-volume+OI-subindo) e re-testa numa amostra bem maior — de 6 pra 15 ativos (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, LINK, LTC, DOT, TRX, BCH, NEAR, ATOM). Como o OI só tem 30 dias de histórico na Binance, 'maior' aqui é mais ATIVOS, não mais tempo. Os 3 combos de LSR (os mais fracos em tudo) saíram. A rodada leva ~7-8 min agora (mais ativos), fica em cache 6h. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Conserta o card do backteste multi-ativo ficando vermelho de 'problema' sem motivo. Causa: ao buscar OI/LSR de cada ativo, a janela mais ANTIGA às vezes cai fora da retenção de ~30 dias da Binance e volta HTTP 400 — isso é esperado (a borda dos 30 dias 'anda' durante a rodada de ~3 min, então os ativos do fim pegam ela) e NÃO é fatal: as janelas mais novas trazem os dados normalmente. Agora o backend trata esse 400 como 'janela fora do range', pula quieto e segue; e o card só fica vermelho num erro de verdade, não numa janela velha recusada. Resultado: o backteste completa e mostra os 6 ativos sem o alarme falso. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste agora é MULTI-ATIVO: em vez de só BTC, roda os 7 combos em 6 ativos (BTC, ETH, SOL, BNB, XRP, DOGE) nos mesmos 30 dias — amostra bem maior, testa se o edge é real ou só sorte de um ativo. Como junta os trades de vários ativos, mudei o jeito de medir pra não enganar: Acerto e R médio (expectância) somam TODOS os trades de todos os ativos (as métricas que importam pra comparar), enquanto Retorno e Máx queda são a MÉDIA por ativo — assim o número fica na mesma escala de antes, sem inflar por ter 6x mais trade. O card mostra quantos ativos entraram em cada timeframe. Exige atualizar/reiniciar o backend; a rodada leva ~3 min (mais ativos pra buscar), fica em cache 6h." },
  { version: "Beta 1.554", note: "Correção do 'app abrindo versão antiga': o site é servido sem cache (no-store), mas um app instalado (PWA) ou uma aba aberta há muito tempo guardava a página JÁ CARREGADA na memória e não buscava de novo depois de um deploy — por isso às vezes aparecia uma versão velha. Agora tem um verificador automático: ele consulta a versão realmente publicada no servidor (a cada 60s, ao voltar pro app e 8s depois de abrir) e, quando é diferente da que está rodando, ou recarrega sozinho (se o app estiver em segundo plano, pra não atrapalhar) ou mostra um aviso verde no topo 'Nova versão — toque para atualizar'. Tem trava anti-loop: tenta atualizar sozinho no máximo uma vez por versão, então nunca fica recarregando à toa." },
  { version: "Beta 1.554", note: "Backteste (BTC): os candles (preço/volume) agora vêm da MEXC, não da Binance — era a Binance que bania o IP (HTTP 418), porque o endpoint de klines é compartilhado com o scanner ao vivo e a rajada de 30 dias estourava a cota. A MEXC não tem esse problema, então os candles baixam limpos e o 1m/3m/5m preenchem de novo (o 3m é montado a partir do Min1 da MEXC, que não tem 3m nativo). O OI e o LSR continuam vindo da Binance (a MEXC não expõe histórico de nenhum dos dois) — mas essas chamadas são leves e não causam ban; se a Binance estiver num ban curto, só os combos que dependem de OI/LSR ficam sem dados por alguns minutos, o Spike+RSI e o resto já aparecem. Sem mais espera de 20 min travando tudo. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste (BTC): descobri que o ban da Binance é só no endpoint de candles (klines) — que o scanner ao vivo também usa direto — não nos de OI/LSR. Por isso a rajada de candles do 1m (43 mil, o mais pesado) derrubava. Agora busca do MAIS LEVE pro mais pesado (5m → 3m → 1m) e guarda resultado PARCIAL: mesmo com ban no 1m, você já vê 5m e 3m, e o 1m entra nas próximas rodadas. Os candles vêm bem mais devagar (1,2s cada) pra não estourar a cota compartilhada com o scanner. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste (BTC): a Binance chegou a banir o IP temporariamente (HTTP 418) de tanto pedido rápido das versões anteriores. Agora, ao ver 418, o backteste PARA na hora e espera 20 min pra tentar de novo (insistir só estende o ban), e busca bem mais devagar pra não repetir — importante porque esse IP é o mesmo do scanner ao vivo, então não pode martelar. A aba mostra claramente quando está nesse modo de espera. Depois de reiniciar o backend, pode levar até ~20 min pro ban da Binance expirar e o backteste rodar; é esperado. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste 30 dias (BTC): corrige o 5m aparecendo zerado e os candles vindo curtos (28k/6k em vez de 43k/14k). Não era erro de conta — era rate-limit da Binance: eu disparava ~80 requisições rápido demais e a última leva (5m) ficava sem cota. Agora respeita o Retry-After e tenta de novo a mesma página (backoff) em vez de pular, e busca mais devagar. Os 3 timeframes devem vir completos. (O sinal que já apareceu segue valendo: 'Pré-volume baixo + OI subindo' foi o melhor no 1m e no 3m.) Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Backteste 30 dias (BTC): agora tem barra de progresso de verdade — mostra a fase (buscando OI, LSR, candles + simulação) e a % enquanto calcula, então dá pra saber que está rodando. Se a busca de dados falhar, a barra fica vermelha e mostra o erro real (em vez de ficar 'Calculando' pra sempre), e ele tenta de novo sozinho a cada minuto. Também deixei a busca de OI/LSR mais robusta: antes ela podia parar logo na primeira página fora do histórico e não pegar nada; agora avança pelas janelas e junta tudo que a Binance devolver. Exige atualizar/reiniciar o backend." },
  { version: "Beta 1.554", note: "Nova aba no Copilot: Backteste 30 dias — BTC. Pega os 7 combos de ENTRADA dos Fast Bots e testa cada um em 30 dias reais de BTC, em 1m/3m/5m, com uma saída fixa igual pra todos (stop 1.5x ATR, parcial no +1R → breakeven, resto +2R, timeout 45min) — assim compara só a entrada. Mostra nº de trades, % de acerto, R médio (expectância), retorno (1% de risco por trade, composto) e queda máxima, com 👑 no melhor de cada timeframe. É só leitura, não mexe nas carteiras dos bots ao vivo. O cálculo roda no backend (baixa histórico de klines/OI/LSR e simula candle a candle) e atualiza a cada 6h. Exige atualizar e reiniciar o dvl-scanner-backend." },
  { version: "Beta 1.554", note: "Fast Bots agora compara SAÍDAS: cada um dos 7 bots ganhou um método de saída próprio (aparece na linha \"Saída\" embaixo do combo) — stop 1x, stop largo 1.5x, deixa correr (1/3 no 1R → 3R), alvo único rápido +1R, trailing 1.5x ATR, % fixo -1%/+2%, e stop largo 2x segurando 90min. Antes a saída era igual pra todos (o \"perde bastante\" vinha do stop 1x ATR apertado demais + tirar metade cedo no zero-a-zero). Agora dá pra bater o olho e ver qual pacote entrada+saída é o mais assertivo. Como a mecânica de saída mudou, as 7 carteiras reiniciam do zero ($1.000)." },
  { version: "Beta 1.554", note: "Fast Bots reformulado: saíram o Bot 3 (short por net-flow) e o Bot 4 (order flow ao vivo da MEXC) — e junto toda a maquinaria de WebSocket/relay de order flow, que só existia pra ele. Entraram 5 bots novos, um pra cada uma das \"Combinações que mais pesam\" do ML (Spike+RSI sobrevenda, OI+Pré-volume baixo, RSI sobrevenda+OI, RSI sobrevenda+LSR, LSR+Pré-volume baixo). Agora são 7 bots, todos LONG, todos no mesmo motor de blocos/saída — comparação limpa de qual combo do ML performa melhor de verdade. Bot 3 e 4 começam do zero (carteira nova de $1.000)." },
  { version: "Beta 1.554", note: "Bot 3 (short) estava zerado porque exigia Net Long caindo MAIS de 3% ao mesmo tempo que Net Short acima da média e Net Delta abaixo — os três juntos quase nunca batiam. Afrouxei a queda exigida de 3% pra 1%: ainda precisa de Net Long em queda de verdade (mantém o caráter direcional), só que menos íngreme, então ele volta a pegar trade. Bot 4 não mexeu — o zero dele era o bug de conexão (já corrigido), não o critério." },
  { version: "Beta 1.554", note: "Bots 1-3 voltam a operar quando a Binance cai (fallback pra MEXC): antes ficavam travados sem abrir trade nesse ciclo porque não sabiam lidar com símbolo formato MEXC; agora o ATR de fallback e a checagem de preço das posições são escolhidos pelo FORMATO do símbolo (com ou sem underscore), não mais por qual bot é — então um sinal vindo da MEXC durante a queda da Binance funciona igual, sem risco de travar a posição." },
  { version: "Beta 1.554", note: "Bot 4: o navegador nunca mais tenta conectar direto no WebSocket da MEXC (ficava \"reconectando\" pra sempre — mesmo motivo do bloqueio já corrigido nas outras chamadas). O próprio backend agora mantém essa conexão (novo módulo mexcAggStream.js) e retransmite as negociações pro navegador por um WebSocket próprio (/ws/dvl/agg). Exige atualizar e reiniciar o dvl-scanner-backend de novo." },
  { version: "Beta 1.554", note: "Corrige bug real: quando a Binance falha, o backend reaproveita dados da MEXC no snapshot \"binance\" (fallback) — Bots 1-3 abriam trade nesses sinais sem perceber, criando posições com símbolo formato MEXC que o mapa de preço da Binance nunca resolve, ficando travadas para sempre (5/5 slots ocupados, sempre +0.00%). Agora Bots 1-3 ignoram ciclos de fallback, e qualquer posição sem preço resolvível é fechada automaticamente (zerada) depois de 45min, sem precisar reiniciar o bot na mão." },
  { version: "Beta 1.554", note: "Bot 4: universo de símbolos, checagem de preço e ATR de fallback da MEXC deixam de ser buscados direto do navegador (travava, ficava \"aguardando candidatos\" pra sempre) e passam a vir do próprio backend (3 rotas novas: /tickers, /mexc-price, /mexc-atr), que já fala com a MEXC com sucesso hoje pro Scanner. Exige atualizar e reiniciar o dvl-scanner-backend no servidor, não só o deploy automático do site." },
  { version: "Beta 1.554", note: "Bot 4: corrige dois textos que ainda citavam Binance por engano (rodapé do card e nota de topo) e adiciona um radar de diagnóstico (\"Radar Bot 4\") mostrando, em tempo real, quantos símbolos MEXC estão realmente recebendo negociações e o buy/sell ratio + volume dos mais ativos — assim dá pra ver na hora se o bot está \"quase disparando\" ou se o WebSocket não está recebendo dado nenhum." },
  { version: "Beta 1.554", note: "Bot 4 (order flow) agora trabalha exclusivamente com a MEXC: universo de símbolos, stream de negociações ao vivo, ATR de fallback e checagem de preço das posições passam a vir todos da MEXC, não mais da Binance. Símbolos MEXC mantêm o formato nativo (ex: BTC_USDT) para nunca colidir com posições dos Bots 1-3 (Binance)." },
  { version: "Beta 1.554", note: "Bot 4 (order flow) agora tem universo de símbolos próprio — antes ele só monitorava o que o Scanner já tinha rastreado em 1m/3m/5m, que às vezes é só um punhado de ativos (se 3m/5m estiverem parados). Agora ele busca sozinho os top 40 pares por volume 24h direto na Binance, atualizando a cada 5min, independente do que o Scanner filtrou. Mais chance de pegar uma rajada de compra de verdade." },
  { version: "Beta 1.554", note: "Novo Bot 4 nos Fast Bots — 'segue as ordens do mercado' de verdade: em vez de ler candle fechado como os outros 3, ele conecta direto no fluxo de negócios da Binance (aggTrade, ao vivo) e entra quando uma rajada de compra agressiva aparece (compra pelo menos 2.5x maior que venda numa janela de 20s). Só monitora os ativos que o Scanner já está de olho (não todos os pares). Mesma carteira de $1.000, mesma fração de $100 e mesma saída em 2 etapas dos outros bots, pra comparação justa. O card agora mostra também o status da conexão de order flow." },
  { version: "Beta 1.554", note: "Fast Bots — apertei o combo do Bot 3 (só short): agora exige os 3 sinais de fluxo alinhados pro lado vendedor ao mesmo tempo — Net Short acima da média, Net Delta abaixo E Net Long caindo (antes eram só os 2 primeiros). Analisando os osciladores ao vivo, o combo de 2 pernas disparava em momentos de lado/chop onde o preço não confirmava queda nenhuma — Net Short e Net Long sobem juntos quando só tem mais gente entrando dos dois lados, não é sinal de nada sozinho. Bot 1 e Bot 2 continuam iguais." },
  { version: "Beta 1.554", note: "Fast Bots — removida a exigência de configurar URL do backend (dependia de localStorage, igual o Bot Demo antigo; desnecessário já que o app e a API estão no mesmo domínio, e era um ponto de falha silenciosa a mais). Também adicionei uma linha de status no próprio card ('Última varredura: Xs atrás — 1m X/Y · 3m X/Y · 5m X/Y') pra você conferir se os bots estão varrendo e quantos sinais existem por TF sem precisar abrir o console do navegador." },
  { version: "Beta 1.554", note: "Removi do Copilot o card 'Divergência Net Flow' e o Bot Demo antigo (carteira única com stop por ATR) — deram lugar aos Fast Bots (3 carteiras competindo por combo). Nada de backend foi tocado, só limpeza de UI." },
  { version: "Beta 1.554", note: "Novo no Copilot: Fast Bots — corrida de combos. Três bots scalpers (100% simulados, $1.000 cada) competindo nos TFs 1m/3m/5m, cada um entrando só no seu combo: Bot 1 (só LONG) OI acima da média + LSR abaixo; Bot 2 (só LONG) pré-volume baixo + OI subindo; Bot 3 (só SHORT) Net Short acima da média + Net Delta abaixo. Entradas em frações de $100 (máx. 5 abertas), saída em 2 etapas: no +1R vende metade e o stop vai pro zero a zero, o resto corre até +2R, stop (1x ATR do próprio TF) ou 45 min. O card mostra patrimônio, retorno, trades em andamento e fechados de cada um, com coroa 👑 no líder — mesma regra de saída pra todos, então a diferença de resultado é do combo." },
  { version: "Beta 1.554", note: "Bot Demo — troquei o stop/alvo de % fixo pra ATR da vela de entrada com risco sempre igual em dólar ($30 por trade, não importa o ativo nem o preço). Numa vela de spike bem volátil o stop fica mais largo (não te tira por ruído normal) e a posição fica menor pra manter o risco fixo; numa vela calma o stop fica mais apertado e a posição maior. Alvo sempre 2x a distância do stop (2:1). Isso só muda como o Bot Demo opera — o treino do ML continua com o critério de %/4h de sempre, os dois passam a ter métricas separadas." },
  { version: "Beta 1.554", note: "Novo card no Copilot: Divergência Net Flow — aviso (não filtro) pra quando o Net Long está caindo, o Net Short subindo e o Net Delta caindo ao mesmo tempo (pelo menos 2 dos 3), mesmo com o preço ainda sem confirmar a virada. É só leitura: não muda o score do Scanner, não vira bloco novo e não entra no treino do ML — fica de fora de propósito, do mesmo jeito que o SHORT foi removido, pra não misturar um sinal de reversão dentro de uma máquina pensada só pra confirmar compra." },
  { version: "Beta 1.554", note: "Removi o SHORT do sistema inteiro: Scanner, Machine Learning e Bot Demo. Os 6 bloquinhos (RSI sobrevenda, OI subindo, LSR caindo...) só validam um setup de compra — SHORT nunca foi um setup de venda de verdade, só 'o candle fechou vermelho' pontuado com a mesma régua de compra, e o backtest financeiro confirmou que vinha perdendo dinheiro. Agora o Scanner só detecta LONG, o modelo aprendido treina só LONG, e o Bot Demo roda só uma carteira (a carteira LONG que você já tinha continua com o mesmo progresso — só a SHORT foi removida)." },
  { version: "Beta 1.554", note: "Bot Demo agora consulta o modelo aprendido antes de abrir posição: além do score do Scanner (≥72), só entra se o modelo daquele lado (regressão ou árvore, o que testar melhor) também não descartar o sinal. Entradas que o modelo aprovou ganham uma marquinha 🤖. Enquanto um lado não tem dados treinados suficientes, continua abrindo só pelo score, como antes." },
  { version: "Beta 1.554", note: "Novo card no Copilot: Backtest financeiro. O card 'Aprendizado (ML)' já mostrava a acurácia (acertou a direção?); este mostra quanto cada abordagem teria RENDIDO no mesmo conjunto de teste nunca visto no treino — taxa de acerto e retorno médio/total comparando negociar todo sinal vs. só o que a regressão chamou de favorável vs. só o que a árvore de decisão chamou de favorável. Só leitura, não abre posição nenhuma." },
  { version: "Beta 1.554", note: "ML — Net Long/Short/Delta agora entram na equação do modelo aprendido, calculados no backend (a mesma aproximação via Binance dos osciladores, só que agora alimentando o treino também). Captado só no momento em que um sinal novo aparece (não a cada ciclo, pra não sobrecarregar a Binance de novo). Não virou um bloco novo — é o combo do jeito que a árvore de decisão já sabe fazer sozinha, sem eu precisar montar a combinação na mão: ela já pode juntar 'Net Delta subindo' com qualquer outro bloco/combinação sozinha." },
  { version: "Beta 1.554", note: "Novo indicador no menu Indicadores: DVL Net Long — completa o trio junto do Net Short e Net Delta, mesma aproximação via Binance (posição × Open Interest). Média móvel configurável, padrão 20." },
  { version: "Beta 1.554", note: "Novo: Bot Demo no Copilot — opera sozinho os sinais do Scanner numa carteira virtual (100% simulado, sem ordem real nenhuma), com LONG e SHORT em carteiras separadas de $10.000 cada. Abre posição quando um ativo bate score alto (≥72), fecha no alvo/stop ou depois de 4h — os mesmos critérios que já rotulam os dados do ML. Mostra patrimônio, retorno, posições abertas e histórico de trades pra cada lado, com botão pra reiniciar cada carteira quando quiser." },
  { version: "Beta 1.554", note: "ML — adicionei uma árvore de decisão de verdade (do zero, sem depender de lib externa) treinada junto com o modelo de regressão, nos mesmos dados. Diferente das combinações de 2 blocos, a árvore acha combos de 3+ blocos sozinha, sem eu precisar nomear cada combinação na mão. O card 'Aprendizado (ML)' agora mostra a acurácia da árvore ao lado da regressão e as regras que ela encontrou em português (ex: 'OI subindo + LSR caindo + RSI baixo → 86% favorável'), e avisa qual dos dois modelos venceu. Ainda não substitui o score do Scanner — é só leitura/comparação por enquanto." },
  { version: "Beta 1.554", note: "ML — o modelo aprendido agora enxerga COMBINAÇÕES de blocos, não só cada um isolado: antes ele só somava pesos independentes (uma regressão pura não sabe que 'OI subindo + LSR caindo juntos' vale mais que a soma das partes). Agora cada uma das 15 combinações possíveis dos 6 blocos ganha seu próprio peso aprendido — o card 'Aprendizado (ML)' no Copilot mostra as combinações que mais pesaram pra cada lado, e o score de Filtros (quando 'Pesos aprendido' tá ligado) já soma esse bônus de combo, não só os blocos sozinhos." },
  { version: "Beta 1.554", note: "Corrige o bug de painéis cortados com 4+ indicadores ativos ao mesmo tempo (OI, LSR, Net Short, Net Delta…): os painéis agora se ajustam pra caber todos na tela, achatando de forma mais inteligente em vez de cortar/travar. Também corrige o Net Short/Net Delta não aparecerem se ligados sozinhos, sem OI/LSR junto." },
  { version: "Beta 1.554", note: "Dois indicadores novos no menu Indicadores: DVL Net Short e DVL Net Delta, iguais aos que você vê na CoinGlass — aproximados via Binance (posição long/short dos top traders × Open Interest, já que não temos chave paga da CoinGlass). Cada um com sua própria média móvel configurável (padrão 20 candles, dá pra mudar no painel de cada um)." },
  { version: "Beta 1.554", note: "Backend + ML — LONG e SHORT agora treinam como dois modelos separados: os 6 blocos (RSI sobrevenda, OI subindo, LSR caindo…) foram pensados só pro seu setup de compra, então misturar os dois no mesmo treino estava contaminando o que o modelo aprende. O card 'Aprendizado (ML)' no Copilot agora mostra LONG e SHORT lado a lado, cada um com seu próprio progresso/acurácia/pesos. Quando ligar 'Pesos do score aprendido' em Filtros, cada sinal usa o modelo do seu próprio lado (LONG usa peso LONG, SHORT usa peso SHORT) — SHORT continua caindo pros pesos manuais até ter dado e padrão próprio suficiente." },
  { version: "Beta 1.554", note: "Labels de OI/LSR/RSI movidos pro canto inferior direito de cada painel. Novo: candles com \"spike pós-flat\" (volume estourando depois de uma base parada) agora ficam pintados de amarelo direto no gráfico principal, fácil de identificar — e o indicador de Volume ganhou um switch \"Destacar\" (ativo por padrão) que também realça essas barras de volume no próprio painel. Tudo calculado em cima da mesma MA de volume já usada no indicador, sem chamada de rede." },
  { version: "Beta 1.554", note: "A \"leitura ao vivo\" (OI subindo/caindo, LSR subindo/caindo, RSI recuperando) parou de depender do backend/Binance: agora os labels são plotados direto em cima dos próprios painéis de OI, LSR e RSI, lendo só os dados que esses indicadores já têm carregados na tela. Sem chamada de rede nenhuma — some de vez o \"Leitura ao vivo indisponível\" e qualquer risco de contribuir pro banimento 418 da Binance." },
  { version: "Beta 1.554", note: "Backend — o banimento da Binance (erro 418) continuava porque o próprio ciclo do scanner (200 ativos × 6 timeframes + OI + LSR a cada 60s) já usava um volume de chamadas quase no limite, mesmo sem a leitura ao vivo. Reduz temporariamente pra 80 ativos e ciclo a cada 120s (~5x menos chamadas) até confirmar estabilidade. Menos ativos escaneados e atualização um pouco mais lenta, mas evita cair no limite de novo." },
  { version: "Beta 1.554", note: "Backend — corrige o motivo da leitura ao vivo ficar 'indisponível': o excesso de chamadas (a cada 30s, de cada aba aberta) estava batendo no limite de taxa da Binance e derrubando o acesso temporariamente (erro 418). Agora o backend guarda a leitura de cada ativo por 20s antes de buscar de novo, e o app só atualiza a cada 90s (ou quando você troca de ativo), bem mais leve." },
  { version: "Beta 1.554", note: "ML — simplifica a leitura ao vivo: tira o botão/painel/filtros de antes e deixa só uma caixinha pequena e fixa no canto do gráfico, sempre visível, mostrando direto se OI/LSR estão subindo ou caindo e se o RSI tá recuperando (V) — sem precisar tocar em nada." },
  { version: "Beta 1.554", note: "ML — o botão 'ML' do gráfico agora também mostra uma 'Leitura ao vivo': pra QUALQUER ativo que você abrir (não só os que já viraram sinal), mostra na hora se o OI está subindo ou caindo, o LSR subindo ou caindo, se o RSI está recuperando de uma mínima (o 'V'), e se tem spike pós-flat — igual as anotações que você mesmo faz nos prints, só que automático e ao vivo." },
  { version: "Beta 1.554", note: "ML — novo botão 'ML' flutuante no gráfico: liga marcadores mostrando exatamente onde cada sinal registrado (automático ou manual) apareceu naquele ativo, coloridos pelo resultado (verde = bateu alvo, vermelho = bateu stop, amarelo = ainda em aberto), com a combinação de bloquinhos (S/R/O/L/F/P) ao lado. Dá pra filtrar tocando nas letras — ex: só OI+Pré-volume. Desligado por padrão, só leitura." },
  { version: "Beta 1.554", note: "ML — todo trade que você abre na aba Trade (ordem a Mercado) agora também vira amostra de treino, não só os sinais que o scanner detecta sozinho. Antes, sua entrada manual (baseada na sua leitura de RSI/OI/LSR) era invisível pro aprendizado; agora ela é registrada com o mesmo snapshot de dados e resolvida pelas mesmas regras de sempre (alvo/stop/tempo), só marcada como 'manual' pra diferenciar de detecção automática." },
  { version: "Beta 1.554", note: "Backend/ML — corrige a fonte de LSR (agora Binance Top Long/Short, igual ao gráfico, não mais Bybit) e um bug real: o OI da Binance nunca era buscado de verdade, ficava sempre num valor neutro/falso — agora busca certo. Como os dados antigos usavam as fontes erradas, o histórico de treino do ML foi zerado (arquivado, não apagado) pra não misturar dado velho com o novo, correto. Card 'Aprendizado (ML)' do Copilot volta a contar do zero." },
  { version: "Beta 1.554", note: "Scanner — novo toggle nos Filtros: 'Pesos do score' agora pode usar Manual (o que você ajusta em Filtros) ou 🤖 Aprendido (ML), os pesos que o modelo de machine learning aprendeu com os resultados reais dos sinais. Desligado por padrão; ao ativar, mostra o progresso do treino ou, já treinado, os pesos aprendidos por bloquinho e a acurácia real (medida em dado nunca visto). Só o score que você vê muda — o registro de sinais para o treino continua igual." },
  { version: "Beta 1.554", note: "ML — troca a espera fixa de 24h por monitoramento direto: agora cada sinal é acompanhado a cada ciclo e resolve assim que o preço bater +2% a favor (funcionou) ou -1% contra (falhou), com um teto de segurança de 4h caso não bata nenhum dos dois. Um spike que sobe e reverte em 20 minutos já vira amostra de treino em 20 minutos, não precisa esperar um dia inteiro." },
  { version: "Beta 1.554", note: "ML — volta o mínimo de amostras pra treinar de 300 para 200, a pedido: começa a treinar mais cedo. Com mais variáveis e menos amostra o risco de 'decorar' é um pouco maior, mas a acurácia real (medida em dado nunca visto) no card do Copilot deixa isso visível." },
  { version: "Beta 1.554", note: "ML híbrido — o modelo de aprendizado agora enxerga os valores reais por trás dos 6 bloquinhos (RSI exato, força do OI/LSR vs a média, intensidade do volume), não só sim/não, então aprende os próprios limiares em vez de ficar preso a 'RSI < 30'. Também troca a forma de medir acurácia: agora mede em dados que o modelo nunca viu no treino (antes media nos mesmos dados usados pra treinar, o que sempre parecia bom mas não dizia nada de real). Card do Copilot atualizado pra mostrar essa acurácia real separada da acurácia de treino." },
  { version: "Beta 1.554", note: "Copilot — novo card 'Aprendizado (ML)' mostrando o progresso do treino automático do scanner (quantos sinais estão em aberto/resolvidos, quantas amostras faltam pro treino, e assim que treinar, os pesos que o modelo aprendeu por bloquinho e a acurácia). Só leitura — não muda o score que você ajusta em Filtros." },
  { version: "Beta 1.554", note: "Performance — ao clicar um ativo no Scanner, o app disparava DOIS lotes completos de requisições (um pro TF novo no ativo antigo, outro pro ativo novo) quase ao mesmo tempo; agora dispara só um. Também corrige o oscilador RSI Multi-TF, que continuava misturando dados do ativo anterior por alguns instantes após trocar de ativo (cache não conferia se os dados eram do símbolo atual) — hoje ele fica em branco até os dados corretos chegarem, em vez de mostrar valores errados." },
  { version: "Beta 1.554", note: "Scanner — corrige a polaridade de cor do LSR: o bloco 'LSR abaixo da média' é o lado favorável dessa métrica (oposto do OI, que é favorável acima da média), então a seta de LSR agora fica verde quando está abaixo da média (e aponta pra baixo) e vermelha quando acima — antes usava a mesma regra do OI (verde só quando subindo/acima), o que mostrava seta verde pra cima mesmo quando o LSR favorável estava caindo." },
  { version: "Beta 1.554", note: "Scanner — alerta de Confluência total: novo chip nos Filtros mostra só os ativos com os 6 bloquinhos validados ao mesmo tempo; linhas em confluência total ganham destaque (borda dourada + etiqueta 6/6); o sininho de alertas (antes decorativo) acende e lista os últimos ativos que entraram em confluência, com notificação do navegador opcional." },
  { version: "Beta 1.554", note: "Scanner — refaz o Spike Score em 6 bloquinhos configuráveis (RSI sobrevenda, OI acima da média, LSR abaixo da média, flat volume bar, spike acima da(s) média(s) com toggle 1/2 MAs, pré-volume baixo), cada um exibido como checklist por ativo. Filtros ganha inputs reais para períodos de MA, zona/lookback do RSI e médias de OI/LSR. TF de detecção no Filtros agora funciona de verdade (antes só mudava o chip visualmente); o backend passa a manter todos os TFs pré-calculados." },
  { version: "Beta 1.554", note: "Positions — corrige detalhe do trade mostrando valores errados: um trade fechado por TP/SL em segundo plano (enquanto outro ativo estava na tela) é removido dos dados ao vivo e some da lista de 'abertos', mas o cache DVL_PAPER_TRADE_STORE.openPositions só se atualiza reativamente e podia manter uma cópia 'aberta' desatualizada. O card do Histórico usava a fonte correta (mostrava o PnL final real), mas ao tocar nele o popup de detalhe consultava esse cache antes de tudo e abria a gestão ao vivo com números antigos — parecendo que o trade fechou sozinho sem motivo. getPaperPositionById() agora consulta a fonte viva (getAllOrders(), sempre recalculada) primeiro, então detalhe e lista sempre batem." },
  { version: "Beta 1.554", note: "Positions — corrige Histórico dividido por ativo: o motor de paper trading só troca os dados em memória para o ativo novo quando certas interações disparam render() (clique, arraste, resize ou timer com ordens abertas). Abrir o Histórico logo após trocar de moeda podia ler dados antigos em memória e, por assumir que eles já cobriam o ativo atual, pulava a leitura real do localStorage do ativo novo — some trade sumia ou aparecia trocado. getAllOrders() agora sempre lê todos os slots persistidos por símbolo e só sobrepõe com a memória por id, então o Histórico é sempre um único histórico global, sem depender de qual ativo está aberto no momento." },
  { version: "Beta 1.554", note: "RSI Multi-TF — corrige segmentos que ultrapassam a zona sem colorir: a cor de cada trecho da linha era decidida pela média dos dois pontos, então um pico que cruzava a zona de sobrecompra/sobrevenda podia sair cinza se a média com o ponto vizinho caísse dentro da faixa neutra. Agora colore pelo extremo do segmento (se qualquer ponta cruza a zona, o trecho inteiro conta)." },
  { version: "Beta 1.554", note: "RSI Multi-TF — Volume MA e Volume Spike × agora têm efeito real: o peso do pico de volume na exaustão era (0.6+0.4×volSpike), limitando a faixa a 60%–100% do valor base (efeito quase imperceptível no RSI final). Trocado para (0.15+0.85×volSpike), então sem pico de volume o score cai perto de zero e com pico forte vai a 100% — os dois inputs agora mudam visivelmente a linha." },
  { version: "Beta 1.554", note: "Rodapé — ícone do Trade unificado: trocado o glifo de texto '↑↓' por um SVG no mesmo estilo de traço dos ícones de Home/Scanner/Positions/Watchlist, removendo a inconsistência visual entre os botões do rodapé." },
  { version: "Beta 1.554", note: "RSI Multi-TF — linha volta à espessura normal: revertido o engrossamento da linha durante o estouro dos TFs rápidos (era state.lineWidth + viz*3.4 desde a 1.030). O brilho e o ponto de pulso na zona extrema continuam." },
  { version: "Beta 1.554", note: "RSI Multi-TF — RSI Length e Push ajustáveis: dois novos inputs na seção Motor. 'RSI Length' controla o período do RSI base (padrão 14) e 'Push (força)' controla quanto a exaustão dos TFs menores empurra o RSI para as zonas (padrão 18, era fixo). Agora todo o motor — período, força, média e pico de volume — está no seu controle e atualiza em tempo real." },
  { version: "Beta 1.554", note: "RSI Multi-TF — média de volume ajustável: novo input 'Volume MA' na seção Motor controla a janela da média de volume usada para medir o pico (padrão 20 candles). Antes era fixa em 20. Junto com 'Volume Spike ×' define totalmente o motor de volume: MA menor reage mais rápido, MA maior suaviza. Afeta todos os TFs em tempo real." },
  { version: "Beta 1.554", note: "RSI Multi-TF — controle de pico de volume: novo input 'Volume Spike ×' no painel (seção Motor) controla o limiar de pico de volume do motor de exaustão. É quantas vezes a média de 20 candles de volume conta como pico total; menor = mais sensível (padrão 2.5). Antes esse valor era fixo (2.5×). Afeta o volSpike de todos os TFs em tempo real." },
  { version: "Beta 1.554", note: "RSI Multi-TF — estouro visível: a exaustão bruta é pequena (raramente passa de ~0.45), então o brilho antigo ficava quase invisível. Agora a intensidade é amplificada (×2.4) e, no estouro dos TFs rápidos, a linha ENGROSSA e BRILHA no segmento, mais um pulso no candle atual que dispara já na aceleração (antes da zona). Fica óbvio quando 1m/2m/3m aceleram juntos." },
  { version: "Beta 1.554", note: "RSI Multi-TF — antecipação e força: os timeframes MENORES agora pesam mais (peso decrescente suave, o TF mais rápido lidera), pois são a antecipação do movimento. Além disso o brilho (glow) da linha é proporcional à força da exaustão e já aparece antes de chegar na zona, pra você ver o quão forte o sinal está ficando." },
  { version: "Beta 1.554", note: "Multi-TF Exhaustion RSI: o RSI da TF atual é empurrado para as zonas de sobrecompra/sobrevenda pela exaustão detectada em até 5 timeframes menores (peso igual, sem divergência). Ex.: no 5m usa [1,2,3,4,5]; no 1h usa [5m,10m,15m,30m,1h]. Corrige também a corrupção de caracteres (UTF-8) que vazava ícones/botões no site inteiro." },
  { version: "Beta 1.554", note: "Positions Layout Fix: corrige a altura do card de posição (estava travado em 20px, com números/PnL transbordando e sobrepondo as linhas no Histórico) para altura automática com mínimo e padding, sem sobreposição." },
  { version: "Beta 1.554", note: "Asset Logo No-Flash (inline): pré-pintura do ícone/símbolo direto no elemento durante o parse, garantindo que o BTC padrão nunca apareça antes do ativo salvo mesmo em parse longo/dispositivo lento." },
  { version: "Beta 1.554", note: "Asset Logo No-Flash: o ícone/símbolo do ativo agora é pintado de forma síncrona com o ativo salvo antes do primeiro paint (sem piscar o BTC padrão), e classes de cor antigas são removidas para a cor correta." },
  { version: "Beta 1.554", note: "Asset Logo Flick Fix + Version Badge Sync: o ícone/logo do ativo no cabeçalho não é mais repintado em cada click/refresh (guard idempotente — só recria quando o ativo realmente muda), e a versão passou a ter um sync central de badge (window.DVL_syncVersionBadge). Chart, Scanner, Copilot, OI/LSR e bot intocados." },
  { version: "Beta 1.554", note: "Scanner 24h backend + early-pump engine: scanner servidor 24h (snapshot REST + WebSocket), detecção de ignição (volume morto abaixo da média → primeiro cruzamento), sinais persistentes que atualizam até o limite, OI real (MEXC) e LSR real (Bybit) com seta=posição vs média e cor=inclinação da média, mais recente no topo. Corrige sobreposição 'Sem dados ainda / Carregando' no gráfico." },
  { version: "Beta 1.554", note: "Scanner Pro Remodel: refaz a aba Scanner para o layout Scanner Pro com hero de leitura de mercado, busca, filtros concentrados no menu Filtros e tabela completa Spike Flow em escala próxima da referência." },
  { version: "Beta 1.554", note: "Scanner Pro Force Open Fix: corrige abertura real da aba Scanner, força overlay próprio do Scanner Pro, cobre o gráfico/cabeçalho, mantém rodapé, corrige cálculo runtime do spike e renderiza a tabela mesmo enquanto os dados carregam." },
  { version: "Beta 1.554", note: "Scanner Radar Logo A: troca o ícone antigo do Scanner Pro pelo conceito A, com radar circular, anéis concêntricos, sweep line e ponto de detecção no padrão verde DVL." },
  { version: "Beta 1.554", note: "Scanner Custom Filters: remove select/input nativo dos filtros do Scanner Pro, troca por chips e steppers próprios DVL e torna os botões de filtro funcionais no layout do site." },
  { version: "Beta 1.554", note: "Scanner Metric Filters: adiciona no menu Filtros as métricas do motor antigo do scanner para editar pesos de spike20, spike50, flatCandles, barPct, prevVolBelowHalf e priceGlueOk com steppers DVL customizados." },
  { version: "Beta 1.554", note: "Scanner Filter Sheet Fix: corrige corte lateral do Scanner Pro e troca a abertura dos filtros por sheet fixo custom DVL, garantindo que o botão Filtros abra e que os controles fiquem dentro da tela." },
  { version: "Beta 1.554", note: "Scanner Compact Filter Fit: enquadra melhor o Scanner Pro na tela mobile, reduz a base visual para evitar corte na direita e transforma o painel de filtros em um dropdown compacto ancorado no botão Filtros." },
  { version: "Beta 1.554", note: "Scanner Filter Panel -30%: reduz o dropdown/painel de Filtros em cerca de 30%, com largura, altura, paddings, chips, steppers e textos menores, preservando a funcionalidade completa no padrão DVL." },
  { version: "Beta 1.554", note: "Production Readiness: adiciona auditoria de produção, logs de erro seguros, verificação de panels/feed/filtros custom, trava de execução automática do bot e guard final para preparar teste em site real." },
  { version: "Beta 0.995", note: "Copilot Confluence Preserve: mantém todas as confluências existentes (VT, SZ, CS e EX) e aplica a regra Pump = OI↑ + LSR↓ apenas ao par OI/LS, sem zerar/recalcular o restante da leitura, Scanner e ordens intocados." },
  { version: "Beta 0.994", note: "Copilot OI/LSR Pump Confluence: ajusta a confluência DVL para tratar PUMP como OI subindo + LSR caindo; OI e LS só ficam alinhados juntos no Pré-Momentum/Oportunidades quando essa combinação aparece, mantendo Scanner e execução de ordens intocados." },
  { version: "Beta 0.993", note: "Copilot Stability Lock: estabiliza Oportunidades, Pré-Momentum e Chat IA com debounce, fonte única, preservação de scroll e atualização controlada, mantendo Scanner por último para a próxima alteração." },
  { version: "Beta 0.992", note: "Copilot Sync Bug Fix: estabiliza Pré-Momentum e Chat IA para usarem Oportunidades da IA como fonte única, eliminando alternância/flicker entre ativos e mantendo Scanner preservado para alteração posterior." },
  { version: "Beta 0.991", note: "Copilot Opportunities Live Engine: dá vida às Oportunidades da IA com leitura compacta de frescor, status do sinal, confluência DVL, próximo gatilho e motivo curto em cada linha, mantendo Scanner preservado para alteração posterior e Bot/ordens bloqueados." },
  { version: "Beta 0.990", note: "Copilot Live Pulse: dá vida aos painéis do Copilot sem alterar o Scanner; sincroniza Pré-Momentum com Oportunidades/ativo atual, atualiza confluência DVL, força, estágio, tempo do spike e contexto do Chat IA local mantendo Bot bloqueado e nenhuma execução de trade." },
  { version: "Beta 0.989", note: "Copilot AI Chat Penultimate: move o Chat IA DVL para a posição penúltima, imediatamente antes do DVL BOT SOON, mantendo Pré-Momentum acima dele, Bot/ordens bloqueados e sem tocar em API, indicadores, drawings, Trade ou fallback." },
  { version: "Beta 0.988", note: "Copilot AI Chat Site Helper: adiciona um chat compacto de IA dentro do Copilot para responder dúvidas sobre telas, painéis, scanner, oportunidades, Pré-Momentum, Trade, Positions, Watchlist, indicadores e tools do DVL, usando contexto local do site e mantendo Bot/ordens bloqueados." },
  { version: "Beta 0.987", note: "Copilot Opportunity Times + Standard Asset Logos: aplica os ícones/letras padrão DVL no Pré-Momentum e nas Oportunidades da IA, adiciona tempo do sinal nas oportunidades para diferenciar entrada atual de sinal antigo, mantendo Bot bloqueado e sem mexer em API, indicadores ou drawings." },
  { version: "Beta 0.986", note: "Copilot Pre-Momentum Compact: substitui o checklist da IA por um painel compacto de pré-momentum, com ativos para ficar de olho, estágio, força, tempo do spike e Confluência DVL em linha antes do Bot Soon, sem execução automática de trades." },
  { version: "Beta 0.983", note: "Copilot Top 3 Locked + Scanner Summary: remove o botão Top 3 das Oportunidades da IA, mantém Top 3 fechado, evita navegação para o scanner nessa seção e deixa o mini Scanner como resumo rápido aguardando evolução do Scanner padrão." },
  { version: "Beta 0.982", note: "Copilot Live Opportunities: conecta Oportunidades da IA ao contexto real do DVL, usando scanner real quando disponível e fallback seguro por candles atuais para atualizar ranking/confiança sem execução de trades." },
  { version: "Beta 0.981", note: "Copilot Live Context Core: conecta o Copilot ao ativo/candles reais já carregados no DVL, atualiza visão de mercado, regime, convicção e texto da IA sem executar trades." },
  { version: "Beta 0.980", note: "Copilot Modular Core: reorganiza a página Copilot Pro em registry de seções, templates isolados, actions bridge e factory de botões padronizados para facilitar futuras sessões sem alterar visual aprovado." },
  { version: "Beta 0.979", note: "Copilot Scanner Clean Icons Fit: remove estrelas de favorito do mini Scanner, usa ícone de scanner igual ao rodapé no título, adiciona ícone de alerta em Ativos a evitar e compacta a página para reduzir scroll." },
  { version: "Beta 0.978", note: "Copilot Scanner Ultra Compact Fix: compacta ainda mais o mini Scanner Inteligente, separa Tempo/Status, evita corte lateral dos badges e aproxima a proporção da referência aprovada." },
  { version: "Beta 0.977", note: "Copilot Pro Compact Scanner: ajusta proporções da página Copilot Pro, compacta cards/tabelas, remove logos do Scanner Inteligente e deixa o mini scanner com colunas mais legíveis." },
  { version: "Beta 0.976", note: "Copilot Pro Replicated Page: replica a tela DVL Copilot Pro no HTML com convicção da IA, visão de mercado, oportunidades, mini scanner inteligente com tempo do spike, ativos a evitar e Bot Soon bloqueado." },
  { version: "Beta 0.975", note: "Copilot Actions Bridge: adiciona ações seguras dentro do DVL Copilot para abrir Scanner, voltar ao gráfico/Trade, abrir Watchlist, atualizar ativo atual e manter Bot Soon bloqueado sem execução de trades." },
  { version: "Beta 0.974", note: "Home to Copilot Page: troca Home por Copilot no rodapé único V2, adiciona ícone de robozinho e página full overlay do DVL Copilot/IA com visão geral, oportunidades, ativos a evitar, scanner inteligente, desempenho e Bot Soon sem execução de trades." },
  { version: "Beta 0.973", note: "Watchlist Panel Real Close Fix: fecha o painel real #dvlWatchlistPanel ao trocar de botão no rodapé, sincroniza eventos de abrir/fechar do Watchlist novo e impede Watchlist/Scanner sobrepostos." },
  { version: "Beta 0.972", note: "Watchlist Close Sync Fix: faz Watchlist fechar corretamente ao trocar para Home/Scanner/Trade/Positions, sincroniza evento de abrir/fechar e mantém o rodapé único V2 compacto." },
  { version: "Beta 0.971", note: "Footer Compact Tune: reduz a altura visual do rodapé V2 e deixa o botão ativo apenas levemente maior que os demais, mantendo o glow padrão sem ficar testudo." },
  { version: "Beta 0.970", note: "Single Footer + Active Standard: oficializa #dvlBottomNavV2 como único rodapé visual/clicável, esconde o rodapé legado como bridge interno, padroniza o active/glow estilo Scanner em todos os botões e evita Scanner + Positions abertos juntos." },
  { version: "Beta 0.969", note: "Scanner Nav V2 Real Fix: corrige o botão Scanner real do rodapé #dvlBottomNavV2, trocando o ícone de markets/Scanner, sincronizando estado ativo verde quando o scanner abre/fecha e mantendo o botão antigo compatível." },
  { version: "Beta 0.965", note: "From 0.958 + Ruler Label Only: volta para a base em que drawings desenhavam normal e aplica somente label persistente da régua, sem mexer em viewport, chartPointToScreen, time/index, Indicators ou API/fallback." },
  { version: "Beta 0.958", note: "Tools/Drawings Audit Guard: adiciona auditoria neutra para validar ferramentas/desenhos, edição, handles, Long/Short e módulos de geometria/transform sem alterar comportamento visual ou API/fallback." },
  { version: "Beta 0.957", note: "Volume Profile + DVL Volume compact palette fix: reduz os botões de cor do Volume Profile no padrão do Moving Averages, aplica paleta atual sem navy/blue e coloca o painel DVL Volume no mesmo padrão compacto." },
  { version: "Beta 0.956", note: "Volume Profile hard compact real ID: corrige a compactação mirando o ID real #dvlVPPanel, mantendo alteração isolada somente no Volume Profile." },
  { version: "Beta 0.955", note: "Volume Profile compact only: padroniza apenas o painel DVL Volume Profile para a proporção compacta aprovada, sem mexer em DVL Volume, menu Indicators, API/fallback ou demais indicadores." },
  { version: "Beta 0.954", note: "Hard Rollback 0.951 Locked: descarta 0.952/0.953 por mexerem em estruturas travadas do menu Indicators/painéis; retorna exatamente à base 0.951 aprovada, preservando todos os inputs compactos padronizados." },
  { version: "Beta 0.951", note: "Moving Averages hard compact only: padroniza apenas o painel Moving Averages para a proporção compacta, reduzindo largura, altura e colunas da tabela sem alterar os demais indicadores." },
  { version: "Beta 0.950", note: "Spike Zones compact only: padroniza apenas o painel do DVL Spike Zones para a mesma proporção compacta aprovada, sem alterar os demais indicadores." },
  { version: "Beta 0.949", note: "Exhaustion RSI hard compact only: reforça a compactação do EXR com seletor específico do painel e escala visual real, sem alterar os demais indicadores." },
  { version: "Beta 0.948", note: "Exhaustion RSI compact only: padroniza apenas o painel do DVL Exhaustion RSI para a nova proporção compacta, preservando Delta Volume, Open Interest e Long/Short compactos." },
  { version: "Beta 0.947", note: "Long Short compact only: padroniza apenas o painel do DVL Long/Short Ratio para a nova proporção compacta, preservando Delta Volume e Open Interest compactos." },
  { version: "Beta 0.946", note: "Open Interest compact only: padroniza apenas o painel do DVL Open Interest para a nova proporção compacta, preservando Delta Volume e sem alterar os demais indicadores nesta etapa." },
  { version: "Beta 0.945", note: "Delta compact only: padroniza apenas o painel do DVL Delta Volume para a nova proporção compacta, sem alterar os demais indicadores nesta etapa." },
  { version: "Beta 0.944", note: "Bookmap -40%: reduz aproximadamente 40% da área/proporção visual do painel flutuante do DVL Bookmap, com largura/altura menores e controles mais compactos mantendo legibilidade." },
  { version: "Beta 0.943", note: "Bookmap compact panel: reduz a proporção do painel flutuante do DVL Bookmap para um tamanho mais compacto, mantendo o padrão visual DVL e a mesma estrutura do Spike Zones." },
  { version: "Beta 0.942", note: "Bookmap input standardized: DVL Bookmap agora abre no mesmo padrão de painel flutuante do DVL Spike Zones, removendo a expansão inline e padronizando a experiência de configuração." },
  { version: "Beta 0.941", note: "Oscillator UX standardization: padroniza abertura dos inputs pelo modelo flutuante, Bookmap abre em janela flutuante, compacta o DVL Exhaustion RSI e limita o app a 3 osciladores ativos por vez com aviso visual ao tentar ligar o 4º." },
  { version: "Beta 0.940", note: "Oscillators Final Controller: finaliza stack de osciladores exportando openPanel direto para OI/LS/DV, corrigindo toggle do Delta Volume via menu e adicionando auditoria central dos osciladores." },
  { version: "Beta 0.939", note: "OI Menu + EXR Scale Fix: coloca Open Interest diretamente na seção Oscillators do menu Phase 1B e adiciona escala direita/tag atual ao DVL Exhaustion RSI, sem mexer em API/fallback." },
  { version: "Beta 0.938", note: "OI Restore + Delta Volume Fix + Missing Oscillator Scales: reativa Open Interest, reforça load do Delta Volume com failover/derivação pelo chart e mantém escalas visíveis nos osciladores." },
  { version: "Beta 0.937", note: "Oscillator Pan Render Guard: protege o render dos osciladores durante pan/drag com isolamento por painel, placeholder de erro e auditoria, sem tocar em API/fallback." },
  { version: "Beta 0.936", note: "Real API Failover / No Fake Fallback: reconstruída da 0.931 aprovada; adiciona failover real Binance Futures/Spot e bloqueia makeFallback automático para nunca mostrar candles genéricos sem permissão explícita." },
  { version: "Beta 0.931", note: "Continuous Index Window Fix: troca o cálculo de janela por left/right edge fracionário baseado no índice global, removendo troca brusca de slice e sensação de lock ao navegar no passado." },
  { version: "Beta 0.929", note: "No Generic Fallback Guard: antes de qualquer fallback local, tenta carregamento real emergencial Binance; timeframes em segundos que falharem usam base real 1m em vez de candles genéricos." },
  { version: "Beta 0.928", note: "Chart Motion Smoothness/Test Gate: corrige a inconsistência entre spacing de render e spacing de pan/pinch usando span real totalSlots-1, removendo sensação de lock candle-a-candle ao navegar." },
  { version: "Beta 0.927", note: "API Real Source Baseline: trava a 0.926 como base aprovada para fonte real Binance, fallback explícito e auditoria de origem dos dados antes do próximo bloco." },
  { version: "Beta 0.926", note: "API Real Source Guard: impede que falha de OI/LSR/ticker derrube candles para fallback genérico; candles Binance Futures viram prioridade, segundos usam aggTrades real, e status da fonte API fica auditável." },
  { version: "Beta 0.925", note: "Past Fractional Pan Fix: remove o lock candle-a-candle ao navegar no passado, mantendo a fração do pan em chartOffsetCandles, slice com floor e slotOffset fracionado." },
  { version: "Beta 0.924", note: "Max Zoom Integer Lock: trava o zoom máximo de normal/hollow em 6 candles inteiros, mantendo proximidade TV-like com largura ajustada e removendo a última tiltada do zoom mais próximo; footprint mantém zoom largo." },
  { version: "Beta 0.923", note: "Fractional Slot Anchor Fix: corrige slotOffset fracionado no zoom máximo para impedir overflow do último candle e remover encaixe/tiltadas; aplica a mesma regra ao gráfico principal e mapas xForIndex." },
  { version: "Beta 0.922", note: "Candle Slot Stability Fix: normal/hollow voltam para render legacy direto com zoom TV-like, evitando bloco invisível/tiltadas; Render Bridge fica reservado para footprint e testes explícitos." },
  { version: "Beta 0.921", note: "Candle Legacy Anchor Fix: no modo padrão/hollow, o render bridge ancora corpo e pavio diretamente nas coordenadas legacy com pixel snap, removendo a sensação de bloco invisível/tiltadas; footprint mantém o perfil largo." },
  { version: "Beta 0.920", note: "Candle Zoom Profile/Test Gate: separa zoom/largura por modo; normal/hollow ficam TV-like e footprint preserva zoom largo/detalhado para leitura interna." },
  { version: "Beta 0.919", note: "Candle Width/Tilt Fix: preserva exatamente a largura legacy candleW no preset atual, remove espaço exagerado no zoom e estabiliza o render do pavio/corpo no Candle Render Bridge." },
  { version: "Beta 0.918", note: "Candle Render Bridge/Test Gate: conecta o desenho real dos candles ao DVL_CANDLE_RENDER_BRIDGE usando Geometry/Style com fallback legado, preservando modos normal/hollow/footprint." },
  { version: "Beta 0.917", note: "Candle Body/Wick Geometry: cria DVL_CANDLE_GEOMETRY_MODEL para calcular corpo, pavio, bounds, hitbox e render props dos candles usando Style/BarMetrics sem alterar o desenho visual." },
  { version: "Beta 0.916", note: "Candle Render Style Model: cria DVL_CANDLE_RENDER_STYLE_MODEL para centralizar estilo dos candles, cores, corpo, pavio, borda e presets sem alterar o visual atual." },
  { version: "Beta 0.915", note: "Drawing Transform Baseline: bloqueia a 0.914 como transform aprovado para mover corpo/handles de Arrow/Line/Rectangle/Text, preservando Long/Short, fallback legado, edit lock e Geometry Bridge." },
  { version: "Beta 0.914", note: "Drawing Transform Bridge/Test Gate: conecta _applyBodyDrag/_applyHandleDrag ao DVL_DRAWING_TRANSFORM_MODEL para Arrow/Line/Rectangle/Text, mantendo Long/Short e fallback legado." },
  { version: "Beta 0.913", note: "Drawing Transform Model Foundation: cria DVL_DRAWING_TRANSFORM_MODEL para centralizar move body/handles de Arrow/Line/Rectangle/Text usando Geometry/ToolPoint, sem conectar ainda no fluxo visual." },
  { version: "Beta 0.912", note: "Drawing Geometry Baseline: bloqueia a 0.911 como geometria aprovada para Arrow/Line/Rectangle/Text, preservando p1/p2/p, hit-test, handles, fallback legado e edit lock." },
  { version: "Beta 0.911", note: "Drawing Geometry Bridge/Test Gate: corrige suporte p1/p2/p no Geometry Model e conecta hit-test/handles dos drawings ao modelo, mantendo fallback legado e edit lock aprovado." },
  { version: "Beta 0.910", note: "Drawing Geometry Model Foundation: cria DVL_DRAWING_GEOMETRY_MODEL para centralizar projeção, bounds, handles e hit-test de Line/Arrow/Rectangle/Text sem alterar visual." },
  { version: "Beta 0.909", note: "Magnet Candidate Bridge: DVL_TOOL_MAGNET passa a preferir DVL_SNAP_CANDIDATE_MODEL antes do fallback ChartModel.snapToCandle, mantendo toggle, Ruler e drawings no mesmo comportamento aprovado." },
  { version: "Beta 0.908", note: "Snap Candidate Model: centraliza candidatos de snap em wick/body usando candles renderizados/cacheados, mantendo Long/Short sem imã e sem alterar visual." },
  { version: "Beta 0.907", note: "Render Candle Cache Model: adiciona cache para candles renderizados usando revisão dos candles + viewport + métricas, mantendo fallback legado e sem alterar visual/tools." },
  { version: "Beta 0.906", note: "Candle Revision Model: adiciona revisão única para candles raw/normalizados, permitindo detectar updates do candle atual e invalidar caches com segurança sem alterar visual." },
  { version: "Beta 0.905", note: "Candle Source Guard: remove risco de recursão no Candle Data Model, reforça origem raw em S.candles e adiciona auditoria de fonte/cache sem alterar visual." },
  { version: "Beta 0.904", note: "Candle Cache Model: adiciona cache seguro para candles normalizados, evitando renormalização excessiva sem alterar dados brutos, renderização ou tools." },
  { version: "Beta 0.903", note: "Candle Data Model Foundation: cria DVL_CANDLE_DATA_MODEL para separar candles brutos da API e candles normalizados usados pelo engine, sem alterar renderização." },
  { version: "Beta 0.902", note: "Engine Pipeline Baseline: bloqueia a 0.901 como pipeline aprovado e adiciona guard/auditoria para preservar modelos, Render Snap, edit lock e Long/Short sem imã nas próximas etapas." },
  { version: "Beta 0.901", note: "Pipeline Final Audit/Test Gate: adiciona auditoria consolidada dos modelos Chart/Viewport/BarMetrics/PriceScale/Projection/ToolPoint, Render Snap, cursor/drag bridges e edit lock aprovado; ponto recomendado para teste real." },
  { version: "Beta 0.900", note: "Tool Projection Bridge: DVL_TOOL_POINT_MODEL passa a preferir DVL_PROJECTION_MODEL para local/client/cross/toScreen, mantendo snap via Render Candle Model e preservando o edit lock aprovado da 0.894." },
  { version: "Beta 0.899", note: "Projection Model Foundation: cria DVL_PROJECTION_MODEL para unir viewport + price scale em uma projeção única index/preço ↔ x/y, sem alterar renderização atual." },
  { version: "Beta 0.898", note: "Price Scale Model Foundation: cria DVL_PRICE_SCALE_MODEL e conecta priceToY/yToPrice ao mesmo scale legado, preparando escala de preço única sem mudar renderização." },
  { version: "Beta 0.897", note: "Bar Metrics Model: cria DVL_BAR_METRICS_MODEL e faz o DVL_CHART_MODEL.barMetrics usar o viewport/spacing centralizado para body width, hitbox e wick sem alterar visual." },
  { version: "Beta 0.896", note: "Viewport Model Foundation: cria DVL_VIEWPORT_MODEL como camada única para logical range, bar step/spacing, future space e conversões index/x sem alterar o visual atual." },
  { version: "Beta 0.895", note: "Drawing edit lock baseline: comportamento aprovado da 0.894 bloqueado como base; adiciona auditoria/guard para garantir pointer lock de Arrow/Line/Rectangle/Text antes do chart pan." },
  { version: "Beta 0.894", note: "Drawing edit pointer lock: Arrow/Line/Rectangle/Text agora capturam pointerdown antes do chart pan, permitindo mover corpo e handles no mobile; Long/Short mantém o mesmo lock e criação/snap continuam pelo pipeline novo." },
  { version: "Beta 0.893", note: "Edit tools fix: restaura edição estável de Arrow/Line/Rectangle usando projeção legacy-safe no hit-test/drag, aumenta área de toque dos handles no mobile e mantém criação/snap pelo novo pipeline." },
  { version: "Beta 0.892", note: "Pipeline Audit/Test Gate: adiciona flags e auditoria final do fluxo Chart Model → Tool Point Model → Render Snap → Cursor/Drag, preparando o primeiro teste real sem alterar visual." },
  { version: "Beta 0.891", note: "Drag Model Bridge: movimentação de corpo/handles dos drawings e Long/Short calcula delta via DVL_TOOL_POINT_MODEL com snap desligado; mantém fallback legacy e preserva visual." },
  { version: "Beta 0.890", note: "Cursor Model Bridge: o cursor usado para criar drawings agora passa pelo DVL_TOOL_POINT_MODEL; Ruler/Arrow/Line/Rect/Text recebem snap pelo mesmo fluxo e Long/Short mantém cursor sem imã." },
  { version: "Beta 0.889", note: "Render Snap Bridge: snapToCandle passa a usar o Render Candle Model como fonte de x/y dos pavios e corpo; magnet fica preso ao candle visual real, não ao cálculo paralelo antigo." },
  { version: "Beta 0.888", note: "Render Candle Model: adiciona getRenderCandles(), getRenderCandleAtIndex() e nearestRenderCandleFromX() no DVL_CHART_MODEL para criar o candle visual interno sem alterar renderização atual." },
  { version: "Beta 0.887", note: "Tool Point Adapter: cria DVL_TOOL_POINT_MODEL como camada única para converter ponto local/client/cross e projetar para tela, com regra de magnet por tool; Ruler, drawings e Long/Short usam o mesmo adapter." },
  { version: "Beta 0.886", note: "Chart Model migration complete: adiciona auditoria interna DVL_CHART_MODEL.audit(), confirma motor de coordenadas ativo, magnet centralizado, Ruler/drawings/LongShort usando bridge único e visual preservado." },
  { version: "Beta 0.885", note: "Chart Model bridge Long/Short: criação de Long/Short passa a converter cross/evento pelo DVL_CHART_MODEL, mas continua sem imã; compatibilidade legacy preservada como fallback." },
  { version: "Beta 0.884", note: "Chart Model Foundation: cria DVL_CHART_MODEL como fonte única para raw candles, plot bounds, index/x, price/y e snap pavio/corpo; magnet, Ruler V2 e drawing tools passam a consultar o mesmo motor sem alterar visual." },
  { version: "Beta 0.883", note: "Tool ctx bar reposicionado abaixo das setas undo/redo; delete padronizado como X DVL para Ruler e demais tools, evitando diferença visual entre Ruler e Arrow." },
  { version: "Beta 0.882", note: "Ruler ctx bar padronizado pelo Arrow: o Ruler V2 agora usa a mesma classe visual, posição, dimensões, engrenagem e botão excluir do ctx bar aprovado dos desenhos." },
  { version: "Beta 0.881", note: "Chart Settings toggle fix: remove override específico do Imã tools para ele herdar exatamente o mesmo switch visual de Grid/Sessions; mantém apenas o subtítulo pavio/corpo." },
  { version: "Beta 0.880", note: "Tool Magnet padronizado: o mesmo snap do Ruler agora é usado por Linha, Retângulo, Texto e Seta; Long/Short continua sem imã. Toggle do Imã tools volta ao mesmo padrão visual dos outros switches. Barra gear/X padronizada usando a posição aprovada do Arrow como referência global dos tools." },
  { version: "Beta 0.879", note: "Chart Settings compact -30% + footer clearance: painel reduzido de 238px para 167px, menor altura visual, scroll interno e z-index acima do rodapé; Imã tools agora funciona em todos os desenhos e Ruler, mas não afeta Long/Short." },
  { version: "Beta 0.878", note: "Ruler polish + global Tool Magnet: padroniza a barra da régua no mesmo estilo DVL dos desenhos e adiciona toggle Imã tools nas configurações do gráfico para snap invisível em pavio alto/baixo e topo/fundo do corpo dos candles." },
  { version: "Beta 0.877", note: "Ruler V2 touch-lock: o core do gráfico agora ignora pan/zoom quando a régua está ativa ou quando o toque acerta uma régua; o cross da régua ganha lock de input e não deixa o gráfico roubar o gesto." },
  { version: "Beta 0.876", note: "Ruler fix: remove completamente o runtime legacy da régua e mantém apenas o DVL_BETA_0519_RULER_V2_JS como controlador oficial." },
  { version: "Beta 0.875", note: "TF slim menu: botões menores, mais variantes de timeframe e favoritos continuam indo para o scroll." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF clean global menu: restaura o botão TF real como trigger puro, remove painéis POC/dock e cria window.DVL_TF_MENU com open/close/toggle/apply/render." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF trigger core binding: o botão TF abre painel estático por listener delegado; botões do painel usam data-tf real e disparam o binding core já existente da plataforma." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF static dock always-on: deixa os timeframes em um dock estático visível, sem depender do botão TF/dropdown; aplica TF direto igual ao POC confirmado." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF static header final: remove o POC visível, substitui o botão TF antigo por botão estático com onclick direto e usa o painel TF estático confirmado pelo POC, oculto por padrão." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF STATIC POC: injeta um painel TF diretamente no HTML inicial do body, sem depender de criação via script no final da página; serve para confirmar se o arquivo novo está carregando e se o JS global executa." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF POC FORCE visible: adiciona um painel POC FORCE de timeframes sempre visível no topo para testar se o problema é clique/camada do botão TF ou renderização do menu; usa applyRealTimeframe/setIntervalUi direto." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF embedded header panel: substitui o dropdown flutuante do botão TF por um painel embutido no próprio cabeçalho Phase 1B, logo abaixo da hotbar, para escapar de camada/clip e confirmar abertura no mobile." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF in-place real menu fix: corrige o TF usando a mesma lógica de Velas/Indicadores/Desenhos: clona só o botão para limpar handlers antigos, mantém o menu real #dvl1b_tfDropMenu, move para body para escapar de camada/clip e força display/z-index no open." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF hard force layer: adiciona camada fixa por cima do botão TF visível, detecta IDs duplicados/camadas ocultas e força dropdown no body com z-index máximo." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF force open fix: corrige o botão TF para abrir no primeiro toque sem fechar no click fantasma do Android; usa touchstart/pointerdown/click como open-only e fecha apenas fora ou ao escolher um TF." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF capture coordinate fix: corrige definitivamente o botão TF usando captura global por coordenada, CSS global sem depender do wrapper, menu real clonado para body e hit-test robusto no Android." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF actual menu registry fix: corrige o botão TF no padrão real do cabeçalho, usando o #dvl1b_tfDropMenu original em vez de menu externo; remove o bloqueio display:none do patch anterior e padroniza abertura/fechamento no registry Phase 1B." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — TF button event fix: corrige o botão TF do cabeçalho removendo conflito com handlers antigos 0.783/0.807; o botão é clonado para limpar listeners antigos e ganha dropdown DVL próprio com touch/click robusto." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — EXR defaults + TF header fix: DVL Exhaustion RSI agora usa Upper Zone 60 e Lower Zone 35 por padrão; botão TF do cabeçalho ganha dropdown DVL funcional com seleção, favoritos e hotbar sincronizada." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Exhaustion RSI auto-fit: painel do DVL Exhaustion RSI agora enquadra a escala vertical pelo valor visível, zonas e linha média, reduzindo espaço vazio quando os extremos/níveis são ajustados." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Exhaustion RSI UX fix: corrige painel de inputs para não voltar ao topo ao editar valores e adiciona bolinha na ponta da linha quando o oscilador está em sobrecompra ou sobrevenda." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Indicator registry padrão: padroniza o DVL Exhaustion RSI na tabela real de Indicators, com row legacy, toggle ON/OFF, abertura do painel e sincronização com o menu Phase 1B." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — DVL Exhaustion RSI: novo oscilador inferior 0–100 baseado em impulso anterior, volume spike, pavio, fechamento fraco e absorption, com Calculation TF independente e painel DVL compacto." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap lines only: remove o profile lateral e os labels/tags do Bookmap; mantém apenas as linhas/faixas das ordens no gráfico, com heatmap granular e sem mexer em zoom/pan." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap refined heatmap: refina o visual do Bookmap sem alterar zoom/pan: heatmap mais granular, menos blocado, zonas fracas mais visíveis, profile lateral suavizado e labels reduzidos para não poluir o gráfico." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap zoom safe: remove a expansão automática da escala vertical que travava zoom/pan; mantém o Bookmap heatmap no core do gráfico sem alterar min/max do chart." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap fixed wide range: quando Bookmap está ON, BTC força visualização mínima de 10.000 USDT acima e 10.000 abaixo; outros ativos usam range proporcional para enxergar ordens bem mais distantes." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap expanded price range: quando o Bookmap está ON, o core expande automaticamente a escala vertical para pegar uma faixa de preço maior, mostrando mais zonas fracas e fortes do depth sem depender de overlay externo." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap Heatmap DepthVision: refaz o visual do Bookmap no core do gráfico com heatmap completo, zonas fracas visíveis, faixas fortes legíveis, perfil de liquidez lateral e tags Top/Strong/Medium no estilo bookmap." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap visual refinado: zonas não atravessam para trás, agora nascem na região recente do gráfico, usam gradiente suave, menos labels, agrupamento visual e tags laterais parecidas com oferta/demanda." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap core draw: remove o POC amarelo de teste e coloca o DVL Bookmap Zones direto dentro do drawPriceSection, no mesmo pipeline que provou funcionar na 0.819." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Hard core POC draw: teste definitivo: injeta uma zona POC amarela diretamente dentro da função drawPriceSection do canvas principal, sem overlay, sem wrapper, sem camada externa e sem depender de novo indicador." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap na mesma camada do VP: remove testes de overlay externo e injeta o Bookmap dentro do mesmo draw pipeline do Volume Profile, via wrapper de DVLVolumeProfileDraw, para desenhar na camada que já plota no gráfico." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Overlay z-index probe: eleva POC/Bookmap overlays acima das camadas Paper/LongShort, força os canvas de teste como últimos filhos do chartWrap e adiciona um probe visual LAYER OK para confirmar se a camada está aparecendo." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — POC zone plot test: adiciona uma zona POC de teste independente da API/depth para validar se o overlay realmente plota no gráfico. A zona usa volume dos candles visíveis e aparece direto sobre o gráfico." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap overlay engine: Bookmap não depende mais do draw hook interno do chart. Um canvas overlay próprio é criado sobre #chartWrap, mostra status visível e plota faixas de depth real quando ON." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap plot engine fix: substitui o draw bridge do Bookmap por engine de plot mais forte, com status visível, seleção de níveis mais permissiva, faixas horizontais full-width atrás dos candles e polling real de depth para garantir que o indicador realmente plote." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Indicators old proportion/toggle restored: restaura a proporção compacta do menu Indicators aprovado, usa switch visual igual ao modelo antigo, mantém todos os indicadores reais e normaliza defaults do Bookmap para remover NaN." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap found/toggle/plot fix: Bookmap não depende mais do módulo 0.808 estar vivo para aparecer no Indicators. Foi criado um core/shim estável, toggle ON/OFF próprio e draw bridge usando as mesmas configurações para plotar as zonas." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Indicators restored + Bookmap draw fix: restaura todos os indicadores reais no menu visível do Phase 1B, remove a lista falsa incompleta da 0.810, e adiciona draw bridge/polling de depth para o DVL Bookmap Zones plotar quando ON." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap inline settings: corrige o item Bookmap que aparecia mas não abria. Agora o menu Indicadores real do Phase 1B expande o DVL Bookmap Zones dentro do próprio dropdown, com controles visíveis e toggle ON/OFF funcional." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Bookmap visible Indicators menu: corrige o erro da 0.808 onde o indicador foi inserido no dropdown antigo escondido. O botão Indicadores do Phase 1B agora abre um menu visível próprio com DVL Bookmap Zones, toggle ON/OFF e acesso ao painel." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — DVL Bookmap Zones: substitui o módulo antigo de OrderBook Imbalance por um indicador limpo no menu Indicators, com toggle ON/OFF real, painel DVL sem dropdown nativo, dados Binance Futures/Spot e zonas de liquidez estilo bookmap atrás dos candles." },
  { version: DVL_APP_VERSION, note: "Beta 0.875 — Header De-overlap + TF real bridge: corrige conflito de versão no first paint, remove audit antigo 0.784 que mexia em favoritos, e conecta o dropdown TF visível do Phase 1B ao estado real de favoriteTimeframes/setIntervalUi." },
  { version: DVL_APP_VERSION, note: "Beta 0.804 — Safe Core Bridge: reparo não visual para integração de ativos. O Scanner/Analisar agora passa por um seletor seguro, símbolos suportados entram no registry, ícones acompanham cada ativo e ativos não suportados não caem mais em LTC/BTC." },
  { version: DVL_APP_VERSION, note: "Beta 0.802 — Scanner: botão Filtros funcional (spike mínimo, MA20, MA50, nº de ativos até 100). Menu Ordenar: Maior spike, Mais recente, Maior volume, Sem filtro. Scroll do painel limitado ao último ativo (sem void abaixo). Dropdown de assets: todos os pares USDT-M futuros da Binance + barra de pesquisa. CAND expandido para 200." },
  { version: DVL_APP_VERSION, note: "Beta 0.792 — Scanner: botão 'Api' ao lado de Alertas com menu MEXC / Binance / Bybit (MEXC e Binance ao vivo, Bybit desabilitado 'em breve'). Lista agora é Top 20 pares USDT rankeados por spike de volume na vela de 1h (top ~40 por volume 24h → klines 1h com concorrência limitada a 6 → ranqueia spike → top 20, atualiza por hora). Desenho de volume = volume REAL das 20 velas, sem dados fake: se a API falhar mostra 'Indisponível'. Só a exchange selecionada é usada (sem misturar). Card/painel visuais mantidos." },
  { version: DVL_APP_VERSION, note: "Beta 0.791 — MEXC Volume Spike Scanner portado para o source do repo (footer 'Scanner'). Cada card agora mostra uma linha compacta de metadados abaixo do setup: Vol xN (volume vs média), Flat Xc (candles flat antes do spike) e idade do sinal (Agora / Xm atrás). Mini gráfico de volume + MA20/MA50 e botão Analisar mantidos sem mudança de layout." },
  { version: DVL_APP_VERSION, note: "Beta 0.789 — DVL OB Imbalance Zones correção definitiva: item removido do HTML estático e inserido dinamicamente no boot (mesmo padrão do Spike Zones/Volume Trace/FEB que funciona no mobile). O HTML estático + binding separado impedia o addEventListener de vincular. Toggle e painel agora funcionam." },
  { version: "Beta 0.787", note: "Beta 0.787 — DVL OB Imbalance Zones fix: o item não respondia ao toque no mobile ('limbo'). Adicionados handlers touchend+click com dedup de 600ms na linha do indicador e no toggle ON/OFF (mesmo padrão que corrigiu o botão TF), e CSS touch-action:manipulation em #dvlOBIZItem. Tocar no toggle ativa/desativa; tocar na linha abre o painel de configurações." },
  { version: "Beta 0.786", note: "Beta 0.786 — DVL OB Imbalance Zones fix: painel de configurações abria atrás do dropdown de indicadores (z-index:100000 do fxIndicatorWrap vs z-index:99999 do painel); corrigido fechando o dropdown antes de abrir o painel, usando classList.add('is-open'), e adicionando CSS z-index:100002 para todos os painéis dvl-vt-panel quando dvl1b-ind-open está ativo." },
  { version: "Beta 0.785", note: "Beta 0.785 — DVL OB Imbalance Zones fix: painel de configurações agora abre corretamente ao clicar no indicador (display:block em vez de display:'')." },
  { version: "Beta 0.784", note: "Beta 0.784 — DVL OB Imbalance Zones: indicador overlay em tempo real via WebSocket público (Binance Futures/Spot, MEXC Futures/Spot); agrupa níveis do order book em buckets por ATR, calcula desequilíbrio bid/ask, desenha zonas de demanda/oferta com glow, borda e labels no gráfico; painel de configurações DVL com Exchange Adapter, Depth Levels, Bucket Mode, Min Imbalance, Strong Imbalance, Min Volume Pct, Max Zones, ATR Distance, cores, opacidade e glow; throttle de 400ms, auto-reconexão, detecção automática de troca de ativo." },
  { version: "Beta 0.783", note: "Beta 0.783 — TF dropdown fix: button label fixed as static 'TF'; click binding moved from bridge to module with touchend+click dedup guard for reliable mobile tap; touch-action:manipulation added to wrapper; version badge auto-updates via DVL_APP_VERSION." },
  { version: "Beta 0.782", note: "Beta 0.782 — Phase 1B header and TF favorites: removed the top more button, moved Settings into its place, shortened the asset selector, expanded visible TF favorites to four, and added a compact TF dropdown for favoriting/unfavoriting timeframes in the existing hotbar." },
  { version: "Beta 0.781", note: "Beta 0.781 — Existing UI timeframe binding: removed the extra header 5m button, bound the existing timeframe hotbar to the real chart interval engine, defaulted the real interval to 5m when no saved TF exists, and added a compact save/autosave status indicator next to Save." },
  { version: "Beta 0.780", note: "Beta 0.780 — Timeframe scroll selector and save status: vertical up/down TF wheel (dvlTfWheel) with 5m default, persisted via DVL_SELECTED_TIMEFRAME autosave/manual save; mini save status indicator (dvlSaveStatusMini) beside Save button shows dirty/saving/saved/auto/error states; existing .dvl1b-tf buttons sync with wheel." },
  { version: "Beta 0.779", note: "Beta 0.779 — Phase 1B header star fix: #dvl1b_favBtn uses same SVG star as nav watchlist (fill/stroke inline attrs bypass CSS cascade). Capture-phase listener + stopImmediatePropagation blocks old toggleAssetFavorites. Connected to watchlist store via _wlToggle/_wlHas. MutationObserver early-exit guard prevents DOM loop." },
  { version: "Beta 0.778", note: "Beta 0.778 — Header star owner fix: #dvlHeaderStar restored with innerHTML=☆/★ (text, no SVG). Click handler dispatches to [data-star-symbol] button in assetDropdown to sync IIFE's toggleFavoriteSymbol + watchlist _wlToggle simultaneously. MutationObserver on #currentFavoriteBtn mirrors IIFE state. MutationObserver on .marketRow re-patches if button recreated." },
  { version: "Beta 0.767", note: "Beta 0.767 — Fix header star not turning yellow: window.symbol is IIFE-local and never exposed on window; watchlist module now reads the current symbol from the #symbolText DOM element via _getCurSym(), so the star correctly turns yellow/filled when the asset is in the Watchlist." },
  { version: "Beta 0.766", note: "Beta 0.766 — TP/SL execution fix: the price engine was reading window.ticker which is never set (ticker is a local IIFE variable); now reads window.S.candles for the current chart price, so TP/SL fires correctly for the current asset and via WebSocket for all other assets." },
  { version: "Beta 0.765", note: "Beta 0.765 — Watchlist and asset icons: the header star now adds/removes the current asset from a persistent Watchlist, the footer Watchlist button opens a real favorites panel, and asset icons now update per symbol instead of showing the BTC icon for every pair." },
  { version: "Beta 0.764", note: "Beta 0.764 — Demo wallet and realtime execution: Paper TP/SL and pending orders now execute in real time across symbols without opening the asset, Demo balance uses margin like real trading, Tax was renamed to Fee, and entry/exit fees now affect PnL, equity and trade history." },
  { version: "Beta 0.763", note: "Beta 0.763 — Positions detail actions fix: position details now open from the clicked trade id with real store data, Positions and detail PnL refresh in real time, View on chart switches to the position symbol, TP/SL move button was removed, partial close opens a percentage panel, and close position works across symbols." },
  { version: "Beta 0.762", note: "Beta 0.762 — Paper realtime multi-symbol engine: pending orders, open positions, TP/SL execution and floating PnL now update in real time for all symbols with Paper activity, without needing to open the symbol on the chart." },
  { version: "Beta 0.761", note: "Beta 0.761 — Live PnL no painel Positions: DVL_POSITIONS_REFRESH() no final de render() para atualizar preço atual e PnL a cada ciclo do chart." },
  { version: "Beta 0.760", note: "Beta 0.760 — Fix positions panel: revert adapter changes from 0.759 que quebraram o painel; store continua ativo via addTradeToHistory + eventos." },
  { version: "Beta 0.759", note: "Beta 0.759 — DVL_PAPER_TRADE_STORE: store central com pendingOrders, openPositions e tradeHistory; histórico máximo 100 trades; persistência cross-reload." },
  { version: "Beta 0.758", note: "Beta 0.758 — getAllOrders() scan direto de localStorage: garante todos os ativos sem depender de registry." },
  { version: "Beta 0.757", note: "Beta 0.757 — Multi-symbol positions: show all assets' trades in Positions panel; fix history lost on symbol switch; baseOrder uses rawSym()." },
  { version: "Beta 0.756", note: "Beta 0.756 — Fix trade close root cause: rawSym() bypasses S.sym lag so symbol guard and key() use the correct symbol immediately." },
  { version: "Beta 0.755", note: "Beta 0.755 — Fix trade closes on symbol change; fix selector button not updating on symbol change." },
  { version: "Beta 0.754", note: "Beta 0.754 — Fix risk() hardcoded min=1 that sent TP/SL to limbo on low-priced coins (XRP, DOGE etc); sanitize corrupted orders." },
  { version: "Beta 0.753", note: "Beta 0.753 — Remove setTimeout; fix entry label during loading; re-render paper after loadAll." },
  { version: "Beta 0.752", note: "Beta 0.752 — Fix TP/SL visibility regression: clear state.edit after OK/Cancel confirmed, protect renderOrder early return." },
  { version: "Beta 0.751", note: "Beta 0.751 — V2 Pro pending UX: BUY/SELL LIMIT/STOP label, X inside entry tag, OK/Cancel on every drag, state.edit guard prevents activation during review." },
  { version: "Beta 0.750", note: "Beta 0.750 — global drag guard; no X on resting limit tag; BUY/SELL LIMIT/STOP label; re-drag shows confirm." },
  { version: "Beta 0.749", note: "Beta 0.749 — limit order X lives inside label (reverts edit); no external cancel button." },
  { version: "Beta 0.748", note: "Beta 0.748 — limit orders show confirm/cancel on drag; editConfirm guards maybeTriggerPending; infinite re-edit." },
  { version: "Beta 0.747", note: "Beta 0.747 — dropdown 400px, site palette (no blue); watchlist opens favorites panel; symbol text syncs after selection." },
  { version: "Beta 0.746", note: "Beta 0.746 — drag cannot trigger/close trades; X only on entry line; TP/SL clamped at entry." },
  { version: "Beta 0.745", note: "Beta 0.745 — symbol dropdown: full-width on mobile, clamped on desktop." },
  { version: "Beta 0.744", note: "Beta 0.744 — reset CSS static; symbol dropdown moves to body to escape display:none parent." },
  { version: "Beta 0.743", note: "Beta 0.743 — reset fills pill height as square; symbol dropdown via pure JS." },
  { version: "Beta 0.742", note: "Beta 0.742 — reset icon scales with pill; asset dropdown escapes hidden marketRow." },
  { version: "Beta 0.741", note: "Beta 0.741 — gear icon fixed; settings panel wired to chart settings." },
  { version: "Beta 0.740", note: "Beta 0.740 — reset ↺ fills pill height; symbol selector wired in new header." },
  { version: "Beta 0.739", note: "Beta 0.739 — reset ↺ fills pill height; symbol selector wired in new header." },
  { version: "Beta 0.738", note: "Beta 0.738 — demo wallet starts at 10k, tracks realized PnL; reset ↺ button next to DEMO pill." },
  { version: "Beta 0.737", note: "Beta 0.737 — position cards reduced to 40px; list height capped." },
  { version: "Beta 0.736", note: "Beta 0.736 — pending × always visible on chart; drag clamped to chart bounds." },
  { version: "Beta 0.735", note: "Beta 0.735 — Real mode shows no demo data; pending orders have delete button." },
  { version: "Beta 0.734", note: "Beta 0.734 — fixed history detail using live price instead of realizedPnl; timeline now shows date." },
  { version: "Beta 0.733", note: "Beta 0.733 — position details panel now shows real V2 Pro order data (entry, qty, TP, SL, PnL, timeline)." },
  { version: "Beta 0.732", note: "Beta 0.732 — dvl:position-detail-open event; Funding field removed; Gestão rápida moved above grid, open trades only." },
  { version: "Beta 0.731", note: "Beta 0.731 — fixed Positions click-outside using composedPath so tab/list clicks inside the panel never trigger close." },
  { version: "Beta 0.730", note: "Beta 0.730 — click-outside closes all panels (Trade excepted); history capped at 100 trades." },
  { version: "Beta 0.729", note: "Beta 0.729 — fixed pending order lifecycle, smart Limit/Stop classification and closed trade history for Positions." },
  { version: "Beta 0.728", note: "Beta 0.728 — Fixed Positions data adapter and pending order lifecycle: drafts no longer appear or activate before confirmation, and Limit/Stop triggers now respect orderType." },
  { version: "Beta 0.727", note: "Beta 0.727 — Positions panel refreshes on open; limit order price validation removed." },
  { version: "Beta 0.726", note: "Beta 0.726 — Positions panel wired to paper trading runtime; Limit/Stop orders auto-close drawer." },
  { version: "Beta 0.725", note: "Beta 0.725 — removed fake trades from Positions panel, removed DVL Teste 1 and Teste 2 indicators." },
  { version: "Beta 0.724", note: "Beta 0.724 — integrated functional Positions panel, Watchlist bottom nav rename, Demo/Real toggle and Position Details drawer." },
  { version: "Beta 0.723", note: "Beta 0.723 — all indicators OFF by default for new users, sessions OFF by default, DVL Teste removed from defaults." },
  { version: "Beta 0.722", note: "Beta 0.722 — footer active button 55px centered, logo click reloads page, indicator panel 250px." },
  { version: "Beta 0.721", note: "Beta 0.721 — compact Indicators dropdown remodel based on approved mockup, preserving existing indicator logic." },
  { version: "Beta 0.720", note: "Beta 0.720 — replaced Trade button HTML (clean glyph, removed tradePullGlyph and swap SVG), cancelled conflicting ::before rules." },
  { version: "Beta 0.719", note: "Beta 0.719 — fixed Trade footer button visual, prevented trade panel from overlapping bottom nav, restored compact chart corner controls, and removed remaining blue/cyan toggles." },
  { version: "Beta 0.718", note: "Beta 0.718 — real bottom nav button transplant from 0.728, chart corner controls aligned, removed dead space above footer, and final blue/cyan purge across switches, toggles, keypads, tools and panels." },
  { version: "Beta 0.717", note: "Beta 0.717 — Bottom nav visual transplant from 0.728 and final black/green theme lock. Header frozen." },
  { version: "Beta 0.716", note: "Beta 0.716 — Global removal of legacy navy/blue/cyan theme residues, unified black/green DVL theme across chart body, price scale, bottom nav, drawers and panels. Header frozen." },
  { version: "Beta 0.715", note: "Beta 0.715 — Global black/green visual unification for chart body, price scale, time scale, volume and bottom nav using 0.728 as reference. Header frozen. Removed navy/blue from canvas drawing: grid rgba(64,105,145)->(122,155,145), price/time labels blue-grey->green-grey, current price line brighter green, candle bull #13dc8d->#10df77, bear #ff4a61->#ff3037, oscillator scale pills cyan->#10df77, volume MA cyan->#10df77. CSS token overrides: --green, --red, --grid, --text, --muted." },
  { version: "Beta 0.714", note: "Beta 0.714 — Chart Body + Bottom Nav Visual Match: body bg blue->green radial, canvasWrap green borders, bottomNav floating pill (17px radius, green-black gradient, green border), navItem.active green radial + glow (color #10df77), homeLine hidden, app padding-bottom 88px for floating nav clearance. CSS-only; no chart engine changes." },
  { version: "Beta 0.713", note: "Beta 0.713 — 4-point UI/bridge correction: (1) Indicators compact: width min(300px,100vw-20px), max-height 54vh, denser items; (2) Desenhos clean open: strip/gear hidden, only menu visible; (3) Candles active state: Velas button turns green when menu open, active item highlighted in menu; (4) TF scroll picker: replaces 3 fixed TF buttons with 13-TF horizontal scroll strip (1s-1D), active TF in green, scroll into view on tap." },
  { version: "Beta 0.712", note: "Beta 0.712 — Phase 2B-FIX-2 (Indicators Compact Size): CSS-only compact fix for the indicators panel. Root causes: #fxIndicatorWrap had height:32px making it a 32px ghost and misplacing the dropdown 39px too low — fixed with height:0. No max-height on dropdown — full sidebar height — fixed with max-height:56vh + overflow-y:auto. Width clamped to min(310px,100vw-18px). Items compacted: 44px min-height, 30px badge, 13px title, 10.5px subtext, 44px toggle. No new bridges; Drawings 2C, Indicators 2B, Velas 2A all unchanged." },
  { version: "Beta 0.711", note: "Beta 0.711 — Phase 2C (Drawings): the new-UI Desenhos button now opens the existing old drawing tools panel (#assetToolsShell/#assetToolsMenu) via the old is-open/aria pattern (dvlCloseDrawToolsMenu reused). Panel revealed from the hidden .marketRow with the same visibility trick used for indicators; repositioned fixed under the new button. Green/black theme applied. Cache-Control meta tags added to fix mobile browser caching. Settings still not connected; Indicators 2B and Velas 2A unchanged." },
  { version: "Beta 0.710", note: "Beta 0.710 — Phase 2B-FIX (Theme Unification): CSS-only re-skin of the old #indicatorDropdown to match the new green/black UI when opened from the overlay (scoped to html.dvl1b-ind-open). Green/black gradient, green border, no cyan glow, muted soon labels in gold/gray. No new functional bridges; indicator logic untouched; Desenhos/Settings unconnected; Velas unchanged." },
  { version: "Beta 0.709", note: "Beta 0.709 — Phase 2B (Indicators): the new-UI Indicators button now opens the existing old indicators dropdown (#indicatorDropdown) via the old openIndicatorsDropdown/closeIndicatorsDropdown functions, revealed from the hidden toolbar and repositioned under the new button. Old panel reused (not recreated); indicator logic/oscillators untouched. Desenhos/Settings still not connected; Velas unchanged." },
  { version: "Beta 0.708", note: "Beta 0.708 — Badge/save fixes + Phase 2A (Candles): inline version badge now follows DVL_APP_VERSION; Save shows 'Salvar' on mobile and 'Salvar perfil' only >=768px; the new-UI Velas button now opens a custom DVL dropdown (Candles/Hollow/Heikin Ashi/Footprint/Renko call the old setCandleMode; Line/Area/Bars shown disabled). No other buttons connected; chart untouched." },
  { version: "Beta 0.707", note: "Beta 0.707 — Phase 1C visual refinement: lighter compact Salvar button (responsive label), premium BTC/USDT asset block, tighter header alignment, softer hotbar dividers and more uniform spacing. Visual-only — no new functional bridges, chart untouched." },
  { version: "Beta 0.706", note: "Beta 0.706 — Phase 1B inline UI: replaced the failed 0.705 iframe overlay with an inline single-file header/hotbar (#DVL_UI_OVERLAY_PHASE_1B) styled like the 0.728 design. No iframe, no second file. The real #chart stays visible; old header/market-row/timeframe-toolbar are hidden only after the inline UI is confirmed present, so the app survives if it is missing. Bridges Save / Favorite / Timeframe 1m-5m-15m." },
  { version: "Beta 0.705", note: "Beta 0.705 (superseded by 0.706) — Phase 1 iframe UI overlay: blanked the screen on deploy when the second file failed to load; removed." },
  { version: "Beta 0.704", note: "Beta 0.704 — Rollback stability and object persistence: restored the stable 0.702 Paper baseline, removed the unstable 0.703 smooth viewport changes, and protected Paper/drawings from disappearing when changing timeframe by resolving anchors from time+price instead of index-only." },
  { version: "Beta 0.703", note: "Beta 0.703 — Smooth Viewport Engine: chart pan now moves continuously by pixel/fractional candle offset instead of snapping by rounded candle slices, with Paper and drawings aligned to the same continuous chart transform." },
  { version: "Beta 0.702", note: "Beta 0.702 — Paper ENTRY close fix: ENTRY X now closes active Paper trades or cancels pending Paper orders without starting drag, freezing the chart, or leaving Paper gesture locks active." },
  { version: "Beta 0.701", note: "Beta 0.701 — Paper lock start fix: Paper drag lock no longer blocks the Paper startDrag event, buttons no longer trigger permanent lock, and all Paper locks are safely released on pointer/touch end." },
  { version: "Beta 0.700", note: "Beta 0.700 — Header leak and hard Paper gesture lock: removed raw JS leaking above the header and made Paper TP/SL/ENTRY drags lock chart pointerdown/pan/zoom/crosshair from the first touch." },
  { version: "Beta 0.699", note: "Beta 0.699 — Paper gesture isolation: TP/SL/ENTRY drags now lock chart pan/zoom/crosshair, keeping the graph static while Paper elements are moved." },
  { version: "Beta 0.698", note: "Beta 0.698 — Clean Paper V2 integration: removed legacy Paper Trading visual/runtime conflicts and made the 0.697 TradingView-style Paper module the single active Paper system." },
  { version: "Beta 0.688", note: "Beta 0.688 — Paper Limit placement reset: simplified Limit/Stop draft placement, ENTRY tag draggable with × cancel button, draft confirm buttons follow ENTRY during drag, suppressed stray legacy elements, unified Market/Limit visual base." },
  { version: "Beta 0.687", note: "Beta 0.687 — Hotfix: draft Limit/Stop confirm (✓/×) buttons now appear correctly; render() calls renderEditConfirm before renderDraftPosition so draft confirm buttons are not immediately cleared." },
  { version: "Beta 0.686", note: "Beta 0.686 — Paper Trading Placement Flow Fix: draft spawns at current price, ENTRY draggable, pending orders cancelable with ×, labels centered on lines." },
  { version: "Beta 0.685", note: "Beta 0.685 — Scale label compact fix: standardized current price and oscillator scale labels to fit the 70px right scale without card-like oversized boxes." },
  { version: "Beta 0.684", note: "Beta 0.684 — Paper Draft Entry Selection + Label Alignment Polish: draft Limit/Stop plots ENTRY/TP/SL immediately, labels 10 bars right of anchor, reduced opacity, fixed size, pointer-events:none." },
  { version: "Beta 0.683", note: "Beta 0.683 — HTML/CSS structure hotfix: fixed nested/duplicated style closing around 0675–0682 markers without changing Paper logic." },
  { version: "Beta 0.682", note: "Beta 0.682 — Mobile UI polish hotfix: fixed duplicate style close, real Limit/Stop draft flow, anchored TP/SL/ENTRY labels, and measured scale label sizing." },
  { version: "Beta 0.681", note: "Beta 0.681 — Mobile UI polish: fixed header code leak, non-sticky TP/SL/ENTRY labels, Limit/Stop pending order flow, and proportional scale labels." },
  { version: "Beta 0.680", note: "Beta 0.680 — Release candidate gate: certified the optimized baseline as stable and ready for new feature work." },
  { version: "Beta 0.679", note: "Beta 0.679 — Optimized baseline freeze: froze the post-cleanup stable base after 0.678 verified readyForOptimizedBaselineFreeze." },
  { version: "Beta 0.678", note: "Beta 0.678 — Safe historical audit cleanup batch 3: removed retired 0.673/0.674 audit modules after 0.677 post-cleanup inventory confirmed safe removal." },
  { version: "Beta 0.677", note: "Beta 0.677 — Post-cleanup inventory: classified all style/script modules, confirmed 0.673/0.674 safe for removal." },
  { version: "Beta 0.676", note: "Beta 0.676 — Audit chain reconciliation: classified active gates vs retired/historical audits." },
  { version: "Beta 0.675", note: "Beta 0.675 — Removed legacy getMigratedXxx Button System shims after 0.674 confirmed no external consumers." },
  { version: "Beta 0.674", note: "Beta 0.674 — Button System shim consumer audit: verified external usage before removing legacy getMigratedXxx compatibility shims." },
  { version: "Beta 0.673", note: "Beta 0.673 — Safe Button System cleanup: removed dead dvl-btn-migrated-* references from Button System while preserving compatibility shims." },
  { version: "Beta 0.672", note: "Beta 0.672 — Safe HTML class cleanup batch 2: removed dead dvl-btn-migrated-* diagnostic class tokens." },
  { version: "Beta 0.671", note: "Beta 0.671 — Phase 4.1: safe CSS cleanup batch 1, retiring empty button migration CSS markers 0.645–0.655." },
  { version: "Beta 0.670", note: "Beta 0.670 — Phase 4.0: Final optimization inventory and safe cleanup map." },
  { version: "Beta 0.669", note: "Beta 0.669 — Phase 3.3: baseline freeze candidate; congela contratos estruturais para otimização final e novas funções." },
  { version: "Beta 0.668", note: "Phase 3.2: feature gate audit e freeze-candidate check para validar se a base está pronta para congelamento, otimização final e novas funções." },
  { version: "Beta 0.667", note: "Phase 3.1: runtime integration audit for Paper layer, oscillator bounds publisher and safe resync pipeline." },
  { version: "Beta 0.666", note: "Phase 3.0: oscillator bounds publisher + safe Paper resync hook." },
  { version: "Beta 0.665", note: "Phase 2.9: oscillator safe clamp + audit verification for Paper layer bounds." },
  { version: "Beta 0.664", note: "Phase 2.8: Paper sync non-invasive hotfix + oscillator bounds read-only audit." },
  { version: "Beta 0.663", note: "Phase 2.7: Paper layer anchor + oscillator-safe sync; normaliza offsets internos do Paper após price scale 70px." },
  { version: "Beta 0.662", note: "Phase 2.6: lock final de gap chart/canvas/footer e geometria do trade drawer 150px sem sobrepor o footer." },
  { version: "Beta 0.661", note: "Phase 2.5: lock final do chrome estrutural, travando header/assetbar e footer/footer buttons conforme Layout Contract." },
  { version: "Beta 0.660", note: "Phase 2.4: lock final da timer/Indicators hotbar em 30px, alinhando a cascata CSS com o Layout Contract." },
  { version: "Beta 0.659", note: "Phase 2.3: hotfix/final cascade lock for right price scale 70px." },
  { version: "Beta 0.658", note: "Phase 2.2: sincronização prática da right price scale para 70px conforme Layout Contract." },
  { version: "Beta 0.657", note: "Phase 2.1: auditoria read-only de assertions do Layout Contract para detectar gaps, sobreposições e divergências de dimensões sem alterar visual." },
  { version: "Beta 0.656", note: "Phase 2.0: contrato/auditoria de layout read-only para chart, Paper Trading, osciladores e trade drawer." },
  { version: "Beta 0.655", note: "Phase 1.13: migração piloto visual-neutral dos botões Buy/Sell .tradeAction para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.654", note: "Phase 1.12: migração piloto visual-neutral do drawerBtn para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.653", note: "Phase 1.11: migração piloto visual-neutral dos botões paper confirm/edit para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.652", note: "Phase 1.10: migração piloto visual-neutral dos botões de tools/desenhos para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.651", note: "Phase 1.9: migração piloto visual-neutral dos botões dos dropdowns de asset/favoritos/indicadores para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.650", note: "Phase 1.8: migração piloto visual-neutral dos botões do keypad custom para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.649", note: "Phase 1.7: migração piloto visual-neutral das opções de order type/dropdown para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.648", note: "Phase 1.6: migração piloto visual-neutral dos botões de painel/controles para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.647", note: "Phase 1.5: migração piloto visual-neutral dos botões de header/toolbar para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.646", note: "Phase 1.4: migração piloto visual-neutral dos botões de timeframe para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.645", note: "Phase 1.3: migração piloto visual-neutral dos botões do footer para o DVL_BUTTON_SYSTEM." },
  { version: "Beta 0.644", note: "Phase 1.2: adiciona tokens/classes scaffold do sistema de botões sem alteração visual." },
  { version: "Beta 0.643", note: "Phase 1.1: refresh/observer seguro do DVL_BUTTON_SYSTEM para registrar botões dinâmicos sem alteração visual." },
  { version: "Beta 0.642", note: "Hotfix: corrige DVL_BUTTON_SYSTEM inserido como <script> aninhado dentro do script principal." },
  { version: "Beta 0.641", note: "Phase 1: scaffold do DVL_BUTTON_SYSTEM para padronização futura de botões sem alteração visual." },
  { version: "Beta 0.640", note: "Touch guard selector patch: inclui paper layer e confirmação de edição para impedir vazamento de eventos ao gráfico." },
  { version: "Beta 0.639", note: "Phase 0: UI/touch guard scaffold e marcação de superfícies UI antes da padronização de botões." },
  { version: "Beta 0.638", note: "Fix: native DVL demo-position text removed; labels 10 candles right of creation; edit label stable." },
  { version: "Beta 0.637", note: "Fix: Limit ≠ Market (0.5% offset); labels centered; edit label no longer escapes to right edge." },
  { version: "Beta 0.636", note: "Fix: Paper Trading tag positioning — MutationObserver eliminates flicker; right:auto CSS override prevents CSS-caused flash." },
  { version: "Beta 0.635", note: "Fix: Paper Trading — tags float 10 candles ahead of creation point; pending ENTRY shows LIMIT instead of Long/Short Limit." },
  { version: "Beta 0.634", note: "Feat: Paper Trading 0.598 — Y coords and layer bounds confined to price pane; oscillator-safe." },
  { version: "Beta 0.633", note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },
  { version: "Beta 0.632", note: "Fix: remove TickVol; candle fluido (WS base TF + 250ms); Buy/Sell demo position." },
  { version: "Beta 0.631", note: "Feature: VP Sessão 2 — POC·2/VAH·2/VAL·2 de timeframe independente, sem barras." },
  { version: "Beta 0.630", note: "Feature: Auto-save — symbol + settings persisted every 30 s, badge salvo HH:MM." },
  { version: "Beta 0.629", note: "Fix: Volume Profile panel — custom stepper/dropdown/palette, zero native controls." },
  { version: "Beta 0.628", note: "Feature: FEB V2 — presets Clean/Normal/Scanner + suspect mini-bubbles + stronger mechanics." },
  { version: "Beta 0.627", note: "Bugfix: FEB 7 fixes — palette picker, strict conditions, typeof guards, showOnlyStrong, same-type merge, cache key + vol delta label." },
  { version: "Beta 0.626", note: "Bugfix: FEB toggle ON/OFF + liquidation lines OFF por padrão." },
  { version: "Beta 0.625", note: "Feature: DVL Flow Event Bubbles — overlay de eventos compostos de fluxo." },
  { version: "Beta 0.624", note: "Feature: OI live poll 1m — dados reais de OI em 1m via polling real-time." },
  { version: "Beta 0.623", note: "Bugfix: OI oscillator — uma barra por período (sem repetição no 1m)." },
  { version: "Beta 0.622", note: "Feature: Kline WebSocket — candle em formação atualizado em tempo real." },
  { version: "Beta 0.621", note: "Bugfix: POC/VAH/VAL hysteresis — sem flickering ao arrastar o gráfico." },
  { version: "Beta 0.620", note: "Feature: VP Timeframe selector (1h/4h/1d/…) — prev period + current in formation." },
  { version: "Beta 0.619", note: "Bugfix: VP draw try/finally — escala e osciladores paravam de aparecer." },
  { version: "Beta 0.618", note: "Bugfix: VP triangular close-peaked (sem flatlines) + fix vpX0 (labels POC/VAH/VAL)." },
  { version: "Beta 0.617", note: "Bugfix: VP body-weighted + clamp sell/buyW (sem artefatos visuais)." },
  { version: "Beta 0.616", note: "Feature: VP split buy/sell por barra + buyVolume nos klines." },
  { version: "Beta 0.615", note: "Bugfix: VP barras ancoradas em x1 (escala de preco)." },
  { version: "Beta 0.614", note: "Feature: Volume Profile (VP) + configuracoes persistentes." },
  { version: "Beta 0.613", note: "Bugfix: auto-scale p5/p95 — candle outlier nao achata chart nem OI." },
  { version: "Beta 0.612", note: "Bugfix: OI autoScale p2/p98 — candle outlier no OI nao achata os demais." },
  { version: "Beta 0.611", note: "Bugfix: 1s nativo Binance + resample para 5s/10s/15s/30s — evita travamento do chart." },
  { version: "Beta 0.610", note: "Feature: TFs de segundos (1s/5s/10s/15s/30s) no seletor." },
  { version: "Beta 0.609", note: "Bugfix: VT liveBars aggMs; fetchTickBars tfMs; _origVTDraw fallback quando events vazio." },
  { version: "Beta 0.608", note: "Feature: WebSocket aggTrade ao vivo (1s bars); TV e VT usam Binance WS sem VPS." },
  { version: "Beta 0.607", note: "Bugfix: VT fallback klines-based; range 2h; anti-spam TTL." },
  { version: "Beta 0.606", note: "Bugfix: TV timestamp; TV OI model; VT 1s usa /api/ticks/bars; VT price fallback." },
  { version: "Beta 0.605", note: "Refactor: DV modelo OI identico — basePanel, panelMetrics, xForIndex, yMap, drawScaleTag." },
  { version: "Beta 0.604", note: "Bugfix: DV alinhamento e escala OI-style." },
  { version: "Beta 0.603", note: "Bugfix: DV/TV period correto; painel settings abre; escala adicionada." },
  { version: "Beta 0.602", note: "Bugfix: toggle DV/TV verde/ON; Teste e Teste 2 removidos do menu." },
  { version: "Beta 0.601", note: "Bugfix: oscillatorWindow chamava funcao inexistente — corrigido para visibleWindow()." },
  { version: "Beta 0.600", note: "Badge BETA = hard refresh no mobile." },
  { version: "Beta 0.599", note: "Bugfix: DVLDeltaVolume e DVLTickVolume no painel Indicators." },
  { version: "Beta 0.598", note: "Tick Volume: barras de 1s via coletor local." },
  { version: "Beta 0.597", note: "Bugfix: Delta Volume nao carregava dados." },
  { version: "Beta 0.596", note: "Delta Volume: oscilador buy/sell/delta via klines 1m." },
  { version: "Beta 0.595", note: "Bugfix: OI e L/S nao atualizavam ao trocar de ativo." },
  { version: "Beta 0.594", note: "Bugfix: Volume Trace renderPanel body vazio (#dvlMaBody errado)." },
  { version: "Beta 0.593", note: "OI: seletor Coins/USD; pavios reais via sub-periodo." },
  { version: "Beta 0.592", note: "L/S: MA laranja sobre ratio, periodo configuravel." },
  { version: "Beta 0.591", note: "OI e L/S: painel de configuracoes. Pill ON/OFF permanece. MA do OI no painel." },
  { version: "Beta 0.590", note: "OI: MA ciano configuravel via input na linha (substituido por painel)." },
  { version: "Beta 0.589", note: "Revert OI Bybit (unidade ambigua). Spike Zones warmup fix mantido." },
  { version: "Beta 0.588", note: "OI Bybit revertido. Spike Zones: warm=atrLen(14) em vez de max(volLen,atrLen)." },
  { version: "Beta 0.587", note: "Long/Short Ratio agregado Binance + Bybit: merge por timestamp 50/50. Bybit so no modo global." },
  { version: "Beta 0.586", note: "OI e Long/Short Ratio: paginacao 3x500=1500 pontos em requests paralelos. Historico ~3x maior em todos os timeframes." },
  { version: "Beta 0.585", note: "Fix critico: setupChartInteractions() nunca era chamada (a chamada sumiu na refatoracao do 0.583). Grafico nao respondia a nenhum toque." },
  { version: "Beta 0.584", note: "Fix: ev.target !== canvas rejeitava toque sobre overlays. Substituido por verificacao de bounding rect." },
  { version: "Beta 0.583", note: "Zoom/pinch reescrito do zero: handler unificado em window capture elimina race condition onde 2 dedos simultaneos nao iniciavam pinch. Factor incremental amortecido 0.72 +-12%/move + pan por midpoint = mecanica do DVL legado." },
  { version: "Beta 0.582", note: "Mecanica de zoom do DVL antigo recuperada: view float, fator incremental amortecido (0.72), clamp +/-12%, pan por midpoint." },
  { version: "Beta 0.581", note: "Badge de versao corrigido: era texto estatico fixo em BETA 0.875. Agora atualiza automaticamente a partir de DVL_APP_VERSION em todo bump futuro." },
  { version: "Beta 0.580", note: "Pinch-assist reescrito: _dvlWP rastreia ponteiros do window handler para nao interferir no tap/crosshair do canvas. stopImmediatePropagation durante pinch impede drag dos osciladores. clearCrossPressTimer no inicio do pinch." },
  { version: "Beta 0.579", note: "Pinch zoom corrigido: segundo dedo agora registrado em qualquer elemento da tela via window capture, nao apenas sobre o canvas do grafico. viewport maximum-scale=1 adicionado para impedir zoom de pagina do browser durante pinch." },
  { version: "Beta 0.578", note: "Real 15s/30s aggTrade candles + real footprint data via /api/footprint. server.js tfToMs com suporte a segundos." }
];
/* ===== DVL_TOUCH_GUARD_MODULE_0640 =====
   Phase 0 scaffold. Identifies UI surfaces (buttons, panels, dropdowns, number
   pad, paper-trading tags/labels, tools menus) so taps on them do not leak into
   the chart as pan/zoom/crosshair. The chart canvas (#chart) and non-UI overlays
   keep interacting normally. Visual design is unchanged. */
(function(){
  "use strict";

  var UI_SELECTOR = [
    'button','input','select','textarea','[role="button"]','[data-dvl-ui="true"]',
    '.bottomNav','.tradeDrawer','.tradeDrawerSheet','.tradeDrawerBody',
    '.panelBtn','.panelMetric','.tradeAction','.panelToggle',
    '.numberPadOverlay','.numberPadSheet','.orderTypeMenu',
    '.indicatorDropdown','.assetDropdown','.assetToolsMenu','.candleTypeMenu',
    '.tfMoreMenu','.dvlDrawSettingsPanel','.dvlDrawCtxBar','.dvlTextPanel',
    '.dvl-paper-tag','.dvl-paper-edit-label-fixed','.dvl-paper-confirm',
    '.assetFavoritesDrawer','.assetFavoritesSheet',
    '.dvl-paper-layer','.dvl-paper-edit-confirm','.dvl-paper-line','.dvl-paper-edit-label'
  ].join(',');

  function evTarget(ev){
    if(!ev) return null;
    return ev.target || ev.srcElement || null;
  }

  /* The real chart canvas must always interact (pan/pinch/zoom/crosshair). */
  function isChartAllowedTarget(ev){
    var t = evTarget(ev);
    if(!t) return false;
    if(t.id === 'chart') return true;
    if(t.tagName && t.tagName.toUpperCase() === 'CANVAS' &&
       t.closest && t.closest('#chartWrap')) return true;
    return false;
  }

  /* True when the pointer's real target is (inside) a UI surface. */
  function isUiTarget(ev){
    var t = evTarget(ev);
    if(!t || !t.closest) return false;
    return !!t.closest(UI_SELECTOR);
  }

  /* The chart handlers consult this: block chart reaction for UI taps,
     never block a genuine canvas interaction. */
  function shouldBlockChartPointer(ev){
    if(isChartAllowedTarget(ev)) return false;
    return isUiTarget(ev);
  }

  /* Marks existing UI containers with data-dvl-ui="true" without visual change. */
  function markUiSurface(root){
    try{
      var scope = root || document;
      if(!scope.querySelectorAll) return;
      var nodes = scope.querySelectorAll(UI_SELECTOR);
      for(var i=0;i<nodes.length;i++){
        var n = nodes[i];
        if(!n || n.id === 'chart') continue;
        if(n.setAttribute && n.getAttribute('data-dvl-ui') !== 'true'){
          n.setAttribute('data-dvl-ui','true');
        }
      }
    }catch(_){}
  }

  function init(){ markUiSurface(document); }

  window.DVL_TOUCH_GUARD = {
    UI_SELECTOR: UI_SELECTOR,
    isUiTarget: isUiTarget,
    isChartAllowedTarget: isChartAllowedTarget,
    shouldBlockChartPointer: shouldBlockChartPointer,
    markUiSurface: markUiSurface,
    init: init
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();

// ===== DVL_BUTTON_SYSTEM_MODULE_0655 =====
(function(){
"use strict";

var ROLE_CLASS_MAP = {
  footer:    'dvl-btn-footer',
  timeframe: 'dvl-btn-header',
  header:    'dvl-btn-header',
  icon:      'dvl-btn-icon',
  dropdown:  'dvl-btn-dropdown',
  panel:     'dvl-btn-panel',
  trade:     'dvl-btn-trade',
  keypad:    'dvl-btn-keypad',
  paper:     'dvl-btn-paper',
  tools:     'dvl-btn-tools'
};

var SELECTOR_MAP = [
  { selector: '.navItem',                       role: 'footer'    },
  { selector: '.tfBtn',                         role: 'timeframe' },
  { selector: '.smallChartBtn',                 role: 'header'    },
  { selector: '.indBtn',                        role: 'header'    },
  { selector: '.iconBtn',                       role: 'icon'      },
  { selector: '.menuBtn',                       role: 'dropdown'  },
  { selector: '.panelBtn',                      role: 'panel'     },
  { selector: '.panelToggle',                   role: 'panel'     },
  { selector: '.tradeAction',                   role: 'trade'     },
  { selector: '.orderTypeOption',               role: 'dropdown'  },
  { selector: '.numberPadSheet button',         role: 'keypad'    },
  { selector: '.drawerBtn',                     role: 'panel'     },
  { selector: '.panelCloseX',                   role: 'panel'     },
  { selector: '.dvl-paper-confirm button',      role: 'paper'     },
  { selector: '.dvl-paper-edit-confirm button', role: 'paper'     },
  { selector: '.dvlDrawCtxBar button',          role: 'tools'     },
  { selector: '.dvlDrawSettingsPanel button',   role: 'tools'     },
  { selector: '.assetFavoritesSheet button',    role: 'dropdown'  },
  { selector: '.assetDropdown button',          role: 'dropdown'  },
  { selector: '.indicatorDropdown button',      role: 'dropdown'  }
];

var registry = [];
var observer = null;
var refreshScheduled = false;

function registerButton(el, options){
  if(!el || el.__dvlButtonRegistered) return;
  el.__dvlButtonRegistered = true;
  el.setAttribute('data-dvl-button', 'true');
  el.setAttribute('data-dvl-ui', 'true');
  el.setAttribute('data-dvl-button-version', '0.655');
  el.setAttribute('data-dvl-button-scaffold', 'true');
  if(options && options.role)
    el.setAttribute('data-dvl-button-role', options.role);
  if(options && options.role === 'footer'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-footer');
  }
  if(options && options.role === 'timeframe'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-header');
  }
  if(options && options.role === 'header'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-header');
  }
  if(options && options.role === 'icon'){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-icon');
  }
  if(options && options.role === 'dropdown' &&
     el.classList.contains('menuBtn')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
  }
  if(options && options.role === 'dropdown' &&
     el.classList.contains('orderTypeOption')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
  }
  if(options && options.role === 'keypad' &&
     el.closest && el.closest('.numberPadSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-keypad');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetFavoritesSheet')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.assetDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
  }
  if(options && options.role === 'dropdown' &&
     el.closest && el.closest('.indicatorDropdown')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-dropdown');
  }
  if(options && options.role === 'tools' &&
     el.closest && (el.closest('.dvlDrawCtxBar') || el.closest('.dvlDrawSettingsPanel'))){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-tools');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
  }
  if(options && options.role === 'paper' &&
     el.closest && el.closest('.dvl-paper-edit-confirm')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-paper');
  }
  if(options && options.role === 'trade' &&
     el.classList.contains('tradeAction')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-trade');
  }
  if(options && options.role === 'panel' &&
     el.classList.contains('drawerBtn')){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-panel');
  }
  if(options && options.role === 'panel' &&
     (el.classList.contains('panelBtn') ||
      el.classList.contains('panelToggle') ||
      el.classList.contains('panelCloseX'))){
    el.classList.add('dvl-btn');
    el.classList.add('dvl-btn-panel');
  }
  registry.push(el);
}

function registerBySelector(selector, options){
  var els = document.querySelectorAll(selector);
  for(var i = 0; i < els.length; i++) registerButton(els[i], options);
}

function setState(el, state, value){
  if(!el) return;
  el.setAttribute('data-dvl-state-' + state, String(value));
}

function isButtonTarget(ev){
  var t = ev && ev.target;
  if(!t) return false;
  return !!(t.closest && t.closest('[data-dvl-button="true"]'));
}

function preventChartLeak(ev){
  if(!isButtonTarget(ev)) return;
  ev.stopPropagation();
}

function refresh(root){
  var scope = root || document;
  for(var i = 0; i < SELECTOR_MAP.length; i++){
    var m = SELECTOR_MAP[i];
    if(scope.nodeType===1 && scope.matches && scope.matches(m.selector)){
      registerButton(scope,{role:m.role});
    }
    var els = scope.querySelectorAll ? scope.querySelectorAll(m.selector) : [];
    for(var j = 0; j < els.length; j++) registerButton(els[j], { role: m.role });
  }
  if(window.DVL_TOUCH_GUARD && typeof window.DVL_TOUCH_GUARD.markUiSurface === 'function'){
    try{ window.DVL_TOUCH_GUARD.markUiSurface(scope); }catch(_){}
  }
  return registry.length;
}

function observe(root){
  if(!window.MutationObserver) return;
  if(observer) return;
  var target = root || document.body;
  var pendingRoots=[];
  observer = new MutationObserver(function(mutations){
    for(var i=0;i<mutations.length;i++){
      var added=mutations[i].addedNodes;
      for(var j=0;j<added.length;j++){
        var n=added[j];
        if(n&&n.nodeType===1) pendingRoots.push(n);
      }
    }
    if(!pendingRoots.length || refreshScheduled) return;
    refreshScheduled = true;
    var flush=function(){
      refreshScheduled=false;
      var roots=pendingRoots.splice(0,pendingRoots.length);
      for(var k=0;k<roots.length;k++) refresh(roots[k]);
    };
    if(window.requestAnimationFrame) requestAnimationFrame(flush);
    else setTimeout(flush,50);
  });
  observer.observe(target, { childList: true, subtree: true });
}

function getRoleCounts(){
  var counts = {};
  for(var i = 0; i < registry.length; i++){
    var role = registry[i].getAttribute('data-dvl-button-role') || 'unknown';
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function listByRole(role){
  var result = [];
  for(var i = 0; i < registry.length; i++){
    if(registry[i].getAttribute('data-dvl-button-role') === role) result.push(registry[i]);
  }
  return result;
}

function audit(){
  var footerEls = listByRole('footer');
  var footerMigrated = 0;
  var timeframeEls = listByRole('timeframe');
  var timeframeMigrated = 0;
  var headerEls = listByRole('header');
  var headerMigrated = 0;
  var iconEls = listByRole('icon');
  var iconMigrated = 0;
  var allPanelEls = listByRole('panel');
  var allDropdownEls = listByRole('dropdown');
  var orderOptionTotal = 0;
  var assetFavoriteTotal = 0;
  var assetDropdownTotal = 0;
  var indicatorDropdownTotal = 0;
  for(var i = 0; i < allDropdownEls.length; i++){
    var el = allDropdownEls[i];
    if(el.classList.contains('orderTypeOption')) orderOptionTotal++;
  }
  var keypadEls = listByRole('keypad');
  var keypadMigrated = 0;
  var toolsEls = listByRole('tools');
  var toolsMigrated = 0;
  var paperEls = listByRole('paper');
  var paperConfirmTotal = 0;
  var paperEditConfirmTotal = 0;
  var drawerTotal = 0;
  for(var i = 0; i < allPanelEls.length; i++){
    if(allPanelEls[i].classList.contains('drawerBtn')) drawerTotal++;
  }
  var tradeEls = listByRole('trade');
  var tradeActionTotal = 0;
  var tradeActionMigrated = 0;
  var buyTradeActionTotal = 0;
  var sellTradeActionTotal = 0;
  for(var i = 0; i < tradeEls.length; i++){
    var el = tradeEls[i];
    if(el.classList.contains('tradeAction')){
      tradeActionTotal++;
      if(el.classList.contains('buy')) buyTradeActionTotal++;
      if(el.classList.contains('sell')) sellTradeActionTotal++;
    }
  }
  return {
    total:                     registry.length,
    roles:                     getRoleCounts(),
    registered:                registry.length,
    observed:                  observer !== null,
    footerTotal:               footerEls.length,
    footerMigrated:            footerMigrated,
    timeframeTotal:            timeframeEls.length,
    timeframeMigrated:         timeframeMigrated,
    headerTotal:               headerEls.length,
    headerMigrated:            headerMigrated,
    iconTotal:                 iconEls.length,
    iconMigrated:              iconMigrated,
    panelControlTotal:         allPanelEls.length,
    drawerTotal:               drawerTotal,
    tradeActionTotal:          tradeActionTotal,
    tradeActionMigrated:       tradeActionMigrated,
    buyTradeActionTotal:       buyTradeActionTotal,
    sellTradeActionTotal:      sellTradeActionTotal,
    orderOptionTotal:          orderOptionTotal,
    keypadTotal:               keypadEls.length,
    keypadMigrated:            keypadMigrated,
    toolsTotal:                toolsEls.length,
    toolsMigrated:             toolsMigrated,
    paperConfirmTotal:         paperConfirmTotal,
    paperEditConfirmTotal:     paperEditConfirmTotal,
    assetFavoriteTotal:        assetFavoriteTotal,
    assetDropdownTotal:        assetDropdownTotal,
    indicatorDropdownTotal:    indicatorDropdownTotal
  };
}

function init(){
  refresh(document);
  observe(document.body);
}

window.DVL_BUTTON_SYSTEM = {
  registry:                          registry,
  registerButton:                    registerButton,
  registerBySelector:                registerBySelector,
  setState:                          setState,
  isButtonTarget:                    isButtonTarget,
  preventChartLeak:                  preventChartLeak,
  refresh:                           refresh,
  observe:                           observe,
  count:                             function(){ return registry.length; },
  getRoleCounts:                     getRoleCounts,
  listByRole:                        listByRole,
  audit:                             audit,
  init:                              init
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();
// ===== DVL_LAYOUT_CONTRACT_MODULE_0656 =====
(function(){
"use strict";

var _lastSnapshot = null;
var _baselines = {};

function getRect(el){
  if(!el) return { exists: false, top: null, left: null, right: null, bottom: null, width: null, height: null };
  var r = el.getBoundingClientRect();
  return {
    exists: true,
    top:    r.top,
    left:   r.left,
    right:  r.right,
    bottom: r.bottom,
    width:  r.width,
    height: r.height
  };
}

function getOscillators(){
  var selectors = ['.dvlOscillator', '.dvl-oscillator', '.oscillatorPanel',
                   '[data-dvl-oscillator]', '[data-oscillator-panel]'];
  var found = [];
  for(var s = 0; s < selectors.length; s++){
    var els = document.querySelectorAll(selectors[s]);
    for(var i = 0; i < els.length; i++) found.push(getRect(els[i]));
  }
  return found;
}

function getPaperLines(){
  var els = document.querySelectorAll('.dvl-paper-line');
  var result = [];
  for(var i = 0; i < els.length; i++) result.push(getRect(els[i]));
  return result;
}

function getPaperEditLabels(){
  var els = document.querySelectorAll('.dvl-paper-edit-label');
  var result = [];
  for(var i = 0; i < els.length; i++) result.push(getRect(els[i]));
  return result;
}

function measure(){
  var snap = {
    timestamp:       Date.now(),
    viewport:        { width: window.innerWidth, height: window.innerHeight },
    header:          getRect(document.querySelector('.top')),
    assetBar:        getRect(document.querySelector('.marketRow')),
    toolbar:         getRect(document.querySelector('.toolbar')),
    canvasWrap:      getRect(document.querySelector('.canvasWrap')),
    chart:           getRect(document.getElementById('chart')),
    footer:          getRect(document.querySelector('.bottomNav')),
    tradeDrawer:     getRect(document.querySelector('.tradeDrawer')),
    tradeDrawerSheet:getRect(document.querySelector('.tradeDrawerSheet')),
    paperLayer:      getRect(document.querySelector('.dvl-paper-layer')),
    paperLines:      getPaperLines(),
    paperEditLabels: getPaperEditLabels(),
    paperConfirm:    getRect(document.querySelector('.dvl-paper-confirm')),
    paperEditConfirm:getRect(document.querySelector('.dvl-paper-edit-confirm')),
    oscillators:     getOscillators()
  };
  _lastSnapshot = snap;
  return snap;
}

function audit(){
  var snap = measure();
  var bs = window.DVL_BUTTON_SYSTEM;
  var bsAudit = null;
  var tradeActionMigrated = 0;
  var drawerMigrated = 0;
  try{
    if(bs && typeof bs.audit === 'function'){
      bsAudit = bs.audit();
      tradeActionMigrated = bsAudit.tradeActionMigrated || 0;
      drawerMigrated = bsAudit.drawerMigrated || 0;
    }
  }catch(_){}
  return {
    version:              "0.656",
    chartExists:          snap.chart.exists,
    canvasWrapExists:     snap.canvasWrap.exists,
    footerExists:         snap.footer.exists,
    tradeDrawerExists:    snap.tradeDrawer.exists,
    paperLayerExists:     snap.paperLayer.exists,
    oscillatorCount:      snap.oscillators.length,
    buttonSystemExists:   !!(bs),
    buttonSystemFrozen:   !!(bs && bs.registry),
    tradeActionMigrated:  tradeActionMigrated,
    drawerMigrated:       drawerMigrated,
    noLayoutMutation:     true,
    snapshot:             snap
  };
}

function freezeBaseline(name){
  var key = name || "default";
  _baselines[key] = measure();
  return _baselines[key];
}

function compareWithBaseline(name){
  var key = name || "default";
  var base = _baselines[key];
  if(!base) return { error: "no baseline stored for: " + key };
  var now = measure();
  function diff(a, b, field){
    if(a == null || b == null) return null;
    return b - a;
  }
  return {
    canvasWrap: {
      heightDiff: diff(base.canvasWrap.height, now.canvasWrap.height),
      topDiff:    diff(base.canvasWrap.top,    now.canvasWrap.top),
      bottomDiff: diff(base.canvasWrap.bottom, now.canvasWrap.bottom)
    },
    chart: {
      heightDiff: diff(base.chart.height, now.chart.height),
      topDiff:    diff(base.chart.top,    now.chart.top),
      bottomDiff: diff(base.chart.bottom, now.chart.bottom)
    },
    footer: {
      topDiff:    diff(base.footer.top,    now.footer.top),
      bottomDiff: diff(base.footer.bottom, now.footer.bottom)
    },
    tradeDrawerSheet: {
      topDiff:    diff(base.tradeDrawerSheet.top,    now.tradeDrawerSheet.top),
      bottomDiff: diff(base.tradeDrawerSheet.bottom, now.tradeDrawerSheet.bottom),
      heightDiff: diff(base.tradeDrawerSheet.height, now.tradeDrawerSheet.height)
    },
    oscillatorCount: {
      before: base.oscillators.length,
      after:  now.oscillators.length,
      diff:   now.oscillators.length - base.oscillators.length
    }
  };
}

function getLastSnapshot(){
  return _lastSnapshot;
}

window.DVL_LAYOUT_CONTRACT = {
  VERSION:              "0.656",
  measure:              measure,
  audit:                audit,
  freezeBaseline:       freezeBaseline,
  compareWithBaseline:  compareWithBaseline,
  getLastSnapshot:      getLastSnapshot
};

})();
// ===== DVL_LAYOUT_ASSERTIONS_MODULE_0657 =====
(function(){
"use strict";

var _lastAudit = null;

function getExpectedContract(){
  return {
    header:               55,
    assetHotbar:          50,
    chartToolbar:         30,
    footerMenu:           57,
    footerButtons:        55,
    rightPriceScaleWidth:80,
    tradeDrawerMaxHeight: 150
  };
}

function computeSectionMismatches(expected, staticSizes){
  var mismatches = [];
  if(!staticSizes) return mismatches;
  var keys = Object.keys(expected);
  for(var i = 0; i < keys.length; i++){
    var k = keys[i];
    if(typeof staticSizes[k] === 'number' && staticSizes[k] !== expected[k]){
      mismatches.push({
        key:      k,
        expected: expected[k],
        actual:   staticSizes[k],
        diff:     staticSizes[k] - expected[k]
      });
    }
  }
  return mismatches;
}

function safeNum(val){
  return (typeof val === 'number' && isFinite(val)) ? val : null;
}

function computeGap(a, b){
  if(a == null || b == null) return null;
  return b - a;
}

function audit(){
  var expected = getExpectedContract();
  var staticSizes = window.DVL_SECTION_SIZES_PX || null;
  var mismatches = computeSectionMismatches(expected, staticSizes);
  var recommendations = [];

  var snap = null;
  if(window.DVL_LAYOUT_CONTRACT && typeof window.DVL_LAYOUT_CONTRACT.measure === 'function'){
    try{ snap = window.DVL_LAYOUT_CONTRACT.measure(); }catch(_){}
  }

  var chartBottom     = snap && snap.chart    && snap.chart.exists    ? safeNum(snap.chart.bottom)     : null;
  var footerTop       = snap && snap.footer   && snap.footer.exists   ? safeNum(snap.footer.top)       : null;
  var toolbarBottom   = snap && snap.toolbar  && snap.toolbar.exists  ? safeNum(snap.toolbar.bottom)   : null;
  var canvasTop       = snap && snap.canvasWrap && snap.canvasWrap.exists ? safeNum(snap.canvasWrap.top) : null;
  var drawerBottom    = snap && snap.tradeDrawerSheet && snap.tradeDrawerSheet.exists ? safeNum(snap.tradeDrawerSheet.bottom) : null;
  var footerBottom    = snap && snap.footer   && snap.footer.exists   ? safeNum(snap.footer.bottom)    : null;

  var chartFooterGapPx      = computeGap(chartBottom, footerTop);
  var toolbarCanvasGapPx    = computeGap(toolbarBottom, canvasTop);
  var drawerFooterOverlapPx = (drawerBottom != null && footerTop != null) ? drawerBottom - footerTop : null;

  var oscillatorCount  = snap ? snap.oscillators.length : 0;
  var paperLayerExists = snap ? snap.paperLayer.exists  : false;
  var paperLineCount   = snap ? snap.paperLines.length  : 0;
  var tradeDrawerExists = snap ? snap.tradeDrawer.exists : false;

  // Section size mismatch recommendations
  for(var m = 0; m < mismatches.length; m++){
    var mm = mismatches[m];
    recommendations.push(
      "MISMATCH: " + mm.key + " is " + mm.actual + "px in DVL_SECTION_SIZES_PX but expected " + mm.expected + "px (diff=" + mm.diff + "). Do NOT fix in this phase."
    );
  }

  // Gap diagnostics
  if(chartFooterGapPx != null && Math.abs(chartFooterGapPx) > 2){
    recommendations.push("GAP: chart bottom to footer top = " + chartFooterGapPx.toFixed(1) + "px (expected ~0). Investigate in next phase.");
  }
  if(toolbarCanvasGapPx != null && Math.abs(toolbarCanvasGapPx) > 2){
    recommendations.push("GAP: toolbar bottom to canvasWrap top = " + toolbarCanvasGapPx.toFixed(1) + "px (expected ~0). Investigate in next phase.");
  }
  if(drawerFooterOverlapPx != null && drawerFooterOverlapPx > 2){
    recommendations.push("OVERLAP: tradeDrawerSheet bottom overlaps footer top by " + drawerFooterOverlapPx.toFixed(1) + "px. Investigate in next phase.");
  }
  if(oscillatorCount > 0){
    recommendations.push("INFO: " + oscillatorCount + " oscillator panel(s) detected. Measure impact on canvasWrap height if layout is off.");
  }

  var result = {
    version:              "0.657",
    noLayoutMutation:     true,
    expected:             expected,
    staticSectionSizes:   staticSizes,
    sectionSizeMismatches: mismatches,
    snapshot:             snap,
    chartFooterGapPx:     chartFooterGapPx,
    toolbarCanvasGapPx:   toolbarCanvasGapPx,
    drawerFooterOverlapPx: drawerFooterOverlapPx,
    oscillatorCount:      oscillatorCount,
    paperLayerExists:     paperLayerExists,
    paperLineCount:       paperLineCount,
    tradeDrawerExists:    tradeDrawerExists,
    recommendations:      recommendations
  };

  _lastAudit = result;
  return result;
}

function getLastAudit(){
  return _lastAudit;
}

window.DVL_LAYOUT_ASSERTIONS = {
  VERSION:             "0.657",
  getExpectedContract: getExpectedContract,
  audit:               audit,
  getLastAudit:        getLastAudit
};

})();

window.DVL_SECTION_SIZES_PX = {
  header: 55,
  assetHotbar: 50,
  chartToolbar: 30,
  footerMenu: 57,
  footerButtons: 55,
  rightPriceScaleWidth:80,
  chartCanvas: "dynamic: fills from toolbar to top of footer",
  tradeDrawerMaxHeight: 150,
  fixedTradeHotbar: "removed",
  tradePanelMode: "footer Trade button with integrated triangle"
};

const BINANCE = "https://fapi.binance.com";
const DATA = "https://fapi.binance.com/futures/data";

/* DVL Beta 0.936 — real market-data failover.
   Rule: never jump to fake/local candles before trying every real route. */
const DVL_REAL_MARKET_ENDPOINTS = [
  { name:"BINANCE_FUTURES_MAIN", base:"https://fapi.binance.com", klinePath:"/fapi/v1/klines", aggPath:"/fapi/v1/aggTrades", market:"futures" },
  { name:"BINANCE_FUTURES_FAPI1", base:"https://fapi1.binance.com", klinePath:"/fapi/v1/klines", aggPath:"/fapi/v1/aggTrades", market:"futures" },
  { name:"BINANCE_FUTURES_FAPI2", base:"https://fapi2.binance.com", klinePath:"/fapi/v1/klines", aggPath:"/fapi/v1/aggTrades", market:"futures" },
  { name:"BINANCE_FUTURES_FAPI3", base:"https://fapi3.binance.com", klinePath:"/fapi/v1/klines", aggPath:"/fapi/v1/aggTrades", market:"futures" },
  { name:"BINANCE_SPOT_MAIN", base:"https://api.binance.com", klinePath:"/api/v3/klines", aggPath:"/api/v3/aggTrades", market:"spot" },
  { name:"BINANCE_SPOT_DATA", base:"https://data-api.binance.vision", klinePath:"/api/v3/klines", aggPath:"/api/v3/aggTrades", market:"spot" }
];

function __dvlTagRows(rows, meta){
  if(Array.isArray(rows)){
    try{ Object.defineProperty(rows, "__dvlSource", { value: meta && meta.source || null, configurable:true }); }catch(_){ rows.__dvlSource = meta && meta.source || null; }
    try{ Object.defineProperty(rows, "__dvlEndpoint", { value: meta && meta.endpoint || null, configurable:true }); }catch(_){ rows.__dvlEndpoint = meta && meta.endpoint || null; }
    try{ Object.defineProperty(rows, "__dvlMarket", { value: meta && meta.market || null, configurable:true }); }catch(_){ rows.__dvlMarket = meta && meta.market || null; }
  }
  return rows;
}

function __dvlRealSourceName(endpoint, suffix){
  return String(endpoint && endpoint.name || "REAL_API") + (suffix ? "_" + suffix : "");
}
try{ window.DVL_REAL_MARKET_ENDPOINTS = DVL_REAL_MARKET_ENDPOINTS; }catch(_){}
const symbols = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","LINKUSDT","LTCUSDT"];
window._dvlSymbols = symbols; /* expose for futures-dropdown patch */
const symbolIcons = { BTCUSDT:"B", ETHUSDT:"E", SOLUSDT:"S", BNBUSDT:"B", XRPUSDT:"X", ADAUSDT:"A", DOGEUSDT:"D", AVAXUSDT:"A", LINKUSDT:"L", LTCUSDT:"L" };
const symbolNames = {
  BTCUSDT:"Bitcoin",
  ETHUSDT:"Ethereum",
  SOLUSDT:"Solana",
  BNBUSDT:"BNB",
  XRPUSDT:"XRP",
  ADAUSDT:"Cardano",
  DOGEUSDT:"Dogecoin",
  AVAXUSDT:"Avalanche",
  LINKUSDT:"Chainlink",
  LTCUSDT:"Litecoin"
};
const symbolCoinClass = {
  BTCUSDT:"dvlLetterBTC", ETHUSDT:"dvlLetterETH", SOLUSDT:"dvlLetterSOL", BNBUSDT:"dvlLetterBNB", XRPUSDT:"dvlLetterXRP",
  ADAUSDT:"dvlLetterADA", DOGEUSDT:"dvlLetterDOGE", AVAXUSDT:"dvlLetterAVAX", LINKUSDT:"dvlLetterLINK", LTCUSDT:"dvlLetterLTC"
};
let symbolIndex = 0;
let symbol = symbols[symbolIndex];
let favoriteSymbols = (() => {
  try{
    const parsed = JSON.parse(localStorage.getItem("DVL_FAVORITE_SYMBOLS") || "[]");
    const valid = Array.isArray(parsed) ? parsed.filter(s => symbols.includes(s)) : [];
    return valid.length ? valid : ["BTCUSDT"];
  }catch(e){
    return ["BTCUSDT"];
  }
})();
let assetDropdownOpen = false;
let assetFavoritesOpen = false;
let interval = "1m";
window._dvlFpCache = new Map();
async function fetchFootprintData(){
  if(!klines.length) return;
  const start = klines[0].time;
  const end = Date.now();
  const price = klines.at(-1)?.close || 60000;
  const tick = Math.max(0.01, parseFloat((price * 0.00015).toPrecision(2)));
  try{
    const data = await jget("/api/footprint?start="+start+"&end="+end+"&interval="+encodeURIComponent(interval)+"&tick="+tick);
    if(!Array.isArray(data)) return;
    data.forEach(d => { window._dvlFpCache.set(d.t, {b:d.b||0, s:d.s||0, total:(d.b||0)+(d.s||0)}); });
  }catch(e){ console.warn("[DVL] footprint fetch:", e.message); }
}
const nativeTimeframes = ["1s","1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w"];
let customTimeframes = (() => {
  try{
    const parsed = JSON.parse(localStorage.getItem("DVL_CUSTOM_TIMEFRAMES") || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  }catch(e){
    return [];
  }
})();
let availableTimeframes = Array.from(new Set([
  "1s","5s","10s","15s","30s",
  "1m","2m","3m","4m","5m","6m","7m","8m","10m","12m","15m","20m","30m","45m",
  "1h","2h","3h","4h","6h","8h","12h",
  "1d","2d","3d","1w",
  ...customTimeframes
]));
let favoriteTimeframes = (() => {
  try{
    const parsed = JSON.parse(localStorage.getItem("DVL_FAVORITE_TIMEFRAMES") || "[]");
    const valid = Array.isArray(parsed) ? parsed.filter(tf => /^[1-9]\d*(s|m|h|d|w)$/.test(String(tf))) : [];
    return valid.length ? valid : ["1m","5m","15m","1h"];
  }catch(e){
    return ["1m","5m","15m","1h"];
  }
})();
favoriteTimeframes = Array.from(new Set(favoriteTimeframes));
let tfMoreOpen = false;
let indicatorsDropdownOpen = false;
let indicatorsOn = false;
let marginMode = "isolated";
let orderType = "Limit";
let candleMode = "candles";
let entryAmount = 100;
let leverage = 112;
const MIN_LEVERAGE = 1;
const MAX_LEVERAGE = 125;
let marketEntryPrice = null;
let entryPadDraft = "100";
let liquidationLinesOn = false;
let demoPos = null;
let longLiqPrice = null;
let shortLiqPrice = null;
let klines = [];
let oiHist = [];
let lsHist = [];
let derivativesDataReal = false;
let ticker = null;
let assetTickerMap = window.DVL_ASSET_TICKER_MAP || {}; window.DVL_ASSET_TICKER_MAP = assetTickerMap;
window.DVL_API_STATUS = window.DVL_API_STATUS || {
  source:"BOOT",
  candles:false,
  ticker:false,
  derivatives:false,
  fallback:false,
  symbol:null,
  interval:null,
  lastError:null,
  updatedAt:null
};
let timer = null;
let resizeRAF = 0;

let chartViewCount = 140;
let chartOffsetCandles = -24;
let priceViewCenter = null;
let priceViewRange = null;
let priceScaleLocked = false;
let chartDragState = null;
let chartPointers = new Map();
let chartPinchState = null;
let crosshair = { visible:false, x:0, y:0, active:false };
let crossDragState = null;
let crossPressTimer = null;
let crossMovedBeforeHold = false;
// Touch: quando o crosshair já está visível, um novo toque NÃO agarra o
// crosshair — ele vira pan e o crosshair some (tap = some, swipe = pan+some).
let crossDismissPending = false;
let crossGestureDownX = 0, crossGestureDownY = 0, crossVisibleAtDown = false;
const CHART_DRAG_SENSITIVITY = 1.0;
const PRICE_DRAG_SENSITIVITY = 1.0;
const PRICE_SCALE_W = 80;
const PRICE_LABEL_GAP = 2;
const PRICE_LABEL_W = 75;
window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;
const DVL_SCALE_LABEL_MAX_W  = 75;
const DVL_SCALE_LABEL_H = 22;
const DVL_SCALE_LABEL_FONT = 12;
const DVL_SCALE_LABEL_RADIUS = 5;
const DVL_SCALE_LABEL_PAD_X  = 4;
window.DVL_SCALE_LABEL_MAX_W  = DVL_SCALE_LABEL_MAX_W;
window.DVL_SCALE_LABEL_H      = DVL_SCALE_LABEL_H;
window.DVL_SCALE_LABEL_FONT   = DVL_SCALE_LABEL_FONT;
window.DVL_SCALE_LABEL_RADIUS = DVL_SCALE_LABEL_RADIUS;
window.DVL_SCALE_LABEL_PAD_X  = DVL_SCALE_LABEL_PAD_X;

/* ── Beta 1.597 — Registro CENTRAL de labels na escala ───────────────────────
   Como o conteúdo é clipado em x1 (w-80), indicadores não conseguem mais
   desenhar na canaleta da escala sozinhos. Então qualquer indicador com uma
   linha horizontal que "toca" a escala REGISTRA aqui {value,color,label} durante
   seu draw; depois do clip, o gráfico principal desenha uma pílula por registro
   na canaleta (mesma proporção do label do preço), com empilhamento anti-colisão.
   O registro é limpo a cada frame no início do drawPriceSection e consumido no fim. */
window.__dvlScaleLabels = [];
window.dvlRegisterScaleLabel = function(o){
  try{
    var v = Number(o && o.value);
    if(!Number.isFinite(v)) return;
    window.__dvlScaleLabels.push({
      value: v,
      color: (o.color!=null ? String(o.color) : "#8aa0b6"),
      textColor: (o.textColor!=null ? String(o.textColor) : null),
      label: (o.label!=null ? String(o.label) : "").slice(0,9),
      text: (o.text!=null ? String(o.text) : null),   // override do valor (ex.: níveis mostram notional)
      priority: Number(o.priority)||0
    });
  }catch(_){}
};

let gridOn = true;
let candleBullColor = "#10df77";
let candleBearColor = "#ff3037";
let candleColorTarget = "bull";
let chartSettingsOpen = false;
let sessionsOn = false;
let toolMagnetOn = true;
let visibleSessionCount = 10;
let sessionActive = { asia:true, london:true, newyork:true, sydney:true };

const DVL_APP_SETTINGS_KEY = "DVL_APP_SETTINGS_V1";
function saveAppSettings(){
  try{
    localStorage.setItem(DVL_APP_SETTINGS_KEY, JSON.stringify({
      candleBullColor, candleBearColor, candleMode,
      sessionsOn, toolMagnetOn, sessionActive: Object.assign({}, sessionActive), interval, symbol
    }));
  }catch(_){}
}
(function loadAppSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(DVL_APP_SETTINGS_KEY)||"null");
    if(!s) return;
    if(s.candleBullColor) candleBullColor = s.candleBullColor;
    if(s.candleBearColor) candleBearColor = s.candleBearColor;
    if(["candles","hollow","footprint","heikin","renko"].includes(s.candleMode)) candleMode = s.candleMode;
    if(typeof s.sessionsOn === "boolean") sessionsOn = s.sessionsOn;
    if(typeof s.toolMagnetOn === "boolean") toolMagnetOn = s.toolMagnetOn;
    if(s.sessionActive && typeof s.sessionActive === "object")
      ["asia","london","newyork","sydney"].forEach(k => { if(typeof s.sessionActive[k]==="boolean") sessionActive[k]=s.sessionActive[k]; });
    if(s.interval && /^[1-9]\d*(s|m|h|d|w)$/.test(s.interval)) interval = s.interval;
    if(s.symbol && typeof s.symbol==="string" && symbols.includes(s.symbol)){ symbolIndex=symbols.indexOf(s.symbol); symbol=s.symbol; }
  }catch(_){}
})();

const SESSION_DEFS = {
  asia: { name:"Asia", start:0, end:8, color:"#f3bd28" },
  london: { name:"London", start:8, end:13, color:"#168cff" },
  newyork: { name:"New York", start:13, end:21, color:"#16d86f" },
  sydney: { name:"Sydney", start:21, end:24, color:"#8f4de8" }
};

const els = {
  canvas: document.getElementById("chart"),
  loading: document.getElementById("loading"),
  toast: document.getElementById("toast"),
  symbolBtn: document.getElementById("symbolBtn"),
  symbolText: document.getElementById("symbolText"),
  currentFavoriteBtn: document.getElementById("currentFavoriteBtn"),
  assetDropdown: document.getElementById("assetDropdown"),
  assetsNavBtn: document.getElementById("assetsNavBtn"),
  assetFavoritesDrawer: document.getElementById("assetFavoritesDrawer"),
  assetFavoritesList: document.getElementById("assetFavoritesList"),
  assetFavoritesClose: document.getElementById("assetFavoritesClose"),
  lastPrice: document.getElementById("lastPrice"),
  changePct: document.getElementById("changePct"),
  high24: document.getElementById("high24"),
  low24: document.getElementById("low24"),
  longLiq: document.getElementById("longLiq"),
  shortLiq: document.getElementById("shortLiq"),
  toggleIndicators: document.getElementById("toggleIndicators"),
  candleTypeWrap: document.getElementById("candleTypeWrap"),
  candleTypeBtn: document.getElementById("candleTypeBtn"),
  candleTypeLabel: document.getElementById("candleTypeLabel"),
  candleTypeMenu: document.getElementById("candleTypeMenu"),
  candleTypeOptions: Array.from(document.querySelectorAll(".candleTypeOption")),
  moreTf: document.getElementById("moreTf"),
  tfScrollRow: document.getElementById("tfScrollRow"),
  tfMainRow: document.getElementById("tfMainRow"),
  tfMoreWrap: document.getElementById("tfMoreWrap"),
  tfMoreBtn: document.getElementById("tfMoreBtn"),
  tfMoreMenu: document.getElementById("tfMoreMenu"),
  tfMoreList: document.getElementById("tfMoreList"),
  tfCustomInput: document.getElementById("tfCustomInput"),
  tfCustomAdd: document.getElementById("tfCustomAdd"),
  fxIndicatorWrap: document.getElementById("fxIndicatorWrap"),
  indicatorDropdown: document.getElementById("indicatorDropdown"),
  indicatorItems: Array.from(document.querySelectorAll(".indicatorItem[data-indicator-action]")),
  coreIndicatorsState: document.getElementById("coreIndicatorsState"),
  tradeDrawer: document.getElementById("tradeDrawer"),
  tradeNavBtn: document.getElementById("tradeNavBtn"),
  closeTradeDrawer: document.getElementById("closeTradeDrawer"),
  buyPriceBtn: document.getElementById("buyPriceBtn"),
  sellPriceBtn: document.getElementById("sellPriceBtn"),
  panelCloseX: document.getElementById("panelCloseX"),
  isolatedModeBtn: document.getElementById("isolatedModeBtn"),
  crossModeBtn: document.getElementById("crossModeBtn"),
  orderTypeWrap: document.getElementById("orderTypeWrap"),
  orderTypeBtn: document.getElementById("orderTypeBtn"),
  orderTypeLabel: document.getElementById("orderTypeLabel"),
  orderTypeMenu: document.getElementById("orderTypeMenu"),
  orderTypeOptions: Array.from(document.querySelectorAll(".orderTypeOption")),
  liqToggleBtn: document.getElementById("liqToggleBtn"),
  liqToggleText: document.getElementById("liqToggleText"),
  levNotional: document.getElementById("levNotional"),
  entryEditCard: document.getElementById("entryEditCard"),
  entryValue: document.getElementById("entryValue"),
  entrySub: document.getElementById("entrySub"),
  levValue: document.getElementById("levValue"),
  levDragCard: document.getElementById("levDragCard"),
  levSlider: document.getElementById("levSlider"),
  levSliderFill: document.getElementById("levSliderFill"),
  levKnob: document.getElementById("levKnob"),
  entryPadOverlay: document.getElementById("entryPadOverlay"),
  entryPadDisplay: document.getElementById("entryPadDisplay"),
  entryPadClose: document.getElementById("entryPadClose"),
  entryPadClear: document.getElementById("entryPadClear"),
  entryPadOk: document.getElementById("entryPadOk"),
  entryPadKeys: Array.from(document.querySelectorAll(".numberPadGrid [data-key]")),
  autoScaleBtn: document.getElementById("autoScaleBtn"),
  chartSettingsBtn: document.getElementById("chartSettingsBtn"),
  chartSettingsPanel: document.getElementById("chartSettingsPanel"),
  gridToggle: document.getElementById("gridToggle"),
  sessionsToggle: document.getElementById("sessionsToggle"),
  toolMagnetToggle: document.getElementById("toolMagnetToggle"),
  sessionCountInput: document.getElementById("sessionCountInput"),
  sessionChecks: Array.from(document.querySelectorAll(".sessionCheck")),
  bullColorBtn: document.getElementById("bullColorBtn"),
  bearColorBtn: document.getElementById("bearColorBtn"),
  siteColorPicker: document.getElementById("siteColorPicker"),
  presetColorBtns: Array.from(document.querySelectorAll("#presetColorGrid [data-preset-color]")),
  siteColorPickerTitle: document.getElementById("siteColorPickerTitle"),
  siteColorPreview: document.getElementById("siteColorPreview"),
  colorHueRange: document.getElementById("colorHueRange"),
  colorSatRange: document.getElementById("colorSatRange"),
  colorLightRange: document.getElementById("colorLightRange"),
  bullColorChip: document.getElementById("bullColorChip"),
  bearColorChip: document.getElementById("bearColorChip"),
  sessionDecBtn: document.getElementById("sessionDecBtn"),
  sessionIncBtn: document.getElementById("sessionIncBtn")
};

function fmtPrice(v){
  const n = Number(v);
  if(!Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US",{minimumFractionDigits:n>=1000?2:3, maximumFractionDigits:n>=1000?2:4});
}

function clamp(v, min, max){
  return Math.min(max, Math.max(min, v));
}

function fmtEntryAmount(v){
  const n = Number(v);
  if(!Number.isFinite(n)) return "0";
  if(n >= 1000) return n.toLocaleString("en-US", {maximumFractionDigits: 2});
  return n.toLocaleString("en-US", {maximumFractionDigits: 4});
}


function hexToRgba(hex, alpha=1){
  const clean = String(hex || "").replace("#","");
  const full = clean.length === 3 ? clean.split("").map(c=>c+c).join("") : clean;
  const n = parseInt(full, 16);
  if(!Number.isFinite(n)) return `rgba(19,220,141,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function sessionKeyForTime(ms){
  const h = new Date(ms).getHours();
  if(h >= 0 && h < 8) return "asia";
  if(h >= 8 && h < 13) return "london";
  if(h >= 13 && h < 21) return "newyork";
  return "sydney";
}

function hslToHex(h, s, l){
  h = ((Number(h) % 360) + 360) % 360;
  s = clamp(Number(s) || 0, 0, 100) / 100;
  l = clamp(Number(l) || 0, 0, 100) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r=0,g=0,b=0;

  if(h < 60){ r=c; g=x; b=0; }
  else if(h < 120){ r=x; g=c; b=0; }
  else if(h < 180){ r=0; g=c; b=x; }
  else if(h < 240){ r=0; g=x; b=c; }
  else if(h < 300){ r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }

  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex){
  const clean = String(hex || "#13dc8d").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const n = parseInt(full, 16);
  if(!Number.isFinite(n)) return { h:150, s:80, l:47 };

  let r = ((n >> 16) & 255) / 255;
  let g = ((n >> 8) & 255) / 255;
  let b = (n & 255) / 255;

  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if(d !== 0){
    s = d / (1 - Math.abs(2 * l - 1));
    if(max === r) h = 60 * (((g - b) / d) % 6);
    else if(max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }

  if(h < 0) h += 360;
  return { h:Math.round(h), s:Math.round(s * 100), l:Math.round(l * 100) };
}

function activeCandleColor(){
  return candleColorTarget === "bear" ? candleBearColor : candleBullColor;
}

function updateColorChips(){
  if(els.bullColorChip) els.bullColorChip.style.background = candleBullColor;
  if(els.bearColorChip) els.bearColorChip.style.background = candleBearColor;
  if(els.bullColorBtn) els.bullColorBtn.classList.toggle("activeColorTarget", candleColorTarget === "bull");
  if(els.bearColorBtn) els.bearColorBtn.classList.toggle("activeColorTarget", candleColorTarget === "bear");
  const activeColor = String(activeCandleColor()).toLowerCase();
  if(els.siteColorPreview) els.siteColorPreview.style.background = activeCandleColor();
  if(els.siteColorPickerTitle) els.siteColorPickerTitle.textContent = candleColorTarget === "bear" ? "Bear color" : "Bull color";
  if(els.presetColorBtns){
    els.presetColorBtns.forEach(btn => {
      btn.classList.toggle("activePreset", String(btn.dataset.presetColor).toLowerCase() === activeColor);
    });
  }
}

function syncColorPickerSliders(){
  const hsl = hexToHsl(activeCandleColor());
  if(els.colorHueRange) els.colorHueRange.value = hsl.h;
  if(els.colorSatRange) els.colorSatRange.value = hsl.s;
  if(els.colorLightRange) els.colorLightRange.value = hsl.l;
  updateColorChips();
}

function openSiteColorPicker(){
  if(els.siteColorPicker){
    els.siteColorPicker.classList.add("is-open");
    els.siteColorPicker.setAttribute("aria-hidden", "false");
  }
  syncColorPickerSliders();
}

function setCandleColorTarget(target){
  candleColorTarget = target === "bear" ? "bear" : "bull";
  openSiteColorPicker();
}

function applySiteColorFromSliders(){
  const color = hslToHex(
    els.colorHueRange ? els.colorHueRange.value : 150,
    els.colorSatRange ? els.colorSatRange.value : 80,
    els.colorLightRange ? els.colorLightRange.value : 47
  );

  if(candleColorTarget === "bear") candleBearColor = color;
  else candleBullColor = color;

  updateColorChips();
  drawSoon();
}

function setVisibleSessionCount(value){
  visibleSessionCount = Math.round(clamp(Number(value) || 1, 1, 50));
  if(els.sessionCountInput) els.sessionCountInput.value = visibleSessionCount;
  drawSoon();
}


function candleModeLabel(mode){
  if(mode === "hollow") return "Hollow";
  if(mode === "footprint") return "Footprint";
  if(mode === "heikin") return "Heikin Ashi";
  if(mode === "renko") return "Renko";
  return "Candles";
}

function closeCandleTypeMenu(){
  if(els.candleTypeWrap) els.candleTypeWrap.classList.remove("is-open");
  if(els.candleTypeBtn) els.candleTypeBtn.setAttribute("aria-expanded", "false");
  if(els.candleTypeMenu) els.candleTypeMenu.setAttribute("aria-hidden", "true");
}

function openCandleTypeMenu(){
  if(els.candleTypeWrap) els.candleTypeWrap.classList.add("is-open");
  if(els.candleTypeBtn) els.candleTypeBtn.setAttribute("aria-expanded", "true");
  if(els.candleTypeMenu) els.candleTypeMenu.setAttribute("aria-hidden", "false");
}

function toggleCandleTypeMenu(){
  if(els.candleTypeWrap && els.candleTypeWrap.classList.contains("is-open")) closeCandleTypeMenu();
  else openCandleTypeMenu();
}

function setCandleMode(mode){
  candleMode = ["candles","hollow","footprint","heikin","renko"].includes(mode) ? mode : "candles";
  if(els.candleTypeLabel) els.candleTypeLabel.textContent = candleModeLabel(candleMode);
  if(els.candleTypeOptions){
    els.candleTypeOptions.forEach(btn => {
      btn.classList.toggle("activeCandleType", btn.dataset.candleMode === candleMode);
    });
  }
  closeCandleTypeMenu();
  if(candleMode === "footprint") fetchFootprintData();
  drawSoon();
}

window.setCandleMode = setCandleMode;
window.getCandleMode = () => candleMode;

/* Beta 1.554 — Heikin conversion used to clone every visible candle on every
   canvas frame. Keep one converted view while the source slice and its edge
   OHLC signature are unchanged. Normal/hollow/footprint remain zero-copy. */
let __dvlDisplayCandlesCache1210 = { src:null, sig:"", out:null };
function __dvlDisplayCandlesSig1210(src){
  if(!src || !src.length) return "0";
  const a=src[0], z=src[src.length-1];
  return [src.length,a.time,a.open,a.high,a.low,a.close,z.time,z.open,z.high,z.low,z.close,z.volume].join("|");
}
function buildDisplayCandles(src){
  if(candleMode !== "heikin") return src;
  const sig=__dvlDisplayCandlesSig1210(src);
  if(__dvlDisplayCandlesCache1210.src===src && __dvlDisplayCandlesCache1210.sig===sig && __dvlDisplayCandlesCache1210.out){
    return __dvlDisplayCandlesCache1210.out;
  }

  const out = new Array(src.length);
  let prevOpen = null;
  let prevClose = null;

  for(let i=0;i<src.length;i++){
    const d=src[i];
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    const haOpen = i === 0 ? (d.open + d.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(d.high, haOpen, haClose);
    const haLow = Math.min(d.low, haOpen, haClose);

    prevOpen = haOpen;
    prevClose = haClose;

    out[i]={
      ...d,
      realOpen:d.open,
      realHigh:d.high,
      realLow:d.low,
      realClose:d.close,
      open:haOpen,
      high:haHigh,
      low:haLow,
      close:haClose
    };
  }

  __dvlDisplayCandlesCache1210={src:src,sig:sig,out:out};
  return out;
}

function closeSiteColorPicker(){
  if(els.siteColorPicker){
    els.siteColorPicker.classList.remove("is-open");
    els.siteColorPicker.setAttribute("aria-hidden", "true");
  }
}

function setChartSettings(open){
  chartSettingsOpen = !!open;
  if(els.chartSettingsPanel){
    els.chartSettingsPanel.classList.toggle("is-open", chartSettingsOpen);
    els.chartSettingsPanel.setAttribute("aria-hidden", chartSettingsOpen ? "false" : "true");
  }
  if(!chartSettingsOpen) closeSiteColorPicker();
  if(els.chartSettingsBtn) els.chartSettingsBtn.classList.toggle("is-active", chartSettingsOpen);
}


function dvlFitOscillatorsToCurrent(){
  const list = [
    window.DVLOpenInterestOscillator,
    window.DVLLongShortOscillator,
    window.DVLDeltaVolume,
    window.DVLTickVolume,
    window.DVLArionZoneProfile,
    window.DVLTestOscillator,
    window.DVLTestOscillator2
  ];

  list.forEach(osc => {
    try{
      if(osc && typeof osc.fitToCurrent === "function"){
        osc.fitToCurrent();
      }else if(osc && typeof osc.reset === "function"){
        osc.reset();
      }
    }catch(_){}
  });
}

function autoScaleCurrent20(){
  if(!klines.length) return;
  chartViewCount = 20;
  chartOffsetCandles = -4;

  const recent = klines.slice(-20);
  if(recent.length){
    const hi = Math.max(...recent.map(d=>d.high));
    const lo = Math.min(...recent.map(d=>d.low));
    const r = (hi - lo) || Math.max(hi * .002, 1);
    priceViewRange = r * 1.22;
    priceViewCenter = (hi + lo) / 2;
    priceScaleLocked = true;
  }

  try{
    dvlFitOscillatorsToCurrent();
  }catch(_){}

  clampChartViewport();
  drawSoon();
}

function leverageToPercent(v){
  return ((clamp(v, MIN_LEVERAGE, MAX_LEVERAGE) - MIN_LEVERAGE) / (MAX_LEVERAGE - MIN_LEVERAGE)) * 100;
}

function liquidationDistancePct(){
  // Visual liquidation model: higher leverage brings liquidation closer to entry/market.
  return clamp(1.50 / Math.max(leverage, 1), 0.006, 0.80);
}

function syncTradePanel(){
  if(els.entryValue) els.entryValue.textContent = fmtEntryAmount(entryAmount);
  if(els.entrySub) els.entrySub.textContent = "$" + fmtPrice(entryAmount);

  const levRounded = Math.round(leverage);
  const levPct = leverageToPercent(levRounded);
  if(els.levValue) els.levValue.textContent = levRounded + "x";
  if(els.levSlider) els.levSlider.setAttribute("aria-valuenow", String(levRounded));
  if(els.levSliderFill) els.levSliderFill.style.width = levPct + "%";
  if(els.levKnob) els.levKnob.style.left = levPct + "%";
  if(els.levNotional) els.levNotional.textContent = "$" + fmtPrice(entryAmount * levRounded);

  updateLiquidationPrices();
}

function updateLiquidationPrices(){
  const base = Number(marketEntryPrice || ticker?.lastPrice || klines.at(-1)?.close || 0);
  if(base > 0){
    const distance = liquidationDistancePct();
    longLiqPrice = base * (1 - distance);
    shortLiqPrice = base * (1 + distance);
  } else {
    longLiqPrice = null;
    shortLiqPrice = null;
  }

  if(els.longLiq) els.longLiq.textContent = "Long Liq " + fmtPrice(longLiqPrice);
  if(els.shortLiq) els.shortLiq.textContent = "Short Liq " + fmtPrice(shortLiqPrice);
}

function setLeverage(value, redraw = true){
  leverage = clamp(Math.round(Number(value) || MIN_LEVERAGE), MIN_LEVERAGE, MAX_LEVERAGE);
  syncTradePanel();
  if(redraw) drawSoon();
}

function setLeverageFromPointer(clientX){
  if(!els.levSlider) return;
  const rect = els.levSlider.getBoundingClientRect();
  const pct = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
  const next = MIN_LEVERAGE + pct * (MAX_LEVERAGE - MIN_LEVERAGE);
  setLeverage(next);
}

function openEntryPad(){
  entryPadDraft = String(entryAmount || "");
  if(els.entryPadDisplay) els.entryPadDisplay.textContent = entryPadDraft || "0";
  if(els.entryPadOverlay){
    els.entryPadOverlay.classList.add("is-open");
    els.entryPadOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeEntryPad(){
  if(els.entryPadOverlay){
    els.entryPadOverlay.classList.remove("is-open");
    els.entryPadOverlay.setAttribute("aria-hidden", "true");
  }
}

function applyEntryPad(){
  const parsed = Number(entryPadDraft);
  if(Number.isFinite(parsed) && parsed > 0){
    entryAmount = clamp(parsed, 1, 999999);
    syncTradePanel();
    drawSoon();
  }
  closeEntryPad();
}

function pressEntryPadKey(key){
  if(key === "back"){
    entryPadDraft = entryPadDraft.slice(0, -1);
  } else if(key === "."){
    if(!entryPadDraft.includes(".")) entryPadDraft = entryPadDraft ? entryPadDraft + "." : "0.";
  } else if(/^\d$/.test(key)){
    if(entryPadDraft === "0") entryPadDraft = key;
    else if(entryPadDraft.length < 12) entryPadDraft += key;
  }

  if(!entryPadDraft) entryPadDraft = "0";
  if(els.entryPadDisplay) els.entryPadDisplay.textContent = entryPadDraft;
}

function fmtCompact(v, prefix=""){
  const n = Number(v);
  if(!Number.isFinite(n)) return "--";
  const a = Math.abs(n);
  if(a >= 1e12) return prefix + (n/1e12).toFixed(2) + "T";
  if(a >= 1e9) return prefix + (n/1e9).toFixed(2) + "B";
  if(a >= 1e6) return prefix + (n/1e6).toFixed(2) + "M";
  if(a >= 1e3) return prefix + (n/1e3).toFixed(2) + "K";
  return prefix + n.toFixed(2);
}
function pct(v){
  const n = Number(v);
  if(!Number.isFinite(n)) return "--";
  return (n>=0?"+":"") + n.toFixed(2) + "%";
}
function parseTimeframe(iv){
  const m = String(iv || "1m").trim().match(/^(\d+)(s|m|h|d|w)$/);
  if(!m) return { value:1, unit:"m", ms:60_000 };
  const value = Math.max(1, Number(m[1]) || 1);
  const unit = m[2];
  const unitMs = unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 7 * 86_400_000;
  return { value, unit, ms:value * unitMs };
}

function isNativeTimeframe(iv){
  return nativeTimeframes.includes(iv);
}

function baseIntervalForTimeframe(iv){
  if(isNativeTimeframe(iv)) return iv;
  const parsed = parseTimeframe(iv);
  if(parsed.unit === "s") return "1s";
  if(parsed.unit === "m") return "1m";
  if(parsed.unit === "h") return "1h";
  if(parsed.unit === "d" || parsed.unit === "w") return "1d";
  return "1m";
}

function intervalToPeriod(iv){
  if(iv === "1m" || iv === "2m" || iv === "3m" || iv === "4m" || iv === "5m" || iv === "6m" || iv === "7m" || iv === "8m" || iv === "10m" || iv === "12m") return "5m";
  if(iv === "15m" || iv === "20m") return "15m";
  if(iv === "30m" || iv === "45m") return "30m";
  if(iv === "1h" || iv === "2h" || iv === "3h" || iv === "4h" || iv === "6h" || iv === "8h" || iv === "12h") return isNativeTimeframe(iv) ? iv : "1h";
  if(iv === "1d" || iv === "2d" || iv === "3d" || iv === "1w") return "1d";
  return "5m";
}
function periodToMs(p){
  const m={"5m":300000,"15m":900000,"30m":1800000,"1h":3600000,"2h":7200000,"4h":14400000,"6h":21600000,"12h":43200000,"1d":86400000};
  return m[p]||300000;
}
function periodToBybitPeriod(p){
  const m={"5m":"5min","15m":"15min","30m":"30min","1h":"1h","2h":"4h","4h":"4h","6h":"4h","12h":"1d","1d":"1d"};
  return m[p]||"5min";
}


function intervalMs(iv){
  return parseTimeframe(iv).ms;
}

function candleCloseRemainingMs(){
  const step = intervalMs(interval);
  const lastOpen = Number(klines.at(-1)?.time);
  const now = Date.now();

  if(Number.isFinite(lastOpen) && lastOpen > 0){
    const close = lastOpen + step;
    const remaining = close - now;
    if(remaining >= 0 && remaining <= step * 2) return remaining;
  }

  return step - (now % step);
}

function fmtCountdown(ms){
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if(h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function candleCloseTimerText(){
  return fmtCountdown(candleCloseRemainingMs());
}


function dvlLowerPanelOn(){
  /* Beta 1.554 — deriva a visibilidade do painel inferior da MESMA lista que
     realmente desenha os osciladores (__dvlCollectActiveOscillators). Antes esta
     função tinha uma lista fixa que ESQUECIA Smart Delta e Net Long: com só um
     desses ativo (ou ao remover os demais), ela retornava false e o painel
     inteiro sumia, levando junto o Smart Delta. Agora qualquer oscilador ativo
     — atual ou futuro — mantém o painel aberto, sem risco de dessincronizar. */
  try{
    if(typeof __dvlCollectActiveOscillators === "function"){
      return __dvlCollectActiveOscillators().length > 0;
    }
  }catch(_){}
  try{
    const oi = !!(window.DVLOpenInterestOscillator && typeof window.DVLOpenInterestOscillator.on === "function" && window.DVLOpenInterestOscillator.on());
    const ls = !!(window.DVLLongShortOscillator && typeof window.DVLLongShortOscillator.on === "function" && window.DVLLongShortOscillator.on());
    const t1 = !!(window.DVLTestOscillator && typeof window.DVLTestOscillator.on === "function" && window.DVLTestOscillator.on());
    const t2 = !!(window.DVLTestOscillator2 && typeof window.DVLTestOscillator2.on === "function" && window.DVLTestOscillator2.on());
    const dv = !!(window.DVLDeltaVolume && typeof window.DVLDeltaVolume.on === "function" && window.DVLDeltaVolume.on());
    const tv = !!(window.DVLTickVolume && typeof window.DVLTickVolume.on === "function" && window.DVLTickVolume.on());
    const arion = !!(window.DVLArionZoneProfile && typeof window.DVLArionZoneProfile.on === "function" && window.DVLArionZoneProfile.on());
    const exr = !!(window.DVLExhaustionRSI && typeof window.DVLExhaustionRSI.on === "function" && window.DVLExhaustionRSI.on());
    const ns = !!(window.DVLNetShortOscillator && typeof window.DVLNetShortOscillator.on === "function" && window.DVLNetShortOscillator.on());
    const nd = !!(window.DVLNetDeltaOscillator && typeof window.DVLNetDeltaOscillator.on === "function" && window.DVLNetDeltaOscillator.on());
    const nl = !!(window.DVLNetLongOscillator && typeof window.DVLNetLongOscillator.on === "function" && window.DVLNetLongOscillator.on());
    const sd = !!(window.DVL_SMART_DELTA_OSC && typeof window.DVL_SMART_DELTA_OSC.on === "function" && window.DVL_SMART_DELTA_OSC.on());
    return !!(oi || ls || t1 || t2 || dv || tv || arion || exr || ns || nd || nl || sd);
  }catch(_){
    return false;
  }
}

function dvlMainTimeScaleHeight(){
  return 20;
}

function dvlPricePanelHeight(totalH){
  if(dvlLowerPanelOn()){
    try{
      if(window.DVLTestOscillator && typeof window.DVLTestOscillator.splitHeight === "function"){
        return window.DVLTestOscillator.splitHeight(totalH);
      }
    }catch(_){}
    return Math.max(140, totalH * .62);
  }
  return totalH;
}

function dvlPricePanelBottom(totalH){
  // Beta 1.554 — com osciladores, a timeline mora na base do canvas e não
  // consome mais 20px entre o gráfico de preço e o primeiro painel inferior.
  return dvlLowerPanelOn() ? dvlPricePanelHeight(totalH) : totalH - dvlMainTimeScaleHeight();
}

function dvlCrossPanelBottom(totalH){
  return dvlLowerPanelOn() ? Math.max(80, totalH - dvlMainTimeScaleHeight()) : dvlPricePanelBottom(totalH);
}

let __dvlBottomAxisLastLabels1322=[];
function __dvlTimelineTimeAtIndex1322(globalIndex){
  try{
    const arr=Array.isArray(klines)?klines:[];
    if(!arr.length||!Number.isFinite(globalIndex))return NaN;
    const step=Math.max(1,Number(intervalMs(interval))||60000);
    const last=arr.length-1;
    if(globalIndex<=0){
      const t=Number(arr[0]&&arr[0].time);
      return Number.isFinite(t)?t+globalIndex*step:NaN;
    }
    if(globalIndex>=last){
      const t=Number(arr[last]&&arr[last].time);
      return Number.isFinite(t)?t+(globalIndex-last)*step:NaN;
    }
    const lo=Math.max(0,Math.min(last,Math.floor(globalIndex)));
    const hi=Math.max(0,Math.min(last,lo+1));
    const f=Math.max(0,Math.min(1,globalIndex-lo));
    const t0=Number(arr[lo]&&arr[lo].time),t1=Number(arr[hi]&&arr[hi].time);
    if(Number.isFinite(t0)&&Number.isFinite(t1)&&t1>t0)return t0+(t1-t0)*f;
    if(Number.isFinite(t0))return t0+f*step;
    return NaN;
  }catch(_){return NaN;}
}
function dvlDrawBottomTimeAxis1310(ctx,padL,padR,w,h,forceVisible){
  if(!forceVisible && !dvlLowerPanelOn()) return;
  const win=visibleWindow();
  const timeH=dvlMainTimeScaleHeight();
  const axisTop=Math.max(0,h-timeH);
  const axisY=axisTop+timeH/2;
  const x0=padL, x1=w-padR;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0,axisTop,w,timeH);
  ctx.clip();
  ctx.globalAlpha=1;
  ctx.fillStyle="rgba(2,8,6,1)";
  ctx.fillRect(0,axisTop,w,timeH);
  ctx.strokeStyle="rgba(142,174,190,.32)";
  ctx.lineWidth=1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x0+.5,axisTop+.5);
  ctx.lineTo(w-.5,axisTop+.5);
  ctx.stroke();

  const axisShowsDate=shouldShowAxisDate();
  const labelCount=axisShowsDate?4:6;
  const slots=Math.max(2,Number(win&&win.totalSlots)||Number(chartViewCount)||2);
  const leftEdge=Number(win&&win.leftEdgeIndex);
  const fallbackStart=Number(win&&win.start)||0;
  const slotOffset=__dvlSlotOffset(win,(win&&win.candles)||[]);
  const labels=[];

  for(let i=0;i<labelCount;i++){
    const slot=i*(slots-1)/(labelCount-1);
    const globalIndex=Number.isFinite(leftEdge)?leftEdge+slot:fallbackStart+(slot-slotOffset);
    const ts=__dvlTimelineTimeAtIndex1322(globalIndex);
    if(!Number.isFinite(ts))continue;
    let xx=x0+slot/(slots-1)*(x1-x0);
    let align="center";
    if(i===0){align="left";xx=x0+4;}
    else if(i===labelCount-1){align="right";xx=x1-4;}
    labels.push({x:xx,text:chartTimeLabel(ts,axisShowsDate),align:align});
  }

  if(labels.length){
    __dvlBottomAxisLastLabels1322=labels.map(function(v){return {x:v.x,text:v.text,align:v.align};});
  }
  const paint=labels.length?labels:__dvlBottomAxisLastLabels1322;
  ctx.font = "11.5px system-ui";
  ctx.fillStyle="rgba(188,198,194,.92)";
  ctx.textBaseline="middle";
  for(let i=0;i<paint.length;i++){
    const item=paint[i];
    ctx.textAlign=item.align||"center";
    ctx.fillText(item.text,item.x,axisY);
  }
  ctx.restore();
}


/* Beta 1.554 — timeline física permanente.
   É um canvas irmão do gráfico, dentro de #chartWrap, e nunca é removido,
   ocultado ou recriado durante pan/zoom. O canvas principal pode reduzir DPR,
   limpar ou abortar um frame; a escala continua intacta e recebe apenas a
   atualização dos textos quando a viewport muda. */
let __dvlPermanentTimelineCanvas1324=null;
let __dvlPermanentTimelineCtx1324=null;
let __dvlPermanentTimelineSig1324="";
function dvlEnsurePermanentTimeline1324(){
  const wrap=document.getElementById("chartWrap");
  if(!wrap)return null;
  let c=__dvlPermanentTimelineCanvas1324;
  if(!c||!c.isConnected){
    c=document.getElementById("dvlPermanentTimeline1324");
    if(!c){c=document.createElement("canvas");c.id="dvlPermanentTimeline1324";}
    __dvlPermanentTimelineCanvas1324=c;
    __dvlPermanentTimelineCtx1324=c.getContext("2d",{alpha:false});
  }
  if(c.parentElement!==wrap)wrap.appendChild(c);
  c.style.cssText="position:absolute;left:0;right:0;bottom:0;width:100%;height:22px;display:block;visibility:visible;opacity:1;z-index:88;pointer-events:none;touch-action:none;background:#020806;contain:layout paint size;transform:translateZ(0);";
  return c;
}
function dvlPaintPermanentTimeline1324(force){
  try{
    const c=dvlEnsurePermanentTimeline1324();if(!c)return;
    const wrap=c.parentElement,rect=wrap.getBoundingClientRect();
    const cssW=Math.max(1,Math.round(rect.width)),cssH=22;
    const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,2));
    const win=visibleWindow();
    const sig=[cssW,cssH,dpr,Number(win&&win.leftEdgeIndex||0).toFixed(4),Number(win&&win.totalSlots||0).toFixed(4),interval,klines.length].join("|");
    if(!force&&sig===__dvlPermanentTimelineSig1324)return;
    __dvlPermanentTimelineSig1324=sig;
    const pw=Math.round(cssW*dpr),ph=Math.round(cssH*dpr);
    if(c.width!==pw)c.width=pw;if(c.height!==ph)c.height=ph;
    const ctx=__dvlPermanentTimelineCtx1324||c.getContext("2d",{alpha:false});
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // Reusa a escala global já estabilizada, mas no próprio canvas de 22px.
    dvlDrawBottomTimeAxis1310(ctx,0,PRICE_SCALE_W,cssW,cssH,true);
    c.style.display="block";c.style.visibility="visible";c.style.opacity="1";
  }catch(_dvlPermanentTimeline1324){}
}
window.DVL_TIMELINE_1324={paint:function(){__dvlPermanentTimelineSig1324="";dvlPaintPermanentTimeline1324(true);},get canvas(){return __dvlPermanentTimelineCanvas1324;}};
let __dvlBottomTimelineCanvas1314=null;
let __dvlBottomTimelineCtx1314=null;
let __dvlBottomTimelineSize1314="";
let __dvlBottomTimelineHideTimer1316=0;
let __dvlBottomTimelineLastActive1316=false;
function dvlSyncBottomTimeline1314(){
  try{
    const wrap=document.getElementById("chartWrap")||document.querySelector(".canvasWrap");
    if(!wrap) return;
    const active=!!dvlLowerPanelOn();
    if(!__dvlBottomTimelineCanvas1314){
      const c=document.createElement("canvas");
      c.id="dvlBottomTimeline1314";
      c.setAttribute("aria-hidden","true");
      document.body.appendChild(c);
      __dvlBottomTimelineCanvas1314=c;
      __dvlBottomTimelineCtx1314=c.getContext("2d",{alpha:false});
    }else if(__dvlBottomTimelineCanvas1314.parentElement!==document.body){
      document.body.appendChild(__dvlBottomTimelineCanvas1314);
    }
    const c=__dvlBottomTimelineCanvas1314,ctx=__dvlBottomTimelineCtx1314;
    if(active){
      __dvlBottomTimelineLastActive1316=true;
      if(__dvlBottomTimelineHideTimer1316){clearTimeout(__dvlBottomTimelineHideTimer1316);__dvlBottomTimelineHideTimer1316=0;}
    }else{
      /* O registry de osciladores pode ficar vazio por alguns frames durante rebuild.
         Não esconda a timeline imediatamente: era isso que causava o pisca/some. */
      if(__dvlBottomTimelineLastActive1316&&!__dvlBottomTimelineHideTimer1316){
        __dvlBottomTimelineHideTimer1316=setTimeout(function(){
          __dvlBottomTimelineHideTimer1316=0;
          if(!dvlLowerPanelOn()){
            __dvlBottomTimelineLastActive1316=false;
            if(__dvlBottomTimelineCanvas1314)__dvlBottomTimelineCanvas1314.style.display="none";
          }
        },700);
      }
      if(!__dvlBottomTimelineLastActive1316){c.style.display="none";return;}
    }
    const rect=wrap.getBoundingClientRect();
    let rightScale=55;
    try{if(typeof RP==="function")rightScale=Math.max(0,Number(RP())||55);}catch(_){ }
    const cssW=Math.max(80,Math.round(rect.width-rightScale));
    const cssH=20,dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const sizeSig=[cssW,cssH,dpr].join("|");
    if(sizeSig!==__dvlBottomTimelineSize1314){
      __dvlBottomTimelineSize1314=sizeSig;
      c.style.width=cssW+"px";c.style.height=cssH+"px";
      c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr);
    }
    c.style.display="block";
    c.style.left=Math.round(rect.left)+"px";
    c.style.top=Math.round(rect.bottom-cssH)+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle="rgba(2,8,6,1)";ctx.fillRect(0,0,cssW,cssH);
    ctx.strokeStyle="rgba(142,174,190,.32)";ctx.lineWidth=1;ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(.5,.5);ctx.lineTo(cssW-.5,.5);ctx.stroke();
    const win=visibleWindow(),view=win&&win.candles?win.candles:[];
    if(!view.length)return;
    const so=__dvlSlotOffset(win,view),slots=Math.max(2,win.totalSlots||view.length),axisShowsDate=shouldShowAxisDate(),count=axisShowsDate?4:6;
    ctx.font = "11.5px system-ui";ctx.fillStyle="rgba(180,190,186,.86)";ctx.textBaseline="middle";
    for(let i=0;i<count;i++){
      const slot=Math.round(i*(slots-1)/(count-1)),ci=slot-so;
      if(ci<0||ci>=view.length)continue;
      let xx=slot/(slots-1)*cssW;
      ctx.textAlign="center";
      if(i===0){ctx.textAlign="left";xx=4;}else if(i===count-1){ctx.textAlign="right";xx=cssW-4;}
      ctx.fillText(chartTimeLabel(view[ci].time,axisShowsDate),xx,10.5);
    }
  }catch(_){ }
}
window.addEventListener("resize",function(){__dvlBottomTimelineSize1314="";try{dvlSyncBottomTimeline1314();}catch(_){}},{passive:true});
window.addEventListener("resize",function(){__dvlPermanentTimelineSig1324="";try{dvlPaintPermanentTimeline1324(true);}catch(_){}},{passive:true});
window.addEventListener("orientationchange",function(){__dvlPermanentTimelineSig1324="";try{dvlPaintPermanentTimeline1324(true);}catch(_){}},{passive:true});
window.addEventListener("scroll",function(){try{dvlSyncBottomTimeline1314();}catch(_){}},{passive:true});

function pointInsidePriceArea(clientX, clientY){
  const canvas = els.canvas;
  if(!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const crossBottom = Math.max(80, dvlCrossPanelBottom(rect.height));
  return x >= 0 && x <= rect.width - PRICE_SCALE_W && y >= 0 && y <= crossBottom;
}

function dvlDesktopCrosshair1205(){
  try{
    const api = window.DVL_DOM_CROSSHAIR_1205;
    return api && typeof api.active === "function" && api.active() ? api : null;
  }catch(_){ return null; }
}

function dvlCrosshairRect1205(canvas){
  const api = dvlDesktopCrosshair1205();
  if(api && typeof api.rect === "function"){
    try{ return api.rect(); }catch(_){}
  }
  return canvas.getBoundingClientRect();
}

function dvlPublishCrosshair1205(immediate){
  const api = dvlDesktopCrosshair1205();
  if(!api) return false;
  try{
    if(immediate && typeof api.paintFromStateNow === "function") api.paintFromStateNow();
    else if(typeof api.scheduleFromState === "function") api.scheduleFromState();
    return true;
  }catch(_){ return false; }
}

function setCrosshairFromClient(clientX, clientY){
  const canvas = els.canvas;
  if(!canvas) return;
  const rect = dvlCrosshairRect1205(canvas);
  crosshair.x = clamp(clientX - rect.left, 0, Math.max(0, rect.width - PRICE_SCALE_W));
  const crossBottom = Math.max(80, dvlCrossPanelBottom(rect.height));
  crosshair.y = clamp(clientY - rect.top, 0, crossBottom);
  crosshair.visible = true;
  if(window.S) S._cross = { cx:crosshair.x, cy:crosshair.y };

  /* Desktop hover already runs inside one rAF. Paint NOW to avoid a second
     rAF and the one-frame trail. Mobile still redraws the canvas crosshair. */
  if(!dvlPublishCrosshair1205(true)) drawSoon();
}

function moveCrosshairByDelta(dx, dy){
  const canvas = els.canvas;
  if(!canvas) return;
  const rect = dvlCrosshairRect1205(canvas);
  const maxX = Math.max(0, rect.width - PRICE_SCALE_W);
  const maxY = Math.max(80, dvlCrossPanelBottom(rect.height));

  crosshair.x = clamp(crossDragState.startCrossX + dx, 0, maxX);
  crosshair.y = clamp(crossDragState.startCrossY + dy, 0, maxY);
  crosshair.visible = true;
  if(window.S) S._cross = { cx:crosshair.x, cy:crosshair.y };
  if(!dvlPublishCrosshair1205(true)) drawSoon();
}

function hideCrosshair(){
  crosshair.visible = false;
  crosshair.active = false;
  crossDragState = null;
  if(window.S){
    S._cross = null;
    S.cursor = null;
  }
  const api = dvlDesktopCrosshair1205();
  if(api && typeof api.hide === "function") api.hide();
  else drawSoon();
}

function dvlDrawingModeActive(){
  return !!(window.S && (
    S.drawingToolActive ||
    S._posDraft ||
    S.tool === "ruler" ||
    S.tool === "long" ||
    S.tool === "short"
  ));
}

function clearCrossPressTimer(){
  if(crossPressTimer){
    clearTimeout(crossPressTimer);
    crossPressTimer = null;
  }
}

function historyLimitForInterval(iv){
  if(iv === "1s")  return 600;
  if(iv === "5s")  return 720;
  if(iv === "10s") return 720;
  /* Beta 1.651: ~33h no 15s e ~66h no 30s quando o recorder ja acumulou
     a janela. O render usa apenas o slice visivel, entao o historico profundo
     nao aumenta o custo de pintura proporcionalmente. */
  if(iv === "15s") return 8000;
  if(iv === "30s") return 8000;
  if(iv === "1m") return 4500;
  if(iv === "3m") return 4500;
  if(iv === "5m") return 4200;
  if(iv === "15m") return 3600;
  if(iv === "30m") return 3200;
  if(iv === "1h") return 2600;
  if(iv === "2h") return 2400;
  if(iv === "4h") return 2200;
  if(iv === "6h") return 2000;
  if(iv === "8h") return 1800;
  if(iv === "12h") return 1700;
  if(iv === "1d") return 1600;
  if(iv === "3d") return 1200;
  if(iv === "1w") return 900;

  const parsed = parseTimeframe(iv);
  if(parsed.unit === "m") return parsed.value <= 10 ? 2200 : 1800;
  if(parsed.unit === "h") return 1400;
  if(parsed.unit === "d") return 1000;
  if(parsed.unit === "w") return 700;
  return 1800;
}

function __dvlCandleModeForProfile(){
  try{ return String(candleMode || "normal").toLowerCase(); }catch(_){ return "normal"; }
}

function __dvlMinViewCandlesForMode(mode){
  mode = String(mode || __dvlCandleModeForProfile()).toLowerCase();
  try{
    if(window.DVL_CANDLE_ZOOM_PROFILE_MODEL && typeof window.DVL_CANDLE_ZOOM_PROFILE_MODEL.minViewCandles === "function"){
      return window.DVL_CANDLE_ZOOM_PROFILE_MODEL.minViewCandles(mode);
    }
  }catch(_){}
  return mode === "footprint" ? 3 : 6;
}

function __dvlStableViewCountForMode(count, mode){
  mode = String(mode || __dvlCandleModeForProfile()).toLowerCase();
  count = Number(count);
  if(!Number.isFinite(count)) return count;

  // DVL Beta 0.924 — the last tilt only happens at the closest fractional zoom.
  // For normal/hollow, lock that endpoint to an integer 6-candle grid.
  // Footprint keeps the wider 3-candle detail profile.
  if(mode !== "footprint"){
    const min = __dvlMinViewCandlesForMode(mode);
    if(count <= min + 0.12) return min;
  }

  return count;
}

function __dvlCandleWidthForMode(slotW, mode, legacyW){
  mode = String(mode || __dvlCandleModeForProfile()).toLowerCase();
  const fallback = Number.isFinite(Number(legacyW)) ? Number(legacyW) : Math.max(1.8, Math.min(28, Number(slotW || 1) * .56));
  try{
    if(window.DVL_CANDLE_ZOOM_PROFILE_MODEL && typeof window.DVL_CANDLE_ZOOM_PROFILE_MODEL.candleWidth === "function"){
      return window.DVL_CANDLE_ZOOM_PROFILE_MODEL.candleWidth({ mode, slotW:Number(slotW), legacyW:fallback });
    }
  }catch(_){}
  if(mode === "footprint") return Math.max(4, Math.min(150, Number(slotW || 1) * .88));
  return Math.max(2.2, Math.min(110, Number(slotW || 1) * .74));
}

function minViewCandles(){
  return __dvlMinViewCandlesForMode(__dvlCandleModeForProfile());
}

function maxViewCandles(){
  return Math.max(80, klines.length + Math.round(chartViewCount * 0.65) || 80);
}

function clampChartViewport(){
  chartViewCount = clamp(chartViewCount, minViewCandles(), maxViewCandles());
  chartViewCount = __dvlStableViewCountForMode(chartViewCount, candleMode);
  const maxOffset = Math.max(0, (klines.length || 0) - Math.min(chartViewCount, klines.length || chartViewCount));
  const maxFuture = Math.max(20, chartViewCount * 0.70);
  chartOffsetCandles = clamp(chartOffsetCandles, -maxFuture, maxOffset);
  if(!Number.isFinite(priceViewCenter)) priceViewCenter = null;
  if(!Number.isFinite(priceViewRange)) priceViewRange = null;
}

function __dvlSlotOffset(win, candles){
  win = win || {};
  if(
    win.continuousIndexWindow === true &&
    Number.isFinite(Number(win.start)) &&
    Number.isFinite(Number(win.leftEdgeIndex))
  ){
    // DVL Beta 0.931 — each candle x is based on its global index minus the
    // fractional left edge. This removes slice-boundary jumps while panning.
    return Number(win.start) - Number(win.leftEdgeIndex);
  }

  const len = candles ? candles.length : ((win.candles || []).length || 0);
  const totalSlots = Number(win.totalSlots) || 0;
  const futureSlots = Number(win.futureSlots) || 0;
  const pastFraction = Number(win.pastFraction) || 0;
  return totalSlots - futureSlots - len + pastFraction;
}
window.__dvlSlotOffset = __dvlSlotOffset;

/* Beta 1.554 — fractional pan often changes only leftEdgeIndex, while the
   integer slice boundaries stay identical for several frames. Reuse that slice
   instead of allocating a new array every frame. Candle objects remain live
   references, so current-candle mutations are still visible immediately. */
let __dvlVisibleSliceCache1210={ ref:null, start:-1, end:-1, candles:null };
function visibleWindow(){
  clampChartViewport();

  const totalSlots = chartViewCount;                       // float: smooth candle width/spacing
  const futureSlots = Math.max(0, -chartOffsetCandles);    // float: smooth right-edge gap
  const span = Math.max(1, totalSlots - 1);

  const lastIndex = Math.max(0, (klines.length || 1) - 1);

  // DVL Beta 0.931 — continuous index window.
  // Instead of selecting a slice first and then trying to compensate with
  // offsets, define the fractional right/left edges in global candle indexes.
  // This keeps motion continuous when the slice changes by one candle.
  const rightEdgeIndex = lastIndex - Number(chartOffsetCandles || 0);
  const leftEdgeIndex = rightEdgeIndex - span;

  const start = Math.max(0, Math.floor(leftEdgeIndex) - 1);
  const end = Math.min(klines.length, Math.max(start + 1, Math.ceil(rightEdgeIndex) + 2));
  let candles;
  if(__dvlVisibleSliceCache1210.ref===klines && __dvlVisibleSliceCache1210.start===start && __dvlVisibleSliceCache1210.end===end && __dvlVisibleSliceCache1210.candles){
    candles=__dvlVisibleSliceCache1210.candles;
  }else{
    candles=klines.slice(start,end);
    __dvlVisibleSliceCache1210={ref:klines,start:start,end:end,candles:candles};
  }

  const pastRaw = Math.max(0, chartOffsetCandles);
  const pastOffset = Math.max(0, Math.floor(pastRaw + 0.000001));
  const pastFraction = Math.max(0, Math.min(0.999999, pastRaw - pastOffset));

  return {
    candles,
    totalSlots,
    futureSlots,
    pastOffset,
    pastFraction,
    visibleSlots:candles.length,
    start,
    end,
    leftEdgeIndex,
    rightEdgeIndex,
    continuousIndexWindow:true
  };
}

function indexFromTimeNearest(timeMs){
  if(!Array.isArray(klines) || !klines.length) return 0;
  var best = 0, bestDist = Infinity;
  for(var i = 0; i < klines.length; i++){
    var t = Number(klines[i].time || klines[i].t || 0);
    var d = Math.abs(t - timeMs);
    if(d < bestDist){ bestDist = d; best = i; }
  }
  return best;
}

function visibleKlines(){
  return visibleWindow().candles;
}

function shouldShowAxisDate(){
  return chartViewCount >= 130 || interval === "1d" || interval === "3d" || interval === "1w";
}

function chartTimeLabel(ms, includeDate = false){
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2,"0");
  const mon = String(d.getMonth()+1).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");

  if(includeDate){
    if(interval === "1d" || interval === "3d" || interval === "1w") return `${day}/${mon}`;
    return `${day}/${mon} ${hh}:${mm}`;
  }

  if(interval === "1d" || interval === "3d" || interval === "1w") return `${day}/${mon}`;
  if(interval === "1h" || interval === "2h" || interval === "4h" || interval === "6h" || interval === "8h" || interval === "12h") return `${hh}:00`;
  return `${hh}:${mm}`;
}

function chartDateTimeLabel(ms){
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2,"0");
  const mon = String(d.getMonth()+1).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${day}/${mon} ${hh}:${mm}`;
}

function zoomChartAt(clientX, factor){
  if(!klines.length) return;
  const rect = els.canvas.getBoundingClientRect();
  const chartW = Math.max(rect.width - PRICE_SCALE_W, 1);
  const xRatio = clamp((clientX - rect.left) / chartW, 0, 1);
  const oldCount = chartViewCount;
  /* Beta 1.554 desktop mouse fix: the previous wheel path called
     __dvlRenderSlotSpan(), but that helper only exists inside
     setupChartInteractions() and is not visible here. That ReferenceError was
     the real reason mouse-wheel zoom silently did nothing on desktop. */
  const oldSpan = Math.max(1, Number(oldCount) - 1);
  const candleAtPointerFromRight = chartOffsetCandles + (1 - xRatio) * oldSpan;

  chartViewCount = clamp(oldCount * factor, minViewCandles(), maxViewCandles());
  chartViewCount = __dvlStableViewCountForMode(chartViewCount, candleMode);
  const newSpan = Math.max(1, Number(chartViewCount) - 1);
  chartOffsetCandles = candleAtPointerFromRight - (1 - xRatio) * newSpan;
  clampChartViewport();
  drawSoon();
}

function zoomPriceScaleAt(clientY, factor){
  const canvas = els.canvas;
  if(!canvas || !Number.isFinite(priceViewRange) || !Number.isFinite(priceViewCenter)) return;
  const rect = canvas.getBoundingClientRect();
  const h = Math.max(dvlPricePanelBottom(rect.height) - 4, 1);
  const yRatio = clamp((clientY - rect.top) / h, 0, 1);

  const oldRange = priceViewRange;
  const min = priceViewCenter - oldRange / 2;
  const anchorPrice = min + (1 - yRatio) * oldRange;

  const nextRange = clamp(oldRange * factor, 0.0000001, oldRange * 1000000);
  const nextMin = anchorPrice - (1 - yRatio) * nextRange;

  priceViewRange = nextRange;
  priceViewCenter = nextMin + nextRange / 2;
  priceScaleLocked = true;
  drawSoon();
}

function panPriceScale(deltaYPx, chartHeight){
  if(!Number.isFinite(priceViewRange) || !Number.isFinite(priceViewCenter)) return;
  const pxToPrice = priceViewRange / Math.max(chartHeight, 1);
  priceViewCenter += deltaYPx * pxToPrice * PRICE_DRAG_SENSITIVITY;
  priceScaleLocked = true;
}

async function jget(url){
  const ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => { try{ ctrl.abort(); }catch(_){} }, 8500) : null;
  try{
    const r = await fetch(url, {cache:"no-store", signal:ctrl ? ctrl.signal : undefined});
    if(!r.ok) throw new Error("HTTP " + r.status + " @ " + url);
    return await r.json();
  }finally{
    if(timer) clearTimeout(timer);
  }
}

function assetTickerFor(sym){
  return assetTickerMap[sym] || (sym === symbol ? ticker : null);
}

function fmtMiniPrice(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return "--";
  if(n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if(n >= 100) return n.toFixed(2);
  if(n >= 1) return n.toFixed(3);
  return n.toFixed(5);
}

function fmtMiniPct(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}


function updateOpenAssetDropdownInPlace(){
  if(!els.assetDropdown || !assetDropdownOpen || !els.assetDropdown.classList.contains("is-open")) return false;
  const rows = els.assetDropdown.querySelectorAll(".assetOption[data-symbol]");
  rows.forEach(row => {
    const sym = row.getAttribute("data-symbol");
    if(!sym) return;

    const fav = isFavoriteSymbol(sym);
    const active = sym === symbol;
    row.classList.toggle("is-active", active);

    const coin = row.querySelector(".assetCoin");
    if(coin){
      try{
        coin.textContent = assetIconText(sym);
        coin.className = `assetCoin dvlAssetLetterIcon ${coinClass(sym)}`.trim();
        coin.setAttribute("data-dvl-symbol", sym);
      }catch(_){}
    }

    const price = row.querySelector(".assetMiniMarket b");
    const pct = row.querySelector(".assetMiniMarket small");
    const t = assetTickerFor(sym);
    if(price) price.textContent = fmtMiniPrice(t?.lastPrice);
    if(pct){
      const ch = Number(t?.priceChangePercent);
      pct.textContent = fmtMiniPct(t?.priceChangePercent);
      pct.classList.toggle("is-down", Number.isFinite(ch) && ch < 0);
      pct.classList.toggle("is-up", !(Number.isFinite(ch) && ch < 0));
    }

    const star = row.querySelector("[data-star-symbol]");
    if(star){
      star.classList.toggle("is-favorite", fav);
      star.setAttribute("aria-label", `${fav ? "Remover favorito" : "Adicionar favorito"} ${displaySymbol(sym)}`);
    }
  });

  if(els.symbolBtn) els.symbolBtn.classList.toggle("is-open", assetDropdownOpen);
  if(els.assetsNavBtn) els.assetsNavBtn.classList.toggle("active", assetFavoritesOpen);
  return true;
}


let __dvlAssetTickerFreshAt1206 = 0;

async function refreshAssetTickers(silent=true){
  try{
    const all = await jget(`${BINANCE}/fapi/v1/ticker/24hr`);
    if(Array.isArray(all)){
      all.forEach(item => {
        if(item && symbols.includes(item.symbol)){
          assetTickerMap[item.symbol] = item;
          window.DVL_ASSET_TICKER_MAP = assetTickerMap;
          window.DVL_24H_STATS = window.DVL_24H_STATS || {};
          window.DVL_24H_STATS[item.symbol] = {price: parseFloat(item.lastPrice), change: parseFloat(item.priceChangePercent)};
          window.DVL_LAST_PRICE_BY_SYMBOL = window.DVL_LAST_PRICE_BY_SYMBOL || {};
          window.DVL_LAST_PRICE_BY_SYMBOL[item.symbol] = {price: parseFloat(item.lastPrice), time: Date.now()};
        }
      });
      // Atualiza ticker do ativo atual com dado fresco (bug anterior revertia para o antigo)
      const freshTk = assetTickerMap[symbol];
      if(freshTk){ ticker = freshTk; marketEntryPrice = Number(freshTk.lastPrice)||marketEntryPrice; }
      __dvlAssetTickerFreshAt1206 = Date.now();
      if(assetDropdownOpen && els.assetDropdown && els.assetDropdown.classList.contains("is-open")){
        renderCurrentFavoriteStar();
        updateOpenAssetDropdownInPlace();
        if(assetFavoritesOpen) renderFavoriteAssetsPanel();
        if(els.symbolBtn) els.symbolBtn.classList.add("is-open");
      }else{
        /* Beta 1.554: closed menus stay frozen. Rebuilding their entire DOM on
           every ticker refresh was invisible work and recreated listeners. */
        renderCurrentFavoriteStar();
      }
    }
  }catch(err){
    if(!silent) console.warn(err);
  }
}

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(()=>els.toast.classList.remove("show"), 5200);
}

function setTradeDrawer(open){
  els.tradeDrawer.classList.toggle('is-open', open);
  els.tradeNavBtn.classList.toggle('drawer-open', open);
}

function setMarginMode(mode){
  marginMode = mode === "cross" ? "cross" : "isolated";
  if(els.isolatedModeBtn) els.isolatedModeBtn.classList.toggle("activeMode", marginMode === "isolated");
  if(els.crossModeBtn) els.crossModeBtn.classList.toggle("activeMode", marginMode === "cross");
}

if(els.isolatedModeBtn){
  els.isolatedModeBtn.addEventListener("click", () => setMarginMode("isolated"));
}
if(els.crossModeBtn){
  els.crossModeBtn.addEventListener("click", () => setMarginMode("cross"));
}

function setOrderType(type){
  orderType = type === "Market" ? "Market" : "Limit";
  if(els.orderTypeLabel) els.orderTypeLabel.textContent = orderType;
  if(els.buyPriceBtn) els.buyPriceBtn.textContent = orderType;
  if(els.sellPriceBtn) els.sellPriceBtn.textContent = orderType;
  if(els.orderTypeOptions){
    els.orderTypeOptions.forEach(btn => {
      btn.classList.toggle("activeOrderType", btn.dataset.orderType === orderType);
    });
  }
  closeOrderTypeMenu();
}

function openOrderTypeMenu(){
  if(!els.orderTypeWrap || !els.orderTypeBtn || !els.orderTypeMenu) return;
  els.orderTypeWrap.classList.add("is-open");
  els.orderTypeBtn.setAttribute("aria-expanded", "true");
  els.orderTypeMenu.setAttribute("aria-hidden", "false");
}

function closeOrderTypeMenu(){
  if(!els.orderTypeWrap || !els.orderTypeBtn || !els.orderTypeMenu) return;
  els.orderTypeWrap.classList.remove("is-open");
  els.orderTypeBtn.setAttribute("aria-expanded", "false");
  els.orderTypeMenu.setAttribute("aria-hidden", "true");
}

function toggleOrderTypeMenu(){
  if(els.orderTypeWrap && els.orderTypeWrap.classList.contains("is-open")){
    closeOrderTypeMenu();
  } else {
    openOrderTypeMenu();
  }
}

if(els.orderTypeBtn){
  els.orderTypeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleOrderTypeMenu();
  });
}

if(els.orderTypeOptions){
  els.orderTypeOptions.forEach(btn => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setOrderType(btn.dataset.orderType);
    });
  });
}

document.addEventListener("click", (ev) => {
  if(els.orderTypeWrap && !els.orderTypeWrap.contains(ev.target)){
    closeOrderTypeMenu();
  }
});


els.tradeNavBtn.addEventListener('click', ()=>{
  setTradeDrawer(!els.tradeDrawer.classList.contains('is-open'));
});
els.closeTradeDrawer.addEventListener('click', ()=>setTradeDrawer(false));
if(els.panelCloseX){
  els.panelCloseX.addEventListener('click', ()=>setTradeDrawer(false));
}

// ── Demo position (Buy / Sell) ─────────────────────────────────────────────
function _toggleDemoPos(dir){
  const price = Number(ticker?.lastPrice || klines.at(-1)?.close || 0);
  if(!price){ showToast('Aguardando preço...'); return; }
  demoPos = (demoPos && demoPos.dir === dir) ? null : { dir, price };
  const buyBtn = document.getElementById('dvlBuyBtn');
  const selBtn = document.getElementById('dvlSellBtn');
  if(buyBtn) buyBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'long');
  if(selBtn) selBtn.classList.toggle('is-active', !!demoPos && demoPos.dir === 'short');
  drawSoon();
}
document.getElementById('dvlBuyBtn')?.addEventListener('click', ()=>_toggleDemoPos('long'));
document.getElementById('dvlSellBtn')?.addEventListener('click', ()=>_toggleDemoPos('short'));


function setLiquidationLines(on){
  liquidationLinesOn = !!on;
  if(els.liqToggleBtn) els.liqToggleBtn.classList.toggle("is-on", liquidationLinesOn);
  if(els.liqToggleText) els.liqToggleText.textContent = liquidationLinesOn ? "ON" : "OFF";
  drawSoon();
}

if(els.liqToggleBtn){
  els.liqToggleBtn.addEventListener("click", () => setLiquidationLines(!liquidationLinesOn));
}

let levDragging = false;

function startLeverageDrag(ev){
  if(!els.levSlider) return;
  ev.preventDefault();
  ev.stopPropagation();
  levDragging = true;
  try{ ev.currentTarget.setPointerCapture?.(ev.pointerId); }catch(_){}
  setLeverageFromPointer(ev.clientX);
}

function moveLeverageDrag(ev){
  if(!levDragging) return;
  ev.preventDefault();
  setLeverageFromPointer(ev.clientX);
}

function endLeverageDrag(ev){
  levDragging = false;
  try{ ev.currentTarget?.releasePointerCapture?.(ev.pointerId); }catch(_){}
}

if(els.levSlider){
  els.levSlider.addEventListener("pointerdown", startLeverageDrag);
}

if(els.levDragCard){
  els.levDragCard.addEventListener("pointerdown", startLeverageDrag);
}

/* Global tracking: after the first touch-down, dragging keeps working even if the finger leaves the slider/card. */
window.addEventListener("pointermove", moveLeverageDrag, {passive:false});
window.addEventListener("pointerup", endLeverageDrag, {passive:true});
window.addEventListener("pointercancel", endLeverageDrag, {passive:true});

if(els.entryEditCard){
  els.entryEditCard.addEventListener("click", openEntryPad);
}

if(els.entryPadClose){
  els.entryPadClose.addEventListener("click", closeEntryPad);
}

if(els.entryPadClear){
  els.entryPadClear.addEventListener("click", () => {
    entryPadDraft = "0";
    if(els.entryPadDisplay) els.entryPadDisplay.textContent = entryPadDraft;
  });
}

if(els.entryPadOk){
  els.entryPadOk.addEventListener("click", applyEntryPad);
}

if(els.entryPadOverlay){
  els.entryPadOverlay.addEventListener("click", (ev) => {
    if(ev.target === els.entryPadOverlay) closeEntryPad();
  });
}

if(els.entryPadKeys){
  els.entryPadKeys.forEach(btn => {
    btn.addEventListener("click", () => pressEntryPadKey(btn.dataset.key));
  });
}

syncTradePanel();




async function fetchKlinesHistoryFromEndpoint(endpoint, sym, iv, targetLimit){
  const batchLimit = endpoint && endpoint.market === "futures" ? 1500 : 1000;
  let endTime = null;
  let out = [];

  while(out.length < targetLimit){
    const remaining = targetLimit - out.length;
    const limit = Math.min(batchLimit, remaining);
    const endParam = endTime ? `&endTime=${endTime}` : "";
    const url = endpoint.base + endpoint.klinePath + `?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(iv)}&limit=${limit}${endParam}`;
    const batch = await jget(url);

    if(!Array.isArray(batch) || !batch.length) break;

    out = batch.concat(out);

    const oldest = Number(batch[0][0]);
    if(!Number.isFinite(oldest) || batch.length < limit) break;

    endTime = oldest - 1;

    if(out.length >= targetLimit) break;
    await new Promise(r => setTimeout(r, 35));
  }

  const seen = new Set();
  const clean = out.filter(row => {
    const t = row && row[0];
    if(!Number.isFinite(Number(t)) || seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  return __dvlTagRows(clean, {
    source:__dvlRealSourceName(endpoint, "KLINES"),
    endpoint:endpoint && endpoint.base,
    market:endpoint && endpoint.market
  });
}

/* Chart exchange-failover: pull the same candles from MEXC via the backend
   when every Binance endpoint is unreachable/empty. The browser can't reach
   contract.mexc.com directly (CORS + geo), so it proxies through the scanner
   backend at the same origin. Symbol is converted Binance→MEXC form
   (BTCUSDT → BTC_USDT). Backend already returns Binance-shaped kline rows. */
async function fetchMexcKlinesViaBackend(sym, iv, targetLimit){
  const mexcSym = String(sym || "").toUpperCase().replace(/USDT$/, "_USDT");
  if(!/_USDT$/.test(mexcSym)) throw new Error("mexc sym n/a: " + sym);
  const url = "/api/dvl/scanner/mexc-klines?symbol=" + encodeURIComponent(mexcSym)
    + "&tf=" + encodeURIComponent(iv) + "&limit=" + (Math.min(1500, targetLimit || 500));
  const j = await jget(url);
  const rows = j && Array.isArray(j.rows) ? j.rows : null;
  if(!rows || !rows.length) throw new Error("mexc backend empty");
  return __dvlTagRows(rows, { source:"MEXC_BACKEND_KLINES", endpoint:"/api/dvl/scanner/mexc-klines", market:"mexc-futures" });
}

/* Beta 1.647 - same-origin Binance Spot history. The live chart socket is Spot,
   so its current candle must not be initialized from MEXC/Futures and then
   mutated by Spot trades. The VPS proxy also avoids browser CORS/rate-limit
   cascades. */
async function fetchDvlSpotKlinesProxy(sym, iv, targetLimit){
  if(!isNativeTimeframe(iv)) return null;
  const limit = Math.min(Math.max(2, Number(targetLimit) || 650), 1000);
  const url = "/api/klines?symbol=" + encodeURIComponent(String(sym || "").toUpperCase())
    + "&interval=" + encodeURIComponent(iv) + "&limit=" + limit;
  const r = await fetch(url, { cache:"no-store" });
  if(!r.ok) throw new Error("DVL spot proxy HTTP " + r.status);
  const data = await r.json();
  if(!Array.isArray(data) || !data.length) throw new Error("DVL spot proxy empty");
  const rows = data.map(x => [
    Number(x.t), String(x.o), String(x.h), String(x.l), String(x.c), String(x.v || 0),
    Number(x.closeTime), String(x.q || 0), Number(x.trades || 0),
    String(x.buyVolume || 0), String(x.buyQuote || 0), "0"
  ]).filter(x => Number.isFinite(x[0]) && Number.isFinite(Number(x[4])));
  if(!rows.length) throw new Error("DVL spot proxy invalid rows");
  return __dvlTagRows(rows, { source:"DVL_BINANCE_SPOT_PROXY", endpoint:"/api/klines", market:"binance-spot" });
}

async function fetchKlinesHistory(sym, iv, targetLimit){
  const errors = [];

  for(const endpoint of DVL_REAL_MARKET_ENDPOINTS){
    try{
      const rows = await fetchKlinesHistoryFromEndpoint(endpoint, sym, iv, targetLimit);
      if(Array.isArray(rows) && rows.length){
        return rows;
      }
      errors.push(endpoint.name + ":empty");
    }catch(e){
      errors.push(endpoint.name + ":" + String(e && e.message || e).slice(0, 140));
    }
  }

  /* Binance is fully down → keep the chart alive from MEXC instead of
     throwing "Binance klines vazio". Only reached after all Binance
     endpoints above failed, so it never adds latency on the happy path. */
  try{
    const rows = await fetchMexcKlinesViaBackend(sym, iv, targetLimit);
    if(Array.isArray(rows) && rows.length){
      return rows;
    }
    errors.push("MEXC_BACKEND:empty");
  }catch(e){
    errors.push("MEXC_BACKEND:" + String(e && e.message || e).slice(0, 140));
  }

  throw new Error("Real kline failover failed [" + errors.join(" | ") + "]");
}

function resampleKlineRows(rows, targetIv){
  const targetMs = intervalMs(targetIv);
  if(!Array.isArray(rows) || !rows.length || !Number.isFinite(targetMs) || targetMs <= 0) return [];

  const buckets = new Map();

  rows.forEach(row => {
    const time = Number(row[0]);
    if(!Number.isFinite(time)) return;
    const bucketTime = Math.floor(time / targetMs) * targetMs;
    let b = buckets.get(bucketTime);

    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5]) || 0;
    const quoteVolume = Number(row[7]) || 0;

    if(!b){
      b = {
        time:bucketTime,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume
      };
      buckets.set(bucketTime, b);
    }else{
      b.high = Math.max(b.high, high);
      b.low = Math.min(b.low, low);
      b.close = close;
      b.volume += volume;
      b.quoteVolume += quoteVolume;
    }
  });

  const outRows = Array.from(buckets.values())
    .sort((a,b) => a.time - b.time)
    .map(b => [b.time, String(b.open), String(b.high), String(b.low), String(b.close), String(b.volume), b.time + targetMs - 1, String(b.quoteVolume)]);

  return __dvlTagRows(outRows, {
    source:"REAL_RESAMPLED_" + targetIv,
    endpoint:null,
    market:null
  });
}

async function fetchAggTradesFromEndpoint(endpoint, sym, iv, targetLimit){
  const tfMs = intervalMs(iv);
  const end = Date.now();
  const start = end - tfMs * (targetLimit + 20);
  const buckets = new Map();
  let cursor = start;
  let guard = 0;

  while(cursor < end && guard < 30){
    guard++;
    const url = endpoint.base + endpoint.aggPath
      + "?symbol=" + encodeURIComponent(sym)
      + "&startTime=" + Math.floor(cursor)
      + "&endTime=" + Math.floor(end)
      + "&limit=1000";
    const batch = await jget(url);
    if(!Array.isArray(batch) || !batch.length) break;

    batch.forEach(tr => {
      const t = Number(tr.T), p = Number(tr.p), q = Number(tr.q) || 0;
      if(!Number.isFinite(t) || !Number.isFinite(p) || !q) return;
      const bt = Math.floor(t / tfMs) * tfMs;
      let b = buckets.get(bt);
      if(!b){ b = {time:bt,open:p,high:p,low:p,close:p,volume:0,buyVol:0,sellVol:0}; buckets.set(bt,b); }
      b.high = Math.max(b.high, p); b.low = Math.min(b.low, p); b.close = p;
      b.volume += q;
      if(tr.m) b.sellVol += q; else b.buyVol += q;
    });

    const lastT = Number(batch[batch.length-1].T);
    if(!Number.isFinite(lastT) || lastT <= cursor) break;
    cursor = lastT + 1;
    if(batch.length < 1000) break;
    await new Promise(r => setTimeout(r, 50));
  }

  if(!window._dvlFpCache) window._dvlFpCache = new Map();
  const result = Array.from(buckets.values()).sort((a,b) => a.time - b.time).slice(-targetLimit);
  result.forEach(c => { window._dvlFpCache.set(c.time, {b:c.buyVol, s:c.sellVol, total:c.volume}); });
  const rows = result.map(c => [c.time, String(c.open), String(c.high), String(c.low), String(c.close), String(c.volume), c.time+tfMs-1, String(c.volume)]);
  return __dvlTagRows(rows, {
    source:__dvlRealSourceName(endpoint, "AGGTRADES_" + iv),
    endpoint:endpoint && endpoint.base,
    market:endpoint && endpoint.market
  });
}

async function fetchKlinesFromAggTrades(sym, iv, targetLimit){
  const errors = [];

  for(const endpoint of DVL_REAL_MARKET_ENDPOINTS){
    if(!endpoint.aggPath) continue;
    try{
      const rows = await fetchAggTradesFromEndpoint(endpoint, sym, iv, targetLimit);
      if(Array.isArray(rows) && rows.length){
        return rows;
      }
      errors.push(endpoint.name + ":empty");
    }catch(e){
      errors.push(endpoint.name + ":" + String(e && e.message || e).slice(0, 140));
    }
  }

  throw new Error("Real aggTrades failover failed [" + errors.join(" | ") + "]");
}

async function fetchDvlSubsecondCandles(sym, iv, targetLimit){
  if(iv !== "15s" && iv !== "30s") return null;
  const lim = Math.min(Math.max(50, Number(targetLimit) || 1000), 10000);
  const url = "/api/market/candles?symbol=" + encodeURIComponent(sym) + "&interval=" + iv + "&limit=" + lim;
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) return null;
  const j = await r.json();
  if(!j || j.ok !== true || j.status === "OFFLINE" || !Array.isArray(j.candles) || !j.candles.length) return null;
  // formato de linha estilo Binance kline: [t,o,h,l,c,vol,closeTime,quoteVol,trades,buyVol,...]
  const rows = j.candles.map(c => [
    Number(c.openTime), String(c.open), String(c.high), String(c.low), String(c.close),
    String(c.baseVolume), Number(c.closeTime), String(c.quoteVolume),
    Number(c.tradeCount) || 0, String(c.takerBuyBase), String(c.takerBuyQuote || "0"), "0"
  ]);
  return __dvlTagRows(rows, { source: "DVL_BACKEND_SUBSECOND_" + iv, endpoint: "/api/market/candles", market: j.market || "binance-spot" });
}

/* Beta 1.554 — Fix da SELEÇÃO de 15s/30s. O sistema de timeframe tem módulos
   legados sobrepostos que às vezes "engolem" a troca pra segundos (o TF não
   muda). Este handler isolado age SÓ em 15s/30s e força a troca pelo caminho
   autoritativo (setIntervalUi), em capture, antes dos handlers legados. Não
   toca nos TFs de minuto — não pode quebrar o que já funciona. */
(function(){
  if(window.__DVL_SECONDS_TF_FIX_1383) return; window.__DVL_SECONDS_TF_FIX_1383 = true;
  function secTfOf(el){ if(!el||!el.getAttribute) return null; var tf=el.getAttribute("data-tf")||el.getAttribute("data-tf-choice"); return (tf==="15s"||tf==="30s")?tf:null; }
  document.addEventListener("click", function(ev){
    try{
      var el = ev.target && ev.target.closest ? ev.target.closest(".dvl1b-tf[data-tf],[data-tf-choice]") : null;
      if(!el) return;
      var tf = secTfOf(el);
      if(!tf) return;   // TFs de minuto seguem o fluxo normal
      ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      try{ if(window.DVL_REAL_TIMEFRAME_STATE) window.DVL_REAL_TIMEFRAME_STATE.activeTf = tf; }catch(_){}
      try{ if(typeof setIntervalUi === "function") setIntervalUi(tf); else if(window.setIntervalUi) window.setIntervalUi(tf); }catch(_){}
      try{ document.querySelectorAll("#dvl1b_tfScroll .dvl1b-tf[data-tf]").forEach(function(b){ b.classList.toggle("is-active", b.getAttribute("data-tf")===tf); }); }catch(_){}
      try{ var m=document.getElementById("dvl1b_tfDropMenu"); if(m) m.setAttribute("aria-hidden","true"); var w=document.getElementById("dvl1b_tfDropWrap"); if(w) w.classList.remove("is-open"); }catch(_){}
    }catch(_){}
  }, true);
})();

async function fetchKlinesSmart(sym, iv, targetLimit){
  const parsed = parseTimeframe(iv);

  // DVL Beta 0.926 — seconds TFs must still be real API data.
  // Binance Futures kline REST is not reliable for every seconds interval, so
  // build seconds candles from real aggTrades instead of falling to generic data.
  if(parsed.unit === "s"){
    // Beta 1.554 — 15s/30s: tenta PRIMEIRO o recorder do próprio servidor DVL
    // (/api/market/candles, mesma origem, candles reais de aggTrades, histórico
    // longo e confiável). Cai no builder de aggTrades da corretora se o backend
    // não tiver aquele símbolo.
    if(iv === "15s" || iv === "30s"){
      try{
        const beRows = await fetchDvlSubsecondCandles(sym, iv, targetLimit);
        if(Array.isArray(beRows) && beRows.length) return beRows;
      }catch(_){}
    }
    const rows = await fetchKlinesFromAggTrades(sym, iv, targetLimit);
    if(Array.isArray(rows) && rows.length) return rows;
    throw new Error("Sem aggTrades reais para " + iv);
  }

  /* Keep the initial/current candle on the same exchange as @aggTrade. */
  if(isNativeTimeframe(iv)){
    try{
      const spotRows = await fetchDvlSpotKlinesProxy(sym, iv, targetLimit);
      if(Array.isArray(spotRows) && spotRows.length) return spotRows;
    }catch(_){ }
  }

  /* MEXC-FIRST — the chart is exchange-agnostic and MEXC lists ~every asset,
     so pull candles from MEXC (via the backend) before anything else. This is
     ONE fast call, so switching assets is near-instant, and it avoids the slow
     cascade of Binance endpoints (each one has to time out when Binance is
     geo-banned). MEXC serves every non-seconds TF (it resamples the ones it
     has no native candle for, e.g. 3m). Only if MEXC has no data for this
     symbol/TF do we fall through to the Binance path below. */
  try{
    const mrows = await fetchMexcKlinesViaBackend(sym, iv, targetLimit);
    if(Array.isArray(mrows) && mrows.length) return mrows;
  }catch(_){}

  if(isNativeTimeframe(iv)){
    return await fetchKlinesHistory(sym, iv, targetLimit);
  }

  const baseIv = baseIntervalForTimeframe(iv);
  const targetMs = intervalMs(iv);
  const baseMs = intervalMs(baseIv);
  const multiplier = Math.max(1, Math.ceil(targetMs / baseMs));

  let baseLimit = targetLimit * multiplier + 160;
  if(baseIv === "1m") baseLimit = Math.min(9000, baseLimit);
  if(baseIv === "1h") baseLimit = Math.min(5000, baseLimit);
  if(baseIv === "1d") baseLimit = Math.min(2500, baseLimit);

  const baseRows = await fetchKlinesHistory(sym, baseIv, baseLimit);
  const resampled = resampleKlineRows(baseRows, iv).slice(-targetLimit);
  return __dvlTagRows(resampled, {
    source:String(baseRows && baseRows.__dvlSource || "REAL_KLINES") + "_RESAMPLED_" + iv,
    endpoint:baseRows && baseRows.__dvlEndpoint || null,
    market:baseRows && baseRows.__dvlMarket || null
  });
}


async function fetchEmergencyRealKlines(sym, iv){
  // DVL Beta 0.929 — never go generic before trying a small real Binance payload.
  // This protects boot/session cases where seconds aggTrades or deep history fails.
  const parsed = parseTimeframe(iv);
  const attempts = [];

  if(parsed.unit === "s"){
    attempts.push({ interval:"1m", limit:500, source:"BINANCE_REAL_EMERGENCY_1M_FOR_SECONDS" });
  }else{
    attempts.push({ interval:iv, limit:500, source:"BINANCE_REAL_EMERGENCY_NATIVE" });
    if(iv !== "1m") attempts.push({ interval:"1m", limit:500, source:"BINANCE_REAL_EMERGENCY_1M" });
  }

  for(const a of attempts){
    try{
      const rows = await fetchKlinesHistory(sym, a.interval, a.limit);
      if(Array.isArray(rows) && rows.length){
        return {
          rows,
          source:rows.__dvlSource || a.source,
          endpoint:rows.__dvlEndpoint || null,
          market:rows.__dvlMarket || null,
          interval:a.interval,
          requestedInterval:iv
        };
      }
    }catch(_){}
  }

  return null;
}

function applyKlineRowsToChart(rows){
  if(!Array.isArray(rows) || !rows.length) return false;
  const mapped = rows.map(x => ({
    time:x[0], open:+x[1], high:+x[2], low:+x[3], close:+x[4],
    volume:+x[5], quoteVolume:+x[7], buyVolume:+x[9]
  })).filter(c =>
    Number.isFinite(c.time) &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
  /* Never blank an already-loaded chart with an empty/garbled response —
     keep the last good candles instead of wiping them. */
  if(!mapped.length) return false;
  klines = mapped;
  try{ window.DVL_CHART_READY = true; }catch(_){}
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   DVL REPLAY PRO — arquitetura definitiva (Market Bus + ReplayClock) + engine.
   Fase 1: Candle Replay sem lookahead, no MESMO gráfico. Durante o replay o
   array `klines` é LIMITADO ao cursor: nada do futuro fica visível/acessível aos
   indicadores (eles leem `klines`). Relógio virtual central + barramento único.
   ══════════════════════════════════════════════════════════════════════════ */
window.DVLReplayClock = window.DVLReplayClock || {
  active:false, currentTs:0, speed:1, paused:true,
  now(){ return this.currentTs; },
  canProcess(eventTs){ return !this.active || eventTs <= this.currentTs; }
};
window.DVLMarketBus = window.DVLMarketBus || {
  source:'live', subscribers:new Set(),
  setSource(s){ this.source = s; },
  emit(ev){ if(ev && ev.source !== this.source) return; this.subscribers.forEach(function(fn){ try{ fn(ev); }catch(_){} }); },
  subscribe(fn){ this.subscribers.add(fn); return function(){ window.DVLMarketBus.subscribers.delete(fn); }; }
};
(function(){
  var R = { full:[], cursor:0, startIdx:0, minIdx:0, active:false, playing:false, selecting:true, speed:1, tf:'', sym:'', timer:0, baseMs:1000, editActive:false, editBaseCursor:0, editBaseStart:0 };
  var listeners = [];
  function tfMs(){ if(R.full.length>=2){ var d=+R.full[1].time-+R.full[0].time; if(d>0) return d; } return 60000; }
  function clampCursor(i){ return Math.max(R.minIdx, Math.min(R.full.length-1, i)); }
  function status(){ return { active:R.active, playing:R.playing, selecting:R.selecting, editing:R.editActive, speed:R.speed, cursor:R.cursor, startIdx:R.startIdx,
    minIdx:R.minIdx, total:R.full.length, atStart:R.cursor<=R.minIdx, atEnd:R.cursor>=R.full.length-1,
    curTs: R.full[R.cursor]?+R.full[R.cursor].time:0, tf:R.tf, sym:R.sym }; }
  function notify(){ var st=status(); for(var i=0;i<listeners.length;i++){ try{ listeners[i](st); }catch(_){} } }
  function cameraRightIndex(){
    try{
      var len=Array.isArray(klines)?klines.length:0;
      var off=(typeof chartOffsetCandles!=="undefined"&&isFinite(chartOffsetCandles))?Number(chartOffsetCandles):0;
      return len?((len-1)-off):null;
    }catch(_){return null;}
  }
  function restoreCameraRight(idx){
    if(!isFinite(idx))return;
    try{if(typeof chartOffsetCandles!=="undefined"&&Array.isArray(klines)&&klines.length){chartOffsetCandles=(klines.length-1)-idx;}}catch(_){}
  }
  /* refresh: selecting → mostra TODO o histórico (linha de início visível, futuro
     escurecido); tocando → LIMITA ao cursor (nada do futuro visível). */
  function refresh(){
    if(!R.active) return;
    var keepRight=cameraRightIndex();
    klines = R.selecting ? R.full : R.full.slice(0, R.cursor+1);
    restoreCameraRight(keepRight);
    var last = R.full[R.cursor];
    if(last){ window.DVLReplayClock.currentTs = +last.time + tfMs(); }
    if(last && !R.selecting){ try{ window.DVLMarketBus.emit({type:'candle',source:'replay',exchange:'binance',symbol:R.sym,ts:+last.time,price:+last.close,payload:last}); }catch(_){} }
    try{ if(typeof buildTickerFromRealKlines==='function'){ ticker = buildTickerFromRealKlines(); } }catch(_){}
    try{ drawSoon(); }catch(_){}
    notify();
  }
  /* posiciona o scroll pra a vela do cursor ficar na borda direita (com folga `gap`) */
  function anchorCursorRight(gap){ try{ if(typeof chartOffsetCandles!=='undefined'){ var len=R.selecting?R.full.length:(R.cursor+1); chartOffsetCandles=(len-1)-R.cursor-(gap||0); } }catch(_){} }
  function start(opts){
    opts = opts||{};
    if(!Array.isArray(klines) || klines.length<20) return false;
    R.full = klines.slice();
    R.sym = (typeof symbol!=='undefined'&&symbol)||'BTCUSDT'; R.tf=(typeof interval!=='undefined'&&interval)||'5m';
    R.minIdx = Math.min(R.full.length-1, Math.max(20, Math.floor(R.full.length*0.15)));   // warmup p/ indicadores
    /* MANTER O ENQUADRAMENTO: a linha de início aparece na borda direita do que o
       usuário vê agora, sem mudar o scroll/zoom. Arraste a linha pra escolher onde começa. */
    var Lfull=R.full.length;
    var Off=(typeof chartOffsetCandles!=='undefined' && isFinite(chartOffsetCandles))?chartOffsetCandles:0;
    var rightEdge=(Lfull-1)-Off;
    var newestVisible=Math.max(R.minIdx, Math.min(Lfull-1, Math.round(rightEdge)));
    if(opts.startFrac!=null){ newestVisible=clampCursor(Math.floor(opts.startFrac*(Lfull-1))); }
    R.startIdx = newestVisible; R.cursor = newestVisible; R.active=true; R.playing=false; R.selecting=true; R.editActive=false; R.editBaseCursor=newestVisible; R.editBaseStart=newestVisible;
    window.__DVL_REPLAY_ACTIVE=true;
    window.DVLReplayClock.active=true; window.DVLReplayClock.paused=true; window.DVLReplayClock.speed=R.speed;
    try{ window.DVLMarketBus.setSource('replay'); }catch(_){}
    try{ if(typeof _klWs!=='undefined'&&_klWs){ _klWs.close(); _klWs=null; } }catch(_){}   // pausa feed ao vivo
    try{ if(typeof _agWs!=='undefined'&&_agWs){ _agWs.close(); _agWs=null; } }catch(_){}
    refresh();   // sem re-ancorar → enquadramento intacto
    return true;
  }
  function tick(){ if(!R.active||!R.playing) return; if(R.cursor>=R.full.length-1){ pause(); return; } R.cursor=clampCursor(R.cursor+1); refresh(); }
  function schedule(){ if(R.timer){ clearTimeout(R.timer); R.timer=0; } if(!R.playing) return;
    R.timer=setTimeout(function(){ tick(); if(R.playing) schedule(); }, Math.max(30, R.baseMs/R.speed)); }
  function beginStartEdit(){
    if(!R.active||!R.selecting) return false;
    if(!R.editActive){ R.editBaseCursor=R.cursor; R.editBaseStart=R.startIdx; R.editActive=true; notify(); }
    return true;
  }
  function confirmStartEdit(){
    if(!R.active) return false;
    R.startIdx=R.cursor; R.editActive=false; R.editBaseCursor=R.cursor; R.editBaseStart=R.startIdx; notify();
    try{ drawSoon(); }catch(_){}
    return true;
  }
  function cancelStartEdit(){
    if(!R.active||!R.editActive) return false;
    R.cursor=clampCursor(R.editBaseCursor); R.startIdx=clampCursor(R.editBaseStart); R.editActive=false;
    refresh();
    return true;
  }
  function play(){ if(!R.active||R.playing) return;
    if(R.editActive) confirmStartEdit();
    if(!R.full.length) return;
    /* No fim, Play funciona como repetir: volta ao início escolhido. Se o início
       escolhido for o último candle, usa o primeiro candle válido do Replay. */
    if(R.cursor>=R.full.length-1){
      var replayFrom=(R.startIdx<R.full.length-1)?R.startIdx:R.minIdx;
      R.cursor=clampCursor(replayFrom);
    }
    if(R.cursor>=R.full.length-1){ R.selecting=true; refresh(); return; }
    R.selecting=false;   // esconde o futuro sem mover a câmera
    R.playing=true; window.DVLReplayClock.paused=false; refresh(); schedule(); notify(); }
  function pause(){ R.playing=false; window.DVLReplayClock.paused=true; if(R.timer){ clearTimeout(R.timer); R.timer=0; }
    R.selecting=true; refresh(); }   // linha reaparece sem alterar pan/zoom
  function step(dir){ if(!R.active) return; if(R.playing){ R.playing=false; if(R.timer){clearTimeout(R.timer);R.timer=0;} } R.selecting=true; R.cursor=clampCursor(R.cursor+(dir<0?-1:1)); refresh(); }
  function setSpeed(s){ R.speed=+s||1; window.DVLReplayClock.speed=R.speed; if(R.playing) schedule(); notify(); }
  function seekFrac(f){ if(!R.active) return; if(R.playing){ R.playing=false; if(R.timer){clearTimeout(R.timer);R.timer=0;} } R.selecting=true; R.cursor=clampCursor(Math.round(R.minIdx+f*(R.full.length-1-R.minIdx))); refresh(); }
  function restart(){ if(!R.active) return; if(R.timer){clearTimeout(R.timer);R.timer=0;} R.playing=false; R.selecting=true; R.editActive=false; R.cursor=R.startIdx; R.editBaseCursor=R.cursor; R.editBaseStart=R.startIdx; refresh(); }
  /* ── arrastar a linha vertical de início: mapeia clientX → candle e move o cursor,
     SEM re-ancorar (o enquadramento fica parado; o futuro à direita da linha escurece) ── */
  function setStartByClientX(clientX){
    if(!R.active) return false;
    if(!R.editActive) beginStartEdit();
    var cfg=window.__DVL_DRAWCFG; if(!cfg) return false;
    var win=(typeof visibleWindow==='function')?visibleWindow():null;
    var view=win&&win.candles; if(!view||!view.length) return false;
    var so=(typeof __dvlSlotOffset==='function')?__dvlSlotOffset(win,view):0;
    var cv=document.getElementById("chart")||document.querySelector("canvas"); if(!cv) return false;
    var rect=cv.getBoundingClientRect();
    var slotRaw=((clientX-rect.left-cfg.x0)/Math.max(cfg.x1-cfg.x0,1))*Math.max(win.totalSlots-1,1);
    var vi=Math.round(slotRaw-so);
    vi=Math.max(0,Math.min(view.length-1,vi));
    var ts=+view[vi].time;
    var lo=R.minIdx, hi=R.full.length-1;
    while(lo<hi){ var mid=(lo+hi)>>1; if((+R.full[mid].time)<ts) lo=mid+1; else hi=mid; }
    var best=lo;
    if(best>R.minIdx && Math.abs((+R.full[best-1].time)-ts)<=Math.abs((+R.full[best].time)-ts)) best--;
    best=clampCursor(best);
    if(best===R.cursor && R.selecting) return true;
    R.selecting=true; R.cursor=best;
    var last=R.full[R.cursor];
    if(last) window.DVLReplayClock.currentTs=+last.time+tfMs();
    try{ drawSoon(); }catch(_){ }
    notify();
    return true;
  }
  /* desenha a linha vertical de início + escurecido do futuro (chamado pela draw()) */
  window.DVLReplayLineDraw=function(ctx,o){
    if(!R.active||!R.selecting) { window.__DVL_REPLAY_LINE_X=null; return; }
    var view=o.view, x=o.x, win=o.win, slotOffset=o.slotOffset||0, x0=o.x0,x1=o.x1,y0=o.y0,y1=o.y1;
    if(!view||!view.length||typeof x!=='function') return;
    var gi0=(win&&isFinite(+win.start))?+win.start:0;
    var vi=R.cursor-gi0, lx;
    if(vi<=0) lx=x(slotOffset+0); else if(vi>=view.length-1) lx=x(slotOffset+view.length-1); else lx=x(slotOffset+vi);
    lx=Math.max(x0,Math.min(x1,lx));
    ctx.save();
    ctx.fillStyle="rgba(3,9,12,0.5)"; ctx.fillRect(lx, y0, Math.max(0,x1-lx), y1-y0);   // futuro escurecido
    ctx.strokeStyle="rgba(20,216,160,0.95)"; ctx.lineWidth=2; ctx.setLineDash([]);       // linha CHEIA
    ctx.beginPath(); ctx.moveTo(lx,y0); ctx.lineTo(lx,y1); ctx.stroke();
    var hw=13,hh=22; ctx.fillStyle="rgba(20,216,160,0.98)"; ctx.beginPath();             // alça (pega aqui pra arrastar)
    if(ctx.roundRect){ ctx.roundRect(lx-hw,y0,hw*2,hh,4); ctx.fill(); } else ctx.fillRect(lx-hw,y0,hw*2,hh);
    ctx.fillStyle="#03110c"; ctx.font="700 13px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("⇆",lx,y0+hh/2);
    ctx.restore();
    window.__DVL_REPLAY_LINE_X=lx;
  };
  function exit(){
    if(!R.active) return;
    pause(); R.editActive=false; R.active=false; window.__DVL_REPLAY_ACTIVE=false;
    window.DVLReplayClock.active=false; window.DVLReplayClock.paused=true;
    try{ window.DVLMarketBus.setSource('live'); }catch(_){}
    klines = R.full;                                   // restaura histórico completo
    try{ drawSoon(); }catch(_){}
    try{ if(typeof loadAll==='function') loadAll(true); }catch(_){}   // recarrega dados frescos + reassina feed
    try{ if(typeof _klWsConnect==='function') _klWsConnect(); if(typeof _agWsConnect==='function') _agWsConnect(); }catch(_){}
    notify();
  }
  window.DVLReplay = { start:start, step:step, play:play, pause:pause, setSpeed:setSpeed, seekFrac:seekFrac,
    restart:restart, exit:exit, status:status, setStartByClientX:setStartByClientX,
    beginStartEdit:beginStartEdit, confirmStartEdit:confirmStartEdit, cancelStartEdit:cancelStartEdit,
    onUpdate:function(fn){ listeners.push(fn); return function(){ var i=listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); }; } };
})();

function buildTickerFromRealKlines(){
  const lastK = klines.at(-1) || {};
  const firstK = klines[0] || lastK;
  const slice = klines.slice(-288);
  const hi = Math.max(...slice.map(c=>Number(c.high)).filter(Number.isFinite), Number(lastK.high || lastK.close || 0));
  const lo = Math.min(...slice.map(c=>Number(c.low)).filter(Number.isFinite), Number(lastK.low || lastK.close || 0));
  const first = Number(firstK.open || lastK.open || lastK.close || 0);
  const last = Number(lastK.close || 0);
  return {
    lastPrice:String(last || 0),
    priceChangePercent:String(first ? ((last-first)/first*100) : 0),
    highPrice:String(hi || last || 0),
    lowPrice:String(lo || last || 0),
    __dvlTickerFallbackFromRealKlines:true
  };
}

async function loadAll(silent=false){
  if(window.__DVL_REPLAY_ACTIVE) return;
  /* Stale-load guard: capture the symbol/interval this request is for.
     loadAll is async; if the user switches asset (or TF) while the fetch is
     in flight, a late-resolving request for the OLD symbol would otherwise
     call applyKlineRowsToChart() and replace the chart with the old asset's
     candles — then the live WS pushes the new asset's price on top, producing
     the giant bogus candle / broken scale. We re-check below before applying. */
  const _reqSym = symbol, _reqIv = interval;
  /* Loading overlay is purely a function of "is there anything to show". Once
     the chart has candles, NO refresh (background or otherwise) may show the
     "CARREGANDO BINANCE..." overlay or blank the chart — only a genuine empty
     state (first boot, or a user symbol change that cleared candles) shows it.
     This prevents the chart from flashing back to loading after it was ready. */
  if(!silent && !klines.length) els.loading.classList.remove("hidden");
  const period = intervalToPeriod(interval);
  try{
    const _pMs = periodToMs(period), _now = Date.now();
    const _bbP = periodToBybitPeriod(period);
    const _bbUrl = (n) => "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" + encodeURIComponent(symbol) + "&period=" + _bbP + "&limit=200" + (n>0?"&endTime="+(_now-n*200*_pMs):"");

    /* ── 1) CANDLES FIRST ── paint the chart the instant candles arrive. The
       OI/LSR/ticker side-calls (which can hang for seconds when an exchange is
       geo-banned) are fetched AFTER and never block this draw — that's what
       makes opening an asset / switching TF near-instant instead of a long
       "carregando" wait. */
    const k = await fetchKlinesSmart(symbol, interval, historyLimitForInterval(interval));
    if(window.__DVL_REPLAY_ACTIVE) return; // resposta iniciada antes do Replay não pode sobrescrever o histórico
    if(symbol !== _reqSym || interval !== _reqIv){ try{els.loading.classList.add("hidden");}catch(_){} return; }
    if(!Array.isArray(k) || !k.length){
      throw new Error("Sem candles para " + symbol + " " + interval);
    }
    try{
      window.__DVL_CANDLE_HISTORY_MARKET_1647 = String(k.__dvlMarket || "");
      window.__DVL_LIVE_BUCKET_1647 = 0;
      window.__DVL_CANDLE_STATE_KEY_1647 = String(symbol || "").toUpperCase() + "|" + String(interval || "");
    }catch(_){ }
    applyKlineRowsToChart(k);
    ticker = buildTickerFromRealKlines(); /* provisional price from candles; refined by the real ticker in stage 2 */
    assetTickerMap[symbol] = ticker;
    window.DVL_API_STATUS = {
      source:k.__dvlSource || "REAL_KLINES",
      endpoint:k.__dvlEndpoint || null,
      market:k.__dvlMarket || null,
      candles:true,
      ticker:false,
      tickerFallbackFromRealKlines:true,
      derivatives:false,
      fallback:false,
      fakeFallbackBlocked:true,
      symbol:symbol,
      interval:interval,
      rows:klines.length,
      lastError:null,
      updatedAt:Date.now()
    };
    renderCurrentFavoriteStar();
    updateHeader();
    els.loading.classList.add("hidden");
    drawSoon();
    if(typeof _klWsConnect==='function') _klWsConnect();
    if(typeof _nnWsConnect==='function') _nnWsConnect();
    if(typeof _agWsConnect==='function') _agWsConnect();
    try{if(window.DVL_PAPER_TRADING_V2_PRO&&typeof window.DVL_PAPER_TRADING_V2_PRO.render==='function')window.DVL_PAPER_TRADING_V2_PRO.render();}catch(_){}

    /* ── 2) SIDE DATA (real ticker + OI + LSR) ── best-effort, applied when it
       lands; every call is individually .catch()-guarded so a slow/failed
       source leaves the already-drawn chart untouched and only affects the
       OI/LSR panes. */
    const [t, oi0, oi1, oi2, ls0, ls1, ls2, bb0, bb1, bb2] = await Promise.all([
      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${symbol}`).catch(()=>null),
      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500`).catch(()=>[]),
      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),
      jget(`${DATA}/openInterestHist?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[]),
      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500`).catch(()=>[]),
      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-500*_pMs}`).catch(()=>[]),
      jget(`${DATA}/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=500&endTime=${_now-1000*_pMs}`).catch(()=>[]),
      jget(_bbUrl(0)).catch(()=>null),
      jget(_bbUrl(1)).catch(()=>null),
      jget(_bbUrl(2)).catch(()=>null)
    ]);
    /* Asset/TF changed while the side data was in flight → drop it so it can't
       overwrite the new asset's panes. */
    if(window.__DVL_REPLAY_ACTIVE) return; // side-data tardia também não toca o estado do Replay
    if(symbol !== _reqSym || interval !== _reqIv){ return; }
    if(t){
      ticker = t;
      assetTickerMap[symbol] = ticker;
      try{ window.DVL_API_STATUS.ticker = true; window.DVL_API_STATUS.tickerFallbackFromRealKlines = false; }catch(_){}
      renderCurrentFavoriteStar();
    }
    { const _s=new Set(); const _oi=[oi0,oi1,oi2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;}).map(x=>({time:+x.timestamp,value:+x.sumOpenInterestValue,qty:+x.sumOpenInterest})); if(_oi.length) oiHist=_oi; /* keep last OI if the fetch came back empty so the pane doesn't vanish */ }
    {
      const _s=new Set();
      const _bnLS=[ls0,ls1,ls2].filter(Array.isArray).flatMap(p=>p).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s.has(k))return false;_s.add(k);return true;});
      const _s2=new Set();
      const _bbList=[bb0,bb1,bb2].flatMap(r=>(Array.isArray(r?.result?.list)?r.result.list:[])).sort((a,b)=>+a.timestamp-+b.timestamp).filter(x=>{const k=x.timestamp;if(_s2.has(k))return false;_s2.add(k);return true;});
      const _bbMap=new Map(_bbList.map(x=>[+x.timestamp,x]));
      const _ls=_bnLS.map(x=>{
        const bb=_bbMap.get(+x.timestamp);
        if(!bb) return {time:+x.timestamp,ratio:+x.longShortRatio,long:+x.longAccount,short:+x.shortAccount};
        const lng=(+x.longAccount+(+bb.buyRatio))/2, sht=1-lng;
        return {time:+x.timestamp,ratio:lng/Math.max(sht,0.0001),long:lng,short:sht};
      });
      if(_ls.length) lsHist=_ls; /* keep last LSR if the fetch came back empty so the pane doesn't vanish */
    }
    derivativesDataReal = oiHist.length > 0;
    try{
      window.DVL_API_STATUS.derivatives = !!derivativesDataReal;
      window.DVL_API_STATUS.oiRows = Array.isArray(oiHist) ? oiHist.length : 0;
      window.DVL_API_STATUS.lsrRows = Array.isArray(lsHist) ? lsHist.length : 0;
    }catch(_){}
    updateHeader();
    if(candleMode === "footprint") fetchFootprintData();
    drawSoon();
  }catch(err){
    console.warn(err);

    let emergency = null;
    if(!klines.length){
      try{ emergency = await fetchEmergencyRealKlines(symbol, interval); }catch(_){}
      /* Same stale-load guard for the emergency fallback fetch. */
      if(symbol !== _reqSym || interval !== _reqIv) return;
      if(emergency && applyKlineRowsToChart(emergency.rows)){
        ticker = buildTickerFromRealKlines();
        assetTickerMap[symbol] = ticker;
        window.DVL_API_STATUS = Object.assign({}, window.DVL_API_STATUS || {}, {
          source:emergency.source,
          endpoint:emergency.endpoint || null,
          market:emergency.market || null,
          candles:true,
          ticker:false,
          tickerFallbackFromRealKlines:true,
          derivatives:false,
          fallback:false,
          fakeFallbackBlocked:true,
          emergencyReal:true,
          symbol:symbol,
          interval:interval,
          loadedInterval:emergency.interval,
          requestedInterval:emergency.requestedInterval,
          rows:klines.length,
          lastError:String(err && err.message || err),
          updatedAt:Date.now()
        });
        updateHeader();
        drawSoon();
        showToast("API principal falhou; mantive candles reais Binance em modo emergencial.");
      }
    }

    if(!klines.length){
      // DVL Beta 0.936 — hard block fake candles.
      // makeFallback() remains only as a dev/manual function, never automatic.
      window.DVL_API_STATUS = Object.assign({}, window.DVL_API_STATUS || {}, {
        source:"REAL_API_FAILED_NO_FAKE_FALLBACK",
        candles:false,
        fallback:false,
        fakeFallbackBlocked:true,
        genericBlocked:true,
        symbol:symbol,
        interval:interval,
        rows:0,
        lastError:String(err && err.message || err),
        updatedAt:Date.now()
      });
      ticker = null;
      oiHist = [];
      lsHist = [];
      derivativesDataReal = false;
      updateHeader();
      drawSoon();
      showToast("Sem API real. Fallback genérico BLOQUEADO.");
    }else if(!emergency){
      window.DVL_API_STATUS = Object.assign({}, window.DVL_API_STATUS || {}, {
        source:window.DVL_API_STATUS && window.DVL_API_STATUS.source || "BINANCE_PREVIOUS_REAL",
        candles:true,
        fallback:false,
        symbol:symbol,
        interval:interval,
        lastError:String(err && err.message || err),
        updatedAt:Date.now()
      });
      updateHeader();
      drawSoon();
      showToast("API parcial: mantive candles reais anteriores; indicadores podem estar vazios.");
    }

    els.loading.classList.add("hidden");
    try{if(window.DVL_PAPER_TRADING_V2_PRO&&typeof window.DVL_PAPER_TRADING_V2_PRO.render==='function')window.DVL_PAPER_TRADING_V2_PRO.render();}catch(_){}
  }
}
function makeFallback(){
  const now = Date.now(), step = 60_000;
  let price = 67872;
  klines = [];
  for(let i=0;i<180;i++){
    const drift = Math.sin(i/15)*35 + (i-80)*3 + (Math.random()-.5)*70;
    const open = price;
    const close = 66800 + drift + i*4;
    const high = Math.max(open,close) + Math.random()*90;
    const low = Math.min(open,close) - Math.random()*90;
    price = close;
    klines.push({ time: now-(180-i)*step, open, high, low, close, volume: 20+Math.random()*120, quoteVolume: 0 });
  }
  ticker = { lastPrice: price, priceChangePercent:"1.24", highPrice:"68432.10", lowPrice:"66955.33" };
  oiHist = [];
  lsHist = [];
  derivativesDataReal = false;
  window.DVL_API_STATUS = Object.assign({}, window.DVL_API_STATUS || {}, {
    source:"LOCAL_FALLBACK_MANUAL_ONLY",
    candles:false,
    ticker:false,
    derivatives:false,
    fallback:true,
    manualOnly:true,
    symbol:symbol,
    interval:interval,
    rows:klines.length,
    updatedAt:Date.now()
  });
}

function displaySymbol(sym){
  return String(sym || "").replace("USDT", "/USDT");
}

function saveFavoriteSymbols(){
  try{
    localStorage.setItem("DVL_FAVORITE_SYMBOLS", JSON.stringify(favoriteSymbols));
  }catch(e){}
}

function isFavoriteSymbol(sym){
  return favoriteSymbols.includes(sym);
}

function assetStarSvg(){
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3z"/></svg>`;
}

function assetIconText(sym){
  if(window.dvlAssetFirstLetter) return window.dvlAssetFirstLetter(sym);
  var s = String(sym || "").toUpperCase().replace(/[\/_-]/g,"").replace(/(USDT|BUSD|USDC|USD|BTC|ETH)$/i,"").replace(/^[0-9]+/,"");
  var m = s.match(/[A-Z]/);
  return m ? m[0] : "?";
}

function coinClass(sym){
  if(window.dvlAssetLetterClass) return window.dvlAssetLetterClass(sym);
  return symbolCoinClass[sym] || "dvlLetterGeneric";
}

function syncCurrentAssetLetterIcon(sym){
  var clean = String(sym || symbol || "BTCUSDT").toUpperCase().replace(/[\/_-]/g,"");
  var letter = assetIconText(clean);
  var cls = coinClass(clean);
  document.querySelectorAll("#symbolBtn .btc, .symbolBtn .btc, .marketRow .btc, #DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin").forEach(function(coin){
    /* Idempotent: skip if the icon already shows this symbol (prevents the
       header logo from flicking on every refresh when the asset didn't change). */
    if(coin.getAttribute("data-dvl-symbol")===clean && coin.classList.contains("dvlAssetLetterIcon")) return;
    coin.textContent = letter;
    coin.classList.remove("btcCoin","ethCoin","solCoin","bnbCoin","xrpCoin","adaCoin","dogeCoin","avaxCoin","linkCoin","ltcCoin","genericCoin","coin-btc","coin-eth","coin-sol","coin-bnb","coin-xrp","coin-ada","coin-doge","coin-avax","coin-link","coin-ltc","coin-generic");
    /* Strip any previous dvlLetterXXX colour class (e.g. the static dvlLetterBTC
       default) so the icon gets the new asset's colour, not a stale one. */
    Array.prototype.slice.call(coin.classList).forEach(function(cn){ if(cn.indexOf("dvlLetter")===0) coin.classList.remove(cn); });
    coin.classList.add(cls,"dvlAssetLetterIcon");
    coin.setAttribute("data-dvl-symbol", clean);
  });
}

function renderCurrentFavoriteStar(){
  if(!els.currentFavoriteBtn) return;
  const fav = isFavoriteSymbol(symbol);
  els.currentFavoriteBtn.classList.toggle("is-favorite", fav);
  els.currentFavoriteBtn.setAttribute("aria-pressed", fav ? "true" : "false");
  els.currentFavoriteBtn.setAttribute("title", fav ? "Remover dos favoritos" : "Adicionar aos favoritos");
}

function assetRowMarkup(sym, mode="dropdown"){
  const fav = isFavoriteSymbol(sym);
  const active = sym === symbol;
  const t = assetTickerFor(sym);
  const ch = Number(t?.priceChangePercent);
  const changeClass = Number.isFinite(ch) && ch < 0 ? "is-down" : "is-up";

  return `
    <div class="assetOption ${active ? "is-active" : ""}" data-symbol="${sym}">
      <button class="assetPick" type="button" data-pick-symbol="${sym}">
        <span class="assetCoin dvlAssetLetterIcon ${coinClass(sym)}" data-dvl-symbol="${sym}">${assetIconText(sym)}</span>
        <span class="assetLabel">
          <b>${displaySymbol(sym)}</b>
          <small>${symbolNames[sym] || sym}</small>
        </span>
      </button>
      <span class="assetMiniMarket">
        <b>${fmtMiniPrice(t?.lastPrice)}</b>
        <small class="${changeClass}">${fmtMiniPct(t?.priceChangePercent)}</small>
      </span>
      <button class="assetStar ${fav ? "is-favorite" : ""}" type="button" data-star-symbol="${sym}" aria-label="${fav ? "Remover favorito" : "Adicionar favorito"} ${displaySymbol(sym)}">
        ${assetStarSvg()}
      </button>
    </div>`;
}

function renderAssetDropdown(){
  if(!els.assetDropdown) return;
  els.assetDropdown.innerHTML = `
    <div class="assetDropdownHead">
      <b>Assets</b>
      <small>Escolha o ativo</small>
    </div>
    <div class="assetDropdownSearch" style="padding:8px 12px 4px">
      <input id="assetSearchInput" type="search" placeholder="Buscar ativo..." autocomplete="off" spellcheck="false" aria-label="Buscar ativo"
        style="width:100%;box-sizing:border-box;padding:10px 12px;margin:0;background:rgba(255,255,255,.05);border:1px solid rgba(16,223,119,.22);border-radius:10px;color:#e8f2ee;font-size:14px;outline:none">
    </div>
    <div class="assetDropdownList">
      ${symbols.map(sym => assetRowMarkup(sym, "dropdown")).join("")}
      <div class="assetDropdownEmpty" style="display:none;padding:18px 12px;text-align:center;color:#75827d;font-size:13px">Nenhum ativo encontrado.</div>
    </div>
  `;

  els.assetDropdown.querySelectorAll("[data-pick-symbol]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.stopPropagation();
      selectSymbol(btn.dataset.pickSymbol);
      closeAssetDropdown();
    });
  });

  /* Barra de pesquisa: filtra a lista por símbolo ou nome. IMPORTANTE: o
     dropdown é RE-RENDERIZADO ao vivo (preços atualizam), e cada re-render
     recria a lista e apagava o filtro — por isso "não pesquisava". O texto fica
     num GLOBAL (window.__dvlAssetSearchQ) e o filtro é RE-APLICADO no fim de
     todo render, então ele sobrevive às atualizações de preço. */
  const assetSearch = els.assetDropdown.querySelector("#assetSearchInput");
  if(assetSearch){
    const emptyEl = els.assetDropdown.querySelector(".assetDropdownEmpty");
    const applyAssetFilter = () => {
      const q = String(window.__dvlAssetSearchQ || "").trim().toUpperCase().replace(/\s+/g, "");
      const opts = els.assetDropdown.querySelectorAll(".assetOption[data-symbol]");
      let shown = 0;
      opts.forEach(el => {
        const s = el.getAttribute("data-symbol") || "";
        const sym = String(s).toUpperCase();
        const name = String(symbolNames[s] || "").toUpperCase().replace(/\s+/g, "");
        const match = !q || sym.indexOf(q) >= 0 || name.indexOf(q) >= 0;
        /* IMPORTANTE: a regra CSS `.assetOption{display:grid!important}` vence um
           `style.display="none"` normal — por isso a lista NÃO filtrava mesmo o
           código rodando. Escondemos com prioridade !important e, pra mostrar,
           REMOVEMOS o inline pra voltar ao grid do CSS. */
        if(match) el.style.removeProperty("display");
        else el.style.setProperty("display", "none", "important");
        if(match) shown++;
      });
      if(emptyEl) emptyEl.style.setProperty("display", shown ? "none" : "block", "important");
    };
    /* Restaura o texto e o filtro depois deste (re)render. */
    if(window.__dvlAssetSearchQ) assetSearch.value = window.__dvlAssetSearchQ;
    applyAssetFilter();
    assetSearch.addEventListener("input", () => {
      window.__dvlAssetSearchQ = assetSearch.value;
      applyAssetFilter();
    });
    /* Não deixa cliques/toques na busca fecharem o dropdown. */
    /* DVL_ASSET_DROPDOWN_LISTENER_FIX */
    ["click","pointerdown","mousedown"].forEach(evt =>
      assetSearch.addEventListener(evt, ev => ev.stopPropagation()));
    assetSearch.addEventListener("touchstart", ev => ev.stopPropagation(), {passive:true});
  }

  els.assetDropdown.querySelectorAll("[data-star-symbol]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.stopPropagation();
      toggleFavoriteSymbol(btn.dataset.starSymbol);
    });
  });
}

function renderFavoriteAssetsPanel(){
  if(!els.assetFavoritesList) return;
  const list = favoriteSymbols.filter(sym => symbols.includes(sym));

  if(!list.length){
    els.assetFavoritesList.innerHTML = `
      <div class="emptyFavorites">
        <b>Nenhum favorito ainda</b>
        <small>Use a estrela no seletor de ativos para adicionar.</small>
      </div>`;
    return;
  }

  els.assetFavoritesList.innerHTML = list.map(sym => assetRowMarkup(sym, "footer")).join("");

  els.assetFavoritesList.querySelectorAll("[data-pick-symbol]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.stopPropagation();
      selectSymbol(btn.dataset.pickSymbol);
      closeAssetFavorites();
    });
  });

  els.assetFavoritesList.querySelectorAll("[data-star-symbol]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.stopPropagation();
      toggleFavoriteSymbol(btn.dataset.starSymbol);
    });
  });
}

function refreshAssetUi(){
  renderCurrentFavoriteStar();

  if(assetDropdownOpen && els.assetDropdown && els.assetDropdown.classList.contains("is-open")){
    updateOpenAssetDropdownInPlace();
  }else if(!els.assetDropdown.firstElementChild){
    /* Closed dropdown is static. Opening it performs a fresh render. */
    renderAssetDropdown();
  }

  renderFavoriteAssetsPanel();
  if(els.symbolBtn) els.symbolBtn.classList.toggle("is-open", assetDropdownOpen);
  if(els.assetsNavBtn) els.assetsNavBtn.classList.toggle("active", assetFavoritesOpen);
}

function openAssetDropdown(){
  assetDropdownOpen = true;
  if(Date.now() - __dvlAssetTickerFreshAt1206 > 30000) refreshAssetTickers(true);
  window.__dvlAssetSearchQ = "";   // abre sempre com a lista completa
  if(els.assetDropdown){
    renderAssetDropdown();
    els.assetDropdown.classList.add("is-open");
    els.assetDropdown.setAttribute("aria-hidden", "false");
  }
  if(els.symbolBtn) els.symbolBtn.classList.add("is-open");
}

function closeAssetDropdown(){
  assetDropdownOpen = false;
  if(els.assetDropdown){
    els.assetDropdown.classList.remove("is-open");
    els.assetDropdown.setAttribute("aria-hidden", "true");
  }
  if(els.symbolBtn) els.symbolBtn.classList.remove("is-open");
}

function toggleAssetDropdown(){
  if(assetDropdownOpen) closeAssetDropdown();
  else openAssetDropdown();
}

function openAssetFavorites(){
  assetFavoritesOpen = true;
  if(Date.now() - __dvlAssetTickerFreshAt1206 > 30000) refreshAssetTickers(true);
  renderFavoriteAssetsPanel();
  if(els.assetFavoritesDrawer){
    els.assetFavoritesDrawer.classList.add("is-open");
    els.assetFavoritesDrawer.setAttribute("aria-hidden", "false");
  }
  if(els.assetsNavBtn) els.assetsNavBtn.classList.add("active");
  try{ window.dispatchEvent(new CustomEvent("dvl:watchlist-state-change",{detail:{open:true,source:"openAssetFavorites"}})); }catch(_){}
}

function closeAssetFavorites(){
  assetFavoritesOpen = false;
  if(els.assetFavoritesDrawer){
    els.assetFavoritesDrawer.classList.remove("is-open");
    els.assetFavoritesDrawer.setAttribute("aria-hidden", "true");
  }
  if(els.assetsNavBtn) els.assetsNavBtn.classList.remove("active");
  try{ window.dispatchEvent(new CustomEvent("dvl:watchlist-state-change",{detail:{open:false,source:"closeAssetFavorites"}})); }catch(_){}
}

function toggleAssetFavorites(){
  if(assetFavoritesOpen) closeAssetFavorites();
  else openAssetFavorites();
}

function toggleFavoriteSymbol(sym){
  if(!symbols.includes(sym)) return;
  if(isFavoriteSymbol(sym)){
    favoriteSymbols = favoriteSymbols.filter(s => s !== sym);
  }else{
    favoriteSymbols = [...favoriteSymbols, sym];
  }
  saveFavoriteSymbols();
  refreshAssetUi();
}

function selectSymbol(sym){
  if(!symbols.includes(sym)) return;
  if(sym === symbol){
    updateHeader();
    return;
  }

  symbol = sym;
  symbolIndex = symbols.indexOf(sym);
  demoPos = null;
  chartOffsetCandles = -24;
  priceViewCenter = null;
  priceViewRange = null;
  priceScaleLocked = false;
  crosshair.visible = false;
  klines = [];
  oiHist = [];
  lsHist = [];
  ticker = null;

  updateHeader();
  saveAppSettings();
  loadAll();
}


function updateHeader(){
  els.symbolText.textContent = symbol.replace("USDT","/USDT");
  try{var _d1bST=document.getElementById("dvl1b_symbolText");if(_d1bST)_d1bST.textContent=symbol.replace("USDT","/USDT");}catch(_){}
  syncCurrentAssetLetterIcon(symbol);
  refreshAssetUi();
  const last = ticker ? +ticker.lastPrice : klines.at(-1)?.close;
  marketEntryPrice = Number(last) || marketEntryPrice;
  els.lastPrice.textContent = fmtPrice(last);
  const ch = ticker ? +ticker.priceChangePercent : 0;
  els.changePct.textContent = pct(ch);
  els.changePct.style.color = ch >= 0 ? "var(--green)" : "var(--red)";
  els.high24.textContent = fmtPrice(ticker?.highPrice);
  els.low24.textContent = fmtPrice(ticker?.lowPrice);
  els.buyPriceBtn.textContent = orderType;
  els.sellPriceBtn.textContent = orderType;
  syncTradePanel();
}
function setIntervalUi(iv, skipLoad){
  interval = iv;
  chartOffsetCandles = -24;
  priceViewCenter = null;
  priceViewRange = null;
  priceScaleLocked = false;
  renderTimeframeHotbar();
  renderTimeframeMoreMenu();
  scrollActiveTfIntoView();
  closeTfMore();
  /* skipLoad: caller is about to switch symbol right after (e.g. Scanner's
     analyze()) and will trigger its own loadAll() — firing one here too
     would just fetch the OLD symbol's data at the new TF and throw it away. */
  if(!skipLoad) loadAll();
}
function timeframeSortValue(tf){
  const m = String(tf || "").trim().toLowerCase().match(/^(\d+)(s|m|h|d|w)$/);
  if(!m) return Number.MAX_SAFE_INTEGER;
  const n = Math.max(1, Number(m[1]) || 1);
  const unit = m[2];
  if(unit === "s") return n / 60;
  if(unit === "m") return n;
  if(unit === "h") return n * 60;
  if(unit === "d") return n * 1440;
  if(unit === "w") return n * 10080;
  return Number.MAX_SAFE_INTEGER;
}

function sortTimeframesAscending(list){
  return Array.from(new Set((Array.isArray(list) ? list : []).filter(Boolean)))
    .sort((a,b) => timeframeSortValue(a) - timeframeSortValue(b) || String(a).localeCompare(String(b)));
}

function saveFavoriteTimeframes(){
  favoriteTimeframes = sortTimeframesAscending(favoriteTimeframes);
  try{
    localStorage.setItem("DVL_FAVORITE_TIMEFRAMES", JSON.stringify(favoriteTimeframes));
  }catch(e){}
}

function isFavoriteTimeframe(tf){
  return favoriteTimeframes.includes(tf);
}

function normalizeTimeframeInput(value){
  const raw = String(value || "").trim().toLowerCase();
  if(!raw) return "";

  // Accept PT/EN friendly inputs:
  // 5m, 5 min, 5 minutes, 5 minutos, 1h, 1 hour, 1 hora, 3d, 3 days, 1w, 1 week
  const normalized = raw
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .replace(/minutes?|mins?|minutos?|mins?/g, "m")
    .replace(/hours?|horas?/g, "h")
    .replace(/days?|dias?/g, "d")
    .replace(/weeks?|semanas?/g, "w")
    .replace(/\s/g, "");

  const m = normalized.match(/^(\d+)(m|h|d|w)$/);
  if(!m) return "";

  const valueNum = Number(m[1]);
  const unit = m[2];

  if(!Number.isFinite(valueNum) || valueNum <= 0) return "";
  return `${valueNum}${unit}`;
}

function supportedTimeframeHint(){
  return "Type any TF like 2m, 7m, 45 min, 90 minutes, 3h, 2 days, 1 week. PT/EN accepted.";
}

function renderTimeframeHotbar(){
  if(!els.tfMainRow) return;

  favoriteTimeframes = typeof sortTimeframesAscending === "function" ? sortTimeframesAscending(favoriteTimeframes) : favoriteTimeframes;
  const favorites = favoriteTimeframes.filter(tf => availableTimeframes.includes(tf));
  els.tfMainRow.innerHTML = favorites.map(tf => `
    <button class="tfBtn ${tf === interval ? "active" : ""}" type="button" data-interval="${tf}">
      ${tf.replace("h","H").replace("d","D").replace("w","W")}
    </button>
  `).join("");

  els.tfMainRow.querySelectorAll(".tfBtn[data-interval]").forEach(btn => {
    btn.addEventListener("click", () => setIntervalUi(btn.dataset.interval));
  });
}

function renderTimeframeMoreMenu(){
  if(!els.tfMoreList) return;

  const orderedTimeframes = typeof sortTimeframesAscending === "function" ? sortTimeframesAscending(availableTimeframes) : availableTimeframes;
  els.tfMoreList.innerHTML = orderedTimeframes.map(tf => {
    const fav = isFavoriteTimeframe(tf);
    const active = tf === interval;
    return `
      <button class="tfMenuItem ${active ? "is-active" : ""} ${fav ? "is-favorite" : ""}" type="button" data-menu-tf="${tf}">
        <span>${tf.replace("h","H").replace("d","D").replace("w","W")}</span>
        <b>${fav ? "★" : "☆"}</b>
      </button>
    `;
  }).join("");

  els.tfMoreList.querySelectorAll("[data-menu-tf]").forEach(btn => {
    let longTimer = null;
    let longPressed = false;
    const tf = btn.dataset.menuTf;

    const toggleFav = () => {
      longPressed = true;
      toggleFavoriteTimeframe(tf);
    };

    btn.addEventListener("pointerdown", () => {
      longPressed = false;
      clearTimeout(longTimer);
      longTimer = setTimeout(toggleFav, 520);
    });

    ["pointerup","pointercancel","pointerleave"].forEach(evt => {
      btn.addEventListener(evt, () => clearTimeout(longTimer));
    });

    btn.addEventListener("click", (ev) => {
      if(longPressed){
        ev.preventDefault();
        return;
      }
      setIntervalUi(tf);
      closeTfMore();
    });
  });
}

function toggleFavoriteTimeframe(tf){
  if(!availableTimeframes.includes(tf)) return;

  if(isFavoriteTimeframe(tf)){
    favoriteTimeframes = favoriteTimeframes.filter(x => x !== tf);
    if(!favoriteTimeframes.length) favoriteTimeframes = ["1m"];
  }else{
    favoriteTimeframes = [...favoriteTimeframes, tf];
  }

  favoriteTimeframes = typeof sortTimeframesAscending === "function" ? sortTimeframesAscending(favoriteTimeframes) : favoriteTimeframes;
  saveFavoriteTimeframes();
  renderTimeframeHotbar();
  renderTimeframeMoreMenu();
}

function openTfMore(){
  tfMoreOpen = true;
  if(els.tfMoreWrap) els.tfMoreWrap.classList.add("is-open");
  if(els.tfMoreMenu) els.tfMoreMenu.setAttribute("aria-hidden", "false");
  renderTimeframeMoreMenu();
}

function closeTfMore(){
  tfMoreOpen = false;
  if(els.tfMoreWrap) els.tfMoreWrap.classList.remove("is-open");
  if(els.tfMoreMenu) els.tfMoreMenu.setAttribute("aria-hidden", "true");
}

function toggleTfMore(){
  tfMoreOpen ? closeTfMore() : openTfMore();
}

function scrollActiveTfIntoView(){
  const active = document.querySelector(".tfMainRow .tfBtn[data-interval].active");
  if(active && els.tfMainRow){
    active.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" });
  }
}

function updateIndicatorDropdownState(){
  if(els.toggleIndicators){
    els.toggleIndicators.classList.toggle("active", indicatorsOn);
    els.toggleIndicators.setAttribute("aria-expanded", indicatorsDropdownOpen ? "true" : "false");
  }

  document.querySelectorAll(".indicatorState").forEach(el => {
    el.textContent = indicatorsOn ? "ON" : "OFF";
    el.classList.toggle("is-on", indicatorsOn);
  });
}

function openIndicatorsDropdown(){
  indicatorsDropdownOpen = true;
  if(els.fxIndicatorWrap) els.fxIndicatorWrap.classList.add("is-open");
  if(els.indicatorDropdown) els.indicatorDropdown.setAttribute("aria-hidden", "false");
  updateIndicatorDropdownState();
}

function closeIndicatorsDropdown(){
  indicatorsDropdownOpen = false;
  if(els.fxIndicatorWrap) els.fxIndicatorWrap.classList.remove("is-open");
  if(els.indicatorDropdown) els.indicatorDropdown.setAttribute("aria-hidden", "true");
  updateIndicatorDropdownState();
}

function toggleIndicatorsDropdown(){
  indicatorsDropdownOpen ? closeIndicatorsDropdown() : openIndicatorsDropdown();
}

function toggleCoreIndicators(){
  indicatorsOn = !indicatorsOn;
  updateIndicatorDropdownState();
  drawSoon();
}

renderTimeframeHotbar();
renderTimeframeMoreMenu();

if(els.tfMoreBtn){
  els.tfMoreBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleTfMore();
  });
}

if(els.tfCustomAdd){
  els.tfCustomAdd.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const tf = normalizeTimeframeInput(els.tfCustomInput?.value);
    if(!tf){
      showToast(supportedTimeframeHint());
      return;
    }

    if(!availableTimeframes.includes(tf)){
      availableTimeframes = [...availableTimeframes, tf];
      customTimeframes = Array.from(new Set([...customTimeframes, tf]));
      try{ localStorage.setItem("DVL_CUSTOM_TIMEFRAMES", JSON.stringify(customTimeframes)); }catch(e){}
    }

    if(!isFavoriteTimeframe(tf)) toggleFavoriteTimeframe(tf);
    setIntervalUi(tf);
    if(els.tfCustomInput) els.tfCustomInput.value = "";
    closeTfMore();
  });
}

if(els.tfCustomInput){
  els.tfCustomInput.addEventListener("click", ev => ev.stopPropagation());
  els.tfCustomInput.addEventListener("keydown", ev => {
    if(ev.key === "Enter" && els.tfCustomAdd) els.tfCustomAdd.click();
  });
}

els.toggleIndicators.addEventListener("click", (ev) => {
  ev.stopPropagation();
  toggleIndicatorsDropdown();
});

// FX dropdown now only lists future modules as Soon.
updateIndicatorDropdownState();
els.symbolBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  if(ev.target && ev.target.closest && ev.target.closest("#currentFavoriteBtn")){
    toggleFavoriteSymbol(symbol);
    return;
  }
  toggleAssetDropdown();
});

if(els.currentFavoriteBtn){
  els.currentFavoriteBtn.addEventListener("keydown", (ev) => {
    if(ev.key === "Enter" || ev.key === " "){
      ev.preventDefault();
      ev.stopPropagation();
      toggleFavoriteSymbol(symbol);
    }
  });
}

if(els.assetsNavBtn){
  els.assetsNavBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeAssetDropdown();
    toggleAssetFavorites();
  });
}

if(els.assetFavoritesClose){
  els.assetFavoritesClose.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeAssetFavorites();
  });
}

document.addEventListener("click", (ev) => {
  if(els.assetDropdown && assetDropdownOpen && !els.assetDropdown.contains(ev.target) && !els.symbolBtn.contains(ev.target)){
    closeAssetDropdown();
  }

  if(els.assetFavoritesDrawer && assetFavoritesOpen && !els.assetFavoritesDrawer.contains(ev.target) && els.assetsNavBtn && !els.assetsNavBtn.contains(ev.target)){
    closeAssetFavorites();
  }

  if(tfMoreOpen && els.tfMoreWrap && !els.tfMoreWrap.contains(ev.target)){
    closeTfMore();
  }

  if(indicatorsDropdownOpen && els.fxIndicatorWrap && !els.fxIndicatorWrap.contains(ev.target)){
    closeIndicatorsDropdown();
  }
});

refreshAssetUi();

function resizeCanvas(){
  const c = els.canvas;
  const rect = c.getBoundingClientRect();
  /* Beta 1.554 — dynamic interaction resolution. A retina canvas at DPR 2.5
     rasterizes 6.25x more pixels. While the finger/mouse is actively panning or
     zooming, cap DPR at 1.35; when the gesture ends, 1.188 already requests a
     final repaint and the chart returns to full sharpness automatically. */
  const __dvlDeviceDpr = window.devicePixelRatio || 1;
  /* Beta 1.554 — interaction quality tier. While pan/zoom is active the frame
     is in motion, so Retina sharpness is visually wasted but multiplies raster
     work. Desktop uses DPR 1.0 and touch 1.15 only during the gesture; the
     existing final repaint restores full DPR immediately on release. */
  const __dvlDesktopFast = !!(window.matchMedia && window.matchMedia("(min-width:1100px)").matches);
  /* Beta 1.634 — o GLOW dos indicadores não some mais ao mover o gráfico + DPR
     de interação adaptativo. Antes, durante o arrasto o glow era desligado e o
     DPR caía — os indicadores (e o RSI/label) ficavam "apagados"/chapados até
     soltar. Agora:
       • GLOW: fica ACESO durante o pan por padrão. É seguro em qualquer aparelho
         que já roda liso PARADO, porque o glow no pan sai no DPR (possivelmente)
         reduzido — ou seja, custa SEMPRE ≤ o estado ocioso (DPR cheio + glow) que
         o aparelho já aguenta. Só desliga no modo 'off' (máxima performance).
       • DPR: adaptativo pela medição real do custo em DPR cheio
         (window.__dvlFullDprEquivMs, amostrado nos frames ociosos, que já incluem
         o glow). Cabe no orçamento (~11ms) → nitidez cheia no pan; senão →
         downscale de antes (sem regredir fluidez).
     Override: DVL_SHARP_PAN('on' nítido+glow | 'off' downscale+sem glow | 'auto'). */
  const __dvlFullCap = Math.min(__dvlDeviceDpr, 2.5);
  var __dvlSharpMode = "auto"; try{ __dvlSharpMode = localStorage.getItem("dvl_sharp_pan") || "auto"; }catch(_){}
  var __dvlSharpInteract;
  if(__dvlSharpMode === "on") __dvlSharpInteract = true;
  else if(__dvlSharpMode === "off") __dvlSharpInteract = false;
  else if(window.__dvlChartInteracting){
    /* Durante o gesto usa o valor TRAVADO (decidido enquanto parado). Recalcular
       a cada frame fazia a decisão oscilar perto do orçamento → o DPR mudava →
       c.width mudava → o canvas redimensionava/limpava todo frame = FLICKER
       (o candle atual "não parava quieto"). Travado = DPR constante no gesto. */
    __dvlSharpInteract = !!window.__dvlPanSharpLatch;
  } else {
    __dvlSharpInteract = (typeof window.__dvlFullDprEquivMs === "number" && window.__dvlFullDprEquivMs > 0 && window.__dvlFullDprEquivMs <= 11);
    window.__dvlPanSharpLatch = __dvlSharpInteract; // trava pro próximo gesto
  }
  window.__dvlSharpInteract = __dvlSharpInteract;
  // Glow desacoplado do DPR: fica aceso no pan exceto no modo 'off' (máx. perf).
  window.__dvlKeepGlowOnPan = (__dvlSharpMode !== "off");
  window.__dvlFullDprCap = __dvlFullCap;
  const __dvlInteractCap = __dvlSharpInteract ? __dvlFullCap : (__dvlDesktopFast ? 1.0 : 1.15);
  const __dvlDprCap = window.__dvlChartInteracting ? __dvlInteractCap : 2.5;
  const dpr = Math.max(1, Math.min(__dvlDeviceDpr, __dvlDprCap));
  window.__dvlLastRenderDpr = dpr;
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if(c.width !== w || c.height !== h){
    c.width = w; c.height = h;
  }
  const ctx = c.getContext("2d");
  if(ctx && !ctx.__dvlGlowHooked){
    /* Beta 1.554 — shadowBlur (glow) é o op MAIS caro do canvas: recalcula uma
       sombra borrada do caminho inteiro a cada stroke/fill. Interceptamos o
       shadowBlur DESTE ctx uma única vez: a leitura devolve o valor lógico (o
       código que lê de volta continua vendo o que setou), mas o valor EFETIVO
       aplicado vira 0 enquanto window.__dvlChartInteracting for true (arraste/
       zoom/pinça). Assim o glow fica 100% intacto PARADO e some só durante a
       interação — quando ninguém está admirando o brilho — e o redesenho por
       frame despenca. Com a flag false, comportamento idêntico ao de antes. */
    try{
      var _sbDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), "shadowBlur");
      if(_sbDesc && typeof _sbDesc.set === "function"){
        var _sbVal = 0;
        Object.defineProperty(ctx, "shadowBlur", {
          configurable:true,
          get:function(){ return _sbVal; },
          set:function(v){ _sbVal = v; _sbDesc.set.call(ctx, ((window.__dvlChartInteracting && !window.__dvlKeepGlowOnPan) || window.__dvlGlowForceOff) ? 0 : v); }
        });
      }
    }catch(_){}
    ctx.__dvlGlowHooked = true;
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx, w:rect.width, h:rect.height, dpr};
}
function drawSoon(){
  /* Beta 1.554 — keep exactly one pending paint. High polling-rate mice can
     dispatch pointermove faster than the display refresh; cancelling and
     rescheduling every event starved the canvas and made drag/crosshair lag.
     Beta 1.554 — scheduler ÚNICO: um só requestAnimationFrame por frame, com
     medição do custo real do render (instrumentação + gap adaptativo). */
  if(resizeRAF) return;
  resizeRAF = requestAnimationFrame(function(){
    resizeRAF = 0;
    var __t0 = (typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
    draw();
    var __t1 = (typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
    try{ __dvlPerfOnFrame(__t1-__t0, __t1); }catch(_){}
  });
}

/* ── Beta 1.554 — Ultra Low Latency: instrumentação + gap adaptativo ──────────
   Mede o custo real de cada render e ajusta sozinho o intervalo mínimo entre
   frames ao vivo: render rápido → até ~60fps; render pesado → recua pra não
   congelar. Métricas em window.DVL_PERF; HUD opcional (DVL_PERF_HUD(true) ou
   ?perf=1). Não altera nenhum indicador — só a cadência/priorização do desenho. */
window.DVL_PERF = { fps:0, frameMs:0, renderMs:0, tickMs:0, wsMs:0, gap:33 };
let __dvlRenderMsAvg = 8, __dvlPerfLastFrame = 0, __dvlPerfFrames = 0, __dvlPerfAcc = 0, __dvlPerfFpsAt = 0, __dvlPerfHudEl = null;
function __dvlPerfHudOn(){ try{ if(/[?&]perf=1/.test(location.search)) return true; return localStorage.getItem("dvl_perf_hud")==="1"; }catch(_){ return false; } }
window.DVL_PERF_HUD = function(on){ try{ localStorage.setItem("dvl_perf_hud", on?"1":"0"); }catch(_){} if(!on && __dvlPerfHudEl){ try{__dvlPerfHudEl.remove();}catch(_){} __dvlPerfHudEl=null; } };
/* Beta 1.634 — controle do pan. 'auto' (padrão): glow ACESO no pan + DPR decidido
   pelo custo medido. 'on': nitidez cheia + glow sempre. 'off': downscale + glow
   desligado (máxima performance, comportamento antigo). */
window.DVL_SHARP_PAN = function(v){
  var mode = (v===true||v==="on") ? "on" : (v===false||v==="off") ? "off" : "auto";
  try{ localStorage.setItem("dvl_sharp_pan", mode); }catch(_){}
  try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
  return "DVL pan: " + mode + " (auto=glow aceso + DPR pelo custo; off=máx. perf)";
};
function __dvlPerfOnFrame(renderMs, now){
  __dvlRenderMsAvg = __dvlRenderMsAvg*0.82 + renderMs*0.18;
  /* Beta 1.634 — amostra o custo de render em DPR CHEIO (frame que rodou na
     qualidade máxima, com glow — tipicamente os ociosos). Alimenta a decisão de
     nitidez-durante-o-pan em resizeCanvas. Só amostra quando o frame foi cheio,
     pra não contaminar a média com os frames de downscale. */
  try{
    var _ud = window.__dvlLastRenderDpr || 0, _fc = window.__dvlFullDprCap || 2.5;
    if(_ud >= _fc - 0.01 && !window.__dvlChartInteracting){ // só frames OCIOSOS em DPR cheio
      var _p = window.__dvlFullDprEquivMs;
      window.__dvlFullDprEquivMs = (typeof _p === "number" && _p > 0) ? (_p*0.8 + renderMs*0.2) : renderMs;
    }
  }catch(_){}
  __DVL_LIVE_RENDER_GAP_1204 = Math.max(16, Math.min(60, Math.round(__dvlRenderMsAvg*1.15)));  // adaptativo
  if(__dvlPerfLastFrame){ __dvlPerfAcc += (now - __dvlPerfLastFrame); __dvlPerfFrames++; }
  __dvlPerfLastFrame = now;
  if(now - __dvlPerfFpsAt > 500){
    if(__dvlPerfFrames>0){ var ft=__dvlPerfAcc/__dvlPerfFrames; window.DVL_PERF.fps=Math.round(1000/Math.max(1,ft)); window.DVL_PERF.frameMs=Math.round(ft*10)/10; }
    window.DVL_PERF.renderMs = Math.round(__dvlRenderMsAvg*10)/10;
    window.DVL_PERF.gap = __DVL_LIVE_RENDER_GAP_1204;
    __dvlPerfAcc=0; __dvlPerfFrames=0; __dvlPerfFpsAt=now;
    if(__dvlPerfHudOn()) __dvlPerfHudRender(); else if(__dvlPerfHudEl){ try{__dvlPerfHudEl.remove();}catch(_){} __dvlPerfHudEl=null; }
  }
}
function __dvlPerfHudRender(){
  try{
    if(!__dvlPerfHudEl){
      __dvlPerfHudEl=document.createElement("div");
      __dvlPerfHudEl.id="dvlPerfHud";
      __dvlPerfHudEl.style.cssText="position:fixed;left:6px;bottom:6px;z-index:100700;padding:5px 8px;border-radius:7px;background:rgba(3,15,10,.82);border:1px solid rgba(19,220,141,.3);color:#8ff0c4;font:700 9px/1.5 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre";
      document.body.appendChild(__dvlPerfHudEl);
    }
    var P=window.DVL_PERF;
    __dvlPerfHudEl.textContent = "FPS "+P.fps+"   frame "+P.frameMs+"ms\nrender "+P.renderMs+"ms   gap "+P.gap+"ms\ntick "+P.tickMs+"ms   ws "+P.wsMs+"ms";
  }catch(_){}
}
window.DVL_RENDER_SCHEDULER = { request:function(){ try{ if(typeof requestLiveChartRender==="function") requestLiveChartRender(false); else drawSoon(); }catch(_){ try{drawSoon();}catch(__){} } }, drawNow:drawSoon, metrics:function(){ return window.DVL_PERF; } };

function __dvlOscillatorName(osc){
  try{
    if(osc === window.DVLOpenInterestOscillator) return "Open Interest";
    if(osc === window.DVLLongShortOscillator) return "Long/Short";
    if(osc === window.DVLNetLongOscillator) return "Net Long";
    if(osc === window.DVLNetShortOscillator) return "Net Short";
    if(osc === window.DVLNetDeltaOscillator) return "Net Delta";
    if(osc === window.DVLDeltaVolume) return "Delta Volume";
    if(osc === window.DVLTickVolume) return "Tick Volume";
    if(osc === window.DVLArionZoneProfile) return "ARION Zone Profile";
    if(osc === window.DVLExhaustionRSI) return "RSI Exhaustion Pro";
    if(osc === window.DVLTestOscillator) return "Teste";
    if(osc === window.DVLTestOscillator2) return "Teste 2";
  }catch(_){}
  return "Oscillator";
}

function __dvlDrawOscillatorGuardPanel(ctx, padL, padR, top, h, w, name, err){
  const x0 = padL || 0;
  const x1 = w - (padR || 55);
  const y0 = top;
  const y1 = top + h;

  ctx.save();
  ctx.fillStyle = "#020806";
  ctx.fillRect(0, y0, w, h);

  ctx.strokeStyle = "rgba(150,180,168,.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y0 + .5);
  ctx.lineTo(w, y0 + .5);
  ctx.stroke();

  ctx.strokeStyle = "rgba(122,155,145,.092)";
  ctx.lineWidth = .85;
  for(let i=1;i<=3;i++){
    const yy = y0 + h * i / 4;
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.lineTo(x1, yy);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,211,33,.82)";
  ctx.font = "850 9px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(name || "Oscillator"), x0 + 14, y0 + 18);

  ctx.fillStyle = "rgba(165,170,168,.72)";
  ctx.font = "750 9px system-ui";
  const msg = err ? String(err.message || err).slice(0, 42) : "render guard";
  ctx.fillText("render protegido · " + msg, x0 + 14, Math.min(y1 - 18, y0 + h / 2));
  ctx.restore();
}

function __dvlCollectActiveOscillators(){
  const list = [];
  const errors = [];

  function add(name, osc){
    try{
      if(osc && typeof osc.on === "function" && osc.on()){
        list.push(osc);
      }
    }catch(e){
      errors.push({ name, error:String(e && e.message || e) });
    }
  }

  add("Open Interest", window.DVLOpenInterestOscillator);
  add("Long/Short", window.DVLLongShortOscillator);
  add("Net Long", window.DVLNetLongOscillator);
  add("Net Short", window.DVLNetShortOscillator);
  add("Net Delta", window.DVLNetDeltaOscillator);
  add("Delta Volume", window.DVLDeltaVolume);
  add("Tick Volume", window.DVLTickVolume);
  add("ARION Zone Profile", window.DVLArionZoneProfile);
  add("Smart Delta", window.DVL_SMART_DELTA_OSC);
  add("RSI Exhaustion Pro", window.DVLExhaustionRSI);
  add("Teste", window.DVLTestOscillator);
  add("Teste 2", window.DVLTestOscillator2);

  window.__dvlLastOscillatorCollectErrors = errors;
  return list;
}

/* Beta 1.554 — layout DOM synchronization is NOT part of every canvas frame.
   The old draw() path performed three layout reads/writes after each render:
   oscillator bounds publisher (getBoundingClientRect), Paper layer anchor
   (rect/clientHeight + style writes), and scale-control dock (rect + style).
   They only depend on canvas/panel geometry, not on candle pan/zoom or ticks. */
let __dvlLayoutSyncRAF1209 = 0;
let __dvlLayoutSignature1209 = "";
let __dvlLayoutPending1209 = null;
function __dvlChartLayoutSignature1209(w,h,priceH,activeOscillators){
  const names=(activeOscillators||[]).map(__dvlOscillatorName).join("|");
  const ratios=(window.__dvlOscRatios||[]).map(function(v){return Math.round(Number(v||0)*10000)/10000;}).join(",");
  const pr=Math.round(Number(window.__dvlPriceRatio||0)*10000)/10000;
  return [Math.round(w),Math.round(h),Math.round(priceH),names,pr,ratios].join(";");
}
function __dvlRunLayoutSync1209(){
  __dvlLayoutSyncRAF1209=0;
  try{
    if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER && typeof window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish==="function")
      window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish();
  }catch(_){}
  try{
    if(window.DVL_PAPER_LAYER_ANCHOR && typeof window.DVL_PAPER_LAYER_ANCHOR.scheduleSync==="function")
      window.DVL_PAPER_LAYER_ANCHOR.scheduleSync();
  }catch(_){}
  try{
    if(typeof window.DVLScaleControlsDockUpdate==="function") window.DVLScaleControlsDockUpdate();
  }catch(_){}
  try{ window.dispatchEvent(new CustomEvent("dvl:chart-layout-synced",{detail:__dvlLayoutPending1209||{}})); }catch(_){}
}
function __dvlScheduleLayoutSync1209(w,h,priceH,activeOscillators,force){
  const sig=__dvlChartLayoutSignature1209(w,h,priceH,activeOscillators);
  if(!force && sig===__dvlLayoutSignature1209) return;
  __dvlLayoutSignature1209=sig;
  __dvlLayoutPending1209={w:w,h:h,priceH:priceH,signature:sig,at:Date.now()};
  if(!__dvlLayoutSyncRAF1209) __dvlLayoutSyncRAF1209=requestAnimationFrame(__dvlRunLayoutSync1209);
}
window.DVLForceChartLayoutSync1209=function(){
  __dvlLayoutSignature1209="";
  try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){}
};
window.addEventListener("resize",function(){__dvlLayoutSignature1209="";},{passive:true});
window.addEventListener("orientationchange",function(){__dvlLayoutSignature1209="";},{passive:true});

function draw(){
  const {ctx,w,h} = resizeCanvas();
  /* Beta 1.554 — the next operation paints an opaque full-canvas background,
     so clearRect was a redundant second full-surface memory pass. */
  ctx.fillStyle = "#020806";
  ctx.fillRect(0,0,w,h);
  if(!klines.length){
    /* Don't paint "Sem dados ainda" while the "CARREGANDO BINANCE..." overlay
       is visible — otherwise the two messages stack and flicker on each load. */
    var _ld=document.getElementById("loading");
    if(!_ld || _ld.classList.contains("hidden")) drawEmpty(ctx,w,h);
    try{ dvlPaintPermanentTimeline1324(false); }catch(_dvlTimelineLoading1324){}
    return;
  }
  /* Safety net: with candles present the loading overlay must never linger
     over a drawn chart (kills any spurious "CARREGANDO BINANCE..." flash). */
  try{ if(els && els.loading) els.loading.classList.add("hidden"); }catch(_){}

  const testOscOn = dvlLowerPanelOn();
  /* Beta 1.596 — padR reservado pra escala AGORA = PRICE_SCALE_W (80). Antes era
     55 fixo, mas a escala tem 80px, então o conteúdo (heatmap, perfil, linhas)
     era clipado em w-55 e invadia os 25px finais onde ficam os números. Alinhado
     ao PRICE_SCALE_W (fonte única) e ao crosshair, que já usava w-80. */
  const padL = 0, padR = PRICE_SCALE_W;
  const top = 0;
  const priceH = dvlPricePanelHeight(h);
  const timeH = dvlMainTimeScaleHeight();
  const priceBottom = dvlPricePanelBottom(h);

  const activeOscillators = __dvlCollectActiveOscillators();
  const __dvlOscDrawErrors = [];

  window.__dvlOscillatorPanelBounds = {};

  try{
    drawPriceSection(ctx,padL,padR,top,priceBottom,timeH,w,priceH);
    window.__dvlLastPriceSectionDrawError = null;
  }catch(e){
    window.__dvlLastPriceSectionDrawError = String(e && e.message || e);
    console.warn("[DVL] price section render guarded:", e);
  }

  if(testOscOn && activeOscillators.length){
    const lowerH = Math.max(70, h - priceH - timeH);
    let heights = [];

    /* With few oscillators (or a tall screen) each panel keeps its ideal
       60px+ height, unchanged from before. With MANY active at once (Net
       Short/Net Delta on top of OI/LSR/RSI/etc.) an unconditional 60px
       floor per panel could add up to more than lowerH and force an
       overflow/cutoff — this shrinks the floor toward an equal split as
       needed. Hard floor is 50, not lower: DVLExhaustionRSI silently draws
       nothing under a 50px panel height, so anything smaller would look
       like a blank/broken panel instead of just compact. */
    const N = activeOscillators.length;
    const minPanel = Math.max(50, Math.min(60, lowerH / N));

    if(window.__dvlOscRatios && Array.isArray(window.__dvlOscRatios) && window.__dvlOscRatios.length === N){
      heights = window.__dvlOscRatios.map(r => Math.max(minPanel, lowerH * r));
      const sum0 = heights.reduce((a,b)=>a+b,0);
      if(sum0 > lowerH) heights = heights.map(hh => hh * (lowerH / sum0));
    } else if(N === 1){
      heights = [lowerH];
    }else if(minPanel * N >= lowerH){
      /* Not enough room for every panel to clear even the reduced floor
         (an extreme case — many oscillators on a very short screen) —
         split what's left equally rather than letting only the middle
         panels shrink below it while first/last stay artificially taller. */
      heights = new Array(N).fill(lowerH / N);
    }else{
      const ratio = (
        window.DVLTestOscillator && typeof window.DVLTestOscillator.stackSplitRatio === "function"
      ) ? window.DVLTestOscillator.stackSplitRatio() : 0.5;

      /* Every panel gets minPanel guaranteed; only the space LEFT OVER
         beyond that floor gets split by `ratio` (first panel) vs evenly
         (the rest) — this is what actually keeps middle panels from
         dropping below minPanel, which the old first/last-only clamping
         didn't. */
      const extra = lowerH - minPanel * N;
      const firstExtra = extra * ratio;
      const restExtraEach = (extra - firstExtra) / (N - 1);

      heights = [minPanel + firstExtra];
      for(let i = 1; i < N; i++) heights.push(minPanel + restExtraEach);
    }

    window.__dvlDividerYPositions = [];
    let panelTop = priceH;

    activeOscillators.forEach((osc, i) => {
      const panelHeight = Math.max(60, heights[i] || (lowerH / activeOscillators.length));
      const oscName = __dvlOscillatorName(osc);

      window.__dvlDividerYPositions.push(panelTop);

      ctx.save();
      try{
        if(window.DVLTestOscillator && typeof window.DVLTestOscillator.drawDivider === "function"){
          window.DVLTestOscillator.drawDivider(ctx, padL, padR, panelTop, w);
        }else{
          drawDivider(ctx, panelTop);
        }

        if(osc && typeof osc.draw === "function"){
          osc.draw(ctx, padL, padR, panelTop, panelHeight, w);
        }else{
          throw new Error("draw() ausente");
        }
      }catch(e){
        const msg = String(e && e.message || e);
        __dvlOscDrawErrors.push({ name:oscName, error:msg, top:panelTop, height:panelHeight });
        console.warn("[DVL] oscillator render guarded:", oscName, e);
        try{ __dvlDrawOscillatorGuardPanel(ctx, padL, padR, panelTop, panelHeight, w, oscName, e); }catch(_){}
      }finally{
        try{ ctx.restore(); }catch(_){}
      }

      panelTop += panelHeight;
    });
  }

  /* Beta 1.554 — a timeline não usa mais camada DOM externa. Ela será
     desenhada no próprio canvas depois de todos os painéis, impedindo que
     pan/zoom/rebuild a escondam. */
  try{ if(__dvlBottomTimelineCanvas1314) __dvlBottomTimelineCanvas1314.style.display="none"; }catch(_dvlBottomTimelineDom1321){}

  try{
    if(window.DVL_LIVE_READING_LABELS_1027 && typeof window.DVL_LIVE_READING_LABELS_1027.drawLabels === "function"){
      window.DVL_LIVE_READING_LABELS_1027.drawLabels(ctx, padL, padR, w);
    }
  }catch(_){}

  window.__dvlLastOscillatorDrawState = {
    version:"0.941",
    lowerPanelOn:!!testOscOn,
    activeCount:activeOscillators.length,
    activeNames:activeOscillators.map(__dvlOscillatorName),
    pricePanelHeight:priceH,
    priceBottom:priceBottom,
    lowerHeight:Math.max(0, h - priceH),
    errors:__dvlOscDrawErrors,
    collectErrors:window.__dvlLastOscillatorCollectErrors || [],
    updatedAt:Date.now()
  };

  __dvlScheduleLayoutSync1209(w,h,priceH,activeOscillators,false);

  if(crosshair.visible && window.__dvlLastCrossCfg){
    const domCrosshair = dvlDesktopCrosshair1205();
    if(domCrosshair && typeof domCrosshair.scheduleFromState === "function"){
      domCrosshair.scheduleFromState();
    }else{
      drawCrosshair(ctx, Object.assign({}, window.__dvlLastCrossCfg, {
        fullY0: 0,
        fullY1: dvlCrossPanelBottom(h),
        fullX0: padL,
        fullX1: w - padR
      }));
    }
  }

  /* Beta 1.613 — no mobile (sem crosshair DOM desktop) sincroniza o tag DOM de
     data/hora da timeline (#dvlCross1544TimeTag). Fica FORA do guard de
     visibilidade de propósito: quando o cross é dispensado, o paint() do 1544
     lê crosshair.visible=false e esconde o tag. No desktop o tag é agendado
     pelo pointermove, então aqui só age quando não há crosshair DOM. */
  if(!dvlDesktopCrosshair1205() && typeof window.DVL_CROSS_TIME_TAG_1544_SYNC === "function"){
    try{ window.DVL_CROSS_TIME_TAG_1544_SYNC(); }catch(_dvlCrossTimeTag1613){}
  }

  /* Beta 1.554 — a escala final mora num canvas permanente dentro do
     chartWrap. Mesmo que o canvas principal seja limpo, redimensionado ou um
     frame pesado seja descartado, a timeline não desaparece. */
  try{ dvlPaintPermanentTimeline1324(false); }catch(_dvlBottomTimeline1324){}

  /* Scale dock is synchronized by __dvlScheduleLayoutSync1209 only when
     geometry changes; pan/zoom/ticks do not alter its dock position. */
}

/* Beta 1.612 — canvas crosshair RESTAURADO (perdido na extração monólito→modular,
   mesmo padrão de __dvlLastCrossCfg). O crosshair DOM (#dvlCrosshairDom1205) é
   desktop-only; no mobile dvlDesktopCrosshair1205() retorna null e a draw() caía
   no `else` chamando drawCrosshair — que não existia → ReferenceError → o cross
   mobile "não aparecia de forma alguma". Esta função pinta o cross direto no
   canvas: perna vertical transcende os dois painéis, perna horizontal + dot no
   centro, tag de preço à direita e label de tempo na faixa de escala. */
function drawCrosshair(ctx, cfg){
  if(!crosshair.visible) return;

  const fullY0 = Number.isFinite(cfg.fullY0) ? cfg.fullY0 : cfg.y0;
  const fullY1 = Number.isFinite(cfg.fullY1) ? cfg.fullY1 : cfg.y1;
  const fullX0 = Number.isFinite(cfg.fullX0) ? cfg.fullX0 : cfg.x0;
  const fullX1 = Number.isFinite(cfg.fullX1) ? cfg.fullX1 : cfg.x1;

  const cx = clamp(crosshair.x, cfg.x0, cfg.x1);
  const cy = clamp(crosshair.y, fullY0, fullY1);
  const insidePricePanel = cy >= cfg.y0 && cy <= cfg.y1;

  ctx.save();
  ctx.setLineDash([4,4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(33,223,255,.68)";
  ctx.beginPath();

  /* Horizontal leg follows the cross center; vertical leg transcends both chart panels. */
  ctx.moveTo(fullX0, cy);
  ctx.lineTo(fullX1, cy);
  ctx.moveTo(cx, fullY0);
  ctx.lineTo(cx, fullY1);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(33,223,255,.98)";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  if(insidePricePanel){
    const price = cfg.max - ((cy - cfg.y0) / Math.max(cfg.y1 - cfg.y0, 1)) * (cfg.max - cfg.min);
    const priceText = fmtPrice(price);
    const tagW = PRICE_LABEL_W;
    const tagH = 24;
    const tagX = cfg.x1 + PRICE_LABEL_GAP;
    const tagY = cy - tagH / 2;
    roundRect(ctx, tagX, tagY, tagW, tagH, 6, true, false, "#21dfff");
    ctx.fillStyle = "#02111d";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 8.5px system-ui";
    ctx.fillText(priceText, tagX + tagW / 2, cy);
  }

  /* Nota: o rótulo de data/hora NÃO é pintado aqui no canvas — o canvas da
     timeline permanente (z-index maior) o cobriria. O tag de tempo é um
     elemento DOM (#dvlCross1544TimeTag) sincronizado via
     DVL_CROSS_TIME_TAG_1544_SYNC, que fica acima da timeline. */

  ctx.restore();
}

function drawEmpty(ctx,w,h){
  ctx.fillStyle = "#6b7d6e";
  ctx.font = "700 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Sem dados ainda", w/2, h/2);
}
function drawGrid(ctx,x0,y0,x1,y1,rows=5,cols=6){
  if(!gridOn) return;
  ctx.strokeStyle = "rgba(122,155,145,.092)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for(let i=0;i<=rows;i++){
    const y = y0 + (y1-y0)*i/rows;
    ctx.moveTo(x0,y); ctx.lineTo(x1,y);
  }
  for(let i=0;i<=cols;i++){
    const x = x0 + (x1-x0)*i/cols;
    ctx.moveTo(x,y0); ctx.lineTo(x,y1);
  }
  ctx.stroke();
}
function drawDivider(ctx,y){
  ctx.strokeStyle = "rgba(150,180,168,.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0,y); ctx.lineTo(ctx.canvas.width/(window.devicePixelRatio||1),y);
  ctx.stroke();
}

window.drawSoon = drawSoon;

function collectSessionChunks(view){
  const chunks = [];
  let current = null;

  view.forEach((d, i) => {
    const key = sessionKeyForTime(d.time);

    if(!sessionActive[key]){
      if(current){ chunks.push(current); current = null; }
      return;
    }

    if(!current || current.key !== key){
      if(current) chunks.push(current);
      current = { key, start:i, end:i };
    } else {
      current.end = i;
    }
  });

  if(current) chunks.push(current);

  const count = Math.max(1, Math.round(visibleSessionCount || 1));
  return chunks.slice(-count);
}

function drawSessionsBackground(ctx, view, win, x, x0, x1, y0, y1, slotOffset){
  if(!sessionsOn || !view.length) return;

  const visible = collectSessionChunks(view);

  ctx.save();
  visible.forEach(chunk => {
    const def = SESSION_DEFS[chunk.key];
    if(!def) return;

    const leftSlot = slotOffset + chunk.start - .5;
    const rightSlot = slotOffset + chunk.end + .5;
    const left = Math.max(x0, x(leftSlot));
    const right = Math.min(x1, x(rightSlot));
    if(right <= left) return;

    ctx.fillStyle = hexToRgba(def.color, .085);
    ctx.fillRect(left, y0, right-left, y1-y0);

    const labelX = Math.max(left + 5, Math.min(right - 5, (left + right) / 2));
    if(right - left > 42){
      ctx.font = "800 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = hexToRgba(def.color, .95);
      ctx.fillText(def.name, labelX, y0 + 20);
    }
  });
  ctx.restore();
}


function draw24hStatsOverlay(ctx, cfg){
  if(!ticker) return;

  const open = Number(ticker.openPrice);
  const high = Number(ticker.highPrice);
  const low = Number(ticker.lowPrice);
  const change = Number(ticker.priceChangePercent);

  if(!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low)) return;

  const items = [
    ["O", fmtPrice(open), "rgba(165,170,168,.64)"],
    ["H", fmtPrice(high), "rgba(165,170,168,.64)"],
    ["L", fmtPrice(low), "rgba(165,170,168,.64)"],
    ["Δ", Number.isFinite(change) ? pct(change) : "--", change >= 0 ? "rgba(19,220,141,.74)" : "rgba(255,74,97,.74)"]
  ];

  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const startX = cfg.x0 + 10;
  // Prioritize the O/H/L/Δ strip above the session labels.
  const startY = cfg.y0 + 7;
  const gap = 8;
  const labelGap = 3;
  let xx = startX;

  items.forEach(([k,v,color], i) => {
    ctx.fillStyle = "rgba(137,153,173,.64)";
    ctx.font = "850 8.2px system-ui";
    ctx.fillText(k, xx, startY);
    xx += ctx.measureText(k).width + labelGap;

    ctx.fillStyle = color;
    ctx.font = "850 8.4px system-ui";
    ctx.fillText(v, xx, startY - 0.15);
    xx += ctx.measureText(v).width + (i === items.length - 1 ? 0 : gap);
  });

  ctx.restore();
}

/* Beta 1.554 — cache percentile autoscale for the same integer candle
   window. It is consulted only while auto-scale is unlocked. */
let __dvlAutoScaleCache1210={key:"",min:NaN,max:NaN};
function __dvlAutoScalePercentiles1210(drawView,win){
  if(!drawView || !drawView.length) return {min:0,max:1};
  /* Beta 1.554 — desktop wheel zoom is now a real interaction cycle. Keep the
     last visible-range percentile while the wheel is active; recompute once on
     the final sharp repaint instead of sorting the changing window every step. */
  if(window.__dvlChartInteracting && __dvlAutoScaleCache1210.key) return __dvlAutoScaleCache1210;
  const a=drawView[0],z=drawView[drawView.length-1];
  const key=[candleMode,win.start,win.end,drawView.length,a.time,a.open,a.high,a.low,a.close,z.time,z.open,z.high,z.low,z.close].join("|");
  if(__dvlAutoScaleCache1210.key===key) return __dvlAutoScaleCache1210;
  const pts=new Float64Array(drawView.length*2);
  for(let i=0;i<drawView.length;i++){
    pts[i*2]=Number(drawView[i].low)||0;
    pts[i*2+1]=Number(drawView[i].high)||0;
  }
  pts.sort();
  const n=pts.length;
  const i05=Math.max(0,Math.floor(n*0.05));
  const i95=Math.min(n-1,Math.ceil(n*0.95)-1);
  __dvlAutoScaleCache1210={key:key,min:pts[i05],max:pts[i95]};
  return __dvlAutoScaleCache1210;
}

/* Beta 1.554 — ESTABILIZADOR GLOBAL DA ESCALA DE PREÇO.
   Causa raiz do "piscar" de POC/VAH/VAL e demais níveis presos a preço: a escala
   vertical (priceViewCenter/priceViewRange) é recalculada por percentil a cada
   frame de autoscale. Um valor transitório errado (glitch de 1 frame vindo de um
   tick fora da curva, recomputo parcial, etc.) desloca a escala por poucos frames
   e volta sozinho — e como TODO indicador ancorado a preço deriva dessa mesma
   escala, todos saltam juntos e retornam. A correção é no NÚCLEO, não por
   indicador: um salto grande e súbito da escala SEM gatilho estrutural (troca de
   ativo/timeframe, zoom, pan, nova vela, lock, interação) só é adotado depois de
   se confirmar por 2 frames. Assim, um glitch de 1 frame nunca chega a ser
   desenhado, enquanto mudanças legítimas passam na hora. */
var __dvlAutoScaleStab1235 = { center:null, range:null, sig:"", pendC:null, pendR:null, pendN:0 };
function __dvlAutoScaleSig1235(win){
  try{
    var sym = (typeof symbol!=="undefined") ? symbol : "";
    var itv = (typeof interval!=="undefined") ? interval : "";
    var kl  = (typeof klines!=="undefined" && klines) ? klines.length : 0;
    var vc  = (typeof chartViewCount!=="undefined") ? chartViewCount : 0;
    var oc  = (typeof chartOffsetCandles!=="undefined") ? chartOffsetCandles : 0;
    var lk  = (typeof priceScaleLocked!=="undefined" && priceScaleLocked) ? 1 : 0;
    return [String(sym),String(itv),kl,Math.round(Number(vc||0)*1000),Math.round(Number(oc||0)*1000),lk,
            win?win.start:0, win?win.end:0].join("|");
  }catch(_){ return ""; }
}
function __dvlStabilizeAutoScale1235(center, range, win){
  var S = __dvlAutoScaleStab1235;
  // candidato inválido → segura a última escala válida (nunca desenha lixo)
  if(!Number.isFinite(center) || !Number.isFinite(range) || range<=0){
    if(Number.isFinite(S.center) && Number.isFinite(S.range) && S.range>0) return {center:S.center, range:S.range};
    return {center:center, range:range};
  }
  var sig = __dvlAutoScaleSig1235(win);
  var interacting = !!(typeof window!=="undefined" && window.__dvlChartInteracting);
  // 1ª vez, mudança estrutural (ativo/TF/zoom/pan/nova vela/lock) ou interação → adota já
  if(S.center===null || sig!==S.sig || interacting){
    S.center=center; S.range=range; S.sig=sig; S.pendC=null; S.pendR=null; S.pendN=0;
    return {center:center, range:range};
  }
  // sem gatilho estrutural: variação pequena (respiração normal do autoscale) → adota suave
  var big = Math.abs(range-S.range) > S.range*0.22 || Math.abs(center-S.center) > S.range*0.22;
  if(!big){
    S.center=center; S.range=range; S.pendC=null; S.pendR=null; S.pendN=0;
    return {center:center, range:range};
  }
  // salto grande e súbito SEM gatilho → provável glitch de 1 frame: exige confirmação
  if(S.pendC!==null && Math.abs(range-S.pendR)<=S.pendR*0.08 && Math.abs(center-S.pendC)<=S.pendR*0.08){
    S.pendN++;
  } else {
    S.pendC=center; S.pendR=range; S.pendN=1;
  }
  if(S.pendN>=2){                      // persistiu 2 frames → mudança real, adota
    S.center=center; S.range=range; S.pendC=null; S.pendR=null; S.pendN=0;
    return {center:center, range:range};
  }
  return {center:S.center, range:S.range};   // ainda não confirmado → mantém a última escala válida
}
try{ if(typeof window!=="undefined"){ window.__dvlStabilizeAutoScale1235=__dvlStabilizeAutoScale1235; window.__dvlAutoScaleStab1235=__dvlAutoScaleStab1235; } }catch(_){}

/* Empilhamento anti-colisão: items ordenados por cy (centro desejado) recebem
   .py (topo). Guloso p/ baixo, depois desloca o bloco pra caber em [top,bottom];
   no overflow (labels demais) faz clamp por item (aceita leve sobreposição). */
function __dvlGreedyPack(list, top, bottom, H, gap){
  var n = list.length; if(!n) return;
  list.sort(function(a,b){return a.cy-b.cy;});
  for(var i=0;i<n;i++){
    var py = list[i].cy - H/2;
    if(i>0 && py < list[i-1].py + H + gap) py = list[i-1].py + H + gap;
    list[i].py = py;
  }
  var bb = list[n-1].py + H;
  if(bb > bottom){ var s1 = bb - bottom; for(var a=0;a<n;a++) list[a].py -= s1; }
  if(list[0].py < top){ var s2 = top - list[0].py; for(var b=0;b<n;b++) list[b].py += s2; }
  for(var c=0;c<n;c++) list[c].py = Math.max(top, Math.min(bottom - H, list[c].py));
}
function __dvlDecollideScaleLabels(items, top, bottom, H, gap, anchorCy){
  var n = items.length; if(!n) return items;
  if(anchorCy==null){ __dvlGreedyPack(items, top, bottom, H, gap); return items; }
  /* modo ÂNCORA: a faixa da pílula do preço [aTop,aBot] é RESERVADA. Os labels
     acima vão pra região [top,aTop] e os de baixo pra [aBot,bottom] — nunca em
     cima do preço. Se um lado não tem espaço (preço na borda), tudo vai pro outro. */
  var aTop = Math.max(top, Math.min(bottom - H, anchorCy - H/2)), aBot = aTop + H;
  var above, below;
  if(aTop - top < H + gap){ above = []; below = items.slice(); }
  else if(bottom - aBot < H + gap){ above = items.slice(); below = []; }
  else {
    above = []; below = [];
    for(var i=0;i<n;i++){ (items[i].cy < anchorCy ? above : below).push(items[i]); }
  }
  __dvlGreedyPack(above, top, aTop, H, gap);      // pílulas acima do preço
  __dvlGreedyPack(below, aBot, bottom, H, gap);   // pílulas abaixo do preço
  return items;
}
function __dvlContrastText(color){
  var r=136,g=136,bl=136;
  try{
    var s=String(color).trim();
    if(s.charAt(0)==="#"){ var h=s.slice(1); var f=h.length===3?h.replace(/(.)/g,"$1$1"):h; var num=parseInt(f,16); if(isFinite(num)){ r=(num>>16)&255; g=(num>>8)&255; bl=num&255; } }
    else { var m=s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); if(m){ r=+m[1]; g=+m[2]; bl=+m[3]; } }
  }catch(_){}
  return (0.299*r+0.587*g+0.114*bl) > 140 ? "#0a0f16" : "#f2f6ff";
}
/* Desenha uma pílula por registro na canaleta [x1, w], estilo do label do preço,
   de-colidido. Chamado depois do restore (fora do clip). */
function drawRegisteredScaleLabels(ctx, x1, y0, y1, w, min, max, y, anchorCy){
  var arr = window.__dvlScaleLabels;
  if(!arr || !arr.length) return [];
  var H = DVL_SCALE_LABEL_H, tagW = PRICE_LABEL_W, gap = 1;
  var items = [];
  for(var i=0;i<arr.length;i++){
    var o = arr[i];
    var cyRaw = y(o.value);
    if(!Number.isFinite(cyRaw)) continue;
    /* Beta 1.598 — sem restrição de range: quando o valor entra na faixa sem
       preço (fora da vista), o label GRUDA na borda (clamp) e continua aparecendo,
       em vez de esvaziar/sumir. */
    var cy = Math.max(y0 + H/2, Math.min(y1 - H/2, cyRaw));
    items.push({ value:o.value, color:o.color, textColor:o.textColor, label:o.label, text:o.text, cy:cy });
  }
  if(!items.length) return [];
  __dvlDecollideScaleLabels(items, y0+2, y1-2, H, gap, anchorCy);
  var tagX = Math.max(1, Math.min(x1 + Math.max(0,(PRICE_SCALE_W - tagW)/2), w - tagW - 1));
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for(var k=0;k<items.length;k++){
    var it = items[k], cyc = it.py + H/2, mainTxt = (it.text!=null ? it.text : fmtPrice(it.value));
    roundRect(ctx, tagX, it.py, tagW, H, DVL_SCALE_LABEL_RADIUS, true, false, it.color);
    ctx.fillStyle = it.textColor || __dvlContrastText(it.color);
    if(it.label){
      ctx.font = "800 8px system-ui";
      ctx.fillText(it.label, tagX + tagW/2, cyc - 5);
      ctx.font = "950 10px system-ui";
      ctx.fillText(mainTxt, tagX + tagW/2, cyc + 5.5);
    } else {
      ctx.font = "900 10px system-ui";
      ctx.fillText(mainTxt, tagX + tagW/2, cyc);
    }
  }
  ctx.restore();
  var ranges = [];
  for(var q=0;q<items.length;q++) ranges.push([items[q].py, items[q].py + H]);
  return ranges;   // faixas ocupadas → os ticks cinzas as evitam
}
function drawPriceSection(ctx,padL,padR,top,priceBottom,timeH,w,priceH){
  window.__dvlScaleLabels.length = 0;   // limpa o registro no início do frame
  const win = visibleWindow();
  const view = win.candles;
  if(!view.length) return;
  const drawView = buildDisplayCandles(view);

  const x0 = padL, x1 = w - padR, y0 = top + 4, y1 = priceBottom;
  /*
    Liquidation lines are overlays only.
    They MUST NOT alter min/max, otherwise ON/OFF changes the chart zoom.
    The vertical price scale is independent and can move/zoom infinitely.
    Auto-scale usa p5/p95 para que um candle outlier nao domine o range.
    O ctx.clip() em drawPriceSection corta wicks alem dos limites do panel.
  */
  if(!priceScaleLocked || !Number.isFinite(priceViewCenter) || !Number.isFinite(priceViewRange)){
    const q=__dvlAutoScalePercentiles1210(drawView,win);
    const candleMin=q.min;
    const candleMax=q.max;
    const candleRange=(candleMax-candleMin)||Math.max(candleMax*.002,1);
    const __stab=__dvlStabilizeAutoScale1235((candleMax+candleMin)/2, candleRange*1.16, win);
    priceViewRange=__stab.range;
    priceViewCenter=__stab.center;
  }

  let min = priceViewCenter - priceViewRange / 2;
  let max = priceViewCenter + priceViewRange / 2;

  if(window.DVL_BOOKMAP_RANGE_EXPAND_REMOVED_0825){
    try{
      const _bmRange0823 = window.DVL_BOOKMAP_RANGE_EXPAND_REMOVED_0825({
        view: view,
        drawView: drawView,
        min: min,
        max: max,
        y0: y0,
        y1: y1,
        priceViewCenter: priceViewCenter,
        priceViewRange: priceViewRange
      });
      if(_bmRange0823 && Number.isFinite(_bmRange0823.min) && Number.isFinite(_bmRange0823.max) && _bmRange0823.max > _bmRange0823.min){
        min = _bmRange0823.min;
        max = _bmRange0823.max;
      }
    }catch(_dvlBookmapRange0824){}
  }

  const y = v => y1 - (v-min)/(max-min)*(y1-y0);

  const x = slot => {
    const slots = Math.max(2, win.totalSlots);
    return x0 + slot/(slots-1)*(x1-x0);
  };

  // DVL Beta 0.923 — Fractional Slot Anchor Fix.
  // When totalSlots is fractional, view.length is ceil(totalSlots - futureSlots).
  // Clamping this to zero pushes the last candle beyond x1 and creates the
  // "invisible block / tilt" feeling during zoom. Allowing a small negative
  // fractional offset keeps the last visible candle anchored and clips only the
  // partial candle on the left, like TradingView-style zoom.
  const slotOffset = __dvlSlotOffset(win, view);
  const __dvlSlotW1210=(x1-x0)/Math.max(win.totalSlots,1);
  const candleW=__dvlCandleWidthForMode(__dvlSlotW1210,candleMode,Math.max(1.8,Math.min(28,__dvlSlotW1210*.56)));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, Math.max(1, y1 - y0));
  ctx.clip();

  drawSessionsBackground(ctx, view, win, x, x0, x1, y0, y1, slotOffset);
  drawGrid(ctx,x0,y0,x1,y1,10,7);

  /* DVL Deep Heatmap — camada de FUNDO (atrás das velas): matriz de liquidez
     resting (azul/ciano/amarelo). Desenhada aqui pra ficar sob candles/overlays. */
  if(window.DVLDeepHeatmapDraw){
    try{window.DVLDeepHeatmapDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlDH_e){}
  }

  /* Bookmap antigo — o Deep Heatmap desliga o Bookmap (takeoverOld) quando ligado,
     então ele não desenha em conflito; nada a guardar aqui. */
  if(window.DVL_BOOKMAP_CORE_DRAW_0827){
    try{
      window.DVL_BOOKMAP_CORE_DRAW_0827(ctx, {
        view: view,
        drawView: drawView,
        win: win,
        x: x,
        y: y,
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        slotOffset: slotOffset,
        candleW: candleW,
        min: min,
        max: max,
        priceBottom: priceBottom,
        priceH: priceH
      });
    }catch(_dvlBookmapCore0827){}
  }

if(window.DVLSpikeZonesDraw){
    window.DVLSpikeZonesDraw(ctx, {
      view,
      drawView,
      win,
      x,
      y,
      x0,
      x1,
      y0,
      y1,
      slotOffset,
      candleW: candleW,
      priceBottom,
      priceH
    });
  }

  if(window.DVLOrderBookImbalanceZonesDraw){
    try{window.DVLOrderBookImbalanceZonesDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,priceBottom,priceH});}catch(_obiz_e){}
  }

  if(window.DVLFVGMagnetIFVGDraw){
    try{window.DVLFVGMagnetIFVGDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlIfvgMagnet_e){}
  }

  if(window.DVLFvgFirewallDraw){
    try{window.DVLFvgFirewallDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,priceBottom,priceH});}catch(_dvlFvg_e){}
  }

  /* Bubbles movido p/ DEPOIS do render das velas (ver abaixo) — usuário quer os
     bubbles SOBREPOSTOS aos candles, não atrás deles. */
  /* mapping p/ o Replay Pro converter clique → candle (seletor de início) */
  try{ window.__DVL_DRAWCFG={x0:x0,x1:x1,y0:y0,y1:y1,slotOffset:slotOffset,totalSlots:(win&&win.totalSlots)||0,view:view}; }catch(_dvlCfg_e){}
  /* Restaura o config global do crosshair/coordenadas que se PERDEU na extração
     do monolito p/ o build modular (existia como window.__dvlLastCrossCfg no
     index antigo). O RSI Exhaustion e os labels de crosshair leem esse objeto
     pra mapear tempo→X (precisam de `view` + da função `x`); sem ele, o xForTime
     do RSI retornava NaN e a LINHA NÃO PLOTAVA EM NENHUM TIMEFRAME. */
  try{ window.__dvlLastCrossCfg={x0:x0,x1:x1,y0:y0,y1:y1,min:min,max:max,win:win,view:view,slotOffset:slotOffset,x:x}; }catch(_dvlXCfg_e){}
  /* linha vertical de início do Replay (+ escurecido do futuro) */
  if(window.DVLReplayLineDraw){ try{ window.DVLReplayLineDraw(ctx,{view:view,win:win,x:x,x0:x0,x1:x1,y0:y0,y1:y1,slotOffset:slotOffset}); }catch(_dvlRl_e){} }

  /* Risk Express/Engine — as linhas e labels são desenhadas por ÚLTIMO (ver
     abaixo, após GEX/VP/bubbles) pra terem PRIORIDADE e nunca ficarem cobertas
     por MAX PAIN, FLIP, VP etc. (pedido do usuário). */

  if(window.DVLSmartDeltaDraw){
    try{window.DVLSmartDeltaDraw(ctx,{view,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlSD_e){}
  }

  if(window.DVLArionZoneProfileDraw){
    try{window.DVLArionZoneProfileDraw(ctx,{view,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlArion_e){}
  }

  draw24hStatsOverlay(ctx, { x0, x1, y0, y1 });

  const lastVisible = view.at(-1);
  // Current price line must stay anchored to the real/latest price,
  // even when the user pans backward through historical candles.
  // Beta 1.554 — usa o close da vela em formação (atualizado por WS/@aggTrade em
  // tempo real) ANTES do ticker (que só é atualizado por REST a cada ~2s), pra o
  // preço/linha andarem fluido em TF baixo em vez de saltar de 2 em 2 segundos.
  const currentMarketPrice = Number((klines.length ? klines[klines.length-1].close : 0) || ticker?.lastPrice || marketEntryPrice || lastVisible.close);
  try{ window.__dvlLiveChartPrice = currentMarketPrice; }catch(_){}
  const last = currentMarketPrice;
  const ly = y(last);

  ctx.save();
  ctx.setLineDash([1.4,4.2]);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(16,223,119,.82)";
  ctx.beginPath(); ctx.moveTo(x0,ly); ctx.lineTo(x1,ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  /* Escala do volume só pelas velas FECHADAS. Se incluir a vela ao vivo (em
     formação), conforme o volume dela cresce o volMax sobe e TODAS as barras
     fechadas encolhem — e quando abre vela nova elas voltam. Isso fazia o
     histograma inteiro "ficar mudando" a cada tick. Detecta a vela ao vivo pelo
     TEMPO (fechamento ainda não passou) pra continuar certo mesmo com scroll; a
     barra ao vivo é limitada à altura do painel no desenho, então segue visível
     (no topo) sem esmagar o resto. */
  let volMax=1;
  const __dvlVolN1210=view.length;
  let __dvlVolLimit1210=__dvlVolN1210;
  if(__dvlVolN1210>=2){
    const barMs=Number(view[__dvlVolN1210-1].time)-Number(view[__dvlVolN1210-2].time);
    if(barMs>0 && (Number(view[__dvlVolN1210-1].time)+barMs)>Date.now()) __dvlVolLimit1210=__dvlVolN1210-1;
  }
  if(__dvlVolLimit1210<=0) __dvlVolLimit1210=__dvlVolN1210;
  for(let __vi1210=0;__vi1210<__dvlVolLimit1210;__vi1210++){
    const __vv1210=Number(view[__vi1210].volume)||0;
    if(__vv1210>volMax) volMax=__vv1210;
  }
  const volH = Math.min(58, (y1-y0)*.18);

  if(window.DVLVolumeDraw){
    window.DVLVolumeDraw(ctx, {
      view,
      win,
      x,
      y0,
      y1,
      x0,
      x1,
      slotOffset,
      candleW,
      volMax,
      volH
    });
  }

  /* Beta 1.554 — batch dos pavios (wicks). Antes cada vela dava um ctx.stroke()
     só pro pavio → centenas de flushes por frame no zoom out. Agora os pavios
     (só as partes FORA do corpo) são acumulados por cor num Path2D e desenhados
     em ~2 strokes DEPOIS do loop. Como as partes ficam fora do corpo, a ordem
     não importa e o visual é idêntico. */
  const _wickPaths = new Map();
  drawView.forEach((d,i)=>{
    const cx = x(slotOffset + i);
    const up = d.close >= d.open;
    let col = up ? candleBullColor : candleBearColor;
    if(window.DVLVolume && typeof window.DVLVolume.candleColorFor === "function"){
      const _dvlVolCol = window.DVLVolume.candleColorFor(d);
      if(_dvlVolCol) col = _dvlVolCol;
    }
    if(window.DVLArionZoneProfile && typeof window.DVLArionZoneProfile.candleColorFor === "function"){
      const _dvlArionCol = window.DVLArionZoneProfile.candleColorFor(d);
      if(_dvlArionCol) col = _dvlArionCol;
    }
    const yo = y(d.open), yc = y(d.close);
    const topv = Math.min(yo,yc);
    const bottom = Math.max(yo,yc);
    const bodyH = Math.max(1.5,bottom-topv);

    // DVL Beta 0.922 — Slot Stability Fix.
    // Normal/hollow candles use the legacy renderer directly to keep fluid TV-like movement.
    // The new Render Bridge remains reserved for footprint candles, where the wider/detail
    // profile is actually useful.
    try{
      const __dvlUseRenderBridge =
        candleMode === "footprint" ||
        window.DVL_FORCE_CANDLE_RENDER_BRIDGE === true;

      if(__dvlUseRenderBridge && window.DVL_CANDLE_RENDER_BRIDGE && typeof window.DVL_CANDLE_RENDER_BRIDGE.drawCandle === "function"){
        const rendered = window.DVL_CANDLE_RENDER_BRIDGE.drawCandle(ctx, {
          candle:d,
          index:i,
          slot:slotOffset + i,
          cx,
          up,
          col,
          y,
          yo,
          yc,
          topv,
          bottom,
          bodyH,
          candleW,
          candleMode,
          candleBullColor,
          candleBearColor
        });
        if(rendered) return;
      }
    }catch(_){}

    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 1.2;
    // pavio → batch por cor (só fora do corpo; desenhado após o loop)
    { let _wp = _wickPaths.get(col); if(!_wp){ _wp = new Path2D(); _wickPaths.set(col, _wp); }
      _wp.moveTo(cx, y(d.high)); _wp.lineTo(cx, topv);
      _wp.moveTo(cx, bottom);    _wp.lineTo(cx, y(d.low)); }

    if(candleMode === "hollow"){
      /* Hollow p/ AMBOS os lados: corpo vazio (fundo do gráfico) + borda na cor
         direcional (col já é verde/vermelho). Vale pra compra e venda. */
      ctx.fillStyle = "rgba(2,8,6,.92)";
      ctx.fillRect(cx-candleW/2, topv, candleW, bodyH);
      ctx.strokeRect(cx-candleW/2, topv, candleW, Math.max(1, bodyH));
    } else if(candleMode === "footprint"){
      const left = cx - candleW / 2;
      const _fpd = window._dvlFpCache && window._dvlFpCache.get(d.time);
      const _buyRatio = (_fpd && _fpd.total > 0) ? Math.max(.05, Math.min(.95, _fpd.b / _fpd.total)) : (up ? .62 : .38);
      const buyW = candleW * _buyRatio;
      const sellW = candleW - buyW;
      ctx.fillStyle = hexToRgba(candleBearColor, .72);
      ctx.fillRect(left, topv, sellW, bodyH);
      ctx.fillStyle = hexToRgba(candleBullColor, .72);
      ctx.fillRect(left + sellW, topv, buyW, bodyH);
      ctx.strokeStyle = col;
      ctx.strokeRect(left, topv, candleW, bodyH);
      if(bodyH > 9 && candleW > 3.5){
        ctx.strokeStyle = "rgba(2,8,6,.55)";
        ctx.lineWidth = .65;
        ctx.beginPath();
        ctx.moveTo(left, topv + bodyH * .33);
        ctx.lineTo(left + candleW, topv + bodyH * .33);
        ctx.moveTo(left, topv + bodyH * .66);
        ctx.lineTo(left + candleW, topv + bodyH * .66);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = col;
      ctx.fillRect(cx-candleW/2, topv, candleW, bodyH);
    }
  });
  /* Beta 1.554 — desenha todos os pavios agrupados por cor (2 strokes no lugar
     de centenas). lineWidth 1.2 (igual ao inline antigo). */
  ctx.lineWidth = 1.2;
  _wickPaths.forEach((p, c)=>{ ctx.strokeStyle = c; ctx.stroke(p); });

  /* DVL Dominant Wick Candles — camada VISUAL derivada: transforma candles
     elegíveis (volume > média) trocando o maior pavio pelo corpo. Desenhado
     AQUI, logo após os candles, pra "Replace" cobrir o candle original. Não
     altera o OHLCV base. */
  if(window.DVLDominantWickCandlesDraw){
    try{window.DVLDominantWickCandlesDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlDwc_e){}
  }

  /* DVL Bubbles — desenhado AQUI, DEPOIS dos corpos/pavios das velas, pra ficar
     SOBREPOSTO aos candles (requisito do usuário). */
  if(window.DVLBubblesDraw){
    try{window.DVLBubblesDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,priceBottom,priceH});}catch(_dvlBub_e){}
  }

  /* DVL Deep Heatmap — camada de FRENTE (sobre as velas): marcadores de consumo
     confirmado (▲ compra→ASK / ▼ venda→BID), retiradas e bubbles do próprio motor. */
  if(window.DVLDeepHeatmapForegroundDraw){
    try{window.DVLDeepHeatmapForegroundDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlDHFg_e){}
  }
  if(window.DVLDeepHeatmapLevelsDraw){
    try{window.DVLDeepHeatmapLevelsDraw(ctx,{view,drawView,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlDHLv_e){}
  }

  /* Beta 1.554 — triângulos de COMPRA/VENDA dos "vzinhos" do RSI de exaustão.
     Só quando o Exhaustion RSI está ligado. Os sinais (pivôs do RSI nas zonas)
     vêm de __dvlRsiVSignals, publicados pelo próprio oscilador. Verde/cima =
     compra (abaixo da mínima), vermelho/baixo = venda (acima da máxima). */
  try{
    if(window.DVLExhaustionRSI && typeof window.DVLExhaustionRSI.on === "function" && window.DVLExhaustionRSI.on() && window.__dvlRsiVSignals){
      const _rsiSig = window.__dvlRsiVSignals;
      const _rsiCol = window.__dvlRsiVColors || {up:"#10df77", down:"#ff4a61"};
      const _tS = Math.max(4, Math.min(9, candleW * 0.55));
      const _gap = 6;
      ctx.save();
      ctx.globalAlpha = 0.96;
      for(let _ti=0; _ti<drawView.length; _ti++){
        const _d = drawView[_ti]; const _s = _rsiSig[_d.time]; if(!_s) continue;
        const _cx = x(slotOffset + _ti);
        ctx.beginPath();
        if(_s === "up"){                       // compra → triângulo pra cima, abaixo da mínima
          const _ay = y(_d.low) + _gap, _by = _ay + _tS * 1.5;
          ctx.moveTo(_cx, _ay); ctx.lineTo(_cx - _tS, _by); ctx.lineTo(_cx + _tS, _by);
          ctx.fillStyle = _rsiCol.up;
        } else {                               // venda → triângulo pra baixo, acima da máxima
          const _ay = y(_d.high) - _gap, _by = _ay - _tS * 1.5;
          ctx.moveTo(_cx, _ay); ctx.lineTo(_cx - _tS, _by); ctx.lineTo(_cx + _tS, _by);
          ctx.fillStyle = _rsiCol.down;
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }catch(_){}
  /* Beta 0.875: DVL Volume Trace removido do draw engine. */
if(window.DVLMovingAveragesDraw){
    window.DVLMovingAveragesDraw(ctx, {
      view,
      drawView,
      win,
      x,
      y,
      x0,
      x1,
      y0,
      y1,
      slotOffset,
      candleW,
      priceBottom,
      priceH
    });
  }

  if(window.DVLVwapSessionDraw){
    try{ window.DVLVwapSessionDraw(ctx, { view, drawView, win, x, y, x0, x1, y0, y1, slotOffset, candleW, priceBottom, priceH }); }catch(_dvlVwap_e){}
  }

  if(window.DVLSplineQuantChannelDraw){
    try{ window.DVLSplineQuantChannelDraw(ctx, { view, drawView, win, x, y, x0, x1, y0, y1, slotOffset, candleW, priceBottom, priceH }); }catch(_dvlSQ_e){}
  }

  if(window.DVLLiquidityBandsDraw){
    try{ window.DVLLiquidityBandsDraw(ctx, { view, drawView, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, priceBottom, priceH, symbol }); }catch(_dvlLB_e){}
  }

  /* DVL_BODY_REVERSAL_SCOUT_DRAW_1651: orange watch marker after closed 15s/30s body
     exhaustion. This hook is intentionally isolated from candle ownership. */
  if(window.DVLBodyReversalScoutDraw){
    try{ window.DVLBodyReversalScoutDraw(ctx, { view, drawView, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, priceBottom, priceH, symbol }); }catch(_dvlBrs_e){}
  }

  if(window.DVLHLinesDraw){
    try{ window.DVLHLinesDraw(ctx, { x, y, x0, x1, y0, y1, min, max, symbol }); }catch(_dvlHl_e){}
  }

  if(window.DVLVolumeProfileDraw){
    window.DVLVolumeProfileDraw(ctx, {
      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, symbol
    });
  }
  if(window.DVLFixedRangeVPDraw){
    window.DVLFixedRangeVPDraw(ctx, {
      view, win, x, y, x0, x1, y0, y1, slotOffset, candleW, min, max, symbol
    });
  }
  if(window.DVLGEXLevelsDraw){
    try{window.DVLGEXLevelsDraw(ctx,{view,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,symbol});}catch(_dvlGex_e){}
  }
  /* Risk Express/Engine — POR ÚLTIMO: prioridade máxima, labels nunca cobertos. */
  if(window.DVLRiskLinesDraw){
    try{window.DVLRiskLinesDraw(ctx,{view,win,x,y,x0,x1,y0,y1,slotOffset,candleW:candleW,min,max,priceBottom,priceH,symbol});}catch(_dvlRiskLn_e){}
  }
  /* Lab (X-Ray) — overlay opt-in; só desenha quando a aba Lab está aberta. Só lê
     cache (o motor roda em timer próprio), então não pesa no render. */
  if(window.DVLXRayLabDraw){
    try{ window.DVLXRayLabDraw(ctx,{view,win,x,y,x0,x1,y0,y1,slotOffset,candleW,min,max,priceBottom,priceH,symbol}); }catch(_dvlLab_e){}
  }
  /* Beta 0.875: DVL Flow Event Bubbles removido do draw engine. */
ctx.restore();

  /* Beta 1.598 — ORDEM da escala:
     1) pílulas dos indicadores (VWAP/POC/VAH/VAL/PD/W/níveis/média) — retornam as
        faixas ocupadas;
     2) faixa da pílula do preço ao vivo;
     3) números CINZAS da escala, PULANDO qualquer faixa ocupada (não sobrepõem
        mais os labels);
     4) pílula do preço por cima. */
  const tagText = fmtPrice(last);
  const timerText = candleCloseTimerText();
  const liveTagW = Math.max(54, Math.min(PRICE_LABEL_W, w - 4));
  const liveTagH = DVL_SCALE_LABEL_H;
  const liveTx = Math.max(1, Math.min(x1 + Math.max(0, (PRICE_SCALE_W - liveTagW) / 2), w - liveTagW - 1));
  const liveTy = Math.max(y0 + 2, Math.min(y1 - liveTagH - 2, (Number.isFinite(ly)?ly:y0) - liveTagH / 2));

  /* pílulas dos indicadores são de-colididas DESVIANDO da faixa da pílula do preço
     (âncora) — assim nenhum label é coberto/esvaziado pela pílula do preço. */
  const __occ = drawRegisteredScaleLabels(ctx, x1, y0, y1, w, min, max, y, liveTy + liveTagH/2) || [];
  __occ.push([liveTy, liveTy + liveTagH]);

  ctx.font = "11.5px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(165,170,168,.72)";
  const scaleTextX = x1 + PRICE_SCALE_W / 2;
  for(let i=0;i<=11;i++){
    const val = max - (max-min)*i/11;
    const __ty = y(val);
    let __blk = false;
    for(let r=0;r<__occ.length;r++){ if(__ty > __occ[r][0]-2 && __ty < __occ[r][1]+2){ __blk = true; break; } }
    if(!__blk) ctx.fillText(fmtPrice(val), scaleTextX, __ty);
  }

  {
  {
  roundRect(ctx, liveTx, liveTy, liveTagW, liveTagH, DVL_SCALE_LABEL_RADIUS, true, false, "#10df77");
  ctx.save();
  ctx.beginPath();
  ctx.rect(liveTx + 1, liveTy + 1, liveTagW - 2, liveTagH - 2);
  ctx.clip();
  ctx.fillStyle = "#02120b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  var _dvlFs1416 = DVL_SCALE_LABEL_FONT;
  ctx.font = "900 " + _dvlFs1416 + "px system-ui";
  while(_dvlFs1416 > 7 && ctx.measureText(tagText).width > liveTagW - 8){
    _dvlFs1416 -= .5;
    ctx.font = "900 " + _dvlFs1416 + "px system-ui";
  }
  ctx.fillText(tagText, liveTx + liveTagW / 2, liveTy + 8);
  ctx.font = "800 9px system-ui";
  ctx.globalAlpha = .75;
  ctx.fillText(timerText, liveTx + liveTagW / 2, liveTy + 17);
  ctx.globalAlpha = 1;
  ctx.restore();

  }

  }
  if(typeof cfg !== "undefined" && cfg && typeof price !== "undefined" && typeof yy !== "undefined"){

  const priceText = fmtPrice(price);
  const tagW = PRICE_LABEL_W;
  const tagH = DVL_SCALE_LABEL_H;
  const tagX = Math.max(1, Math.min(x1 + Math.max(0, (PRICE_SCALE_W - tagW) / 2), w - tagW - 1));
  const tagY = Math.max(y0 + 2, Math.min(y1 - tagH - 2, yy - tagH / 2));
  const tagCy = tagY + tagH / 2;

  roundRect(ctx, tagX, tagY, tagW, tagH, DVL_SCALE_LABEL_RADIUS, true, false, cfg.color);
  ctx.fillStyle = cfg.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 9px system-ui";
  ctx.fillText(cfg.label, tagX + tagW / 2, tagCy - 5);
  ctx.font = "950 10px system-ui";
  ctx.fillText(priceText, tagX + tagW / 2, tagCy + 5.5);
  ctx.restore();
  }
}

function drawDemoPosition(ctx, {x0, x1, y0, y1, y, last}){
  if(!demoPos) return;
  const {dir, price} = demoPos;
  const ep = Number(price);
  if(!ep) return;
  const py = y(ep);
  if(py < y0 - 10 || py > y1 + 10) return;

  const isLong = dir === 'long';
  const clr = isLong ? '#13dc8d' : '#ff4a61';
  const cur = Number(last || 0);
  const pnlPct = cur && ep ? (cur - ep) / ep * 100 * (isLong ? 1 : -1) : 0;
  const lev = Math.max(1, Math.round(leverage || 1));
  const pnlLev = pnlPct * lev;
  const pLabel = (isLong ? 'LONG' : 'SHORT') + '  ' + fmtPrice(ep)
    + (pnlPct !== 0 ? '   ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%' : '')
    + (pnlPct !== 0 && lev > 1 ? '  ' + (pnlLev >= 0 ? '+' : '') + pnlLev.toFixed(1) + '% ×' + lev : '');

  ctx.save();
  ctx.strokeStyle = clr;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = clr;
  ctx.font = '700 8px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.9;
  ctx.fillText(pLabel, x0 + 4, py - 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}


function drawDvlSubpanelBase(ctx, padL, padR, top, h, w, title, subtitle){
  const scaleW = 56;
  const x0 = padL + 14;
  const x1 = w - padR - scaleW;
  const y0 = top + 30;
  const y1 = top + h - 16;
  const right = w - padR - 4;

  ctx.save();

  const grad = ctx.createLinearGradient(0, top, 0, top + h);
  grad.addColorStop(0, "rgba(4,14,28,.72)");
  grad.addColorStop(1, "rgba(2,8,18,.90)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, w, h);

  ctx.strokeStyle = "rgba(64,105,145,.20)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top + .5);
  ctx.lineTo(w, top + .5);
  ctx.stroke();

  ctx.fillStyle = "rgba(223,238,255,.86)";
  ctx.font = "900 9.2px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x0, top + 15);

  if(subtitle){
    ctx.fillStyle = "rgba(127,145,167,.66)";
    ctx.font = "760 7px system-ui";
    ctx.fillText(subtitle, x0, top + 26);
  }

  ctx.strokeStyle = "rgba(64,105,145,.13)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for(let i=0;i<=3;i++){
    const yy = y0 + (y1-y0)*i/3;
    ctx.moveTo(x0, yy);
    ctx.lineTo(x1, yy);
  }
  for(let i=0;i<=4;i++){
    const xx = x0 + (x1-x0)*i/4;
    ctx.moveTo(xx, y0);
    ctx.lineTo(xx, y1);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(64,105,145,.22)";
  ctx.beginPath();
  ctx.moveTo(x1 + 6, y0);
  ctx.lineTo(x1 + 6, y1);
  ctx.stroke();

  ctx.restore();
  return {x0,x1,y0,y1,right,scaleW};
}

function drawDvlScale(ctx, cfg, min, max, formatter, tagValue, tagColor){
  const {x1,y0,y1,right} = cfg;
  ctx.save();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "760 7.4px system-ui";
  ctx.fillStyle = "rgba(148,163,184,.76)";

  for(let i=0;i<=3;i++){
    const v = max - (max-min)*i/3;
    const yy = y0 + (y1-y0)*i/3;
    ctx.fillText(formatter(v), x1 + 11, yy);
  }

  if(Number.isFinite(tagValue)){
    const yTag = y1 - (tagValue-min)/Math.max(max-min,.000001)*(y1-y0);
    const ty = Math.max(y0 + 10, Math.min(y1 - 10, yTag));
    const txt = formatter(tagValue);
    const tw = Math.max(42, Math.min(54, ctx.measureText(txt).width + 13));
    roundRect(ctx, right - tw, ty - 10, tw, 20, 6, true, false, tagColor);
    ctx.fillStyle = "#02120b";
    ctx.textAlign = "center";
    ctx.font = "900 7.6px system-ui";
    ctx.fillText(txt, right - tw/2, ty + .5);
  }

  ctx.restore();
}

function drawOI(ctx,padL,padR,top,h,w){
  const box = drawDvlSubpanelBase(ctx, padL, padR, top, h, w, "<DVL> Open Interest", "Candles · Binance Futures");
  const {x0,x1,y0,y1} = box;
  const data = oiHist.slice(-220);

  ctx.save();

  if(!data.length){
    ctx.fillStyle = "rgba(127,145,167,.70)";
    ctx.font = "800 9px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("loading open interest…", x0, top + h * .55);
    ctx.restore();
    return;
  }

  const latest = Number(data.at(-1)?.value) || 0;
  const first = Number(data[0]?.value) || latest;
  const change = first ? (latest - first) / first * 100 : 0;

  const vals = [];
  data.forEach((d,i)=>{
    const prev = i > 0 ? Number(data[i-1].value) : Number(d.value);
    vals.push(prev, Number(d.value));
  });

  let min = Math.min(...vals), max = Math.max(...vals);
  const r = (max - min) || Math.max(1, max * .002);
  min -= r * .12;
  max += r * .12;

  const x = i => x0 + i / Math.max(data.length - 1, 1) * (x1 - x0);
  const y = v => y1 - (v - min) / Math.max(max - min, 1) * (y1 - y0);

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = change >= 0 ? "rgba(19,220,141,.94)" : "rgba(255,74,97,.94)";
  ctx.font = "900 9px system-ui";
  ctx.fillText(fmtCompact(latest) + "  " + pct(change), x1 - 2, top + 15);

  const cW = Math.max(1.4, Math.min(4.8, (x1 - x0) / Math.max(data.length,1) * .70));

  data.forEach((d,i)=>{
    const open = i > 0 ? Number(data[i-1].value) : Number(d.value);
    const close = Number(d.value);
    const xx = x(i);
    const up = close >= open;
    const col = up ? "#13dc8d" : "#ff4a61";
    const yo = y(open), yc = y(close);
    const topv = Math.min(yo, yc);
    const bh = Math.max(1.1, Math.abs(yc - yo));

    ctx.strokeStyle = col;
    ctx.globalAlpha = .60;
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(xx, topv);
    ctx.lineTo(xx, topv + bh);
    ctx.stroke();

    ctx.globalAlpha = .38;
    ctx.fillStyle = col;
    ctx.fillRect(xx - cW/2, topv, cW, bh);
    ctx.globalAlpha = 1;
  });

  ctx.strokeStyle = "rgba(223,238,255,.62)";
  ctx.lineWidth = 1.12;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const xx=x(i), yy=y(Number(d.value));
    if(i===0) ctx.moveTo(xx,yy);
    else ctx.lineTo(xx,yy);
  });
  ctx.stroke();

  drawDvlScale(ctx, box, min, max, fmtCompact, latest, "#13dc8d");

  ctx.restore();
}

function drawLS(ctx,padL,padR,top,h,w){
  const box = drawDvlSubpanelBase(ctx, padL, padR, top, h, w, "<DVL> Long/Short Ratio", "Accounts · 1.0 baseline");
  const {x0,x1,y0,y1} = box;
  const data = lsHist.slice(-220);

  ctx.save();

  if(!data.length){
    ctx.fillStyle = "rgba(127,145,167,.70)";
    ctx.font = "800 9px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("loading account ratio…", x0, top + h * .55);
    ctx.restore();
    return;
  }

  const ratioOf = d => {
    const r = Number(d.ratio);
    if(Number.isFinite(r) && r > 0) return r;
    const l = Number(d.long), s = Number(d.short);
    return Number.isFinite(l) && Number.isFinite(s) && s ? l/s : 1;
  };

  const last = data.at(-1) || {ratio:1,long:.5,short:.5};
  const ratio = ratioOf(last);
  const longPct = Math.max(0, Math.min(100, (Number(last.long) || 0) * 100));
  const shortPct = Math.max(0, Math.min(100, (Number(last.short) || 0) * 100));

  const vals = data.map(ratioOf).filter(Number.isFinite);
  let min = Math.min(...vals, 1), max = Math.max(...vals, 1);
  const range = (max - min) || .08;
  min = Math.max(0, min - range * .16);
  max = max + range * .16;

  const x = i => x0 + i / Math.max(data.length - 1, 1) * (x1 - x0);
  const y = v => y1 - (v - min) / Math.max(max - min, .000001) * (y1-y0);

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "900 9px system-ui";
  ctx.fillStyle = ratio >= 1 ? "rgba(19,220,141,.94)" : "rgba(255,74,97,.94)";
  ctx.fillText(ratio.toFixed(4), x1 - 2, top + 15);

  ctx.setLineDash([4,4]);
  ctx.strokeStyle = "rgba(148,163,184,.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y(1));
  ctx.lineTo(x1, y(1));
  ctx.stroke();
  ctx.setLineDash([]);

  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, "rgba(19,220,141,.16)");
  grad.addColorStop(.52, "rgba(19,220,141,.02)");
  grad.addColorStop(1, "rgba(255,74,97,.10)");

  ctx.beginPath();
  data.forEach((d,i)=>{
    const xx=x(i), yy=y(ratioOf(d));
    if(i===0) ctx.moveTo(xx,yy);
    else ctx.lineTo(xx,yy);
  });
  ctx.lineTo(x1,y1);
  ctx.lineTo(x0,y1);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.55;
  ctx.strokeStyle = "rgba(19,220,141,.86)";
  ctx.beginPath();
  data.forEach((d,i)=>{
    const xx=x(i), yy=y(ratioOf(d));
    if(i===0) ctx.moveTo(xx,yy);
    else ctx.lineTo(xx,yy);
  });
  ctx.stroke();

  const lx = x(data.length-1), ly = y(ratio);
  ctx.fillStyle = ratio >= 1 ? "#13dc8d" : "#ff4a61";
  ctx.beginPath(); ctx.arc(lx, ly, 3.1, 0, Math.PI*2); ctx.fill();

  const boxW = 92, boxH = 20;
  const bx = Math.max(x0, Math.min(x1 - boxW - 2, lx - boxW - 8));
  const by = Math.max(y0 + 2, Math.min(y1 - boxH - 2, ly - boxH/2));
  roundRect(ctx, bx, by, boxW, boxH, 7, true, false, "rgba(3,10,20,.72)");
  ctx.strokeStyle = "rgba(110,140,130,.22)";
  ctx.strokeRect(bx + .5, by + .5, boxW - 1, boxH - 1);
  ctx.textAlign = "center";
  ctx.font = "850 7.3px system-ui";
  ctx.fillStyle = "rgba(223,238,255,.88)";
  ctx.fillText("L " + longPct.toFixed(1) + "% / S " + shortPct.toFixed(1) + "%", bx + boxW/2, by + boxH/2 + .5);

  drawDvlScale(ctx, box, min, max, v => Number(v).toFixed(4), ratio, ratio >= 1 ? "#13dc8d" : "#ff4a61");

  ctx.restore();
}
function roundRect(ctx,x,y,w,h,r,fill,stroke,color){
  if(color) ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}


function setupChartInteractions(){
  const canvas = els.canvas;
  if(!canvas) return;

  /* Beta 1.554 — cache do retângulo do canvas p/ matar o layout-thrash.
     getBoundingClientRect() força um reflow síncrono; ele era chamado a CADA
     pointermove no pan/zoom/pinch (mouse de alta taxa = dezenas de reflows por
     segundo = arrasto/zoom travado). O rect do canvas só muda em resize, scroll
     ou mudança de layout — então guardamos e invalidamos por evento + um
     ResizeObserver no próprio canvas (pega resize do painel e do divisor do
     oscilador) + validade máxima de 200ms (auto-cura qualquer mudança não
     capturada; no pior caso o rect fica 200ms desatualizado, imperceptível). */
  let _rectCache = null, _rectAt = 0;
  function chartRect(){
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if(_rectCache && (now - _rectAt) < 200) return _rectCache;
    _rectCache = canvas.getBoundingClientRect();
    _rectAt = now;
    return _rectCache;
  }
  function _invalidateChartRect(){ _rectCache = null; }
  try{ window.addEventListener("resize", _invalidateChartRect, {passive:true}); }catch(_){}
  try{ window.addEventListener("scroll", _invalidateChartRect, {passive:true, capture:true}); }catch(_){}
  try{ window.addEventListener("orientationchange", _invalidateChartRect, {passive:true}); }catch(_){}
  try{ if(window.ResizeObserver) new ResizeObserver(_invalidateChartRect).observe(canvas); }catch(_){}

  /* Beta 1.554 — marca "interagindo" p/ o interceptor de glow desligar o
     shadowBlur durante arraste/zoom (ver hook do ctx). Fica true enquanto há
     pan/pinça/zoom acontecendo; ao terminar, volta o glow e repinta uma vez. */
  let _interactEndTimer = 0;
  function _setInteracting(){
    window.__dvlChartInteracting = true;
    if(_interactEndTimer){ clearTimeout(_interactEndTimer); _interactEndTimer = 0; }
  }
  function _endInteracting(delay){
    if(_interactEndTimer) clearTimeout(_interactEndTimer);
    _interactEndTimer = setTimeout(function(){
      window.__dvlChartInteracting = false;
      try{ drawSoon(); }catch(_){}   // repinta COM glow ao soltar
    }, delay || 120);
  }
  try{ window.addEventListener("blur", function(){ _endInteracting(0); }, {passive:true}); }catch(_){}

  function __dvlChartPlotWidth(){
    const rect = chartRect();
    return Math.max(1, rect.width - PRICE_SCALE_W);
  }

  function __dvlRenderSlotSpan(count){
    count = Number(count);
    if(!Number.isFinite(count)) count = chartViewCount;
    return Math.max(1, count - 1);
  }

  function __dvlRenderSlotSpacing(count){
    // DVL Beta 0.928 — render uses x = slot/(totalSlots-1).
    // Pan/pinch must use the same spacing, otherwise the chart feels like it
    // locks candle-by-candle, especially at max zoom and while viewing the past.
    return __dvlChartPlotWidth() / __dvlRenderSlotSpan(count);
  }

  function candleSpacing(){
    return Math.max(1, __dvlRenderSlotSpacing(chartViewCount));
  }
  function isOnPriceScale(cx){
    return cx >= chartRect().right - PRICE_SCALE_W;
  }
  function chartHeightForPrice(){
    const rect = chartRect();
    return Math.max(rect.height - (indicatorsOn ? 36 : 24) - 4, 1);
  }

  // ── Wheel: time-axis zoom + price-scale zoom ──────────────────────────────
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    if(window.__dvlPaperGestureActive||window.__dvlPaperDragLock) return;
    _setInteracting(); _endInteracting(180);   // glow off durante o zoom, volta 180ms após parar
    const factor = ev.deltaY < 0 ? 0.88 : 1.16;
    if(isOnPriceScale(ev.clientX)) zoomPriceScaleAt(ev.clientY, factor);
    else                            zoomChartAt(ev.clientX, factor);
  }, {passive:false});

  // ── Unified window-capture pointer handling ───────────────────────────────
  // chartPointers (outer scope Map) tracks all active chart pointers.
  // _pinch is the incremental pinch state, null when not pinching.
  var _pinch = null;

  /* DVL Beta 0.877 — Ruler V2 input ownership.
     Window-capture chart handlers run before document-capture ruler handlers on mobile.
     When the ruler is active or the touch hits an existing ruler, the chart must release
     pan/zoom/crosshair state and let DVL_BETA_0519_RULER_V2_JS consume the gesture. */
  function dvlRulerV2WantsPointer(ev){
    try{
      if(window.__dvlRulerV2InputLock) return true;

      if(window.DVLRulerV2){
        if(window.DVLRulerV2.mode){
          window.__dvlRulerV2InputLock = true;
          try{ document.documentElement.classList.add("dvl-ruler-v2-active"); }catch(_){}
          return true;
        }

        if(
          typeof window.DVLRulerV2.isPointerOverRuler === "function" &&
          window.DVLRulerV2.isPointerOverRuler(ev.clientX, ev.clientY)
        ){
          window.__dvlRulerV2InputLock = true;
          try{ document.documentElement.classList.add("dvl-ruler-v2-active"); }catch(_){}
          return true;
        }
      }
    }catch(_){}

    return false;
  }

  function dvlResetChartGestureForRuler(){
    try{ clearCrossPressTimer(); }catch(_){}
    try{ chartPointers.clear(); }catch(_){}

    chartDragState = null;
    chartPinchState = null;
    crosshair.active = false;
    crossDragState = null;
    _pinch = null;
  }

  function dvlOscDividerWantsPointer(ev){
    try{
      var ys = window.__dvlDividerYPositions;
      if(!ys || !ys.length) return false;
      var r = chartRect();
      if(ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return false;
      var y = ev.clientY - r.top;
      for(var i=0;i<ys.length;i++){
        if(Math.abs(y - Number(ys[i])) <= 14) return true;
      }
    }catch(_){}
    return false;
  }

  function dvlReplayUIWantsPointer(ev){
    try{
      var t=ev&&ev.target;
      if(t&&t.closest&&t.closest('#dvlReplayBar,#dvlReplayLineHandle,#dvlReplayConfirm,#dvlReplaySettingsBtn,#dvlReplaySpeedMenu')) return true;
      var x=Number(ev&&ev.clientX),y=Number(ev&&ev.clientY);
      if(!isFinite(x)||!isFinite(y)) return false;
      var nodes=document.querySelectorAll('#dvlReplayBar.is-open,#dvlReplayLineHandle,#dvlReplayConfirm.on,#dvlReplaySpeedMenu.is-open');
      for(var i=0;i<nodes.length;i++){
        var n=nodes[i],cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none')continue;
        var r=n.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return true;
      }
      return false;
    }catch(_){ return false; }
  }

  function dvlReplayPointerSet(){
    if(!(window.__DVL_REPLAY_UI_POINTER_IDS instanceof Set)) window.__DVL_REPLAY_UI_POINTER_IDS=new Set();
    return window.__DVL_REPLAY_UI_POINTER_IDS;
  }

  function dvlReplayLineWantsPointer(ev){
    try{
      if(window.__dvlReplayLineDragActive) return true;
      var rp=window.DVLReplay;
      if(!rp||typeof rp.status!=="function") return false;
      var st=rp.status();
      if(!st||!st.active||!st.selecting) return false;
      var lx=window.__DVL_REPLAY_LINE_X, cfg=window.__DVL_DRAWCFG;
      if(lx==null||!cfg) return false;
      var r=chartRect();
      var x=ev.clientX-r.left, y=ev.clientY-r.top;
      var y0=(+cfg.y0||0)-18, y1=(+cfg.y1||r.height)+18;
      return y>=y0&&y<=y1&&Math.abs(x-lx)<=42;
    }catch(_){ return false; }
  }

  function dvlResetChartGestureForReplay(){
    try{ clearCrossPressTimer(); }catch(_){}
    try{ chartPointers.clear(); }catch(_){}
    chartDragState=null;
    chartPinchState=null;
    crosshair.active=false;
    crossDragState=null;
    _pinch=null;
  }

  function _onDown(ev){
    if(dvlReplayUIWantsPointer(ev)){
      dvlReplayPointerSet().add(ev.pointerId);
      window.__dvlReplayUIPointerLock=true;
      dvlResetChartGestureForReplay();
      return; // Replay UI owns this pointer until pointerup/cancel
    }
    if(dvlReplayLineWantsPointer(ev)){
      dvlResetChartGestureForReplay();
      try{ ev.preventDefault(); }catch(_){}
      return; // deixa o evento seguir até o handler do Replay, mas o gráfico não assume o gesto
    }
    /* Beta 1.554 — divider owns this gesture BEFORE chart pan/crosshair.
       The old flow let the window-capture chart handler start a pan first,
       then the canvas divider handler started a resize on top of it. */
    if(dvlOscDividerWantsPointer(ev)){
      try{ clearCrossPressTimer(); }catch(_){}
      try{ chartPointers.delete(ev.pointerId); }catch(_){}
      chartDragState = null;
      chartPinchState = null;
      crosshair.active = false;
      crossDragState = null;
      _pinch = null;
      return;
    }

    if(dvlRulerV2WantsPointer(ev)){
      dvlResetChartGestureForRuler();
      return;
    }

    if(window.__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive) return;
    /* Beta 1.554 — não iniciar pan quando o toque começa numa linha do Risk Engine */
    if(window.__dvlRiskLineDragging || (ev.target && ev.target.closest && ev.target.closest('.dvlRiskGrab'))) return;
    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore UI-originated taps */
    if(chartPointers.size === 0 && window.DVL_TOUCH_GUARD &&
       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;

    // First finger: must land within the canvas bounding rect
    // (ev.target can be an overlay div on top of the canvas, so we check position)
    if(chartPointers.size === 0){
      const _r = chartRect();
      if(ev.clientX < _r.left || ev.clientX > _r.right || ev.clientY < _r.top || ev.clientY > _r.bottom) return;
      chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});

      clearCrossPressTimer();
      crossMovedBeforeHold = false;
      crosshair.active  = false;
      crossDragState    = null;
      crossDismissPending = false;
      crossGestureDownX = ev.clientX;   // origem do gesto — usada p/ classificar tap vs arrasto no _onEnd
      crossGestureDownY = ev.clientY;
      crossVisibleAtDown = !!crosshair.visible;

      const onScale    = isOnPriceScale(ev.clientX);
      const insidePrice = pointInsidePriceArea(ev.clientX, ev.clientY);

      if(crosshair.visible && insidePrice && !onScale && !(window.__dvlDesktopHoverCrosshair && ev.pointerType === "mouse")){
        if(ev.pointerType === "mouse"){
          // Desktop (sem hover): mantém arrastar o crosshair.
          crosshair.active = true;
          crossDragState = {
            startPointerX: ev.clientX, startPointerY: ev.clientY,
            startCrossX: crosshair.x, startCrossY: crosshair.y,
            moved: false, fromVisibleCross: true
          };
          chartDragState = null;
          return;
        }
        // Touch: NÃO agarra o crosshair. Marca p/ dispensá-lo e segue para o
        // setup de pan abaixo — tap dispensa, swipe dá pan e dispensa. Se o dedo
        // ficar parado 240ms, o timer abaixo reativa o crosshair p/ leitura.
        crossDismissPending = true;
      }

      chartDragState = {
        x: ev.clientX, y: ev.clientY,
        offset: chartOffsetCandles, priceCenter: priceViewCenter,
        priceRange: priceViewRange, onScale
      };

      if(!onScale && insidePrice && ev.pointerType !== "mouse"){
        crossPressTimer = setTimeout(() => {
          if(!crossMovedBeforeHold && chartPointers.has(ev.pointerId)){
            crossDismissPending = false; // segurou p/ ler: não dispensa o crosshair
            crosshair.active = true;
            const rect = chartRect();
            crossDragState = {
              startPointerX: ev.clientX, startPointerY: ev.clientY,
              startCrossX: crosshair.visible ? crosshair.x : ev.clientX - rect.left,
              startCrossY: crosshair.visible ? crosshair.y : ev.clientY - rect.top,
              moved: false, fromVisibleCross: crosshair.visible
            };
            chartDragState = null;
            if(!crosshair.visible){
              setCrosshairFromClient(ev.clientX, ev.clientY);
              crossDragState.startCrossX = crosshair.x;
              crossDragState.startCrossY = crosshair.y;
            } else {
              drawSoon();
            }
          }
        }, 400); // long-press deliberado; taps rápidos (<400ms) não invocam o crosshair
      }
      return;
    }

    // Additional finger → pinch
    if(chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if(chartPointers.size === 2){
      clearCrossPressTimer();
      crossMovedBeforeHold = true;
      const pts = Array.from(chartPointers.values());
      _pinch = {
        lastDist: Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y)),
        lastMidX: (pts[0].x+pts[1].x)/2
      };
      chartPinchState = _pinch;
      chartDragState  = null;
    }
    ev.stopImmediatePropagation();
  }

  function _onMove(ev){
    if(dvlReplayPointerSet().has(ev.pointerId)){
      dvlResetChartGestureForReplay();
      return;
    }
    if(window.__dvlReplayLineDragActive){
      dvlResetChartGestureForReplay();
      try{ ev.preventDefault(); }catch(_){}
      return;
    }
    if(dvlRulerV2WantsPointer(ev)){
      dvlResetChartGestureForRuler();
      return;
    }

    if(window.__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive) return;
    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore untracked UI pointers */
    if(!chartPointers.has(ev.pointerId) && window.DVL_TOUCH_GUARD &&
       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;
    if(!chartPointers.has(ev.pointerId)) return;
    chartPointers.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    if(chartDragState || _pinch || crossDragState) _setInteracting();  // glow off durante pan/pinça/crosshair-drag

    // Pinch mode — incremental damped zoom + midpoint pan (legacy DVL feel)
    if(_pinch && chartPointers.size >= 2){
      clearCrossPressTimer();
      ev.stopImmediatePropagation();
      const pts  = Array.from(chartPointers.values());
      const nd   = Math.max(1, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
      const midX = (pts[0].x+pts[1].x)/2;
      const raw    = _pinch.lastDist / nd;
      const factor = clamp(1 + (raw-1)*0.72, 0.88, 1.12);
      const rect   = chartRect();
      const pw     = Math.max(1, rect.width - PRICE_SCALE_W);
      const xRatio = clamp((midX - rect.left) / pw, 0, 1);
      const oldCount    = chartViewCount;
      const rightAnchor = chartOffsetCandles + (1 - xRatio) * __dvlRenderSlotSpan(oldCount);
      chartViewCount    = clamp(oldCount * factor, minViewCandles(), maxViewCandles());
      chartViewCount    = __dvlStableViewCountForMode(chartViewCount, candleMode);
      chartOffsetCandles = rightAnchor - (1 - xRatio) * __dvlRenderSlotSpan(chartViewCount);
      const spacing = __dvlRenderSlotSpacing(chartViewCount);
      chartOffsetCandles += ((midX - _pinch.lastMidX) / Math.max(spacing, 0.001)) * CHART_DRAG_SENSITIVITY;
      clampChartViewport();
      drawSoon();
      _pinch.lastDist = nd;
      _pinch.lastMidX = midX;
      return;
    }

    // Crosshair drag
    if(crosshair.active && crossDragState){
      const dx = ev.clientX - crossDragState.startPointerX;
      const dy = ev.clientY - crossDragState.startPointerY;
      if(Math.hypot(dx, dy) > 3) crossDragState.moved = true;
      if(crossDragState.moved) moveCrosshairByDelta(dx, dy);
      return;
    }

    // Chart / price-scale drag
    if(chartDragState){
      const dx = ev.clientX - chartDragState.x;
      const dy = ev.clientY - chartDragState.y;
      if(Math.hypot(dx, dy) > 16){ // tolerância maior: dedo parado tremendo não cancela o long-press
        crossMovedBeforeHold = true; clearCrossPressTimer();
        if(crossDismissPending){ crossDismissPending = false; hideCrosshair(); } // swipe: crosshair some e vira pan
      }
      if(chartDragState.onScale){
        if(Number.isFinite(chartDragState.priceRange)){
          const zf = Math.exp(dy * 0.0075);
          priceViewRange  = clamp(chartDragState.priceRange * zf, 0.0000001, chartDragState.priceRange * 1e6);
          priceViewCenter = chartDragState.priceCenter;
          priceScaleLocked = true;
        }
      } else {
        chartOffsetCandles = chartDragState.offset + (dx / candleSpacing()) * CHART_DRAG_SENSITIVITY;
        if(Number.isFinite(chartDragState.priceCenter) && Number.isFinite(priceViewRange)){
          priceViewCenter = chartDragState.priceCenter + dy * (priceViewRange / chartHeightForPrice()) * PRICE_DRAG_SENSITIVITY;
          priceScaleLocked = true;
        }
      }
      clampChartViewport();
      drawSoon();
    }
  }

  function _onEnd(ev){
    if(dvlReplayPointerSet().has(ev.pointerId)){
      dvlReplayPointerSet().delete(ev.pointerId);
      if(!dvlReplayPointerSet().size) window.__dvlReplayUIPointerLock=false;
      dvlResetChartGestureForReplay();
      return;
    }
    if(window.__dvlReplayLineDragActive){
      dvlResetChartGestureForReplay();
      try{ ev.preventDefault(); }catch(_){}
      return;
    }
    _endInteracting(120);   // soltou → repinta com glow
    if(dvlRulerV2WantsPointer(ev)){
      dvlResetChartGestureForRuler();
      return;
    }

    if(window.__dvlPaperGestureActive||window.__dvlPaperDragLock) return;
    /* DVL_CHART_TOUCH_GUARD_INTEGRATION_0639 — ignore untracked UI pointers */
    if(!chartPointers.has(ev.pointerId) && window.DVL_TOUCH_GUARD &&
       window.DVL_TOUCH_GUARD.shouldBlockChartPointer(ev)) return;
    if(!chartPointers.has(ev.pointerId)) return;
    chartPointers.delete(ev.pointerId);

    // Pinch ended — reset and give remaining finger a fresh drag baseline
    if(_pinch){
      if(chartPointers.size < 2){
        _pinch = null;
        chartPinchState = null;
        if(chartPointers.size === 1){
          const rem = chartPointers.values().next().value;
          chartDragState = {
            x: rem.x, y: rem.y,
            offset: chartOffsetCandles,
            priceCenter: priceViewCenter, priceRange: priceViewRange,
            onScale: false
          };
        } else {
          chartDragState = null;
        }
      }
      clearCrossPressTimer();
      crosshair.active = false;
      crossDragState   = null;
      return;
    }

    // Tap detection
    const insidePrice   = pointInsidePriceArea(ev.clientX, ev.clientY);
    const wasTap        = chartDragState && !chartDragState.onScale &&
                          !crossMovedBeforeHold && insidePrice;
    const crossTapToHide = crosshair.visible && insidePrice && !dvlDrawingModeActive() &&
      ((crosshair.active && crossDragState && crossDragState.fromVisibleCross && !crossDragState.moved) ||
       (wasTap && chartPointers.size === 0));

    // Se o crosshair JÁ estava na tela quando o dedo encostou, QUALQUER toque no
    // touch (tap, tap torto, arrasto curto ou longo) dispensa — sem depender de
    // limiar de movimento nem do timer de hold, que deixavam ele "grudado".
    // Para reposicionar o crosshair, é só dar long-press de novo.
    const dismissVisibleCross = crossVisibleAtDown && crosshair.visible &&
      ev.pointerType !== "mouse" && !dvlDrawingModeActive();

    clearCrossPressTimer();

    if(crossTapToHide || dismissVisibleCross){
      hideCrosshair();
    } else if(crossDismissPending && !crosshair.active){
      hideCrosshair();   // touch: tap no crosshair visível → some
    } else if(ev.pointerType === "mouse" && wasTap && !crosshair.active && chartPointers.size === 0 && !crosshair.visible && !dvlDrawingModeActive()){
      // No touch o crosshair aparece SÓ no long-press (click+hold); um tap simples
      // não o invoca mais. No desktop (mouse) o clique ainda posiciona.
      setCrosshairFromClient(ev.clientX, ev.clientY);
    }

    crosshair.active = false;
    crossDragState   = null;
    crossDismissPending = false;
    if(chartPointers.size < 2) chartPinchState = null;
    if(chartPointers.size === 0) chartDragState = null;
  }

  window.addEventListener("pointerdown",   _onDown, {capture:true, passive:false});
  window.addEventListener("pointermove",   _onMove, {capture:true, passive:false});
  window.addEventListener("pointerup",     _onEnd,  {capture:true});
  window.addEventListener("pointercancel", _onEnd,  {capture:true});
}

setupChartInteractions();

function setupChartMiniControls(){

  if(els.candleTypeBtn){
    els.candleTypeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleCandleTypeMenu();
    });
  }

  if(els.candleTypeOptions){
    els.candleTypeOptions.forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setCandleMode(btn.dataset.candleMode);
      });
    });
  }

  document.addEventListener("click", (ev) => {
    if(els.candleTypeWrap && !els.candleTypeWrap.contains(ev.target)){
      closeCandleTypeMenu();
    }
  });

  if(els.autoScaleBtn){
    els.autoScaleBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      autoScaleCurrent20();
    });
  }

  if(els.chartSettingsBtn){
    els.chartSettingsBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setChartSettings(!chartSettingsOpen);
    });
  }

  if(els.chartSettingsPanel){
    els.chartSettingsPanel.addEventListener("click", ev => ev.stopPropagation());
  }

  document.addEventListener("click", () => {
    if(chartSettingsOpen) setChartSettings(false);
  });

  if(els.gridToggle){
    els.gridToggle.addEventListener("change", () => {
      gridOn = els.gridToggle.checked;
      drawSoon();
    });
  }

  if(els.sessionsToggle){
    els.sessionsToggle.addEventListener("change", () => {
      sessionsOn = els.sessionsToggle.checked;
      drawSoon();
    });
  }

  if(els.toolMagnetToggle){
    els.toolMagnetToggle.addEventListener("change", () => {
      toolMagnetOn = !!els.toolMagnetToggle.checked;
      try{ localStorage.setItem("DVL_TOOL_MAGNET_ON", toolMagnetOn ? "1" : "0"); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("dvl-tool-magnet-change", { detail:{ enabled:toolMagnetOn } })); }catch(_){}
      drawSoon();
    });
  }

  if(els.sessionCountInput){
    els.sessionCountInput.addEventListener("input", () => setVisibleSessionCount(els.sessionCountInput.value));
    els.sessionCountInput.addEventListener("change", () => setVisibleSessionCount(els.sessionCountInput.value));
  }

  if(els.sessionDecBtn){
    els.sessionDecBtn.addEventListener("click", () => setVisibleSessionCount(visibleSessionCount - 1));
  }

  if(els.sessionIncBtn){
    els.sessionIncBtn.addEventListener("click", () => setVisibleSessionCount(visibleSessionCount + 1));
  }

  if(els.sessionChecks){
    els.sessionChecks.forEach(input => {
      input.addEventListener("change", () => {
        sessionActive[input.dataset.session] = input.checked;
        drawSoon();
      });
    });
  }

  // Sync checkboxes to loaded settings (after loadAppSettings() ran at startup)
  try{ if(localStorage.getItem("DVL_TOOL_MAGNET_ON") === "0") toolMagnetOn = false; }catch(_){}
  if(els.sessionsToggle) els.sessionsToggle.checked = !!sessionsOn;
  if(els.toolMagnetToggle) els.toolMagnetToggle.checked = !!toolMagnetOn;
  if(els.sessionChecks) els.sessionChecks.forEach(inp => { if(typeof sessionActive[inp.dataset.session]==="boolean") inp.checked = sessionActive[inp.dataset.session]; });

  const dvlSaveSettingsBtn = document.getElementById("dvlSaveSettingsBtn");
  if(dvlSaveSettingsBtn){
    dvlSaveSettingsBtn.addEventListener("click", ()=>{
      saveAppSettings();
      dvlSaveSettingsBtn.textContent = "Salvo \u2713";
      dvlSaveSettingsBtn.style.color = "#f3c768";
      setTimeout(()=>{ dvlSaveSettingsBtn.textContent = "Salvar configura\u00e7\u00f5es"; dvlSaveSettingsBtn.style.color = "#13dc8d"; }, 1800);
    });
  }

  if(els.bullColorBtn){
    els.bullColorBtn.addEventListener("click", () => setCandleColorTarget("bull"));
  }

  if(els.bearColorBtn){
    els.bearColorBtn.addEventListener("click", () => setCandleColorTarget("bear"));
  }

  if(els.presetColorBtns){
    els.presetColorBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.presetColor;
        if(candleColorTarget === "bear") candleBearColor = color;
        else candleBullColor = color;
        syncColorPickerSliders();
        updateColorChips();
        drawSoon();
      });
    });
  }

  [els.colorHueRange, els.colorSatRange, els.colorLightRange].forEach(input => {
    if(input) input.addEventListener("input", applySiteColorFromSliders);
  });

  setVisibleSessionCount(visibleSessionCount);
  updateColorChips();
  closeSiteColorPicker();
}

setupChartMiniControls();

/* DVL Beta 1.554 — live-data render gate.
   Market-data updates always mutate the candle/ticker state immediately, but
   full canvas/oscillator painting is coalesced and deferred while the user is
   panning or zooming. UI actions still call drawSoon() directly. */
let __dvlLiveRenderTimer1204 = 0;
let __dvlLiveRenderPending1204 = false;
let __dvlLiveRenderLast1204 = 0;
let __DVL_LIVE_RENDER_GAP_1204 = 33;   // Beta 1.554 — ADAPTATIVO (16–60ms): ajustado pelo custo real do render

function __dvlFlushLiveRender1204(force){
  if(document.hidden){ __dvlLiveRenderPending1204 = true; return; }
  if(window.__dvlChartInteracting && !force){
    __dvlLiveRenderPending1204 = true;
    clearTimeout(__dvlLiveRenderTimer1204);
    __dvlLiveRenderTimer1204 = setTimeout(function(){ __dvlFlushLiveRender1204(false); }, 80);
    return;
  }
  const now = performance.now();
  const wait = force ? 0 : Math.max(0, __DVL_LIVE_RENDER_GAP_1204 - (now - __dvlLiveRenderLast1204));
  if(wait > 0){
    __dvlLiveRenderPending1204 = true;
    clearTimeout(__dvlLiveRenderTimer1204);
    __dvlLiveRenderTimer1204 = setTimeout(function(){ __dvlFlushLiveRender1204(false); }, wait);
    return;
  }
  __dvlLiveRenderPending1204 = false;
  __dvlLiveRenderLast1204 = now;
  drawSoon();
}

function requestLiveChartRender(force){
  /* Beta 1.554 — CAMINHO RÁPIDO tick-a-tick (spec §10). Antes o live passava por
     um setTimeout com "gap adaptativo" (16–60ms) ANTES do requestAnimationFrame,
     o que adicionava latência e deixava a vela "aos saltos". Agora vai DIRETO pro
     rAF (drawSoon), que já coalesce em 1 frame por refresh e mede o custo — então
     a vela anda no próximo frame, sem gap extra, e não sobrecarrega (no máximo 1
     draw por frame). Durante pan/zoom, adia (não brigar com a interação). */
  if(document.hidden){ __dvlLiveRenderPending1204 = true; return; }
  if(window.__dvlChartInteracting && !force){
    __dvlLiveRenderPending1204 = true;
    clearTimeout(__dvlLiveRenderTimer1204);
    __dvlLiveRenderTimer1204 = setTimeout(function(){ __dvlLiveRenderPending1204=false; if(!window.__dvlChartInteracting) drawSoon(); }, 80);
    return;
  }
  __dvlLiveRenderPending1204 = false;
  __dvlLiveRenderLast1204 = (typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
  drawSoon();
}
window.DVL_REQUEST_LIVE_CHART_RENDER_1204 = requestLiveChartRender;

document.addEventListener("visibilitychange", function(){
  if(!document.hidden && __dvlLiveRenderPending1204) __dvlFlushLiveRender1204(true);
}, {passive:true});

let __dvlLastChartPrice1204 = NaN;
let __dvlLastChartPriceAt1204 = 0;
function publishDvlChartPrice1204(price, source, time){
  source = String(source||'chart');
  if(window.__DVL_REPLAY_ACTIVE && source.indexOf('replay')!==0) return;
  price = Number(price);
  if(!(price > 0)) return;
  const now = Number(time) || Date.now();
  if(price === __dvlLastChartPrice1204 && (now - __dvlLastChartPriceAt1204) < 750) return;
  __dvlLastChartPrice1204 = price;
  __dvlLastChartPriceAt1204 = now;
  const detail = {symbol:String(symbol||'').toUpperCase(), price:price, time:now, source:String(source||'chart')};
  try{ if(window.DVLRuntime && typeof window.DVLRuntime.emit === 'function') window.DVLRuntime.emit('chart:price', detail); }catch(_){}
  try{ window.dispatchEvent(new CustomEvent('dvl:chart-price', {detail:detail})); }catch(_){}
}
window.DVL_PUBLISH_CHART_PRICE_1204 = publishDvlChartPrice1204;

window.addEventListener("resize", drawSoon, {passive:true});
new ResizeObserver(drawSoon).observe(document.querySelector(".canvasWrap"));

/* Paint the header (asset icon + symbol text) with the RESTORED symbol
   synchronously here — before loadAll()'s async work and therefore before the
   browser's first paint. Otherwise the static BTC/USDT default in the HTML is
   shown first and then overwritten with the saved asset, flashing the old
   logo. updateHeader is idempotent on the icon, so this is a one-time paint. */
try{ if(typeof updateHeader==="function") updateHeader(); }catch(_){}
loadAll();
refreshAssetTickers(true);

/* DVL Beta 1.554 — feed lifecycle instead of permanent full reloads.
   The old 15 s timer downloaded the whole candle history plus OI/LSR even
   while WebSockets were healthy. This watchdog only recovers a genuinely
   stale/empty feed and only refreshes the all-assets board while it is open. */
let __dvlFullReloadAt1206 = Date.now();
function __dvlPriceAge1206(){
  return __dvlLastChartPriceAt1204 > 0 ? Date.now() - __dvlLastChartPriceAt1204 : Infinity;
}
function __dvlAssetSurfaceOpen1206(){
  return !!(assetDropdownOpen || assetFavoritesOpen);
}
function __dvlMaybeRecoverFeed1206(force){
  if(window.__DVL_REPLAY_ACTIVE) return;
  if(document.hidden || window.__dvlChartInteracting) return;
  const now = Date.now();
  const empty = !Array.isArray(klines) || !klines.length;
  const stale = __dvlPriceAge1206() > 30000;
  if(!(force || empty || stale)) return;
  const minGap = force ? 5000 : 45000;
  if(now - __dvlFullReloadAt1206 < minGap) return;
  __dvlFullReloadAt1206 = now;
  loadAll(true);
}
setInterval(function(){
  if(document.hidden) return;
  if(__dvlAssetSurfaceOpen1206() && Date.now() - __dvlAssetTickerFreshAt1206 > 30000){
    refreshAssetTickers(true);
  }
  __dvlMaybeRecoverFeed1206(false);
}, 5000);
window.addEventListener("online", function(){ __dvlMaybeRecoverFeed1206(true); }, {passive:true});
document.addEventListener("visibilitychange", function(){
  if(!document.hidden){
    if(__dvlAssetSurfaceOpen1206() && Date.now() - __dvlAssetTickerFreshAt1206 > 30000) refreshAssetTickers(true);
    __dvlMaybeRecoverFeed1206(false);
  }
}, {passive:true});

// ── Poll rápido: ticker + última vela a cada 2 s (independente de WebSocket) ──
async function _fastPoll(){
  if(window.__DVL_REPLAY_ACTIVE) return;
  if(!symbol||!klines.length) return;
  try{
    const pollIv = isNativeTimeframe(interval) ? interval : baseIntervalForTimeframe(interval);
    const [tk, kl] = await Promise.all([
      jget(`${BINANCE}/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`).catch(()=>null),
      fetchDvlSpotKlinesProxy(symbol, pollIv, 2).catch(()=>null)
    ]);
    if(window.__DVL_REPLAY_ACTIVE) return; // descarta resposta que chegou depois do Replay iniciar

    // Atualiza ticker e cabeçalho de preço
    if(tk && tk.lastPrice){
      ticker = tk;
      assetTickerMap[symbol] = tk;
      if(!_agAlive()){
        marketEntryPrice = Number(tk.lastPrice)||marketEntryPrice;
        if(els.lastPrice) els.lastPrice.textContent = fmtPrice(+tk.lastPrice);
      }
      const ch = +tk.priceChangePercent||0;
      if(els.changePct){
        els.changePct.textContent = pct(ch);
        els.changePct.style.color = ch>=0?'var(--green)':'var(--red)';
      }
      syncTradePanel();
      if(!_agAlive()) publishDvlChartPrice1204(+tk.lastPrice, 'fast-poll', Date.now());
    }

    // Atualiza última vela (close/high/low)
    if(Array.isArray(kl)&&kl.length){
      const row = kl[kl.length-1];
      const baseT = +row[0];
      const tMs   = intervalMs(interval);
      const targetT = isNativeTimeframe(interval) ? baseT : Math.floor(baseT/tMs)*tMs;
      const last    = klines[klines.length-1];
      if(last && last.time===targetT){
        const h=+row[2], l=+row[3], c=+row[4];
        if(h>last.high) last.high=h;
        if(l<last.low)  last.low=l;
        if(!_agAlive()) last.close=c;
        if(isNativeTimeframe(interval)){
          /* Native REST rows own cumulative volume. Never move it backwards if
             this poll is a little older than the live WebSocket. */
          last.volume=Math.max(Number(last.volume)||0,Number(row[5])||0);
          last.quoteVolume=Math.max(Number(last.quoteVolume)||0,Number(row[7])||0);
          last.buyVolume=Math.max(Number(last.buyVolume)||0,Number(row[9])||0);
          _dvlSyncCandleVolumeAliases1650(last);
        }else{
          _dvlApplyCumulativeVolumeFallback1650(
            String(symbol||"")+"|"+String(pollIv)+"|"+String(baseT),
            row[5],row[7],row[9],last,_agAlive()
          );
        }
        __dvlTraceCandle('poll-REST');
      } else if(last && targetT>last.time && !_agAlive()){
        klines.push({time:targetT,open:+row[1],high:+row[2],low:+row[3],close:+row[4],
                     volume:+row[5],quoteVolume:+row[7]||0,buyVolume:+row[9]||0});
      }
    }

    requestLiveChartRender(false);
  }catch(_){}
}
function __dvlNeedFastPoll1206(){
  if(window.__DVL_REPLAY_ACTIVE) return false;
  if(!klines.length) return true;
  return __dvlPriceAge1206() > 7000;
}
setInterval(function(){
  if(window.__DVL_REPLAY_ACTIVE || document.hidden || window.__dvlChartInteracting || !__dvlNeedFastPoll1206()) return;
  _fastPoll();
}, 5000);
setTimeout(function(){ if(!window.__DVL_REPLAY_ACTIVE && __dvlNeedFastPoll1206()) _fastPoll(); }, 700);
/* Beta 1.554 — removed the unconditional one-second full redraw.
   Live WebSockets, forming-candle fallback, resize, zoom, pan and state changes
   already invalidate the chart. A clock must never repaint every oscillator. */

/* ── Cola a vela em formação no preço ao vivo ────────────────────────────────
   Para ativos só-MEXC (ex.: HYPE) o WS de kline é da Binance e não conecta, e
   o _fastPoll também é Binance — então entre os refreshes de 15s a última vela
   "congela" enquanto o preço ao vivo (fonte MEXC) continua andando. Resultado:
   o marcador verde descola das velas e a escala do eixo fica com o valor velho
   ("demora pra voltar ao normal"). Aqui a gente gruda: dentro da janela da vela
   atual, atualiza close/high/low com o MESMO preço que já é desenhado como
   marcador, e, se a escala estiver travada, expande pra incluí-lo. Para ativos
   da Binance o preço já bate com a vela, então isto vira no-op. */
function _glueFormingCandle(){
  if(window.__DVL_REPLAY_ACTIVE) return;
  if(!klines.length) return;
  /* Beta 1.554 — quando há feed de kline ao vivo (Binance), a vela já vem do
     @aggTrade/@kline; a "cola" com o ticker REST (~2s atrasado) só faria a vela
     piscar. Então vira no-op de fato quando o WS de kline está saudável.
     Segue ativa para ativos sem kline WS (ex.: não-Binance). */
  if((typeof _klWs !== "undefined" && _klWs && _klWs.readyState === 1) ||
     (typeof _nnWs !== "undefined" && _nnWs && _nnWs.readyState === 1)) return;
  const p = Number(ticker?.lastPrice || marketEntryPrice || klines.at(-1)?.close);
  if(!(p > 0)) return;
  const last = klines[klines.length-1];
  if(!last || !(last.close > 0)) return;
  /* Sanidade: ignora preço absurdo (evita a "vela gigante" na troca de ativo,
     quando o ticker do novo ativo poderia cair sobre as velas do antigo). */
  if(Math.abs(p - last.close) / last.close > 0.5) return;
  const step = intervalMs(interval);
  const now = Date.now();
  /* Só mexe na vela EM FORMAÇÃO (nunca numa vela já fechada). */
  if(!(Number.isFinite(last.time) && now >= last.time && now < last.time + step)) return;
  if(p === last.close) return;
  last.close = p;
  if(p > last.high) last.high = p;
  if(p < last.low)  last.low  = p;
  __dvlTraceCandle('glue-ticker');
  /* Escala travada e preço saiu da faixa → expande só o necessário. */
  if(priceScaleLocked && Number.isFinite(priceViewCenter) && Number.isFinite(priceViewRange) && priceViewRange > 0){
    const half = priceViewRange/2, top = priceViewCenter+half, bot = priceViewCenter-half;
    if(p > top || p < bot){
      const nTop = Math.max(top, p), nBot = Math.min(bot, p), pad = (nTop-nBot)*0.08;
      priceViewCenter = ((nTop+pad)+(nBot-pad))/2;
      priceViewRange  = (nTop+pad)-(nBot-pad);
    }
  }
  publishDvlChartPrice1204(p, 'forming-candle', now);
  requestLiveChartRender(false);
}
let __dvlGlueRaf1206 = 0;
window.addEventListener("dvl:chart-price", function(ev){
  if(window.__DVL_REPLAY_ACTIVE) return;
  try{ if(ev && ev.detail && ev.detail.source === "forming-candle") return; }catch(_){}
  if(document.hidden || window.__dvlChartInteracting || __dvlGlueRaf1206) return;
  __dvlGlueRaf1206 = requestAnimationFrame(function(){
    __dvlGlueRaf1206 = 0;
    _glueFormingCandle();
  });
}, {passive:true});

// ── Kline WebSocket: candle em formação em tempo real ───────────────────
let _klWs = null, _klWsSym = null, _klWsIv = null, _klWsLastDraw = 0;
/* Beta 1.554 — watchdog de "socket morto silencioso". Os WS da Binance às vezes
   ficam readyState=OPEN mas param de mandar dados (rede/servidor derrubou sem
   frame de close). O reconnect por readyState<2 não pega isso → o feed congela
   e só volta no F5 (ex.: barras de volume param de nascer). Guardamos o horário
   da última mensagem de cada WS e um watchdog força reconexão se ficar mudo. */
let _klLastMsg = 0, _agLastMsg = 0, _nnLastMsg = 0;

/* Beta 1.554 — aggTrade "vivo" = recebeu negócio nos últimos 5s (agora ele vem
   na conexão combinada, então não dá pra olhar readyState de um socket próprio). */
function _agAlive(){ return (Date.now() - _agLastMsg) < 5000; }

/* ── Instrumentação temporária do candle em formação (Spec Fluidez §17.1) ──────
   Rastreia CADA escrita no OHLC da vela atual + a fonte, e sinaliza quando o
   close diverge do preço real (marketEntryPrice = último @aggTrade) — ou seja, a
   "piscada indo contra o preço". Liga com DVL_CANDLE_DEBUG(true) ou ?candledbg=1
   na URL. 100% leitura/log; não altera o feed. Some no OFF. */
window.__DVL_CANDLE_TRACE = window.__DVL_CANDLE_TRACE || [];
function __dvlTraceCandle(src){
  if(!window.__DVL_CANDLE_DEBUG) return;
  try{
    var last = klines[klines.length-1]; if(!last) return;
    var agg = Number(marketEntryPrice) || 0;
    var dev = agg>0 ? Number((last.close-agg).toFixed(2)) : 0;
    var rec = { src:src, close:+last.close, high:+last.high, low:+last.low, agg:agg, dev:dev, ag:_agAlive(), t:Date.now() };
    var buf = window.__DVL_CANDLE_TRACE; buf.push(rec); if(buf.length>80) buf.shift();
    __dvlCandleDbgPaint();
  }catch(_){}
}
function __dvlCandleDbgPaint(){
  try{
    var el = document.getElementById("dvlCandleDbg1643");
    if(!el){ el=document.createElement("div"); el.id="dvlCandleDbg1643"; el.setAttribute("data-dvl-ui","true");
      el.style.cssText="position:fixed;left:6px;bottom:130px;z-index:99999;background:rgba(2,10,7,.94);color:#bfe9d4;font:700 10px/1.45 monospace;padding:7px 9px;border:1px solid #1c6f4a;border-radius:7px;max-width:78vw;white-space:pre;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.5)";
      document.body.appendChild(el); }
    var buf=window.__DVL_CANDLE_TRACE, agg=(buf.length?buf[buf.length-1].agg:0);
    var lines=buf.slice(-7).map(function(r){
      var contra = (r.agg>0 && Math.abs(r.dev) > r.agg*0.0002) ? ("  ⚠CONTRA "+(r.dev>0?"+":"")+r.dev) : "";
      return (r.src+"       ").slice(0,8)+" c="+r.close+(r.ag?"":" [agOFF]")+contra;
    });
    el.textContent="CANDLE DEBUG · agg(real)="+agg+"\n"+lines.join("\n");
  }catch(_){}
}
window.DVL_CANDLE_DEBUG = function(on){ window.__DVL_CANDLE_DEBUG=!!on; if(!on){ var e=document.getElementById("dvlCandleDbg1643"); if(e&&e.remove) e.remove(); } return "candle debug: "+(!!on); };
window.DVL_CANDLE_DEBUG_REPORT = function(){ return (window.__DVL_CANDLE_TRACE||[]).slice(-40); };
try{ if(/[?&]candledbg=1/.test(location.search)) window.__DVL_CANDLE_DEBUG=true; }catch(_){}

/* DVL_CANDLE_BUCKET_ENGINE_1647_START
   One trade timestamp owns exactly one candle bucket. This is intentionally
   DOM-free so the rollover rules can be tested offline. */
function _dvlFindCandleIndex1647(time){
  for(let i=klines.length-1; i>=0 && i>=klines.length-6; i--){
    if(Number(klines[i] && klines[i].time) === time) return i;
  }
  return -1;
}
/* DVL_LIVE_VOLUME_ENGINE_1650_START
   Keep one canonical numeric volume while exposing the aliases used by newer
   indicator modules. For aggregated TFs, the base kline cumulative volume is
   also a lossless fallback when aggTrade becomes unavailable. */
const __dvlBaseVolumeState1650 = { key:"", volume:0, quoteVolume:0, buyVolume:0 };
function _dvlSyncCandleVolumeAliases1650(candle){
  if(!candle) return candle;
  const volume=Math.max(0,Number(candle.volume ?? candle.v ?? candle.baseVolume)||0);
  candle.volume=volume;
  candle.v=volume;
  candle.baseVolume=volume;
  return candle;
}
function _dvlApplyCumulativeVolumeFallback1650(key, volume, quoteVolume, buyVolume, target, aggLive){
  const s=__dvlBaseVolumeState1650;
  const nextVolume=Math.max(0,Number(volume)||0);
  const nextQuote=Math.max(0,Number(quoteVolume)||0);
  const nextBuy=Math.max(0,Number(buyVolume)||0);
  key=String(key||"");

  if(!key || s.key!==key){
    s.key=key;
    s.volume=nextVolume;
    s.quoteVolume=nextQuote;
    s.buyVolume=nextBuy;
    _dvlSyncCandleVolumeAliases1650(target);
    return {applied:false,bootstrap:true,volumeDelta:0};
  }

  const volumeDelta=Math.max(0,nextVolume-s.volume);
  const quoteDelta=Math.max(0,nextQuote-s.quoteVolume);
  const buyDelta=Math.max(0,nextBuy-s.buyVolume);
  s.volume=nextVolume;
  s.quoteVolume=nextQuote;
  s.buyVolume=nextBuy;

  if(aggLive || !target || !(volumeDelta>0)){
    _dvlSyncCandleVolumeAliases1650(target);
    return {applied:false,volumeDelta:volumeDelta};
  }

  target.volume=(Number(target.volume)||0)+volumeDelta;
  target.quoteVolume=(Number(target.quoteVolume)||0)+quoteDelta;
  target.buyVolume=(Number(target.buyVolume)||0)+Math.min(volumeDelta,buyDelta);
  _dvlSyncCandleVolumeAliases1650(target);
  return {applied:true,volumeDelta:volumeDelta};
}
/* DVL_LIVE_VOLUME_ENGINE_1650_END */
function _dvlApplyLivePriceToBucket1647(price, eventTime, quantity, buyerIsMaker){
  const p = Number(price), time = Number(eventTime), step = Number(intervalMs(interval));
  const q = Math.max(0, Number(quantity) || 0);
  if(!(p>0) || !Number.isFinite(time) || !(step>0) || !klines.length) return {applied:false, reason:"invalid"};
  const stateKey = String(symbol || "").toUpperCase() + "|" + String(interval || "");
  if(window.__DVL_CANDLE_STATE_KEY_1647 && window.__DVL_CANDLE_STATE_KEY_1647 !== stateKey){
    return {applied:false, reason:"state-changing"};
  }
  const bucket = Math.floor(time / step) * step;
  let last = klines[klines.length-1];
  if(bucket < Number(last.time)) return {applied:false, late:true, bucket:bucket};

  let rolled = false;
  if(bucket > Number(last.time)){
    last = { time:bucket, open:p, high:p, low:p, close:p, volume:q, quoteVolume:p*q, buyVolume:buyerIsMaker?0:q };
    klines.push(last);
    rolled = true;
  }else{
    const firstLiveWrite = Number(window.__DVL_LIVE_BUCKET_1647 || 0) !== bucket;
    const historyMarket = String(window.__DVL_CANDLE_HISTORY_MARKET_1647 || "");
    if(firstLiveWrite && historyMarket && historyMarket !== "binance-spot"){
      /* A fallback history came from another exchange. Do not keep its forming
         OHLC and paint Binance Spot trades on top of it. */
      last.open=p; last.high=p; last.low=p; last.close=p;
      last.volume=q; last.quoteVolume=p*q; last.buyVolume=buyerIsMaker?0:q;
    }else{
      last.close=p;
      if(p>last.high) last.high=p;
      if(p<last.low) last.low=p;
      if(q>0){
        last.volume=(Number(last.volume)||0)+q;
        last.quoteVolume=(Number(last.quoteVolume)||0)+p*q;
        if(!buyerIsMaker) last.buyVolume=(Number(last.buyVolume)||0)+q;
      }
    }
  }
  _dvlSyncCandleVolumeAliases1650(last);
  window.__DVL_LIVE_BUCKET_1647 = bucket;
  return {applied:true, rolled:rolled, bucket:bucket, candle:last};
}
function _dvlMergeNativeKline1647(entry, isClosed, aggLive){
  if(!entry || !Number.isFinite(Number(entry.time))) return {applied:false};
  const t = Number(entry.time);
  let targetIndex = _dvlFindCandleIndex1647(t);
  if(targetIndex >= 0){
    const target = klines[targetIndex];
    if(isClosed){
      Object.assign(target, entry);
    }else{
      target.volume=entry.volume; target.quoteVolume=entry.quoteVolume; target.buyVolume=entry.buyVolume;
      if(entry.high>target.high) target.high=entry.high;
      if(entry.low<target.low) target.low=entry.low;
      if(targetIndex===klines.length-1 && !aggLive) target.close=entry.close;
    }
  }else{
    const last = klines.length ? klines[klines.length-1] : null;
    if(!last || t>Number(last.time)){
      klines.push(entry);
      targetIndex=klines.length-1;
      window.__DVL_LIVE_BUCKET_1647=t;
    }
  }
  if(targetIndex>=0) _dvlSyncCandleVolumeAliases1650(klines[targetIndex]);
  return {applied:targetIndex>=0, targetIndex:targetIndex, current:klines.length?klines[klines.length-1]:null};
}
/* DVL_CANDLE_BUCKET_ENGINE_1647_END */


window.DVL_CANDLE_ENGINE_1647 = {
  status:function(){
    const last=klines.length?klines[klines.length-1]:null;
    return {symbol:symbol, interval:interval, candles:klines.length, last:last, aggAgeMs:_agLastMsg?Date.now()-_agLastMsg:null};
  }
};

/* Aplica UM negócio (aggTrade) no bucket do horário real do trade. */
function _applyAggTrade(d, feedIv){
  if(window.__DVL_REPLAY_ACTIVE) return;
  if(!d || d.e!=='aggTrade' || d.s!==(symbol||'BTCUSDT').toUpperCase()) return;
  if(feedIv && String(feedIv) !== String(interval)) return;
  const p=+d.p; if(!(p>0) || !klines.length) return;
  _agLastMsg = Date.now();
  const applied = _dvlApplyLivePriceToBucket1647(p, +d.T || +d.E || Date.now(), +d.q || 0, !!d.m);
  if(!applied.applied) return;
  marketEntryPrice=p;
  __dvlTraceCandle(applied.rolled?'agg-roll':'aggTrade');
  const now=Date.now();
  try{ window.DVL_PERF.tickMs = Math.max(0, now-(+d.T||now)); window.DVL_PERF.wsMs = Math.max(0, now-(+d.E||now)); }catch(_){}
  if(els && els.lastPrice && now-_agLastHdr>100){ _agLastHdr=now; try{ els.lastPrice.textContent=fmtPrice(p); }catch(_){} }
  if(now-_agLastPub>120){ _agLastPub=now; publishDvlChartPrice1204(p,'aggtrade-ws',now); }
  try{ if(window.DVL_TRADE_FEED) window.DVL_TRADE_FEED._emit(d); }catch(_bub){}
  requestLiveChartRender(false);
}

function _klWsConnect(){
  const s  = (symbol  || 'BTCUSDT').toUpperCase();
  const iv = (interval|| '5m');
  if(!isNativeTimeframe(iv)){
    if(_klWs){ try{_klWs.close();}catch(_){} _klWs=null; }
    return;
  }
  if(_klWsSym===s && _klWsIv===iv && _klWs && _klWs.readyState<2) return;
  if(_klWs){ try{ _klWs.close(); }catch(_){} _klWs=null; }
  _klWsSym=s; _klWsIv=iv;
  try{
    /* Beta 1.554 — CONEXÃO COMBINADA kline+aggTrade (spot). O @aggTrade numa
       conexão SEPARADA não entregava dados pra vários usuários (candle só andava
       no ritmo do @kline, ~2/s = "aos saltos", tickMs=0). Juntando os dois no
       MESMO socket (combined stream), o aggTrade anda de carona na conexão do
       kline (que funciona) e a vela se move NEGÓCIO A NEGÓCIO — fluidez real.
       Beta 1.554: spot, não futuros (fstream é geo-bloqueado no BR). */
    const lo = s.toLowerCase();
    _klWs = new WebSocket('wss://stream.binance.com:9443/stream?streams='+lo+'@kline_'+iv+'/'+lo+'@aggTrade');
    _klLastMsg = Date.now();
    _klWs.onmessage = ev => {
      try{
        _klLastMsg = Date.now();
        if(window.__DVL_REPLAY_ACTIVE) return;   // Replay ativo: feed ao vivo não pode contaminar o histórico
        const wrap = JSON.parse(ev.data);
        const d = (wrap && wrap.data) ? wrap.data : wrap;   // combined ({stream,data}) OU cru
        if(!d) return;
        if(d.e === 'aggTrade'){ _applyAggTrade(d, iv); return; }
        if(d.e !== 'kline') return;
        const k = d.k;
        // Descarta mensagens stale se symbol/interval mudou
        if(k.s !== (symbol||'BTCUSDT').toUpperCase() || k.i !== (interval||'5m')) return;
        const t = +k.t;
        const entry = { time:t, open:+k.o, high:+k.h, low:+k.l, close:+k.c,
                        volume:+k.v, quoteVolume:+k.q, buyVolume:+k.V };
        /* Finalize by k.t, never by array position. A late close for the
           previous bucket cannot pull the current price backwards. */
        _dvlMergeNativeKline1647(entry, !!k.x, _agAlive());
        var lastK = klines.length ? klines[klines.length-1] : null;
        if(lastK && !_agAlive()) marketEntryPrice = Number(lastK.close) || marketEntryPrice;
        __dvlTraceCandle(k.x?'klineWS-X':'klineWS');
        publishDvlChartPrice1204((lastK && lastK.close) || +k.c, 'kline-ws', +k.T || Date.now());
        requestLiveChartRender(!!k.x);
      }catch(_){}
    };
    _klWs.onerror = ()=>{};
    _klWs.onclose = ()=>{ _klWs=null; };
  }catch(_){}
}

_klWsConnect();
setInterval(_klWsConnect, 10000);

// ── Beta 1.554 — Live price por TRADE (@aggTrade): fluidez em TF baixo ──────
// O @kline atualiza a vela em lotes; o @aggTrade traz CADA negócio, então o
// preço e a linha andam em tempo real em vez de saltar de 2 em 2s (o ticker era
// REST a cada ~2s). Atualiza close/high/low da vela em formação e agenda um
// render (throttle interno). O @kline continua como fonte autoritativa no
// fechamento (OHLC/volume).
let _agWs=null, _agSym=null, _agLastPub=0, _agLastHdr=0;
/* Beta 1.554 — o @aggTrade agora vem na CONEXÃO COMBINADA do _klWs (e do _nnWs
   pra TFs não-nativos), então a conexão separada foi removida (era ela que não
   entregava dados pra vários usuários). _agWsConnect vira no-op p/ não quebrar as
   chamadas existentes. */
function _agWsConnect(){ /* no-op: aggTrade agora é multiplexado no combined stream */ }

// ── Live candle para TFs não-nativos (WS do intervalo base) ─────────────────
let _nnWs=null, _nnWsSym=null, _nnWsBase=null, _nnWsIv=null;
function _nnWsConnect(){
  if(isNativeTimeframe(interval)){
    if(_nnWs){try{_nnWs.close();}catch(_){}_nnWs=null;}
    return;
  }
  const s=(symbol||'BTCUSDT').toUpperCase();
  const base=baseIntervalForTimeframe(interval);
  const targetIv=String(interval);
  if(_nnWsSym===s&&_nnWsBase===base&&_nnWsIv===targetIv&&_nnWs&&_nnWs.readyState<2) return;
  if(_nnWs){try{_nnWs.close();}catch(_){}_nnWs=null;}
  _nnWsSym=s; _nnWsBase=base; _nnWsIv=targetIv;
  try{
    /* Beta 1.554 — combinado kline_base + aggTrade (mesmo motivo do _klWs): dá
       fluidez tick a tick também nos TFs não-nativos (ex.: 15s/30s). */
    const lo = s.toLowerCase();
    _nnWs=new WebSocket('wss://stream.binance.com:9443/stream?streams='+lo+'@kline_'+base+'/'+lo+'@aggTrade');
    _nnLastMsg = Date.now();
    _nnWs.onmessage=ev=>{
      try{
        _nnLastMsg = Date.now();
        if(window.__DVL_REPLAY_ACTIVE) return;
        const wrap=JSON.parse(ev.data);
        const msg=(wrap && wrap.data)?wrap.data:wrap;
        if(!msg) return;
        if(String(interval)!==targetIv) return;
        if(msg.e==='aggTrade'){ _applyAggTrade(msg, targetIv); return; }
        if(msg.e!=='kline') return;
        const k=msg.k;
        const curBase=baseIntervalForTimeframe(interval);
        if(k.s!==(symbol||'BTCUSDT').toUpperCase()||k.i!==curBase) return;
        if(!klines.length) return;
        const tMs=intervalMs(targetIv);
        const bucketT=Math.floor(+k.t/tMs)*tMs;
        let last=klines[klines.length-1];
        if(last && bucketT>Number(last.time) && !_agAlive()){
          _dvlApplyLivePriceToBucket1647(+k.o || +k.c, bucketT);
          last=klines[klines.length-1];
        }
        if(last.time===bucketT){
          const h=+k.h, l=+k.l, c=+k.c;
          if(h>last.high) last.high=h;
          if(l<last.low)  last.low=l;
          _dvlApplyCumulativeVolumeFallback1650(
            String(k.s||s)+"|"+String(k.i||base)+"|"+String(k.t),
            k.v,k.q,k.V,last,_agAlive()
          );
          /* k.x closes the one-second base candle, not the 15s/30s aggregate.
             It may only own close while aggTrade is unavailable. */
          if(!_agAlive()) last.close=c;
          __dvlTraceCandle('nnWS');
          publishDvlChartPrice1204(last.close, 'aggregate-kline-ws', +k.T || Date.now());
          requestLiveChartRender(false);
        }
      }catch(_){}
    };
    _nnWs.onerror=()=>{};
    _nnWs.onclose=()=>{ _nnWs=null; };
  }catch(_){}
}
_nnWsConnect();
setInterval(_nnWsConnect, 10000);

/* Beta 1.554 — WATCHDOG de socket mudo. Se um WS está OPEN mas parou de mandar
   dados por >12s, ele morreu silenciosamente → força fechar (dispara reconexão)
   e reconecta na hora. Isso mantém o feed vivo sem F5 (barras de volume, candle
   ao vivo etc. não param mais depois de horas abertas). Só age fora do Replay. */
setInterval(function(){
  if(window.__DVL_REPLAY_ACTIVE || document.hidden) return;
  var now = Date.now(), DEAD = 20000;
  function kick(ws, lastMsg, reconnect){
    try{
      if(ws && ws.readyState === 1 && lastMsg && (now - lastMsg) > DEAD){
        try{ ws.close(); }catch(_){}
        return true;
      }
    }catch(_){}
    return false;
  }
  if(kick(_klWs, _klLastMsg)){ _klWs=null; try{_klWsConnect();}catch(_){} }
  if(kick(_agWs, _agLastMsg)){ _agWs=null; try{_agWsConnect();}catch(_){} }
  if(kick(_nnWs, _nnLastMsg)){ _nnWs=null; try{_nnWsConnect();}catch(_){} }
}, 4000);

/* Ao voltar da aba em background, revalida os feeds na hora (resync sem F5). */
document.addEventListener("visibilitychange", function(){
  if(document.hidden || window.__DVL_REPLAY_ACTIVE) return;
  try{ _klWsConnect(); }catch(_){}
  try{ _agWsConnect(); }catch(_){}
  try{ _nnWsConnect(); }catch(_){}
}, {passive:true});


/* ─────────────────────────────────────────────────────────────
   DVL Beta 0.491 — Approved drawing scripts compatibility bridge
   This bridge only adapts the current DVL chart names to the approved scripts.
   ───────────────────────────────────────────────────────────── */
var PL = 0;
var PT = 4;
var PB = 24;
var S = window.S || {};
window.S = S;

S.drawings = S.drawings || [];
S.selectedDrawing = S.selectedDrawing || null;
S.replay = S.replay || { enabled:false, index:null, playing:false, speed:1, timer:null, selectingStart:false };
S._cross = null;
S._posDraft = null;
S.tool = null;
S.drawingToolActive = false;
S.view = S.view || { start:0, end:1 };

Object.defineProperty(S, "sym", {
  configurable:true,
  get(){ return symbol; },
  set(v){ if(symbols.includes(v)) symbol = v; }
});

Object.defineProperty(S, "tf", {
  configurable:true,
  get(){ return interval; },
  set(v){ if(v) interval = v; }
});

Object.defineProperty(S, "candles", {
  configurable:true,
  get(){
    if(Array.isArray(S._candlesOverride)) return S._candlesOverride;
    return klines.map((k, i) => ({
      t:k.time,
      o:k.open,
      h:k.high,
      l:k.low,
      c:k.close,
      v:k.volume,
      index:i,
      time:k.time,
      open:k.open,
      high:k.high,
      low:k.low,
      close:k.close,
      volume:k.volume
    }));
  },
  set(v){ S._candlesOverride = Array.isArray(v) ? v : null; }
});

function __dvlLegacyPriceArea(H){
  const priceH = indicatorsOn ? Math.max(250, H * .55) : H;
  const timeH = indicatorsOn ? 36 : 24;
  const y0 = 4;
  const y1 = Math.max(y0 + 40, priceH - timeH);
  return { y0, y1, priceH, timeH };
}

function __dvlSyncLegacyState(){
  const wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  if(!wrap) return;
  const W = wrap.clientWidth || 1;
  const H = wrap.clientHeight || 1;
  const area = __dvlLegacyPriceArea(H);
  PL = 0;
  PT = area.y0;
  PB = Math.max(0, H - area.y1);

  const win = visibleWindow();
  const slotOffset = __dvlSlotOffset(win, win.candles);
  const span = Math.max(1, win.totalSlots - 1);
  S.view = {
    start: win.start - slotOffset + 0.5,
    end: win.start - slotOffset + 0.5 + span
  };
}

function RP(){const sp=(S&&S.yScale&&S.yScale.hidden)?14:80;return sp+(S&&S.inds&&S.inds.book?Math.max(128,Math.min(S.book.maxW,S.book.w)+18):0)}
function CW(W){ return Math.max(1, W - PL - RP()); }

function visible(){
  __dvlSyncLegacyState();
  const all = S.candles;
  const a = Math.max(0, Math.floor(S.view.start));
  const b = Math.min(all.length, Math.ceil(S.view.end));
  return { cs: all.slice(a, b).length ? all.slice(a, b) : all.slice(-1) };
}

function scale(cs, H){
  __dvlSyncLegacyState();
  const area = __dvlLegacyPriceArea(H);
  const y0 = area.y0;
  const y1 = area.y1;

  let lo, hi;
  if(Number.isFinite(priceViewCenter) && Number.isFinite(priceViewRange) && priceViewRange > 0){
    lo = priceViewCenter - priceViewRange / 2;
    hi = priceViewCenter + priceViewRange / 2;
  }else{
    const lows = (cs || []).map(c => Number(c.l ?? c.low)).filter(Number.isFinite);
    const highs = (cs || []).map(c => Number(c.h ?? c.high)).filter(Number.isFinite);
    lo = lows.length ? Math.min(...lows) : 0;
    hi = highs.length ? Math.max(...highs) : 1;
    const pad = Math.max((hi - lo) * .08, Math.abs(hi || 1) * .001, 1);
    lo -= pad;
    hi += pad;
  }

  if(!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo){
    lo = 0;
    hi = 1;
  }

  return {
    lo,
    hi,
    y(v){ return y1 - (Number(v) - lo) / (hi - lo) * (y1 - y0); }
  };
}

function idxFromX(x, W){
  __dvlSyncLegacyState();
  const span = Math.max(0.35, S.view.end - S.view.start);
  return S.view.start + (x - PL) * span / CW(W) - 0.5;
}

function priceFromY(y, H, sc){
  __dvlSyncLegacyState();
  sc = sc || scale(visible().cs, H);
  const area = __dvlLegacyPriceArea(H);
  return sc.lo + (1 - (y - area.y0) / Math.max(area.y1 - area.y0, 1)) * (sc.hi - sc.lo);
}

function priceFmt(v){ return fmtPrice(v); }


/* DVL Beta 0.903 — Candle Data Model Foundation
   Raw API candles remain untouched; the engine consumes normalized candles from here. */
window.DVL_CANDLE_DATA_MODEL = (function(){
  "use strict";

  function getRawCandles(){
    // DVL Beta 0.905 — source guard:
    // This base data model must read raw candles only from legacy state.
    // Do not call window.DVL_CANDLE_DATA_MODEL.getRawCandles() here, because cache wrappers replace it later.
    try{ return Array.isArray(S.candles) ? S.candles : []; }catch(_){ return []; }
  }

  function normalizeCandle(c, index){
    if(!c) return null;
    const time = Number(c.t ?? c.time ?? c.openTime ?? c.open_time ?? 0);
    const open = Number(c.o ?? c.open);
    const high = Number(c.h ?? c.high);
    const low = Number(c.l ?? c.low);
    const close = Number(c.c ?? c.close);
    const volume = Number(c.v ?? c.volume ?? c.vol ?? 0);
    if(!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) return null;

    const safeHigh = Math.max(high, open, close, low);
    const safeLow = Math.min(low, open, close, high);

    return {
      index,
      idx:index,
      t:time,
      time,
      o:open,
      h:safeHigh,
      l:safeLow,
      c:close,
      open,
      high:safeHigh,
      low:safeLow,
      close,
      v:Number.isFinite(volume) ? volume : 0,
      volume:Number.isFinite(volume) ? volume : 0,
      raw:c
    };
  }

  function getCandles(){
    const raw = getRawCandles();
    const out = [];
    for(let i=0;i<raw.length;i++){
      const c = normalizeCandle(raw[i], i);
      if(c) out.push(c);
    }
    return out;
  }

  function candleAt(index){
    const candles = getCandles();
    if(!candles.length) return null;
    const i = Math.max(0, Math.min(Math.round(Number(index) || 0), candles.length - 1));
    return candles[i] || null;
  }

  function timeToIndex(time, candles){
    candles = Array.isArray(candles) ? candles : getCandles();
    if(!candles.length) return 0;
    const t = Number(time);
    if(!Number.isFinite(t)) return 0;
    let lo = 0, hi = candles.length - 1;
    while(lo < hi){
      const mid = (lo + hi) >> 1;
      if(Number(candles[mid].time) < t) lo = mid + 1;
      else hi = mid;
    }
    if(lo > 0 && Math.abs(Number(candles[lo-1].time) - t) < Math.abs(Number(candles[lo].time) - t)) lo--;
    return lo;
  }

  function indexToTime(index, candles){
    candles = Array.isArray(candles) ? candles : getCandles();
    if(!candles.length) return 0;
    const i = Math.max(0, Math.min(Math.round(Number(index) || 0), candles.length - 1));
    return candles[i] ? candles[i].time : 0;
  }

  function audit(){
    const raw = getRawCandles();
    const candles = getCandles();
    const first = candles[0] || null;
    const last = candles[candles.length - 1] || null;
    return {
      version:"0.941",
      available:true,
      rawCount:raw.length,
      normalizedCount:candles.length,
      hasRaw:raw.length > 0,
      hasNormalized:candles.length > 0,
      firstTime:first ? first.time : null,
      lastTime:last ? last.time : null,
      schemaOk:!!(last && Number.isFinite(last.open) && Number.isFinite(last.high) && Number.isFinite(last.low) && Number.isFinite(last.close)),
      pass:!!(candles.length && (!raw.length || candles.length <= raw.length))
    };
  }

  return {
    version:"0.941",
    getRawCandles,
    normalizeCandle,
    getCandles,
    candleAt,
    timeToIndex,
    indexToTime,
    audit
  };
})();
window.DVL_CANDLE_DATA_MODEL_AUDIT = function(){
  try{ return window.DVL_CANDLE_DATA_MODEL.audit(); }catch(e){ return { pass:false, error:String(e && e.message || e) }; }
};

/* DVL Beta 0.886 — Chart Model Foundation
   Single source of truth for raw candles, plot bounds, index/x, price/y and candle snap levels.
   This layer is intentionally visual-neutral: it adapts the existing DVL engine instead of replacing it. */
window.DVL_CHART_MODEL = (function(){
  "use strict";

  function chartWrap(){
    return document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  }

  function getRawCandles(){
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.getRawCandles === "function"){
        return window.DVL_CANDLE_DATA_MODEL.getRawCandles();
      }
    }catch(_){}
    try{ return Array.isArray(S.candles) ? S.candles : []; }catch(_){ return []; }
  }

  function normalizeCandle(c, index){
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.normalizeCandle === "function"){
        return window.DVL_CANDLE_DATA_MODEL.normalizeCandle(c, index);
      }
    }catch(_){}
    if(!c) return null;
    const time = Number(c.t ?? c.time ?? 0);
    const open = Number(c.o ?? c.open);
    const high = Number(c.h ?? c.high);
    const low = Number(c.l ?? c.low);
    const close = Number(c.c ?? c.close);
    const volume = Number(c.v ?? c.volume ?? 0);
    if(!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) return null;
    return {
      index,
      idx:index,
      t:time,
      time,
      o:open,
      h:high,
      l:low,
      c:close,
      open,
      high,
      low,
      close,
      v:Number.isFinite(volume) ? volume : 0,
      volume:Number.isFinite(volume) ? volume : 0
    };
  }

  function getCandles(){
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.getCandles === "function"){
        return window.DVL_CANDLE_DATA_MODEL.getCandles();
      }
    }catch(_){}
    return getRawCandles().map(normalizeCandle).filter(Boolean);
  }

  function getPlotBounds(){
    try{ if(typeof __dvlSyncLegacyState === "function") __dvlSyncLegacyState(); }catch(_){}
    const wrap = chartWrap();
    if(!wrap) return null;
    const W = wrap.clientWidth || 1;
    const H = wrap.clientHeight || 1;
    const left = typeof PL === "number" ? PL : 0;
    const top = typeof PT === "number" ? PT : 0;
    const rp = typeof RP === "function" ? RP() : 55;
    const pb = typeof PB === "number" ? PB : 24;
    const right = Math.max(left + 1, W - rp);
    const bottom = Math.max(top + 1, H - pb);
    return {
      W,H,left,top,right,bottom,
      plotW:Math.max(1, right - left),
      plotH:Math.max(1, bottom - top),
      priceScaleW:rp,
      bottomPad:pb
    };
  }

  function visibleRange(){
    try{ if(typeof __dvlSyncLegacyState === "function") __dvlSyncLegacyState(); }catch(_){}
    const view = (window.S && S.view) ? S.view : { start:0, end:1 };
    return {
      start:Number(view.start) || 0,
      end:Number(view.end) || 1,
      span:Math.max(0.35, (Number(view.end) || 1) - (Number(view.start) || 0))
    };
  }

  function getVisibleCandles(candles){
    candles = candles || getCandles();
    const vr = visibleRange();
    const a = Math.floor(vr.start);
    const b = Math.ceil(vr.end);
    const vs = candles.slice(Math.max(0,a), Math.min(candles.length,b));
    return vs.length ? vs : candles.slice(-1);
  }

  function timeToIndex(time, candles){
    candles = candles || getCandles();
    try{
      if(window.DVL_CANDLE_DATA_MODEL && typeof window.DVL_CANDLE_DATA_MODEL.timeToIndex === "function"){
        return window.DVL_CANDLE_DATA_MODEL.timeToIndex(time, candles);
      }
    }catch(_){}
    if(!candles.length) return 0;
    const t = Number(time);
    if(!Number.isFinite(t)) return 0;
    let lo = 0, hi = candles.length - 1;
    while(lo < hi){
      const mid = (lo + hi) >> 1;
      if(Number(candles[mid].time) < t) lo = mid + 1;
      else hi = mid;
    }
    if(lo > 0 && Math.abs(Number(candles[lo-1].time) - t) < Math.abs(Number(candles[lo].time) - t)) lo--;
    return lo;
  }

  function buildCoordinateSystem(){
    const bounds = getPlotBounds();
    const candles = getCandles();
    if(!bounds || !candles.length || !window.S || !S.view) return null;

    const vr = visibleRange();
    const visibleCandles = getVisibleCandles(candles);
    const scaleCandles = visibleCandles.length ? visibleCandles : candles.slice(-1);
    let priceModel = null;
    try{
      if(window.DVL_PRICE_SCALE_MODEL && typeof window.DVL_PRICE_SCALE_MODEL.build === "function"){
        priceModel = window.DVL_PRICE_SCALE_MODEL.build(scaleCandles, bounds.H, bounds);
      }
    }catch(_){}
    const sc = priceModel && priceModel.scale
      ? priceModel.scale
      : (typeof scale === "function"
        ? scale(scaleCandles, bounds.H)
        : { lo:0, hi:1, y:function(v){ return bounds.top + bounds.plotH / 2; } });

    const cw = typeof CW === "function" ? CW(bounds.W) : bounds.plotW;

    function indexToX(index){
      return bounds.left + (Number(index) - vr.start + 0.5) * cw / vr.span;
    }
    function xToIndex(x){
      return vr.start + (Number(x) - bounds.left) * vr.span / Math.max(cw,1) - 0.5;
    }
    function priceToY(price){
      return priceModel && typeof priceModel.priceToY === "function" ? priceModel.priceToY(price) : sc.y(Number(price));
    }
    function yToPrice(y){
      return priceModel && typeof priceModel.yToPrice === "function"
        ? priceModel.yToPrice(y)
        : sc.lo + (1 - (Number(y) - bounds.top) / Math.max(bounds.plotH, 1)) * (sc.hi - sc.lo);
    }
    function indexToTime(index){
      const i = Math.max(0, Math.min(Math.round(Number(index)||0), candles.length - 1));
      return candles[i] ? candles[i].time : 0;
    }

    return {
      version:"0.941",
      bounds,
      candles,
      visibleCandles,
      range:vr,
      span:vr.span,
      cw,
      scale:sc,
      sc,
      priceModel,
      W:bounds.W,
      H:bounds.H,
      left:bounds.left,
      right:bounds.right,
      top:bounds.top,
      bottom:bounds.bottom,
      indexToX,
      xToIndex,
      priceToY,
      yToPrice,
      timeToIndex:function(t){ return timeToIndex(t, candles); },
      indexToTime,
      xI:indexToX,
      iX:xToIndex,
      yP:priceToY,
      pY:yToPrice,
      xT:function(t){ return indexToX(timeToIndex(t, candles)); }
    };
  }

  function candleSnapLevels(candle){
    if(!candle) return [];
    const o = Number(candle.o ?? candle.open);
    const h = Number(candle.h ?? candle.high);
    const l = Number(candle.l ?? candle.low);
    const c = Number(candle.c ?? candle.close);
    const raw = [
      { kind:"wickHigh", price:h },
      { kind:"wickLow", price:l },
      { kind:"bodyTop", price:Math.max(o, c) },
      { kind:"bodyBottom", price:Math.min(o, c) }
    ];
    const out = [];
    raw.forEach(level => {
      if(!Number.isFinite(level.price)) return;
      if(out.some(x => Math.abs(x.price - level.price) <= Math.max(1e-10, Math.abs(level.price) * 1e-10))) return;
      out.push(level);
    });
    return out;
  }

  function renderSnapLevels(rc, options){
    options = options || {};
    if(!rc) return [];
    const raw = [
      { kind:"wickHigh", price:rc.high, x:rc.x, y:rc.wickHighY },
      { kind:"wickLow", price:rc.low, x:rc.x, y:rc.wickLowY },
      { kind:"bodyTop", price:Math.max(rc.open, rc.close), x:rc.x, y:rc.bodyTopY },
      { kind:"bodyBottom", price:Math.min(rc.open, rc.close), x:rc.x, y:rc.bodyBottomY }
    ];
    const out = [];
    raw.forEach(level => {
      if(!Number.isFinite(level.price) || !Number.isFinite(level.x) || !Number.isFinite(level.y)) return;
      if(out.some(x => Math.abs(x.price - level.price) <= Math.max(1e-10, Math.abs(level.price) * 1e-10))) return;
      out.push(level);
    });
    return out;
  }

  function snapToCandle(point, options){
    try{
      if(!point) return point;
      const cs = buildCoordinateSystem();
      if(!cs) return point;
      const opts = Object.assign({ wick:true, body:true, maxX:null, maxY:null, searchRadius:1 }, options || {});
      const rawIdx = Number(point.index ?? point.idx ?? 0);
      if(!Number.isFinite(rawIdx)) return point;

      const px = Number.isFinite(Number(point.x)) ? Number(point.x) : cs.indexToX(rawIdx);
      const py = Number.isFinite(Number(point.y)) ? Number(point.y) : cs.priceToY(Number(point.price));
      const coarse = !!(window.matchMedia && window.matchMedia("(pointer:coarse)").matches);
      const baseIdx = Math.max(0, Math.min(Math.round(rawIdx), cs.candles.length - 1));
      const radius = Math.max(0, Math.min(3, Number(opts.searchRadius) || 1));
      const metrics = barMetrics(cs);
      let best = null;

      for(let delta = -radius; delta <= radius; delta++){
        const idx = Math.max(0, Math.min(baseIdx + delta, cs.candles.length - 1));
        const rc = renderCandleFromModel(cs.candles[idx], cs, metrics);
        if(!rc) continue;

        const visualX = rc.x;
        const step = metrics && metrics.step ? metrics.step : 8;
        const defaultX = coarse
          ? Math.max(14, Math.min(36, Math.max(rc.halfHitW, step * 0.48)))
          : Math.max(10, Math.min(26, Math.max(rc.halfHitW, step * 0.42)));
        const xTol = Number.isFinite(Number(opts.maxX)) ? Number(opts.maxX) : defaultX;
        if(Number.isFinite(px) && Math.abs(px - visualX) > xTol) continue;

        renderSnapLevels(rc, opts).forEach(level => {
          if(level.kind.indexOf("wick") === 0 && !opts.wick) return;
          if(level.kind.indexOf("body") === 0 && !opts.body) return;

          const yTol = Number.isFinite(Number(opts.maxY)) ? Number(opts.maxY) : (coarse ? 24 : 16);
          const dist = Math.hypot((px - level.x) * 0.45, py - level.y);
          if(Math.abs(py - level.y) <= yTol && (!best || dist < best.dist)){
            best = { rc, level, dist };
          }
        });
      }

      if(!best) return point;
      return Object.assign({}, point, {
        index:best.rc.index,
        idx:best.rc.index,
        time:best.rc.time || 0,
        price:best.level.price,
        x:best.level.x,
        y:best.level.y,
        snapped:true,
        snapKind:best.level.kind,
        renderSnap:true
      });
    }catch(_){
      return point;
    }
  }

  function pointFromLocal(x, y, options){
    const cs = buildCoordinateSystem();
    if(!cs) return null;
    const opts = Object.assign({ clamp:true, snap:false }, options || {});
    let lx = Number(x), ly = Number(y);
    if(opts.clamp !== false){
      lx = Math.max(cs.bounds.left, Math.min(cs.bounds.right, lx));
      ly = Math.max(cs.bounds.top, Math.min(cs.bounds.bottom, ly));
    }
    const idx = cs.xToIndex(lx);
    const price = cs.yToPrice(ly);
    const rounded = Math.max(0, Math.min(Math.round(idx), cs.candles.length - 1));
    const candle = cs.candles[rounded];
    let p = { x:lx, y:ly, index:idx, idx, price, time:candle ? candle.time : 0 };
    if(opts.snap) p = snapToCandle(p, opts.snapOptions || {});
    return p;
  }

  function pointFromClient(clientX, clientY, options){
    const wrap = chartWrap();
    if(!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    return pointFromLocal(Number(clientX) - rect.left, Number(clientY) - rect.top, options);
  }


  function candleDirection(candle){
    if(!candle) return "flat";
    const o = Number(candle.o ?? candle.open);
    const c = Number(candle.c ?? candle.close);
    if(c > o) return "up";
    if(c < o) return "down";
    return "flat";
  }

  function barMetrics(cs){
    cs = cs || buildCoordinateSystem();
    if(!cs) return null;
    try{
      if(window.DVL_BAR_METRICS_MODEL && typeof window.DVL_BAR_METRICS_MODEL.get === "function"){
        const bm = window.DVL_BAR_METRICS_MODEL.get(cs);
        if(bm && Number.isFinite(Number(bm.step)) && Number.isFinite(Number(bm.bodyW)) && Number.isFinite(Number(bm.hitW))) return bm;
      }
    }catch(_){}
    const step = Math.abs(cs.indexToX(1) - cs.indexToX(0)) || Math.max(1, cs.cw / Math.max(cs.span, 1));
    const bodyW = Math.max(1, Math.min(18, step * 0.68));
    const hitW = Math.max(6, Math.min(36, step * 0.95));
    return {
      version:"0.897-fallback",
      source:"legacy-fallback",
      step,
      bodyW,
      wickW:1,
      hitW,
      halfBodyW:bodyW / 2,
      halfHitW:hitW / 2
    };
  }

  function renderCandleFromModel(candle, cs, metrics){
    if(!candle || !cs) return null;
    metrics = metrics || barMetrics(cs);
    const index = Number(candle.index ?? candle.idx ?? 0);
    const open = Number(candle.o ?? candle.open);
    const high = Number(candle.h ?? candle.high);
    const low = Number(candle.l ?? candle.low);
    const close = Number(candle.c ?? candle.close);
    if(!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) return null;

    const x = cs.indexToX(index);
    const openY = cs.priceToY(open);
    const highY = cs.priceToY(high);
    const lowY = cs.priceToY(low);
    const closeY = cs.priceToY(close);
    const bodyTopY = Math.min(openY, closeY);
    const bodyBottomY = Math.max(openY, closeY);
    const bodyH = Math.max(1, bodyBottomY - bodyTopY);

    return {
      index,
      idx:index,
      time:candle.time || candle.t || 0,
      candle,
      open,
      high,
      low,
      close,
      volume:Number(candle.v ?? candle.volume ?? 0),
      direction:candleDirection(candle),

      x,
      y:closeY,
      openY,
      highY,
      lowY,
      closeY,
      wickHighY:highY,
      wickLowY:lowY,
      bodyTopY,
      bodyBottomY,
      bodyH,

      width:metrics.bodyW,
      bodyW:metrics.bodyW,
      halfBodyW:metrics.halfBodyW,
      hitW:metrics.hitW,
      halfHitW:metrics.halfHitW,

      left:x - metrics.halfBodyW,
      right:x + metrics.halfBodyW,
      hitLeft:x - metrics.halfHitW,
      hitRight:x + metrics.halfHitW,
      visible: x >= cs.left - metrics.hitW && x <= cs.right + metrics.hitW
    };
  }

  function getRenderCandles(options){
    options = options || {};
    const cs = buildCoordinateSystem();
    if(!cs) return [];
    const metrics = barMetrics(cs);
    const pad = Number.isFinite(Number(options.pad)) ? Number(options.pad) : 2;
    const start = Math.max(0, Math.floor(cs.range.start) - pad);
    const end = Math.min(cs.candles.length - 1, Math.ceil(cs.range.end) + pad);
    const out = [];
    for(let i = start; i <= end; i++){
      const rc = renderCandleFromModel(cs.candles[i], cs, metrics);
      if(rc) out.push(rc);
    }
    return out;
  }

  function getRenderCandleAtIndex(index){
    const cs = buildCoordinateSystem();
    if(!cs || !cs.candles.length) return null;
    const i = Math.max(0, Math.min(Math.round(Number(index) || 0), cs.candles.length - 1));
    return renderCandleFromModel(cs.candles[i], cs, barMetrics(cs));
  }

  function nearestRenderCandleFromX(x, options){
    options = options || {};
    const cs = buildCoordinateSystem();
    if(!cs || !cs.candles.length) return null;
    const raw = cs.xToIndex(Number(x));
    const i = Math.max(0, Math.min(Math.round(raw), cs.candles.length - 1));
    const rc = renderCandleFromModel(cs.candles[i], cs, barMetrics(cs));
    if(!rc) return null;
    const maxX = Number.isFinite(Number(options.maxX)) ? Number(options.maxX) : rc.halfHitW;
    rc.distanceX = Math.abs(Number(x) - rc.x);
    rc.withinHit = rc.distanceX <= maxX;
    return rc;
  }

  return {
    version:"0.941",
    chartWrap,
    getRawCandles,
    getCandles,
    getPlotBounds,
    visibleRange,
    getVisibleCandles,
    timeToIndex,
    buildCoordinateSystem,
    barMetrics,
    renderCandleFromModel,
    renderSnapLevels,
    getRenderCandles,
    getRenderCandleAtIndex,
    nearestRenderCandleFromX,
    candleSnapLevels,
    snapToCandle,
    pointFromLocal,
    pointFromClient
  };
})();

/* DVL Beta 0.886 — Chart Model Migration Audit (console-only, no visual change). */
(function(){
  function fnHas(name, needle){
    try{
      const fn = (typeof window[name] === "function") ? window[name] : null;
      return !!(fn && String(fn).indexOf(needle) >= 0);
    }catch(_){ return false; }
  }
  function audit(){
    const model = window.DVL_CHART_MODEL;
    let cs = null;
    try{ cs = model && model.buildCoordinateSystem ? model.buildCoordinateSystem() : null; }catch(_){}
    const out = {
      version:"0.941",
      modelAvailable:!!model,
      coordinateSystemAvailable:!!cs,
      candleCount:cs && cs.candles ? cs.candles.length : 0,
      visibleCount:cs && cs.visibleCandles ? cs.visibleCandles.length : 0,
      renderCandlesAvailable:!!(model && typeof model.getRenderCandles === "function"),
      renderCandleCount:(function(){ try{ return model && model.getRenderCandles ? model.getRenderCandles().length : 0; }catch(_){ return 0; } })(),
      hasNearestRenderCandle:!!(model && typeof model.nearestRenderCandleFromX === "function"),
      priceScaleModelAvailable:!!(window.DVL_PRICE_SCALE_MODEL && typeof window.DVL_PRICE_SCALE_MODEL.build === "function"),
      renderSnapBridgeAvailable:!!(model && typeof model.renderSnapLevels === "function"),
      cursorModelBridgeAvailable:!!(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"),
      dragModelBridgeAvailable:!!window.__DVL_DRAG_MODEL_BRIDGE_ACTIVE,
      plotBounds:cs ? { left:cs.left, right:cs.right, top:cs.top, bottom:cs.bottom, W:cs.W, H:cs.H } : null,
      hasIndexToX:!!(cs && typeof cs.indexToX === "function"),
      hasXToIndex:!!(cs && typeof cs.xToIndex === "function"),
      hasPriceToY:!!(cs && typeof cs.priceToY === "function"),
      hasYToPrice:!!(cs && typeof cs.yToPrice === "function"),
      magnetCentralized:!!(window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapPoint === "function"),
      longShortMagnetDisabled:true,
      visualNeutral:true
    };
    out.pass = !!(out.modelAvailable && out.coordinateSystemAvailable && out.hasIndexToX && out.hasXToIndex && out.hasPriceToY && out.hasYToPrice && out.magnetCentralized && out.renderCandlesAvailable);
    return out;
  }
  try{
    if(window.DVL_CHART_MODEL){
      window.DVL_CHART_MODEL.audit = audit;
    }
    window.DVL_CHART_MODEL_AUDIT = audit;
  }catch(_){}
})();


/* DVL Beta 0.887 — Tool Point Adapter
   One adapter for every tool that needs chart coordinates.
   It sits above DVL_CHART_MODEL and below the tools, so Ruler/Arrow/Line/Rect/Text/LongShort
   stop rebuilding coordinate logic separately. */
window.DVL_TOOL_POINT_MODEL = (function(){
  "use strict";

  function model(){
    return window.DVL_CHART_MODEL || null;
  }

  function projection(){
    try{
      if(window.DVL_PROJECTION_MODEL && typeof window.DVL_PROJECTION_MODEL.build === "function"){
        return window.DVL_PROJECTION_MODEL.build();
      }
    }catch(_){}
    return null;
  }

  function normalizeTool(tool){
    tool = String(tool || "").toLowerCase();
    if(tool === "line") return "trendline";
    if(tool === "rect") return "rectangle";
    if(tool === "long-position") return "long";
    if(tool === "short-position") return "short";
    if(tool === "longpos") return "long";
    if(tool === "shortpos") return "short";
    return tool;
  }

  function isLongShort(tool){
    tool = normalizeTool(tool);
    return tool === "long" || tool === "short";
  }

  function shouldSnap(tool, explicitSnap){
    if(explicitSnap === false) return false;
    if(isLongShort(tool)) return false;
    return explicitSnap === true || tool === "ruler" || tool === "arrow" || tool === "trendline" || tool === "rectangle" || tool === "text";
  }

  function formatPoint(p){
    if(!p) return null;
    const idx = Number(p.idx ?? p.index ?? 0);
    return {
      x:Number(p.x),
      y:Number(p.y),
      idx,
      index:idx,
      time:Number(p.time || 0),
      price:Number(p.price),
      snapped:!!p.snapped,
      snapKind:p.snapKind || null
    };
  }

  function pointFromLocal(x, y, opts){
    opts = opts || {};
    const tool = normalizeTool(opts.tool);
    const snapOn = shouldSnap(tool, opts.snap);

    try{
      const pr = projection();
      if(pr && typeof pr.localToPoint === "function"){
        let p = pr.localToPoint(x, y, { clamp: opts.clamp !== false });
        if(p && snapOn) p = snap(p, { tool, snap:true, snapOptions: opts.snapOptions || { wick:true, body:true, searchRadius:1 } });
        if(p) return formatPoint(Object.assign({}, p, { projectionBridge:true }));
      }
    }catch(_){}

    const m = model();
    if(!m || typeof m.pointFromLocal !== "function") return null;

    const p = m.pointFromLocal(x, y, {
      clamp: opts.clamp !== false,
      snap: snapOn,
      snapOptions: opts.snapOptions || { wick:true, body:true, searchRadius:1 }
    });

    return formatPoint(p);
  }

  function pointFromClient(clientX, clientY, opts){
    opts = opts || {};
    const tool = normalizeTool(opts.tool);
    const snapOn = shouldSnap(tool, opts.snap);

    try{
      const pr = projection();
      const m = model();
      const wrap = (m && typeof m.chartWrap === "function") ? m.chartWrap() : (document.getElementById("chartWrap") || document.querySelector(".canvasWrap"));
      if(pr && typeof pr.localToPoint === "function" && wrap){
        const rect = wrap.getBoundingClientRect();
        let p = pr.localToPoint(Number(clientX) - rect.left, Number(clientY) - rect.top, { clamp: opts.clamp !== false });
        if(p && snapOn) p = snap(p, { tool, snap:true, snapOptions: opts.snapOptions || { wick:true, body:true, searchRadius:1 } });
        if(p) return formatPoint(Object.assign({}, p, { projectionBridge:true }));
      }
    }catch(_){}

    const m = model();
    if(!m || typeof m.pointFromClient !== "function") return null;

    const p = m.pointFromClient(clientX, clientY, {
      clamp: opts.clamp !== false,
      snap: snapOn,
      snapOptions: opts.snapOptions || { wick:true, body:true, searchRadius:1 }
    });

    return formatPoint(p);
  }

  function pointFromCross(opts){
    opts = opts || {};
    let x = null, y = null;

    try{
      if(window.crosshair && crosshair.visible){
        x = crosshair.x;
        y = crosshair.y;
      }else if(window.S && S._cross){
        x = S._cross.cx;
        y = S._cross.cy;
      }
    }catch(_){}

    if(x === null || y === null) return null;

    try{
      if(typeof window.__dvlSetApprovedCrossCenter === "function"){
        const p0 = window.__dvlSetApprovedCrossCenter(x, y);
        if(p0){ x = p0.x; y = p0.y; }
      }
    }catch(_){}

    return pointFromLocal(x, y, opts);
  }

  function toScreen(point, opts){
    opts = opts || {};
    if(!point) return null;

    try{
      const pr = projection();
      if(pr && typeof pr.pointToScreen === "function"){
        const sp = pr.pointToScreen(point);
        if(sp) return Object.assign({}, sp, { projectionBridge:true });
      }
    }catch(_){}

    const m = model();
    if(!m || typeof m.buildCoordinateSystem !== "function") return null;
    const cs = m.buildCoordinateSystem();
    if(!cs) return null;

    let idx = null;
    if(point.index != null || point.idx != null){
      idx = Number(point.index ?? point.idx);
    }else if(point.time != null && typeof cs.timeToIndex === "function"){
      idx = cs.timeToIndex(point.time);
    }

    if(!Number.isFinite(idx)) idx = 0;

    return {
      x:cs.indexToX(idx),
      y:cs.priceToY(Number(point.price)),
      idx,
      index:idx,
      price:Number(point.price),
      time:point.time || (typeof cs.indexToTime === "function" ? cs.indexToTime(idx) : 0)
    };
  }

  function snap(point, opts){
    opts = opts || {};
    const tool = normalizeTool(opts.tool);
    if(!shouldSnap(tool, opts.snap !== undefined ? opts.snap : true)) return formatPoint(point);
    const m = model();
    if(!m || typeof m.snapToCandle !== "function") return formatPoint(point);
    return formatPoint(m.snapToCandle(point, opts.snapOptions || { wick:true, body:true, searchRadius:1 }));
  }

  function audit(){
    const m = model();
    const cs = m && typeof m.buildCoordinateSystem === "function" ? m.buildCoordinateSystem() : null;
    return {
      version:"0.941",
      modelAvailable:!!m,
      coordinateSystemAvailable:!!cs,
      pointFromLocal:typeof pointFromLocal === "function",
      pointFromClient:typeof pointFromClient === "function",
      pointFromCross:typeof pointFromCross === "function",
      toScreen:typeof toScreen === "function",
      projectionBridgeAvailable:!!(window.DVL_PROJECTION_MODEL && typeof window.DVL_PROJECTION_MODEL.build === "function"),
      projectionBridgeActive:(function(){ try{ const pr=projection(); return !!(pr && typeof pr.localToPoint === "function" && typeof pr.pointToScreen === "function"); }catch(_){ return false; } })(),
      longShortSnapDisabled:shouldSnap("long", true) === false && shouldSnap("short", true) === false,
      drawingSnapEnabled:shouldSnap("arrow", true) === true && shouldSnap("trendline", true) === true,
      pass:!!(m && cs)
    };
  }

  return {
    version:"0.941",
    normalizeTool,
    isLongShort,
    shouldSnap,
    pointFromLocal,
    pointFromClient,
    pointFromCross,
    toScreen,
    snap,
    audit
  };
})();
window.DVL_TOOL_POINT_MODEL_AUDIT = function(){
  try{ return window.DVL_TOOL_POINT_MODEL.audit(); }catch(e){ return { pass:false, error:String(e && e.message || e) }; }
};



/* DVL Beta 0.887 — Global Tool Magnet
   Invisible snap for drawing tools and Ruler V2.
   When enabled, anchors snap to the nearest candle wick high/low or body top/bottom. */
function __dvlToolMagnetEnabled(){
  try{
    if(localStorage.getItem("DVL_TOOL_MAGNET_ON") === "0") return false;
  }catch(_){}
  return !!toolMagnetOn;
}
function __dvlMagnetBuildCS(){
  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.buildCoordinateSystem === "function"){
      return window.DVL_CHART_MODEL.buildCoordinateSystem();
    }
  }catch(_){}
  return null;
}
function __dvlCandleSnapLevels(c){
  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.candleSnapLevels === "function"){
      return window.DVL_CHART_MODEL.candleSnapLevels(c);
    }
  }catch(_){}
  return [];
}
function __dvlSnapToolPoint(point, cs){
  if(!__dvlToolMagnetEnabled()) return point;

  // DVL Beta 0.909 — magnet candidate bridge:
  // Prefer the centralized candidate selector. Keep ChartModel.snapToCandle as fallback.
  try{
    if(window.DVL_SNAP_CANDIDATE_MODEL && typeof window.DVL_SNAP_CANDIDATE_MODEL.snapPoint === "function"){
      const snapped = window.DVL_SNAP_CANDIDATE_MODEL.snapPoint(point, { wick:true, body:true, searchRadius:1 });
      if(snapped && snapped.snapped) return Object.assign({}, snapped, { magnetBridge:"candidate" });
    }
  }catch(_){}

  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.snapToCandle === "function"){
      const snapped = window.DVL_CHART_MODEL.snapToCandle(point, { wick:true, body:true, searchRadius:1 });
      if(snapped && snapped.snapped) return Object.assign({}, snapped, { magnetBridge:"chart-fallback" });
      return snapped;
    }
  }catch(_){}
  return point;
}
window.DVL_TOOL_MAGNET = {
  version:"0.941",
  get enabled(){ return __dvlToolMagnetEnabled(); },
  setEnabled:function(on){
    toolMagnetOn = !!on;
    try{ localStorage.setItem("DVL_TOOL_MAGNET_ON", toolMagnetOn ? "1" : "0"); }catch(_){}
    try{ if(els && els.toolMagnetToggle) els.toolMagnetToggle.checked = !!toolMagnetOn; }catch(_){}
    try{ saveAppSettings(); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("dvl-tool-magnet-change", { detail:{ enabled:toolMagnetOn } })); }catch(_){}
  },
  snapPoint:function(point, cs){ return __dvlSnapToolPoint(point, cs || __dvlMagnetBuildCS()); },
  snapChartPoint:function(point, cs){ return this.snapPoint(point, cs); },
  snapRulerPoint:function(point, cs){ return this.snapPoint(point, cs); }
};

function __dvlClampApprovedCross(x, y){
  const wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  if(!wrap) return { x:Number(x)||0, y:Number(y)||0 };
  const maxX = Math.max(0, wrap.clientWidth - RP());
  const maxY = Math.max(80, wrap.clientHeight - PB);
  return {
    x: clamp(Number(x)||0, PL, maxX),
    y: clamp(Number(y)||0, PT, maxY)
  };
}

function __dvlSetApprovedCrossCenter(x, y){
  const p = __dvlClampApprovedCross(x, y);
  crosshair.x = p.x;
  crosshair.y = p.y;
  crosshair.visible = true;
  crosshair.active = true;
  S._cross = { cx:p.x, cy:p.y };
  return p;
}

window.__dvlSyncApprovedCrossFromVisual = function(){
  if(typeof crosshair !== "undefined" && crosshair.visible){
    __dvlSetApprovedCrossCenter(crosshair.x, crosshair.y);
    return true;
  }
  if(S._cross){
    __dvlSetApprovedCrossCenter(S._cross.cx, S._cross.cy);
    return true;
  }
  return false;
};

const __dvlApprovedBaseDraw = draw;
draw = function(){
  __dvlSyncLegacyState();
  return __dvlApprovedBaseDraw();
};

function __dvlCenterLegacyCross(){
  const wrap = document.getElementById("chartWrap");
  if(!wrap) return;
  __dvlSyncLegacyState();
  const W = wrap.clientWidth || 1;
  const H = wrap.clientHeight || 1;
  const area = __dvlLegacyPriceArea(H);
  S._cross = {
    cx: Math.round((PL + W - RP()) / 2),
    cy: Math.round((area.y0 + area.y1) / 2)
  };
}

function __dvlLegacyPointFromEvent(ev, useMagnet = true){
  try{
    if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromClient === "function"){
      const tool = (window.S && (S.tool || (S._posDraft && S._posDraft.type))) || "ruler";
      const p = window.DVL_TOOL_POINT_MODEL.pointFromClient(ev.clientX, ev.clientY, { tool, clamp:true, snap:!!useMagnet });
      if(p) return p;
    }
  }catch(_){}
  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.pointFromClient === "function"){
      const p = window.DVL_CHART_MODEL.pointFromClient(ev.clientX, ev.clientY, { clamp:true, snap:!!useMagnet });
      if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, index:p.idx ?? p.index, time:p.time, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
    }
  }catch(_){}
  const wrap = document.getElementById("chartWrap");
  if(!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const x = clamp(ev.clientX - rect.left, PL, rect.width - RP());
  const y = clamp(ev.clientY - rect.top, PT, rect.height - PB);
  const sc = scale(visible().cs, rect.height);
  const rawPoint = { x, y, idx: idxFromX(x, rect.width), price: priceFromY(y, rect.height, sc) };

  return (useMagnet && window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapRulerPoint === "function")
    ? window.DVL_TOOL_MAGNET.snapRulerPoint(rawPoint)
    : rawPoint;
}

function __dvlLegacyPointFromCross(useMagnet = true){
  const wrap = document.getElementById("chartWrap");
  if(!wrap) return null;
  let sx = null, sy = null;
  if(crosshair.visible){
    sx = crosshair.x;
    sy = crosshair.y;
  }else if(S._cross){
    sx = S._cross.cx;
    sy = S._cross.cy;
  }
  if(sx === null || sy === null) return null;
  const p0 = typeof __dvlSetApprovedCrossCenter === "function" ? __dvlSetApprovedCrossCenter(sx, sy) : { x:sx, y:sy };
  try{
    if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === "function"){
      const tool = (window.S && (S.tool || (S._posDraft && S._posDraft.type))) || "ruler";
      const p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(p0.x, p0.y, { tool, clamp:true, snap:!!useMagnet });
      if(p) return p;
    }
  }catch(_){}
  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.pointFromLocal === "function"){
      const p = window.DVL_CHART_MODEL.pointFromLocal(p0.x, p0.y, { clamp:true, snap:!!useMagnet });
      if(p) return { x:p.x, y:p.y, idx:p.idx ?? p.index, index:p.idx ?? p.index, time:p.time, price:p.price, snapped:!!p.snapped, snapKind:p.snapKind };
    }
  }catch(_){}
  const rect = wrap.getBoundingClientRect();
  const x = clamp(p0.x, PL, rect.width - RP());
  const y = clamp(p0.y, PT, rect.height - PB);
  const sc = scale(visible().cs, rect.height);
  const rawPoint = { x, y, idx:idxFromX(x, rect.width), price:priceFromY(y, rect.height, sc) };

  return (useMagnet && window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapRulerPoint === "function")
    ? window.DVL_TOOL_MAGNET.snapRulerPoint(rawPoint)
    : rawPoint;
}

function __dvlCreateApprovedPosition(type, ev){
  // DVL Beta 0.879 — Long/Short creation is intentionally unsnapped.
  // The global Tool Magnet must not affect Long/Short entry, TP, SL or box placement.
  const p = __dvlLegacyPointFromCross(false) || __dvlLegacyPointFromEvent(ev, false);
  if(!p) return;
  const all = S.candles;
  const si = Math.max(0, Math.min(Math.round(p.idx), all.length - 1));
  const t = all[si]?.t || Date.now();
  const sc = scale(visible().cs, document.getElementById("chartWrap").clientHeight || 1);
  const risk = Math.max(Math.abs(p.price) * .002, (sc.hi - sc.lo) * .035, 1);
  const isLong = type === "long";
  const d = {
    id: Date.now() + Math.floor(Math.random() * 1e6),
    type: isLong ? "longpos" : "shortpos",
    x1: p.idx,
    x2: p.idx + 36,
    entry: p.price,
    stop: isLong ? p.price - risk : p.price + risk,
    target: isLong ? p.price + risk : p.price - risk,
    style:{
      fillAlpha:.12,
      showLabels:true,
      fixedPixelWidth:118,
      tpColor:"#00dc82",
      slColor:"#ff4664",
      entryColor:"#ffffff"
    },
    locked:false,
    visible:true,
    createdAt:Date.now(),
    p:{ index:p.idx, time:t, price:p.price }
  };

  S.drawings.push(d);
  S.tool = null;
  S._posDraft = null;
  S.drawingToolActive = false;
  try{ window.__dvlSelectId?.(d.id); }catch(_){}
  try{ window.__dvlPushHistory?.(); }catch(_){}
  try{ window.__dvlSaveDrawings?.(); }catch(_){}
  if(typeof hideCrosshair === "function") hideCrosshair();
  else drawSoon();
}

window.__dvlActivateApprovedTool = function(id){
  const map = {
    trend:"rpDrawLine",
    rect:"rpDrawRect",
    text:"rpDrawText",
    arrow:"rpDrawArrow",
    ruler:"btnRuler"
  };

  if(id === "cross"){
    crosshair.visible = !crosshair.visible;
    crosshair.active = crosshair.visible;
    if(crosshair.visible && (!crosshair.x || !crosshair.y)){
      const wrap = document.getElementById("chartWrap");
      if(wrap){
        crosshair.x = Math.round((PL + wrap.clientWidth - RP()) / 2);
        crosshair.y = Math.round((PT + wrap.clientHeight - PB) / 2);
      }
    }
    drawSoon();
    return true;
  }

  if(id === "long" || id === "short"){
    S.tool = id;
    S._posDraft = { type:id };
    S.drawingToolActive = true;
    __dvlCenterLegacyCross();
    drawSoon();
    return true;
  }

  const btnId = map[id];
  const btn = btnId ? document.getElementById(btnId) : null;
  if(btn){
    btn.click();
    return true;
  }

  return false;
};

(function initApprovedPositionClicks(){
  const wrap = document.getElementById("chartWrap");
  if(!wrap) return;

  wrap.addEventListener("click", function(ev){
    if(S.tool !== "long" && S.tool !== "short") return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    __dvlCreateApprovedPosition(S.tool, ev);
  }, true);

  wrap.addEventListener("touchend", function(ev){
    if(S.tool !== "long" && S.tool !== "short") return;
    if(!ev.changedTouches || !ev.changedTouches.length) return;
    const t = ev.changedTouches[0];
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    __dvlCreateApprovedPosition(S.tool, { clientX:t.clientX, clientY:t.clientY });
  }, { capture:true, passive:false });
})();

/* ─── Approved script: DVL Drawing Tools v4 ─── */

/* DVL Drawing Tools v4 + Replay — Crosshair-driven, TradingView-like */
(function DVL_DrawReplay(){
'use strict';

/* ─── CONSTANTS & CONFIG ─── */
const HIT_D=11,HIT_M=24,HDL_R_D=8,HDL_R_M=16;
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
  try{
    if(window.DVL_CHART_MODEL && typeof window.DVL_CHART_MODEL.buildCoordinateSystem === 'function'){
      return window.DVL_CHART_MODEL.buildCoordinateSystem();
    }
  }catch(_){}
  const wrap=el('chartWrap');if(!wrap)return null;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const span=Math.max(0.35,S.view.end-S.view.start);
  const cw=CW(W);
  const a=Math.floor(S.view.start),b=Math.ceil(S.view.end);
  const vs=S.candles.slice(Math.max(0,a),Math.min(S.candles.length,b));
  const sc=scale(vs.length?vs:S.candles.slice(-1),H);
  return{W,H,cw,span,sc,xI:i=>PL+(i-S.view.start+0.5)*cw/span,xT:t=>PL+(tToIdx(t)-S.view.start+0.5)*cw/span,yP:p=>sc.y(p),pY:y=>sc.lo+(1-(y-PT)/(H-PT-PB))*(sc.hi-sc.lo),iX:sx=>S.view.start+(sx-PL)*span/cw-0.5};
}
function getCS(){return _lastCS||buildCS();}

/* ─── S.cursor: crosshair position in chart coordinates ─── */
function _syncCursor(cs){
  if(typeof window.__dvlSyncApprovedCrossFromVisual === 'function') window.__dvlSyncApprovedCrossFromVisual();
  if(!S._cross||!cs||!S.candles.length){S.cursor=null;return;}

  const{cx,cy}=S._cross;
  const dvlLongShortDraftActive = !!(S._posDraft && (S._posDraft.type === 'long' || S._posDraft.type === 'short'));
  const activeTool = dvlLongShortDraftActive ? S._posDraft.type : (_tool || S.tool || 'drawing');
  try{ window.__DVL_CURSOR_MODEL_BRIDGE_ACTIVE = true; }catch(_){}

  try{
    if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === 'function'){
      const p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(cx, cy, {
        tool:activeTool,
        clamp:true,
        snap:!dvlLongShortDraftActive
      });
      if(p){
        const idx = Math.max(0, Math.min(Math.round(p.index), S.candles.length - 1));
        S.cursor = {
          active:true,
          screenX:cx,
          screenY:cy,
          index:p.index,
          snapIndex:idx,
          time:p.time || (S.candles[idx] ? S.candles[idx].t : 0),
          price:p.price,
          x:cx,
          y:cy,
          snapped:!!p.snapped,
          snapKind:p.snapKind || null,
          modelCursor:true
        };
        return;
      }
    }
  }catch(_){}

  const raw=cs.iX(cx);
  // Clamp to existing candles for candle-snap, but keep raw for future-space drawing
  const idx=Math.max(0,Math.min(Math.round(raw),S.candles.length-1));
  const c=S.candles[idx];
  let cur={active:true,screenX:cx,screenY:cy,index:raw,snapIndex:idx,time:c?c.t:0,price:cs.pY(cy),x:cx,y:cy};

  // DVL Beta 0.890 — fallback only. Main cursor path is DVL_TOOL_POINT_MODEL.
  // Long/Short must stay free, because it is a trading position tool, not a candle anchor tool.
  if(!dvlLongShortDraftActive && window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapChartPoint === 'function'){
    const sp=window.DVL_TOOL_MAGNET.snapChartPoint(cur,cs);
    if(sp&&sp.snapped){cur.index=sp.index;cur.snapIndex=sp.idx;cur.time=sp.time;cur.price=sp.price;cur.snapKind=sp.snapKind;cur.snapped=true;}
  }
  S.cursor=cur;
}
function _cursorPoint(){
  if(!S.cursor)return null;
  // index is the raw (possibly future) float; time from nearest real candle
  return{index:S.cursor.index,time:S.cursor.time,price:S.cursor.price};
}

/* ─── COORDINATE CONVERTERS ─── */
function screenToChartPoint(sx,sy,cs){
  try{
    if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === 'function'){
      const p = window.DVL_TOOL_POINT_MODEL.pointFromLocal(sx, sy, { tool:_tool || 'drawing', clamp:true, snap:true });
      if(p) return { index:p.index, time:p.time, price:p.price, x:p.x, y:p.y, snapped:p.snapped, snapKind:p.snapKind };
    }
  }catch(_){}
  cs=cs||getCS();if(!cs)return{index:0,time:0,price:0};
  const raw=cs.iX(sx);
  // Allow raw index past last candle for future-space drawings
  const si=Math.round(Math.max(0,Math.min(raw,S.candles.length-1)));
  const c=S.candles[si];
  let out={index:raw,time:c?c.t:0,price:cs.pY(sy),x:sx,y:sy};
  if(window.DVL_TOOL_MAGNET && typeof window.DVL_TOOL_MAGNET.snapChartPoint === 'function'){
    const sp=window.DVL_TOOL_MAGNET.snapChartPoint(out,cs);
    if(sp&&sp.snapped) out={index:sp.index,time:sp.time,price:sp.price,x:sp.x,y:sp.y,snapped:true,snapKind:sp.snapKind};
  }
  return out;
}
function chartPointToScreen(p,cs){
  cs=cs||getCS();if(!cs||!p)return{x:0,y:0};
  const n=S.candles.length;
  let idx;
  // DVL Beta 0.893 — edit-safe projection.
  // Hit-test/drag/render of existing drawings must use the same stable chart coords as the canvas,
  // while creation/snap remains handled by DVL_TOOL_POINT_MODEL upstream.
  if(p.index!=null&&Number.isFinite(Number(p.index)))idx=Number(p.index);
  else if(p.idx!=null&&Number.isFinite(Number(p.idx)))idx=Number(p.idx);
  else if(p.time)idx=(typeof indexFromTimeNearest==='function')?indexFromTimeNearest(p.time):tToIdx(p.time);
  else idx=0;
  return{x:cs.xI(idx),y:cs.yP(Number(p.price))};
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
function _seedToolCross(){
  const wrap=el('chartWrap');if(!wrap)return;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const baseX = crosshair.visible ? crosshair.x : (S._cross?.cx ?? Math.round((PL+(W-RP()))/2));
  const baseY = crosshair.visible ? crosshair.y : (S._cross?.cy ?? Math.round((PT+(H-PB))/2));
  const cx=clamp(baseX,PL,W-RP());
  const cy=clamp(baseY,PT,H-PB);
  if(typeof __dvlSetApprovedCrossCenter === 'function') __dvlSetApprovedCrossCenter(cx,cy);
  else S._cross={cx,cy};
  const cs=getCS();if(cs)_syncCursor(cs);
}
function _setTool(t){
  _cancelDrawing();_deselect();_tool=t;S.drawingToolActive=true;_sm=ST.IDLE;_updateToolBtns();
  const wrap=el('chartWrap');if(wrap)wrap.style.cursor='crosshair';
  _seedToolCross();
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
  const cub=el('dvlChartUndoBtn'),crb=el('dvlChartRedoBtn');
  const canUndo=_histPtr>0,canRedo=_histPtr<_history.length-1;
  if(ub){ub.classList.toggle('tb-disabled',!canUndo);}
  if(rb){rb.classList.toggle('tb-disabled',!canRedo);}
  if(cub){cub.classList.toggle('is-enabled',canUndo); cub.setAttribute('aria-disabled', canUndo ? 'false' : 'true');}
  if(crb){crb.classList.toggle('is-enabled',canRedo); crb.setAttribute('aria-disabled', canRedo ? 'false' : 'true');}
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
  wrap.addEventListener('pointerdown',_onPosPD,true);
  window.addEventListener('pointermove',_onPosPM,true);
  window.addEventListener('pointerup',_onPosPU,true);
  window.addEventListener('pointercancel',_onPosPU,true);
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

const _CTX_GUARD='#dvlDrawCtxBar,#dvlDrawSettingsPanel,#dvlDrawDelete,#viewBtnDock,#dvlMiniRefresh,[data-dvl-ui="true"]';
function _onCk(e){
  if(e.target?.closest?.(_CTX_GUARD))return;
  if(_tool||_sm===ST.DRAWING||S.replay?.selectingStart)e.stopPropagation();
}


/* ─── POSITION POINTER DRAG LOCK ───
   Long/Short use pointer events too, because mobile sends pointer events to the chart
   before touch handlers. This lock captures Long/Short drags first and blocks chart pan. */
function _eventPoint(e){
  const wrap=el('chartWrap');if(!wrap)return null;
  const r=wrap.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}
function _isPosDrawing(d){return d&&(d.type==='longpos'||d.type==='shortpos');}
function _isEditableDrawing(d){return d&&(d.type==='trendline'||d.type==='rectangle'||d.type==='text'||d.type==='arrow'||d.type==='longpos'||d.type==='shortpos');}
function _onPosPD(e){
  if(e.target?.closest?.(_CTX_GUARD))return;
  if(_tool||_sm===ST.DRAWING||S.replay?.selectingStart)return;
  const cs=getCS();if(!cs)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const p=_eventPoint(e);if(!p)return;

  // DVL Beta 0.894 — edit pointer lock for ALL drawing tools.
  // Mobile/Chrome fires pointer events before touch handlers; if we only lock Long/Short,
  // the chart pan can steal Arrow/Line/Rectangle/Text before their handles/body drag starts.
  let sel=_getSelected();
  if(sel&&_isEditableDrawing(sel)){
    const hh=_hitHandles(p.x,p.y,sel,cs);
    if(hh){
      e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();
      wrap.setPointerCapture?.(e.pointerId);
      window.__dvlPositionDragActive=true;
      window.__dvlDrawingEditDragActive=true;
      _sm=ST.DRAG_HDL;
      _drag={handle:hh,ox:p.x,oy:p.y,origDraw:clone(sel),started:false};
      return;
    }
    if(_hitDrawing(sel,p.x,p.y,cs)){
      e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();
      wrap.setPointerCapture?.(e.pointerId);
      window.__dvlPositionDragActive=true;
      window.__dvlDrawingEditDragActive=true;
      _drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(sel),started:false};
      return;
    }
  }

  const hit=_hitAll(p.x,p.y,cs);
  if(hit&&_isEditableDrawing(hit)){
    e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();
    wrap.setPointerCapture?.(e.pointerId);
    window.__dvlPositionDragActive=true;
    window.__dvlDrawingEditDragActive=true;
    _select(hit.id);
    _drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(hit),started:false};
  }
}

function _onPosPM(e){
  if(!window.__dvlPositionDragActive||!_drag)return;
  e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();
  const cs=getCS();if(!cs)return;
  const p=_eventPoint(e);if(!p)return;
  const threshold=_drag.handle==='body'?7:3;
  if(!_drag.started&&Math.hypot(p.x-_drag.ox,p.y-_drag.oy)>threshold)_drag.started=true;
  if(!_drag.started)return;
  if(_drag.handle==='body'){
    _sm=ST.DRAG_BODY;_applyBodyDrag(p,cs);
  }else{
    _sm=ST.DRAG_HDL;_applyHandleDrag(p,cs);
  }
  drawSoon();
}
function _onPosPU(e){
  if(!window.__dvlPositionDragActive)return;
  e.stopImmediatePropagation();e.stopPropagation();e.preventDefault();
  const wrap=el('chartWrap');
  try{wrap?.releasePointerCapture?.(e.pointerId);}catch(_){}
  if((_sm===ST.DRAG_BODY||_sm===ST.DRAG_HDL)&&_drag?.started){_pushHistory();_saveDrawings();}
  _sm=ST.SEL;_drag=null;window.__dvlPositionDragActive=false;window.__dvlDrawingEditDragActive=false;drawSoon();
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
    if(!S._cross)_seedToolCross();
    _syncCursor(cs);
    _handleDrawClick(cs);return;
  }
  const sel=_getSelected();
  if(sel){
    const hh=_hitHandles(p.x,p.y,sel,cs);
    if(hh){e.stopPropagation();e.preventDefault();_sm=ST.DRAG_HDL;_drag={handle:hh,ox:p.x,oy:p.y,origDraw:clone(sel),started:false};return;}
    if(_hitDrawing(sel,p.x,p.y,cs)){e.stopPropagation();e.preventDefault();_drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(sel),started:false};return;}
  }
  const hit=_hitAll(p.x,p.y,cs);
  if(hit){e.stopPropagation();e.preventDefault();_select(hit.id);_drag={handle:'body',ox:p.x,oy:p.y,origDraw:clone(hit),started:false};return;}
  if(_selId){_deselect();drawSoon();}
}

/* DRAWING state: no stopPropagation so native mousemove updates S._cross and crosshair shows.
   DRAG states: stop propagation to block chart pan. */
function _onMM(e){
  const cs=getCS();if(!cs)return;
  const wrap=el('chartWrap');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const p={x:e.clientX-r.left,y:e.clientY-r.top};
  if((_tool||_sm===ST.DRAWING||S.replay?.selectingStart)&&!_drag){
    const ncx=clamp(p.x,PL,wrap.clientWidth-RP());
    const ncy=clamp(p.y,PT,wrap.clientHeight-PB);
    if(typeof __dvlSetApprovedCrossCenter === 'function') __dvlSetApprovedCrossCenter(ncx,ncy);
    else S._cross={cx:ncx,cy:ncy};
    _syncCursor(cs);
    drawSoon();
    if(_sm===ST.DRAWING||S.replay?.selectingStart)return;
  }
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
  if(window.__dvlPositionDragActive){e.stopPropagation();e.preventDefault();return;}
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
    /* Relative drag: the visible crosshair center stays where it is; finger delta moves that center. */
    const baseCX=crosshair.visible?crosshair.x:(S._cross?S._cross.cx:x);
    const baseCY=crosshair.visible?crosshair.y:(S._cross?S._cross.cy:y);
    if(typeof __dvlSetApprovedCrossCenter === 'function') __dvlSetApprovedCrossCenter(baseCX,baseCY);
    else S._cross={cx:baseCX,cy:baseCY};
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
  if(window.__dvlPositionDragActive){e.stopPropagation();e.preventDefault();return;}
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
      if(typeof __dvlSetApprovedCrossCenter === 'function') __dvlSetApprovedCrossCenter(ncx,ncy);
      else S._cross={cx:ncx,cy:ncy};
    }else{
      const baseX=crosshair.visible?crosshair.x:x;
      const baseY=crosshair.visible?crosshair.y:y;
      if(typeof __dvlSetApprovedCrossCenter === 'function') __dvlSetApprovedCrossCenter(baseX,baseY);
      else S._cross={cx:baseX,cy:baseY};
    }
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
  if(window.__dvlPositionDragActive){e.stopPropagation();e.preventDefault();return;}
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
  _select(id);_pushHistory();_saveDrawings();
  if(typeof hideCrosshair === 'function') hideCrosshair();
  else drawSoon();
}


/* ─── DRAG ─── */
function _modelDragDelta(p,cs,tool){
  const t=String(tool||'').toLowerCase();
  const isPos=(t==='longpos'||t==='shortpos'||t==='long'||t==='short');
  // DVL Beta 0.893 — edit safety:
  // Arrow/Line/Rectangle/Text movement uses legacy cs delta because it is the exact visual coordinate
  // used by hit-test/render. This fixes handles/body not moving after the model migration.
  if(!isPos){
    return {
      di:cs.iX(p.x)-cs.iX(_drag.ox),
      dp:cs.pY(p.y)-cs.pY(_drag.oy),
      modelDrag:false,
      editSafe:true
    };
  }
  try{
    if(window.DVL_TOOL_POINT_MODEL && typeof window.DVL_TOOL_POINT_MODEL.pointFromLocal === 'function' && _drag){
      const a = window.DVL_TOOL_POINT_MODEL.pointFromLocal(_drag.ox, _drag.oy, { tool:tool || 'drawing', clamp:true, snap:false });
      const b = window.DVL_TOOL_POINT_MODEL.pointFromLocal(p.x, p.y, { tool:tool || 'drawing', clamp:true, snap:false });
      if(a && b && Number.isFinite(Number(a.index)) && Number.isFinite(Number(b.index)) && Number.isFinite(Number(a.price)) && Number.isFinite(Number(b.price))){
        return {
          di:Number(b.index) - Number(a.index),
          dp:Number(b.price) - Number(a.price),
          modelDrag:true,
          editSafe:true
        };
      }
    }
  }catch(_){}
  return {
    di:cs.iX(p.x)-cs.iX(_drag.ox),
    dp:cs.pY(p.y)-cs.pY(_drag.oy),
    modelDrag:false,
    editSafe:true
  };
}

try{ window.__DVL_DRAG_MODEL_BRIDGE_ACTIVE = true; }catch(_){}

function _applyBodyDrag(p,cs){
  const d=_getSelected();if(!d||!_drag)return;
  const orig=_drag.origDraw;
  if(d.type==='longpos'||d.type==='shortpos'){
    const POS_DRAG_SENS=0.52;
    const md=_modelDragDelta(p,cs,d.type);
    const dIdx=md.di*POS_DRAG_SENS;
    const dp=md.dp*POS_DRAG_SENS;
    d.x1=orig.x1+dIdx;d.x2=orig.x2+dIdx;
    d.entry=orig.entry+dp;d.stop=orig.stop+dp;d.target=orig.target+dp;
    return;
  }

  // DVL Beta 0.914 — Drawing Transform Bridge.
  // Body move for Arrow/Line/Rectangle/Text now goes through the centralized transform model.
  // Keep the legacy block below as fallback if the model is unavailable.
  try{
    if(window.DVL_DRAWING_TRANSFORM_MODEL && typeof window.DVL_DRAWING_TRANSFORM_MODEL.pointDeltaFromScreen==='function'){
      const dt=window.DVL_DRAWING_TRANSFORM_MODEL;
      const delta=dt.pointDeltaFromScreen(_drag.ox,_drag.oy,p.x,p.y,{});
      const next=dt.moveBody(orig,delta);
      if(next&&typeof dt.applyInto==='function'){dt.applyInto(d,next);return;}
    }
  }catch(_){}

  const md=_modelDragDelta(p,cs,d.type);
  const di=md.di;
  const dp=md.dp;
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
    const POS_HANDLE_SENS=0.52;
    const isLong=d.type==='longpos';
    const orig=_drag.origDraw||d;
    const md=_modelDragDelta(p,cs,d.type);
    const dp=md.dp*POS_HANDLE_SENS;
    const di=md.di*POS_HANDLE_SENS;
    if(h==='h_entry'){
      // Clamp entry between stop and target so it never leaves the zone
      const lo=Math.min(d.stop,d.target),hi=Math.max(d.stop,d.target);
      d.entry=Math.max(lo,Math.min(hi,orig.entry+dp));
    } else if(h==='h_target'){
      d.target=orig.target+dp;
      // TP crossed entry → flip type and swap TP/SL
      if((isLong&&d.target<d.entry)||(!isLong&&d.target>d.entry)){
        const tmp=d.stop;d.stop=d.target;d.target=tmp;
        d.type=isLong?'shortpos':'longpos';
      }
    } else if(h==='h_stop'){
      d.stop=orig.stop+dp;
      // SL crossed entry → flip type and swap TP/SL
      if((isLong&&d.stop>d.entry)||(!isLong&&d.stop<d.entry)){
        const tmp=d.target;d.target=d.stop;d.stop=tmp;
        d.type=isLong?'shortpos':'longpos';
      }
    } else if(h==='h_right'){
      if(!d.style)d.style={};
      const baseW=Number(orig.style?.fixedPixelWidth)||Math.max(72,Math.abs(cs.xI(orig.x2)-cs.xI(orig.x1)))||118;
      d.style.fixedPixelWidth=clamp(baseW+(p.x-_drag.ox)*POS_HANDLE_SENS,72,220);
      d.x2=orig.x2;
    }
    return;
  }

  // DVL Beta 0.914 — Drawing Transform Bridge.
  // Handles for Arrow/Line/Rectangle/Text now go through the centralized transform model.
  // Keep the legacy block below as fallback if the model is unavailable.
  try{
    if(window.DVL_DRAWING_TRANSFORM_MODEL && typeof window.DVL_DRAWING_TRANSFORM_MODEL.moveHandle==='function'){
      const dt=window.DVL_DRAWING_TRANSFORM_MODEL;
      const next=dt.moveHandle(_drag.origDraw||d,h,{x:p.x,y:p.y},{snap:true});
      if(next&&typeof dt.applyInto==='function'){dt.applyInto(d,next);return;}
    }
  }catch(_){}

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
    const anchorX=cs.xI(d.x1);
    const fixedW=clamp(Number(d.style?.fixedPixelWidth)||118,72,220);
    const xa=clamp(anchorX,PL,Math.max(PL,right-fixedW));
    const xb=clamp(xa+fixedW,PL+fixedW,right);
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
    const anchorX=cs.xI(d.x1);
    const fixedW=clamp(Number(d.style?.fixedPixelWidth)||118,72,220);
    const xa=clamp(anchorX,PL,Math.max(PL,right-fixedW));
    const xb=clamp(xa+fixedW,PL+fixedW,right);
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
  const pRgb='0,220,130',sRgb='255,70,100';
  ctx.save();ctx.globalAlpha=1;
  ctx.setLineDash([4,3]);
  ctx.fillStyle=`rgba(${pRgb},0.12)`;ctx.fillRect(xa,Math.min(ye,yt),visW,Math.abs(yt-ye));
  ctx.fillStyle=`rgba(${sRgb},0.10)`;ctx.fillRect(xa,Math.min(ye,ys),visW,Math.abs(ys-ye));
  ctx.lineWidth=1;ctx.strokeStyle=`rgba(${pRgb},0.70)`;ctx.strokeRect(xa,Math.min(ye,yt)+.5,visW,Math.abs(yt-ye));
  ctx.strokeStyle=`rgba(${sRgb},0.68)`;ctx.strokeRect(xa,Math.min(ye,ys)+.5,visW,Math.abs(ys-ye));
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(200,216,240,0.88)';ctx.beginPath();ctx.moveTo(xa,ye);ctx.lineTo(right,ye);ctx.stroke();
  ctx.lineWidth=1.15;ctx.strokeStyle=`rgba(${pRgb},0.82)`;ctx.beginPath();ctx.moveTo(xa,yt);ctx.lineTo(right,yt);ctx.stroke();
  ctx.strokeStyle=`rgba(${sRgb},0.80)`;ctx.beginPath();ctx.moveTo(xa,ys);ctx.lineTo(right,ys);ctx.stroke();
  ctx.setLineDash([]);
  const lx=Math.min(xb+8,right-90);
  ctx.font='9px monospace';ctx.textAlign='left';
  ctx.fillStyle='rgba(200,216,240,0.92)';ctx.fillText('Entry '+priceFmt(entry),lx,ye+4);
  ctx.fillStyle=`rgba(${pRgb},0.92)`;ctx.fillText('TP '+priceFmt(target),lx,yt+4);
  ctx.fillStyle=`rgba(${sRgb},0.92)`;ctx.fillText('SL '+priceFmt(stop),lx,ys+4);
  const hdrY=clamp(Math.min(ye,yt,ys)-18,PT+2,H-PB-20),hdrX=clamp(xa,PL,right-70);
  ctx.fillStyle=isLong?'rgba(0,230,118,0.24)':'rgba(255,61,87,0.24)';
  ctx.strokeStyle=isLong?'rgba(0,230,118,0.62)':'rgba(255,61,87,0.62)';
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
  const anchorX=cs.xI(d.x1);
  const fixedW=clamp(Number(d.style?.fixedPixelWidth)||118,72,220);
  const xa=clamp(anchorX,PL,Math.max(PL,right-fixedW));
  const xb=clamp(xa+fixedW,PL+fixedW,right);
  const bW=Math.max(20,xb-xa);
  const ye=cs.yP(d.entry),ys=cs.yP(d.stop),yt=cs.yP(d.target);
  const isLong=d.type==='longpos';
  const pCol=d.style?.tpColor||'#00dc82';
  const sCol=d.style?.slColor||'#ff4664';
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
function _renderToolHint(ctx){ return; }
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
  const names={trendline:'Linha',rectangle:'Retângulo',text:'Texto',arrow:'Seta',longpos:'Long',shortpos:'Short'};
  const title=document.createElement('span');title.textContent=names[work.type]||work.type;hdr.appendChild(title);
  const mini=document.createElement('span');mini.textContent='ARRASTE';mini.style.cssText='font-size:8px;color:#6a7fa0;letter-spacing:.1em;';hdr.appendChild(mini);
  inner.appendChild(hdr);
  const row=(lbl,ctrl)=>{
    const div=document.createElement('div');div.className='dvl-setting-row';
    const l=document.createElement('span');l.textContent=lbl;
    div.appendChild(l);div.appendChild(ctrl);inner.appendChild(div);
  };
  const mkColor=(val,cb)=>{
    const palette=['#18d7ff','#00a7df','#13dc8d','#ff4a61','#f3c768','#8f4de8','#e8f0ff','#8999ad','#ffffff','#0064b4','#00dc82','#ff5a46'];
    const wrap2=document.createElement('div');wrap2.className='dvl-custom-color';
    let current=String(val||'#00d4ff').trim();
    const btn=document.createElement('button');btn.type='button';btn.className='dvl-color-chip-btn';btn.style.setProperty('--picked',current);
    const pop=document.createElement('div');pop.className='dvl-color-pop';pop.setAttribute('aria-hidden','true');
    const grid=document.createElement('div');grid.className='dvl-color-grid';
    const setColor=(color)=>{
      current=String(color||current).trim();
      if(!/^#[0-9a-f]{6}$/i.test(current))return;
      btn.style.setProperty('--picked',current);
      cb(current);preview();
      hex.value=current.toUpperCase();
      wrap2.classList.remove('is-open');pop.setAttribute('aria-hidden','true');
    };
    palette.forEach(color=>{
      const sw=document.createElement('button');sw.type='button';sw.className='dvl-color-swatch';sw.style.background=color;sw.title=color;
      sw.addEventListener('click',e=>{e.stopPropagation();setColor(color);});
      grid.appendChild(sw);
    });
    const hex=document.createElement('input');hex.type='text';hex.className='dvl-color-hex';hex.value=current.toUpperCase();hex.maxLength=7;hex.spellcheck=false;
    hex.addEventListener('click',e=>e.stopPropagation());
    hex.addEventListener('keydown',e=>{if(e.key==='Enter')setColor(hex.value);if(e.key==='Escape'){wrap2.classList.remove('is-open');pop.setAttribute('aria-hidden','true');}});
    hex.addEventListener('change',()=>setColor(hex.value));
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const open=!wrap2.classList.contains('is-open');
      document.querySelectorAll('.dvl-custom-color.is-open').forEach(x=>{if(x!==wrap2)x.classList.remove('is-open');});
      wrap2.classList.toggle('is-open',open);
      pop.setAttribute('aria-hidden',open?'false':'true');
    });
    document.addEventListener('click',e=>{if(!wrap2.contains(e.target)){wrap2.classList.remove('is-open');pop.setAttribute('aria-hidden','true');}});
    pop.appendChild(grid);pop.appendChild(hex);
    wrap2.appendChild(btn);wrap2.appendChild(pop);
    return wrap2;
  };
  const mkNum=(val,min,max,step,cb)=>{
    const wrap2=document.createElement('div');wrap2.className='dvl-num-stepper';
    let current=Number.isFinite(+val)?+val:min;
    const normalize=(n)=>{
      const snapped=Math.round((Number(n)-min)/step)*step+min;
      return Math.max(min,Math.min(max,+snapped.toFixed(4)));
    };
    const fmt=(n)=>String(Number.isInteger(n)?n:n.toFixed(1)).replace('.',',');
    const minus=document.createElement('button');minus.type='button';minus.className='dvl-step-btn';minus.textContent='−';
    const value=document.createElement('button');value.type='button';value.className='dvl-step-value';value.textContent=fmt(current);
    const plus=document.createElement('button');plus.type='button';plus.className='dvl-step-btn';plus.textContent='+';
    const set=(n)=>{
      current=normalize(n);
      value.textContent=fmt(current);
      cb(current);
      preview();
    };
    minus.addEventListener('click',e=>{e.stopPropagation();set(current-step);});
    plus.addEventListener('click',e=>{e.stopPropagation();set(current+step);});
    value.addEventListener('click',e=>{e.stopPropagation();set(current+step);});
    wrap2.appendChild(minus);wrap2.appendChild(value);wrap2.appendChild(plus);
    return wrap2;
  };
  const mkDash=(val,cb)=>{
    const opts=[['solid','Sólida'],['dashed','Tracejada'],['dotted','Pontilhada']];
    const wrap2=document.createElement('div');wrap2.className='dvl-custom-select';
    let current=val||'solid';
    const label=()=>opts.find(([v])=>v===current)?.[1]||'Sólida';
    const btn=document.createElement('button');btn.type='button';btn.className='dvl-select-btn';btn.innerHTML=`<span>${label()}</span><b>⌄</b>`;
    const pop=document.createElement('div');pop.className='dvl-select-pop';pop.setAttribute('aria-hidden','true');
    const close=()=>{wrap2.classList.remove('is-open');pop.setAttribute('aria-hidden','true');};
    const open=()=>{document.querySelectorAll('.dvl-custom-select.is-open').forEach(x=>{if(x!==wrap2)x.classList.remove('is-open');});wrap2.classList.add('is-open');pop.setAttribute('aria-hidden','false');};
    opts.forEach(([v,l])=>{
      const item=document.createElement('button');item.type='button';item.className='dvl-select-item';item.dataset.value=v;item.innerHTML=`<span>${l}</span><i>${v===current?'✓':''}</i>`;
      item.addEventListener('click',e=>{
        e.stopPropagation();
        current=v;
        cb(current);
        preview();
        btn.innerHTML=`<span>${label()}</span><b>⌄</b>`;
        pop.querySelectorAll('.dvl-select-item').forEach(x=>{x.classList.toggle('is-active',x.dataset.value===current);x.querySelector('i').textContent=x.dataset.value===current?'✓':'';});
        close();
      });
      if(v===current)item.classList.add('is-active');
      pop.appendChild(item);
    });
    btn.addEventListener('click',e=>{e.stopPropagation();wrap2.classList.contains('is-open')?close():open();});
    document.addEventListener('click',e=>{if(!wrap2.contains(e.target))close();});
    wrap2.appendChild(btn);wrap2.appendChild(pop);
    return wrap2;
  };
  const mkRange=(val,min,max,step,cb)=>{const wrap2=document.createElement('div');wrap2.style.cssText='display:flex;align-items:center;gap:8px;';const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.step=step;r.value=val;r.style.cssText='width:96px;';const lbl2=document.createElement('span');lbl2.textContent=Math.round(val*100)+'%';lbl2.style.cssText='color:#7f91a8;font-size:10px;width:34px;text-align:right;';r.addEventListener('input',e=>{cb(+e.target.value);lbl2.textContent=Math.round(+e.target.value*100)+'%';preview();});wrap2.appendChild(r);wrap2.appendChild(lbl2);return wrap2;};
  const mkCheck=(val,cb)=>{const i=document.createElement('input');i.type='checkbox';i.checked=!!val;i.style.cssText='accent-color:#10df77;width:16px;height:16px;cursor:pointer;';i.addEventListener('change',e=>{cb(e.target.checked);preview();});return i;};
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
    const defTp='#00dc82',defSl='#ff4664';
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
  let _lk=_sKey();
  const sync=()=>{const k=_sKey();if(k!==_lk){_lk=k;_loadDrawings();}};
  window.addEventListener("dvl-safe-asset-selected-0804",sync,true);
  window.addEventListener("dvl-symbol-change",sync,true);
  window.addEventListener("dvl-symbol-selected",sync,true);
  document.addEventListener("click",function(ev){
    const t=ev.target&&ev.target.closest?ev.target.closest("[data-tf],.tfBtn,#dvl1b_tfDropMenu button"):null;
    if(t) setTimeout(sync,0);
  },true);
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


/* DVL Beta 0.876 — Legacy ruler runtime removed. Ruler oficial: DVL_BETA_0519_RULER_V2_JS. */
