"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PhotoError, preparePhoto } from "@/lib/image";
import { houseStyleLabel, LOTS } from "@/lib/map";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  charLength,
  DIRECTIONS,
  freeSlots,
  HOUSE_STYLES,
  MESSAGE_MAX,
  NICKNAME_MAX,
  validateHouseInput,
  type Direction,
  type FieldErrors,
  type House,
  type HouseStyle,
  type Village,
} from "@/lib/village";
import { useVillageStore } from "@/store/VillageStoreProvider";
import { FallbackAvatar } from "./Avatar";
import { HousePreview } from "./HousePreview";

interface ClaimHouseSheetProps {
  village: Village;
  slot: number | null;
  onClose: () => void;
  onClaimed: (house: House, photoError?: string) => void;
  onChangeSlot: (slot: number) => void;
  /** Shown as a lead line, e.g. right after village creation. */
  intro?: string;
  /** Simulated network latency for the mock submit (ms). */
  latencyMs?: number;
}

type Draft = { nickname: string; style: HouseStyle; direction: Direction; message: string; photo: string | null };
const EMPTY_DRAFT: Draft = { nickname: "", style: "brick", direction: 0, message: "", photo: null };
/** Types offered when moving in (legacy colourways keep rendering but are not offered). */
const PICKER_STYLES = HOUSE_STYLES.filter((s) => s !== "sage" && s !== "indigo");

