"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useT } from "@/lib/i18n/I18nProvider";
import { appleAvailable, appleSignIn, preloadApple } from "@/lib/signInProviders";
import { useVillageState, useVillageStore } from "@/store/VillageStoreProvider";
import { SignInSheet } from "./SignInSheet";

/** Header control: 로그인 (guest) or the account sheet with 로그아웃 / 계정 삭제 (signed in). */
export function AccountButton() {
  const t = useT();
  const store = useVillageStore();
  const { account, hydrated } = useVillageState();
  const [signInOpen, setSignInOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated || !store.canSignIn()) return null;

  const isApple = account?.provider === "apple";
  function openAccount() {
    setConfirming(false);
    setError(null);
    setAccountOpen(true);
    if (isApple && appleAvailable()) preloadApple().catch(() => undefined);
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    // Apple: a fresh authorization code lets the server revoke the Apple grant. Best effort.
    let appleCode: string | null = null;
    if (isApple && appleAvailable()) {
      try {
        appleCode = (await appleSignIn()).code;
      } catch {
        appleCode = null;
      }
    }
    const r = await store.deleteAccount(appleCode);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setAccountOpen(false);
  }

  const pill = "min-h-9 rounded-full bg-white/85 px-3.5 text-[13px] font-semibold text-night shadow-sm";
  return (
    <>
      {account ? (
        <button type="button" onClick={openAccount} className={pill} data-testid="account-button">
          {t("auth.account")}
        </button>
      ) : (
        <button type="button" onClick={() => setSignInOpen(true)} className={pill}>
          {t("auth.signIn")}
        </button>
      )}
      <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
      <BottomSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={confirming ? t("auth.deleteAccount") : t("auth.account")}
        footer={
          confirming ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="min-h-12 rounded-2xl bg-white font-semibold text-night shadow-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={deleteAccount}
                className="min-h-12 rounded-2xl bg-[#B5523B] font-bold text-white disabled:opacity-60"
              >
                {busy ? t("auth.deleting") : t("auth.deleteAccount")}
              </button>
            </div>
          ) : undefined
        }
      >
        {confirming ? (
          <p className="text-sm leading-relaxed text-night">{t("auth.deleteWarning")}</p>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {account?.email && <p className="truncate pb-1 text-sm text-night/70">{account.email}</p>}
            <button
              type="button"
              onClick={async () => {
                setAccountOpen(false);
                await store.signOut();
              }}
              className="min-h-12 rounded-2xl bg-white font-semibold text-night shadow-sm"
            >
              {t("auth.signOut")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-11 rounded-2xl text-sm font-semibold text-[#B5523B]"
            >
              {t("auth.deleteAccount")}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
            {error}
          </p>
        )}
      </BottomSheet>
    </>
  );
}
