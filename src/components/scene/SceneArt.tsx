/**
 * Original placeholder scene art (inline SVG) derived from the schematic
 * mockup assets/mockups/village-concept.svg. Rendered in 1024×1024 world
 * space; each house is drawn individually so style and lit/empty state can
 * vary per slot. Replace with sprites from ASSET_MANIFEST in M1.
 *
 * This component never receives participant photos or names — it is shared by
 * the interactive scene and the photo-free share card.
 */
import { EMPTY_HOUSE_COLORS, HOUSE_COLORS, PALETTE } from "@/lib/assets";
import { HOUSE_SCALE, MOCKUP_TO_WORLD, renderOrder, SLOTS } from "@/lib/scene";
import type { HouseStyle } from "@/lib/village";

export interface SceneSlotArt {
  slot: number;
  /** null = unclaimed lot (lights off). */
  style: HouseStyle | null;
}

interface SceneArtProps {
  slots: SceneSlotArt[];
  complete?: boolean;
  /** Slot that should play the 0.6s illumination animation. */
  igniteSlot?: number | null;
  /** Unique prefix for SVG defs when several scenes are on one page. */
  idPrefix: string;
  className?: string;
  title?: string;
}

export function HouseSprite({ style, idPrefix, ignite }: { style: HouseStyle | null; idPrefix: string; ignite?: boolean }) {
  const c = style ? HOUSE_COLORS[style] : EMPTY_HOUSE_COLORS;
  const lit = style !== null;
  return (
    <g data-house-style={style ?? "empty"}>
      <ellipse cx="0" cy="64" rx="84" ry="20" fill="#8da49d" opacity=".25" filter={`url(#${idPrefix}-shadow)`} />
      {lit && (
        <ellipse
          className={ignite ? "sv-ignite" : undefined}
          cx="0"
          cy="58"
          rx="70"
          ry="26"
          fill={`url(#${idPrefix}-glow)`}
        />
      )}
      <path d="M-64-13 0-47 64-13 64 55 0 90-64 55Z" fill={c.wall} />
      <path d="M0-47 64-13 0 22Z" fill={c.roof} />
      <path d="M-64-13 0-47 0 22Z" fill={c.roofLight} />
      <path d="M-64-13 0 22 0 90-64 55Z" fill={c.wallLight} opacity=".7" />
      {/* door on left face, window on right face */}
      <path d="M-44 30-28 38-28 66-44 58Z" fill={lit ? "#7a5236" : "#b9bec2"} opacity={lit ? 0.85 : 0.7} />
      <path
        className={ignite ? "sv-ignite" : undefined}
        d="M15 29 44 14 44 42 15 57Z"
        fill={lit ? PALETTE.glow : "#A9BAC6"}
      />
      {lit && <path d="M29.5 21.5V49.5M15 43 44 28" stroke="#c4904a" strokeWidth="2.5" opacity=".7" />}
      {/* snow on roof ridge */}
      <path d="M-64-13 0 22 64-13" fill="none" stroke={PALETTE.ivory} strokeWidth="8" strokeLinecap="round" />
      <path d="M-64-13 0-47 64-13" fill="none" stroke={PALETTE.ivory} strokeWidth="5" strokeLinecap="round" opacity=".8" />
      {/* chimney */}
      <path d="M26-26 38-32 38-48 26-42Z" fill={lit ? c.wall : "#cfd4d6"} />
      <path d="M26-42 32-45 38-48 32-45Z" fill={PALETTE.ivory} />
    </g>
  );
}

function Tree({ complete, idPrefix }: { complete: boolean; idPrefix: string }) {
  return (
    <g data-tree={complete ? "complete" : "base"}>
      {complete && <circle cx="450" cy="420" r="150" fill={`url(#${idPrefix}-glow)`} opacity=".55" />}
      <path d="M450 295 517 455H383Z" fill="#708b82" />
      <path d="M450 337 504 486H396Z" fill="#557668" />
      <path d="M450 380 490 515H410Z" fill="#3d6558" />
      <rect x="440" y="510" width="20" height="34" fill="#a5754e" />
      <path
        d="m450 271 12 24 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4Z"
        fill={complete ? "#F4C77A" : PALETTE.glow}
        className={complete ? "sv-twinkle" : undefined}
      />
      <g fill={PALETTE.glow}>
        <circle cx="428" cy="394" r="7" />
        <circle cx="471" cy="437" r="8" />
        <circle cx="442" cy="476" r="7" />
        {complete && (
          <>
            <circle cx="466" cy="360" r="6" />
            <circle cx="418" cy="446" r="7" />
            <circle cx="480" cy="494" r="7" />
            <circle cx="452" cy="420" r="5" fill="#fff4d6" />
          </>
        )}
      </g>
    </g>
  );
}

export function SceneArt({ slots, complete = false, igniteSlot = null, idPrefix, className, title }: SceneArtProps) {
  const styleBySlot = new Map(slots.map((s) => [s.slot, s.style]));
  const k = MOCKUP_TO_WORLD;
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-label={title ?? "겨울 마을 장면"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${idPrefix}-sky`} x2="0" y2="1">
          <stop stopColor="#d9e7ee" />
          <stop offset="1" stopColor={PALETTE.ivory} />
        </linearGradient>
        <radialGradient id={`${idPrefix}-glow`}>
          <stop stopColor="#FFD58A" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFD58A" stopOpacity="0" />
        </radialGradient>
        <filter id={`${idPrefix}-shadow`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <rect width="1024" height="1024" fill={`url(#${idPrefix}-sky)`} />
      <g transform={`scale(${k})`}>
        <circle cx="750" cy="120" r="75" fill="#fffaf0" opacity=".8" />
        <path d="M450 110 820 450 450 790 80 450Z" fill="#e7f0ed" stroke="#b8d0ca" strokeWidth="7" />
        <path d="M450 165 770 450 450 730 130 450Z" fill={PALETTE.ivory} />
        <path d="M450 170V725M130 450H770" stroke="#d5c6a9" strokeWidth="36" strokeLinecap="round" />
        <path d="M450 170V725M130 450H770" stroke="#fff9eb" strokeWidth="26" strokeLinecap="round" />
        {renderOrder().map((e) => {
          if (e.kind === "tree") return <Tree key="tree" complete={complete} idPrefix={idPrefix} />;
          const def = SLOTS[e.slot];
          const style = styleBySlot.get(e.slot) ?? null;
          return (
            <g
              key={e.slot}
              data-slot={e.slot}
              transform={`translate(${def.origin.x / k} ${def.origin.y / k}) scale(${HOUSE_SCALE})`}
            >
              <HouseSprite style={style} idPrefix={idPrefix} ignite={igniteSlot === e.slot} />
            </g>
          );
        })}
        <g fill="#fff" opacity=".9">
          <circle cx="130" cy="180" r="5" />
          <circle cx="720" cy="225" r="6" />
          <circle cx="785" cy="610" r="5" />
          <circle cx="100" cy="650" r="6" />
          <circle cx="565" cy="130" r="5" />
          <circle cx="340" cy="800" r="5" />
        </g>
      </g>
    </svg>
  );
}
