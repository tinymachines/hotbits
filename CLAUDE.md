# CLAUDE.md: hotbits

The hotbits app, hotbits.tinymachines.ai, on `@tinymachines/kit`. Minted 2026-10-14 from the kit's `new-app.sh` in
the bradleyio session, at Brad's ask: "mint a new TinyKit app for hotbits ... copy all the new TRNG visuals on this
site and reach back to the OG hotbits site that had games and other random widgets ... we'll just take over the base
path."

## Start here

1. `README.md`: what is where, the host, the rules, the check.
2. `src/app.config.ts` (who the app is) and `src/api-paths.ts` (the one list of the instrument's paths).
3. `git log --oneline | head`.

## Rules

- **`./scripts/check.sh` must end in `ALL OK`** before a commit that changes `src/`, and `scripts/site-deploy.sh`
  refuses without it on HEAD. It drives the real instrument.
- **The kit's rules hold** (its CLAUDE.md): bun only; no CDN at runtime; large type and high contrast; themes checked
  for contrast; `defineApp()` first (`src/app.ts`, imported first by `main.tsx`); `app.config.ts` is plain data; a fix
  that belongs to every app goes in the kit, tagged, never patched here.
- **Nothing spends the fresh pool; every number is measured; the games are fair by construction and carry a receipt;
  canvases read the tokens.** README, "Rules".
- **The host is Brad's.** `scripts/site-setup.sh` changes nginx on impera: run on his word only. The gateway's block in
  the vhost belongs to `entropy-gate` and is copied verbatim by `scripts/nginx-conf.sh`.
- **`/sensors` is the daemon's**, so the kit's sensors page is not routed here.
- **No em dashes in shipped text.** US units. Plain English in commits.
- **Git:** `main` on `tinymachines/hotbits` (PUBLIC), stage explicit paths. End commit messages with the trailer lines
  the harness gives you. Nothing private goes in: no LAN addresses, keys, or home paths. The original 2025 site is
  kept on the branch and tag `archive/2025-site` (Brad's call, 2026-10-14).

## Where things came from

- The instrument board: bradley.io `components/trng/TrngBoard.tsx` (2026-10-14).
- The four views: tinymachines.ai `web/app/[lang]/hotbits/space/*`, which came from bradley.io/trng/space (2026-08-29).
- The games: the original `tinymachines/hotbits` `webapp/src/app/apps/*` (dice-roll, coin-flip, cards, choice,
  lottery, password), reread for what each did; rewritten on `src/lib/bits.ts`.
- The host pattern: astrostack's `scripts/site-*.sh` and the kit's `docs/new-app.md`.
