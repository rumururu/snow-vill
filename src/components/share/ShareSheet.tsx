"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { inviteUrl, shareOrCopy, toShareCardData } from "@/lib/share";
import type { Village } from "@/lib/village";
import { rasterizeShareCard, ShareCard } from "./ShareCard";

/** S06 — complete/share: photo-free card preview with save & share actions. */
export function ShareSheet({ village, open, onClose }: { village: Village; open: boolean; onClose: () => void }) {
  const cardRef = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const data = toShareCardData(village);

  async function save() {
    if (!cardRef.current) return;
    setSaving(true);
    setStatus(null);
    try {
      const blob = await rasterizeShareCard(cardRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "snow-village-card.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("카드 이미지를 저장했어요.");
    } catch {
      setStatus("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    const outcome = await shareOrCopy({
      title: "Snow Village",
      text: "우리 겨울 마을에 놀러 와!",
      url: inviteUrl(window.location.origin, village.id, "share"),
    });
    setStatus(
      outcome === "copied" ? "링크를 복사했어요." : outcome === "failed" ? "공유하지 못했어요. 링크를 직접 복사해 주세요." : null,
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={data.complete ? "우리 마을이 완성됐어요!" : "마을 공유 카드"}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="min-h-12 rounded-2xl border border-night/20 bg-white font-semibold text-night disabled:opacity-60"
          >
            {saving ? "만드는 중…" : "이미지 저장"}
          </button>
          <button type="button" onClick={share} className="min-h-12 rounded-2xl bg-night font-bold text-ivory">
            링크 공유하기
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl shadow-md">
        <ShareCard ref={cardRef} data={data} className="block h-auto w-full" />
      </div>
      <p className="mt-3 text-center text-sm text-night/70">공유 카드에는 친구들의 사진·이름·메시지가 들어가지 않아요.</p>
      {status && (
        <p role="status" className="mt-2 text-center text-sm font-medium text-night">
          {status}
        </p>
      )}
      {data.complete && (
        <Link
          href="/create"
          className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-glow/30 px-3 text-sm font-semibold text-night"
        >
          다른 친구들과 새 마을 만들기
        </Link>
      )}
    </BottomSheet>
  );
}
