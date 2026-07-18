# DVL RSI Exaustão — Expert Advisor para MT5

Port **fiel** do backtest **"RSI Exaustão"** do DepthVisionLab:

- **Gatilho:** pré-volume baixo + spike (ignição pós-flat, na vela FECHADA).
- **Direção:** o SEU Exhaustion RSI — RSI de **Cutler** + push de exaustão (volume spike + pavio + fechamento). Valor `≤ LowerZone` → **LONG**, `≥ UpperZone` → **SHORT**.
- **Saída:** alvo/stop em múltiplos de **ATR**, risco fixo por trade (% do saldo).

É o **mesmo cálculo** do grid do app (função `valueFrom`/`rsiGridSearch` no backend) — então os resultados devem casar com o que você viu no card **📈 RSI Exaustão**.

## Instalar
1. Copie `DVL_RSI_Exhaustion_EA.mq5` para `MQL5/Experts/` (no MetaEditor: File → Open Data Folder).
2. Compile (F7). Deve compilar sem erros.
3. Arraste o EA pro gráfico do BTC.

## Otimizar (varrer os combos, igual ao app)
Strategy Tester → aba **Inputs** → marque os parâmetros e ponha os mesmos ranges do app:

| Input | Start | Step | Stop |
|---|---|---|---|
| RsiLen | 5 | 1 | 25 |
| Push | 0 | 4 | 30 |
| VolMaLen | 10 | 5 | 30 |
| VolSpikeAt | 1.5 | 0.5 | 4 |
| LowerZone | 20 | 4 | 40 |
| UpperZone | 60 | 4 | 80 |
| TpAtr | 1 | 0.5 | 6 |
| SlAtr | 1.2 | — | 1.2 (fixo, como o app) |

Use o otimizador **genético** do MT5 (é rápido pra esse tamanho de grid). Ranqueie por lucro/drawdown e **valide fora da amostra** (Forward = 1/4 ou 1/2) — é o equivalente ao "verde no treino E no teste" do app.

## ⚠️ O ponto do VOLUME (leia isto)
O oscilador e a ignição usam **volume**. O backtest do app usa **volume REAL do MEXC**. No MT5:

- **`UseRealVolume = false`** (padrão): usa **tick volume** (nº de ticks). Na Deriv é isso que tem — é um **proxy razoável** do "calmaria → estouro", mas **não é idêntico** ao real.
- **Pra bater 100%:** crie um **Símbolo Personalizado** no MT5 e importe os candles do MEXC (OHLCV com **volume real**), depois rode o EA nesse símbolo com **`UseRealVolume = true`**. Aí volume/RSI/ignição ficam idênticos ao app.

## Fidelidade — o que confere e o que não
- ✅ **Cutler RSI** (o MT5 tem só o RSI de Wilder no `iRSI` — por isso implementei o de Cutler na mão, é o que o app usa).
- ✅ **Exaustão, ignição, zonas, ATR, risco fixo** — mesma matemática do backend.
- ⚠️ **Self-exhaustion**: o EA replica a exaustão calculada **no próprio TF** (como o backtest anual faz). O gráfico AO VIVO do app adiciona o push de timeframes menores (1m) — isso o EA **não** faz, porque o backtest também não fazia. Ou seja: **o EA = o backtest**, que é o que você testou.
- ⚠️ **Volume**: veja acima.
- ⚠️ **Custos**: configure spread/comissão da Deriv no tester; o app assume ~0.08%/trade.

## Como provar que bateu (gabarito)
Se quiser certeza matemática, dá pra exportar do backend os valores **barra a barra** (ignição, valor do RSI, ATR) e comparar com o que o EA calcula nas mesmas velas. Me avisa que eu preparo esse export.
