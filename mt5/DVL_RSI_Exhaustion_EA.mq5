//+------------------------------------------------------------------+
//|  DVL_RSI_Exhaustion_EA.mq5                                       |
//|  Port FIEL do backtest "RSI Exaustão" do DepthVisionLab:         |
//|  gatilho = pré-volume baixo + spike (ignição pós-flat),          |
//|  direção = Exhaustion RSI (RSI de Cutler + push de exaustão),     |
//|  saída  = alvo/stop em múltiplos de ATR.                          |
//|                                                                    |
//|  Todos os parâmetros são `input` → use o OTIMIZADOR do MT5        |
//|  (Strategy Tester) pra varrer os combos, igual ao app.            |
//|                                                                    |
//|  ⚠️ VOLUME: o oscilador e a ignição usam VOLUME. O backtest do    |
//|  app usa VOLUME REAL do MEXC. No MT5 o volume padrão é TICK       |
//|  volume (nº de ticks) — proxy razoável, mas NÃO idêntico. Pra     |
//|  bater 100%, rode num SÍMBOLO PERSONALIZADO com os candles do     |
//|  MEXC importados (OHLCV com volume real). Veja UseRealVolume.     |
//+------------------------------------------------------------------+
#property copyright "DepthVisionLab"
#property version   "1.00"
#property strict

#include <Trade/Trade.mqh>
CTrade trade;

//====================  INPUTS (varríveis no otimizador)  ====================
input group "Exhaustion RSI (o SEU oscilador)"
input int    RsiLen       = 14;    // comprimento do RSI (Cutler, não Wilder)
input double Push         = 18.0;  // push de exaustão (0 = RSI puro de preço)
input int    VolMaLen     = 20;    // média de volume p/ o spike de exaustão
input double VolSpikeAt   = 2.5;   // spike de volume (× a média) que satura a exaustão
input double LowerZone    = 35.0;  // valor <= zona  -> LONG  (sobrevendido)
input double UpperZone    = 60.0;  // valor >= zona  -> SHORT (sobrecomprado)

input group "Gatilho pré-volume (ignição pós-flat)"
input int    MaPeriod1    = 20;    // média de volume da ignição
input int    MinBaseBars  = 6;     // mínimo de velas 'mortas' (vol < média) antes do spike

input group "Saída (em ATR)"
input double TpAtr        = 3.0;   // alvo   = TpAtr  × ATR
input double SlAtr        = 1.2;   // stop   = SlAtr  × ATR
input int    AtrPeriod    = 14;    // período do ATR

input group "Direção / execução"
input bool   AllowLong    = true;
input bool   AllowShort   = true;
input double RiskPct      = 1.0;   // % do saldo arriscado por trade (igual ao app)
input bool   OneAtATime   = true;  // 1 posição por vez (como o backtest)
input bool   UseRealVolume= false; // true = usa VOLUME_REAL (símbolo com volume real); false = tick volume
input long   MagicNumber  = 902100;

//====================  ESTADO  ====================
int      atrHandle = INVALID_HANDLE;
datetime lastBarTime = 0;
const int NBARS = 300;   // velas copiadas por avaliação (>> qualquer lookback)

//+------------------------------------------------------------------+
int OnInit()
{
   atrHandle = iATR(_Symbol, _Period, AtrPeriod);
   if(atrHandle == INVALID_HANDLE){ Print("ATR handle falhou"); return(INIT_FAILED); }
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);
   return(INIT_SUCCEEDED);
}
void OnDeinit(const int reason){ if(atrHandle!=INVALID_HANDLE) IndicatorRelease(atrHandle); }

//+------------------------------------------------------------------+
//| SMA do vetor terminando no índice idx (inclusive), comprimento n |
//+------------------------------------------------------------------+
double SmaAt(const double &arr[], int idx, int n)
{
   if(n < 1) n = 1;
   if(idx < n-1) n = idx+1;
   double s = 0.0;
   for(int k=0; k<n; k++) s += arr[idx-k];
   return (n>0 ? s/n : 0.0);
}

