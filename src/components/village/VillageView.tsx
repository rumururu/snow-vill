"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaimHouseSheet } from "@/components/house/ClaimHouseSheet";
import { PhotoFrameSheet } from "@/components/house/PhotoFrameSheet";
import { VillageScene } from "@/components/scene/VillageScene";
import { InviteSheet } from "@/components/share/InviteSheet";
import { ShareSheet } from "@/components/share/ShareSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { villagePath } from "@/lib/share";
import { freeSlots, houseAt, isFull, SAMPLE_VILLAGE_ID, VILLAGE_CAPACITY, type House } from "@/lib/village";
import { useVillageState, useVillageStore } from "@/store/VillageStoreProvider";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function VillageView({ villageId, isNew = false }: { villageId: string; isNew?: boolean }) {
  const router = useRouter();
  const store = useVillageStore();
  const state = useVillageState();
  const village = state.villages[villageId];
  const status = state.status[villageId];
  const simulated = store.isLocal(villageId);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // After creation (?new=1), prompt the owner to claim the first house (slot 0).
  const [claimSlot, setClaimSlot] = useState<number | null>(isNew ? 0 : null);
  const [claimIntro, setClaimIntro] = useState<string | undefined>(
    isNew ? "마을이 생겼어요! 첫 번째 집을 지어 불을 켜 볼까요?" : undefined,
  );
  const [frameHouseId, setFrameHouseId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [igniteSlot, setIgniteSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const myHouseId = state.myHouses[villageId] ?? null;
  const myHouse = village?.houses.find((h) => h.id === myHouseId) ?? null;
  const isOwner = state.ownedVillages.includes(villageId);
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
        <h1 className="text-xl font-bold text-night">마을을 불러오지 못했어요</h1>
        <p className="text-sm text-night/70">연결 상태를 확인하고 다시 시도해 주세요.</p>
        <button type="button" onClick={refresh} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
          다시 시도
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
        <h1 className="text-xl font-bold text-night">마을을 찾을 수 없어요</h1>
        <p className="text-sm leading-relaxed text-night/70">
          링크가 잘못되었거나 마을이 삭제되었을 수 있어요.
          {simulated && " 시뮬레이션 모드에서는 마을이 만든 브라우저 탭에만 임시로 저장돼서 다른 기기에서는 열리지 않아요."}
        </p>
        <div className="flex w-full flex-col gap-2">
          <Link href="/create" className="flex min-h-12 items-center justify-center rounded-2xl bg-night font-bold text-ivory">
            새 마을 만들기
          </Link>
          <Link href={villagePath(SAMPLE_VILLAGE_ID)} className="flex min-h-12 items-center justify-center rounded-2xl bg-white font-semibold text-night">
            샘플 마을 둘러보기
          </Link>
        </div>
      </main>
    );
  }

  const full = isFull(village);
  const free = freeSlots(village);

  function openSlot(slot: number) {
    const house = houseAt(village!, slot);
    if (house) {
      setFrameHouseId(house.id);
      return;
    }
    if (myHouse) {
      notify("이미 이 마을에 내 집이 있어요. 친구를 초대해 빈 집을 채워 주세요!");
      return;
    }
    setClaimIntro(undefined);
    setClaimSlot(slot);
  }

  function onClaimed(house: House, photoError?: string) {
    setClaimSlot(null);
    setIgniteSlot(house.slot);
    notify(
      photoError
        ? `집은 완성됐지만 사진을 올리지 못했어요. ${photoError} 내 집을 눌러 다시 올려 주세요.`
        : `${house.nickname}님의 집에 불이 켜졌어요!`,
    );
    setTimeout(() => setIgniteSlot(null), 1200);
    const nowFull = store.getState().villages[villageId]?.houses.length === VILLAGE_CAPACITY;
    if (nowFull) setTimeout(() => setShareOpen(true), prefersReducedMotion() ? 0 : 900);
  }

  function simulateFriend() {
    const result = store.simulateFriendClaim(villageId);
    if (result.ok) {
      setIgniteSlot(result.house.slot);
      setTimeout(() => setIgniteSlot(null), 1200);
      notify(`(시뮬레이션) ${result.house.nickname}님이 입주했어요.`);
      const after = store.getState().villages[villageId];
      if (after && isFull(after)) setTimeout(() => setShareOpen(true), prefersReducedMotion() ? 0 : 900);
    } else notify("빈 집이 없어요.");
  }

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        <header className="flex items-center gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            aria-label="처음 화면으로"
            className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5"
          >
            ←
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold text-night">{village.name}</h1>
          <OverflowMenu
            onShareCard={() => setShareOpen(true)}
            onSimulateFriend={full || !simulated ? undefined : simulateFriend}
            onResetSample={village.isSample ? () => (store.resetSample(), notify("샘플 마을을 처음 상태로 되돌렸어요.")) : undefined}
            onDeleteVillage={isOwner && !village.isSample ? () => setDeleteOpen(true) : undefined}
          />
        </header>

        <div className="flex items-center justify-between gap-2 px-4 pt-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-night" aria-live="polite">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">
              <span className="sr-only">입주한 집 </span>
              {village.houses.length}/{VILLAGE_CAPACITY}
            </span>
            <span className="font-normal text-night/70">
              {full ? "마을이 완성됐어요" : village.houses.length === 0 ? "빈 집에 불을 켜주세요" : `빈 집 ${free.length}채`}
            </span>
          </p>
          {simulated && <SimulatedBadge />}
        </div>

        <main className="flex flex-1 flex-col justify-center px-1">
          <VillageScene
            village={village}
            myHouseId={myHouseId}
            igniteSlot={igniteSlot}
            onSelectSlot={openSlot}
            className="rounded-3xl"
          />
          <p className="px-4 text-center text-xs text-night/60">
            {full ? "집을 눌러 친구들의 사진 액자를 열어 보세요." : "불 켜진 집을 누르면 사진 액자가, 빈 집을 누르면 내 집 만들기가 열려요."}
          </p>
          {refreshFailed && (
            <p role="status" className="mx-4 mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-xs text-night">
              연결이 불안정해요. 마지막으로 불러온 마을을 보여 드리고 있어요.
            </p>
          )}
          {state.persistWarning && simulated && (
            <p role="alert" className="mx-4 mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-xs text-night">
              {state.persistWarning}
            </p>
          )}
        </main>

        <nav
          aria-label="마을 동작"
          className="sticky bottom-0 grid grid-cols-2 gap-2 bg-gradient-to-t from-sky via-sky to-sky/0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {full ? (
            <>
              <button type="button" onClick={() => setShareOpen(true)} className="min-h-12 rounded-2xl bg-night font-bold text-ivory">
                공유 카드 만들기
              </button>
              <Link href="/create" className="flex min-h-12 items-center justify-center rounded-2xl bg-white font-semibold text-night">
                새 마을 만들기
              </Link>
            </>
          ) : (
            <>
              {myHouse ? (
                <button
                  type="button"
                  onClick={() => setFrameHouseId(myHouse.id)}
                  className="min-h-12 rounded-2xl bg-white font-semibold text-night shadow-sm"
                >
                  내 집 보기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openSlot(free[0])}
                  className="min-h-12 rounded-2xl bg-night font-bold text-ivory shadow-sm"
                >
                  내 집 만들기
                </button>
              )}
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className={`min-h-12 rounded-2xl font-bold shadow-sm ${myHouse ? "bg-night text-ivory" : "bg-white text-night"}`}
              >
                친구 초대
              </button>
            </>
          )}
        </nav>
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
        intro={claimIntro}
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
          notify(`${h.nickname}님의 집을 비웠어요.`);
          return null;
        }}
      />
      <InviteSheet village={village} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ShareSheet village={village} open={shareOpen} onClose={() => setShareOpen(false)} />
      <BottomSheet
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        title="마을을 삭제할까요?"
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
            {deleting ? "삭제하는 중…" : "마을과 모든 집 삭제하기"}
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-night">
          {village.name}의 집 {village.houses.length}채와 사진, 메시지가 모두 지워지고 되돌릴 수 없어요.
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
}: {
  onShareCard: () => void;
  onSimulateFriend?: () => void;
  onResetSample?: () => void;
  onDeleteVillage?: () => void;
}) {
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
        aria-label="더보기 메뉴"
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
            공유 카드 보기
          </button>
          {onSimulateFriend && (
            <button type="button" className={item} onClick={run(onSimulateFriend)}>
              친구 입주 시뮬레이션
            </button>
          )}
          {onResetSample && (
            <button type="button" className={item} onClick={run(onResetSample)}>
              샘플 마을 초기화
            </button>
          )}
          <Link href="/create" className={item}>
            새 마을 만들기
          </Link>
          {onDeleteVillage && (
            <button type="button" className={`${item} text-[#B5523B]`} onClick={run(onDeleteVillage)}>
              마을 삭제…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VillageSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="마을을 불러오는 중"
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-4 pt-4"
    >
      <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-white/80 motion-reduce:animate-none" />
      <div className="h-6 w-24 animate-pulse rounded-full bg-white/80 motion-reduce:animate-none" />
      <div className="aspect-square w-full animate-pulse rounded-3xl bg-white/70 motion-reduce:animate-none" />
      <span className="sr-only">마을을 불러오는 중이에요…</span>
    </main>
  );
}
