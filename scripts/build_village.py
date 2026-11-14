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

Elevation: every ground point also has z (elevation units); screen y moves up by z * elevationPx.

Usage: python3 scripts/build_village.py   (Pillow + numpy)
"""
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from sprite_geometry import alpha_mask, hull_polygon, widest_row

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

# Layout (owner feedback 2026-11-11, v5): no square board. The cathedral plaza sits on a small rise in the
# middle; districts ("동네") are round clearings in a snowy pine forest, 6 in an inner ring and 4 in an outer
# ring, each joined to the plaza by a curved path. A district has its landmark in the centre and 6 houses
# around it at slightly varied angles/distances (doors toward the landmark), with the side facing the plaza
# left open as the entrance. Clearings sit at different heights (banks drawn in code). Closed districts are
# still forest; their trees clear when the district opens. Landmarks stay near house size (owner: "too big").
# Lots of district d are slots d*6 … d*6+5; the first half (d*6+0..2) are the 3 houses nearest the entrance.
GROUND_ASPECT = 0.5                  # plain 2:1 isometric
ELEVATION_PX = 40                    # screen px (at TILE=100) per elevation unit
SNOW_TEXTURE = "snow_texture"
PARTS = {"fence": "fence_straight", "post": "fence_post", "gate": "gate_arch"}   # kept for the plaza gate
DECOR_PROPS = ["prop_bench", "prop_bush", "prop_snowman_lantern", "prop_signpost"]
PLAZA_RADIUS = 4.4
PLAZA_Z = 0.55                       # the cathedral mound; everything else is on the base level (z = 0)
PLAZA = [
    {"id": "cathedral", "sprite": "landmark_cathedral", "at": [-0.9, -0.9], "tiles": 2.5},
    {"id": "tree", "sprite": "tree_complete", "at": [1.5, 1.2], "tiles": 1.05},
    {"id": "plaza-lamp-a", "sprite": "prop_lamp", "at": [2.6, -1.0], "tiles": 0.36},
    {"id": "plaza-lamp-b", "sprite": "prop_lamp", "at": [-1.0, 2.6], "tiles": 0.36},
    {"id": "plaza-bench", "sprite": "prop_bench", "at": [0.4, 2.6], "tiles": 0.5},
]
# id, name (ko), name (en), landmark sprite (None = drawn in code), landmark size in tiles (houses are 1.7)
DISTRICTS = [
    # district 0 is the free village: owner 2026-11-12 "the smallest village has no cathedral; houses around the tree,
    # like the first concept" — its landmark is the Christmas tree (the plaza and cathedral appear on the first expansion)
    ("snowflake", "눈송이 동네", "Snowflake Lane", "tree_complete", 1.3),
    ("rink", "링크 동네", "Ice Rink Lane", "landmark_rink", 1.8),
    ("santa", "산타 동네", "Santa's Lane", "landmark_santa", 1.7),
    ("rudolph", "루돌프 동네", "Rudolph Lane", "landmark_rudolph", 1.2),
    ("sled", "썰매 동네", "Sled Lane", "decor_sled", 1.2),
    ("forest", "숲속 동네", "Forest Lane", "prop_pines", 1.5),
    ("lantern", "등불 동네", "Lantern Lane", "prop_lamp", 0.75),
    ("starlight", "별빛 동네", "Starlight Lane", "tree_complete", 1.0),
    ("hill", "언덕 동네", "Hill Lane", "landmark_hill", 1.7),          # owner 2026-11-14: its own landmark, not the forest pines
    ("lake", "호숫가 동네", "Lakeside Lane", "landmark_lake", 2.0),    # owner 2026-11-14: frozen pond landmark (was drawn in code)
]
# Names in the other 8 store languages (ko/en are in DISTRICTS / HOUSES). One glossary for the app, web and store.
NAMES_I18N = {
    # districts             ja            zh        es                          fr                      de                    pt                         ru                    id
    "snowflake": dict(ja="雪の結晶通り", zh="雪花巷", es="Calle Copo de Nieve", fr="Rue des Flocons", de="Schneeflockengasse", pt="Rua do Floco de Neve", ru="Переулок Снежинок", id="Lorong Kepingan Salju"),
    "rink": dict(ja="スケートリンク通り", zh="冰场巷", es="Calle de la Pista de Hielo", fr="Rue de la Patinoire", de="Eisbahngasse", pt="Rua da Pista de Gelo", ru="Переулок Катка", id="Lorong Arena Es"),
    "santa": dict(ja="サンタ通り", zh="圣诞老人巷", es="Calle de Papá Noel", fr="Rue du Père Noël", de="Weihnachtsmanngasse", pt="Rua do Papai Noel", ru="Переулок Санты", id="Lorong Sinterklas"),
    "rudolph": dict(ja="ルドルフ通り", zh="鲁道夫巷", es="Calle Rodolfo", fr="Rue de Rudolph", de="Rudolfgasse", pt="Rua do Rudolph", ru="Переулок Рудольфа", id="Lorong Rudolph"),
    "sled": dict(ja="そり通り", zh="雪橇巷", es="Calle del Trineo", fr="Rue du Traîneau", de="Schlittengasse", pt="Rua do Trenó", ru="Переулок Саней", id="Lorong Kereta Salju"),
    "forest": dict(ja="森の通り", zh="森林巷", es="Calle del Bosque", fr="Rue de la Forêt", de="Waldgasse", pt="Rua da Floresta", ru="Лесной переулок", id="Lorong Hutan"),
    "lantern": dict(ja="ランタン通り", zh="灯笼巷", es="Calle de los Faroles", fr="Rue des Lanternes", de="Laternengasse", pt="Rua das Lanternas", ru="Фонарный переулок", id="Lorong Lentera"),
    "starlight": dict(ja="星あかり通り", zh="星光巷", es="Calle Luz de Estrellas", fr="Rue des Étoiles", de="Sternenlichtgasse", pt="Rua da Luz das Estrelas", ru="Звёздный переулок", id="Lorong Cahaya Bintang"),
    "hill": dict(ja="丘の通り", zh="山丘巷", es="Calle de la Colina", fr="Rue de la Colline", de="Hügelgasse", pt="Rua da Colina", ru="Холмистый переулок", id="Lorong Bukit"),
    "lake": dict(ja="湖畔通り", zh="湖畔巷", es="Calle del Lago", fr="Rue du Lac", de="Seegasse", pt="Rua do Lago", ru="Озёрный переулок", id="Lorong Tepi Danau"),
    # house types
    "house:wood": dict(ja="ログハウス", zh="小木屋", es="Cabaña de troncos", fr="Chalet en rondins", de="Blockhaus", pt="Cabana de madeira", ru="Бревенчатый домик", id="Pondok kayu"),
    "house:brick": dict(ja="レンガの家", zh="砖房", es="Casa de ladrillo", fr="Maison en briques", de="Backsteinhaus", pt="Casa de tijolos", ru="Кирпичный дом", id="Rumah bata"),
    "house:bakery": dict(ja="パン屋", zh="面包店", es="Panadería", fr="Boulangerie", de="Bäckerei", pt="Padaria", ru="Пекарня", id="Toko roti"),
    "house:tower": dict(ja="塔の家", zh="塔楼", es="Casa torre", fr="Maison-tour", de="Turmhaus", pt="Casa-torre", ru="Дом с башней", id="Rumah menara"),
    "house:gingerbread": dict(ja="ジンジャーブレッドの家", zh="姜饼屋", es="Casa de jengibre", fr="Maison en pain d'épices", de="Lebkuchenhaus", pt="Casa de gengibre", ru="Пряничный домик", id="Rumah jahe"),
    "house:timber": dict(ja="木組みの家", zh="半木结构屋", es="Casa de entramado", fr="Maison à colombages", de="Fachwerkhaus", pt="Casa enxaimel", ru="Фахверковый дом", id="Rumah rangka kayu"),
    "house:aframe": dict(ja="山小屋", zh="尖顶木屋", es="Cabaña alpina", fr="Chalet en A", de="Berghütte", pt="Chalé alpino", ru="Горный домик", id="Pondok gunung"),
    "house:windmill": dict(ja="風車の家", zh="风车屋", es="Molino", fr="Moulin", de="Windmühle", pt="Moinho", ru="Мельница", id="Kincir angin"),
    "house:greenhouse": dict(ja="温室の家", zh="温室小屋", es="Invernadero", fr="Serre", de="Gewächshaus", pt="Estufa", ru="Оранжерея", id="Rumah kaca"),
    "house:sage": dict(ja="セージの家", zh="鼠尾草小屋", es="Cabaña salvia", fr="Chalet sauge", de="Salbeihütte", pt="Cabana sálvia", ru="Шалфейный домик", id="Pondok sage"),
    "house:indigo": dict(ja="インディゴの家", zh="靛蓝小屋", es="Cabaña índigo", fr="Chalet indigo", de="Indigohütte", pt="Cabana índigo", ru="Домик индиго", id="Pondok nila"),
}
# (ring radius, angle in degrees on the ground plane, elevation). Angle 45° = toward the viewer (+i+j).
PLACES = [
    # inner ring: district 0 in front of the plaza, district 1 behind it (the village first grows along the
    # screen's vertical, which suits phones), then the sides
    (12.5, 45), (12.5, 225), (12.5, 105), (12.5, 345), (12.5, 165), (12.5, 285),
    # outer ring, in the gaps
    (22.0, 75), (22.0, 15), (22.0, 135), (22.0, 315),
]
PLAZA_BASE_RADIUS = 6.0              # base ground around the cathedral mound
# The opened village is ONE rounded shape (owner: not islands, no bridges): renderers wrap the plaza base and
# every opened clearing (radius + HULL_MARGIN) in a convex envelope with a slightly wavy edge, at runtime.
HULL_MARGIN = 0.6
DISTRICT_RADIUS = 5.4
POND_RADIUS = 1.7
# House positions around the landmark, relative to the entrance direction (degrees, radius in tiles).
# First three = first half (nearest the entrance).
HOUSE_RING = [(55, 3.6), (-55, 3.6), (105, 3.9), (-105, 3.9), (155, 3.5), (-155, 3.5)]
# Decoration around each clearing (degrees from the entrance, radius, sprite, tiles). Sized to the houses
# (1.7 tiles, ~215 px tall): lamp ~0.55x a house, bench/signpost/snowman well under half (owner: props looked too big).
# Owner 2026-11-14: the village looked busy — one lamp at the entrance, no signpost / bench / snowman by the houses.
DECOR = [
    (25, 5.0, "prop_lamp", 0.36),
    (128, 5.1, "prop_bush", 0.55),
    (180, 5.1, "prop_pines", 1.0),
]
FOREST_RADIUS = 30.0
FOREST_PITCH = 1.9
# Forest sprites (ChatGPT, 2026-11-11): (sprite, tiles min, tiles max, weight)
TREES = [("prop_fir_tall", 0.95, 1.2, 4), ("prop_fir_mid", 1.0, 1.25, 4), ("prop_fir_small", 0.85, 1.0, 2), ("prop_rock", 0.7, 0.9, 1)]
PATH_WIDTH = 1.0
AURORA_MIN_HOUSES = 18
PROPS = {"pines": "prop_pines", "lamp": "prop_lamp", "fir_tall": "prop_fir_tall", "fir_mid": "prop_fir_mid",
         "fir_small": "prop_fir_small", "rock": "prop_rock"}
MAX_HOUSES = 60


def rand(n: int) -> float:
    """Deterministic pseudo-random in [0, 1)."""
    x = math.sin(n * 12.9898 + 78.233) * 43758.5453
    return x - math.floor(x)


def facing_toward(i: float, j: float, ti: float, tj: float) -> int:
    """Door direction (0 → +j, 1 → +i, 2 → -j, 3 → -i) pointing most toward (ti, tj)."""
    vecs = {0: (0, 1), 1: (1, 0), 2: (0, -1), 3: (-1, 0)}
    di, dj = ti - i, tj - j
    return max(vecs, key=lambda d: vecs[d][0] * di + vecs[d][1] * dj)


def polar(ci: float, cj: float, ang_deg: float, r: float) -> tuple[float, float]:
    a = math.radians(ang_deg)
    return ci + r * math.cos(a), cj + r * math.sin(a)


def blob(ci: float, cj: float, r: float, seed: int, n: int = 32) -> list[list[float]]:
    """Irregular round outline (ground plane), deterministic per seed."""
    ph1, ph2 = rand(seed) * 6.283, rand(seed + 7) * 6.283
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        rr = r * (1 + 0.06 * math.sin(3 * t + ph1) + 0.04 * math.sin(5 * t + ph2))
        pts.append([round(ci + rr * math.cos(t), 3), round(cj + rr * math.sin(t), 3)])
    return pts


def smooth(t: float) -> float:
    return t * t * (3 - 2 * t)


PATH_CLEARANCE = 0.85                # decor keeps this far (tiles) from a path's centre line (owner: paths looked bad)


def clear_of_path(item: dict, line: list[list[float]]) -> dict:
    """Push a decoration sideways off the path's stepping stones, if it sits on them."""
    i, j = item["at"]
    best, foot = 1e9, None
    for a, b in zip(line, line[1:]):
        di, dj = b[0] - a[0], b[1] - a[1]
        L2 = di * di + dj * dj or 1e-9
        t = max(0.0, min(1.0, ((i - a[0]) * di + (j - a[1]) * dj) / L2))
        pi, pj = a[0] + di * t, a[1] + dj * t
        d = math.hypot(i - pi, j - pj)
        if d < best:
            best, foot = d, (pi, pj, di, dj)
    if best >= PATH_CLEARANCE:
        return item
    pi, pj, di, dj = foot
    if best > 1e-6:
        ni, nj = (i - pi) / best, (j - pj) / best
    else:
        L = math.hypot(di, dj) or 1.0
        ni, nj = -dj / L, di / L
    return {**item, "at": [round(pi + ni * PATH_CLEARANCE, 3), round(pj + nj * PATH_CLEARANCE, 3)]}


