import { describe, expect, it } from "vitest";
import { MILESTONES, nextMilestone } from "./milestones";

describe("decoration milestones", () => {
  it("are 4 sled, 6 snowman family, 8 aurora", () => {
    expect(MILESTONES.map((m) => [m.houses, m.label])).toEqual([
      [4, "선물 썰매"],
      [6, "눈사람 가족"],
      [8, "오로라 하늘"],
    ]);
  });
  it("points to the next reachable reward", () => {
    expect(nextMilestone(1, 6)).toEqual({ houses: 4, label: "선물 썰매", remaining: 3 });
    expect(nextMilestone(5, 6)).toMatchObject({ label: "눈사람 가족", remaining: 1 });
    expect(nextMilestone(6, 6)).toBeNull(); // aurora needs the big village
    expect(nextMilestone(6, 8)).toMatchObject({ label: "오로라 하늘", remaining: 2 });
    expect(nextMilestone(8, 8)).toBeNull();
  });
});
