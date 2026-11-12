/**
 * Village map (docs/11-village-expansion-plan.md, layout v5): the cathedral plaza on a small rise in the middle;
 * districts ("동네") are round clearings in a snowy fir forest around it (6 inner, 4 outer), each joined to the
 * plaza by a curved path, each at its own height. A district's landmark sits in its centre with 6 houses
 * around it. Closed districts are still forest. All numbers come from src/lib/village-geometry.json, written by
 * scripts/build_village.py and shared with the Flutter app.
 *
 * World units: one ground tile is TILE wide on screen. Ground point (i, j) at elevation z projects to
 *   x = (i - j) * TILE / 2,  y = (i + j) * TILE / 4 - z * ELEVATION_PX      (2:1 isometric, plaza at 0,0)
 */
import geo from "./village-geometry.json";
import type { Direction, HouseStyle, Village } from "./village";
import { districtState, isHalfOpen, MOVABLE_DECOR_ID } from "./village";
import { localized, type Locale } from "./i18n/locales";

export const TILE = 100;
/** On-screen house size in tiles (lots are ≥ 2.3 tiles apart, so houses keep a gap). */
export const HOUSE_TILES = 1.7;
export const GROUND_ASPECT: number = geo.groundAspect;
/** Screen px per elevation unit (at TILE = 100). */
export const ELEVATION_PX: number = geo.elevationPx;
export const PATH_WIDTH: number = geo.pathWidth;
export const DISTRICT_RADIUS: number = geo.districtRadius;
export const PLAZA_BASE_RADIUS: number = geo.plazaBaseRadius;
const HULL_MARGIN: number = geo.hullMargin;
export const PARTS = geo.parts as { fence: string; post: string; gate: string };
export const SNOW_TEXTURE: string = geo.snowTexture;
export const AURORA_MIN_HOUSES: number = geo.auroraMinHouses;

export interface Point {
  x: number;
  y: number;
}
export interface SpriteGeo {
  src: string;
  anchor: number[];
  tileWidth: number;
  bbox: number[];
  hull: number[][];
  /** Canvas height / width (1 for square sprites). */
  aspect?: number;
  /** Parts only: measured slope (dy/dx) of the base line, before correction to 0.5. */
  baseSlope?: number;
}
export const SPRITES = geo.sprites as Record<string, SpriteGeo>;
/** Names per language (ko, en, ja, zh, es, fr, de, pt, ru, id). */
export type LocalizedName = Partial<Record<Locale, string>>;
export const HOUSE_SPRITES = geo.houses as Record<HouseStyle, { label: LocalizedName; a: string; b: string }>;
/** House type name in `locale` (fallback English). */
export function houseStyleLabel(style: HouseStyle, locale: Locale): string {
  return localized(HOUSE_SPRITES[style]?.label ?? {}, locale);
}
/** Animated rink frames (optional; falls back to the still sprite). */
export const RINK_FRAMES: readonly string[] = (geo as { rinkFrames?: string[] }).rinkFrames ?? [];

export interface LotDef {
  slot: number;
  district: number;
  half: 0 | 1;
  at: [number, number];
  z: number;
  /** Door direction that faces the district's landmark (default in the claim sheet). */
  facing: Direction;
}
export const LOTS: readonly LotDef[] = (geo.lots as Array<{ slot: number; district: number; half: number; at: number[]; z: number; facing: number }>).map((l) => ({
  slot: l.slot,
  district: l.district,
  half: l.half as 0 | 1,
  at: [l.at[0], l.at[1]],
  z: l.z,
  facing: l.facing as Direction,
}));

