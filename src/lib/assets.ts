/**
 * Asset manifest. Production sprites are original art generated for this project
 * (assets/source/PROVENANCE.md); delivery files and their measured geometry are produced by
 * scripts/build_assets.py → public/assets + src/lib/asset-geometry.json (see src/lib/scene.ts).
 */
import { BACKGROUND_SRC, SPRITES } from "./scene";
import type { HouseStyle } from "./village";

export type AssetStatus = "placeholder-svg" | "production";

export interface AssetEntry {
  key: string;
  status: AssetStatus;
  src: string | null;
}

const prod = (key: string, src: string): AssetEntry => ({ key, status: "production", src });
const placeholder = (key: string): AssetEntry => ({ key, status: "placeholder-svg", src: null });

export const ASSET_MANIFEST = {
  background: prod("village/background_snow", BACKGROUND_SRC),
  houses: {
    wood: prod("houses/house_wood_lit", SPRITES.house_wood_lit.src),
    sage: prod("houses/house_sage_lit", SPRITES.house_sage_lit.src),
    indigo: prod("houses/house_indigo_lit", SPRITES.house_indigo_lit.src),
  } satisfies Record<HouseStyle, AssetEntry>,
  houseEmpty: prod("houses/house_empty", SPRITES.house_empty.src),
  tree: { base: prod("decor/tree_base", SPRITES.tree_base.src), complete: prod("decor/tree_complete", SPRITES.tree_complete.src) },
  /** Still inline SVG (components/house/Avatar.tsx, PhotoFrameSheet CSS frame). */
  avatars: placeholder("ui/avatar_default"),
  frame: placeholder("ui/frame_wood"),
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

/** Swatch colours for the three house styles (match the sprite colourways; used by the style picker and avatar). */
export const HOUSE_COLORS: Record<HouseStyle, HouseColors> = {
  wood: { wall: "#C88A56", wallLight: "#DBA576", roof: "#404F70", roofLight: "#627797" },
  sage: { wall: "#708B82", wallLight: "#93AAA2", roof: "#9A6440", roofLight: "#B98058" },
  indigo: { wall: "#4C5C80", wallLight: "#6A7BA0", roof: "#5E7A70", roofLight: "#7F998F" },
};