/** S04 — claim an empty house. The draft survives close/reopen and failures. */
export function ClaimHouseSheet({ village, slot, onClose, onClaimed, onChangeSlot, intro, latencyMs = 450 }: ClaimHouseSheetProps) {
  const store = useVillageStore();
  const t = useT();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [simCollision, setSimCollision] = useState(false);
  const [simUploadFail, setSimUploadFail] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  const open = slot !== null;
  const lot = slot !== null ? LOTS[slot] : null;
  // New lot → door faces the plaza by default (the friend can change it).
  const [facingFor, setFacingFor] = useState<number | null>(null);
  if (lot && facingFor !== lot.slot) {
    setFacingFor(lot.slot);
    setDraft((d) => ({ ...d, direction: lot.facing }));
  }
  const messageLen = charLength(draft.message);
  const nextFree = freeSlots(village).filter((s) => s !== slot);
  const simulated = store.isLocal(village.id);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleFile(file: File | null, simulateFail = simUploadFail) {
    if (!file) return;
    setLastFile(file);
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      if (simulateFail) {
        setSimUploadFail(false);
        await new Promise((r) => setTimeout(r, 300));
        throw new PhotoError("DECODE_FAILED", t("claim.photoSimFail"));
      }
      const dataUrl = await preparePhoto(file);
      update("photo", dataUrl);
    } catch (err) {
      setPhotoError(err instanceof PhotoError ? err.message : t("claim.photoFailed"));
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (slot === null || submitting) return;
    setSubmitError(null);
    const validated = validateHouseInput(draft);
    if (!validated.ok) {
      setErrors(validated.errors);
      if (validated.errors.nickname) nicknameRef.current?.focus();
      return;
    }
    setSubmitting(true);
    if (simulated) {
      await new Promise((r) => setTimeout(r, latencyMs));
      if (simCollision) store.simulateFriendClaim(village.id, slot);
    }
    const result = await store.claimHouse(village.id, slot, draft);
    setSubmitting(false);

    if (result.ok) {
      setDraft(EMPTY_DRAFT);
      setErrors({});
      setSimCollision(false);
      onClaimed(result.house, result.photoError);
      return;
    }
    switch (result.reason) {
      case "SLOT_TAKEN":
        setSubmitError(t("claim.slotTaken"));
        setSimCollision(false);
        break;
      case "VILLAGE_FULL":
        setSubmitError(t("claim.villageFull"));
        break;
      case "ALREADY_JOINED":
        setSubmitError(t("claim.alreadyJoined"));
        break;
      case "INVALID_INPUT":
        setErrors(result.errors);
        break;
      case "REMOTE_ERROR":
        setSubmitError(t("claim.remoteError", { error: result.message }));
        break;
      case "NOT_FOUND":
        setSubmitError(t("claim.notFound"));
        break;
      default:
        setSubmitError(t("claim.failed"));
    }
  }

  const freeAfterCollision = freeSlots(village).filter((s) => s !== slot);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={lot ? t("claim.title", { n: lot.slot + 1 }) : t("common.claim")}
      initialFocusRef={nicknameRef}
      footer={
        <>
          {/* Server errors live in the sticky footer so they are always on screen, not below the fold. */}
          {submitError && (
            <div role="alert" className="mb-3 space-y-2 rounded-xl bg-[#F8E6DD] px-3 py-3 text-sm text-night">
              <p>{submitError}</p>
              {freeAfterCollision.length > 0 && slot !== null && (
                <button
                  type="button"
                  className="min-h-11 rounded-xl bg-ivory px-3 font-semibold"
                  onClick={() => {
                    setSubmitError(null);
                    onChangeSlot(freeAfterCollision[0]);
                  }}
                >
                  {t("claim.moveTo", { n: freeAfterCollision[0] + 1 })}
                </button>
              )}
            </div>
          )}
          <button
            type="submit"
            form="claim-house-form"
            disabled={submitting || photoBusy}
            className="min-h-12 w-full rounded-2xl bg-night text-base font-bold text-ivory shadow-sm transition-opacity disabled:opacity-60 motion-reduce:transition-none"
          >
            {submitting ? t("claim.submitting") : t("claim.submit")}
          </button>
        </>
      }
    >
      {intro && <p className="mb-3 rounded-xl bg-glow/25 px-3 py-2 text-sm text-night">{intro}</p>}
      <form id="claim-house-form" onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={submitting}>
        <div className="flex items-center gap-3">
          <HousePreview style={draft.style} direction={draft.direction} className="h-28 w-32 shrink-0" />
          <div className="text-sm text-night/80">
            <p className="font-semibold text-night">{lot ? t("claim.lot", { n: lot.slot + 1 }) : ""}</p>
          </div>
        </div>

        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-semibold text-night">
            {t("claim.nickname")} <span className="text-[#B5523B]">*</span>
          </label>
          <input
            ref={nicknameRef}
            id="nickname"
            name="nickname"
            autoComplete="nickname"
            value={draft.nickname}
            onChange={(e) => update("nickname", e.target.value)}
            aria-invalid={Boolean(errors.nickname)}
            aria-describedby={errors.nickname ? "nickname-error" : "nickname-hint"}
            className="min-h-12 w-full rounded-xl border border-night/20 bg-white px-3 text-base text-night outline-none focus:border-night focus:ring-2 focus:ring-night/30 aria-[invalid=true]:border-[#B5523B]"
            placeholder={t("claim.nicknamePlaceholder")}
          />
          {errors.nickname ? (
            <p id="nickname-error" role="alert" className="mt-1 text-sm text-[#B5523B]">
              {errors.nickname}
            </p>
          ) : (
            <p id="nickname-hint" className="mt-1 text-xs text-night/60">
              {t("claim.nicknameHint", { max: NICKNAME_MAX })}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-night">{t("claim.style")}</legend>
          <div className="grid grid-cols-3 gap-2 min-[400px]:grid-cols-4">
            {PICKER_STYLES.map((style) => (
              <label
                key={style}
                className="relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent bg-white px-1 py-1.5 text-xs font-medium text-night has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
              >
                <input type="radio" name="style" value={style} checked={draft.style === style} onChange={() => update("style", style)} className="sr-only" />
                <HousePreview style={style} className="h-14 w-14" />
                {houseStyleLabel(style, t.locale)}
              </label>
            ))}
          </div>
          {errors.style && <p role="alert" className="mt-1 text-sm text-[#B5523B]">{errors.style}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-night">{t("claim.direction")}</legend>
          <div className="grid grid-cols-4 gap-2">
            {DIRECTIONS.map((d) => (
              <label
                key={d}
                className="relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent bg-white px-1 py-1.5 text-xs font-medium text-night has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
              >
                <input type="radio" name="direction" value={d} checked={draft.direction === d} onChange={() => update("direction", d)} className="sr-only" />
                <HousePreview style={draft.style} direction={d} className="h-12 w-12" />
                {t(`dir.${d}`)}
                {lot?.facing === d && <span className="text-[10px] text-sage">{t("claim.towardPlaza")}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold text-night">
            {t("claim.photo")} <span className="font-normal text-night/60">{t("common.optional")}</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sky">
              {draft.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview data URL
                <img src={draft.photo} alt={t("claim.photoPreview")} className="h-full w-full object-cover" />
              ) : (
                <FallbackAvatar style={draft.style} className="h-full w-full" label={t("claim.photoFallback")} />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-night/20 bg-white px-3 text-sm font-medium text-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30">
                {photoBusy ? t("claim.photoBusy") : draft.photo ? t("claim.photoOther") : t("claim.photoPick")}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={photoBusy}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {draft.photo && (
                <button
                  type="button"
                  onClick={() => update("photo", null)}
                  className="min-h-11 rounded-xl px-3 text-sm text-night/70 underline-offset-4 hover:underline"
                >
                  {t("claim.photoRemove")}
                </button>
              )}
            </div>
          </div>
          {photoError && (
            <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
              <span>{photoError}</span>
              {lastFile && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-[#B5523B]"
                  onClick={() => void handleFile(lastFile, false)}
                >
                  {t("common.retry")}
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-semibold text-night">
            {t("claim.message")} <span className="font-normal text-night/60">{t("common.optional")}</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={2}
            value={draft.message}
            onChange={(e) => update("message", e.target.value)}
            aria-invalid={Boolean(errors.message) || messageLen > MESSAGE_MAX}
            aria-describedby="message-count"
            className="w-full resize-none rounded-xl border border-night/20 bg-white px-3 py-2 text-base text-night outline-none focus:border-night focus:ring-2 focus:ring-night/30 aria-[invalid=true]:border-[#B5523B]"
            placeholder={t("claim.messagePlaceholder")}
          />
          <p
            id="message-count"
            aria-live="polite"
            className={`mt-1 text-right text-xs ${messageLen > MESSAGE_MAX ? "font-semibold text-[#B5523B]" : "text-night/60"}`}
          >
            {messageLen}/{MESSAGE_MAX}
          </p>
          {errors.message && <p role="alert" className="text-sm text-[#B5523B]">{errors.message}</p>}
        </div>

        <p className="text-xs leading-relaxed text-night/60">
          {t("claim.visibility")}{" "}
          <Link href="/privacy/" target="_blank" className="underline underline-offset-2">
            {t("common.privacy")}
          </Link>
        </p>

        {simulated && (
        <details className="rounded-xl border border-dashed border-night/25 px-3 py-2 text-sm text-night/80">
          <summary className="min-h-11 cursor-pointer content-center font-medium">{t("claim.simTitle")}</summary>
          <div className="space-y-2 pb-2 pt-1">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={simCollision} onChange={(e) => setSimCollision(e.target.checked)} className="h-5 w-5" />
              {t("claim.simCollision")}
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={simUploadFail} onChange={(e) => setSimUploadFail(e.target.checked)} className="h-5 w-5" />
              {t("claim.simUploadFail")}
            </label>
            {nextFree.length === 0 && <p className="text-xs">{t("claim.simLast")}</p>}
          </div>
        </details>
        )}
      </form>
    </BottomSheet>
  );
}