def path_line(a: tuple[float, float, float], b: tuple[float, float, float], bend: float, n: int = 18) -> list[list[float]]:
    """Quadratic curve from a to b (i, j, z) bowed sideways by `bend` tiles; z eases between the ends."""
    (ai, aj, az), (bi, bj, bz) = a, b
    mi, mj = (ai + bi) / 2, (aj + bj) / 2
    di, dj = bi - ai, bj - aj
    L = math.hypot(di, dj) or 1
    ci, cj = mi - dj / L * bend, mj + di / L * bend
    out = []
    for k in range(n + 1):
        t = k / n
        i = (1 - t) ** 2 * ai + 2 * (1 - t) * t * ci + t * t * bi
        j = (1 - t) ** 2 * aj + 2 * (1 - t) * t * cj + t * t * bj
        out.append([round(i, 3), round(j, 3), round(az + (bz - az) * smooth(t), 3)])
    return out


def dist_to_line(p: tuple[float, float], line: list[list[float]]) -> float:
    best = 1e9
    for (ai, aj, _), (bi, bj, _) in zip(line, line[1:]):
        vi, vj = bi - ai, bj - aj
        L2 = vi * vi + vj * vj or 1
        t = max(0, min(1, ((p[0] - ai) * vi + (p[1] - aj) * vj) / L2))
        best = min(best, math.hypot(p[0] - ai - t * vi, p[1] - aj - t * vj))
    return best


