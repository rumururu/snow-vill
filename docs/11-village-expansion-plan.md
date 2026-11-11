---
slug: snow-village-expansion-plan
status: active
updated: 2026-11-11
---

# Snow Village — expandable village (owner requests 2026-11-10 / 11)

Feedback after the first store builds: every house looked the same, the layout was dull, empty lots shown as grey
houses looked dirty; then (11-11) the big round disc looked bare — districts were asked for; then plots with baked-in
fences were rejected as not scalable. This is what was built.

## Decisions

| Topic | Decision |
|---|---|
| House art | 9 types (log cabin, brick, bakery, tower, gingerbread, half-timbered, A-frame, windmill, greenhouse) × 4 directions; legacy sage/indigo keep rendering (view A only) but are not offered |
| Direction | The friend picks the door direction when moving in (default: toward the district centre) |
| Empty lots | Dashed outline + "+" drawn **in code**; no grey houses |
| Structure | Cathedral **plaza** in the middle + up to **10 districts** ("동네") of 6 lots on a board around it |
| Districts | Each has a facility in its centre (snowman family, ice rink, Santa's house, Rudolph statue, sled, forest, lamps …) and decoration; houses sit around it |
| Ground | One continuous snow ground (code + ChatGPT seamless snow texture); **fence only along the outer edge** (modular ChatGPT parts: section, corner post), gate arch at the free district's front; cobble paths between districts; closed districts = dashed outline + name |
| Expansion | Each paid step opens the next **half (3 lots) of a district the buyer picks**; tap a closed district to pick it |
| Pricing | Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → every further +3 ₩25,900 on both stores (₩25,800 has no App Store price point), up to 60 |
| Aurora | 18+ houses |

## Implementation

- Art pipeline: `assets/source/*` (PROVENANCE.md) → `scripts/build_village.py` → `public/assets/v2` + `src/lib/village-geometry.json`
  (copied to `mobile/assets/v2`). Geometry is measured from alpha (anchors, tile widths, hulls, part base slopes).
- Board: plot cells of `plotTiles` = 8.2 tiles, plaza at (0,0), districts at fixed grid cells (district 0 front-right).
  Inside a district a 3×3 grid: 6 lots (corners + side cells across the plaza axis), facility in the centre, walkways.
- Web: `src/lib/map.ts`, `src/components/scene/VillageMapArt.tsx` (art), `VillageMap.tsx` (pan/zoom, hit layer).
- App: `mobile/lib/scene/geometry.dart` (port of map.ts), `village_scene.dart` (InteractiveViewer + ground painter).
- Server (`snowvill_`, deployed 2026-11-11): `villages.open_halves` bitmask, capacity = 3 × opened halves,
  tiered credits (`snowvill_tier_credits`), `snowvill_upgrade_village(install, village, district)`, claims only in opened
  halves, `houses.direction`. Old 2-argument upgrade opens districts in order (installed builds).
- Tests: web 77, app 14, local SQL 128, live 73.

## Status

| Part | State |
|---|---|
| Server | deployed 2026-11-11, other games unchanged |
| Web (snow.mkideabox.com) | deployed 2026-11-11 |
| App | ported; new TestFlight / internal builds with the 4 expansion products |
| Store products | App Store + Play + RevenueCat: `snowvillage_big_village`, `snowvillage_expand_2/3/4` (docs/10-store-iap-setup.md) |
