"use client";

import { hitBoxPercent, MIN_HIT_PX, SLOTS, WORLD_SIZE } from "@/lib/scene";
import { houseAt, HOUSE_STYLE_LABEL, isFull, type Village } from "@/lib/village";
import { SceneArt } from "./SceneArt";
import { Snowfall } from "./Snowfall";

interface VillageSceneProps {
  village: Village;
  myHouseId?: string | null;
  igniteSlot?: number | null;
  /** When omitted the scene is decorative (no hotspots). */
  onSelectSlot?: (slot: number, trigger: HTMLButtonElement) => void;
  className?: string;
}

const pct = (v: number) => `${(v / WORLD_SIZE) * 100}%`;

export function VillageScene({ village, myHouseId, igniteSlot = null, onSelectSlot, className }: VillageSceneProps) {
  const slots = SLOTS.map((s) => ({ slot: s.slot, style: houseAt(village, s.slot)?.style ?? null }));
  const interactive = Boolean(onSelectSlot);

  return (
    <div className={`relative aspect-square w-full select-none overflow-hidden ${className ?? ""}`}>
      <SceneArt
        slots={slots}
        complete={isFull(village)}
        igniteSlot={igniteSlot}
        className="absolute inset-0 h-full w-full"
        title={`${village.name} 장면, 8채 중 ${village.houses.length}채에 불이 켜져 있어요`}
      />
      <Snowfall />
      {interactive && (
        <>
          {/* Tap regions follow each house's silhouette (clip-path); DOM order = back → front, so the
              front house wins where silhouettes overlap, matching what is drawn. */}
          <ul className="absolute inset-0" aria-label="마을의 집 8채">
            {SLOTS.map((def) => {
              const house = houseAt(village, def.slot);
              const box = hitBoxPercent(def.slot);
              const mine = Boolean(house && myHouseId && house.id === myHouseId);
              const label = house
                ? `${def.slot + 1}번 집, ${house.nickname}의 작은 집 (${HOUSE_STYLE_LABEL[house.style]})${mine ? ", 내 집" : ""} 열기`
                : `${def.slot + 1}번 빈 집터 (${def.label}), 내 집 만들기`;
              return (
                <li key={def.slot}>
                  <button
                    type="button"
                    data-slot={def.slot}
                    data-state={house ? "occupied" : "empty"}
                    aria-label={label}
                    onClick={(e) => onSelectSlot?.(def.slot, e.currentTarget)}
                    className="peer absolute outline-none transition-[filter] hover:brightness-110 focus-visible:bg-white/25 motion-reduce:transition-none"
                    style={{
                      left: `${box.left}%`,
                      top: `${box.top}%`,
                      width: `max(${MIN_HIT_PX}px, ${box.width}%)`,
                      height: `max(${MIN_HIT_PX}px, ${box.height}%)`,
                      clipPath: box.clipPath,
                    }}
                  />
                </li>
              );
            })}
          </ul>
          {/* Labels and "+" markers: visual only, never intercept taps. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {SLOTS.map((def) => {
              const house = houseAt(village, def.slot);
              const mine = Boolean(house && myHouseId && house.id === myHouseId);
              return house ? (
                <span
                  key={def.slot}
                  className={`absolute max-w-[7.5rem] -translate-x-1/2 -translate-y-1/2 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight shadow-sm min-[400px]:text-[11px] ${
                    mine ? "bg-night text-ivory" : "bg-ivory/95 text-night"
                  }`}
                  // On the house's own roof: never covered by houses in front, never covers the tree.
                  style={{ left: pct(def.anchor.x), top: pct(def.hit.y + def.hit.height * 0.24) }}
                >
                  {mine ? `내 집 · ${house.nickname}` : house.nickname}
                </span>
              ) : (
                <span
                  key={def.slot}
                  className="absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory/90 text-sm font-bold leading-none text-sage shadow ring-1 ring-white/70"
                  style={{ left: pct(def.anchor.x), top: pct(def.hit.y + def.hit.height * 0.24) }}
                >
                  +
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
