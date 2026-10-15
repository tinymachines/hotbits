#!/usr/bin/env bash
# The done-check: the kit's `kit check` (typecheck, lint with zero warnings, build, scripts/check-site.ts in headless
# Chrome), with the instrument's own addresses (src/api-paths.ts, the one list) passed through to the live instrument,
# so the pages read the real Geiger box under the check. Ends in ALL OK and records the commit in out/check-ok, which
# `bun run deploy` (kit deploy) requires.
#   ./scripts/check.sh            (or bun run check)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
re=$(bun -e 'import { API_PATH } from "./src/api-paths"; console.log(API_PATH.source)')
exec node_modules/.bin/kit check --proxy "~$re=${HOTBITS_UPSTREAM:-https://hotbits.tinymachines.ai}"
