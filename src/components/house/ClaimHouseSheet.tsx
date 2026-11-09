"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PhotoError, preparePhoto } from "@/lib/image";
import { SLOTS } from "@/lib/scene";
import {
  charLength,
  freeSlots,
  HOUSE_STYLE_LABEL,
  HOUSE_STYLES,
  MESSAGE_MAX,
  NICKNAME_MAX,
  validateHouseInput,
  type FieldErrors,
  type House,
  type HouseStyle,
  type Village,
} from "@/lib/village";
import { HOUSE_COLORS } from "@/lib/assets";
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

type Draft = { nickname: string; style: HouseStyle; message: string; photo: string | null };
const EMPTY_DRAFT: Draft = { nickname: "", style: "wood", message: "", photo: null };

/** S04 — claim an empty house. The draft survives close/reopen and failures. */
export function ClaimHouseSheet({ village, slot, onClose, onClaimed, onChangeSlot, intro, latencyMs = 450 }: ClaimHouseSheetProps) {
  const store = useVillageStore();
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
  const slotDef = slot !== null ? SLOTS[slot] : null;
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
        throw new PhotoError("DECODE_FAILED", "사진 업로드에 실패했어요. (시뮬레이션) 작성한 내용은 그대로 있어요.");
      }
      const dataUrl = await preparePhoto(file);
      update("photo", dataUrl);
    } catch (err) {
      setPhotoError(err instanceof PhotoError ? err.message : "사진을 처리하지 못했어요. 다시 시도해 주세요.");
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
        setSubmitError("앗, 방금 다른 친구가 이 집터에 먼저 입주했어요. 작성한 내용은 그대로 두었으니 다른 빈 집을 골라 주세요.");
        setSimCollision(false);
        break;
      case "VILLAGE_FULL":
        setSubmitError("마을의 8채가 모두 찼어요. 새 마을을 만들어 볼까요?");
        break;
      case "ALREADY_JOINED":
        setSubmitError("이 브라우저에서는 이미 이 마을에 집을 만들었어요.");
        break;
      case "INVALID_INPUT":
        setErrors(result.errors);
        break;
      case "REMOTE_ERROR":
        setSubmitError(`${result.message} 작성한 내용은 그대로 있어요.`);
        break;
      case "NOT_FOUND":
        setSubmitError("마을을 찾을 수 없어요. 링크를 다시 확인해 주세요.");
        break;
      default:
        setSubmitError("집을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  const freeAfterCollision = freeSlots(village).filter((s) => s !== slot);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slotDef ? `${slotDef.slot + 1}번 집터에 내 집 만들기` : "내 집 만들기"}
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
                  {freeAfterCollision[0] + 1}번 빈 집터로 옮기기
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
            {submitting ? "집 짓는 중…" : "내 집 완성하기"}
          </button>
        </>
      }
    >
      {intro && <p className="mb-3 rounded-xl bg-glow/25 px-3 py-2 text-sm text-night">{intro}</p>}
      <form id="claim-house-form" onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={submitting}>
        <div className="flex items-center gap-3">
          <HousePreview style={draft.style} className="h-28 w-32 shrink-0" />
          <div className="text-sm text-night/80">
            <p className="font-semibold text-night">{slotDef?.label} 집터</p>
            <p>빈 집에 불을 켜주세요. 친구들이 집을 누르면 내 사진 액자가 열려요.</p>
          </div>
        </div>

        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-semibold text-night">
            닉네임 <span className="text-[#B5523B]">*</span>
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
            placeholder="친구들이 알아볼 이름"
          />
          {errors.nickname ? (
            <p id="nickname-error" role="alert" className="mt-1 text-sm text-[#B5523B]">
              {errors.nickname}
            </p>
          ) : (
            <p id="nickname-hint" className="mt-1 text-xs text-night/60">
              {NICKNAME_MAX}자 이내
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-night">집 스타일</legend>
          <div className="grid grid-cols-3 gap-2">
            {HOUSE_STYLES.map((style) => (
              <label
                key={style}
                className="relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-transparent bg-white px-2 py-2 text-sm font-medium text-night has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
              >
                <input
                  type="radio"
                  name="style"
                  value={style}
                  checked={draft.style === style}
                  onChange={() => update("style", style)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="h-6 w-10 rounded-md"
                  style={{ background: `linear-gradient(135deg, ${HOUSE_COLORS[style].roof} 50%, ${HOUSE_COLORS[style].wall} 50%)` }}
                />
                {HOUSE_STYLE_LABEL[style]}
              </label>
            ))}
          </div>
          {errors.style && <p role="alert" className="mt-1 text-sm text-[#B5523B]">{errors.style}</p>}
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold text-night">
            사진 <span className="font-normal text-night/60">(선택)</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sky">
              {draft.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview data URL
                <img src={draft.photo} alt="선택한 사진 미리보기" className="h-full w-full object-cover" />
              ) : (
                <FallbackAvatar style={draft.style} className="h-full w-full" label="사진이 없을 때 보일 기본 그림" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-night/20 bg-white px-3 text-sm font-medium text-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30">
                {photoBusy ? "사진 처리 중…" : draft.photo ? "다른 사진 고르기" : "사진 고르기"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-describedby="photo-hint"
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
                  사진 빼기
                </button>
              )}
            </div>
          </div>
          <p id="photo-hint" className="mt-2 text-xs text-night/60">
            사진 없이도 참여할 수 있어요. JPG·PNG·WEBP, 10MB 이하. 정사각형으로 잘리고 위치 정보(EXIF)는 지워져요.
          </p>
          {photoError && (
            <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
              <span>{photoError}</span>
              {lastFile && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-[#B5523B]"
                  onClick={() => void handleFile(lastFile, false)}
                >
                  다시 시도
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-semibold text-night">
            한마디 <span className="font-normal text-night/60">(선택)</span>
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
            placeholder="마을 친구들에게 남길 한마디"
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
          입력한 닉네임·한마디·사진은 이 마을 링크를 가진 사람에게 보여요. 내 집은 언제든 비울 수 있어요.{" "}
          <Link href="/privacy/" target="_blank" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
        </p>

        {simulated && (
        <details className="rounded-xl border border-dashed border-night/25 px-3 py-2 text-sm text-night/80">
          <summary className="min-h-11 cursor-pointer content-center font-medium">테스트용 시뮬레이션 (프로토타입)</summary>
          <div className="space-y-2 pb-2 pt-1">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={simCollision} onChange={(e) => setSimCollision(e.target.checked)} className="h-5 w-5" />
              제출 직전에 다른 친구가 이 집터를 차지하기
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={simUploadFail} onChange={(e) => setSimUploadFail(e.target.checked)} className="h-5 w-5" />
              다음 사진 업로드를 실패시키기
            </label>
            {nextFree.length === 0 && <p className="text-xs">이 집터가 마지막 빈 집이에요.</p>}
          </div>
        </details>
        )}
      </form>
    </BottomSheet>
  );
}
