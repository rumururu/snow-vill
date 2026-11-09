# Codex instructions — Snow Village

Read README.md and docs/06-codex-handoff.md before editing. The repo starts as documentation, not an implemented app.

## Mission
Build a mobile-first web MVP for a private, invitation-based isometric Christmas village. Each of 8 fixed house slots represents a friend. Tapping an occupied house opens a photo-frame bottom sheet; photos never appear in publicly shared preview cards.

## Priorities
1. Functional, attractive, accessible mobile prototype with original placeholder SVG assets.
2. Real state and interaction; never present decorative nonfunctional controls as complete.
3. Server-side authorization and private photo handling before any public deployment.
4. Measure creation → invitation → participation → new village conversion.

## Suggested stack
Next.js App Router + TypeScript + Tailwind; PixiJS only when scene complexity justifies it (SVG/HTML hotspots are acceptable for M0); Supabase Postgres/Storage for M1. Prefer simplest working implementation.

## Constraints
- No hardcoded production credentials, no public bucket for photos, no sensitive data in analytics.
- Do not generate or import copyrighted third-party reference images as production assets.
- Isometric 2:1 geometry, 8 deterministic slots, 3 house styles, responsive 320px+.
- User input sanitization, content-size/type validation, abuse/rate limits, owner recovery, deletion/report flows.
- Distinguish mock assets from production assets and test placeholders from actual backend behavior.
- No premature payments, chats, avatars, 3D, AI image generation or multi-season expansion.
- Preserve Korean-first UX. Ensure keyboard and reduced-motion accessibility.
- Keep documentation updated with implementation changes.

## First Codex task
Create M0 prototype (see docs/06-codex-handoff.md), with landing, create village, 8-house interactive scene, create-house bottom sheet, occupied-house photo-frame sheet, invite/share UI, and simulated local data. Add README run steps and automated tests. Do not claim the prototype has persistent data.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
