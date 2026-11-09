# Release asset integration — 2026-11-10

The user confirmed the current deployed site is https://snow.mkideabox.com and approved the newly created house, tree and grid-guide images for integration.

**Important:** This GitHub document is a release handoff, NOT a claim that the site was updated or redeployed. Binary assets were packaged separately in `snow-village-release-assets.zip` in the ChatGPT conversation; they are not yet committed to this repository. The GitHub connector available in this session supports UTF-8 text file changes only.

## Expected asset paths (after extracting the pack)
- `public/assets/village/house_wood_lit.png`
- `public/assets/village/house_sage_lit_SOURCE_NEEDS_ALPHA.png` — NOT production-ready; checkerboard baked into RGB.
- `public/assets/village/house_indigo_lit.png`
- `public/assets/village/house_empty.png`
- `public/assets/village/tree_complete.png`
- `public/assets/village/tree_base.png`
- `public/assets/village/village_grid_guide.png`

## Codex implementation steps
1. Inspect existing production source and determine real asset paths, components, state schema and deployment pipeline; do not overwrite user changes.
2. Copy extracted assets to the project's static asset folder. Do not publish sage RGB/checkerboard as a transparent sprite. Re-export a clean alpha version first.
3. Integrate wood/sage/indigo occupied houses and empty house into existing fixed 8-slot grid; preserve interactive hit targets.
4. Show tree_base when fewer than 8 slots are occupied and tree_complete only at 8/8. Keep consistent ground anchor and dimensions.
5. Use village_grid_guide.png as layout reference only, or if appropriate as a guide overlay; the user explicitly approves it for use, but avoid leaving guide outlines visible in the final polished scene unless intentionally desired.
6. Adjust scale, z-index, lighting and placement in a real 390×844 mobile screenshot. Verify alpha edges and consistency of house silhouettes.
7. Optimize PNGs into WebP with transparent alpha, responsive loading and caching. Keep source PNGs available for future edits.
8. Test iOS Safari and Android Chrome, invite and photo-frame flows, share card, 0/8 through 8/8 transitions, and keyboard accessibility.
9. Deploy via the repository's actual CI/CD or hosting workflow only after verification. Report deployed commit, URL and smoke-test evidence.

## Outstanding blockers
- Sage source has baked checkerboard.
- The current deployed code and hosting configuration have not been inspected in this session.
- No automatic deployment has been triggered.