//+------------------------------------------------------------------+
//| RSI de CUTLER (SMA de ganhos/perdas) no último índice de closes  |
//| — igual ao mtfRsi do app (NÃO é o iRSI/Wilder do MT5).           |
//+------------------------------------------------------------------+
double CutlerRsi(const double &closes[], int size, int period)
{
   if(period < 2) period = 2;
   if(size < period+1) return 50.0;
   int i = size-1;
   double g=0.0, l=0.0;
   for(int j=i-period+1; j<=i; j++)
   {
      double d = closes[j]-closes[j-1];
      if(d >= 0) g += d; else l -= d;
   }
   double ag = g/period, al = l/period;
   if(al <= 1e-9) return (ag > 0 ? 100.0 : 50.0);
   return 100.0 - 100.0/(1.0 + ag/al);
}

//+------------------------------------------------------------------+
//| Score de exaustão (0..1) numa vela — igual ao mtfExh do app      |
//+------------------------------------------------------------------+
double Exh(const double &o[], const double &h[], const double &lo[], const double &c[], const double &v[],
           int idx, bool up, int volMaLen, double spikeAt)
{
   if(idx < 7) return 0.0;
   double range = h[idx]-lo[idx];
   if(range <= 0.0) return 0.0;
   int pj = idx-5; if(pj < 0) pj = 0;
   double avgV = SmaAt(v, idx, MathMax(3, volMaLen));
   double sa   = MathMax(1.05, spikeAt);
   double volSpike = MathMax(0.0, MathMin(1.0, (v[idx]/MathMax(avgV,1e-9) - 1.0)/(sa-1.0)));
   if(up)
   {
      double uw   = (h[idx]-MathMax(o[idx],c[idx]))/range;
      double weak = 1.0 - (c[idx]-lo[idx])/range;
      double dir  = (c[idx] > c[pj]) ? 1.0 : 0.0;
      return MathMax(0.0, MathMin(1.0, dir*(uw*0.5+weak*0.5)*(0.15+0.85*volSpike)));
   }
   else
   {
      double lw     = (MathMin(o[idx],c[idx])-lo[idx])/range;
      double strong = (c[idx]-lo[idx])/range;
      double dir    = (c[idx] < c[pj]) ? 1.0 : 0.0;
      return MathMax(0.0, MathMin(1.0, dir*(lw*0.5+strong*0.5)*(0.15+0.85*volSpike)));
   }
}

//+------------------------------------------------------------------+
//| Valor do Exhaustion RSI no último índice (self-exhaustion, igual |
//| ao valueFrom do backend usado no grid): clamp(RSI + (up-dn)*push)|
//+------------------------------------------------------------------+
double ExrValue(const double &o[], const double &h[], const double &lo[], const double &c[], const double &v[], int size)
{
   double base = CutlerRsi(c, size, RsiLen);
   int i = size-1;
   double up = Exh(o,h,lo,c,v, i, true,  VolMaLen, VolSpikeAt);
   double dn = Exh(o,h,lo,c,v, i, false, VolMaLen, VolSpikeAt);
   double val = base + (up-dn)*MathMax(0.0, Push);
   return MathMax(0.0, MathMin(100.0, val));
}

//+------------------------------------------------------------------+
//| Ignição pós-flat no ÚLTIMO índice (última vela FECHADA): spike   |
//| acima da média de volume + N velas 'mortas' antes. = closedIgnition|
//+------------------------------------------------------------------+
bool IsIgnition(const double &v[], int size)
{
   int ci = size-1;                       // última vela fechada (avaliada)
   if(ci < MinBaseBars) return false;
   double maCi = SmaAt(v, ci, MaPeriod1);
   if(maCi <= 0.0) return false;
   if(!(v[ci] > maCi)) return false;      // precisa cruzar ACIMA da média
   int below = 0;
   for(int bi = ci-1; bi >= 0; bi--)
   {
      double mb = SmaAt(v, bi, MaPeriod1);
      if(mb <= 0.0) break;
      if(v[bi] < mb) below++; else break; // conta velas consecutivas abaixo da média
   }
   return (below >= MinBaseBars);
}

