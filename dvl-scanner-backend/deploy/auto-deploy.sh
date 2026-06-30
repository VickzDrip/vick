#!/usr/bin/env bash
# DVL auto-deploy — run by cron every few minutes. Checks GitHub for new
# commits on the deploy branch and, if there are any, deploys them
# (pull + deps + HTML + restart). Does nothing when already up to date, so
# the 24h backend is only ever restarted when there's an actual change.
#
# Pause auto-deploy at any time with:   touch /root/dvl-deploy.pause
# Resume with:                          rm /root/dvl-deploy.pause
set -e

REPO=/root/dvl-repo
BRANCH=claude/modify-html-1pMJm
SERVED=/root/DepthVisionLab-v106_REAL_UI/DepthVisionLab-v106_REAL_UI/public/index.html
PAUSE=/root/dvl-deploy.pause
LOCK=/tmp/dvl-auto-deploy.lock

# Don't run two copies at once.
exec 9>"$LOCK"
flock -n 9 || exit 0

[ -f "$PAUSE" ] && exit 0

cd "$REPO"
git fetch --quiet origin "$BRANCH" || exit 0
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
[ "$LOCAL" = "$REMOTE" ] && exit 0   # nothing new — stay quiet

TS() { date -u +%FT%TZ; }
echo "[$(TS)] new commit ${REMOTE:0:8} — deploying"
git merge --ff-only "origin/$BRANCH"
( cd "$REPO/dvl-scanner-backend" && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1 || true )
cp "$REPO/DepthVisionLab-v106_REAL_UI/public/index.html" "$SERVED"
systemctl restart dvl-scanner
sleep 2
if systemctl is-active --quiet dvl-scanner; then
  echo "[$(TS)] deploy OK -> ${REMOTE:0:8}"
else
  echo "[$(TS)] deploy FAILED — backend not active"
fi
