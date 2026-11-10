import { houseView, SPRITES } from "@/lib/map";
import type { Direction, HouseStyle } from "@/lib/village";

/** One house sprite in the chosen type and door direction (claim sheet preview, pickers). */
export function HousePreview({ style, direction = 0, className }: { style: HouseStyle; direction?: Direction; className?: string }) {
  const v = houseView(style, direction);
  // eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized WebP sprite
  return <img src={SPRITES[v.sprite].src} alt="" aria-hidden className={`object-contain ${v.mirror ? "-scale-x-100" : ""} ${className ?? ""}`} />;
}
