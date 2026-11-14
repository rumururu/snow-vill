"""Measure sprite silhouettes: alpha mask, the widest row (ground anchor) and a simplified convex hull (tap target).

Used by scripts/build_village.py.
"""

import numpy as np
from PIL import Image


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


