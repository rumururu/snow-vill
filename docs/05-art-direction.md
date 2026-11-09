# Art direction and asset production brief

## Source of truth
Cozy Chibi 2D isometric (2:1 projection), fixed camera, soft cel-shaded forms, warm wooden cottages, sage/indigo accents, ivory snow, amber window light, no heavy black outlines. No photorealism. Ground-center anchor and identical camera/scale across all house variants.

## Palette
Snow #F6F0E4; sage #708B82; indigo #404F70; wood #C88A56; glow #E7B66B.

## Asset manifest (production targets)
- village/background_snow.webp: 1536×1536, snow terrain/path/ground, no houses.
- houses/house_wood_empty.webp, house_sage_empty.webp, house_indigo_empty.webp: 512×512 transparent.
- houses/house_wood_lit.webp, house_sage_lit.webp, house_indigo_lit.webp: 512×512 transparent, identical footprints/anchors.
- decorations/tree_base.webp, tree_complete.webp: transparent.
- decorations/lamp.webp, fence.webp, snowman.webp, bench.webp: 256×256 transparent.
- ui/frame_wood.webp, frame_sage.webp: 512×512 transparent, 1:1 photo opening.
- ui/avatar_default_1.webp, _2.webp, _3.webp.
- effects/snowflake_1.webp, snowflake_2.webp, sparkle.webp.
- marketing/landing_hero.webp; marketing/share_background.webp (1080×1350).

## Master prompts for future asset generation
HOUSE MASTER: 'Original cozy chibi 2D isometric Christmas cottage, 2:1 isometric projection, front-right three-quarter view, wood siding, snowy indigo roof, warm amber window, soft 2–3 tone cel shading, ivory/sage/indigo/wood palette, no black outline, isolated transparent background, full object with margin, ground-center anchor, no text, no cast floor shadow.'
EMPTY VARIANT: 'Same master cottage exactly, lights off and muted frosty window; same camera, silhouette, dimensions, anchor.'
LIT VARIANT: 'Same master cottage exactly, warm lit window and subtle golden glow; same camera, silhouette, dimensions, anchor.'
SCENE: 'Original cozy 2D isometric winter village, 8 cottage lots arranged around central Christmas tree and snowy paths, clean space for UI overlays, 2:1 projection, ivory snow, wood/sage/indigo, warm light, no text or labels.'

## QA for generated assets
Identical roof pitch and perspective; consistent ground anchors; transparent alpha; no checkerboard baked in; no shadows that imply different lighting; no cropping; avoid copied third-party art; test at 100–150 CSS px display size.

## Mockup provenance
assets/mockups/village-concept.svg is an original simple vector layout created for this repository. Earlier conversation reference imagery was search-rendered inspiration, not an owned downloadable source asset. Do not claim it is bundled.
