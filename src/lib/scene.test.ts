import { describe, expect, it } from "vitest";
import { hitBoxPixels, renderOrder, SLOTS, WORLD_SIZE } from "./scene";

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

  it("hit boxes do not overlap each other", () => {
    for (const a of SLOTS)
      for (const b of SLOTS) {
        if (a.slot >= b.slot) continue;
        const overlap =
          a.hit.x < b.hit.x + b.hit.width &&
          b.hit.x < a.hit.x + a.hit.width &&
          a.hit.y < b.hit.y + b.hit.height &&
          b.hit.y < a.hit.y + a.hit.height;
        expect(overlap, `slots ${a.slot} and ${b.slot}`).toBe(false);
      }
  });

  it("raw hit boxes are at least 44px at the 390px reference width", () => {
    // The scene spans the full width minus small gutters on a 390px screen.
    for (const s of SLOTS) {
      const px = hitBoxPixels(s.slot, 382);
      expect(px.width).toBeGreaterThanOrEqual(44);
      expect(px.height).toBeGreaterThanOrEqual(44);
    }
  });

  it("renders rear to front with the tree between the middle rows", () => {
    const order = renderOrder();
    const depths = order.map((e) => e.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    const labels = order.map((e) => (e.kind === "tree" ? "tree" : e.slot));
    expect(labels).toEqual([0, 1, 2, 3, "tree", 4, 5, 6, 7]);
  });
});
