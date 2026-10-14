#!/usr/bin/env bash
# Build the app and publish it to the root nginx serves for hotbits.tinymachines.ai. Refuses when the tree is dirty
# or ./scripts/check.sh has not ended ALL OK on this commit (out/check-ok). A failed build leaves the live site
# untouched: rsync runs only after vite succeeds. Then it fetches the live sw.js and compares it with dist/.
#   ./scripts/site-deploy.sh            build + sync
#   ./scripts/site-deploy.sh --dry-run  build, then show what would change
#   ./scripts/site-deploy.sh --force    this version takes over every phone as soon as it checks in
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
HOST=hotbits.tinymachines.ai
ROOT=/var/www/$HOST
RSYNC=()
for a in "$@"; do case $a in --force) export VITE_FORCE_UPDATE=1 ;; *) RSYNC+=("$a") ;; esac; done
[[ -d "$ROOT" ]] || { echo "refusing: $ROOT does not exist; run ./scripts/site-setup.sh first (sudo; Brad's go)"; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "refusing: the tree is dirty; commit first"; exit 1; }
head=$(git rev-parse --short HEAD)
[[ -f out/check-ok && "$(cat out/check-ok)" == "$head" ]] || { echo "refusing: ./scripts/check.sh has not ended ALL OK on $head (out/check-ok says '$(cat out/check-ok 2>/dev/null || echo nothing)')"; exit 1; }
bun install --silent && bun run build >/dev/null
rsync -a --delete ${RSYNC[@]+"${RSYNC[@]}"} dist/ "$ROOT"/
echo "published $head${VITE_FORCE_UPDATE:+ (forced update)} -> $ROOT ($(find "$ROOT" -type f | wc -l) files)"
if [[ " ${RSYNC[*]-} " != *" --dry-run "* ]]; then
  live=$(curl -fsS "https://$HOST/sw.js" | sha256sum | cut -c1-16)
  built=$(sha256sum dist/sw.js | cut -c1-16)
  [[ "$live" == "$built" ]] && echo "live: sw.js $live matches dist" || { echo "WARNING: live sw.js $live != dist $built (nginx root or cache?)"; exit 1; }
fi
