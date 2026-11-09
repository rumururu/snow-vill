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

SPRITE_SIZE = 512
BACKGROUND_SIZE = 1024
SPRITES = {
    "house_wood_lit": ("houses", "house"),
    "house_sage_lit": ("houses", "house"),
    "house_indigo_lit": ("houses", "house"),
    "house_empty": ("houses", "house"),
    "tree_base": ("decor", "tree"),
    "tree_complete": ("decor", "tree"),
}
# Village layout on the background (measured on background_snow at 1254px; see docs/05-art-direction.md).
# 3×3 isometric grid: centre cell = tree, 8 cells = houses. Chosen by scripts' visibility search:
# every house ≥ 93% unoccluded with tile 230px, spacing = tile width, tree base = 0.70 × tile.
LAYOUT = {"center": [627 / 1254, 660 / 1254], "tileWidth": 230 / 1254, "spacing": 230 / 1254, "treeScale": 0.70}


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
        cx, cy, tile = widest_row(mask, 0.5 if kind == "house" else 0.85)
        ys, xs = np.where(mask)
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

    bg = Image.open(SRC / "background_snow.webp").convert("RGB")
    out = OUT / "village" / "background_snow.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    bg.resize((BACKGROUND_SIZE, BACKGROUND_SIZE), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
    geometry["background"] = {"src": "/assets/village/background_snow.webp"}
    print(f"background_snow    {out.stat().st_size // 1024:4d} KB")

    GEOMETRY.write_text(json.dumps(geometry, indent=2) + "\n")
    total = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"total delivery {total // 1024} KB → {GEOMETRY.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
