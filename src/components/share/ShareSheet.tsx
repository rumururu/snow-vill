"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { inviteUrl, shareOrCopy, toShareCardData } from "@/lib/share";
import type { Village } from "@/lib/village";
import { rasterizeShareCard, ShareCard } from "./ShareCard";
import { useT } from "@/lib/i18n/I18nProvider";

/** S06 — complete/share: photo-free card preview with save & share actions. */
export function ShareSheet({ village, open, onClose }: { village: Village; open: boolean; onClose: () => void }) {
  const t = useT();
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
      setStatus(t("share.saved"));
    } catch {
      setStatus(t("share.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    const outcome = await shareOrCopy({
      title: "Snow Village",
      text: t("share.text"),
      url: inviteUrl(window.location.origin, village.id, "share"),
    });
    setStatus(
      outcome === "copied" ? t("share.linkCopied") : outcome === "failed" ? t("common.shareFailed") : null,
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={data.complete ? t("common.villageComplete") : t("share.title")}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="min-h-12 rounded-2xl border border-night/20 bg-white font-semibold text-night disabled:opacity-60"
          >
            {saving ? t("share.making") : t("share.saveImage")}
          </button>
          <button type="button" onClick={share} className="min-h-12 rounded-2xl bg-night font-bold text-ivory">
            {t("share.shareLink")}
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl shadow-md">
        <ShareCard ref={cardRef} data={data} className="block h-auto w-full" />
      </div>
      <p className="mt-3 text-center text-sm text-night/70">{t("share.privacyNote")}</p>
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
          {t("share.newVillage")}
        </Link>
      )}
    </BottomSheet>
  );
}
