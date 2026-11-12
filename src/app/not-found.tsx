"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

export default function NotFound() {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>⛄</p>
      <h1 className="text-xl font-bold text-night">{t("notFound.title")}</h1>
      <Link href="/" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-night font-bold text-ivory">
        {t("notFound.home")}
      </Link>
    </main>
  );
}
