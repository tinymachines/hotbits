# hotbits

Random, from radioactive decay. The app at [hotbits.tinymachines.ai](https://hotbits.tinymachines.ai): the Geiger
instrument live, its bytes drawn four ways, six games decided by real decay, and the API reference. On
[@tinymachines/kit](https://github.com/tinymachines/kit) (the tinychase app kit): the kiosk look, themes checked for
contrast, install and offline, sharing, accounts. Minted 2026-10-14 with the kit's `new-app.sh`; the third app on the kit
after tinychase and AstroStack.

It is the successor of two things. The original hotbits site (a Next.js app of 2025, kept in this repository on the
branch and tag `archive/2025-site`) had six small games on a form-based Python API; those games are back here, on the gateway's open tier. And the
instrument pages of bradley.io/trng and tinymachines.ai/hotbits (the board, the four entropy views) are carried here
beside the instrument they read.

## What is where

```
src/app.config.ts      who the app is: pages, doors, shortcuts, the Ember theme (plain data; vite.config reads it)
src/api-paths.ts       the instrument's own addresses on this host: ONE list, read by nginx, the service worker, the dev proxy
src/lib/api.ts         the instrument as the app reaches it (same-origin paths; nothing spends the fresh pool)
src/lib/bits.ts        decay bits for the games: unbiased integers by rejection, Fisher-Yates, and the receipt
src/lib/instrument.ts  one 30-second poll of the five status paths
src/lib/tokens.ts      the theme's colours read for the canvases (CSS and SVG read the tokens themselves)
src/pages/             Home, Instrument, Space, Play, play/{Dice,Coins,Cards,Pick,Lottery,Password}, Reference, NotHere
src/space/             the four views: EntropyCube (three.js, beside RANDU), ReturnMap, BitRaster, PhaseSpace
src/styles/hotbits.css the app's own rules, in the kiosk vocabulary, tokens only
public/logo.svg        the mark: a 6 x 6 field of real decay bits, baked from /v1/seeds on 2026-10-14 (lit cells are ones)
scripts/check.sh       the kit's `kit check` with the instrument's paths passed through: typecheck, lint, build, then
                       Chrome against the live instrument (check-site.ts); ends ALL OK
scripts/nginx-conf.sh  writes deploy/hotbits.tinymachines.ai.nginx from api-paths.ts, keeping the gateway's block
scripts/site-setup.sh  installs that vhost and the root (sudo; Brad's go: a network change on impera)
bun run unit           the kit's `kit unit` (sudo): hotbits' own API's unit (deploy/hotbits-api.service), its user and
                       path filled in, installed and started; no nginx
api/                   hotbits' own API: FastAPI on the kit's kitapi, 127.0.0.1:8170 (uv run --directory api pytest)
app.yaml               the manifest: what the app is (kit check holds it to src/app.config.ts; /api/v1/about serves it)
bun run deploy         the kit's `kit deploy`: build + rsync to /var/www/hotbits.tinymachines.ai; refuses without a passed check on HEAD
```

## The host

hotbits.tinymachines.ai is one hostname with three things behind it, told apart by path in nginx:

- `/v1/*`: the entropy gateway on the server (`entropy-gate`, :8788). `/v1/health` and `/v1/seeds` are open and replay the
  archive; `/v1/bytes` and `/v1/hex` need a key and spend the pool. Its block in the vhost is spliced in by that
  project's `deploy/install.sh` and is kept verbatim.
- the daemon's own paths (`src/api-paths.ts`): the Geiger daemon on the Pi, `trng.local:8000` (`tinymachines/geiger`,
  `api/`). Four of them, `/random/{bytes,hex,integers,raw}`, are closed with a 410 that names the replacement.
- `/api/`: the kit's account routes (sign-in, the account, Your files, push) go to the kit's shared account
  service; the rest goes to hotbits' own API (`api/`, `hotbits-api.service` on 127.0.0.1:8170, path kept), which
  answers the kit's base routes, `/api/v1/health`, `/about` (the manifest and the commit running) and `/whoami`.
- everything else: this app, static files from `/var/www/hotbits.tinymachines.ai`.

Before 2026-10-14 the base path proxied the daemon too, so `/` answered 404 and `/docs` was the front door. Nothing an
existing reader used moves: bradley.io's `/api/trng` proxy, tinymachines.ai's pages and the daemon's own reference keep
their paths.

## Rules

The kit's (its README): bun only, no CDN at runtime, large type and high contrast, themes checked for contrast, a page's
claims measured. And this app's own:

- **Nothing spends the fresh pool.** The source makes about 75 bytes a minute for everyone. Pictures read
  `/random/archive`; games read `/v1/seeds`; status is the daemon's bookkeeping. Nothing is polled faster than 30 s.
- **Every number is read from the instrument**, when the page loads or on its poll. None is typed or baked at build time.
- **The games are fair by construction and say so.** An integer in a range is drawn by rejection, never by modulus; a
  shuffle is Fisher-Yates; every result carries its receipt (bits used, draws rejected, requests made) and the
  gateway's own note that the bits are replayed and not exclusive. The password page says it is a demonstration.
- **A canvas reads the theme's tokens** (`src/lib/tokens.ts`) and redraws when the theme changes. No colour is written
  in a component.
- **No em dashes in shipped text.**

## Build and check

```bash
bun install
bun run dev                  # http://localhost:4430; the instrument's paths are proxied to the live site
./scripts/check.sh           # typecheck, lint, build, Chrome against the live instrument; ends ALL OK, records out/check-ok
bun run deploy               # kit deploy, after the check, on a clean tree: build + rsync + compare the live sw.js
```

The check needs `/usr/bin/google-chrome` and the live instrument answering. It drives the real box: the pool figure,
the day's sparklines, the archive views and each game's draw are all live reads.
