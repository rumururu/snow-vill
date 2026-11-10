"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { BIG_CAPACITY, FREE_CAPACITY, type Village } from "@/lib/village";

/** "큰 마을로 키우기": free villages hold 6 houses; the paid upgrade (in the app) allows 8. */
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
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="큰 마을로 키우기"
      footer={
        simulated ? (
          <button type="button" onClick={onSimulatedUpgrade} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
            큰 마을로 키우기 (시뮬레이션)
          </button>
        ) : (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">
            Snow Village 앱에서 키울 수 있어요 · 앱 출시 준비 중
          </p>
        )
      }
    >
      <div className="space-y-3 text-[15px] leading-relaxed text-night">
        <p>
          무료 마을은 집 {FREE_CAPACITY}채까지예요. <b>{village.name}</b>을(를) 큰 마을로 키우면 친구 {BIG_CAPACITY}명까지 입주할 수 있어요.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>잠긴 빈 집 {BIG_CAPACITY - FREE_CAPACITY}채가 열려요.</li>
          <li>{BIG_CAPACITY}채가 모두 차면 하늘에 오로라가 떠요.</li>
          <li>마을 주인이 아니어도 마을에 선물할 수 있어요. 한 번 키우면 모두에게 적용돼요.</li>
        </ul>
      </div>
    </BottomSheet>
  );
}
