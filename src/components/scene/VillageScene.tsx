"use client";

import { useId } from "react";
import { hitBoxPercent, MIN_HIT_PX, SLOTS } from "@/lib/scene";
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

export function VillageScene({ village, myHouseId, igniteSlot = null, onSelectSlot, className }: VillageSceneProps) {
  const rawId = useId();
  const idPrefix = `sv${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const slots = SLOTS.map((s) => ({ slot: s.slot, style: houseAt(village, s.slot)?.style ?? null }));
  const interactive = Boolean(onSelectSlot);

  return (
    <div className={`relative aspect-square w-full select-none overflow-hidden ${className ?? ""}`}>
      <SceneArt
        slots={slots}
        complete={isFull(village)}
        igniteSlot={igniteSlot}
        idPrefix={idPrefix}
        className="absolute inset-0 h-full w-full"
        title={`${village.name} 장면, 8채 중 ${village.houses.length}채에 불이 켜져 있어요`}
      />
      <Snowfall />
      {interactive && (
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
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-end justify-center rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-night/70"
                  style={{
                    left: `${box.left + box.width / 2}%`,
                    top: `${box.top + box.height / 2}%`,
                    width: `max(${MIN_HIT_PX}px, ${box.width}%)`,
                    height: `max(${MIN_HIT_PX}px, ${box.height}%)`,
                  }}
                >
                  {house ? (
                    <span
                      className={`pointer-events-none absolute left-1/2 top-[86%] max-w-[7.5rem] -translate-x-1/2 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight shadow-sm min-[400px]:text-[11px] ${
                        mine ? "bg-night text-ivory" : "bg-ivory/95 text-night"
                      }`}
                    >
                      {mine ? `내 집 · ${house.nickname}` : house.nickname}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="pointer-events-none mb-[30%] grid h-6 w-6 place-items-center rounded-full bg-ivory/90 text-base font-bold text-sage shadow-sm transition-transform group-hover:scale-110 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