//+------------------------------------------------------------------+
bool HasOpenPosition()
{
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(tk==0) continue;
      if(PositionGetString(POSITION_SYMBOL)==_Symbol && PositionGetInteger(POSITION_MAGIC)==MagicNumber)
         return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Lote por risco fixo: perder no stop = RiskPct% do saldo          |
//+------------------------------------------------------------------+
double LotsForRisk(double slDistPrice)
{
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize<=0 || tickVal<=0 || slDistPrice<=0) return 0.0;
   double riskMoney  = AccountInfoDouble(ACCOUNT_BALANCE)*RiskPct/100.0;
   double lossPerLot = (slDistPrice/tickSize)*tickVal;
   if(lossPerLot<=0) return 0.0;
   double lots = riskMoney/lossPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double vmin = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double vmax = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step>0) lots = MathFloor(lots/step)*step;
   lots = MathMax(vmin, MathMin(vmax, lots));
   return lots;
}

//+------------------------------------------------------------------+
void OnTick()
{
   // 1 avaliação por vela FECHADA (mesma regra 'no fechamento' do app)
   datetime t = iTime(_Symbol, _Period, 0);
   if(t == lastBarTime) return;
   lastBarTime = t;

   if(OneAtATime && HasOpenPosition()) return;

   // copia N velas FECHADAS (shift 1 = última fechada), em ordem ASCENDENTE
   double o[],h[],lo[],c[]; long tv[]; double v[];
   ArraySetAsSeries(o,false); ArraySetAsSeries(h,false); ArraySetAsSeries(lo,false);
   ArraySetAsSeries(c,false); ArraySetAsSeries(tv,false);
   int n1 = CopyOpen(_Symbol,_Period,1,NBARS,o);
   int n2 = CopyHigh(_Symbol,_Period,1,NBARS,h);
   int n3 = CopyLow(_Symbol,_Period,1,NBARS,lo);
   int n4 = CopyClose(_Symbol,_Period,1,NBARS,c);
   int n5 = UseRealVolume ? CopyRealVolume(_Symbol,_Period,1,NBARS,tv)
                          : CopyTickVolume(_Symbol,_Period,1,NBARS,tv);
   int n = MathMin(MathMin(n1,n2),MathMin(MathMin(n3,n4),n5));
   if(n < MathMax(RsiLen+2, MaPeriod1+MinBaseBars+2)) return;
   // alinha todos ao mesmo tamanho n e converte volume p/ double
   ArrayResize(v,n);
   for(int i=0;i<n;i++) v[i]=(double)tv[i];

   // ATR da última vela fechada
   double atrArr[]; ArraySetAsSeries(atrArr,false);
   if(CopyBuffer(atrHandle,0,1,1,atrArr) < 1) return;
   double atr = atrArr[0];
   if(atr <= 0.0) return;

   // 1) gatilho: ignição pós-flat na última fechada
   if(!IsIgnition(v, n)) return;

   // 2) direção pelo Exhaustion RSI
   double val = ExrValue(o,h,lo,c,v, n);
   int dir = 0;                         // +1 long, -1 short
   if(val <= LowerZone && AllowLong) dir = +1;
   else if(val >= UpperZone && AllowShort) dir = -1;
   if(dir == 0) return;

   // 3) entrada + brackets em ATR
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double slDist = SlAtr*atr, tpDist = TpAtr*atr;
   double lots = LotsForRisk(slDist);
   if(lots <= 0.0) return;

   if(dir == +1)
   {
      double sl = ask - slDist, tp = ask + tpDist;
      trade.Buy(lots, _Symbol, 0.0, sl, tp, "DVL RSIExh long");
   }
   else
   {
      double sl = bid + slDist, tp = bid - tpDist;
      trade.Sell(lots, _Symbol, 0.0, sl, tp, "DVL RSIExh short");
   }
}
//+------------------------------------------------------------------+
