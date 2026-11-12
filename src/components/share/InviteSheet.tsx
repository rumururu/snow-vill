"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { copyText, inviteUrl, shareOrCopy } from "@/lib/share";
import { remainingHouses, type Village } from "@/lib/village";
import { useVillageStore } from "@/store/VillageStoreProvider";
import { useT } from "@/lib/i18n/I18nProvider";

const noopSubscribe = () => () => {};

export function InviteSheet({ village, open, onClose }: { village: Village; open: boolean; onClose: () => void }) {
  const t = useT();
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
  const left = remainingHouses(village);

  async function copy() {
    if (await copyText(url)) setStatus(t("invite.copied"));
    else {
      inputRef.current?.select();
      setStatus(t("invite.copyManual"));
    }
  }

  async function share() {
    const outcome = await shareOrCopy({
      title: `${village.name} — Snow Village`,
      text: t("invite.shareText"),
      url: inviteUrl(origin, village.id, "share"),
    });
    if (outcome === "copied") setStatus(t("invite.shareCopied"));
    else if (outcome === "failed") setStatus(t("common.shareFailed"));
    else setStatus(null);
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setStatus(null);
        onClose();
      }}
      title={t("invite.title")}
    >
      <p className="text-base text-night">
        {t("invite.lead")}{" "}
        <span className="text-night/70">{left > 0 ? t("invite.left", { count: left }) : t("invite.allTaken")}</span>
      </p>
      <label htmlFor="invite-url" className="mt-4 block text-sm font-semibold text-night">
        {t("invite.link")}
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
          {t("invite.copy")}
        </button>
      </div>
      {canNativeShare && (
        <button
          type="button"
          onClick={share}
          className="mt-2 min-h-12 w-full rounded-xl border border-night/20 bg-white font-semibold text-night"
        >
          {t("invite.shareOther")}
        </button>
      )}
      {status && (
        <p role="status" className="mt-2 text-sm font-medium text-night">
          {status}
        </p>
      )}
      {simulated ? (
        <p className="mt-4 rounded-xl border border-dashed border-night/25 px-3 py-2 text-xs leading-relaxed text-night/70">
          {t("invite.simNote")}
        </p>
      ) : (
        <p className="mt-4 rounded-xl bg-sky px-3 py-2 text-xs leading-relaxed text-night/75">
          {t("invite.publicNote")}
        </p>
      )}
    </BottomSheet>
  );
}
