# Product requirements document

## Jobs to be done
- Creator: 'I want a shared Christmas keepsake with my closest friends.'
- Invitee: 'I want to add myself to the group quickly without installing an app.'
- Viewer: 'I want to explore the completed houses and their owners privately.'

## Core user flows
**Creator:** Landing → create village (name required) → claim first cottage → view village → invite via share/copy → see new cottages → export share card.
**Invitee:** Deep link /v/:id → preview village + capacity → claim available slot → nickname/style/optional photo/message → success animation → explore houses → optionally create own village.
**Returning:** deep link → latest state → highlight own cottage when ownership proof exists → view frame / share.

## Screens
S01 landing; S02 village create; S03 main scene; S04 claim/edit house bottom sheet; S05 occupied-house photo-frame bottom sheet; S06 export/share. S03 is the central route; S04/S05 preferably sheets rather than new pages.

## Functional requirements
FR01 create village with sanitized name and server-generated opaque ID.
FR02 capacity fixed at 8, owner optionally takes slot 0.
FR03 claim available slot atomically; unique(village_id, slot); handle collision.
FR04 house style one of wood/sage/indigo.
FR05 nickname required; photo optional; fallback illustration available; message optional <=60 characters.
FR06 photo cropping to 1:1 and compressed preview; strip EXIF; server validates MIME and bytes.
FR07 occupied house opens private frame with nickname, photo/fallback, message, joined date, report action.
FR08 empty house opens claim sheet, unless full.
FR09 copy link, native Web Share where available, fallback copy; source attribution via non-PII tokens.
FR10 export card 1080×1350, **no user photos**.
FR11 owner can hide/delete house and delete village; users can request their own content deletion.
FR12 invite token expiry/revocation and owner recovery design required for public beta.
FR13 loading/error/empty/full/expired/upload-failed states.
FR14 respect reduced motion and accessible touch targets.

## Nonfunctional requirements
320 CSS px minimum; 390×844 reference; 480px max content on tablet; target 3s on normal 4G; scene initial transfer <=1.5MB goal; 44px tap targets; keyboard focus; meaningful alt/ARIA. Performance targets must be measured, not assumed.

## Explicit exclusions
AI-generated user pictures, public gallery, free drag/drop placement, multiplayer realtime chat, payments, likes, video export, user-generated 3D avatars.

## Open product questions
What does a 'full' village allow? Can house owners edit after claim? Is a link a read token, write token, or both? How to verify ownership on new devices? See docs/09-decisions.md.
