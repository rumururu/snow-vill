# Codex handoff — build instructions

## Context
This repository is a **planning/design handoff**. The business hypothesis and detailed requirements are in docs/. No production frontend or backend exists yet. Avoid inventing implementation progress.

## Immediate task: M0 clickable prototype
1. Initialize Next.js + TypeScript + Tailwind with a clean Korean-first responsive UI.
2. Implement landing (/), create (/create), village (/v/[id]) and bottom sheets for house creation and photo frame.
3. Use assets/mockups/village-concept.svg and original CSS/SVG placeholders; make 8 house hotspots with accurate hit boxes and fixed scene coordinates.
4. Implement local mocked state (3/8 occupied sample, then add houses), style selection, nickname, optional image preview, max-60-char message, invite URL copy and share-card preview. Clearly label simulated data.
5. Build real mobile interactions, focus handling, loading/error/empty/full states, prefers-reduced-motion and 320px layout.
6. Add tests for slot collision in mock state, 8-slot cap, sheet open/close, validation, and photo-free share preview.
7. Document setup/run/test commands. Do not implement payments or pretend mocked persistence is real.

## M1 backend
Supabase schema migrations, RLS, private photo bucket, owner claim/recovery, invite authorization, image sanitization, atomic slot assignment, content reporting/deletion, rate limits. Ensure no public photo leaks in metadata. Use separate staging credentials.

## M2 growth
Share image generator, OG previews without photos, instrument event funnel, 30–50-group beta, bugfix and go/no-go decision.

## Definition of done M0
npm install + dev + lint + typecheck + tests succeed; usable mobile flow; 8 clickable slots; accessible sheets; no missing assets or broken links; screenshots in README; no fake production claims.

## Engineering preferences
Simple architecture before PixiJS complexity. Separate scene state from UI. Small reusable components. Deterministic house slot positions. Make all game sprites replaceable via asset manifest. Do not commit secrets or real user photos.

## First Codex prompt
'Read AGENTS.md and all docs, especially 02-prd, 03-ui-ux, 04-technical-design, 06-codex-handoff. Build M0 interactive Next.js mobile-web prototype using the included original SVG mockup and placeholders. Do not connect production services yet. Implement tests and document commands. Start by proposing a short file-level plan, then implement it.'
