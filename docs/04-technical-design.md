# Technical architecture & privacy

## Proposed stack
Next.js App Router, TypeScript, Tailwind, PixiJS for 2D sprites (SVG/HTML prototype acceptable at M0), Supabase Postgres and private Storage, server-side share-card generation, PostHog or equivalent event analytics. Avoid AI API dependency.

> **Implemented (M1, 2026-11-09):** see docs/06-codex-handoff.md "M1 implementation status". The API is Supabase RPC functions (`snowvill_*`) plus the `snowvill-photo` Edge Function instead of Next.js API routes; schema in `supabase/migrations/`.

## Route plan
GET /; GET /create; GET /v/[villageId]; POST /api/villages; GET /api/villages/:id; POST /api/villages/:id/houses; GET /api/houses/:id (authorized); DELETE /api/houses/:id; GET /api/share/:id; POST /api/reports. Endpoint authorization and anti-abuse rules required before deployment.

## Schema sketch
villages(id UUID PK, owner_id or owner_claim_hash, name, theme_id, capacity=8, status, created_at, deleted_at)
houses(id UUID PK, village_id FK, slot integer 0..7, nickname, style enum, photo_id nullable, message nullable, created_at, deleted_at, UNIQUE(village_id,slot))
photos(id UUID PK, house_id FK, storage_path, moderation_status, created_at)
invite_links(id UUID PK, village_id FK, token_hash, expires_at, revoked_at, created_at)
reports(id UUID PK, target_type, target_id, reason, status, created_at)
events(id UUID PK, session_id, village_id, event_type, source_token, created_at)

## Security decisions for implementation
- Do not equate possession of a village URL with owner privileges.
- Anonymous ownership should use a cryptographically random claim secret stored only as hash server-side; recovery code or optional account binding must be designed and tested.
- Invite capability: separate read and write permissions or use a short-lived claim token; never rely solely on client flags.
- Supabase RLS deny-by-default; private photo bucket, short-lived signed URLs after server authorization. No sensitive storage URLs in OG metadata.
- Validate uploaded MIME by file signature; size/pixel limits; re-encode, strip EXIF; optional image moderation and report/hide flow. Rate-limit village creation, uploads and invites.
- Database transaction / unique constraint for final slot collision. Idempotency key for retries.
- Restrict CORS, sanitize names/messages, safe logging, secure secrets, deletion lifecycle and backup retention policy.
- Consider Korean privacy requirements and minors before public beta.

## Render & export
Base scene + sorted house sprites + central tree + lights/particles. Export separate server-side 1080×1350 composition with scene-only art; **never include participant photo**. Use static scene thumbnail for social OG tags. Assets: source PNG alpha, delivery WebP; house masters 512px, environment 256px, background 1536px. Performance budget initial scene <=1.5MB target.

## Observability
Events: landing_view, village_create_start, village_created, invite_shared (attempt only), invite_opened, house_create_start, house_created, house_viewed, village_completed, share_card_saved, new_village_from_invite. Distinguish sessions, visitors, creators, villages and invite attribution; avoid storing PII in analytics.

## Deployment
Choose commercial-appropriate hosting. CI lint/typecheck/test/build; staging environment with separate secrets. Do not deploy production until privacy and abuse tests pass.
