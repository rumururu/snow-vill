#!/usr/bin/env python3
"""
Build delivery sprites from assets/source (lossless masters) → public/assets + src/lib/asset-geometry.json.

Geometry is measured from the alpha channel, never hand-typed:
- anchor: centre of the widest opaque row of the base tile (houses: lower half; trees: bottom 15%)
- tileWidth: that row's width (the tile's left/right corner distance)
- hull: convex hull of the opaque area, simplified (used as the tap region)
All values are normalised to the sprite canvas (0..1).

Usage: python3 scripts/build_assets.py   (needs Pillow + numpy)
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
OUT = ROOT / "public" / "assets"
GEOMETRY = ROOT / "src" / "lib" / "asset-geometry.json"
# The Flutter app bundles the same files (assets must live inside the Flutter package).
APP_ASSETS = ROOT / "mobile" / "assets" / "art"

SPRITE_SIZE = 512
BACKGROUND_SIZE = 1024
SPRITES = {
    "house_wood_lit": ("houses", "house"),
    "house_sage_lit": ("houses", "house"),
    "house_indigo_lit": ("houses", "house"),
    "house_empty": ("houses", "house"),
    "tree_base": ("decor", "tree"),
    "tree_complete": ("decor", "tree"),
    "decor_sled": ("decor", "prop"),
    "decor_snowfamily": ("decor", "prop"),
}
# Inner fence boundary of the village (measured on background_snow at 1254px; background_aurora is a
# pixel-aligned edit, best shift (0,0)). Clockwise: back, right, front (fences' meeting point), left.
FIELD = [(593, 322), (1220, 598), (627, 1045), (40, 590)]
# 3×3 isometric grid inside FIELD (scripts: every tile corner ≥ 30px inside the fence, every house
# ≥ 88% unoccluded): tile 210px, spacing 0.9 × tile, centre (615, 620), tree base = 0.70 × tile.
LAYOUT = {"center": [615 / 1254, 620 / 1254], "tileWidth": 210 / 1254, "spacing": 189 / 1254, "treeScale": 0.70}
# Free decorations unlocked by house count (owner decision 2026-11-10): 4 → sled, 6 → snowman family,
# 8 (paid big village, full) → aurora background. Prop spots/size chosen by search: bases ≥ 10px inside
# the fence, every house still ≥ 88% visible with props in front.
DECOR = {
    "props": [
        {"sprite": "decor_sled", "ground": [475 / 1254, 850 / 1254], "tile": 160 / 1254, "minHouses": 4},
        {"sprite": "decor_snowfamily", "ground": [755 / 1254, 850 / 1254], "tile": 160 / 1254, "minHouses": 6},
    ],
    "aurora": {"minHouses": 8},
}
BACKGROUNDS = {"base": "background_snow", "aurora": "background_aurora"}


def alpha_mask(im: Image.Image) -> np.ndarray:
    return np.array(im.convert("RGBA"))[:, :, 3] > 128


def widest_row(mask: np.ndarray, start: float) -> tuple[float, int, int]:
    h = mask.shape[0]
    best = (0, 0, 0, 0)
    for y in range(int(h * start), h):
        xs = np.where(mask[y])[0]
        if len(xs) and xs[-1] - xs[0] > best[0]:
            best = (xs[-1] - xs[0], y, xs[0], xs[-1])
    width, y, x0, x1 = best
    return (x0 + x1) / 2, y, width


def convex_hull(points: np.ndarray) -> list[tuple[float, float]]:
    pts = sorted(set(map(tuple, points.tolist())))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def simplify(poly: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    """Ramer–Douglas–Peucker on an open polyline."""
    if len(poly) < 3:
        return poly
    a, b = np.array(poly[0]), np.array(poly[-1])
    ab = b - a
    norm = np.hypot(*ab) or 1.0
    dists = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / norm for p in poly[1:-1]]
    i = int(np.argmax(dists)) + 1
    if dists[i - 1] > eps:
        return simplify(poly[: i + 1], eps)[:-1] + simplify(poly[i:], eps)
    return [poly[0], poly[-1]]


def hull_polygon(mask: np.ndarray, eps: float = 0.012) -> list[list[float]]:
    small = Image.fromarray(mask.astype(np.uint8) * 255).resize((256, 256), Image.BILINEAR)
    m = np.array(small) > 128
    ys, xs = np.where(m)
    hull = convex_hull(np.stack([xs, ys], axis=1))
    # Closed ring: split at the vertex farthest from the first one, simplify both halves.
    far = max(range(len(hull)), key=lambda i: np.hypot(hull[i][0] - hull[0][0], hull[i][1] - hull[0][1]))
    first = simplify(hull[: far + 1], eps * 256)
    second = simplify(hull[far:] + [hull[0]], eps * 256)
    simple = first[:-1] + second[:-1]
    return [[round(x / 256, 4), round(y / 256, 4)] for x, y in simple]


def main() -> None:
    geometry: dict = {"layout": LAYOUT, "sprites": {}, "background": {}}
    for name, (folder, kind) in SPRITES.items():
        im = Image.open(SRC / f"{name}.webp").convert("RGBA")
        mask = alpha_mask(im)
        w, h = im.size
        ys, xs = np.where(mask)
        # Houses: base tile is the widest row in the lower half. Trees/props: the snow mound at the
        # bottom 20% of the opaque area (their foliage/bodies are wider higher up).
        start = 0.5 if kind == "house" else (ys.max() - 0.2 * (ys.max() - ys.min())) / h
        cx, cy, tile = widest_row(mask, start)
        out_dir = OUT / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{name}.webp"
        im.resize((SPRITE_SIZE, SPRITE_SIZE), Image.LANCZOS).save(out, "WEBP", quality=84, method=6)
        geometry["sprites"][name] = {
            "src": f"/assets/{folder}/{name}.webp",
            "anchor": [round(cx / w, 4), round(cy / h, 4)],
            "tileWidth": round(tile / w, 4),
            "bbox": [round(xs.min() / w, 4), round(ys.min() / h, 4), round(xs.max() / w, 4), round(ys.max() / h, 4)],
            "hull": hull_polygon(mask),
        }
        print(f"{name:18s} {out.stat().st_size // 1024:4d} KB  anchor={geometry['sprites'][name]['anchor']} hull={len(geometry['sprites'][name]['hull'])} pts")

    # Backgrounds: full image + a foreground layer = everything outside the fence on the front side
    # (below the left–right corner line). Drawn over houses/props so front fences, lamps and the
    # snowman stay in front. Geometric (not colour-based) so snow caps on posts are included.
    src_n = 1254
    front_mask = Image.new("L", (src_n, src_n), 0)
    from PIL import ImageDraw, ImageFilter
    d = ImageDraw.Draw(front_mask)
    left, right = FIELD[3], FIELD[1]
    d.rectangle([0, 0, src_n, src_n], fill=255)
    d.polygon(FIELD, fill=0)                                       # inside the fence: not foreground
    d.polygon([(0, 0), (src_n, 0), (src_n, right[1]), right, left, (0, left[1])], fill=0)  # back half
    front_mask = front_mask.filter(ImageFilter.GaussianBlur(1.5))
    geometry["backgrounds"] = {}
    for key, name in BACKGROUNDS.items():
        bg = Image.open(SRC / f"{name}.webp").convert("RGB")
        out = OUT / "village" / f"{name}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        bg.resize((BACKGROUND_SIZE, BACKGROUND_SIZE), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
        fg = bg.convert("RGBA")
        fg.putalpha(front_mask)
        fg_out = OUT / "village" / f"{name}_front.webp"
        fg.resize((BACKGROUND_SIZE, BACKGROUND_SIZE), Image.LANCZOS).save(fg_out, "WEBP", quality=82, method=6)
        geometry["backgrounds"][key] = {"src": f"/assets/village/{name}.webp", "front": f"/assets/village/{name}_front.webp"}
        print(f"{name:18s} {out.stat().st_size // 1024:4d} KB  front {fg_out.stat().st_size // 1024} KB")
    geometry["background"] = {"src": geometry["backgrounds"]["base"]["src"]}
    geometry["field"] = [[round(x / src_n, 4), round(y / src_n, 4)] for x, y in FIELD]
    geometry["decor"] = DECOR

    GEOMETRY.write_text(json.dumps(geometry, indent=2) + "\n")
    if APP_ASSETS.parent.parent.exists():
        import shutil
        if APP_ASSETS.exists():
            shutil.rmtree(APP_ASSETS)
        shutil.copytree(OUT, APP_ASSETS)
        shutil.copy(GEOMETRY, APP_ASSETS / "asset-geometry.json")
        print(f"copied to {APP_ASSETS.relative_to(ROOT)}")
    total = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"total delivery {total // 1024} KB → {GEOMETRY.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
