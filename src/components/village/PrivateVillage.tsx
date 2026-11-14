"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { SignInSheet } from "@/components/account/SignInSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useT } from "@/lib/i18n/I18nProvider";
import type { Member } from "@/lib/remote";
import type { Village } from "@/lib/village";
import { JOIN_NICKNAME_MAX } from "@/store/villageStore";
import { useVillageState, useVillageStore } from "@/store/VillageStoreProvider";

/** A private village this visitor may not see yet: name, then sign-in → nickname → 입주 신청, or waiting. */
export function LockedVillage({ village }: { village: Village }) {
  const t = useT();
  const store = useVillageStore();
  const { account } = useVillageState();
  const inputId = useId();
  const [signInOpen, setSignInOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = village.me?.role === "pending";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await store.requestJoin(village.id, nickname);
    setBusy(false);
    if (!r.ok) setError(r.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-2 pt-[max(0.5rem,env(safe-area-inset-top))]" data-testid="locked-village">
      <header className="flex items-center">
        <Link href="/" aria-label={t("common.home")} className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5">
          ←
        </Link>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <p className="text-5xl" aria-hidden>
          🔒
        </p>
        <h1 className="text-2xl font-extrabold text-night">{village.name}</h1>
        <span className="rounded-full border border-night/25 px-3 py-0.5 text-xs font-semibold text-night/70">{t("private.badge")}</span>

        <div className="mt-4 w-full max-w-[360px]">
          {pending ? (
            <p role="status" className="rounded-2xl bg-white px-4 py-4 font-semibold text-night shadow-sm">
              {t("private.waiting")}
            </p>
          ) : !account ? (
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory shadow-sm"
            >
              {t("auth.signIn")}
            </button>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2 text-left">
              <label htmlFor={inputId} className="text-sm font-semibold text-night">
                {t("claim.nickname")}
              </label>
              <input
                id={inputId}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={JOIN_NICKNAME_MAX}
                autoComplete="nickname"
                className="min-h-12 rounded-2xl border border-night/15 bg-white px-4 text-base text-night"
              />
              <button
                type="submit"
                disabled={busy || nickname.trim().length === 0}
                className="min-h-12 rounded-2xl bg-night font-bold text-ivory shadow-sm disabled:opacity-50"
              >
                {t("private.join")}
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
              {error}
            </p>
          )}
        </div>
      </div>
      <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}

/** Owner: join requests (승인 / 거절) and approved members (내보내기). */
export function MembersSheet({ villageId, open, onClose }: { villageId: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const store = useVillageStore();
  const members: Member[] = useVillageState().members[villageId] ?? [];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    store.loadMembers(villageId).then((r) => !r.ok && setError(r.message));
  }, [open, store, villageId]);

  async function decide(m: Member, approve: boolean) {
    setBusy(m.userId);
    setError(null);
    const r = await store.decideMember(villageId, m.userId, approve);
    setBusy(null);
    if (!r.ok) setError(r.message);
  }

  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");
  const row = "flex min-h-14 items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm";
  const small = "min-h-10 rounded-full px-3.5 text-sm font-semibold disabled:opacity-50";

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={t("members.title")}
    >
      <div className="flex flex-col gap-5 pb-2" data-testid="members-sheet">
        <section aria-labelledby="members-requests">
          <h3 id="members-requests" className="mb-2 text-sm font-bold text-night/70">
            {t("members.requests")} {pending.length > 0 && <span className="text-[#B5523B]">{pending.length}</span>}
          </h3>
          {pending.length === 0 ? (
            <p className="text-sm text-night/55">{t("members.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((m) => (
                <li key={m.userId} className={row}>
                  <span className="min-w-0 flex-1 truncate font-semibold text-night">{m.nickname}</span>
                  <button type="button" disabled={busy === m.userId} onClick={() => decide(m, false)} className={`${small} bg-night/5 text-night`}>
                    {t("members.decline")}
                  </button>
                  <button type="button" disabled={busy === m.userId} onClick={() => decide(m, true)} className={`${small} bg-night text-ivory`}>
                    {t("members.approve")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="members-approved">
          <h3 id="members-approved" className="mb-2 text-sm font-bold text-night/70">
            {t("members.list")}
          </h3>
          {approved.length === 0 ? (
            <p className="text-sm text-night/55">{t("members.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {approved.map((m) => (
                <li key={m.userId} className={row}>
                  <span className="min-w-0 flex-1 truncate font-semibold text-night">{m.nickname}</span>
                  <button type="button" disabled={busy === m.userId} onClick={() => decide(m, false)} className={`${small} bg-night/5 text-[#B5523B]`}>
                    {t("members.remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {error && (
          <p role="alert" className="rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
