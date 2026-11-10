"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { MILESTONES } from "@/lib/milestones";
import { EXPANSION_STEP, FREE_CAPACITY, MAX_CAPACITY, stepTier, TIER_PRICE_KRW, type Village } from "@/lib/village";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

/** "마을 넓히기": free villages hold 6 houses; each paid step (in the app) adds 3, up to 60. */
export function UpgradeSheet({
  village,
  open,
  simulated,
  onClose,
  onSimulatedUpgrade,
}: {
  village: Village;
  open: boolean;
  simulated: boolean;
  onClose: () => void;
  onSimulatedUpgrade: () => void;
}) {
  const tier = stepTier(village.capacity);
  const next = Math.min(MAX_CAPACITY, village.capacity + EXPANSION_STEP);
  const unlock = MILESTONES.find((m) => m.houses > village.capacity && m.houses <= next);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="마을 넓히기"
      footer={
        tier === 0 ? (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">이미 가장 큰 마을({MAX_CAPACITY}채)이에요</p>
        ) : simulated ? (
          <button type="button" onClick={onSimulatedUpgrade} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
            {next}채로 넓히기 (시뮬레이션)
          </button>
        ) : (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">
            Snow Village 앱에서 {won(TIER_PRICE_KRW[tier])}에 넓힐 수 있어요
          </p>
        )
      }
    >
      <div className="space-y-3 text-[15px] leading-relaxed text-night">
        <p>
          <b>{village.name}</b>은(는) 지금 집 {village.capacity}채 마을이에요.
          {tier > 0 && <> 넓히면 집터 {EXPANSION_STEP}곳이 더 생겨 <b>{next}채</b>까지 입주할 수 있어요.</>}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>무료 {FREE_CAPACITY}채 → 9채 {won(TIER_PRICE_KRW[1])} → 12채 {won(TIER_PRICE_KRW[2])} → 15채 {won(TIER_PRICE_KRW[3])} → 그 뒤 3채마다 {won(TIER_PRICE_KRW[4])} (최대 {MAX_CAPACITY}채)</li>
          {unlock && <li>입주가 {unlock.houses}채가 되면 「{unlock.label}」이(가) 생겨요.</li>}
          <li>마을 주인이 아니어도 넓혀 줄 수 있어요. 한 번 넓히면 웹과 앱의 모두에게 적용돼요.</li>
        </ul>
      </div>
    </BottomSheet>
  );
}
