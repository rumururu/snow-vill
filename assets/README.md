# Snow Village assets

## Production art
- `source/`: lossless masters generated with ChatGPT image generation (houses, landmarks, props, fence parts, ground texture). Prompts, processing and consistency checks: [source/PROVENANCE.md](source/PROVENANCE.md). Some masters belong to the first layout and are no longer delivered; they stay as originals.
- `python3 scripts/build_village.py` → `public/assets/v2/**.webp` + `src/lib/village-geometry.json` (layout, districts, lots, and each sprite's anchor, tile width and tap-region hull measured from the alpha channel; `scripts/sprite_geometry.py`), copied to `mobile/assets/v2/` for the app.
- To replace art: drop a new master in `source/` with the same name, rerun the script, then check `npm test` and `flutter test` (geometry parity) and the screenshots.

## Mockup
- [mockups/village-concept.svg](mockups/village-concept.svg): the original vector concept from the planning handoff (docs/06-codex-handoff.md). Not used by the app.

## Not included
Earlier chat displayed illustrative image-search previews. Those images are **not** copied here: rights, original file bytes and provenance were not established. No user photos or third-party copyrighted art are included.
