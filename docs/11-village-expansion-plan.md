---
slug: snow-village-expansion-plan
status: active
updated: 2026-11-11
---

# Snow Village — expandable village (owner requests 2026-11-10 / 11)

Feedback after the first store builds: every house looked the same, the layout was dull, empty lots shown as grey
houses looked dirty; then (11-11) the big round disc looked bare — districts were asked for; then plots with baked-in
fences were rejected as not scalable; then (11-11) the square board was too cramped, flat and artificial — the owner
wanted the cathedral in the middle with houses around it, landmarks smaller, the village edge as ONE shape (not
islands) and no bridges. Layout v5 below is what was built.

## Decisions

| Topic | Decision |
|---|---|
| House art | 9 types (log cabin, brick, bakery, tower, gingerbread, half-timbered, A-frame, windmill, greenhouse) × 4 directions; legacy sage/indigo keep rendering (view A only) but are not offered |
| Direction | The friend picks the door direction when moving in (default: toward the district centre) |
| Empty lots | Dashed outline + "+" drawn **in code**; no grey houses |
| Structure | Cathedral **plaza** on a small mound in the middle + up to **10 districts** ("동네") of 6 lots: 6 on an inner ring, 4 on an outer ring; the first paid district sits behind the plaza so a phone view grows upward |
| Districts | Round clearings; the landmark (snowman family, ice rink, Santa's house, Rudolph statue, sled, lake …) in the centre — at most 2.5 tiles (cathedral), most 1.15–1.8 — and 6 houses ringed around it at slightly varied angles, doors toward it |
| Ground | The opened village is **one rounded shape** (convex envelope of the plaza and opened clearings, wavy edge, a low bank) with the snow texture; curved paths from the plaza to each district; no fence, no bridges. Outside: snowy fir forest (ChatGPT fir/rock sprites) in clumps; trees inside or just in front of the shape disappear. Closed districts = dashed outline + name under the forest |
| Expansion | Each paid step opens the next **half (3 lots) of a district the buyer picks**; tap a closed district to pick it |
| Pricing | Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → every further +3 ₩25,900 on both stores (₩25,800 has no App Store price point), up to 60 |
| Aurora | 18+ houses |

## Implementation

- Art pipeline: `assets/source/*` (PROVENANCE.md) → `scripts/build_village.py` → `public/assets/v2` + `src/lib/village-geometry.json`
  (copied to `mobile/assets/v2`). Geometry is measured from alpha (anchors, tile widths, hulls, part base slopes).
- Layout v5 (`build_village.py`, geometry JSON v5): district centres in polar coordinates (`PLACES`), radius 5.4;
  houses on `HOUSE_RING` around the landmark (≥ 2.3 tiles apart, asserted); plaza mound z 0.55 (`elevationPx` 40);
  forest = jittered grid within radius 30, clumped by a density field. The village shape and the tree clearing are
  computed at runtime (web `villageShape`/`forestFor`, app `VillageGeometry.villageShape`/`forestFor`).
- Camera: fit the opened village, crop the sides to 92 % on a tall phone, never wider than 1900 px (19 tiles); pan/zoom for the rest.
- Web: `src/lib/map.ts`, `src/components/scene/VillageMapArt.tsx` (art), `VillageMap.tsx` (pan/zoom, hit layer).
- App: `mobile/lib/scene/geometry.dart` (port of map.ts), `village_scene.dart` (InteractiveViewer + ground painter).
- Server (`snowvill_`, deployed 2026-11-11): `villages.open_halves` bitmask, capacity = 3 × opened halves,
  tiered credits (`snowvill_tier_credits`), `snowvill_upgrade_village(install, village, district)`, claims only in opened
  halves, `houses.direction`. Old 2-argument upgrade opens districts in order (installed builds).
- Tests: web 79, app 15, local SQL 128, live 73.

## Status

| Part | State |
|---|---|
| Server | deployed 2026-11-11, other games unchanged |
| Web (snow.mkideabox.com) | district board deployed 2026-11-11; layout v5 committed, not yet deployed |
| App | layout v5 ported and checked on an Android emulator (render, lot / house / closed-district taps); new store builds pending |
| Store products | App Store + Play + RevenueCat: `snowvillage_big_village`, `snowvillage_expand_2/3/4` (docs/10-store-iap-setup.md) |
