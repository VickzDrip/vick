"use strict";
/* DVL Telegram Alerts V1 — identidade estável do "usuário" (V1 = dispositivo).
   Não há sistema de contas no DVL; usamos um cookie httpOnly ASSINADO como
   dvl_user_id estável. Se/quando houver login real, troca-se só isto por
   req.user.id. Segredo de assinatura fica no servidor (env ou arquivo). */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const repo = require("./repo");

const COOKIE = "dvl_did";
let _secret = null;

function secret() {
  if (_secret) return _secret;
  if (process.env.DVL_DEVICE_SECRET) { _secret = process.env.DVL_DEVICE_SECRET; return _secret; }
  const p = path.join(path.dirname(config.dbPath), "device-secret.key");
  try {
    _secret = fs.readFileSync(p, "utf8").trim();
    if (_secret) return _secret;
  } catch (_) {}
  _secret = crypto.randomBytes(32).toString("hex");
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, _secret, { mode: 0o600 }); } catch (_) {}
  return _secret;
}

function sign(id) {
  const sig = crypto.createHmac("sha256", secret()).update(id).digest("base64url");
  return id + "." + sig;
}
function verify(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const i = token.lastIndexOf(".");
  const id = token.slice(0, i), sig = token.slice(i + 1);
  const expect = crypto.createHmac("sha256", secret()).update(id).digest("base64url");
  try {
    if (sig.length === expect.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return id;
  } catch (_) {}
  return null;
}
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

/* Middleware: garante req.dvlUserId estável. Aceita também um id assinado via
   header X-DVL-Device (fallback p/ quando o cookie some mas o localStorage tem). */
function middleware(req, res, next) {
  try {
    const cookies = parseCookies(req.headers && req.headers.cookie);
    let id = verify(cookies[COOKIE]);
    if (!id) id = verify(req.headers && req.headers["x-dvl-device"]);
    if (!id) {
      id = crypto.randomUUID();
      const token = sign(id);
      res.setHeader("Set-Cookie",
        COOKIE + "=" + encodeURIComponent(token) +
        "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + (400 * 24 * 3600));
      req.dvlDeviceToken = token; // exposto p/ o cliente persistir em localStorage
    }
    req.dvlUserId = id;
    try { repo.touchDevice(id, (req.headers && req.headers["user-agent"] || "").slice(0, 120)); } catch (_) {}
  } catch (_) {}
  next();
}

module.exports = { middleware, sign, verify, COOKIE };