def districts_and_lots() -> tuple[list[dict], list[dict], list[dict], dict]:
    districts, lots = [], []
    for d, ((R, ang), (key, ko, en, sprite, tiles)) in enumerate(zip(PLACES, DISTRICTS)):
        z = 0.0
        ci, cj = polar(0, 0, ang, R)
        entrance = ang + 180                      # direction from the clearing toward the plaza
        jitter = lambda n: (rand(d * 31 + n) - 0.5)
        for n, (da, r) in enumerate(HOUSE_RING):
            i, j = polar(ci, cj, entrance + da + jitter(n) * 14, r + jitter(n + 10) * 0.5)
            lots.append({"slot": d * 6 + n, "district": d, "half": 0 if n < 3 else 1, "at": [round(i, 3), round(j, 3)],
                         "z": z, "facing": facing_toward(i, j, ci, cj)})
        decor = []
        for k, (da, r, dsprite, dt) in enumerate(DECOR):
            if key == "lake" and r < 3:           # the pond takes the centre
                continue
            i, j = polar(ci, cj, entrance + da, r)
            decor.append({"sprite": dsprite, "at": [round(i, 3), round(j, 3)], "z": z, "tiles": dt})
        if key == "lantern":                      # a small ring of lamps around the centre lamp
            for k in range(3):
                i, j = polar(ci, cj, entrance + 60 + k * 120, 1.1)
                decor.append({"sprite": "prop_lamp", "at": [round(i, 3), round(j, 3)], "z": z, "tiles": 0.36})
        start = polar(0, 0, ang, PLAZA_RADIUS - 1.2)
        end = polar(ci, cj, entrance, 1.9 if sprite or key == "lake" else 1.2)
        bend = (1.2 if d % 2 else -1.2) * (1.6 if R > 20 else 1)
        line = path_line((start[0], start[1], PLAZA_Z), (end[0], end[1], z), bend)
        decor = [clear_of_path(x, line) for x in decor]
        districts.append({
            "index": d, "id": key, "name": {"ko": ko, "en": en, **NAMES_I18N[key]}, "at": [round(ci, 3), round(cj, 3)], "z": z,
            "radius": DISTRICT_RADIUS, "outline": blob(ci, cj, DISTRICT_RADIUS, d + 1),
            "path": line,
            "facility": {"sprite": sprite, "at": [round(ci, 3), round(cj, 3)], "z": z, "tiles": tiles} if sprite else None,
            "pond": None,  # the lake's pond is now its landmark sprite (landmark_lake)
            "decor": decor,
        })
    lots.sort(key=lambda l: l["slot"])
    assert len(lots) == MAX_HOUSES
    # minimum spacing check (houses are 1.7 tiles wide)
    for a in lots:
        for b in lots:
            if a["slot"] < b["slot"] and a["district"] == b["district"]:
                assert math.dist(a["at"], b["at"]) > 2.3, (a, b)
    plaza = {"at": [0, 0], "z": PLAZA_Z, "radius": PLAZA_RADIUS, "outline": blob(0, 0, PLAZA_RADIUS, 0),
             "base": blob(0, 0, PLAZA_BASE_RADIUS, 99)}
    # Forest: jittered grid of pines over the whole land; each belongs to the district it covers (cleared
    # when that district opens) and lists districts whose path it blocks (cleared when they open).
    forest = []
    n = int(FOREST_RADIUS / FOREST_PITCH)
    k = 0
    for gi in range(-n, n + 1):
        for gj in range(-n, n + 1):
            k += 1
            i = gi * FOREST_PITCH + (rand(k) - 0.5) * 1.4
            j = gj * FOREST_PITCH + (rand(k + 999) - 0.5) * 1.4
            if math.hypot(i, j) > FOREST_RADIUS:
                continue
            # Trees where the plaza stands are kept but flagged: they show only while the plaza is not there yet
            # (the free village, district 0 alone), so the small village is not framed by a bare snowfield.
            on_plaza = math.hypot(i, j) < PLAZA_RADIUS + 1.2
            # clumps: a smooth density field leaves open snowfields between groves
            dens = 0.5 + 0.3 * math.sin(i * 0.31 + 1.3) * math.cos(j * 0.27 - 0.4) + 0.25 * math.sin((i + j) * 0.17 + 2.1)
            near = min(math.dist((i, j), dd["at"]) - DISTRICT_RADIUS for dd in districts)
            if 0 < near < 1.6:
                dens += 0.35                       # trees ring each clearing
            if rand(k + 4242) > dens:
                continue
            zz = 0.0
            pick = rand(k + 31) * sum(t[3] for t in TREES)
            for sprite, lo, hi, wgt in TREES:
                pick -= wgt
                if pick <= 0:
                    break
            tiles = round(lo + rand(k + 77) * (hi - lo), 2)
            tree = {"sprite": sprite, "at": [round(i, 3), round(j, 3)], "z": zz, "tiles": tiles, "mirror": rand(k + 5) > 0.5}
            if on_plaza:
                tree["plaza"] = True
            forest.append(tree)
    return districts, lots, forest, plaza


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
    if name.startswith(("prop_fir", "prop_rock")):
        cy = ys.max() - 0.03 * (ys.max() - ys.min())   # stand on the trunk / rock bottom
        cx = (xs.min() + xs.max()) / 2
    folder = OUT / kind
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{name}.webp"
    # Keep the canvas aspect (plots are 2:1); `size` is the output width.
    im.resize((size, max(1, round(size * h / w))), Image.LANCZOS).save(out, "WEBP", quality=84, method=6)
    extra = {}
    if kind == "part":
        # Slope of the base line (lowest opaque pixel per column, middle 80%): parts made to run along a
        # ground edge are sheared to the true 2:1 slope by the renderer.
        cols = np.where(mask.any(axis=0))[0]
        lo, hi = cols[0] + int(0.1 * len(cols)), cols[-1] - int(0.1 * len(cols))
        xs_ = np.arange(lo, hi)
        bottoms = np.array([np.where(mask[:, x])[0].max() for x in xs_])
        extra["baseSlope"] = round(float(np.polyfit(xs_, bottoms, 1)[0]), 4)
    return {
        **extra,
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
    districts, lot_list, forest, plaza_area = districts_and_lots()
    geo: dict = {"version": 5, "legacyStyles": LEGACY_STYLES, "maxHouses": MAX_HOUSES, "groundAspect": GROUND_ASPECT,
                 "elevationPx": ELEVATION_PX, "pathWidth": PATH_WIDTH, "parts": PARTS, "districtRadius": DISTRICT_RADIUS,
                 "plazaBaseRadius": PLAZA_BASE_RADIUS, "hullMargin": HULL_MARGIN,
                 "snowTexture": f"/assets/v2/texture/{SNOW_TEXTURE}.webp", "plazaArea": plaza_area,
                 "plaza": [{**f, "z": PLAZA_Z} for f in PLAZA], "districts": districts, "forest": forest, "houses": {}, "sprites": {},
                 "auroraMinHouses": AURORA_MIN_HOUSES, "props": PROPS, "lots": lot_list}
    for key, (ko, en, a, b) in HOUSES.items():
        geo["houses"][key] = {"label": {"ko": ko, "en": en, **NAMES_I18N["house:" + key]}, "a": a, "b": b}
        for name in dict.fromkeys((a, b)):  # ordered (a set would reorder the JSON between runs)
            if name not in geo["sprites"]:
                geo["sprites"][name] = measure(name, "house", SPRITE_SIZE)
    facility_sprites = {f["sprite"]: f["tiles"] for f in PLAZA if f["sprite"] not in PROPS.values() and not f["sprite"].startswith("prop_")}
    facility_sprites.update({d[3]: max(2.0 if d[3] in ("landmark_rink", "landmark_santa") else 0, d[4]) for d in DISTRICTS if d[3]})
    for name, tiles in facility_sprites.items():
        if name in PROPS.values():
            continue
        geo["sprites"][name] = measure(name, "facility", BIG_SIZE if tiles >= 2 else SPRITE_SIZE)
    for name in PROPS.values():
        geo["sprites"][name] = measure(name, "prop", SPRITE_SIZE)
    for name in [*PARTS.values(), *DECOR_PROPS]:
        if (SRC / f"{name}.webp").exists():
            geo["sprites"][name] = measure(name, "part", SPRITE_SIZE)
        else:
            print("missing part", name)
    tex = SRC / f"{SNOW_TEXTURE}.webp"
    if tex.exists():
        (OUT / "texture").mkdir(parents=True, exist_ok=True)
        Image.open(tex).convert("RGB").resize((512, 512), Image.LANCZOS).save(OUT / "texture" / f"{SNOW_TEXTURE}.webp", "WEBP", quality=82)
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
