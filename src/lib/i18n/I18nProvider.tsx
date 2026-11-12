"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "./locales";
import type { MessageKey } from "./messages";
import { getActiveLocale, subscribeLocale, template, translate, type Params } from "./translate";

const LocaleContext = createContext<Locale | null>(null);

/**
 * Static export: the HTML is rendered in Korean; on the client the browser language (or ?lang=)
 * takes over right after hydration (useSyncExternalStore's server snapshot keeps hydration stable).
 */
function useActiveLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getActiveLocale, () => DEFAULT_LOCALE);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useActiveLocale();
  useEffect(() => {
    document.documentElement.lang = INTL_LOCALE[locale];
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Current UI language (falls back to the active locale outside a provider, e.g. in unit tests). */
export function useLocale(): Locale {
  const fromContext = useContext(LocaleContext);
  const active = useActiveLocale();
  return fromContext ?? active;
}

export type Translator = ((key: MessageKey, params?: Params) => string) & {
  locale: Locale;
  /** Same as t(), but params may be React nodes (e.g. <b>name</b>); plural form by `count`. */
  rich: (key: MessageKey, params: Record<string, ReactNode>, count?: number) => ReactNode;
};

/** Split `{name}` placeholders and substitute React nodes. */
function richText(text: string, params: Record<string, ReactNode>): ReactNode {
  const parts = text.split(/\{(\w+)\}/g);
  return parts.map((p, i) => (i % 2 === 1 ? <Fragment key={i}>{p in params ? params[p] : `{${p}}`}</Fragment> : p));
}

export function makeTranslator(locale: Locale): Translator {
  const t = ((key: MessageKey, params?: Params) => translate(locale, key, params)) as Translator;
  t.locale = locale;
  t.rich = (key, params, count) => richText(template(locale, key, count), { ...(count === undefined ? {} : { count }), ...params });
  return t;
}

export function useT(): Translator {
  const locale = useLocale();
  return useMemo(() => makeTranslator(locale), [locale]);
}
