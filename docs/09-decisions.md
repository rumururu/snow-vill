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
