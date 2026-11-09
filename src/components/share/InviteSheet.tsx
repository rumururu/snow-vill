"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { copyText, inviteUrl, shareOrCopy } from "@/lib/share";
import { freeSlots, type Village } from "@/lib/village";
import { useVillageStore } from "@/store/VillageStoreProvider";

const noopSubscribe = () => () => {};

export function InviteSheet({ village, open, onClose }: { village: Village; open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const simulated = useVillageStore().isLocal(village.id);
  const [status, setStatus] = useState<string | null>(null);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const url = origin ? inviteUrl(origin, village.id) : "";
  const left = freeSlots(village).length;

  async function copy() {
    if (await copyText(url)) setStatus("초대 링크를 복사했어요.");
    else {
      inputRef.current?.select();
      setStatus("자동 복사가 안 돼요. 선택된 링크를 길게 눌러 복사해 주세요.");
    }
  }

  async function share() {
    const outcome = await shareOrCopy({
      title: `${village.name} — Snow Village`,
      text: "우리 겨울 마을에 집을 지어 줘!",
      url: inviteUrl(origin, village.id, "share"),
    });
    if (outcome === "copied") setStatus("공유 창을 열 수 없어 링크를 복사했어요.");
    else if (outcome === "failed") setStatus("공유하지 못했어요. 링크를 직접 복사해 주세요.");
    else setStatus(null);
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setStatus(null);
        onClose();
      }}
      title="친구 초대"
    >
      <p className="text-base text-night">
        친구를 초대해 마을을 완성해요.{" "}
        <span className="text-night/70">{left > 0 ? `빈 집이 ${left}채 남았어요.` : "모든 집이 찼어요."}</span>
      </p>
      <label htmlFor="invite-url" className="mt-4 block text-sm font-semibold text-night">
        초대 링크
      </label>
      <div className="mt-1 flex gap-2">
        <input
          ref={inputRef}
          id="invite-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-night/20 bg-white px-3 text-sm text-night"
        />
        <button type="button" onClick={copy} className="min-h-12 shrink-0 rounded-xl bg-night px-4 font-bold text-ivory">
          복사
        </button>
      </div>
      {canNativeShare && (
        <button
          type="button"
          onClick={share}
          className="mt-2 min-h-12 w-full rounded-xl border border-night/20 bg-white font-semibold text-night"
        >
          다른 앱으로 공유하기
        </button>
      )}
      {status && (
        <p role="status" className="mt-2 text-sm font-medium text-night">
          {status}
        </p>
      )}
      {simulated ? (
        <p className="mt-4 rounded-xl border border-dashed border-night/25 px-3 py-2 text-xs leading-relaxed text-night/70">
          시뮬레이션 마을이에요. 데이터가 이 브라우저 탭에만 임시로 저장돼서, 이 링크를 다른 기기나 브라우저에서 열면
          마을이 보이지 않아요.
        </p>
      ) : (
        <p className="mt-4 rounded-xl bg-sky px-3 py-2 text-xs leading-relaxed text-night/75">
          링크를 받은 사람은 누구나 마을을 구경하고 빈 집에 입주할 수 있어요. 믿을 수 있는 친구에게만 보내 주세요.
        </p>
      )}
    </BottomSheet>
  );
}
