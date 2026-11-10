#!/usr/bin/env python3
"""
Expandable village (docs/11-village-expansion-plan.md): sprites + layout → public/assets/v2 and
src/lib/village-geometry.json (copied into the Flutter app as well).

Coordinates
- Layout positions are in **tile units** on the ground plane (i, j). A house footprint is 1 tile.
  Screen projection (2:1 isometric): x = (i - j) * T / 2, y = (i + j) * T / 4, where T is the on-screen
  width of one tile. Renderers choose T (zoom) and the origin (pan).
- Sprite geometry is measured from the alpha channel (never hand-typed): `anchor` = centre of the widest
  opaque row of the base, `tileWidth` = that row's width; both normalised to the sprite canvas.

Directions (door facing), shared by server (`houses.direction`), app and web:
  0 = front-left (view A)   1 = front-right (A mirrored)   2 = back-right (view B)   3 = back-left (B mirrored)

Usage: python3 scripts/build_village.py   (Pillow + numpy)
"""
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from build_assets import alpha_mask, hull_polygon, widest_row

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
OUT = ROOT / "public" / "assets" / "v2"
GEOMETRY = ROOT / "src" / "lib" / "village-geometry.json"
APP_ASSETS = ROOT / "mobile" / "assets" / "v2"
SPRITE_SIZE = 512
BIG_SIZE = 768

# House types: (label ko, label en, view A source, view B source). Legacy sage/indigo stay so existing
# houses keep rendering; the claim sheet offers every type.
HOUSES = {
    "wood": ("통나무집", "Log cabin", "house_wood_lit", "house_wood_b"),
    "brick": ("벽돌집", "Brick house", "house_brick_a", "house_brick_b"),
    "bakery": ("빵집", "Bakery", "house_bakery_a", "house_bakery_b"),
    "tower": ("탑 집", "Tower house", "house_tower_a", "house_tower_b"),
    "gingerbread": ("진저브레드 집", "Gingerbread", "house_gingerbread_a", "house_gingerbread_b"),
    "timber": ("반목조 집", "Timber house", "house_timber_a", "house_timber_b"),
    "aframe": ("산장", "A-frame", "house_aframe_a", "house_aframe_b"),
    "windmill": ("풍차 집", "Windmill", "house_windmill_a", "house_windmill_b"),
    "greenhouse": ("온실 집", "Greenhouse", "house_greenhouse_a", "house_greenhouse_b"),
    # Legacy colourways (existing houses only, not offered in the picker): no back view was generated
    # (ChatGPT drew them from the wrong house), so every direction uses view A, mirrored for 1 and 3.
    "sage": ("세이지 집", "Sage cabin", "house_sage_lit", "house_sage_lit"),
    "indigo": ("인디고 집", "Indigo cabin", "house_indigo_lit", "house_indigo_lit"),
}
LEGACY_STYLES = ["sage", "indigo"]