export interface FacilityDef {
  id: string;
  sprite: string;
  at: [number, number];
  z: number;
  tiles: number;
}
/** A raised piece of ground: the plaza or a district clearing. */
export interface AreaDef {
  at: [number, number];
  z: number;
  /** Irregular round outline on the ground plane (tiles). */
  outline: Array<[number, number]>;
}
export interface DistrictDef extends AreaDef {
  index: number;
  id: string;
  name: LocalizedName;
  facility: FacilityDef | null;
  decor: FacilityDef[];
  /** Path centre line from the plaza to the clearing: [i, j, z] points. */
  path: Array<[number, number, number]>;
  /** Frozen pond outline (lake district), drawn in code. */
  pond: Array<[number, number]> | null;
}
type RawFacility = { sprite: string; at: number[]; z: number; tiles: number };
const pair = (p: number[]) => [p[0], p[1]] as [number, number];
export const DISTRICTS: readonly DistrictDef[] = (
  geo.districts as Array<{ index: number; id: string; name: LocalizedName; at: number[]; z: number; outline: number[][];
    path: number[][]; pond: number[][] | null; facility: RawFacility | null; decor: RawFacility[] }>
).map((d) => ({
  index: d.index,
  id: d.id,
  name: d.name,
  at: pair(d.at),
  z: d.z,
  outline: d.outline.map(pair),
  path: d.path.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
  pond: d.pond ? d.pond.map(pair) : null,
  facility: d.facility ? { id: `d${d.index}`, sprite: d.facility.sprite, at: pair(d.facility.at), z: d.facility.z, tiles: d.facility.tiles } : null,
  decor: d.decor.map((x, k) => ({ id: `d${d.index}-decor${k}`, sprite: x.sprite, at: pair(x.at), z: x.z, tiles: x.tiles })),
}));
/** District name in `locale` (fallback English). */
export function districtName(index: number, locale: Locale): string {
  return localized(DISTRICTS[index]?.name ?? {}, locale);
}
export const PLAZA: readonly FacilityDef[] = (geo.plaza as Array<{ id: string; sprite: string; at: number[]; z: number; tiles: number }>).map((f) => ({
  ...f,
  at: pair(f.at),
}));
export const PLAZA_AREA: AreaDef = {
  at: pair(geo.plazaArea.at),
  z: geo.plazaArea.z,
  outline: (geo.plazaArea.outline as number[][]).map(pair),
};

export interface TreeDef {
  sprite: string;
  at: [number, number];
  z: number;
  tiles: number;
  mirror: boolean;
  /** Stands where the plaza will be: shown only while the plaza is not there yet (the free village). */
  plaza?: boolean;
}
export const FOREST: readonly TreeDef[] = (geo.forest as Array<{ sprite: string; at: number[]; z: number; tiles: number; mirror: boolean; plaza?: boolean }>).map((t) => ({
  sprite: t.sprite,
  at: pair(t.at),
  z: t.z,
  tiles: t.tiles,
  mirror: t.mirror,
  plaza: t.plaza === true,
}));

/**
 * The free village is district 0 alone, like the first concept: houses around the Christmas tree on a fenced
 * snowy base, no cathedral (owner 2026-11-12). The cathedral plaza and the paths appear with the first expansion
 * into another district. Same rule in the app (`plazaShown` in geometry.dart).
 */
export function plazaShown(openHalves: number): boolean {
  return (openHalves & ~3) !== 0;
}

export function project(i: number, j: number, z = 0): Point {
  return { x: ((i - j) * TILE) / 2, y: ((i + j) * TILE) / 4 - z * ELEVATION_PX };
}

/** Diamond outline of a ground tile (footprint) centred on (i, j), `size` tiles wide. */
export function tileDiamond(i: number, j: number, size = 1, z = 0): Point[] {
  const h = size / 2;
  return [project(i - h, j - h, z), project(i + h, j - h, z), project(i + h, j + h, z), project(i - h, j + h, z)];
}

/** View + mirroring for a door direction (0 = A, 1 = A mirrored, 2 = B, 3 = B mirrored). */
export function houseView(style: HouseStyle, direction: Direction): { sprite: string; mirror: boolean } {
  const h = HOUSE_SPRITES[style] ?? HOUSE_SPRITES.wood;
  return { sprite: direction < 2 ? h.a : h.b, mirror: direction === 1 || direction === 3 };
}

