import { describe, expect, it } from "vitest";
import { DISTRICTS, facilitiesFor, forestFor, houseView, LOTS, mapOrder, PLAZA, pointInPolygon, SPRITES, villageShape, visibleLots } from "./map";
import { FREE_OPEN_HALVES, HOUSE_STYLES, MAX_CAPACITY, openNextHalf } from "./village";

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("district map", () => {
  it("has 10 districts × 6 lots; lot d*6+k belongs to district d (first half = nearer the plaza)", () => {
    expect(DISTRICTS).toHaveLength(10);
    expect(LOTS).toHaveLength(MAX_CAPACITY);
    for (const l of LOTS) {
      expect(l.district).toBe(Math.floor(l.slot / 6));
      expect(l.half).toBe(l.slot % 6 < 3 ? 0 : 1);
    }
    for (const d of DISTRICTS) {
      const [front, back] = [0, 1].map((h) => LOTS.filter((l) => l.district === d.index && l.half === h));
      const r = (l: (typeof LOTS)[number]) => Math.hypot(...l.at);
      const avg = (ls: typeof LOTS) => ls.reduce((a, l) => a + r(l), 0) / ls.length;
      expect(avg(front)).toBeLessThan(avg(back));
    }
  });

  it("keeps generous spacing: no two lots closer than 2.2 tiles; houses clear of landmarks", () => {
    let min = Infinity;
    for (const a of LOTS) for (const b of LOTS) if (a !== b) min = Math.min(min, dist(a.at, b.at));
    expect(min).toBeGreaterThanOrEqual(2.2);
    const facilities = [...PLAZA.filter((f) => !f.id.startsWith("plaza-")), ...DISTRICTS.flatMap((d) => (d.facility ? [d.facility] : []))];
    for (const lot of LOTS) for (const f of facilities) expect(dist(lot.at, f.at), `${lot.slot} vs ${f.id}`).toBeGreaterThan(f.tiles / 2 + 0.6);
  });

  it("defaults doors toward the district's centre (its facility)", () => {
    for (const l of LOTS) {
      const c = DISTRICTS[l.district].at;
      const v = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] }[l.facing]!;
      expect(v[0] * (c[0] - l.at[0]) + v[1] * (c[1] - l.at[1])).toBeGreaterThan(0);
    }
  });

  it("free village shows district 0 only; opening a district brings its lots and facility", () => {
    expect(visibleLots({ openHalves: FREE_OPEN_HALVES }).map((l) => l.slot)).toEqual([0, 1, 2, 3, 4, 5]);
    const ids = (open: number) =>
      facilitiesFor({ openHalves: open }).filter((f) => !f.id.includes("decor") && !f.id.startsWith("plaza-")).map((f) => f.sprite).sort();
    expect(ids(FREE_OPEN_HALVES)).toEqual(["decor_snowfamily", "landmark_cathedral", "tree_complete"]);
    const santaHalf = openNextHalf(FREE_OPEN_HALVES, 2)!;
    expect(visibleLots({ openHalves: santaHalf }).map((l) => l.slot)).toEqual([0, 1, 2, 3, 4, 5, 12, 13, 14]);
    expect(ids(santaHalf)).toContain("landmark_santa");
    const santaFull = openNextHalf(santaHalf, 2)!;
    expect(visibleLots({ openHalves: santaFull })).toHaveLength(12);
    expect(openNextHalf(santaFull, 2)).toBeNull();
  });

  it("keeps landmarks near house size (owner: landmarks were too big)", () => {
    for (const f of [...PLAZA, ...DISTRICTS.flatMap((d) => (d.facility ? [d.facility] : []))]) expect(f.tiles, f.sprite).toBeLessThanOrEqual(2.5);
  });

  it("is one shape: clears the forest inside the opened village, keeps it outside", () => {
    const closedAll = forestFor({ openHalves: 0 }).length;
    const free = forestFor({ openHalves: FREE_OPEN_HALVES });
    expect(free.length).toBeLessThan(closedAll);
    const shape = villageShape({ openHalves: FREE_OPEN_HALVES });
    for (const t of free) expect(pointInPolygon(t.at, shape)).toBe(false);
    for (const l of visibleLots({ openHalves: FREE_OPEN_HALVES })) expect(pointInPolygon(l.at, shape)).toBe(true);
    const grown = villageShape({ openHalves: openNextHalf(FREE_OPEN_HALVES, 1)! });
    for (const l of LOTS.filter((x) => x.district <= 1)) expect(pointInPolygon(l.at, grown)).toBe(true);
  });

  it("draws back to front", () => {
    const depth = mapOrder({ openHalves: (1 << 20) - 1, houses: [] }).map((e) => e.depth);
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
