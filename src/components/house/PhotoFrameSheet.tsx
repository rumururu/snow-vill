"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { HOUSE_STYLE_LABEL, type House } from "@/lib/village";
import { FallbackAvatar } from "./Avatar";

interface PhotoFrameSheetProps {
  house: House | null;
  isMine: boolean;
  isVillageOwner: boolean;
  onClose: () => void;
  onRemove: (house: House) => void;
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

/** S05 — occupied house: private photo frame, shown only after tapping the house. */
export function PhotoFrameSheet({ house, isMine, isVillageOwner, onClose, onRemove }: PhotoFrameSheetProps) {
  const [reported, setReported] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function close() {
    setConfirmRemove(false);
    onClose();
  }

  if (!house) return null;
  const canRemove = isMine || isVillageOwner;

  return (
    <BottomSheet open={Boolean(house)} onClose={close} title={`${house.nickname}의 작은 집`}>
      <figure className="mx-auto w-full max-w-[300px]">
        <div className="rounded-[28px] bg-wood p-3 shadow-[inset_0_-6px_0_rgba(0,0,0,.12)]">
          <div className="rounded-[20px] bg-[#FFF8EA] p-3">
            <div className="aspect-square overflow-hidden rounded-xl bg-sky">
              {house.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL, not optimizable
                <img
                  src={house.photo}
                  alt={`${house.nickname}님이 올린 사진`}
                  className="h-full w-full object-cover"
                  data-testid="frame-photo"
                />
              ) : (
                <FallbackAvatar style={house.style} className="h-full w-full" label={`${house.nickname}님의 기본 프로필 그림`} />
              )}
            </div>
          </div>
        </div>
        <figcaption className="mt-4 space-y-2 text-center">
          {house.message ? (
            <p className="whitespace-pre-line break-words text-base leading-relaxed text-night">“{house.message}”</p>
          ) : (
            <p className="text-sm text-night/60">남긴 메시지가 없어요.</p>
          )}
          <p className="text-xs text-night/60">
            {HOUSE_STYLE_LABEL[house.style]} 집 · <time dateTime={house.createdAt}>{dateFormat.format(new Date(house.createdAt))}</time> 입주
          </p>
        </figcaption>
      </figure>

      <div className="mt-5 space-y-2 border-t border-night/10 pt-4">
        {reported === house.id ? (
          <p role="status" className="rounded-xl bg-sky px-3 py-2 text-sm text-night">
            신고가 접수된 것처럼 표시만 했어요. <span className="text-night/60">(프로토타입 — 실제 전송 없음)</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setReported(house.id)}
            className="min-h-11 w-full rounded-xl px-3 text-sm font-medium text-night/70 underline-offset-4 hover:underline"
          >
            부적절한 내용 신고하기
          </button>
        )}
        {canRemove &&
          (confirmRemove ? (
            <div className="rounded-xl bg-[#F8E6DD] p-3 text-sm text-night">
              <p className="mb-2">이 집을 비울까요? 사진과 메시지가 함께 지워져요.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="min-h-11 flex-1 rounded-xl bg-ivory font-medium"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRemove(false);
                    onRemove(house);
                  }}
                  className="min-h-11 flex-1 rounded-xl bg-[#B5523B] font-semibold text-white"
                >
                  집 비우기
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="min-h-11 w-full rounded-xl px-3 text-sm font-medium text-[#B5523B]"
            >
              {isMine ? "내 집 비우기" : "마을 주인으로 이 집 비우기"}
            </button>
          ))}
      </div>
    </BottomSheet>
  );
}
