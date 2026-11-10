"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DISTRICTS } from "@/lib/map";
import { districtState, EXPANSION_STEP, MAX_CAPACITY, stepTier, TIER_PRICE_KRW, type Village } from "@/lib/village";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

const FACILITY_LABEL: Record<string, string> = {
  decor_snowfamily: "눈사람 가족",
  landmark_rink: "아이스링크",
  landmark_santa: "산타의 집",
  landmark_rudolph: "루돌프 동상",
  decor_sled: "선물 썰매",
  prop_pines: "전나무 숲",
  prop_lamp: "가로등 길",
};

/**
 * "마을 넓히기": each paid step (in the app) opens 3 lots — the next half of a district the buyer picks.
 * Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → then ₩25,800 per step, up to 60.
 */
export function UpgradeSheet({
  village,
  open,
  district,
  simulated,
  onClose,
  onSimulatedUpgrade,
}: {
  village: Village;
  open: boolean;
  /** District pre-selected from the map (tap on a closed district), or null. */
  district: number | null;
  simulated: boolean;
  onClose: () => void;
  onSimulatedUpgrade: (district: number) => void;
}) {
  const tier = stepTier(village.capacity);
  const choices = DISTRICTS.filter((d) => districtState(village.openHalves, d.index) < 2);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? district ?? choices.find((d) => districtState(village.openHalves, d.index) === 1)?.index ?? choices[0]?.index ?? null;
  const sel = selected !== null ? DISTRICTS[selected] : null;
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="마을 넓히기"
      footer={
        tier === 0 || !sel ? (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">이미 가장 큰 마을({MAX_CAPACITY}채)이에요</p>
        ) : simulated ? (
          <button type="button" onClick={() => (setPicked(null), onSimulatedUpgrade(sel.index))} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
            {sel.name.ko} 열기 (시뮬레이션)
          </button>
        ) : (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">
            Snow Village 앱에서 {won(TIER_PRICE_KRW[tier])}에 {sel.name.ko}를 열 수 있어요
          </p>
        )
      }
    >
      <div className="space-y-3 text-[15px] leading-relaxed text-night">
        <p>
          <b>{village.name}</b>은(는) 지금 집 {village.capacity}채 마을이에요. 동네를 고르면 집터 {EXPANSION_STEP}곳이 열려요 (한 동네는 6채, 두 번에 걸쳐 열려요).
        </p>
        {tier > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">열 동네</legend>
            <div className="grid grid-cols-2 gap-2">
              {choices.map((d) => {
                const half = districtState(village.openHalves, d.index) === 1;
                const fac = d.facility ? FACILITY_LABEL[d.facility.sprite] : null;
                return (
                  <label
                    key={d.index}
                    className="flex cursor-pointer flex-col rounded-xl border-2 border-transparent bg-white px-3 py-2 text-sm has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
                  >
                    <input type="radio" name="district" value={d.index} checked={selected === d.index} onChange={() => setPicked(d.index)} className="sr-only" />
                    <span className="font-semibold">{d.name.ko}</span>
                    <span className="text-xs text-night/65">
                      {half ? "반쯤 열림 · 나머지 3채" : "새 동네 · 3채"}
                      {fac && !half ? ` · ${fac}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="text-xs text-night/65">
          무료 6채 → 9채 {won(TIER_PRICE_KRW[1])} → 12채 {won(TIER_PRICE_KRW[2])} → 15채 {won(TIER_PRICE_KRW[3])} → 그 뒤 3채마다 {won(TIER_PRICE_KRW[4])} (최대 {MAX_CAPACITY}채).
          마을 주인이 아니어도 넓혀 줄 수 있고, 넓히면 웹과 앱의 모두에게 적용돼요.
        </p>
      </div>
    </BottomSheet>
  );
}
