"use strict";

/* ── Sharpe API probe (optional third-party source) ─────────────────
   Sharpe (sharpe.ai) DOES list MEXC among its covered perpetual venues, so
   unlike Coinalyze it may be able to backfill MEXC OI history. We can't read
   their docs from the build environment (Cloudflare blocks it), so this thin
   client just forwards a call to their REST API with the Bearer key and hands
   back the raw response — the /sharpe-debug endpoint uses it to discover, from
   the VPS, whether historical OI exists and whether it covers a given MEXC
   symbol before we commit to wiring it into the panel.

   Base: https://www.sharpe.ai/api/v1  ·  auth: Authorization: Bearer <key>
   Disabled unless DVL_SHARPE_KEY is set. Host is hard-pinned to sharpe.ai so
   the key can never be forwarded elsewhere. */

const BASE = "https://www.sharpe.ai/api/v1";
const KEY = process.env.DVL_SHARPE_KEY || "";

function enabled() { return !!KEY; }

async function get(path, params) {
  const p = String(path || "").startsWith("/") ? path : "/" + String(path || "");
  const qs = params && Object.keys(params).length ? ("?" + new URLSearchParams(params).toString()) : "";
  const res = await fetch(BASE + p + qs, { headers: { Authorization: "Bearer " + KEY }, cache: "no-store" });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* non-JSON error body */ }
  return { status: res.status, ok: res.ok, json, text: json ? null : String(text).slice(0, 600) };
}

module.exports = { enabled, get, BASE };
