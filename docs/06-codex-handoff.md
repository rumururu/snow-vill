# Codex handoff — build instructions

## Context
This repository started as a **planning/design handoff**. The business hypothesis and detailed requirements are in docs/. As of 2026-11-09 the **M0 clickable prototype exists** (see below); no backend or production deployment exists yet. Avoid inventing implementation progress.

## Immediate task: M0 clickable prototype
1. Initialize Next.js + TypeScript + Tailwind with a clean Korean-first responsive UI.
2. Implement landing (/), create (/create), village (/v/[id]) and bottom sheets for house creation and photo frame.
3. Use assets/mockups/village-concept.svg and original CSS/SVG placeholders; make 8 house hotspots with accurate hit boxes and fixed scene coordinates.
4. Implement local mocked state (3/8 occupied sample, then add houses), style selection, nickname, optional image preview, max-60-char message, invite URL copy and share-card preview. Clearly label simulated data.
5. Build real mobile interactions, focus handling, loading/error/empty/full states, prefers-reduced-motion and 320px layout.
6. Add tests for slot collision in mock state, 8-slot cap, sheet open/close, validation, and photo-free share preview.
7. Document setup/run/test commands. Do not implement payments or pretend mocked persistence is real.

## M0 implementation status
Implemented 2026-11-09 (Next.js 16 App Router, TypeScript, Tailwind v4, Vitest). Run/test commands: README.

| Item | Status |
|---|---|
| Routes `/`, `/create`, `/v/[id]`, not-found / error | Done |
| 8 deterministic slots from the SVG mockup, rendered rear→front; accessible HTML hotspots ≥44px | Done (`src/lib/scene.ts`) |
| Claim sheet: nickname, 3 styles, optional photo (signature check, ≤10MB, 1:1 crop, canvas re-encode), ≤60-char message, draft kept on failure | Done |
| Photo-frame sheet: photo/fallback, message, date, report (simulated), remove (mock owner / own house) | Done |
| Invite: link copy, Web Share with copy fallback, non-PII `src` token | Done (link only works in the same browser tab — mock data) |
| Share card 1080×1350, photo-free by type (`ShareCardData` has styles only), PNG export | Done |
| States: loading skeleton, not found, full, slot collision, upload rejected/failed, already joined, storage quota | Done |
| Focus trap/return, Esc, inert background, reduced motion, 320px layout | Done, browser-verified by `npm run screenshots` |
| Tests: slot collision, 8-slot cap, sheet open/close, validation, photo-free share card | Done (`npm test`) |
| Persistence, multi-device, real invites, ownership, report submission, analytics events, OG image | **Not implemented** (M1/M2) |

M0 product choices to revisit (also in 09-decisions): one house per village per browser; nicknames shown as chips inside the private scene but never on the share card; mock village owner may remove any house; sample village id is `demo`.

Swap points for M1: replace `src/store/villageStore.ts` with API calls (keep `src/lib/village.ts` rules mirrored server-side); replace `SceneArt` placeholder SVG with sprites listed in `src/lib/assets.ts`; replace data-URL photos with private storage ids + signed URLs.

## M1 implementation status
Implemented and deployed 2026-11-09 on the shared `mkideabox-games` Supabase project (prefix `snowvill_`), following `mkideabox-corp-process/processes/infrastructure/game-shared-backend.md`. Commands: README "Backend (M1)".

| Item | Status / evidence |
|---|---|
| Schema, RLS deny-by-default, grants revoked from anon/authenticated (tables, sequence, internal functions) | Done — `supabase/tests/local.sh` 58/58 (throwaway Postgres reproducing Supabase default privileges) |
| Atomic slot claim (village row lock + `UNIQUE(village_id, slot)`), capacity 8, one house per install | Done — concurrent-claim test locally; real two-browser collision in `scripts/e2e-remote.sh` |
| Owner claim secret / house claim secret (SHA-256 stored only) | Done; secrets kept in browser localStorage |
| Private photo bucket, server-side JPEG validation + EXIF strip, signed URLs (120s), photo deleted with house/village | Done — `supabase/tests/live.sh` 51/51 (EXIF fixture stripped, public URL blocked, PNG/1600px/wrong-secret rejected) |
| Report flow, owner remove house, owner delete village | Done (reports stored; no moderation dashboard yet) |
| Rate limits (per install: create 3/min·20/day, claim 6/min·60/day, report 5/min, upload 6/min, view 60/min) | Done — 429 verified live |
| Other games untouched | `supabase/deploy.sh` hash of all non-snowvill objects identical before/after (142 objects) |
| Multi-device browser E2E (create → photo → invite → friend views photo → claim → collision → report → remove → delete) | Done — all checks pass, server leftovers 0 |
| Owner recovery on a new device, invite token separation/expiry | **Open** (decision items 1–2); the village link currently grants view + claim |
| Hosting/domain, CORS origin for production (`SNOWVILL_ALLOWED_ORIGINS` secret), privacy policy, data retention schedule, moderation tooling, analytics | **Open** |

Deviation from docs/04 route plan: no Next.js API routes. The browser calls Supabase RPC (anon) and the `snowvill-photo` Edge Function directly, so the service-role key never leaves Supabase and the web app can be hosted as a plain static/edge app.

## M1 backend (original plan)
Supabase schema migrations, RLS, private photo bucket, owner claim/recovery, invite authorization, image sanitization, atomic slot assignment, content reporting/deletion, rate limits. Ensure no public photo leaks in metadata. Use separate staging credentials.

## M2 growth
Share image generator, OG previews without photos, instrument event funnel, 30–50-group beta, bugfix and go/no-go decision.

## Definition of done M0
npm install + dev + lint + typecheck + tests succeed; usable mobile flow; 8 clickable slots; accessible sheets; no missing assets or broken links; screenshots in README; no fake production claims.

## Engineering preferences
Simple architecture before PixiJS complexity. Separate scene state from UI. Small reusable components. Deterministic house slot positions. Make all game sprites replaceable via asset manifest. Do not commit secrets or real user photos.

## First Codex prompt
'Read AGENTS.md and all docs, especially 02-prd, 03-ui-ux, 04-technical-design, 06-codex-handoff. Build M0 interactive Next.js mobile-web prototype using the included original SVG mockup and placeholders. Do not connect production services yet. Implement tests and document commands. Start by proposing a short file-level plan, then implement it.'
