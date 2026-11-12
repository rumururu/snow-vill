import type { Locale } from "../locales";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { id } from "./id";
import { ja } from "./ja";
import { ko } from "./ko";
import { pt } from "./pt";
import { ru } from "./ru";
import type { Messages } from "./types";
import { zh } from "./zh";

export type { Message, MessageKey, Messages, Plural } from "./types";

export const MESSAGES: Record<Locale, Messages> = { ko, en, ja, zh, es, fr, de, pt, ru, id };
