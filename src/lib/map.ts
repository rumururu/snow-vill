/**
 * Expandable village map (docs/11-village-expansion-plan.md). All numbers come from
 * src/lib/village-geometry.json, written by scripts/build_village.py from the source art and the
 * ring layout, and shared with the Flutter app.
 *
 * World units: one ground tile is TILE wide on screen. Ground point (i, j) in tile units projects to
 *   x = (i - j) * TILE / 2,  y = (i + j) * TILE / 4      (2:1 isometric, plaza centre at 0,0)
 */
import geo from "./village-geometry.json";
import type { Direction, HouseStyle, Village } from "./village";
import { lockedSlots, MAX_CAPACITY } from "./village";

export const TILE = 100;
/** On-screen house size in tiles (lots are ≥ 2 tiles apart, so houses keep a gap). */
export const HOUSE_TILES = 1.5;

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
}
export const SPRITES = geo.sprites as Record<string, SpriteGeo>;

export interface LotDef {
  slot: number;
  ring: number;
  at: [number, number];
  /** Door direction that faces the plaza (default in the claim sheet). */
  facing: Direction;
}
export const LOTS: readonly LotDef[] = (geo.lots as Array<{ slot: number; ring: number; at: number[]; facing: number }>).map((l) => ({
  slot: l.slot,
  ring: l.ring,
  at: [l.at[0], l.at[1]],
  facing: l.facing as Direction,
}));

export interface FacilityDef {
  id: string;
  sprite: string;
  at: [number, number];
  tiles: number;
  minHouses: number;
}
export const FACILITIES: readonly FacilityDef[] = (geo.facilities as Array<{ id: string; sprite: string; at: number[]; tiles: number; minHouses: number }>).map(
  (f) => ({ ...f, at: [f.at[0], f.at[1]] as [number, number] }),
);
export const AURORA_MIN_HOUSES: number = geo.auroraMinHouses;
export const RING_RADII: readonly number[] = geo.rings;
/** Screen height/width of the ring ovals and the ground (village-geometry.json). */
export const GROUND_ASPECT: number = (geo as { groundAspect?: number }).groundAspect ?? 0.5;

/** Ground oval (radius r in ring units) in world coords. */
export function groundEllipse(r: number): { rx: number; ry: number } {
  const rx = (r * TILE * Math.SQRT2) / 2;
  return { rx, ry: rx * GROUND_ASPECT };
}

/** Ring radius (ring units) of a ground point, measured on the screen oval. */
export function ringRadiusOf(i: number, j: number): number {
  const u = i - j;
  const v = (i + j) / (GROUND_ASPECT / 0.5);
  return Math.hypot(u, v) / Math.SQRT2;
}
/** Animated rink frames (optional; falls back to the still sprite). */
export const RINK_FRAMES: readonly string[] = (geo as { rinkFrames?: string[] }).rinkFrames ?? [];

export const HOUSE_SPRITES = geo.houses as Record<HouseStyle, { label: { ko: string; en: string }; a: string; b: string }>;

export function project(i: number, j: number): Point {
  return { x: ((i - j) * TILE) / 2, y: ((i + j) * TILE) / 4 };
}

/** Diamond outline of a ground tile (footprint) centred on (i, j), `size` tiles wide. */
export function tileDiamond(i: number, j: number, size = 1): Point[] {
  const h = size / 2;
  return [project(i - h, j - h), project(i + h, j - h), project(i + h, j + h), project(i - h, j + h)];
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
export function placeSprite(sprite: string, i: number, j: number, tiles = 1): Placed {
  const g = SPRITES[sprite];
  const ground = project(i, j);
  const size = (TILE * tiles) / g.tileWidth;
  return { x: ground.x - g.anchor[0] * size, y: ground.y - g.anchor[1] * size, width: size, height: size };
}

/** Tap polygon (sprite hull) in world coords; mirrored sprites flip around the anchor. */
export function spriteHull(sprite: string, i: number, j: number, tiles = 1, mirror = false): Point[] {
  const g = SPRITES[sprite];
  const r = placeSprite(sprite, i, j, tiles);
  const ax = r.x + g.anchor[0] * r.width;
  return g.hull.map(([u, v]) => {
    const x = r.x + u * r.width;
    return { x: mirror ? 2 * ax - x : x, y: r.y + v * r.height };
  });
}

export function facilitiesFor(houseCount: number): FacilityDef[] {
  return FACILITIES.filter((f) => houseCount >= f.minHouses);
}

/** Lots shown on the map: every lot of the village plus the next expansion's (locked). */
export function visibleLots(village: Pick<Village, "capacity" | "houses">): LotDef[] {
  const n = Math.min(village.capacity, MAX_CAPACITY);
  const extra = lockedSlots({ capacity: village.capacity } as Village);
  return LOTS.filter((l) => l.slot < n || extra.includes(l.slot));
}

/** Ground radius (tiles) that covers every visible lot with a margin. */
export function groundRadius(lots: LotDef[]): number {
  const outer = Math.max(0, ...lots.map((l) => l.ring));
  return RING_RADII[outer] + 2.2;
}

export type MapEntity =
  | { kind: "house"; slot: number; depth: number }
  | { kind: "lot"; slot: number; depth: number }
  | { kind: "facility"; facility: FacilityDef; depth: number };

/** Painter's order: back → front by ground depth (i + j), ties by x. */
export function mapOrder(village: Pick<Village, "capacity" | "houses">): MapEntity[] {
  const taken = new Set(village.houses.map((h) => h.slot));
  const items: Array<MapEntity & { x: number }> = [];
  for (const l of visibleLots(village)) {
    const d = l.at[0] + l.at[1];
    items.push({ kind: taken.has(l.slot) ? "house" : "lot", slot: l.slot, depth: d, x: l.at[0] - l.at[1] });
  }
  for (const f of facilitiesFor(village.houses.length)) {
    items.push({ kind: "facility", facility: f, depth: f.at[0] + f.at[1], x: f.at[0] - f.at[1] });
  }
  items.sort((a, b) => a.depth - b.depth || a.x - b.x);
  return items.map((e) => {
    const { x, ...rest } = e;
    void x;
    return rest as MapEntity;
  });
}

/** Camera that frames the visible lots (and the plaza) with room for roofs and name chips. */
export function lotsView(village: Pick<Village, "capacity" | "houses">): [number, number, number, number] {
  const lots = visibleLots(village);
  const ps = lots.map((l) => project(l.at[0], l.at[1]));
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  const pad = TILE * HOUSE_TILES * 0.6;
  const x0 = Math.min(...xs, -TILE * 2) - pad;
  const x1 = Math.max(...xs, TILE * 2) + pad;
  const y0 = Math.min(...ys, -TILE * 1.2) - TILE * HOUSE_TILES * 1.25; // roofs + name chips above the back lots
  const y1 = Math.max(...ys, TILE * 1.2) + TILE * 0.55;
  return [x0, y0, x1 - x0, y1 - y0];
}

/** World-space bounds of the ground disc of radius r (tiles) plus headroom for tall sprites. */
export function worldBounds(radius: number): { x: number; y: number; width: number; height: number } {
  // A ground circle of radius r (tiles) projects to an ellipse with half-axes r·√2·TILE/2 and r·√2·TILE/4.
  const w = (radius * TILE * Math.SQRT2) / 2;
  const h = (radius * TILE * Math.SQRT2) / 4;
  const top = h + TILE * 1.6; // houses and the cathedral rise above the ground
  return { x: -w, y: -top, width: 2 * w, height: top + h + TILE * 0.3 };
}
