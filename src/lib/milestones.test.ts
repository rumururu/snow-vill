import { describe, expect, it } from "vitest";
import { MILESTONES, nextMilestone } from "./milestones";

describe("milestones", () => {
  it("only the aurora is unlocked by house count (facilities come with districts)", () => {
    expect(MILESTONES).toEqual([{ houses: 18, label: "오로라 하늘" }]);
  });
  it("points to the aurora once the village has room for it", () => {
    expect(nextMilestone(5, 15)).toBeNull();
    expect(nextMilestone(10, 18)).toEqual({ houses: 18, label: "오로라 하늘", remaining: 8 });
    expect(nextMilestone(18, 60)).toBeNull();
  });
});
