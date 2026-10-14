#!/usr/bin/env bash
# The done-check: typecheck, lint with zero warnings, build, then drive the build in headless Chrome against the live
# instrument (scripts/check-site.ts). Ends in ALL OK, and records the commit it passed on in out/check-ok, which
# scripts/site-deploy.sh requires.
#   ./scripts/check.sh
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
FAILS=0
step() { printf '\n== %s\n' "$*"; }
step "typecheck";   bun run typecheck || FAILS=$((FAILS+1))
step "lint, zero warnings"; bun run lint || FAILS=$((FAILS+1))
step "build";       bun run build >/dev/null || FAILS=$((FAILS+1))
step "the site in Chrome, against the live instrument"
PORT=4431
bun run scripts/serve.ts dist $PORT >/dev/null 2>&1 &
SRV=$!
sleep 1
bun run scripts/check-site.ts "http://127.0.0.1:$PORT" || FAILS=$((FAILS+1))
kill $SRV 2>/dev/null
if ((FAILS)); then echo; echo "check: $FAILS FAILED"; rm -f out/check-ok; exit 1; fi
mkdir -p out && git rev-parse --short HEAD > out/check-ok
echo; echo "ALL OK ($(cat out/check-ok))"
