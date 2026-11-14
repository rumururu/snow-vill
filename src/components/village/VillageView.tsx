"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaimHouseSheet } from "@/components/house/ClaimHouseSheet";
import { PhotoFrameSheet } from "@/components/house/PhotoFrameSheet";
import { VillageMap } from "@/components/scene/VillageMap";
import { districtName, LOTS } from "@/lib/map";
import { InviteSheet } from "@/components/share/InviteSheet";
import { ShareSheet } from "@/components/share/ShareSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { villagePath } from "@/lib/share";
import { nextMilestone } from "@/lib/milestones";
import { canUpgrade, freeSlots, houseAt, isFull, lockedSlots, PATH_STYLES, remainingHouses, SAMPLE_VILLAGE_ID, type DecorSpots, type House, type PathStyle } from "@/lib/village";
import { UpgradeSheet } from "./UpgradeSheet";
import { useT } from "@/lib/i18n/I18nProvider";
import { useVillageState, useVillageStore } from "@/store/VillageStoreProvider";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function VillageView({ villageId, isNew = false }: { villageId: string; isNew?: boolean }) {
  const router = useRouter();
  const t = useT();
  const store = useVillageStore();
  const state = useVillageState();
  const village = state.villages[villageId];
  const status = state.status[villageId];
  const simulated = store.isLocal(villageId);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpenState] = useState(false);
  const [upgradeDistrict, setUpgradeDistrict] = useState<number | null>(null);
  const setUpgradeOpen = (open: boolean, district: number | null = null) => {
    setUpgradeDistrict(district);
    setUpgradeOpenState(open);
  };
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // After creation (?new=1), prompt the owner to claim the first house (slot 0).
  const [claimSlot, setClaimSlot] = useState<number | null>(isNew ? 0 : null);
  const [claimIntro, setClaimIntro] = useState(isNew);
  const [frameHouseId, setFrameHouseId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [igniteSlot, setIgniteSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Village look being edited (owner): draft path style + moved decorations; null = not editing.
  const [look, setLook] = useState<{ pathStyle: PathStyle; decor: DecorSpots } | null>(null);
  const [savingLook, setSavingLook] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const myHouseId = state.myHouses[villageId] ?? null;
  const myHouse = village?.houses.find((h) => h.id === myHouseId) ?? null;
  const isOwner = state.ownedVillages.includes(villageId);
  const canEditLook = store.canEditLook(villageId);
  const frameHouse = village?.houses.find((h) => h.id === frameHouseId) ?? null;

  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const refresh = useCallback(() => {
    store
      .loadVillage(villageId)
      .then(() => setRefreshFailed(false))
      .catch(() => setRefreshFailed(true));
  }, [store, villageId]);

  // Load once, then keep friends' new houses in view: refetch on focus and every 20s while visible.
  useEffect(() => {
    if (!state.hydrated) return;
    refresh();
    if (simulated) return;
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const timer = setInterval(onVisible, 20_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.hydrated, refresh, simulated]);

  // Drop ?new=1 so a reload does not re-open the first-claim prompt.
  useEffect(() => {
    if (isNew) router.replace(villagePath(villageId), { scroll: false });
  }, [isNew, router, villageId]);

  if (!state.hydrated || (!village && (status === undefined || status === "loading"))) return <VillageSkeleton />;

  if (!village && status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl" aria-hidden>
          📡
        </p>
        <h1 className="text-xl font-bold text-night">{t("common.loadFailed")}</h1>
        <p className="text-sm text-night/70">{t("view.checkConnection")}</p>
        <button type="button" onClick={refresh} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
          {t("common.retry")}
        </button>
      </main>
    );
  }

  if (!village) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl" aria-hidden>
          🌨️
        </p>
        <h1 className="text-xl font-bold text-night">{t("common.villageNotFound")}</h1>
        <p className="text-sm leading-relaxed text-night/70">
          {t("view.notFoundBody")}
          {simulated && ` ${t("view.notFoundSimulated")}`}
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link href="/create" className="flex min-h-12 items-center justify-center rounded-2xl bg-night font-bold text-ivory">
            {t("common.createVillage")}
          </Link>
          <Link href={villagePath(SAMPLE_VILLAGE_ID)} className="flex min-h-12 items-center justify-center rounded-2xl bg-white font-semibold text-night">
            {t("common.browseSample")}
          </Link>
        </div>
      </main>
    );
  }

  const full = isFull(village);
  const free = freeSlots(village);
  const upgradable = full && canUpgrade(village);
  const milestone = nextMilestone(village.houses.length, village.capacity);

  function openSlot(slot: number) {
    const house = houseAt(village!, slot);
    if (house) {
      setFrameHouseId(house.id);
      return;
    }
    if (lockedSlots(village!).includes(slot)) {
      setUpgradeOpen(true, LOTS[slot]?.district ?? null);
      return;
    }
    if (myHouse) {
      notify(t("view.alreadyHaveHouse"));
      return;
    }
    setClaimIntro(false);
    setClaimSlot(slot);
  }

  function onClaimed(house: House, photoError?: string) {
    setClaimSlot(null);
    setIgniteSlot(house.slot);
    notify(
      photoError
        ? t("view.claimedPhotoFailed", { error: photoError })
        : t("view.claimed", { name: house.nickname }),
    );
    setTimeout(() => setIgniteSlot(null), 1200);
    const after = store.getState().villages[villageId];
    if (after && isFull(after)) setTimeout(() => setShareOpen(true), prefersReducedMotion() ? 0 : 900);
  }

  function startEditLook() {
    setLook({ pathStyle: village!.pathStyle ?? "dirt", decor: { ...(village!.decor ?? {}) } });
  }
  async function saveLook() {
    if (!look) return;
    setSavingLook(true);
    const r = await store.setVillageLook(villageId, look.pathStyle, look.decor);
    setSavingLook(false);
    if (!r.ok) {
      notify(r.message);
      return;
    }
    setLook(null);
    notify(t("view.lookSaved"));
  }

  function simulateFriend() {
    const result = store.simulateFriendClaim(villageId);
    if (result.ok) {
      setIgniteSlot(result.house.slot);
      setTimeout(() => setIgniteSlot(null), 1200);
      notify(t("view.simFriendJoined", { name: result.house.nickname }));
      const after = store.getState().villages[villageId];
      if (after && isFull(after)) setTimeout(() => setShareOpen(true), prefersReducedMotion() ? 0 : 900);
    } else notify(t("view.noEmptyHouse"));
  }

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        <header className="flex items-center gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            aria-label={t("common.home")}
            className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5"
          >
            ←
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold text-night">{village.name}</h1>
          <OverflowMenu
            onShareCard={() => setShareOpen(true)}
            onSimulateFriend={full || !simulated ? undefined : simulateFriend}
            onResetSample={village.isSample ? () => (store.resetSample(), notify(t("view.sampleReset"))) : undefined}
            onDeleteVillage={isOwner && !village.isSample ? () => setDeleteOpen(true) : undefined}
            onUpgrade={canUpgrade(village) ? () => setUpgradeOpen(true) : undefined}
            onEditLook={canEditLook && !look ? startEditLook : undefined}
          />
        </header>

        <div className="flex items-center justify-between gap-2 px-4 pt-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-night" aria-live="polite">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              <span className="sr-only">{t("view.housesSr")} </span>
              {village.houses.length}/{village.capacity}
            </span>
            <span className="font-normal text-night/70">
              {full ? t("view.complete") : village.houses.length === 0 ? t("view.lightFirst") : t("view.remaining", { count: remainingHouses(village) })}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            {canEditLook && !look && (
              <button type="button" onClick={startEditLook} className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold text-night shadow-sm">
                {t("view.decorate")}
              </button>
            )}
            {simulated && <SimulatedBadge />}
          </div>
        </div>

        <main className="flex flex-1 flex-col gap-1 px-1">
          <VillageMap
            village={village}
            myHouseId={myHouseId}
            igniteSlot={igniteSlot}
            onSelectSlot={openSlot}
            onSelectDistrict={(d) => setUpgradeOpen(true, d)}
            edit={
              look
                ? { pathStyle: look.pathStyle, decor: look.decor, onMove: (id, at) => setLook((l) => (l ? { ...l, decor: { ...l.decor, [id]: at } } : l)) }
                : undefined
            }
            fill
            className="min-h-[360px] flex-1 rounded-3xl"
          />
          {milestone && (
            <p className="mx-4 mb-1 rounded-xl bg-glow/25 px-3 py-1.5 text-center text-xs font-semibold text-night" data-testid="milestone">
              {t("view.milestone", { count: milestone.remaining, label: t(milestone.label) })}
            </p>
          )}
          {refreshFailed && (
            <p role="status" className="mx-4 mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-xs text-night">
              {t("view.unstable")}
            </p>
          )}
          {state.persistWarning && simulated && (
            <p role="alert" className="mx-4 mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-xs text-night">
              {state.persistWarning}
            </p>
          )}
        </main>

        {look ? (
          <LookEditor
            pathStyle={look.pathStyle}
            moved={Object.keys(look.decor).length}
            saving={savingLook}
            onPathStyle={(ps) => setLook({ ...look, pathStyle: ps })}
            onResetDecor={() => setLook({ ...look, decor: {} })}
            onCancel={() => setLook(null)}
            onSave={saveLook}
          />
        ) : (
        <nav
          aria-label={t("view.actions")}
          className="sticky bottom-0 grid grid-cols-2 gap-2 bg-gradient-to-t from-sky via-sky to-sky/0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {full ? (
            <>
              <button type="button" onClick={() => setShareOpen(true)} className="min-h-12 rounded-2xl bg-night font-bold text-ivory">
                {t("view.makeShareCard")}
              </button>
              {upgradable ? (
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="min-h-12 rounded-2xl bg-glow font-bold text-night shadow-sm"
                >
                  {t("common.expand")}
                </button>
              ) : (
                <Link href="/create" className="flex min-h-12 items-center justify-center rounded-2xl bg-white font-semibold text-night">
                  {t("common.createVillage")}
                </Link>
              )}
            </>
          ) : (
            <>
              {myHouse ? (
                <button
                  type="button"
                  onClick={() => setFrameHouseId(myHouse.id)}
                  className="min-h-12 rounded-2xl bg-white font-semibold text-night shadow-sm"
                >
                  {t("view.myHouse")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openSlot(free[0])}
                  className="min-h-12 rounded-2xl bg-night font-bold text-ivory shadow-sm"
                >
                  {t("common.claim")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className={`min-h-12 rounded-2xl font-bold shadow-sm ${myHouse ? "bg-night text-ivory" : "bg-white text-night"}`}
              >
                {t("view.invite")}
              </button>
            </>
          )}
        </nav>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 transition-opacity motion-reduce:transition-none ${
          toast ? "opacity-100" : "opacity-0"
        }`}
      >
        {toast && <p className="max-w-[440px] rounded-2xl bg-night/90 px-4 py-2 text-center text-sm text-ivory shadow-lg">{toast}</p>}
      </div>

      <ClaimHouseSheet
        village={village}
        slot={claimSlot}
        intro={claimIntro ? t("view.newIntro") : undefined}
        onClose={() => setClaimSlot(null)}
        onClaimed={onClaimed}
        onChangeSlot={setClaimSlot}
      />
      <PhotoFrameSheet
        villageId={villageId}
        house={frameHouse}
        isMine={Boolean(frameHouse && frameHouse.id === myHouseId)}
        isVillageOwner={isOwner}
        onClose={() => setFrameHouseId(null)}
        onRemove={async (h) => {
          const result = await store.removeHouse(villageId, h.id);
          if (!result.ok) return result.message;
          setFrameHouseId(null);
          notify(t("view.houseRemoved", { name: h.nickname }));
          return null;
        }}
      />
      <InviteSheet village={village} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ShareSheet village={village} open={shareOpen} onClose={() => setShareOpen(false)} />
      <UpgradeSheet
        village={village}
        open={upgradeOpen}
        district={upgradeDistrict}
        simulated={simulated}
        onClose={() => setUpgradeOpen(false)}
        onSimulatedUpgrade={(d) => {
          const r = store.upgradeVillage(villageId, d);
          setUpgradeOpen(false);
          notify(r.ok ? t("view.simUpgraded", { district: districtName(d, t.locale) }) : r.message);
        }}
      />
      <BottomSheet
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title={t("view.deleteTitle")}
        footer={
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              const result = await store.deleteVillage(villageId);
              setDeleting(false);
              if (!result.ok) {
                setDeleteError(result.message);
                return;
              }
              setDeleteOpen(false);
              router.push("/");
            }}
            className="min-h-12 w-full rounded-2xl bg-[#B5523B] font-bold text-white disabled:opacity-60"
          >
            {deleting ? t("view.deleting") : t("view.deleteConfirm")}
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-night">
          {t("view.deleteBody", { name: village.name, count: village.houses.length })}
        </p>
        {deleteError && (
          <p role="alert" className="mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
            {deleteError}
          </p>
        )}
      </BottomSheet>
    </>
  );
}

function OverflowMenu({
  onShareCard,
  onSimulateFriend,
  onResetSample,
  onDeleteVillage,
  onUpgrade,
  onEditLook,
}: {
  onShareCard: () => void;
  onEditLook?: () => void;
  onUpgrade?: () => void;
  onSimulateFriend?: () => void;
  onResetSample?: () => void;
  onDeleteVillage?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = "village-overflow-menu";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-night hover:bg-night/5";
  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("menu.label")}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5"
      >
        ⋯
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 z-30 mt-1 w-60 rounded-2xl bg-ivory p-1.5 shadow-xl ring-1 ring-night/10">
          <button type="button" className={item} onClick={run(onShareCard)}>
            {t("menu.shareCard")}
          </button>
          {onEditLook && (
            <button type="button" className={item} onClick={run(onEditLook)}>
              {t("menu.editLook")}
            </button>
          )}
          {onUpgrade && (
            <button type="button" className={item} onClick={run(onUpgrade)}>
              {t("common.expand")}
            </button>
          )}
          {onSimulateFriend && (
            <button type="button" className={item} onClick={run(onSimulateFriend)}>
              {t("menu.simFriend")}
            </button>
          )}
          {onResetSample && (
            <button type="button" className={item} onClick={run(onResetSample)}>
              {t("menu.resetSample")}
            </button>
          )}
          <Link href="/create" className={item}>
            {t("common.createVillage")}
          </Link>
          {onDeleteVillage && (
            <button type="button" className={`${item} text-[#B5523B]`} onClick={run(onDeleteVillage)}>
              {t("menu.delete")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Owner's look editor (replaces the bottom actions while editing): path style, reset, cancel / save. */
function LookEditor({
  pathStyle,
  moved,
  saving,
  onPathStyle,
  onResetDecor,
  onCancel,
  onSave,
}: {
  pathStyle: PathStyle;
  moved: number;
  saving: boolean;
  onPathStyle: (ps: PathStyle) => void;
  onResetDecor: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useT();
  return (
    <section
      aria-label={t("look.title")}
      data-testid="look-editor"
      className="sticky bottom-0 flex flex-col gap-2 bg-gradient-to-t from-sky via-sky to-sky/0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-night">{t("look.pathStyle")}</h2>
        <button type="button" onClick={onResetDecor} disabled={moved === 0} className="min-h-9 rounded-full px-2 text-xs font-semibold text-night/70 underline disabled:opacity-40">
          {t("look.resetDecor")}
        </button>
      </div>
      <div role="radiogroup" aria-label={t("look.pathStyle")} className="grid grid-cols-4 gap-1.5">
        {PATH_STYLES.map((ps) => (
          <button
            key={ps}
            type="button"
            role="radio"
            aria-checked={pathStyle === ps}
            onClick={() => onPathStyle(ps)}
            className={`min-h-11 rounded-xl text-sm font-semibold shadow-sm ${pathStyle === ps ? "bg-night text-ivory" : "bg-white text-night"}`}
          >
            {t(`path.${ps}`)}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-night/70">{t("look.hint")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="min-h-12 rounded-2xl bg-white font-semibold text-night shadow-sm">
          {t("common.cancel")}
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="min-h-12 rounded-2xl bg-night font-bold text-ivory shadow-sm disabled:opacity-60">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </section>
  );
}

function VillageSkeleton() {
  const t = useT();
  return (
    <main
      aria-busy="true"
      aria-label={t("view.loading")}
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-4 pt-4"
    >
      <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-white/80 motion-reduce:animate-none" />
      <div className="h-6 w-24 animate-pulse rounded-full bg-white/80 motion-reduce:animate-none" />
      <div className="aspect-square w-full animate-pulse rounded-3xl bg-white/70 motion-reduce:animate-none" />
      <span className="sr-only">{t("view.loadingSr")}</span>
    </main>
  );
}
