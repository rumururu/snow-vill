/**
 * Free decorations unlocked by house count (owner decision 2026-11-10). Thresholds come from the
 * asset geometry (scripts/build_assets.py DECOR) so web, app and art stay in sync.
 */
import { AURORA_MIN_HOUSES, PROPS } from "./scene";

export interface Milestone {
  houses: number;
  label: string;
}

const LABELS: Record<string, string> = { decor_sled: "선물 썰매", decor_snowfamily: "눈사람 가족" };

export const MILESTONES: Milestone[] = [
  ...PROPS.map((p) => ({ houses: p.minHouses, label: LABELS[p.sprite] ?? p.sprite })),
  { houses: AURORA_MIN_HOUSES, label: "오로라 하늘" },
].sort((a, b) => a.houses - b.houses);

/** Next reward reachable in this village (aurora needs a big village), or null. */
export function nextMilestone(houseCount: number, capacity: number): (Milestone & { remaining: number }) | null {
  const next = MILESTONES.find((m) => m.houses > houseCount && m.houses <= capacity);
  return next ? { ...next, remaining: next.houses - houseCount } : null;
}
