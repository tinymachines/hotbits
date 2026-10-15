#!/usr/bin/env bash
# hotbits.tinymachines.ai on this box (impera): the app's root and the vhost. The name, the certificate and the DNS
# already exist (the vhost has proxied the daemon since 2026-05); this replaces the vhost with deploy/
# hotbits.tinymachines.ai.nginx (scripts/nginx-conf.sh), keeping a dated copy of the old one, and makes the root the
# deploying user's so deploys need no sudo. Run with sudo, on Brad's go (a network change on impera). Safe to run twice.
#   ./scripts/site-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=hotbits.tinymachines.ai
ROOT=/var/www/$HOST
CONF=/etc/nginx/sites-enabled/$HOST.nginx     # sites-enabled holds real files on this box, not symlinks
NEW=deploy/$HOST.nginx
[[ -f "$NEW" ]] || { echo "refusing: $NEW is not there; run ./scripts/nginx-conf.sh first"; exit 1; }
[[ -f "$CONF" ]] || { echo "refusing: $CONF is not there; this script expects the existing vhost"; exit 1; }
sudo test -d /etc/letsencrypt/live/$HOST || { echo "refusing: no certificate at /etc/letsencrypt/live/$HOST"; exit 1; }
grep -q '^# BEGIN entropy-gate' "$NEW" && grep -q 'location /v1/' "$NEW" || { echo "refusing: $NEW has lost the entropy-gate block"; exit 1; }
if [[ ! -d "$ROOT" ]]; then sudo mkdir -p "$ROOT"; sudo chown "$USER":"$USER" "$ROOT"; echo "made $ROOT (owned by $USER)"; fi
[[ -f "$ROOT/index.html" ]] || { echo "refusing: $ROOT has no index.html yet; build and rsync first (bun run deploy does both once this has run; for the first time: bun run build && rsync -a dist/ $ROOT/)"; exit 1; }
if ! diff -q "$NEW" "$CONF" >/dev/null; then
  # the backup goes OUTSIDE sites-enabled: nginx globs that directory, and a .bak beside the live file is a second
  # server block for the same name (nginx warns "conflicting server name ... ignored" and keeps the old one)
  sudo mkdir -p /etc/nginx/backups && sudo cp "$CONF" "/etc/nginx/backups/$HOST.nginx.bak-$(date +%Y%m%d-%H%M%S)"
  sudo cp "$NEW" "$CONF"
  sudo cp "$NEW" /etc/nginx/sites-available/$HOST.nginx 2>/dev/null || true
  echo "installed $NEW as $CONF (the old one is in /etc/nginx/backups/)"
fi
sudo nginx -t
sudo systemctl reload nginx
for p in / /health "/v1/seeds?n=1" /docs /random/bytes; do printf '%-16s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "https://$HOST$p")"; done
echo "ok: https://$HOST serves $ROOT in front of the daemon. Next: bun run check, then bun run deploy, after every change."
