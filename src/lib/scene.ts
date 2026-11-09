/**
 * Fixed isometric scene geometry (2:1 projection, fixed camera, no zoom/pan).
 *
 * Coordinates are derived from the original schematic mockup
 * assets/mockups/village-concept.svg (900×900 canvas) and expressed in the
 * 1024×1024 world space required by docs/03-ui-ux.md.
 */

export const WORLD_SIZE = 1024;
const MOCKUP_SIZE = 900;
export const MOCKUP_TO_WORLD = WORLD_SIZE / MOCKUP_SIZE;

/** House sprite scale inside the mockup (`scale(.83)`). */
export const HOUSE_SCALE = 0.83;
/** House art bounds relative to its local origin (mockup units, before HOUSE_SCALE). */
export const HOUSE_LOCAL_BOUNDS = { minX: -64, maxX: 64, minY: -47, maxY: 90 } as const;
/** Ground-center anchor of the house footprint relative to the local origin. */
const HOUSE_GROUND_Y = 56;

export interface SlotDef {
  slot: number;
  /** Position name from the UI spec. */
  position: string;
  label: string;
  /** Local origin of the house sprite (mockup translate) in world coords. */
  origin: { x: number; y: number };
  /** Ground-center anchor in world coords (used for depth sorting). */
  anchor: { x: number; y: number };
  /** Hit box in world coords. */
  hit: { x: number; y: number; width: number; height: number };
}

const RAW_SLOTS: Array<[string, string, number, number]> = [
  ["rear-left", "뒤쪽 왼편", 335, 270],
  ["rear-right", "뒤쪽 오른편", 565, 270],
  ["left-upper", "왼쪽 위", 215, 390],
  ["right-upper", "오른쪽 위", 685, 390],
  ["left-lower", "왼쪽 아래", 215, 540],
  ["right-lower", "오른쪽 아래", 685, 540],
  ["front-left", "앞쪽 왼편", 335, 660],
  ["front-right", "앞쪽 오른편", 565, 660],
];

export const SLOTS: readonly SlotDef[] = RAW_SLOTS.map(([position, label, mx, my], slot) => {
  const k = MOCKUP_TO_WORLD;
  const s = HOUSE_SCALE;
  const b = HOUSE_LOCAL_BOUNDS;
  return {
    slot,
    position,
    label,
    origin: { x: mx * k, y: my * k },
    anchor: { x: mx * k, y: (my + HOUSE_GROUND_Y * s) * k },
    hit: {
      x: (mx + b.minX * s) * k,
      y: (my + b.minY * s) * k,
      width: (b.maxX - b.minX) * s * k,
      height: (b.maxY - b.minY) * s * k,
    },
  };
});

/** Central tree ground anchor (world coords) — trunk base in the mockup. */
export const TREE_ANCHOR = { x: 450 * MOCKUP_TO_WORLD, y: 544 * MOCKUP_TO_WORLD };

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

export const MIN_HIT_PX = 44;

/** Hit box expressed as CSS percentages of the square scene container. */
export function hitBoxPercent(slot: number) {
  const { hit } = SLOTS[slot];
  const pct = (v: number) => (v / WORLD_SIZE) * 100;
  return { left: pct(hit.x), top: pct(hit.y), width: pct(hit.width), height: pct(hit.height) };
}

/** Rendered hit size in CSS px for a given scene width (before the 44px min clamp). */
export function hitBoxPixels(slot: number, sceneWidthPx: number) {
  const { hit } = SLOTS[slot];
  const scale = sceneWidthPx / WORLD_SIZE;
  return { width: hit.width * scale, height: hit.height * scale };
}