export interface Placed {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Where a sprite is drawn so that its measured base lands on ground (i, j), `tiles` wide. */
export function placeSprite(sprite: string, i: number, j: number, tiles = 1, z = 0): Placed {
  const g = SPRITES[sprite];
  const ground = project(i, j, z);
  const width = (TILE * tiles) / g.tileWidth;
  const height = width * (g.aspect ?? 1);
  return { x: ground.x - g.anchor[0] * width, y: ground.y - g.anchor[1] * height, width, height };
}

/** Tap polygon (sprite hull) in world coords; mirrored sprites flip around the anchor. */
export function spriteHull(sprite: string, i: number, j: number, tiles = 1, mirror = false, z = 0): Point[] {
  const g = SPRITES[sprite];
  const r = placeSprite(sprite, i, j, tiles, z);
  const ax = r.x + g.anchor[0] * r.width;
  return g.hull.map(([u, v]) => {
    const x = r.x + u * r.width;
    return { x: mirror ? 2 * ax - x : x, y: r.y + v * r.height };
  });
}

type MapVillage = Pick<Village, "openHalves" | "houses" | "decor">;

/** Lots that exist in the village (opened halves). */
export function visibleLots(village: Pick<Village, "openHalves">): LotDef[] {
  return LOTS.filter((l) => isHalfOpen(village.openHalves, l.slot));
}

/**
 * Plaza facilities plus, for every district with an opened half, its facility and decoration. Decorations
 * the owner moved (`village.decor`) stand at their new spot.
 */
export function facilitiesFor(village: Pick<Village, "openHalves" | "decor">): FacilityDef[] {
  const out = plazaShown(village.openHalves) ? [...PLAZA] : [];
  for (const d of DISTRICTS) {
    if (districtState(village.openHalves, d.index) === 0) continue;
    if (d.facility) out.push(d.facility);
    out.push(...d.decor.filter((x) => SPRITES[x.sprite]));
  }
  const moved = village.decor ?? {};
  return out.map((f) => (moved[f.id] && MOVABLE_DECOR_ID.test(f.id) ? { ...f, at: moved[f.id] } : f));
}

/** Decorations the owner may move in this village (opened districts only), at their current spots. */
export function movableDecor(village: Pick<Village, "openHalves" | "decor">): FacilityDef[] {
  return facilitiesFor(village).filter((f) => MOVABLE_DECOR_ID.test(f.id));
}

/** Screen point (world units) → ground tile at elevation z (inverse of `project`). */
export function groundAt(x: number, y: number, z = 0): [number, number] {
  const a = x / (TILE / 2);
  const b = (y + z * ELEVATION_PX) / (TILE / 4);
  return [(a + b) / 2, (b - a) / 2];
}

/** Clearances (tiles) for a moved decoration. */
const DECOR_CLEAR = { lot: 1.2, path: 0.6, decor: 0.45, rim: 0.4, cathedral: 1.5, tree: 0.75 };

function distToLine(p: G, line: Array<[number, number, number]>): number {
  let best = Infinity;
  for (let k = 0; k + 1 < line.length; k++) {
    const [ai, aj] = line[k];
    const [bi, bj] = line[k + 1];
    const vi = bi - ai;
    const vj = bj - aj;
    const L2 = vi * vi + vj * vj || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ai) * vi + (p[1] - aj) * vj) / L2));
    best = Math.min(best, Math.hypot(p[0] - ai - t * vi, p[1] - aj - t * vj));
  }
  return best;
}

/** Inside `poly` with at least `margin` tiles to spare in every direction. */
function insideBy(p: G, poly: G[], margin: number): boolean {
  if (!pointInPolygon(p, poly)) return false;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (!pointInPolygon([p[0] + Math.cos(a) * margin, p[1] + Math.sin(a) * margin], poly)) return false;
  }
  return true;
}

/** Inside `poly`, or within `margin` tiles of it. */
function nearPoly(p: G, poly: G[], margin: number): boolean {
  if (pointInPolygon(p, poly)) return true;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (pointInPolygon([p[0] + Math.cos(a) * margin, p[1] + Math.sin(a) * margin], poly)) return true;
  }
  return false;
}

/**
 * Can decoration `id` stand at `at`? Plaza decorations stay on the plaza mound (clear of the cathedral and
 * the tree); district decorations stay on the village ground off the mound and its back slope. Neither may
 * stand on a lot, a path, a landmark, a pond or another decoration. Same rule in the app (`decorSpotOk`).
 */
