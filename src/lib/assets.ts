/**
 * Asset manifest. M0 renders original inline SVG placeholders (see
 * components/scene/*). Each entry names the production sprite from
 * docs/05-art-direction.md that will replace it in M1 — swap `src` from
 * null to the delivered WebP path without touching scene logic.
 */
import type { HouseStyle } from "./village";

export type AssetStatus = "placeholder-svg" | "production";

export interface AssetEntry {
  key: string;
  status: AssetStatus;
  /** Production file path (public/) once delivered; null while placeholder. */
  src: string | null;
  size: string;
}

const placeholder = (key: string, size: string): AssetEntry => ({ key, status: "placeholder-svg", src: null, size });

export const ASSET_MANIFEST = {
  background: placeholder("village/background_snow.webp", "1536×1536"),
  houses: {
    wood: { empty: placeholder("houses/house_wood_empty.webp", "512×512"), lit: placeholder("houses/house_wood_lit.webp", "512×512") },
    sage: { empty: placeholder("houses/house_sage_empty.webp", "512×512"), lit: placeholder("houses/house_sage_lit.webp", "512×512") },
    indigo: { empty: placeholder("houses/house_indigo_empty.webp", "512×512"), lit: placeholder("houses/house_indigo_lit.webp", "512×512") },
  } satisfies Record<HouseStyle, { empty: AssetEntry; lit: AssetEntry }>,
  tree: { base: placeholder("decorations/tree_base.webp", "512×512"), complete: placeholder("decorations/tree_complete.webp", "512×512") },
  frame: placeholder("ui/frame_wood.webp", "512×512"),
  avatars: [placeholder("ui/avatar_default_1.webp", "256×256"), placeholder("ui/avatar_default_2.webp", "256×256"), placeholder("ui/avatar_default_3.webp", "256×256")],
  shareBackground: placeholder("marketing/share_background.webp", "1080×1350"),
} as const;

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

/** Placeholder colorways for the three house styles. */
export const HOUSE_COLORS: Record<HouseStyle, HouseColors> = {
  wood: { wall: "#C88A56", wallLight: "#DBA576", roof: "#404F70", roofLight: "#627797" },
  sage: { wall: "#708B82", wallLight: "#93AAA2", roof: "#9A6440", roofLight: "#B98058" },
  indigo: { wall: "#4C5C80", wallLight: "#6A7BA0", roof: "#5E7A70", roofLight: "#7F998F" },
};

/** Unclaimed lot: frosted, lights off. */
export const EMPTY_HOUSE_COLORS: HouseColors = {
  wall: "#D6D9DA",
  wallLight: "#E6E8E7",
  roof: "#B7C3CE",
  roofLight: "#C9D3DC",
};
