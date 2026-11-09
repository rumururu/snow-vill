# QA, analytics and acceptance tests

## Acceptance checklist
- 320px/390px/480px layouts work; no horizontal overflow.
- Creator can create a named village, claim first house and copy invite link.
- Invitee lands directly on village and can claim one of 8 slots without app installation.
- 8th slot concurrent claims resolve atomically server-side in M1.
- Occupied house opens frame; empty house opens claim sheet.
- Photo is optional; fallback works; max 60-character message validated.
- Public OG and export card contain zero participant photo pixels.
- Expired/revoked invite, upload failure, full village, disconnected state have useful UX.
- Owner deletion and report flow exist before public beta.
- Accessibility: keyboard, focus trap/return, labels, 44px targets, reduced motion.
- Security: RLS deny-by-default, private bucket, signed access, upload re-encoding, rate limits, no secrets in client.

## Instrumentation
Track landing_view → village_created → invite_opened → house_created → new_village_from_invite. Track invite_shared as an attempt, not delivered share. Deduplicate sessions; avoid logging image URLs, names, messages or identifiers in external analytics. Consent and retention policy must be settled before launch.

## Test matrix
Unit: input limits, slot capacity, style enum, image metadata removal, URL token handling.
Integration: creation→invite→claim, last-slot race, owner deletion, unauthorized photo fetch.
E2E: mobile Safari/Chrome, no photo, with photo, retry after upload error, full village, revoked link.
Performance: slow 4G, low-memory Android, reduced motion, cold cache.
Abuse: spam creation, offensive image report, oversized files, XSS text, repeated claims.
