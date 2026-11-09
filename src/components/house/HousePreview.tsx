import { houseSprite } from "@/components/scene/SceneArt";
import type { HouseStyle } from "@/lib/village";

/** Single house sprite (selected style, lit) used in the claim sheet preview. */
export function HousePreview({ style, className }: { style: HouseStyle | null; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized WebP sprite
  return <img src={houseSprite(style).src} alt="" aria-hidden className={`object-contain ${className ?? ""}`} />;
}