# Layout (owner decision 2026-11-11): fenced snowy plots (ChatGPT art, same look as the first village
# background) laid edge to edge like a board around the plaza plot. Every plot has a fence opening in the
# middle of each side, so neighbours connect. A district plot holds a 3×3 grid: houses on the 4 corners and
# the 2 side cells across the plaza axis, the district facility in the centre; the 2 cells on the plaza axis
# stay free as the walkway. Lots of district d are slots d*6 … d*6+5; the first half (d*6+0..2) are the
# 3 houses nearest the plaza.
GROUND_ASPECT = 0.5                  # plain isometric (plots are drawn art, not ovals)
PLOT_TILES = 8.2                    # plot width in ground tiles (the art's diamond)
PLOT_GAP = 0.2                       # snow walkway between plots
CELL = 2.35                          # 3×3 grid pitch inside a plot
PLAZA = [
    {"id": "cathedral", "sprite": "landmark_cathedral", "at": [-0.4, -0.4], "tiles": 3.4},
    {"id": "tree", "sprite": "tree_complete", "at": [2.1, 2.1], "tiles": 1.2},
]
PLOT_SPRITES = ["plot_wood", "plot_picket", "plot_stone"]
PLAZA_PLOT = "plot_plaza"
# id, name (ko), name (en), facility sprite, facility size in tiles
DISTRICTS = [
    ("snowflake", "눈송이 동네", "Snowflake Lane", "decor_snowfamily", 1.2),
    ("rink", "링크 동네", "Ice Rink Lane", "landmark_rink", 2.4),
    ("santa", "산타 동네", "Santa's Lane", "landmark_santa", 2.3),
    ("rudolph", "루돌프 동네", "Rudolph Lane", "landmark_rudolph", 1.3),
    ("sled", "썰매 동네", "Sled Lane", "decor_sled", 1.3),
    ("forest", "숲속 동네", "Forest Lane", "prop_pines", 1.6),
    ("lantern", "등불 동네", "Lantern Lane", "prop_lamp", 1.1),
    ("starlight", "별빛 동네", "Starlight Lane", "prop_pines", 1.4),
    ("hill", "언덕 동네", "Hill Lane", "prop_pines", 1.5),
    ("lake", "호숫가 동네", "Lakeside Lane", "prop_lamp", 1.1),
]
# Plot grid cells (gi, gj) per district; +i+j is toward the viewer. District 0 sits right in front of the
# plaza (front-right), then the plaza's other neighbours, nearest first.
GRID = [(1, 0), (0, 1), (1, 1), (-1, 0), (0, -1), (1, -1), (-1, 1), (-1, -1), (2, 0), (0, 2)]
AURORA_MIN_HOUSES = 18
PROPS = {"pines": "prop_pines", "lamp": "prop_lamp"}
MAX_HOUSES = 60


def facing_toward(i: float, j: float, ti: float, tj: float) -> int:
    """Door direction (0 → +j, 1 → +i, 2 → -j, 3 → -i) pointing most toward (ti, tj)."""
    vecs = {0: (0, 1), 1: (1, 0), 2: (0, -1), 3: (-1, 0)}
    di, dj = ti - i, tj - j
    return max(vecs, key=lambda d: vecs[d][0] * di + vecs[d][1] * dj)


def districts_and_lots() -> tuple[list[dict], list[dict]]:
    pitch = PLOT_TILES + PLOT_GAP
    districts, lots = [], []
    for d, ((gi, gj), (key, ko, en, sprite, tiles)) in enumerate(zip(GRID, DISTRICTS)):
        ci, cj = gi * pitch, gj * pitch
        # unit vector from the plot toward the plaza along the dominant grid axis
        if abs(gi) >= abs(gj):
            ax = (-1 if gi > 0 else 1, 0)
        else:
            ax = (0, -1 if gj > 0 else 1)
        perp = (ax[1], ax[0])
        cells = []
        for a in (-1, 0, 1):          # along the plaza axis (+1 = the row next to the plaza)
            for b in (-1, 0, 1):      # across it
                if a == 0 and b == 0:
                    continue          # centre: facility
                if b == 0:
                    continue          # walkway cells on the plaza axis
                cells.append((a, b))
        # 6 cells: (±1, ±1) corners and (0, ±1) sides; nearest to the plaza first
        cells.sort(key=lambda ab: (-ab[0], ab[1]))
        for n, (a, b) in enumerate(cells):
            i = ci + (ax[0] * a + perp[0] * b) * CELL
            j = cj + (ax[1] * a + perp[1] * b) * CELL
            lots.append({"slot": d * 6 + n, "district": d, "half": 0 if n < 3 else 1, "at": [round(i, 3), round(j, 3)],
                         "facing": facing_toward(i, j, ci, cj)})
        districts.append({
            "index": d, "id": key, "name": {"ko": ko, "en": en}, "at": [ci, cj], "grid": [gi, gj],
            "plot": PLOT_SPRITES[d % len(PLOT_SPRITES)], "size": PLOT_TILES,
            "facility": {"sprite": sprite, "at": [ci, cj], "tiles": tiles} if sprite else None,
        })
    lots.sort(key=lambda l: l["slot"])
    assert len(lots) == MAX_HOUSES
    return districts, lots


