#!/bin/bash
# DVL auto-deploy script — runs via cron every minute on the VPS
# Pulls latest changes from git, copies files to the live server.
# No-op when nothing changed (git pull is fast).

REPO="$(cd "$(dirname "$0")" && pwd)"
DST="/root/DepthVisionLab-v106_REAL_UI/DepthVisionLab-v106_REAL_UI"
BRANCH="claude/modify-html-1pMJm"
LOG="/var/log/dvl-deploy.log"

cd "$REPO" || exit 1

BEFORE=$(git rev-parse HEAD 2>/dev/null)
git fetch origin "$BRANCH" --quiet 2>/dev/null
AFTER=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

# Nothing new — exit silently
[ "$BEFORE" = "$AFTER" ] && exit 0

git pull origin "$BRANCH" --quiet 2>/dev/null

# Always deploy index.html (no restart needed)
cp "$REPO/DepthVisionLab-v106_REAL_UI/public/index.html" "$DST/public/index.html"
echo "[$(date -Iseconds)] DVL deployed html: ${BEFORE:0:7} → ${AFTER:0:7}" >> "$LOG"

# Deploy server.js + restart PM2 only when it actually changed
if git diff "$BEFORE" "$AFTER" --name-only 2>/dev/null | grep -q "DepthVisionLab-v106_REAL_UI/server.js"; then
  cp "$REPO/DepthVisionLab-v106_REAL_UI/server.js" "$DST/server.js"
  pm2 restart all --silent 2>/dev/null
  echo "[$(date -Iseconds)] DVL deployed server.js + pm2 restarted" >> "$LOG"
fi
