---
slug: snow-village-expansion-plan
status: active
updated: 2026-11-12
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
| Ground | The opened village is **one rounded shape** (convex envelope of the plaza and opened clearings, wavy edge, a low bank) with the snow texture; curved paths from the plaza to each district; no fence, no bridges. Outside: snowy fir forest (ChatGPT fir/rock sprites) in clumps; trees inside or just in front of the shape disappear. Closed districts = name chip over the forest |
| Expansion | Each paid step opens the next **half (3 lots) of a district the buyer picks**; tap a closed district to pick it |
| Pricing | Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → every further +3 ₩25,900 on both stores (₩25,800 has no App Store price point), up to 60 |
| Aurora | 18+ houses |
| Look (2026-11-11, owner: "raise it to the first concept image") | Dusk diorama after `assets/source/background_aurora.webp`: violet dusk sky and lavender snowfield; the village is a deep slab (1.1 elevation) with stone-block sides, a rounded snow lip and soft rim shading; warm light pools under lit houses, lamps, the cathedral and the tree; screen vignette. Props sized to the houses (lamp 0.36, bench 0.5, signpost 0.42, snowman lantern 0.5 tiles). Paths are slightly brown dirt (owner 11-11: stepping stones overlapped and looked messy) with snow banked along both edges. The cathedral mound is a dirt yard with snow piled at its rim: walled and fenced in front and at the sides (snow-capped wooden posts, two rails, a string of warm lights; gaps where opened paths leave, with three wooden steps), while behind it the snow rises gently to it over 1.4 tiles (no wall, no fence; a path there runs down the slope). The village's outer edge has no fence. Decorations keep 0.85 tiles off a path (`clear_of_path`). Shared geometry: `plazaSlope`, `plazaFence`, `pathBand`, `pathSteps` (map.ts / geometry.dart). Closed districts show only their name chip (no dashed outline through the forest); empty lots are a soft dashed diamond with a "+" badge. Web `Slab`/`glows` in VillageMapArt.tsx and app `_slab`/glow in village_scene.dart use the same values |
| Free village (2026-11-12, owner: "the smallest village has no cathedral; houses around the tree like the first concept") | District 0 alone, like `assets/source/background_aurora.webp` and the M0 mockup: the Christmas tree is district 0's landmark, its 6 lots ring the tree, the snowy base is fenced all around with an opening at the front (`villageFence`). No plaza, cathedral or paths until another district opens (`plazaShown(openHalves)` = any bit beyond district 0). Trees on the plaza site (`forest[].plaza`) fill that ground until then. The camera shows at least `MIN_VIEW_WIDTH` 1150 px across (the village sits in the middle of the screen with forest around it, then grows), never past the land's front edge (`clampToLand`); closed-district name chips appear only when they fit that view. Store images are made from this village (5 houses + 1 empty lot) |
| Night look (2026-11-12, owner: "the village in the app isn't pretty") | Closer to the concept image's night: after the scene, a multiply grade (#4B4C93 at 50 %) darkens snow, forest and sky, warm light pools are added back in screen mode, and lit houses plus light-giving props (lamps, snowman lanterns, cathedral, tree, Santa's house) are drawn again at 62 % so they stay bright. Web `data-night`/`data-relight`/`data-lit` in VillageMapArt.tsx, app `_NightPainter` + relit sprites in village_scene.dart (its sky gradient is pre-graded with the same values) |
| Village look (owner request 2026-11-11: "paths selectable, decorations movable") | Only the village owner (owner secret) edits it — "🎨 꾸미기" next to the house count or the ⋯ menu. One path style for the whole village: dirt (default), stepping stones (one stone every 0.48 tiles, never touching), brick (running bond) or snow (trodden band with footprints). Decorations (plaza lamps and bench, every district's lamps/benches/signposts/bushes/snowman lanterns — not the cathedral, tree or landmarks) are dragged by a ring under them; a drop that breaks the placement rule (plaza decor stays on the mound clear of the cathedral/tree; district decor stays in the village, off the mound and its back slope; never on a lot, path, landmark, pond or another decoration) shows red and snaps back. Save stores `villages.path_style` + `villages.decor` (`snowvill_set_village_look`, migration 20261112100000); the share card uses the same look. Rule: `decorSpotOk` (map.ts / geometry.dart) |

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
- Tests: web 122, app 19, local SQL 143, live 78.

## Status

| Part | State |
|---|---|
| Server | deployed 2026-11-11, other games unchanged |
| Web (snow.mkideabox.com) | district board deployed 2026-11-11; layout v5 committed, not yet deployed |
| App | layout v5 ported and checked on an Android emulator (render, lot / house / closed-district taps); new store builds pending |
| Languages (2026-11-12, owner: worldwide launch) | ko, en, ja, zh-Hans, es (Latin America), fr, de, pt-BR, ru, id — app (ARB), web (`src/lib/i18n`, browser language or `?lang=`), store listings (`docs/release_info/snowvillage.yaml`), store images (`docs/release_assets/MARKETING.md`). District and house names for all 10 live in `scripts/build_village.py` `NAMES_I18N` → geometry JSON |
| Server look migration | deployed 2026-11-12 (live checks 78/78) |
| Store products | App Store + Play + RevenueCat: `snowvillage_big_village`, `snowvillage_expand_2/3/4` (docs/10-store-iap-setup.md) |