def measure(name: str, kind: str, size: int) -> dict:
    im = Image.open(SRC / f"{name}.webp").convert("RGBA")
    mask = alpha_mask(im)
    w, h = im.size
    ys, xs = np.where(mask)
    if kind == "plot":   # diamond: the widest row is its equator (left/right corners) = plot centre
        start = (ys.min() + 0.2 * (ys.max() - ys.min())) / h
    else:
        start = 0.5 if kind == "house" else (ys.max() - 0.22 * (ys.max() - ys.min())) / h
    cx, cy, tile = widest_row(mask, start)
    folder = OUT / kind
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{name}.webp"
    # Keep the canvas aspect (plots are 2:1); `size` is the output width.
    im.resize((size, max(1, round(size * h / w))), Image.LANCZOS).save(out, "WEBP", quality=84, method=6)
    return {
        "src": f"/assets/v2/{kind}/{name}.webp",
        "anchor": [round(cx / w, 4), round(cy / h, 4)],
        "tileWidth": round(tile / w, 4),
        "bbox": [round(xs.min() / w, 4), round(ys.min() / h, 4), round(xs.max() / w, 4), round(ys.max() / h, 4)],
        "hull": hull_polygon(mask),
        "aspect": round(h / w, 4),
        "bytes": out.stat().st_size,
    }


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    districts, lot_list = districts_and_lots()
    geo: dict = {"version": 4, "legacyStyles": LEGACY_STYLES, "maxHouses": MAX_HOUSES, "groundAspect": GROUND_ASPECT,
                 "plotTiles": PLOT_TILES, "plazaPlot": PLAZA_PLOT, "plaza": PLAZA, "districts": districts, "houses": {}, "sprites": {},
                 "auroraMinHouses": AURORA_MIN_HOUSES, "props": PROPS, "lots": lot_list}
    for key, (ko, en, a, b) in HOUSES.items():
        geo["houses"][key] = {"label": {"ko": ko, "en": en}, "a": a, "b": b}
        for name in {a, b}:
            if name not in geo["sprites"]:
                geo["sprites"][name] = measure(name, "house", SPRITE_SIZE)
    facility_sprites = {f["sprite"]: f["tiles"] for f in PLAZA}
    facility_sprites.update({d[3]: d[4] for d in DISTRICTS if d[3]})
    for name, tiles in facility_sprites.items():
        if name in PROPS.values():
            continue
        geo["sprites"][name] = measure(name, "facility", BIG_SIZE if tiles >= 2 else SPRITE_SIZE)
    for name in PROPS.values():
        geo["sprites"][name] = measure(name, "prop", SPRITE_SIZE)
    # Plot art that exists (the generator may still be drawing some); missing designs reuse one that exists.
    have = [n for n in PLOT_SPRITES if (SRC / f"{n}.webp").exists()]
    for name in [*have, PLAZA_PLOT]:
        geo["sprites"][name] = measure(name, "plot", 1400)
    for d in districts:
        if d["plot"] not in have:
            d["plot"] = have[d["index"] % len(have)]
    # Optional animated rink frames: landmark_rink_f0..fN (same canvas as landmark_rink).
    frames = sorted(SRC.glob("landmark_rink_f*.webp"))
    if frames:
        geo["rinkFrames"] = []
        for fpath in frames:
            m = measure(fpath.stem, "facility", BIG_SIZE)
            geo["rinkFrames"].append(m["src"])
    for name, g in geo["sprites"].items():
        print(f"{name:22s} {g['bytes'] // 1024:4d} KB  anchor={g['anchor']} tile={g['tileWidth']}")
        del g["bytes"]
    GEOMETRY.write_text(json.dumps(geo, indent=1, ensure_ascii=False) + "\n")
    if APP_ASSETS.exists():
        shutil.rmtree(APP_ASSETS)
    shutil.copytree(OUT, APP_ASSETS)
    shutil.copy(GEOMETRY, APP_ASSETS / "village-geometry.json")
    total = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"total {total // 1024} KB, {len(geo['sprites'])} sprites → {GEOMETRY.relative_to(ROOT)} (+ {APP_ASSETS.relative_to(ROOT)})")


if __name__ == "__main__":
    main()
