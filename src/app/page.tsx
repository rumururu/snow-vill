"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";
import { LandingHero } from "@/components/landing/LandingHero";
import { remoteConfig } from "@/lib/remote";
import { villagePath } from "@/lib/share";
import { SAMPLE_VILLAGE_ID } from "@/lib/village";

/** S01 — landing. Invite links (/v/?id=…) bypass this page. */
export default function LandingPage() {
  const t = useT();
  const online = Boolean(remoteConfig());
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">❄️</span>
        <span className="text-lg font-extrabold tracking-tight text-night">Snow Village</span>
        <span className="ml-auto rounded-full border border-dashed border-night/40 px-2.5 py-1 text-[11px] font-semibold text-night/70">
          {online ? t("landing.beta") : t("landing.simulation")}
        </span>
      </header>

      <section className="mt-6" aria-labelledby="hero-title">
        <h1 id="hero-title" className="text-[28px] font-extrabold leading-tight text-night min-[400px]:text-[32px]">
          {t("landing.titleLine1")}
          <br />
          {t("landing.titleLine2")}
        </h1>
      </section>

      <LandingHero />

      <div className="mt-6 space-y-3">
        <Link
          href="/create"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-night text-lg font-bold text-ivory shadow-md"
        >
          {t("landing.cta")}
        </Link>
        <p className="text-center text-sm text-night/70">{t("landing.noSignup")}</p>
        <Link
          href={villagePath(SAMPLE_VILLAGE_ID)}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-white/80 text-base font-semibold text-night"
        >
          {t("common.browseSample")}
        </Link>
        <p className="text-center text-[11px] leading-relaxed text-night/55">
          <Link href="/privacy/" className="underline underline-offset-2">
            {t("common.privacy")}
          </Link>
          {" · "}
          {online
            ? t("landing.footerOnline")
            : t("landing.footerOffline")}
        </p>
      </div>
    </main>
  );
}
