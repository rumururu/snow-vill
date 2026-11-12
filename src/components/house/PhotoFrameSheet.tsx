"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PhotoError, preparePhoto } from "@/lib/image";
import { INTL_LOCALE, type Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n/I18nProvider";
import { houseStyleLabel } from "@/lib/map";
import type { House } from "@/lib/village";
import { useVillageStore } from "@/store/VillageStoreProvider";
import { FallbackAvatar } from "./Avatar";

interface PhotoFrameSheetProps {
  villageId: string;
  house: House | null;
  isMine: boolean;
  isVillageOwner: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onRemove: (house: House) => Promise<string | null>;
}

const dateFormats = new Map<Locale, Intl.DateTimeFormat>();
function formatDate(iso: string, locale: Locale): string {
  let f = dateFormats.get(locale);
  if (!f) dateFormats.set(locale, (f = new Intl.DateTimeFormat(INTL_LOCALE[locale], { year: "numeric", month: "long", day: "numeric" })));
  return f.format(new Date(iso));
}

type PhotoState = { key: string; status: "loading" | "ready" | "error"; url: string | null };

/** S05 — occupied house: private photo frame, shown only after tapping the house. */
export function PhotoFrameSheet({ villageId, house, isMine, isVillageOwner, onClose, onRemove }: PhotoFrameSheetProps) {
  const store = useVillageStore();
  const t = useT();
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [reload, setReload] = useState(0);
  const [reported, setReported] = useState<{ houseId: string; text: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const photoKey = house ? `${house.id}:${house.hasPhoto}:${reload}` : "";

  useEffect(() => {
    if (!house?.hasPhoto) return;
    let cancelled = false;
    store
      .photoUrl(villageId, house)
      .then((url) => !cancelled && setPhoto({ key: photoKey, status: url ? "ready" : "error", url }))
      .catch(() => !cancelled && setPhoto({ key: photoKey, status: "error", url: null }));
    return () => {
      cancelled = true;
    };
    // photoKey captures house id / hasPhoto / retry count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey, store, villageId]);

  function close() {
    setConfirmRemove(false);
    setActionError(null);
    onClose();
  }

  if (!house) return null;
  const canRemove = isMine || isVillageOwner;
  const current = photo && photo.key === photoKey ? photo : null;
  const photoStatus = !house.hasPhoto ? "none" : current?.status ?? "loading";

  async function report() {
    if (!house) return;
    setReporting(true);
    const result = await store.report(villageId, house.id, "inappropriate");
    setReporting(false);
    setReported({
      houseId: house.id,
      text: !result.ok
        ? result.message
        : "simulated" in result && result.simulated
          ? t("frame.reportSimulated")
          : t("frame.reported"),
    });
  }

  async function changePhoto(file: File | null) {
    if (!file || !house) return;
    setBusy(true);
    setActionError(null);
    try {
      const dataUrl = await preparePhoto(file);
      const result = await store.uploadPhoto(villageId, house.id, dataUrl);
      if (!result.ok) setActionError(result.message);
      else setReload((n) => n + 1);
    } catch (err) {
      setActionError(err instanceof PhotoError ? err.message : t("frame.photoFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <BottomSheet open={Boolean(house)} onClose={close} title={t("frame.title", { name: house.nickname })}>
      <figure className="mx-auto w-full max-w-[300px]">
        <div className="rounded-[28px] bg-wood p-3 shadow-[inset_0_-6px_0_rgba(0,0,0,.12)]">
          <div className="rounded-[20px] bg-[#FFF8EA] p-3">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-sky">
              {photoStatus === "ready" && current?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- private signed URL / local data URL
                <img
                  src={current.url}
                  alt={t("frame.photoAlt", { name: house.nickname })}
                  className="h-full w-full object-cover"
                  data-testid="frame-photo"
                  referrerPolicy="no-referrer"
                />
              ) : photoStatus === "loading" ? (
                <div className="grid h-full w-full place-items-center" role="status" aria-label={t("frame.photoLoading")}>
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-night/20 border-t-night motion-reduce:animate-none" />
                </div>
              ) : photoStatus === "error" ? (
                <div className="grid h-full w-full place-items-center gap-2 p-4 text-center text-sm text-night">
                  <p>{t("frame.photoLoadFailed")}</p>
                  <button type="button" onClick={() => setReload((n) => n + 1)} className="min-h-11 rounded-xl bg-white px-4 font-semibold">
                    {t("common.retry")}
                  </button>
                </div>
              ) : (
                <FallbackAvatar style={house.style} className="h-full w-full" label={t("frame.avatar", { name: house.nickname })} />
              )}
            </div>
          </div>
        </div>
        <figcaption className="mt-4 space-y-2 text-center">
          {house.message ? (
            <p className="whitespace-pre-line break-words text-base leading-relaxed text-night">“{house.message}”</p>
          ) : (
            <p className="text-sm text-night/60">{t("frame.noMessage")}</p>
          )}
          <p className="text-xs text-night/60">
            {t.rich("frame.meta", {
              style: houseStyleLabel(house.style, t.locale),
              date: <time dateTime={house.createdAt}>{formatDate(house.createdAt, t.locale)}</time>,
            })}
          </p>
        </figcaption>
      </figure>

      <div className="mt-5 space-y-2 border-t border-night/10 pt-4">
        {isMine && (
          <label className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-night/20 bg-white px-3 text-sm font-semibold text-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30">
            {busy ? t("frame.uploading") : house.hasPhoto ? t("frame.changePhoto") : t("frame.uploadPhoto")}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => changePhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {actionError && (
          <p role="alert" className="rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
            {actionError}
          </p>
        )}
        {reported?.houseId === house.id ? (
          <p role="status" className="rounded-xl bg-sky px-3 py-2 text-sm text-night">
            {reported.text}
          </p>
        ) : (
          !isMine && (
            <button
              type="button"
              onClick={report}
              disabled={reporting}
              className="min-h-11 w-full rounded-xl px-3 text-sm font-medium text-night/70 underline-offset-4 hover:underline disabled:opacity-60"
            >
              {t("frame.report")}
            </button>
          )
        )}
        {canRemove &&
          (confirmRemove ? (
            <div className="rounded-xl bg-[#F8E6DD] p-3 text-sm text-night">
              <p className="mb-2">{t("frame.removeConfirm")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmRemove(false)} className="min-h-11 flex-1 rounded-xl bg-ivory font-medium">
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const error = await onRemove(house);
                    setBusy(false);
                    if (error) setActionError(error);
                    setConfirmRemove(false);
                  }}
                  className="min-h-11 flex-1 rounded-xl bg-[#B5523B] font-semibold text-white disabled:opacity-60"
                >
                  {t("frame.remove")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="min-h-11 w-full rounded-xl px-3 text-sm font-medium text-[#B5523B]"
            >
              {isMine ? t("frame.removeMine") : t("frame.removeAsOwner")}
            </button>
          ))}
      </div>
    </BottomSheet>
  );
}
