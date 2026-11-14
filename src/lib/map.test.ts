import { describe, expect, it } from "vitest";
import { cameraView, decorSpotOk, DISTRICTS, FOREST, facilitiesFor, forestFor, groundAt, houseView, LOTS, mapOrder, MIN_VIEW_WIDTH, movableDecor, pathSteps, PLAZA, plazaFence, plazaShown, pointInPolygon, project, SPRITES, villageFence, villageShape, visibleLots } from "./map";
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
    // The free village is the first concept: houses around the Christmas tree, no cathedral yet.
    expect(ids(FREE_OPEN_HALVES)).toEqual(["tree_complete"]);
    const santaHalf = openNextHalf(FREE_OPEN_HALVES, 2)!;
    expect(visibleLots({ openHalves: santaHalf }).map((l) => l.slot)).toEqual([0, 1, 2, 3, 4, 5, 12, 13, 14]);
    expect(ids(santaHalf)).toEqual(["landmark_cathedral", "landmark_santa", "tree_complete", "tree_complete"]);
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

describe("free village = the first concept (owner 2026-11-12)", () => {
  const bigger = openNextHalf(FREE_OPEN_HALVES, 1)!;
  it("has no plaza until another district opens", () => {
    expect(plazaShown(FREE_OPEN_HALVES)).toBe(false);
    expect(plazaShown(1)).toBe(false);
    expect(plazaShown(bigger)).toBe(true);
    // the ground is district 0 alone: the plaza centre (0, 0) is outside it, then inside once expanded
    expect(pointInPolygon([0, 0], villageShape({ openHalves: FREE_OPEN_HALVES }))).toBe(false);
    expect(pointInPolygon([0, 0], villageShape({ openHalves: bigger }))).toBe(true);
  });
  it("forest fills the plaza site only while the plaza is not there", () => {
    const onPlaza = FOREST.filter((t) => t.plaza);
    expect(onPlaza.length).toBeGreaterThan(10);
    expect(forestFor({ openHalves: FREE_OPEN_HALVES }).filter((t) => t.plaza)).toHaveLength(onPlaza.length);
    expect(forestFor({ openHalves: bigger }).filter((t) => t.plaza)).toHaveLength(0);
  });
  it("is fenced all around with one opening at the front, inside its base", () => {
    const shape = villageShape({ openHalves: FREE_OPEN_HALVES });
    const runs = villageFence(shape);
    expect(runs).toHaveLength(1);
    expect(runs[0].length).toBeGreaterThan(30);
    for (const p of runs[0]) expect(pointInPolygon(p, shape)).toBe(true);
  });
  it("the free village fills the camera: at least MIN_VIEW_WIDTH across, no wider than the village needs", () => {
    expect(cameraView({ openHalves: FREE_OPEN_HALVES })[2]).toBeGreaterThanOrEqual(MIN_VIEW_WIDTH);
    expect(cameraView({ openHalves: FREE_OPEN_HALVES })[2]).toBeLessThan(1000);
  });
});

describe("village look (owner moves decorations, picks one path style)", () => {
  const all = { openHalves: (1 << 20) - 1 };
  it("every decoration's default spot passes the placement rule", () => {
    for (const open of [FREE_OPEN_HALVES, (1 << 20) - 1]) {
      const v = { openHalves: open };
      for (const f of movableDecor(v)) expect(decorSpotOk(v, f.id, f.at), f.id).toBe(true);
    }
  });
  it("only plaza lamps/bench and district decoration are movable (not the cathedral, tree or landmarks)", () => {
    const ids = movableDecor(all).map((f) => f.id);
    expect(ids).toContain("plaza-bench");
    expect(ids.some((id) => /^d\d-decor\d+$/.test(id))).toBe(true);
    expect(ids).not.toContain("cathedral");
    expect(ids).not.toContain("tree");
    expect(ids.some((id) => /^d\d$/.test(id))).toBe(false);
  });
  it("a moved decoration is drawn at its new spot", () => {
    const f = facilitiesFor({ openHalves: openNextHalf(FREE_OPEN_HALVES, 1)!, decor: { "plaza-bench": [1, 2.4], cathedral: [5, 5] } });
    expect(f.find((x) => x.id === "plaza-bench")!.at).toEqual([1, 2.4]);
    expect(f.find((x) => x.id === "cathedral")!.at).toEqual(PLAZA.find((x) => x.id === "cathedral")!.at);
  });
  it("blocks lots, paths, landmarks, the mound edge and the outside of the village", () => {
    const v = { openHalves: FREE_OPEN_HALVES };
    const d0 = DISTRICTS[0];
    const lot = LOTS[0].at;
    const id = movableDecor(v).find((f) => f.id.startsWith("d0-"))!.id;
    expect(decorSpotOk(v, id, lot)).toBe(false); // on a house lot
    expect(decorSpotOk(v, id, [d0.path[12][0], d0.path[12][1]])).toBe(false); // on the path
    expect(decorSpotOk(v, id, d0.at)).toBe(false); // on the landmark
    expect(decorSpotOk(v, id, [0, 0])).toBe(false); // district decor on the plaza mound
    expect(decorSpotOk(v, id, [-14, -14])).toBe(false); // outside the opened village
    expect(decorSpotOk(v, "plaza-bench", [-0.9, -0.9])).toBe(false); // on the cathedral
    expect(decorSpotOk(v, "plaza-bench", [9, 9])).toBe(false); // plaza decor off the plaza
    expect(decorSpotOk(v, "cathedral", [0.5, 2.5])).toBe(false); // not movable
  });
  it("ground point ↔ screen projection round-trips at any height", () => {
    for (const [i, j, z] of [[1.2, -3.4, 0], [-2, 5, 0.55]]) {
      const p = project(i, j, z);
      const [gi, gj] = groundAt(p.x, p.y, z);
      expect(gi).toBeCloseTo(i, 6);
      expect(gj).toBeCloseTo(j, 6);
    }
  });
  it("fence: walled front and sides only, broken where an opened path leaves; steps only there", () => {
    const runs = plazaFence([DISTRICTS[0].path]);
    const posts = runs.flat();
    expect(posts.length).toBeGreaterThan(10);
    for (const [i, j] of posts) expect(i + j).toBeGreaterThan(-3.5); // nothing far behind the mound
    expect(pathSteps(DISTRICTS[0].path).length).toBe(3); // front path: steps
    expect(pathSteps(DISTRICTS[1].path).length).toBe(0); // back path: down the slope
    expect(plazaFence([DISTRICTS[0].path, DISTRICTS[1].path]).length).toBeGreaterThanOrEqual(runs.length);
  });
});
