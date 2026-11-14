/**
 * Colour tokens. Production sprites and their geometry live in src/lib/map.ts
 * (scripts/build_village.py → public/assets/v2 + src/lib/village-geometry.json; provenance in assets/source/PROVENANCE.md).
 */
import type { HouseStyle } from "./village";

/** Palette tokens (docs/03-ui-ux.md). */
export const PALETTE = {
  ivory: "#F6F0E4",
  sage: "#708B82",
  indigo: "#404F70",
  wood: "#C88A56",
  glow: "#E7B66B",
  sky: "#EAF1F5",
} as const;

export interface HouseColors {
  wall: string;
  wallLight: string;
  roof: string;
  roofLight: string;
}

/** Two colours per house type (wall, roof) for the fallback avatar's hat. */
const C = (wall: string, roof: string): HouseColors => ({ wall, wallLight: wall, roof, roofLight: roof });
export const HOUSE_COLORS: Record<HouseStyle, HouseColors> = {
  wood: C("#C88A56", "#404F70"),
  brick: C("#B4533F", "#4A5368"),
  bakery: C("#E9D9B8", "#C2453B"),
  tower: C("#D9CFC0", "#3F7A6C"),
  gingerbread: C("#C27A3E", "#F4EDE2"),
  timber: C("#EFE7DA", "#5B3A28"),
  aframe: C("#9A6440", "#4D5566"),
  windmill: C("#CBBFAE", "#C0563F"),
  greenhouse: C("#8FB0D4", "#F4EDE2"),
  sage: C("#708B82", "#9A6440"),
  indigo: C("#4C5C80", "#5E7A70"),
};
