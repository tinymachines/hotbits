#!/usr/bin/env bash
# hotbits' own API on this box: deploy/hotbits-api.service with its @USER@ and @HERE@ filled in (the repo is public, so
# the committed unit names neither), installed in /etc/systemd/system, enabled and started, then asked for
# /api/v1/health. A changed unit replaces the installed one; an unchanged one is left alone. Safe to run twice. It
# touches no nginx: scripts/nginx-conf.sh and scripts/site-setup.sh do that, on Brad's go.
#   ./scripts/api-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
HERE=$(pwd); UNIT=hotbits-api; DST=/etc/systemd/system/$UNIT.service
PORT=$(grep -o 'port: *[0-9]*' app.yaml | grep -o '[0-9]*$')
[[ -n "$PORT" ]] || { echo "refusing: app.yaml names no api port"; exit 1; }
[[ -d api/.venv ]] || uv sync --quiet --directory api
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
sed -e "s|@USER@|$USER|g" -e "s|@HERE@|$HERE|g" deploy/$UNIT.service > "$tmp"
if grep -q '@[A-Z]*@' "$tmp"; then echo "refusing: deploy/$UNIT.service has a placeholder this script does not fill"; exit 1; fi
if ! sudo test -f "$DST" || ! sudo diff -q "$tmp" "$DST" >/dev/null; then
  sudo install -m 0644 "$tmp" "$DST"; sudo systemctl daemon-reload; echo "installed $DST"
fi
sudo systemctl enable --now "$UNIT" >/dev/null 2>&1
sudo systemctl restart "$UNIT"
for _ in $(seq 25); do curl -sf "http://127.0.0.1:$PORT/api/v1/health" >/dev/null && break; sleep 0.2; done
curl -sf "http://127.0.0.1:$PORT/api/v1/health" >/dev/null || { echo "$UNIT is not answering on 127.0.0.1:$PORT: journalctl -u $UNIT"; exit 1; }
echo "$UNIT: answering on 127.0.0.1:$PORT"
