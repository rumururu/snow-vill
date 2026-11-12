import type { ko } from "./ko";

/** Plural forms (Intl.PluralRules categories); chosen by the `count` param. `other` is required. */
export type Plural = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type Message = string | Plural;

/** Every key of the Korean source dictionary. */
export type MessageKey = keyof typeof ko;
/** A translated dictionary: every Korean key, nothing else (missing or extra keys are type errors). */
export type Messages = Record<MessageKey, Message>;
