/**
 * Rewards. Facilities come with districts (opening the Santa district brings Santa's house, …);
 * the only house-count reward left is the aurora sky (map geometry: auroraMinHouses).
 */
import type { MessageKey } from "./i18n";
import { AURORA_MIN_HOUSES } from "./map";

export interface Milestone {
  houses: number;
  /** Reward name (message key; translate at the UI). */
  label: MessageKey;
}

export const MILESTONES: Milestone[] = [{ houses: AURORA_MIN_HOUSES, label: "milestone.aurora" }];

/** Next reward reachable in this village (the aurora needs room for 18 houses), or null. */
export function nextMilestone(houseCount: number, capacity: number): (Milestone & { remaining: number }) | null {
  const next = MILESTONES.find((m) => m.houses > houseCount && m.houses <= capacity);
  return next ? { ...next, remaining: next.houses - houseCount } : null;
}
