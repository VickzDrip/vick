#!/bin/bash
# DVL auto-deploy (build MODULAR) — cron a cada minuto na VPS.
# Sincroniza public/ INTEIRO (index + dvl-clean) do git pro site, espelha em
# /root/public, e reinicia o pm2 do frontend quando algo muda. server.js e o
# backend continuam iguais ao deploy antigo.
REPO="$(cd "$(dirname "$0")" && pwd)"
DST="/root/DepthVisionLab-v106_REAL_UI/DepthVisionLab-v106_REAL_UI"
MIRROR="/root/public"
BRANCH="claude/modify-html-1pMJm"
LOG="/var/log/dvl-deploy.log"
cd "$REPO" || exit 1

git fetch origin "$BRANCH" --quiet 2>/dev/null
if [ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse "origin/$BRANCH" 2>/dev/null)" ]; then
  git pull origin "$BRANCH" --quiet 2>/dev/null
fi

# ---------- FRONTEND: public/ inteiro (index.html + dvl-clean/ + styles) ----------
SRC_PUB="$REPO/DepthVisionLab-v106_REAL_UI/public"
RESTART_FE=0
if [ -d "$SRC_PUB" ]; then
  # destrava os arquivos travados com chattr +i antes de copiar
  chattr -i "$DST/public/index.html" "$DST/public/index.organized-beta1504.html" 2>/dev/null || true
  # -i lista o que mudou; -c compara por checksum (robusto). Sem --delete: nunca apaga.
  CHG="$(rsync -rlptc -i --exclude 'index.backup-*' --exclude '*.bak-*' "$SRC_PUB/" "$DST/public/" 2>/dev/null)"
  if [ -n "$CHG" ]; then
    RESTART_FE=1
    rsync -rlptc --exclude 'index.backup-*' --exclude '*.bak-*' "$DST/public/" "$MIRROR/" 2>/dev/null || true
    echo "[$(date -Iseconds)] DVL frontend sync @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
  fi
  # re-trava o index principal (mantém teu hábito de chattr +i)
  chattr +i "$DST/public/index.html" 2>/dev/null || true
fi
if [ "$RESTART_FE" = "1" ]; then
  pm2 restart depthvisionlab --silent 2>/dev/null
  echo "[$(date -Iseconds)] DVL pm2 restart depthvisionlab @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
fi

# ---------- BACKEND: server.js + subsecondCandles.js (igual ao original) ----------
RESTART_NODE=0
SRC_SSC="$REPO/DepthVisionLab-v106_REAL_UI/subsecondCandles.js"
if [ -f "$SRC_SSC" ] && ! cmp -s "$SRC_SSC" "$DST/subsecondCandles.js"; then
  cp "$SRC_SSC" "$DST/subsecondCandles.js"; RESTART_NODE=1
fi
SRC_SRV="$REPO/DepthVisionLab-v106_REAL_UI/server.js"
if [ -f "$SRC_SRV" ] && ! cmp -s "$SRC_SRV" "$DST/server.js"; then
  cp "$SRC_SRV" "$DST/server.js"; RESTART_NODE=1
fi
if [ "$RESTART_NODE" = "1" ]; then
  # Reinicia SÓ o frontend (server.js/subsecondCandles). Antes era 'pm2 restart
  # all', que sacudia todos os processos de uma vez a cada deploy de backend —
  # churn desnecessário. O tick-collector e o scanner não dependem do server.js.
  pm2 restart depthvisionlab --silent 2>/dev/null
  echo "[$(date -Iseconds)] DVL pm2 restart depthvisionlab (backend) @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
fi

# ---------- SCANNER BACKEND (igual ao original) ----------
BE_DIR="$REPO/dvl-scanner-backend"
BE_STAMP="/root/.dvl-backend-deployed"
if [ -d "$BE_DIR" ]; then
  BE_HASH="$(git rev-parse HEAD:dvl-scanner-backend 2>/dev/null)"
  if [ -n "$BE_HASH" ] && [ "$BE_HASH" != "$(cat "$BE_STAMP" 2>/dev/null)" ]; then
    ( cd "$BE_DIR" && npm install --silent 2>/dev/null )
    systemctl restart dvl-scanner 2>/dev/null
    echo "$BE_HASH" > "$BE_STAMP"
  fi
fi
