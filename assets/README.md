# Snow Village assets

## Production art (2026-11-10)
- `source/` — lossless masters generated with ChatGPT image generation from the planning conversation: 3 lit houses (wood/sage/indigo), empty house, tree base/complete, village background. Prompts, processing and consistency checks: [source/PROVENANCE.md](source/PROVENANCE.md).
- `python3 scripts/build_assets.py` → `public/assets/**.webp` (512px sprites, 1024px background; 297KB total) + `src/lib/asset-geometry.json` (anchors, tile widths and tap-region hulls measured from the alpha channel).
- Scene: 3×3 isometric grid on the background (tree in the centre cell); layout constants live in `build_assets.py` (`LAYOUT`). Chosen by a visibility search: every house ≥ 93% unoccluded.
- To replace art: drop a new master in `source/` with the same name, rerun the script, then check `npm test` (tap-region tests) and the screenshots.


## Included
- [mockups/village-concept.svg](mockups/village-concept.svg): original lightweight vector **concept mockup**, created for this handoff. It is intentionally schematic; not production-ready artwork.

## Not included
Earlier chat displayed illustrative image-search previews. Those images are **not** copied here: rights, original file bytes and provenance were not established. No user photos or third-party copyrighted art are included.

## Production art to create
Read [docs/05-art-direction.md](../docs/05-art-direction.md). Prioritize background, house master, 3 styles × lit/unlit states, central tree, 4 decorations, photo frames, avatars and snow particles. Keep 2:1 isometric camera, consistent anchor and alpha. Original source assets should be reviewed before production use.

## Integration
**M0 (implemented):** `src/components/scene/SceneArt.tsx` redraws the mockup's geometry as inline SVG so each of the 8 houses can switch style and lit/empty state; slot positions live in `src/lib/scene.ts`, and `src/lib/assets.ts` maps every placeholder to its production file name from docs/05-art-direction.md. All M0 art is an original placeholder.

Original guidance: M0 can render this SVG as a static backdrop with separate accessible HTML house hit regions. M1 should replace with transparent individual sprites and proper depth ordering. Avoid using this illustration as if it were eight separately clickable images.
