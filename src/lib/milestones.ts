/**
 * Rewards. Facilities come with districts (opening the Santa district brings Santa's house, …);
 * the only house-count reward left is the aurora sky (map geometry: auroraMinHouses).
 */
import { AURORA_MIN_HOUSES } from "./map";

export interface Milestone {
  houses: number;
  label: string;
}

export const MILESTONES: Milestone[] = [{ houses: AURORA_MIN_HOUSES, label: "오로라 하늘" }];

/** Next reward reachable in this village (the aurora needs room for 18 houses), or null. */
export function nextMilestone(houseCount: number, capacity: number): (Milestone & { remaining: number }) | null {
  const next = MILESTONES.find((m) => m.houses > houseCount && m.houses <= capacity);
  return next ? { ...next, remaining: next.houses - houseCount } : null;
}
