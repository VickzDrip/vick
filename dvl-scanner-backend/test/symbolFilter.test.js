"use strict";

/* symbolFilter test — confirms tokenized stocks/indices/commodities/forex are
   dropped while real crypto (incl. same-ticker memecoins) is kept. */

const assert = require("assert");
const { isTradableCrypto } = require("../src/symbolFilter");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }

// dropped: anything with STOCK, and the index/metal/energy/forex set
["SKHYNIXSTOCK", "MUSTOCK", "SAMSUNGSTOCK", "NAS100", "SPX500", "US30",
 "GER40", "JP225", "XAU", "XAG", "WTI", "USOIL", "EURUSD", "DXY",
 "SOXL", "SOXS", "TQQQ", "SQQQ", "SPXL", "TSLL", "UVXY",
 "NVIDIA", "TESLA", "MICROSTRATEGY", "COINBASE", "EWY", "DRAM"]
  .forEach(b => ok(!isTradableCrypto(b), b + " should be filtered out"));

// kept: real crypto, including memecoins that share a ticker with equities/indices
["BTC", "ETH", "SOL", "AAVE", "ARB", "WLD", "VELVET", "PI",
 "SPX6900", "SPX", "MU", "MSTR"]
  .forEach(b => ok(isTradableCrypto(b), b + " should be kept"));

// case-insensitive + empty guards
ok(!isTradableCrypto("nas100"), "lowercase index filtered");
ok(!isTradableCrypto("skhynixstock"), "lowercase stock filtered");
ok(!isTradableCrypto(""), "empty base rejected");
ok(!isTradableCrypto(null), "null base rejected");

console.log(fail ? ("SYMBOL FILTER — " + pass + " passed, " + fail + " FAILED")
                 : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
