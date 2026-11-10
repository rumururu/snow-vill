---
slug: snow-village-expansion-plan
status: draft
updated: 2026-11-10
---

# Snow Village — expansion redesign (owner request 2026-11-10)

Owner feedback after the first store builds: every house looks the same, the layout is dull, and empty lots shown as grey
houses look dirty. Decisions taken with the owner (AskUserQuestion, 2026-11-10):

| Topic | Decision |
|---|---|
| House art | **8+ house types**, each in **4 directions**, generated with ChatGPT web in the original planning chat |
| Direction | The friend **chooses the door direction** when moving in |
| Empty lots | No grey house. A **dashed outline + "+"** drawn on the ground **in code** (not baked into art) |
| Centre | **Cathedral and plaza** in the middle |
| Facilities | Christmas tree, **ice rink (animated GIF)**, Santa's house, Rudolph statue, plus the existing sled / snowman family / aurora |
| Size | Village really grows on screen; up to **60 houses**; pinch-zoom / pan |
| Pricing | Free 6 → +3 ₩2,900 → +3 ₩6,900 → +3 ₩12,900 → +3 ₩25,800 → every further +3 ₩25,800, up to 60 |

## Art

- Houses: wood cabin (existing master), red brick, bakery, tower house, gingerbread, half-timbered, A-frame chalet,
  windmill, greenhouse cottage (9 types). ChatGPT draws **view A** (door toward bottom-left) and **view B** (rotated
  180°, door toward top-right). The other two directions are horizontal mirrors of A and B, so 4 directions = 2 images.
- Landmarks (bigger footprints): cathedral + plaza (centre), Christmas tree, ice rink (animated), Santa's house,
  Rudolph statue. Ground: snow ground drawn/tiled in code, with scattered edge props (pines, lamps).
- Same QA as before (PROVENANCE.md): real alpha, silhouette/scale consistency, prompts recorded verbatim.

## Layout model (shared by web and app via a generated geometry file)

- An isometric tile grid. The plaza with the cathedral sits at the centre; facility spots ring the plaza;
  house lots are laid out in rings around it with generous spacing (paths between rings).
- **Lot order is fixed** (lot 0 … 59, inner ring first), so capacity *n* means lots 0…n-1 exist.
  Lots `capacity … capacity+2` are drawn faintly as "next expansion" with a lock.
- A house stores `slot`, `style` (type) and `direction` (0–3). Rendering picks view A/B and mirroring from
  `direction`; depth order is by screen y of the lot anchor.
- Facilities unlock by house count (free, as before): tree from the start; sled 4; snowman family 6;
  ice rink 9; Santa's house 12; Rudolph statue 15; aurora sky 18+ (thresholds can be tuned).
- The camera fits the current village; larger villages are zoomable/pannable (app: InteractiveViewer;
  web: pointer/wheel pan-zoom).

## Server (Supabase `snowvill_`)

- `villages.capacity` becomes 6, 9, 12, … 60 (check constraint). Existing capacity-8 villages migrate to 9.
- `houses.direction smallint 0..3` (default 0); `houses.style` widened to the new type ids.
- Expansion step price by current capacity: 6→9 tier 1, 9→12 tier 2, 12→15 tier 3, ≥15 tier 4.
- Products (consumable, one credit each):
  `snowvillage_big_village` ₩2,900 (tier 1, kept — already in both stores and RevenueCat),
  `snowvillage_expand_2` ₩6,900, `snowvillage_expand_3` ₩12,900, `snowvillage_expand_4` ₩25,800.
- Wallet keeps credits per product. `snowvill_upgrade_village` spends one credit of the tier the village needs
  and adds 3 (max 60). Gifting stays possible (anyone holding the right credit can grow any village).
- Webhook maps product → tier credit; refunds take back an unspent credit (spent ones keep the expansion).

## Delivery order

1. Art (ChatGPT) — in progress.
2. Geometry generator + renderer (web first, then Flutter), dashed lots, direction picker in the claim sheet.
3. Migration + functions + live tests; webhook product map.
4. Store products ×3 new (ASC + Play), RevenueCat products/packages.
5. Rebuild, device round trips (Android + iPad), docs.
