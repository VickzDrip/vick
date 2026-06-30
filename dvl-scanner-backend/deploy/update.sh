#!/usr/bin/env bash
# DVL one-command deploy.
# Run on the VPS whenever there's a new change to pick up:
#   bash /root/dvl-repo/dvl-scanner-backend/deploy/update.sh
#
# Does everything in order: pull latest, install any new backend deps,
# copy the new HTML to the served path, restart the 24h backend, report health.
set -e

REPO=/root/dvl-repo
# The index.html actually served by the port-3000 app on this VPS:
SERVED=/root/DepthVisionLab-v106_REAL_UI/DepthVisionLab-v106_REAL_UI/public/index.html

echo "==> git pull"
git -C "$REPO" pull --ff-only

echo "==> backend deps"
( cd "$REPO/dvl-scanner-backend" && npm install --omit=dev --no-audit --no-fund >/dev/null )

echo "==> deploy HTML"
cp "$REPO/DepthVisionLab-v106_REAL_UI/public/index.html" "$SERVED"

echo "==> restart backend"
systemctl restart dvl-scanner
sleep 2

if systemctl is-active --quiet dvl-scanner; then
  echo "==> DVL deploy OK (backend active)"
else
  echo "!! backend is NOT active — check: journalctl -u dvl-scanner -n 30 --no-pager"
  exit 1
fi
