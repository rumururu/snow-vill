/**
 * Village map (docs/11-village-expansion-plan.md): fenced snowy plots laid edge to edge — the cathedral
 * plaza plot in the middle and up to 10 district plots ("동네") of 6 lots around it. All numbers come from
 * src/lib/village-geometry.json, written by scripts/build_village.py and shared with the Flutter app.
 *
 * World units: one ground tile is TILE wide on screen. Ground point (i, j) in tile units projects to
 *   x = (i - j) * TILE / 2,  y = (i + j) * TILE / 4      (2:1 isometric, plaza centre at 0,0)
 */
import geo from "./village-geometry.json";
import type { Direction, HouseStyle, Village } from "./village";
import { districtState, isHalfOpen } from "./village";

export const TILE = 100;
/** On-screen house size in tiles (lots are ≥ 2.25 tiles apart, so houses keep a gap). */
export const HOUSE_TILES = 1.7;
export const GROUND_ASPECT: number = geo.groundAspect;
/** Plot width in ground tiles (the fenced diamond). */
export const PLOT_TILES: number = geo.plotTiles;
export const PLAZA_PLOT: string = geo.plazaPlot;
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
  /** Canvas height / width (1 for square sprites, 0.5 for plots). */
  aspect?: number;
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
  /** Door direction that faces the plaza (default in the claim sheet). */
  facing: Direction;
}
export const LOTS: readonly LotDef[] = (geo.lots as Array<{ slot: number; district: number; half: number; at: number[]; facing: number }>).map((l) => ({
  slot: l.slot,
  district: l.district,
  half: l.half as 0 | 1,
  at: [l.at[0], l.at[1]],
  facing: l.facing as Direction,
}));

export interface FacilityDef {
  id: string;
  sprite: string;
  at: [number, number];
  tiles: number;
}
export interface DistrictDef {
  index: number;
  id: string;
  name: { ko: string; en: string };
  /** Plot centre (ground tiles). */
  at: [number, number];
  /** Plot art (fenced diamond). */
  plot: string;
  facility: FacilityDef | null;
}
export const DISTRICTS: readonly DistrictDef[] = (
  geo.districts as Array<{ index: number; id: string; name: { ko: string; en: string }; at: number[]; plot: string;
    facility: { sprite: string; at: number[]; tiles: number } | null }>
).map((d) => ({
  index: d.index,
  id: d.id,
  name: d.name,
  at: [d.at[0], d.at[1]],
  plot: d.plot,
  facility: d.facility ? { id: `d${d.index}`, sprite: d.facility.sprite, at: [d.facility.at[0], d.facility.at[1]], tiles: d.facility.tiles } : null,
}));
export const PLAZA: readonly FacilityDef[] = (geo.plaza as Array<{ id: string; sprite: string; at: number[]; tiles: number }>).map((f) => ({
  ...f,
  at: [f.at[0], f.at[1]] as [number, number],
}));

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
  const width = (TILE * tiles) / g.tileWidth;
  const height = width * (g.aspect ?? 1);
  return { x: ground.x - g.anchor[0] * width, y: ground.y - g.anchor[1] * height, width, height };
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

type MapVillage = Pick<Village, "openHalves" | "houses">;

/** Lots that exist in the village (opened halves). */
export function visibleLots(village: Pick<Village, "openHalves">): LotDef[] {
  return LOTS.filter((l) => isHalfOpen(village.openHalves, l.slot));
}

/** Plaza facilities plus the facility of every district that has at least one opened half. */
export function facilitiesFor(village: Pick<Village, "openHalves">): FacilityDef[] {
  const out = [...PLAZA];
  for (const d of DISTRICTS) if (d.facility && districtState(village.openHalves, d.index) > 0) out.push(d.facility);
  return out;
}

export type MapEntity =
  | { kind: "house"; slot: number; depth: number }
  | { kind: "lot"; slot: number; depth: number }
  | { kind: "facility"; facility: FacilityDef; depth: number };

/** Painter's order: back → front by ground depth (i + j), ties by x. */
export function mapOrder(village: MapVillage): MapEntity[] {
  const taken = new Set(village.houses.map((h) => h.slot));
  const items: Array<{ e: MapEntity; x: number }> = [];
  for (const l of visibleLots(village)) {
    items.push({ e: { kind: taken.has(l.slot) ? "house" : "lot", slot: l.slot, depth: l.at[0] + l.at[1] }, x: l.at[0] - l.at[1] });
  }
  for (const f of facilitiesFor(village)) items.push({ e: { kind: "facility", facility: f, depth: f.at[0] + f.at[1] }, x: f.at[0] - f.at[1] });
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

/** Corners of a plot's fenced diamond (world). */
export function plotDiamond(at: [number, number]): Point[] {
  return tileDiamond(at[0], at[1], PLOT_TILES);
}

/** Camera that frames the plaza and every opened district, with room for roofs and name chips. */
export function lotsView(village: Pick<Village, "openHalves">): [number, number, number, number] {
  const pts: Point[] = plotDiamond([0, 0]);
  for (const d of DISTRICTS) if (districtState(village.openHalves, d.index) > 0) pts.push(...plotDiamond(d.at));
  return bounds(pts, TILE * 0.3, TILE * HOUSE_TILES * 0.9, TILE * 0.6);
}

/** Camera that shows the whole possible village (all 10 districts), for zooming out. */
export function fullView(): [number, number, number, number] {
  return bounds(DISTRICTS.flatMap((d) => plotDiamond(d.at)), TILE * 0.3, TILE * HOUSE_TILES * 0.9, TILE * 0.6);
}
