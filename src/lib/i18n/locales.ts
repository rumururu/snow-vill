/**
 * Supported UI languages. Korean is the source language; English is the fallback for
 * unsupported browser languages and for geometry names missing in a language.
 */
export const LOCALES = ["ko", "en", "ja", "zh", "es", "fr", "de", "pt", "ru", "id"] as const;
export type Locale = (typeof LOCALES)[number];

/** What the static HTML is rendered in (before the browser language is known). */
export const DEFAULT_LOCALE: Locale = "ko";
export const FALLBACK_LOCALE: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** BCP 47 tag for Intl / <html lang> (zh = Simplified, es = Latin American, pt = Brazilian). */
export const INTL_LOCALE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-419",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ru: "ru-RU",
  id: "id-ID",
};

/** Map one language tag (en-US, zh-Hant-TW, pt-PT, in) to a supported locale, or null. */
export function matchLocale(tag: string): Locale | null {
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (base === "in") return "id"; // legacy Indonesian code (older Android)
  return isLocale(base) ? base : null;
}

/**
 * Pick the UI language: `?lang=xx` (testing / explicit links) first, then the browser's
 * preferred languages in order; anything unsupported falls back to English.
 */
export function detectLocale(languages: readonly string[] = [], search = ""): Locale {
  const forced = new URLSearchParams(search).get("lang");
  if (forced) {
    const m = matchLocale(forced);
    if (m) return m;
  }
  for (const tag of languages) {
    const m = matchLocale(tag);
    if (m) return m;
  }
  return FALLBACK_LOCALE;
}

/** A name given per language (village-geometry.json) in `locale`, falling back to English, then Korean. */
export function localized(names: Partial<Record<string, string>>, locale: Locale): string {
  return names[locale] ?? names[FALLBACK_LOCALE] ?? names.ko ?? "";
}
