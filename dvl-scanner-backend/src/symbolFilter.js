"use strict";

/* ── Non-crypto symbol filter ────────────────────────────────────────
   MEXC lists tokenized STOCKS, stock INDICES, COMMODITIES/METALS and FOREX
   as USDT perps (SKHYNIXSTOCK, MUSTOCK, NAS100, SPX500, XAU, WTI, …). They
   barely move, so any micro-tick becomes "many ATRs" — which lets them
   dominate the pré-pump / pré-short ranking (an ATR-normalised score) with
   noise, and they're not what this scanner is for (crypto pré-pumps). Drop
   them from the candidate universe by name.

   Conservative by design: a "STOCK" substring, plus an explicit exact-match
   set of index/metal/energy/forex tickers. Exact match (not substring) so
   real coins are never caught — e.g. SPX6900 (base "SPX6900") stays, only the
   S&P index "SPX500" is dropped; AAVE, ARB, WLD etc. are untouched. Single
   tokenised equities without a STOCK suffix (AAPL, TSLA…) are intentionally
   NOT listed here to avoid shadowing same-ticker memecoins; add them only if
   they actually show up as noise. */

const NON_CRYPTO_BASES = new Set([
  // stock indices (numbered / unambiguous)
  "NAS100", "US100", "SPX500", "US500", "US30", "US2000", "DJI30",
  "GER30", "GER40", "DE40", "DAX40", "UK100", "FTSE100", "JP225", "NIKKEI225",
  "HK50", "EU50", "STOXX50", "FRA40", "CAC40", "AUS200", "CHINA50", "ES35", "IT40",
  // metals
  "XAU", "XAUUSD", "XAG", "XAGUSD", "XPT", "XPD",
  // energy / commodities (unambiguous tickers only)
  "WTI", "USOIL", "UKOIL", "BRENT", "NGAS", "NATGAS",
  // forex majors (bare-currency perps)
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD",
  "EURJPY", "GBPJPY", "DXY", "USDX"
]);

/* true when `base` (the symbol with the USDT quote already stripped) is a
   tradable crypto we want in the scanner; false for stocks/indices/etc. */
function isTradableCrypto(base) {
  base = String(base || "").toUpperCase();
  if (!base) return false;
  if (base.includes("STOCK")) return false;   // SKHYNIXSTOCK, MUSTOCK, SAMSUNGSTOCK…
  if (NON_CRYPTO_BASES.has(base)) return false;
  return true;
}

module.exports = { isTradableCrypto, NON_CRYPTO_BASES };
