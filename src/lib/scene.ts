/**
 * Fixed isometric scene geometry (2:1 projection, fixed camera, no zoom/pan).
 *
 * World space is 1024×1024 = the background image. Houses sit on a 3×3 isometric grid whose
 * centre cell holds the tree. Every number comes from src/lib/asset-geometry.json, which
 * scripts/build_assets.py measures from the source art's alpha channel.
 */
import geometry from "./asset-geometry.json";

export const WORLD_SIZE = 1024;
export const MIN_HIT_PX = 44;

type SpriteName = keyof typeof geometry.sprites;
export interface SpriteGeometry {
  src: string;
  anchor: number[];
  tileWidth: number;
  bbox: number[];
  hull: number[][];
}
export const SPRITES = geometry.sprites as Record<SpriteName, SpriteGeometry>;
export const BACKGROUND_SRC = geometry.background.src;
const L = geometry.layout;

export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ground point (tile centre) of grid cell (i, j), i/j ∈ {-1, 0, 1}. */
function cellCenter(i: number, j: number): Point {
  return {
    x: (L.center[0] + (i - j) * L.spacing) * WORLD_SIZE,
    y: (L.center[1] + ((i + j) * L.spacing) / 2) * WORLD_SIZE,
  };
}

const TILE_WORLD = L.tileWidth * WORLD_SIZE;

/** Where a sprite is drawn so that its measured tile anchor lands on `ground`. */
export function spriteRect(name: SpriteName, ground: Point, tileWorld = TILE_WORLD): Rect {
  const g = SPRITES[name];
  const size = tileWorld / g.tileWidth;
  return { x: ground.x - g.anchor[0] * size, y: ground.y - g.anchor[1] * size, width: size, height: size };
}

export interface SlotDef {
  slot: number;
  /** Position name (back → front). */
  position: string;
  label: string;
  cell: [number, number];
  /** Ground anchor (tile centre) in world coords. */
  anchor: Point;
  /** Tap region: the house silhouette's convex hull, world coords. */
  hitPolygon: Point[];
  /** Bounding box of hitPolygon, world coords. */
  hit: Rect;
}

// Slot order is back → front (then left → right), which is also the painter's order.
const CELLS: Array<[number, number, string, string]> = [
  [-1, -1, "rear", "뒤쪽 가운데"],
  [-1, 0, "rear-left", "뒤쪽 왼편"],
  [0, -1, "rear-right", "뒤쪽 오른편"],
  [-1, 1, "left", "왼쪽"],
  [1, -1, "right", "오른쪽"],
  [0, 1, "front-left", "앞쪽 왼편"],
  [1, 0, "front-right", "앞쪽 오른편"],
  [1, 1, "front", "앞쪽 가운데"],
];

/** Reference house geometry for tap regions (all house sprites share the master's silhouette). */
const HIT_SPRITE: SpriteName = "house_wood_lit";

export const SLOTS: readonly SlotDef[] = CELLS.map(([i, j, position, label], slot) => {
  const anchor = cellCenter(i, j);
  const rect = spriteRect(HIT_SPRITE, anchor);
  const hitPolygon = SPRITES[HIT_SPRITE].hull.map(([u, v]) => ({ x: rect.x + u * rect.width, y: rect.y + v * rect.height }));
  const xs = hitPolygon.map((p) => p.x);
  const ys = hitPolygon.map((p) => p.y);
  const hit = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return { slot, position, label, cell: [i, j], anchor, hitPolygon, hit };
});

/** Tree ground anchor (centre cell) and its tile size. */
export const TREE_ANCHOR = cellCenter(0, 0);
export const TREE_TILE_WORLD = TILE_WORLD * L.treeScale;

export type SceneEntity = { kind: "house"; slot: number; depth: number } | { kind: "tree"; depth: number };

/** Painter's order: rear → front by ground anchor y, ties broken by x. */
export function renderOrder(): SceneEntity[] {
  const items: Array<SceneEntity & { x: number }> = [
    ...SLOTS.map((s) => ({ kind: "house" as const, slot: s.slot, depth: s.anchor.y, x: s.anchor.x })),
    { kind: "tree" as const, depth: TREE_ANCHOR.y, x: TREE_ANCHOR.x },
  ];
  items.sort((a, b) => a.depth - b.depth || a.x - b.x);
  return items.map((item) =>
    item.kind === "tree" ? { kind: "tree", depth: item.depth } : { kind: "house", slot: item.slot, depth: item.depth },
  );
}

/** Hit box as CSS percentages of the square scene, plus the polygon relative to that box (for clip-path). */
export function hitBoxPercent(slot: number) {
  const { hit, hitPolygon } = SLOTS[slot];
  const pct = (v: number) => (v / WORLD_SIZE) * 100;
  const clip = hitPolygon
    .map((p) => `${(((p.x - hit.x) / hit.width) * 100).toFixed(2)}% ${(((p.y - hit.y) / hit.height) * 100).toFixed(2)}%`)
    .join(", ");
  return { left: pct(hit.x), top: pct(hit.y), width: pct(hit.width), height: pct(hit.height), clipPath: `polygon(${clip})` };
}

/** Rendered hit size in CSS px for a given scene width. */
export function hitBoxPixels(slot: number, sceneWidthPx: number) {
  const { hit } = SLOTS[slot];
  const scale = sceneWidthPx / WORLD_SIZE;
  return { width: hit.width * scale, height: hit.height * scale };
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
