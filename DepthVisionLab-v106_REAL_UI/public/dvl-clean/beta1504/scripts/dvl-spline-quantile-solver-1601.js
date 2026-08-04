/* ──────────────────────────────────────────────────────────────────────────
   DVL Spline Quantile Channel — SOLVER isolado (Beta 1.601+)

   Implementação INDEPENDENTE, a partir da matemática do spec (regressão
   quantílica por spline cúbica truncada + IRLS + Cholesky). Técnica genérica —
   NÃO é uma cópia do Pine da LuxAlgo. Nome do indicador: "DVL Spline Quantile
   Channel". A decisão de licença é do produto antes de deploy comercial.

   Módulo puro (sem DOM, sem rede): roda em Node (testes de paridade) e num Web
   Worker. Sem inversão explícita de matriz — resolve o sistema por Cholesky
   (SPD) com fallback LU com pivotamento parcial. Regularização ridge 1e-4,
   epsilon 1e-6, exatamente como no spec.
   ────────────────────────────────────────────────────────────────────────── */
(function(root, factory){
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;      // Node / testes
  if (typeof self !== "undefined") self.DVLSplineSolver = api;                     // Web Worker
  if (typeof window !== "undefined") window.DVLSplineSolver = api;                 // browser (fallback)
})(this, function(){
  "use strict";

  var RIDGE = 1e-4;   // regularização na diagonal (spec §5/§6)
  var EPS   = 1e-6;   // epsilon dos pesos IRLS e piso do desvio-padrão (spec §5/§16)

  /* Base spline: [1, x, x^2, x^3, max(0, x-knot_j)^3 ...], knots = j/(k+1). */
  function knotPositions(knots){
    var out = new Array(knots);
    for (var j = 0; j < knots; j++) out[j] = (j + 1) / (knots + 1);
    return out;
  }
  function basisRow(x, kn){
    var p = 4 + kn.length, row = new Float64Array(p);
    var x2 = x * x, x3 = x2 * x;
    row[0] = 1; row[1] = x; row[2] = x2; row[3] = x3;
    for (var j = 0; j < kn.length; j++){
      var d = x - kn[j];
      row[4 + j] = d > 0 ? d * d * d : 0;
    }
    return row;
  }
  /* Matriz de design N×p para posições x[i] = i/(N-1) (i: antigo→recente). */
  function designMatrix(N, kn){
    var X = new Array(N), denom = Math.max(1, N - 1);
    for (var i = 0; i < N; i++) X[i] = basisRow(i / denom, kn);
    return X;
  }

  /* ── Álgebra linear (p pequeno: no máx 19) ───────────────────────────────── */
  // Resolve A x = b para A simétrica positiva-definida via Cholesky (A = L Lᵀ).
  // Retorna null se A não for SPD (pivô <= 0) → caller cai no LU.
  function solveCholesky(A, b, p){
    var L = new Array(p);
    for (var i = 0; i < p; i++) L[i] = new Float64Array(p);
    for (i = 0; i < p; i++){
      for (var j = 0; j <= i; j++){
        var sum = A[i][j];
        for (var k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j){
          if (sum <= 0) return null;          // não SPD
          L[i][j] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    // L y = b (forward), Lᵀ x = y (back)
    var y = new Float64Array(p);
    for (i = 0; i < p; i++){
      var s = b[i];
      for (k = 0; k < i; k++) s -= L[i][k] * y[k];
      y[i] = s / L[i][i];
    }
    var x = new Float64Array(p);
    for (i = p - 1; i >= 0; i--){
      s = y[i];
      for (k = i + 1; k < p; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    if (!allFinite(x)) return null;
    return x;
  }
  // Fallback: LU com pivotamento parcial (copia A/b, não muta o caller).
  function solveLU(A0, b0, p){
    var A = new Array(p), b = new Float64Array(p), i, j, k;
    for (i = 0; i < p; i++){ A[i] = Float64Array.from(A0[i]); b[i] = b0[i]; }
    for (k = 0; k < p; k++){
      var piv = k, mx = Math.abs(A[k][k]);
      for (i = k + 1; i < p; i++){ var v = Math.abs(A[i][k]); if (v > mx){ mx = v; piv = i; } }
      if (mx < 1e-300) return null;                       // singular
      if (piv !== k){ var t = A[piv]; A[piv] = A[k]; A[k] = t; var tb = b[piv]; b[piv] = b[k]; b[k] = tb; }
      for (i = k + 1; i < p; i++){
        var f = A[i][k] / A[k][k];
        A[i][k] = 0;
        for (j = k + 1; j < p; j++) A[i][j] -= f * A[k][j];
        b[i] -= f * b[k];
      }
    }
    var x = new Float64Array(p);
    for (i = p - 1; i >= 0; i--){
      var s = b[i];
      for (j = i + 1; j < p; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    if (!allFinite(x)) return null;
    return x;
  }
  function solveSystem(A, b, p){
    var x = solveCholesky(A, b, p);
    if (x) return x;
    return solveLU(A, b, p);                              // fallback
  }
  function allFinite(v){ for (var i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) return false; return true; }

  /* ── Ridge OLS (init do IRLS): (XᵀX + λI) β = Xᵀy ────────────────────────── */
  function ridgeOLS(X, y, p){
    var N = X.length;
    var XtX = zeros(p), Xty = new Float64Array(p), i, r, c;
    for (i = 0; i < N; i++){
      var xi = X[i], yi = y[i];
      for (r = 0; r < p; r++){
        Xty[r] += xi[r] * yi;
        var xir = xi[r], Ar = XtX[r];
        for (c = r; c < p; c++) Ar[c] += xir * xi[c];
      }
    }
    symmetrize(XtX, p);
    for (r = 0; r < p; r++) XtX[r][r] += RIDGE;
    var beta = solveSystem(XtX, Xty, p);
    if (!beta){ beta = new Float64Array(p); beta[0] = mean(y); }   // fallback β=[mean(y),0…]
    return beta;
  }

  /* ── IRLS quantílico (spec §5) ───────────────────────────────────────────── */
  function irlsQuantile(X, y, tau, iterations, betaInit, p){
    var N = X.length;
    var beta = Float64Array.from(betaInit);
    for (var it = 0; it < iterations; it++){
      var XtWX = zeros(p), XtWy = new Float64Array(p), i, r, c;
      for (i = 0; i < N; i++){
        var xi = X[i];
        var pred = 0; for (r = 0; r < p; r++) pred += xi[r] * beta[r];
        var residual = y[i] - pred;
        var asym = residual > 0 ? tau : (1 - tau);
        var weight = asym / Math.max(Math.abs(residual), EPS);
        for (r = 0; r < p; r++){
          var wxr = weight * xi[r];
          XtWy[r] += wxr * y[i];
          var Ar = XtWX[r];
          for (c = r; c < p; c++) Ar[c] += wxr * xi[c];
        }
      }
      symmetrize(XtWX, p);
      for (r = 0; r < p; r++) XtWX[r][r] += RIDGE;
      var next = solveSystem(XtWX, XtWy, p);
      if (!next) break;                                  // solve falhou → mantém último β
      beta = next;
    }
    return beta;
  }

  /* ── util ─────────────────────────────────────────────────────────────────*/
  function zeros(p){ var m = new Array(p); for (var i = 0; i < p; i++) m[i] = new Float64Array(p); return m; }
  function symmetrize(M, p){ for (var r = 0; r < p; r++) for (var c = r + 1; c < p; c++) M[c][r] = M[r][c]; }
  function mean(v){ var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return v.length ? s / v.length : 0; }
  function stdev(v, mu){ var s = 0, n = v.length; for (var i = 0; i < n; i++){ var d = v[i] - mu; s += d * d; } return n > 1 ? Math.sqrt(s / (n - 1)) : 0; }

  function evalCurve(X, beta, p){
    var n = X.length, out = new Float64Array(n);
    for (var i = 0; i < n; i++){ var xi = X[i], v = 0; for (var r = 0; r < p; r++) v += xi[r] * beta[r]; out[i] = v; }
    return out;
  }

  /* ── Fit de um quantil: retorna {beta, historyStd} ───────────────────────── */
  function fitQuantile(Xtrain, yStd, tau, iterations, p, warmBeta){
    var init = warmBeta && warmBeta.length === p ? warmBeta : ridgeOLS(Xtrain, yStd, p);
    var beta = irlsQuantile(Xtrain, yStd, tau, iterations, init, p);
    return beta;
  }

  /* ── API principal ────────────────────────────────────────────────────────
     closes: Array/Float64Array dos N closes em ordem ANTIGO→RECENTE (o caller
     garante a ordem). config: {knots,iterations,forecast,upperQ,medianQ,lowerQ,
     warm?:{upper,median,lower}}. Retorna curvas no domínio de PREÇO. */
  function fit(closes, config){
    var N = closes.length;
    var knots = clampInt(config.knots, 1, 15, 3);
    var iterations = clampInt(config.iterations, 1, 200, 100);
    var forecast = clampInt(config.forecast, 0, 100, 20);
    var p = 4 + knots;
    var kn = knotPositions(knots);

    // padronização
    var y = Float64Array.from(closes);
    var mu = mean(y), sigma = Math.max(stdev(y, mu), EPS);
    var yStd = new Float64Array(N);
    for (var i = 0; i < N; i++) yStd[i] = (y[i] - mu) / sigma;

    var Xtrain = designMatrix(N, kn);

    // forecast: mesma spline avaliada em x>1 (posições virtuais)
    var Xf = null;
    if (forecast > 0){
      var denom = Math.max(1, N - 1);
      Xf = new Array(forecast);
      for (var f = 0; f < forecast; f++) Xf[f] = basisRow((N - 1 + (f + 1)) / denom, kn);
    }

    var warm = config.warm || {};
    var res = { generation: config.generation, converged: true };
    var quints = [
      ["upper",  clampQ(config.upperQ,  0.95), warm.upper],
      ["median", clampQ(config.medianQ, 0.50), warm.median],
      ["lower",  clampQ(config.lowerQ,  0.05), warm.lower]
    ];
    res.beta = {};
    for (var q = 0; q < quints.length; q++){
      var name = quints[q][0], tau = quints[q][1], warmB = quints[q][2];
      var beta = fitQuantile(Xtrain, yStd, tau, iterations, p, warmB);
      res.beta[name] = beta;
      var hStd = evalCurve(Xtrain, beta, p);
      var hist = new Float64Array(N);
      for (i = 0; i < N; i++) hist[i] = hStd[i] * sigma + mu;   // reverter padronização
      res[name + "History"] = hist;
      if (Xf){
        var fStd = evalCurve(Xf, beta, p), fc = new Float64Array(forecast);
        for (f = 0; f < forecast; f++) fc[f] = fStd[f] * sigma + mu;
        res[name + "Forecast"] = fc;
      } else {
        res[name + "Forecast"] = new Float64Array(0);
      }
      if (!allFinite(hist)) res.converged = false;
    }
    res.mu = mu; res.sigma = sigma; res.p = p; res.knots = knots; res.forecast = forecast; res.N = N;
    return res;
  }

  function clampInt(v, a, b, d){ v = Math.round(Number(v)); if (!Number.isFinite(v)) v = d; return Math.max(a, Math.min(b, v)); }
  function clampQ(v, d){ v = Number(v); if (!Number.isFinite(v)) v = d; return Math.max(0.01, Math.min(0.99, v)); }

  return {
    fit: fit,
    // expostos p/ testes de unidade
    _basisRow: basisRow, _knotPositions: knotPositions, _designMatrix: designMatrix,
    _solveCholesky: solveCholesky, _solveLU: solveLU, _solveSystem: solveSystem,
    _ridgeOLS: ridgeOLS, _irlsQuantile: irlsQuantile, _mean: mean, _stdev: stdev,
    RIDGE: RIDGE, EPS: EPS
  };
});
