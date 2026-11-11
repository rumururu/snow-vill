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
import { districtState, isHalfOpen } from "./village";

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
export const HOUSE_SPRITES = geo.houses as Record<HouseStyle, { label: { ko: string; en: string }; a: string; b: string }>;
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
  name: { ko: string; en: string };
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
  geo.districts as Array<{ index: number; id: string; name: { ko: string; en: string }; at: number[]; z: number; outline: number[][];
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
}
export const FOREST: readonly TreeDef[] = (geo.forest as Array<{ sprite: string; at: number[]; z: number; tiles: number; mirror: boolean }>).map((t) => ({
  sprite: t.sprite,
  at: pair(t.at),
  z: t.z,
  tiles: t.tiles,
  mirror: t.mirror,
}));

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

type MapVillage = Pick<Village, "openHalves" | "houses">;

/** Lots that exist in the village (opened halves). */
export function visibleLots(village: Pick<Village, "openHalves">): LotDef[] {
  return LOTS.filter((l) => isHalfOpen(village.openHalves, l.slot));
}

/** Plaza facilities plus, for every district with an opened half, its facility and decoration. */
export function facilitiesFor(village: Pick<Village, "openHalves">): FacilityDef[] {
  const out = [...PLAZA];
  for (const d of DISTRICTS) {
    if (districtState(village.openHalves, d.index) === 0) continue;
    if (d.facility) out.push(d.facility);
    out.push(...d.decor.filter((x) => SPRITES[x.sprite]));
  }
  return out;
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
  const circles: Array<[number, number, number]> = [[0, 0, PLAZA_BASE_RADIUS]];
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
  return FOREST.filter(({ at: [i, j] }) => !(near(i, j) || near(i - 0.6, j) || near(i, j - 0.6) || near(i + 0.6, j) || near(i, j + 0.6) ||
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
  return bounds([...shapeOutline(villageShape(village)), ...areaOutline(PLAZA_AREA)], TILE * 0.4, TILE * HOUSE_TILES * 1.1, TILE * 0.7);
}

/** Camera that shows the whole possible village (all 10 districts), for zooming out. */
export function fullView(): [number, number, number, number] {
  return bounds([PLAZA_AREA, ...DISTRICTS].flatMap(areaOutline), TILE * 1.2, TILE * HOUSE_TILES * 1.1, TILE * 1.2);
}

/** Outer edge of the land (forest), projected: the field is drawn inside it. */
export function landOutline(): Point[] {
  const R = 33;
  return Array.from({ length: 48 }, (_, k) => {
    const t = (2 * Math.PI * k) / 48;
    return project(R * Math.cos(t), R * Math.sin(t));
  });
}