export function decorSpotOk(village: Pick<Village, "openHalves" | "decor">, id: string, at: [number, number]): boolean {
  if (!MOVABLE_DECOR_ID.test(id)) return false;
  const p: G = at;
  if (id.startsWith("plaza-")) {
    if (!insideBy(p, PLAZA_AREA.outline, DECOR_CLEAR.rim + FENCE_INSET)) return false;
    const cathedral = PLAZA.find((f) => f.id === "cathedral");
    const tree = PLAZA.find((f) => f.id === "tree");
    if (cathedral && Math.hypot(p[0] - cathedral.at[0], p[1] - cathedral.at[1]) < DECOR_CLEAR.cathedral) return false;
    if (tree && Math.hypot(p[0] - tree.at[0], p[1] - tree.at[1]) < DECOR_CLEAR.tree) return false;
  } else {
    if (!insideBy(p, villageShape(village), DECOR_CLEAR.rim)) return false;
    // Off the mound and its back slope.
    const di = p[0] - PLAZA_AREA.at[0];
    const dj = p[1] - PLAZA_AREA.at[1];
    const L = Math.hypot(di, dj) || 1;
    const back: G = [p[0] - (di / L) * (DECOR_CLEAR.rim + slopeWidth(PLAZA_AREA, p[0], p[1])), p[1] - (dj / L) * (DECOR_CLEAR.rim + slopeWidth(PLAZA_AREA, p[0], p[1]))];
    if (pointInPolygon(p, PLAZA_AREA.outline) || pointInPolygon(back, PLAZA_AREA.outline)) return false;
    for (const l of LOTS) {
      if (districtState(village.openHalves, l.district) === 0) continue;
      if (Math.hypot(p[0] - l.at[0], p[1] - l.at[1]) < DECOR_CLEAR.lot) return false;
    }
  }
  for (const d of DISTRICTS) {
    if (districtState(village.openHalves, d.index) === 0) continue;
    // Paths are drawn only off the mound (its top is all dirt yard), so only district decor checks them.
    if (!id.startsWith("plaza-") && distToLine(p, d.path) < DECOR_CLEAR.path) return false;
    if (d.facility && Math.hypot(p[0] - d.at[0], p[1] - d.at[1]) < d.facility.tiles * 0.55 + 0.3) return false;
    if (d.pond && nearPoly(p, d.pond, 0.35)) return false;
  }
  for (const f of movableDecor(village)) {
    if (f.id !== id && Math.hypot(p[0] - f.at[0], p[1] - f.at[1]) < DECOR_CLEAR.decor) return false;
  }
  return true;
}

// ---------- ground, paths and forest ----------

type G = [number, number];

