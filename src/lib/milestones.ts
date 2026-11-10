/**
 * Free facilities unlocked by house count (owner decisions 2026-11-10). Thresholds come from the map
 * geometry (scripts/build_village.py FACILITIES) so web, app and art stay in sync.
 */
import { AURORA_MIN_HOUSES, FACILITIES } from "./map";

export interface Milestone {
  houses: number;
  label: string;
}

const LABELS: Record<string, string> = {
  sled: "선물 썰매",
  snowfamily: "눈사람 가족",
  rink: "아이스링크",
  santa: "산타의 집",
  rudolph: "루돌프 동상",
};

export const MILESTONES: Milestone[] = [
  ...FACILITIES.filter((f) => f.minHouses > 0).map((f) => ({ houses: f.minHouses, label: LABELS[f.id] ?? f.id })),
  { houses: AURORA_MIN_HOUSES, label: "오로라 하늘" },
].sort((a, b) => a.houses - b.houses);

/** Next reward reachable in this village (bigger rewards need a bigger village), or null. */
export function nextMilestone(houseCount: number, capacity: number): (Milestone & { remaining: number }) | null {
  const next = MILESTONES.find((m) => m.houses > houseCount && m.houses <= capacity);
  return next ? { ...next, remaining: next.houses - houseCount } : null;
}
