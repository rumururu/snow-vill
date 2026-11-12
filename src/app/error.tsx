"use client";

import { useT } from "@/lib/i18n/I18nProvider";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>🌨️</p>
      <h1 className="text-xl font-bold text-night">{t("common.loadFailed")}</h1>
      <p className="text-sm text-night/70">{t("error.tryLater")}</p>
      <button type="button" onClick={reset} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
        {t("common.retry")}
      </button>
    </main>
  );
}
