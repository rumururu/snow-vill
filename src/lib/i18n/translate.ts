import { DEFAULT_LOCALE, detectLocale, INTL_LOCALE, type Locale } from "./locales";
import { MESSAGES, type Message, type MessageKey } from "./messages";

export type Params = Record<string, string | number>;

const pluralRules = new Map<Locale, Intl.PluralRules>();
function pluralCategory(locale: Locale, n: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale);
  if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(INTL_LOCALE[locale])));
  return rules.select(n);
}

function pick(message: Message, locale: Locale, params?: Params): string {
  if (typeof message === "string") return message;
  const n = Number(params?.count ?? 0);
  return message[pluralCategory(locale, n)] ?? message.other;
}

/** `{name}` placeholders → params (unknown placeholders are left as they are). */
export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Message `key` in `locale` with params; plural messages choose their form by `params.count`. */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return interpolate(pick(MESSAGES[locale][key] ?? MESSAGES.ko[key], locale, params), params);
}

/** Raw text of `key` (plural form picked by `count`) without interpolation — for rich (ReactNode) params. */
export function template(locale: Locale, key: MessageKey, count?: number): string {
  return pick(MESSAGES[locale][key] ?? MESSAGES.ko[key], locale, count === undefined ? undefined : { count });
}

/*
 * Active locale for code outside React (store / validation / remote error messages) and the
 * source for the React provider. On the client it is detected once from the browser (and
 * ?lang=); during the static build / server render it is the Korean default.
 */
let active: Locale | null = null;
const listeners = new Set<() => void>();

export function getActiveLocale(): Locale {
  if (active) return active;
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  active = detectLocale(typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [], window.location.search);
  return active;
}

export function setActiveLocale(locale: Locale | null): void {
  active = locale;
  listeners.forEach((l) => l());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translate in the active locale (non-React code). */
export function tr(key: MessageKey, params?: Params): string {
  return translate(getActiveLocale(), key, params);
}

/** Comma/pipe separated list message (sample names, simulated friend messages). */
export function trList(key: MessageKey, sep = ","): string[] {
  return tr(key).split(sep).map((s) => s.trim());
}
