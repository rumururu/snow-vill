import { useId } from "react";
import { HouseSprite } from "@/components/scene/SceneArt";
import type { HouseStyle } from "@/lib/village";

/** Single house sprite on a small snowy plot, used in the claim sheet preview. */
export function HousePreview({ style, className }: { style: HouseStyle | null; className?: string }) {
  const id = `hp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="-110 -80 220 200" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#FFD58A" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFD58A" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <path d="M0 20 105 70 0 120-105 70Z" fill="#F6F0E4" />
      <HouseSprite style={style} idPrefix={id} />
    </svg>
  );
}
