import { describe, expect, it } from "vitest";
import { backgroundFor, hitBoxPercent, hitBoxPixels, pointInPolygon, PROPS, renderOrder, SLOTS, SPRITES, WORLD_SIZE } from "./scene";

describe("scene geometry", () => {
  it("has 8 deterministic slots inside the 1024 world", () => {
    expect(SLOTS).toHaveLength(8);
    expect(SLOTS.map((s) => s.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    for (const s of SLOTS) {
      expect(s.hit.x).toBeGreaterThanOrEqual(0);
      expect(s.hit.y).toBeGreaterThanOrEqual(0);
      expect(s.hit.x + s.hit.width).toBeLessThanOrEqual(WORLD_SIZE);
      expect(s.hit.y + s.hit.height).toBeLessThanOrEqual(WORLD_SIZE);
    }
  });

  it("tap regions are at least 44px at the 320px minimum width", () => {
    // 320px viewport minus the 4px page gutter on each side.
    for (const s of SLOTS) {
      const px = hitBoxPixels(s.slot, 312);
      expect(px.width).toBeGreaterThanOrEqual(44);
      expect(px.height).toBeGreaterThanOrEqual(44);
    }
  });

  it("every house keeps ≥ 60% of its tap region not covered by houses in front of it", () => {
    // DOM/paint order is slot order (back → front); sample the world on a 4px grid.
    for (const s of SLOTS) {
      let own = 0;
      let free = 0;
      for (let y = s.hit.y; y <= s.hit.y + s.hit.height; y += 4)
        for (let x = s.hit.x; x <= s.hit.x + s.hit.width; x += 4) {
          if (!pointInPolygon({ x, y }, s.hitPolygon)) continue;
          own++;
          if (!SLOTS.slice(s.slot + 1).some((f) => pointInPolygon({ x, y }, f.hitPolygon))) free++;
        }
      expect(free / own, `slot ${s.slot}`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("renders rear to front with the tree in the middle row", () => {
    const order = renderOrder();
    const depths = order.map((e) => e.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    const labels = order.map((e) => (e.kind === "tree" ? "tree" : e.kind === "house" ? e.slot : e.prop.sprite));
    expect(labels).toEqual([0, 1, 2, 3, "tree", 4, 5, 6, 7]);
  });

  it("free decorations unlock by house count: 4 sled, 6 snowman family, 8 aurora", () => {
    const props = (n: number) => renderOrder(n).flatMap((e) => (e.kind === "prop" ? [e.prop.sprite] : []));
    expect(props(3)).toEqual([]);
    expect(props(4)).toEqual(["decor_sled"]);
    expect(props(6).sort()).toEqual(["decor_sled", "decor_snowfamily"]);
    expect(backgroundFor(7)).toBe("base");
    expect(backgroundFor(8)).toBe("aurora");
    // Props stand in the open front area: in front of every house (painted after them).
    const order = renderOrder(8);
    const lastHouse = Math.max(...order.flatMap((e, i) => (e.kind === "house" ? [i] : [])));
    for (const p of PROPS) expect(order.findIndex((e) => e.kind === "prop" && e.prop === p)).toBeGreaterThan(lastHouse);
  });

  it("clip-path polygons and sprites come from measured geometry", () => {
    expect(hitBoxPercent(0).clipPath).toMatch(/^polygon\(/);
    for (const g of Object.values(SPRITES)) {
      expect(g.src).toMatch(/^\/assets\/.+\.webp$/);
      expect(g.hull.length).toBeGreaterThanOrEqual(6);
      expect(g.tileWidth).toBeGreaterThan(0.3);
    }
  });
});
