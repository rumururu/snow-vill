# Decisions, assumptions, and unresolved items

## Agreed direction (2026-11-09)
- Name: Snow Village; repository: snow-vill.
- Platform: mobile web first; Flutter native app later only if justified.
- Art: cozy 2D isometric, 2:1 projection, wood/sage/indigo/ivory/orange, no heavy black outline.
- Photos: shown **only after tapping a house**, inside a frame sheet.
- Village: 8 fixed house slots, one winter theme, three styles, optional photo.
- No mandatory app installation or account to join.
- User-generated photo excluded from social preview/export.
- Initial target: early Dec 2026, subject to security and beta quality.

## Proposed, not confirmed
- Next.js/PixiJS/Supabase stack.
- 60-character message limit.
- 1080×1350 share card.
- Initial spend <=KRW 300,000 excluding labor.
- 8/8 completion effect and premium theme future pricing.

## Resolve before production
1. Ownership recovery: claim secret vs optional account binding.
2. Invitation: separate view vs claim token and expiration policy.
3. Whether participant can edit/delete own house from new device.
4. Photo consent, retention, content moderation and age policy.
5. How full villages and unclaimed creator slots behave.
6. Product domain, privacy policy, terms, legal operator identity.
7. CDN/hosting provider and commercial plan.
8. Whether marketing card has any names or counts (default no personal data).

## M0 prototype choices (2026-11-09, provisional)
- Stack for M0: Next.js 16 App Router + TypeScript + Tailwind v4; SVG/HTML scene (no PixiJS yet); Vitest + Testing Library.
- Mock data in memory + tab `sessionStorage`; clearly labelled "시뮬레이션 데이터". Invite links therefore only resolve in the creating tab.
- One house per village per browser (mock "my house" flag). Real ownership/recovery is still open item 1.
- Village owner (creator browser) can remove any house; a participant can remove their own. Report is UI-only.
- Nicknames appear as small chips in the private village scene; the share card shows no names, photos, messages or counts (item 8 default).
- Limits: village name ≤20, nickname ≤10, message ≤60 user-perceived characters; photos JPG/PNG/WEBP ≤10MB, re-encoded to 512px JPEG.
- Full village (8/8): claim disabled; share card + new village offered (partially answers item 5).

## M1 backend choices (2026-11-09)
- **Backend location (owner decision):** the existing shared Supabase project `mkideabox-games` (account mkideabox.devtest), prefix `snowvill_`, for the beta. **Re-decide before public launch**: the free-plan egress (5GB/month) and DB (500MB) are shared with every game in the organization, including ctw's paid wallet; if Snow Village photo views exceed the quota, all of them are blocked. Options then: Pro plan, or moving photos to separate storage.
- No Supabase Auth (shared-project rule). Ownership = random secrets returned once, SHA-256 stored server-side, kept in the browser's localStorage. Losing site data loses owner rights until a recovery design exists (open item 1).
- The village link is currently both the read and the claim capability (interim answer to open item 2). The invite sheet warns users to share it only with trusted friends.
- Rate limits use a client-generated install UUID (spoofable; IP-based limits not used to avoid storing IPs). Revisit if abuse appears in beta.
- Photos: the client re-encodes to a 512px JPEG; the server accepts JPEG only (≤300KB, ≤1024px), strips APP1–APP15/COM metadata segments without re-encoding, and stores privately; viewing uses 120s signed URLs.
- Character limits count Unicode code points (same as PostgreSQL `char_length`) on both client and server.
- No data-retention job yet: villages persist until deleted by the owner. A post-season retention/deletion schedule must be set before launch (with the privacy policy).
- Hosting (2026-11-09): static export on Cloudflare Workers static assets (free, unmetered static requests, `mkideabox.com` already on Cloudflare). Village URL format changed to `/v/?id=<id>`. Production domain `snow.mkideabox.com` (owner decision 2026-11-10).
- Privacy policy (2026-11-10): `/privacy/`, operator mkideabox, contact mkideabox.feedback@gmail.com, under-14 not targeted, data kept until the user/owner deletes it or the service ends; processors Supabase (Seoul region) and Cloudflare. Draft written from the implementation — needs operator/legal review before inviting beta groups.
- Art (2026-11-10, owner decision): replace placeholder SVG with ChatGPT-generated original assets in the miniature-diorama style the planning references showed; 3×3 grid layout; slot names changed to rear / rear-left / rear-right / left / right / front-left / front-right / front.
- Monetisation (2026-11-10, owner decision): this season via **app-store billing** in a dedicated Snow Village Flutter app (`mobile/`) (same Apple/Google accounts as other mkideabox apps; Android closed testing not required per owner). Not via an unrelated existing app (policy risk) and not via a web PG this season (Toss Payments fixed fees 22만+11만/yr). Purchases will be per-village decorating packs (giftable), verified server-side via RevenueCat webhook, visible on web and app.
- **Monetisation model revised (2026-11-10, owner decision):** decorations are free and unlocked by growth (4 houses → gift sled, 6 → snowman family, 8 → aurora sky). **Free villages hold up to 6 houses; more than 6 is a paid "big village" (8 houses)**, bought in the Flutter app (product `snowvillage_big_village`, consumable) → RevenueCat webhook credits the buyer's wallet → the app spends it on any village (giftable). Existing villages became free (6) villages. Big-village size beyond 8 not decided.
- Scene layout v2 (2026-11-10): houses must stay inside the fence (tile 210px, spacing 0.9, centre (615,620); every tile ≥ 30px inside the measured inner fence; every house ≥ 88% visible) and the background is two layers (back + foreground), per owner feedback that houses overlapped the corner fences.
- Flutter app folder is `mobile/` (a top-level `app/` makes Next.js ignore `src/app`).
- Store setup (2026-11-10): App Store app `6832823869`, Play app `4974954907414864233`, RevenueCat project `projeb9d0302`; product `snowvillage_big_village` at KRW 2,900 / USD 1.99 on both stores. Payments ride on the shared `mkideabox-games` Supabase project during the beta (an exception to "payments in a dedicated project"; re-decide with the photo split before public launch). Details and IDs: `10-store-iap-setup.md`.
- Expandable village (2026-11-11, owner decisions): 9 house types × 4 door directions (ChatGPT art), cathedral plaza + up to 10 districts of 6 lots, each with a facility (rink, Santa's house, Rudolph statue, …); one continuous ground with the fence only on the outer edge (modular parts, not plots with baked-in fences); each paid step opens 3 lots of a district the buyer picks; prices ₩2,900 / 6,900 / 12,900 / then ₩25,900 per step up to 60 (first asked ₩25,800; the App Store has no such price point, so both stores use ₩25,900). Details: `11-village-expansion-plan.md`, `10-store-iap-setup.md`.
