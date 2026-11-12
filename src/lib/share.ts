import type { MapHouseArt } from "@/components/scene/VillageMapArt";
import { isFull, type DecorSpots, type PathStyle, type Village } from "@/lib/village";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

/**
 * Data allowed on the public share card: village size, house types/directions and completion only.
 * No photos, nicknames or messages (docs/09-decisions.md #8).
 */
export interface ShareCardData {
  openHalves: number;
  houses: MapHouseArt[];
  complete: boolean;
  pathStyle?: PathStyle;
  decor?: DecorSpots;
}

export function toShareCardData(village: Village): ShareCardData {
  return {
    openHalves: village.openHalves,
    houses: village.houses.map((h) => ({ slot: h.slot, style: h.style, direction: h.direction })),
    complete: isFull(village),
    pathStyle: village.pathStyle,
    decor: village.decor,
  };
}

/**
 * Village page path. The site is a static export, so the village id travels as a query
 * parameter (`/v/?id=…`) instead of a dynamic path segment.
 */
export function villagePath(villageId: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ id: villageId, ...extra });
  return `/v/?${params.toString()}`;
}

/** Invite link. `src` is a non-PII attribution token (FR09). */
export function inviteUrl(origin: string, villageId: string, src: "copy" | "share" = "copy"): string {
  return new URL(villagePath(villageId, { src: `invite_${src}` }), origin).toString();
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Web Share when available, otherwise clipboard copy. Outcome is an attempt, not delivery. */
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(data.url)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
