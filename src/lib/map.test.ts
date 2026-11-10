import { describe, expect, it } from "vitest";
import { FACILITIES, groundRadius, houseView, LOTS, mapOrder, RING_RADII, ringRadiusOf, SPRITES, visibleLots } from "./map";
import { HOUSE_STYLES, MAX_CAPACITY } from "./village";

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("expandable village map", () => {
  it("has 60 lots in rings, inner ring first", () => {
    expect(LOTS).toHaveLength(MAX_CAPACITY);
    expect(LOTS.map((l) => l.slot)).toEqual(LOTS.map((_, i) => i));
    for (let k = 1; k < LOTS.length; k++) expect(LOTS[k].ring).toBeGreaterThanOrEqual(LOTS[k - 1].ring);
  });

  it("keeps generous spacing: no two lots closer than 2 tiles", () => {
    let min = Infinity;
    for (const a of LOTS) for (const b of LOTS) if (a !== b) min = Math.min(min, dist(a.at, b.at));
    expect(min).toBeGreaterThanOrEqual(2);
  });

  it("keeps houses off the facilities (lot ≥ facility half-size + 0.8 tiles away)", () => {
    for (const lot of LOTS)
      for (const f of FACILITIES) expect(dist(lot.at, f.at)).toBeGreaterThan(f.tiles / 2 + 0.8);
  });

  it("spreads a free village's 6 lots around the plaza (every 60° sector at most 2)", () => {
    const angles = LOTS.slice(0, 6).map((l) => ((Math.atan2(l.at[1], l.at[0]) * 180) / Math.PI + 360) % 360);
    for (let s = 0; s < 360; s += 60) expect(angles.filter((a) => a >= s && a < s + 60).length).toBeLessThanOrEqual(2);
  });

  it("defaults doors toward the plaza", () => {
    for (const l of LOTS) {
      const v = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] }[l.facing]!;
      expect(-(v[0] * l.at[0] + v[1] * l.at[1])).toBeGreaterThan(0);
    }
  });

  it("shows the village's lots plus the next 3 (locked), and the ground covers them", () => {
    const lots = visibleLots({ capacity: 6, houses: [] });
    expect(lots.map((l) => l.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(visibleLots({ capacity: 60, houses: [] })).toHaveLength(60);
    const r = groundRadius(lots);
    for (const l of lots) expect(ringRadiusOf(l.at[0], l.at[1])).toBeLessThan(r - 1);
    expect(groundRadius(visibleLots({ capacity: 60, houses: [] }))).toBeGreaterThan(RING_RADII[2]);
  });

  it("unlocks facilities by house count and draws back to front", () => {
    const ids = (n: number) => mapOrder({ capacity: 60, houses: Array.from({ length: n }, (_, i) => ({ slot: i })) as never }).flatMap((e) => (e.kind === "facility" ? [e.facility.id] : []));
    expect(ids(0).sort()).toEqual(["cathedral", "tree"]);
    expect(ids(9)).toContain("rink");
    expect(ids(15)).toEqual(expect.arrayContaining(["santa", "rudolph", "rink", "sled", "snowfamily"]));
    const order = mapOrder({ capacity: 15, houses: [] });
    const depth = order.map((e) => e.depth);
    expect(depth).toEqual([...depth].sort((a, b) => a - b));
  });

  it("has a sprite for every house type and direction", () => {
    for (const style of HOUSE_STYLES)
      for (const d of [0, 1, 2, 3] as const) {
        const v = houseView(style, d);
        expect(SPRITES[v.sprite], `${style}/${d}`).toBeDefined();
        expect(v.mirror).toBe(d === 1 || d === 3);
      }
  });
});