function convexHull(points: G[]): G[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: G, a: G, b: G) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: G[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: G[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The opened village as ONE rounded shape on the ground plane (owner: not islands, no bridges): a convex
 *  envelope of the plaza base and every opened clearing, resampled with a gently wavy edge. */
export function villageShape(village: Pick<Village, "openHalves">): G[] {
  const circles: Array<[number, number, number]> = plazaShown(village.openHalves) ? [[0, 0, PLAZA_BASE_RADIUS]] : [];
  for (const d of DISTRICTS) if (districtState(village.openHalves, d.index) > 0) circles.push([d.at[0], d.at[1], DISTRICT_RADIUS + HULL_MARGIN]);
  const pts: G[] = [];
  for (const [ci, cj, r] of circles) for (let k = 0; k < 48; k++) pts.push([ci + r * Math.cos((k * Math.PI) / 24), cj + r * Math.sin((k * Math.PI) / 24)]);
  const hull = convexHull(pts);
  // resample every ~0.6 tiles and push each point out/in a little along the outward normal
  const out: G[] = [];
  let s = 0;
  for (let k = 0; k < hull.length; k++) {
    const a = hull[k];
    const b = hull[(k + 1) % hull.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / 0.6));
    const ni = (b[1] - a[1]) / (L || 1);
    const nj = -(b[0] - a[0]) / (L || 1);
    for (let t = 0; t < n; t++) {
      const f = t / n;
      const w = 0.22 * Math.sin(s * 0.55 + 0.7) + 0.12 * Math.sin(s * 1.37 + 2.1);
      out.push([a[0] + (b[0] - a[0]) * f + ni * w, a[1] + (b[1] - a[1]) * f + nj * w]);
      s += L / n;
    }
  }
  return out;
}

/** Convex hull of screen points (for silhouettes). */
export function convexHullPoints(points: Point[]): Point[] {
  return convexHull(points.map((p) => [p.x, p.y] as G)).map(([x, y]) => ({ x, y }));
}

export function pointInPolygon(p: G, poly: G[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The village ground (z = 0): projected outline, and its bank (side wall) quads to draw first. */
export function shapeOutline(shape: G[]): Point[] {
  return shape.map(([i, j]) => project(i, j, 0));
}
export function shapeBank(shape: G[], height = 0.45): Point[][] {
  const top = shapeOutline(shape);
  const drop = height * ELEVATION_PX;
  return top.map((p, k) => {
    const q = top[(k + 1) % top.length];
    return [p, q, { x: q.x, y: q.y + drop }, { x: p.x, y: p.y + drop }];
  });
}

/** Projected outline of an area (plaza mound top, or a district clearing for hit tests / ghosts). */
export function areaOutline(a: AreaDef): Point[] {
  return a.outline.map(([i, j]) => project(i, j, a.z));
}

/** Bank (side wall) quads of the raised plaza mound. Drawn before its top. */
export function areaBank(a: AreaDef): Point[][] {
  const top = areaOutline(a);
  const drop = (a.z + 0.05) * ELEVATION_PX;
  return top.map((p, k) => {
    const q = top[(k + 1) % top.length];
    return [p, q, { x: q.x, y: q.y + drop }, { x: p.x, y: p.y + drop }];
  });
}

/** One step where a path leaves the plaza mound toward the viewer: a box from the ground up to `z`. */
export interface PathStep {
  /** Top face corners on the ground plane (tiles). */
  corners: Array<[number, number]>;
  z: number;
}

/** A ground point with its elevation (tiles, tiles, elevation units). */
export type GZ = [number, number, number];

const smoothstep = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

const STEP_DEPTH = 0.3;
const STEP_COUNT = 3;
const STEP_HALF_WIDTH = 0.62;
/** Back of the plaza mound: the ground rises gently to it over this many tiles (no wall, no fence there). */
const SLOPE_WIDTH = 1.4;
/** Fence posts along the walled (front and side) edge of the mound. */
const FENCE_INSET = 0.22;
const FENCE_PITCH = 0.62;
const FENCE_GAP = 0.85;
/** The free village's fence: inset from the base's edge, and half-width of the opening at the front (tiles). */
const VILLAGE_FENCE_INSET = 0.55;
const VILLAGE_GATE = 1.1;

/** How much an outline point faces away from the viewer (1 = straight back, -1 = straight toward the viewer). */
function backness(a: AreaDef, i: number, j: number): number {
  const di = i - a.at[0];
  const dj = j - a.at[1];
  const L = Math.hypot(di, dj) || 1;
  return -(di + dj) / L / Math.SQRT2;
}

/** Width (tiles) of the gentle slope behind the mound at an outline point; 0 where the mound has a wall. */
export function slopeWidth(a: AreaDef, i: number, j: number): number {
  return SLOPE_WIDTH * smoothstep((backness(a, i, j) - 0.12) / 0.55);
}

/** The gentle snowy slope behind the plaza mound: one quad per outline edge (top at a.z, foot on the ground). */
export function plazaSlope(a: AreaDef = PLAZA_AREA): GZ[][] {
  const foot = a.outline.map(([i, j]): GZ => {
    const w = slopeWidth(a, i, j);
    const di = i - a.at[0];
    const dj = j - a.at[1];
    const L = Math.hypot(di, dj) || 1;
    return [i + (di / L) * w, j + (dj / L) * w, 0];
  });
  const n = a.outline.length;
  const out: GZ[][] = [];
  for (let k = 0; k < n; k++) {
    const m = (k + 1) % n;
    if (foot[k][0] === a.outline[k][0] && foot[m][0] === a.outline[m][0]) continue;
    out.push([[...a.outline[k], a.z], [...a.outline[m], a.z], foot[m], foot[k]]);
  }
  return out;
}

/** Where a path leaves `area` (tiles), with the unit direction there; null if it never does. */
function pathExit(line: Array<[number, number, number]>, area: AreaDef): { i: number; j: number; ui: number; uj: number; along: number } | null {
  let along = 0;
  for (let k = 0; k + 1 < line.length; k++) {
    const a: G = [line[k][0], line[k][1]];
    const b: G = [line[k + 1][0], line[k + 1][1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (pointInPolygon(a, area.outline) && !pointInPolygon(b, area.outline) && L > 0) {
      let lo = 0;
      let hi = 1;
      for (let n = 0; n < 20; n++) {
        const m = (lo + hi) / 2;
        if (pointInPolygon([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m], area.outline)) lo = m;
        else hi = m;
      }
      return { i: a[0] + (b[0] - a[0]) * lo, j: a[1] + (b[1] - a[1]) * lo, ui: (b[0] - a[0]) / L, uj: (b[1] - a[1]) / L, along: along + L * lo };
    }
    along += L;
  }
  return null;
}

/** True when the path leaves the mound through its walled side (it gets steps); false = down the back slope. */
function walledExit(e: { i: number; j: number }, area: AreaDef): boolean {
  return slopeWidth(area, e.i, e.j) < 0.35;
}

/**
 * Wooden steps down the plaza mound where a path leaves it through the walled side. Same in the app
 * (`pathSteps` in geometry.dart).
 */
export function pathSteps(line: Array<[number, number, number]>, area: AreaDef = PLAZA_AREA): PathStep[] {
  const e = pathExit(line, area);
  if (!e || !walledExit(e, area)) return [];
  const ni = -e.uj;
  const nj = e.ui;
  const out: PathStep[] = [];
  for (let k = 0; k < STEP_COUNT; k++) {
    const t0 = k * STEP_DEPTH - 0.08;
    const t1 = (k + 1) * STEP_DEPTH - 0.08;
    const at = (t: number, s: number): [number, number] => [e.i + e.ui * t + ni * s, e.j + e.uj * t + nj * s];
    out.push({
      corners: [at(t0, -STEP_HALF_WIDTH), at(t1, -STEP_HALF_WIDTH), at(t1, STEP_HALF_WIDTH), at(t0, STEP_HALF_WIDTH)],
      z: area.z * (1 - (k + 1) / (STEP_COUNT + 1)),
    });
  }
  return out;
}

/** A dirt path's band outside the mound: its two edges (ground points with elevation), near → far. */
export interface PathBand {
  left: GZ[];
  right: GZ[];
}

/**
 * The dirt path from the plaza mound's edge to its clearing, sampled every ~0.12 tiles. Off a walled edge it
 * starts at the foot of the steps; down the back slope its elevation eases from the mound to the ground.
 * Same in the app (`pathBand` in geometry.dart).
 */
export function pathBand(line: Array<[number, number, number]>, area: AreaDef = PLAZA_AREA, width = PATH_WIDTH * 0.92): PathBand {
  const e = pathExit(line, area);
  const walled = e ? walledExit(e, area) : false;
  const start = e ? e.along + (walled ? 0.12 : 0) : 0;
  const slope = e && !walled ? Math.max(0.6, slopeWidth(area, e.i, e.j)) : 0;
  const groundZ = line[line.length - 1][2];
  const w = width / 2;
  const left: GZ[] = [];
  const right: GZ[] = [];
  let along = 0;
  const STEP = 0.12;
  for (let k = 0; k + 1 < line.length; k++) {
    const [ai, aj] = line[k];
    const [bi, bj] = line[k + 1];
    const L = Math.hypot(bi - ai, bj - aj);
    if (L === 0) continue;
    const ui = (bi - ai) / L;
    const uj = (bj - aj) / L;
    const last = k + 2 === line.length;
    for (let t = 0; t < L + (last ? 1e-6 : 0); t += STEP) {
      const d = along + t;
      if (d < start) continue;
      const ci = ai + ui * t;
      const cj = aj + uj * t;
      const z = e && !walled ? area.z + (groundZ - area.z) * smoothstep((d - e.along) / slope) : e ? groundZ : line[k][2];
      // The band narrows a little at its very start so it tucks under the steps / into the slope.
      const ww = w * (0.85 + 0.15 * smoothstep((d - start) / 0.4));
      left.push([ci - uj * ww, cj + ui * ww, z]);
      right.push([ci + uj * ww, cj - ui * ww, z]);
    }
    along += L;
  }
  return { left, right };
}

/**
 * Fence runs along the walled (front and side) edge of the plaza mound, just inside it, broken where an
 * opened path leaves. The back, where the ground rises gently to the mound, has no fence.
 * Same in the app (`plazaFence` in geometry.dart).
 */
export function plazaFence(paths: Array<Array<[number, number, number]>>, area: AreaDef = PLAZA_AREA): G[][] {
  const exits = paths.map((p) => pathExit(p, area)).filter((x): x is NonNullable<typeof x> => !!x);
  // The outline inset toward the centre, as one closed polyline; walk it at a fixed pitch.
  const ring: G[] = area.outline.map(([i, j]) => {
    const di = i - area.at[0];
    const dj = j - area.at[1];
    const L = Math.hypot(di, dj) || 1;
    return [i - (di / L) * FENCE_INSET, j - (dj / L) * FENCE_INSET];
  });
  const total = ring.reduce((s, p, k) => s + Math.hypot(ring[(k + 1) % ring.length][0] - p[0], ring[(k + 1) % ring.length][1] - p[1]), 0);
  const count = Math.round(total / FENCE_PITCH);
  const pitch = total / count;
  const posts: Array<G | null> = [];
  let seg = 0;
  let segStart = 0;
  for (let n = 0; n < count; n++) {
    const d = n * pitch;
    while (true) {
      const a = ring[seg];
      const b = ring[(seg + 1) % ring.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= segStart + L || seg === ring.length - 1) {
        const t = L ? (d - segStart) / L : 0;
        const p: G = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const walled = slopeWidth(area, p[0], p[1]) < 0.3;
        const inGap = exits.some((x) => Math.hypot(x.i - p[0], x.j - p[1]) < FENCE_GAP);
        posts.push(walled && !inGap ? p : null);
        break;
      }
      segStart += L;
      seg++;
    }
  }
  // Split into runs at the gaps (the ring is closed: a run may wrap past post 0).
  const firstGap = posts.findIndex((p) => p === null);
  if (firstGap < 0) return [posts as G[]];
  const runs: G[][] = [];
  let cur: G[] = [];
  for (let k = 1; k <= posts.length; k++) {
    const p = posts[(firstGap + k) % posts.length];
    if (p) cur.push(p);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length >= 2);
}

/** Split a closed ring of fence posts (null = gap) into runs; a run may wrap past post 0. */
function fenceRuns(posts: Array<G | null>): G[][] {
  const firstGap = posts.findIndex((p) => p === null);
  if (firstGap < 0) return [posts as G[]];
  const runs: G[][] = [];
  let cur: G[] = [];
  for (let k = 1; k <= posts.length; k++) {
    const p = posts[(firstGap + k) % posts.length];
    if (p) cur.push(p);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length >= 2);
}

/**
 * The free village's fence (first concept: a fenced snowy base): posts all around, just inside the base's edge,
 * with an opening at the front. Same in the app (`villageFence` in geometry.dart).
 */
export function villageFence(shape: G[]): G[][] {
  const ci = shape.reduce((s, p) => s + p[0], 0) / shape.length;
  const cj = shape.reduce((s, p) => s + p[1], 0) / shape.length;
  const front = shape.reduce((a, p) => (p[0] + p[1] > a[0] + a[1] ? p : a), shape[0]);
  const ring: G[] = shape.map(([i, j]) => {
    const L = Math.hypot(i - ci, j - cj) || 1;
    return [i - ((i - ci) / L) * VILLAGE_FENCE_INSET, j - ((j - cj) / L) * VILLAGE_FENCE_INSET];
  });
  const total = ring.reduce((s, p, k) => s + Math.hypot(ring[(k + 1) % ring.length][0] - p[0], ring[(k + 1) % ring.length][1] - p[1]), 0);
  const count = Math.round(total / FENCE_PITCH);
  const pitch = total / count;
  const posts: Array<G | null> = [];
  let seg = 0;
  let segStart = 0;
  for (let n = 0; n < count; n++) {
    const d = n * pitch;
    while (seg < ring.length - 1) {
      const L = Math.hypot(ring[seg + 1][0] - ring[seg][0], ring[seg + 1][1] - ring[seg][1]);
      if (d <= segStart + L) break;
      segStart += L;
      seg++;
    }
    const a = ring[seg];
    const b = ring[(seg + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = L ? Math.min(1, (d - segStart) / L) : 0;
    // Rounded: server (Node) and browser trig differ in the last digits, which would break hydration.
    const p: G = [Math.round((a[0] + (b[0] - a[0]) * t) * 1000) / 1000, Math.round((a[1] + (b[1] - a[1]) * t) * 1000) / 1000];
    posts.push(Math.hypot(p[0] - front[0], p[1] - front[1]) < VILLAGE_GATE ? null : p);
  }
  return fenceRuns(posts);
}

/** A path's band (width PATH_WIDTH) as one polygon. */
export function pathPolygon(line: Array<[number, number, number]>, width = PATH_WIDTH): Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  const w = width / 2;
  line.forEach(([i, j, z], k) => {
    const a = line[Math.max(0, k - 1)];
    const b = line[Math.min(line.length - 1, k + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ni = (-(b[1] - a[1]) / L) * w;
    const nj = ((b[0] - a[0]) / L) * w;
    left.push(project(i + ni, j + nj, z));
    right.push(project(i - ni, j - nj, z));
  });
  return [...left, ...right.reverse()];
}

/** Trees still standing: outside the village shape, with a little room at the sides and more in front of
 *  it (the viewer looks along +i+j, so trees just in front would hide houses). */
export function forestFor(village: Pick<Village, "openHalves">, shape: G[] = villageShape(village)): TreeDef[] {
  const near = (i: number, j: number) => pointInPolygon([i, j], shape);
  const plaza = plazaShown(village.openHalves);
  return FOREST.filter(({ at: [i, j], plaza: onPlaza }) => !(onPlaza && plaza) && !(near(i, j) || near(i - 0.6, j) || near(i, j - 0.6) || near(i + 0.6, j) || near(i, j + 0.6) ||
    near(i - 1.4, j - 1.4) || near(i - 2.4, j - 2.4)));
}

export type MapEntity =
  | { kind: "house"; slot: number; depth: number }
  | { kind: "lot"; slot: number; depth: number }
  | { kind: "facility"; facility: FacilityDef; depth: number }
  | { kind: "tree"; tree: TreeDef; depth: number };

/** Painter's order: back → front by ground depth (i + j), ties by x. */
export function mapOrder(village: MapVillage): MapEntity[] {
  const taken = new Set(village.houses.map((h) => h.slot));
  const items: Array<{ e: MapEntity; x: number }> = [];
  for (const l of visibleLots(village)) {
    items.push({ e: { kind: taken.has(l.slot) ? "house" : "lot", slot: l.slot, depth: l.at[0] + l.at[1] }, x: l.at[0] - l.at[1] });
  }
  for (const f of facilitiesFor(village)) items.push({ e: { kind: "facility", facility: f, depth: f.at[0] + f.at[1] }, x: f.at[0] - f.at[1] });
  for (const t of forestFor(village)) items.push({ e: { kind: "tree", tree: t, depth: t.at[0] + t.at[1] }, x: t.at[0] - t.at[1] });
  items.sort((a, b) => a.e.depth - b.e.depth || a.x - b.x);
  return items.map((i) => i.e);
}

function bounds(points: Point[], padX: number, padTop: number, padBottom: number): [number, number, number, number] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs) - padX;
  const x1 = Math.max(...xs) + padX;
  const y0 = Math.min(...ys) - padTop;
  const y1 = Math.max(...ys) + padBottom;
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Camera that frames the plaza and every opened district, with room for roofs and name chips. */
export function lotsView(village: Pick<Village, "openHalves">): [number, number, number, number] {
  const plaza = plazaShown(village.openHalves) ? areaOutline(PLAZA_AREA) : [];
  return bounds([...shapeOutline(villageShape(village)), ...plaza], TILE * 0.4, TILE * HOUSE_TILES * 1.1, TILE * 0.7);
}

/** The camera never shows less than this many px of map across: a small (unexpanded) village sits in the middle of the
 *  screen like the concept's little diorama, with forest around it, and visibly grows as districts open (owner 2026-11-12).
 *  Same value as `VillageGeometry.minViewWidth` in the app. */
export const MIN_VIEW_WIDTH = 1150;

/** Default camera: the opened village, widened (same centre and aspect) to at least MIN_VIEW_WIDTH. */
export function cameraView(village: Pick<Village, "openHalves">): [number, number, number, number] {
  const [x, y, w, h] = lotsView(village);
  const k = Math.max(1, MIN_VIEW_WIDTH / w);
  return clampToLand([x + (w - w * k) / 2, y + (h - h * k) / 2, w * k, h * k]);
}

/** Camera that shows the whole possible village (all 10 districts), for zooming out. */
export function fullView(): [number, number, number, number] {
  return bounds([PLAZA_AREA, ...DISTRICTS].flatMap(areaOutline), TILE * 1.2, TILE * HOUSE_TILES * 1.1, TILE * 1.2);
}

/** Lowest screen y of the land: the default camera never looks past it (no bare band under the forest). */
export const LAND_RADIUS = 33;
export const LAND_BOTTOM = (LAND_RADIUS * Math.SQRT2 * TILE) / 4; // project(R/√2, R/√2).y

/** Keep a camera [x, y, w, h] above the land's front edge (shift it up, same size). */
export function clampToLand(v: [number, number, number, number]): [number, number, number, number] {
  const [x, y, w, h] = v;
  const limit = LAND_BOTTOM - TILE * 0.6;
  return y + h > limit ? [x, limit - h, w, h] : v;
}

/** Outer edge of the land (forest), projected: the field is drawn inside it. */
export function landOutline(): Point[] {
  const R = LAND_RADIUS;
  return Array.from({ length: 48 }, (_, k) => {
    const t = (2 * Math.PI * k) / 48;
    return project(R * Math.cos(t), R * Math.sin(t));
  });
}
