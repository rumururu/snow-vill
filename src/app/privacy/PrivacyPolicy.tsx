"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import type { Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import PolicyDe from "./policy/de";
import PolicyEn from "./policy/en";
import PolicyEs from "./policy/es";
import PolicyFr from "./policy/fr";
import PolicyId from "./policy/id";
import PolicyJa from "./policy/ja";
import PolicyKo from "./policy/ko";
import PolicyPt from "./policy/pt";
import PolicyRu from "./policy/ru";
import PolicyZh from "./policy/zh";

const POLICY: Record<Locale, ComponentType> = {
  ko: PolicyKo,
  en: PolicyEn,
  ja: PolicyJa,
  zh: PolicyZh,
  es: PolicyEs,
  fr: PolicyFr,
  de: PolicyDe,
  pt: PolicyPt,
  ru: PolicyRu,
  id: PolicyId,
};

export function PrivacyPolicy() {
  const locale = useLocale();
  const t = useT();
  const Policy = POLICY[locale];
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center gap-1">
        <Link href="/" aria-label={t("common.home")} className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5">
          ←
        </Link>
        <span className="text-sm font-semibold text-night/70">Snow Village</span>
      </header>
      <Policy />
    </main>
  );
}
