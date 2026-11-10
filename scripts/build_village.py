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

# Facilities: sprite, ground spot (tile units, plaza centre = 0,0), footprint in tiles (the measured base
# width is scaled to this), unlock house count. Spots ring the plaza inside the first house ring.
FACILITIES = [
    {"id": "cathedral", "sprite": "landmark_cathedral", "at": [0.0, 0.0], "tiles": 3.2, "minHouses": 0},
    {"id": "tree", "sprite": "tree_complete", "at": [0.2, 3.2], "tiles": 1.1, "minHouses": 0},
    {"id": "sled", "sprite": "decor_sled", "at": [2.5, 2.4], "tiles": 0.9, "minHouses": 4},
    {"id": "snowfamily", "sprite": "decor_snowfamily", "at": [-2.4, 2.6], "tiles": 0.9, "minHouses": 6},
    {"id": "rink", "sprite": "landmark_rink", "at": [-3.4, 0.2], "tiles": 2.6, "minHouses": 9},
    {"id": "santa", "sprite": "landmark_santa", "at": [3.3, -0.6], "tiles": 2.0, "minHouses": 12},
    {"id": "rudolph", "sprite": "landmark_rudolph", "at": [0.3, -3.3], "tiles": 1.0, "minHouses": 15},
]
AURORA_MIN_HOUSES = 18
PROPS = {"pines": "prop_pines", "lamp": "prop_lamp"}
# House rings: (radius in tiles, lots). Inner ring first; 14 + 20 + 26 = 60.
RINGS = [(5.6, 14), (8.2, 20), (10.8, 26)]
MAX_HOUSES = 60
# Rings are ovals on *screen* with height/width = GROUND_ASPECT (a plain tile-space circle would be 0.5,
# too flat for a portrait phone). In tile space that stretches the ring along i+j by GROUND_ASPECT/0.5.
GROUND_ASPECT = 0.75


def ring_order(n: int) -> list[int]:
    """Golden-ratio order: any prefix is spread evenly around the ring (6 houses don't bunch up)."""
    phi = (math.sqrt(5) - 1) / 2
    seen, order, k = set(), [], 0
    while len(order) < n:
        idx = int((k * phi % 1) * n)
        k += 1
        if idx not in seen:
            seen.add(idx)
            order.append(idx)
    return order


def facing_center(i: float, j: float) -> int:
    """Default door direction: the one pointing most toward the plaza."""
    # direction unit vectors in tile space: 0 → +j, 1 → +i, 2 → -j, 3 → -i
    vecs = {0: (0, 1), 1: (1, 0), 2: (0, -1), 3: (-1, 0)}
    return max(vecs, key=lambda d: -(vecs[d][0] * i + vecs[d][1] * j))


def lots() -> list[dict]:
    out = []
    for ring, (r, n) in enumerate(RINGS):
        offset = math.pi / n * (ring % 2)
        for idx in ring_order(n):
            a = offset + 2 * math.pi * idx / n
            u = r * math.sqrt(2) * math.cos(a)                              # u = i - j (screen x)
            v = r * math.sqrt(2) * math.sin(a) * (GROUND_ASPECT / 0.5)      # v = i + j (screen y)
            i, j = round((u + v) / 2, 3), round((v - u) / 2, 3)
            out.append({"at": [i, j], "ring": ring, "facing": facing_center(i, j)})
    assert len(out) == MAX_HOUSES
    for k, lot in enumerate(out):
        lot["slot"] = k
    return out


def measure(name: str, kind: str, size: int) -> dict:
    im = Image.open(SRC / f"{name}.webp").convert("RGBA")
    mask = alpha_mask(im)
    w, h = im.size
    ys, xs = np.where(mask)
    start = 0.5 if kind == "house" else (ys.max() - 0.22 * (ys.max() - ys.min())) / h
    cx, cy, tile = widest_row(mask, start)
    folder = OUT / kind
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{name}.webp"
    im.resize((size, size), Image.LANCZOS).save(out, "WEBP", quality=84, method=6)
    return {
        "src": f"/assets/v2/{kind}/{name}.webp",
        "anchor": [round(cx / w, 4), round(cy / h, 4)],
        "tileWidth": round(tile / w, 4),
        "bbox": [round(xs.min() / w, 4), round(ys.min() / h, 4), round(xs.max() / w, 4), round(ys.max() / h, 4)],
        "hull": hull_polygon(mask),
        "bytes": out.stat().st_size,
    }


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    geo: dict = {"version": 2, "legacyStyles": LEGACY_STYLES, "maxHouses": MAX_HOUSES, "rings": [r for r, _ in RINGS], "groundAspect": GROUND_ASPECT, "houses": {}, "sprites": {},
                 "facilities": FACILITIES, "auroraMinHouses": AURORA_MIN_HOUSES, "props": PROPS, "lots": lots()}
    for key, (ko, en, a, b) in HOUSES.items():
        geo["houses"][key] = {"label": {"ko": ko, "en": en}, "a": a, "b": b}
        for name in {a, b}:
            if name not in geo["sprites"]:
                geo["sprites"][name] = measure(name, "house", SPRITE_SIZE)
    for f in FACILITIES:
        big = f["tiles"] >= 2
        geo["sprites"][f["sprite"]] = measure(f["sprite"], "facility", BIG_SIZE if big else SPRITE_SIZE)
    for name in PROPS.values():
        geo["sprites"][name] = measure(name, "prop", SPRITE_SIZE)
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
