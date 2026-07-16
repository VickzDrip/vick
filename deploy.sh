#!/bin/bash
# DVL auto-deploy — runs via cron every minute on the VPS.
# Pulls latest from git AND reconciles the live files with the repo.
#
# The copy is now IDEMPOTENT (only writes when the live file actually differs
# from the repo), and — the important part — it runs on EVERY cron cycle,
# decoupled from whether git itself detected new commits. Before, the copy was
# gated behind "did the cron do the pull?" (BEFORE != AFTER); a MANUAL `git pull`
# advanced the repo without copying, so the next cron saw BEFORE == AFTER and
# exited without ever copying — leaving the live index.html stale. Now the cron
# always reconciles the served files against the repo, so a manual pull can't
# break the deploy anymore.

REPO="$(cd "$(dirname "$0")" && pwd)"
DST="/root/DepthVisionLab-v106_REAL_UI/DepthVisionLab-v106_REAL_UI"
BRANCH="claude/modify-html-1pMJm"
LOG="/var/log/dvl-deploy.log"

cd "$REPO" || exit 1

# Advance the repo if there are new commits (quiet no-op otherwise).
git fetch origin "$BRANCH" --quiet 2>/dev/null
if [ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse "origin/$BRANCH" 2>/dev/null)" ]; then
  git pull origin "$BRANCH" --quiet 2>/dev/null
fi

# ALWAYS reconcile index.html — copy only when the live file differs from the
# repo (idempotent: no log spam, no needless writes, self-heals after any pull).
SRC_HTML="$REPO/DepthVisionLab-v106_REAL_UI/public/index.html"
if [ -f "$SRC_HTML" ] && ! cmp -s "$SRC_HTML" "$DST/public/index.html"; then
  cp "$SRC_HTML" "$DST/public/index.html"
  echo "[$(date -Iseconds)] DVL deployed html @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
fi

# ALWAYS reconcile server.js — copy + pm2 restart only when it differs.
SRC_SRV="$REPO/DepthVisionLab-v106_REAL_UI/server.js"
if [ -f "$SRC_SRV" ] && ! cmp -s "$SRC_SRV" "$DST/server.js"; then
  cp "$SRC_SRV" "$DST/server.js"
  pm2 restart all --silent 2>/dev/null
  echo "[$(date -Iseconds)] DVL deployed server.js + pm2 restarted @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
fi

# ALWAYS reconcile the SCANNER BACKEND (the API on :8090 — pump-backtest, scanner,
# ML, etc). Unlike the frontend, it is NOT copied anywhere: the dvl-scanner.service
# runs `node src/index.js` IN-PLACE from this repo ($REPO/dvl-scanner-backend). A
# `git pull` updates those files on disk, but the running node process keeps the OLD
# code loaded in memory until the service restarts — which is exactly why a new grid
# / endpoint change can look "not deployed" even though the file is new. So: whenever
# the backend subtree changes, npm install + restart the service. The subtree's git
# object hash (changes only when a file under dvl-scanner-backend/ actually changes)
# gates it, so steady-state cron cycles never restart needlessly.
BE_DIR="$REPO/dvl-scanner-backend"
BE_STAMP="/root/.dvl-backend-deployed"
if [ -d "$BE_DIR" ]; then
  BE_HASH="$(git rev-parse HEAD:dvl-scanner-backend 2>/dev/null)"
  if [ -n "$BE_HASH" ] && [ "$BE_HASH" != "$(cat "$BE_STAMP" 2>/dev/null)" ]; then
    ( cd "$BE_DIR" && npm install --silent 2>/dev/null )
    systemctl restart dvl-scanner 2>/dev/null
    echo "$BE_HASH" > "$BE_STAMP"
    echo "[$(date -Iseconds)] DVL restarted dvl-scanner (backend changed) @ $(git rev-parse --short HEAD 2>/dev/null)" >> "$LOG"
  fi
fi
