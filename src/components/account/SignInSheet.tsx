"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { INTL_LOCALE } from "@/lib/i18n";
import { useT } from "@/lib/i18n/I18nProvider";
import { appleAvailable, appleSignIn, preloadApple, renderGoogleButton } from "@/lib/signInProviders";
import { useVillageStore } from "@/store/VillageStoreProvider";

/** Google + Apple sign-in. Apple is offered on the production domain only (Services ID). */
export function SignInSheet({ open, onClose, onSignedIn }: { open: boolean; onClose: () => void; onSignedIn?: () => void }) {
  const t = useT();
  const store = useVillageStore();
  const googleRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withApple = open && appleAvailable();
  const callbacks = useRef({ onClose, onSignedIn });
  useEffect(() => {
    callbacks.current = { onClose, onSignedIn };
  });

  async function finish(provider: "google" | "apple", idToken: string, nonce: string) {
    setBusy(true);
    setError(null);
    const r = await store.signIn(provider, idToken, nonce);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    callbacks.current.onClose();
    callbacks.current.onSignedIn?.();
  }
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (!open) return;
    if (appleAvailable()) preloadApple().catch(() => undefined);
    const el = googleRef.current;
    if (!el) return;
    let cancelled = false;
    renderGoogleButton(el, {
      locale: INTL_LOCALE[t.locale],
      width: el.clientWidth || 320,
      onToken: ({ idToken, nonce }) => {
        if (!cancelled) void finishRef.current("google", idToken, nonce);
      },
    }).catch(() => {
      if (!cancelled) setError(t("auth.failed"));
    });
    return () => {
      cancelled = true;
    };
  }, [open, t]);

  async function onApple() {
    setError(null);
    let r;
    try {
      r = await appleSignIn();
    } catch {
      return; // popup closed
    }
    await finish("apple", r.idToken, r.nonce);
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={t("auth.signIn")}
    >
      <div className="flex flex-col gap-3 pb-2" aria-busy={busy}>
        <div ref={googleRef} data-testid="google-button" className="flex min-h-11 w-full justify-center" />
        {withApple && (
          <button
            type="button"
            onClick={onApple}
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            <span aria-hidden className="text-lg leading-none">

            </span>
            {t("auth.apple")}
          </button>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-[#F8E6DD] px-3 py-2 text-sm text-night">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
