import { describe, expect, it } from "vitest";
import { MILESTONES, nextMilestone } from "./milestones";

describe("facility milestones", () => {
  it("unlock by house count: 4 sled, 6 snowman family, 9 rink, 12 Santa, 15 Rudolph, 18 aurora", () => {
    expect(MILESTONES.map((m) => [m.houses, m.label])).toEqual([
      [4, "선물 썰매"],
      [6, "눈사람 가족"],
      [9, "아이스링크"],
      [12, "산타의 집"],
      [15, "루돌프 동상"],
      [18, "오로라 하늘"],
    ]);
  });
  it("points to the next reward the village can reach at its size", () => {
    expect(nextMilestone(1, 6)).toEqual({ houses: 4, label: "선물 썰매", remaining: 3 });
    expect(nextMilestone(5, 6)).toMatchObject({ label: "눈사람 가족", remaining: 1 });
    expect(nextMilestone(6, 6)).toBeNull(); // the rink needs a 9-house village
    expect(nextMilestone(6, 9)).toMatchObject({ label: "아이스링크", remaining: 3 });
    expect(nextMilestone(18, 60)).toBeNull();
  });
});
