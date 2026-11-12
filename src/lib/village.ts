/**
 * Snow Village domain model — M0 (mock, client-side only).
 *
 * Pure functions: no I/O, no randomness unless injected. The M1 backend must
 * re-implement every rule here server-side (atomic slot claim, validation);
 * these client checks are UX only, never an authorization boundary.
 */
import { tr, trList } from "./i18n";

/**
 * Village size (owner decision 2026-11-10, docs/11-village-expansion-plan.md): free villages hold 6
 * houses; each paid step adds 3, up to 60. The server (snowvill_upgrade_village) is the arbiter.
 */
export const FREE_CAPACITY = 6;
export const EXPANSION_STEP = 3;
export const MAX_CAPACITY = 60;
/** Number of lots in the map (the largest possible village). */
export const VILLAGE_CAPACITY = MAX_CAPACITY;

/** Districts ("동네") of 6 lots; lots of district d are slots d*6 … d*6+5, opened in halves of 3. */
export const DISTRICT_COUNT = 10;
export const DISTRICT_SIZE = 6;
/** Free village: district 0, both halves. */
export const FREE_OPEN_HALVES = 0b11;

export function halfOf(slot: number): number {
  return Math.floor(slot / EXPANSION_STEP);
}
export function isHalfOpen(openHalves: number, slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < MAX_CAPACITY && ((openHalves >> halfOf(slot)) & 1) === 1;
}
/** 0 = closed, 1 = first half open, 2 = fully open. */
export function districtState(openHalves: number, district: number): 0 | 1 | 2 {
  const bits = (openHalves >> (2 * district)) & 3;
  return bits === 3 ? 2 : bits ? 1 : 0;
}
/** openHalves after opening the next half of `district` (same as the server), or null when it is full. */
export function openNextHalf(openHalves: number, district: number): number | null {
  if (!Number.isInteger(district) || district < 0 || district >= DISTRICT_COUNT) return null;
  const a = 2 * district;
  if (((openHalves >> a) & 1) === 0) return openHalves | (1 << a);
  if (((openHalves >> (a + 1)) & 1) === 0) return openHalves | (1 << (a + 1));
  return null;
}
export function capacityOf(openHalves: number): number {
  let n = 0;
  for (let b = openHalves; b; b &= b - 1) n++;
  return n * EXPANSION_STEP;
}
/** Halves in district order up to `capacity` (old rows / bad data fallback). */
export function halvesForCapacity(capacity: number): number {
  const n = Math.max(2, Math.min(MAX_CAPACITY / EXPANSION_STEP, Math.round(capacity / EXPANSION_STEP)));
  return (1 << n) - 1;
}

/** Price tier of the next step for a village of this size (0 = already at the maximum). */
export function stepTier(capacity: number): 0 | 1 | 2 | 3 | 4 {
  if (capacity >= MAX_CAPACITY) return 0;
  if (capacity <= 6) return 1;
  if (capacity === 9) return 2;
  if (capacity === 12) return 3;
  return 4;
}
/** Store product per tier (same ids in App Store, Google Play, RevenueCat and the server). */
export const TIER_PRODUCT: Record<1 | 2 | 3 | 4, string> = {
  1: "snowvillage_big_village",
  2: "snowvillage_expand_2",
  3: "snowvillage_expand_3",
  4: "snowvillage_expand_4",
};
/** Korean list price per tier (the stores show the localized price). */
export const TIER_PRICE_KRW: Record<1 | 2 | 3 | 4, number> = { 1: 2900, 2: 6900, 3: 12900, 4: 25900 };
export const VILLAGE_NAME_MAX = 20;
export const NICKNAME_MAX = 10;
export const MESSAGE_MAX = 60;

export const HOUSE_STYLES = [
  "wood", "brick", "bakery", "tower", "gingerbread", "timber", "aframe", "windmill", "greenhouse", "sage", "indigo",
] as const;
export type HouseStyle = (typeof HOUSE_STYLES)[number];

/** House type names come from village-geometry.json (houses.<style>.label.<lang>): see houseStyleLabel() in ./map. */

/** Door direction: 0 front-left, 1 front-right, 2 back-right, 3 back-left (village-geometry.json). */
export type Direction = 0 | 1 | 2 | 3;
export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3];
export function isDirection(v: unknown): v is Direction {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

export interface House {
  id: string;
  slot: number;
  nickname: string;
  style: HouseStyle;
  /** Which way the door faces (chosen when moving in). */
  direction: Direction;
  /**
   * M0 only: a locally re-encoded data URL kept in this browser session.
   * M1 replaces this with a private storage id served via short-lived signed URLs.
   */
  photo: string | null;
  /** True when a photo exists (remote: stored privately, fetched via short-lived signed URL). */
  hasPhoto: boolean;
  message: string;
  createdAt: string;
}

export interface Village {
  id: string;
  name: string;
  createdAt: string;
  houses: House[];
  /** 6 (free), then 9, 12, … 60 after paid expansion steps (= 3 × opened halves). */
  capacity: number;
  /** Opened district halves (bit 2d = first half of district d, 2d+1 = second half). */
  openHalves: number;
  /** True for the bundled demo village (simulated sample data). */
  isSample?: boolean;
  /** One path style for the whole village (owner's choice; default dirt). */
  pathStyle?: PathStyle;
  /** Decorations the owner moved: decoration id → ground spot (tiles). */
  decor?: DecorSpots;
}

/** Path styles the owner can pick (docs/11-village-expansion-plan.md, "Village look"). */
export const PATH_STYLES = ["dirt", "stones", "brick", "snow"] as const;
export type PathStyle = (typeof PATH_STYLES)[number];
export function isPathStyle(v: unknown): v is PathStyle {
  return typeof v === "string" && (PATH_STYLES as readonly string[]).includes(v);
}
export type DecorSpots = Record<string, [number, number]>;
/** Ids of decorations the owner may move (plaza lamps/bench, district decoration). Same rule on the server. */
export const MOVABLE_DECOR_ID = /^(plaza-(lamp-a|lamp-b|bench)|d[0-9]-decor[0-9]{1,2})$/;

/** Server/stored decor → only well-formed entries (unknown ids and bad numbers dropped). */
export function cleanDecor(raw: unknown): DecorSpots {
  const out: DecorSpots = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!MOVABLE_DECOR_ID.test(k) || !Array.isArray(v) || v.length !== 2) continue;
    const [i, j] = v;
    if (typeof i === "number" && typeof j === "number" && Math.abs(i) <= 40 && Math.abs(j) <= 40) out[k] = [i, j];
  }
  return out;
}

export interface HouseInput {
  nickname: string;
  style: string;
  direction?: number;
  message?: string;
  photo?: string | null;
}

export type FieldErrors = Partial<Record<"nickname" | "style" | "direction" | "message", string>>;

export type ClaimResult =
  | { ok: true; village: Village; house: House }
  | { ok: false; reason: "INVALID_SLOT" | "SLOT_TAKEN" | "VILLAGE_FULL" }
  | { ok: false; reason: "INVALID_INPUT"; errors: FieldErrors };

/**
 * Count Unicode code points — the same unit as PostgreSQL char_length(), so client and
 * server limits agree. (Hangul syllables and most emoji count as 1; ZWJ emoji sequences count more.)
 */
export function charLength(text: string): number {
  return Array.from(text).length;
}

/** Strip control characters, collapse whitespace and trim. Rendering is escaped by React. */
export function sanitizeText(raw: string, { multiline = false } = {}): string {
  const noControl = raw.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  const collapsed = multiline
    ? noControl.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
    : noControl.replace(/\s+/g, " ");
  return collapsed.trim();
}

export function isHouseStyle(value: unknown): value is HouseStyle {
  return typeof value === "string" && (HOUSE_STYLES as readonly string[]).includes(value);
}

export function validateVillageName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = sanitizeText(raw);
  if (!value) return { ok: false, error: tr("err.villageNameRequired") };
  if (charLength(value) > VILLAGE_NAME_MAX)
    return { ok: false, error: tr("err.villageNameTooLong", { max: VILLAGE_NAME_MAX }) };
  return { ok: true, value };
}

export function validateHouseInput(
  input: HouseInput,
): { ok: true; value: Omit<House, "id" | "slot" | "createdAt" | "hasPhoto"> } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const nickname = sanitizeText(input.nickname ?? "");
  const message = sanitizeText(input.message ?? "", { multiline: true });

  if (!nickname) errors.nickname = tr("err.nicknameRequired");
  else if (charLength(nickname) > NICKNAME_MAX) errors.nickname = tr("err.nicknameTooLong", { max: NICKNAME_MAX });

  if (!isHouseStyle(input.style)) errors.style = tr("err.styleRequired");
  const direction = input.direction ?? 0;
  if (!isDirection(direction)) errors.direction = tr("err.directionRequired");

  if (charLength(message) > MESSAGE_MAX) errors.message = tr("err.messageTooLong", { max: MESSAGE_MAX });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { nickname, style: input.style as HouseStyle, direction: direction as Direction, message, photo: input.photo ?? null },
  };
}

export function createVillage(name: string, id: string, now: Date): Village {
  const result = validateVillageName(name);
  if (!result.ok) throw new Error(result.error);
  return { id, name: result.value, createdAt: now.toISOString(), houses: [], capacity: FREE_CAPACITY, openHalves: FREE_OPEN_HALVES };
}

export function isSlotValid(slot: number, capacity: number = VILLAGE_CAPACITY): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < Math.min(capacity, MAX_CAPACITY);
}

export function houseAt(village: Village, slot: number): House | undefined {
  return village.houses.find((h) => h.slot === slot);
}

/** Every opened lot (slots of opened halves), in slot order. */
export function openSlots(village: Pick<Village, "openHalves">): number[] {
  return Array.from({ length: MAX_CAPACITY }, (_, i) => i).filter((i) => isHalfOpen(village.openHalves, i));
}

function emptySlots(village: Village): number[] {
  const taken = new Set(village.houses.map((h) => h.slot));
  return openSlots(village).filter((i) => !taken.has(i));
}

/** Lots that can be claimed now (lots 0…capacity-1 without a house; none once the village is full). */
export function freeSlots(village: Village): number[] {
  return isFull(village) ? [] : emptySlots(village);
}

/** Lots not yet opened (closed districts or second halves). */
export function lockedSlots(village: Pick<Village, "openHalves">): number[] {
  return Array.from({ length: MAX_CAPACITY }, (_, i) => i).filter((i) => !isHalfOpen(village.openHalves, i));
}

/** How many more houses can move in (capacity minus houses) — not the number of empty lots. */
export function remainingHouses(village: Village): number {
  return Math.max(village.capacity - village.houses.length, 0);
}

export function isFull(village: Village): boolean {
  return village.houses.length >= village.capacity;
}

export function canUpgrade(village: Village): boolean {
  return village.capacity < MAX_CAPACITY;
}

/**
 * Claim a slot. Returns a new village (immutable). Mirrors the M1 rule
 * UNIQUE(village_id, slot) + capacity 8; the server is the real arbiter.
 */
export function claimHouse(
  village: Village,
  slot: number,
  input: HouseInput,
  opts: { id: string; now: Date },
): ClaimResult {
  if (isFull(village)) return { ok: false, reason: "VILLAGE_FULL" };
  if (!isHalfOpen(village.openHalves, slot)) return { ok: false, reason: "INVALID_SLOT" };
  if (houseAt(village, slot)) return { ok: false, reason: "SLOT_TAKEN" };

  const validated = validateHouseInput(input);
  if (!validated.ok) return { ok: false, reason: "INVALID_INPUT", errors: validated.errors };

  const house: House = {
    id: opts.id,
    slot,
    createdAt: opts.now.toISOString(),
    ...validated.value,
    hasPhoto: Boolean(validated.value.photo),
  };
  const houses = [...village.houses, house].sort((a, b) => a.slot - b.slot);
  return { ok: true, village: { ...village, houses }, house };
}

export function removeHouse(village: Village, houseId: string): Village {
  return { ...village, houses: village.houses.filter((h) => h.id !== houseId) };
}

export const SAMPLE_VILLAGE_ID = "demo";

/** Simulated sample: a 15-house village with 7 houses, no photos (names/messages in the active language). */
export function createSampleVillage(now: Date = new Date("2026-12-01T09:00:00+09:00")): Village {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
  const names = trList("sample.names");
  const name = (i: number) => names[i] ?? `#${i + 1}`;
  return {
    id: SAMPLE_VILLAGE_ID,
    name: tr("sample.name"),
    createdAt: at(0),
    capacity: 15,
    // Districts 0 and 1 fully open, district 2 (Santa) half open.
    openHalves: 0b11111,
    isSample: true,
    houses: [
      { id: "sample-1", slot: 0, nickname: name(0), style: "brick", direction: 0, photo: null, hasPhoto: false, message: tr("sample.message1"), createdAt: at(1) },
      { id: "sample-2", slot: 1, nickname: name(1), style: "bakery", direction: 1, photo: null, hasPhoto: false, message: tr("sample.message2"), createdAt: at(30) },
      { id: "sample-3", slot: 2, nickname: name(2), style: "gingerbread", direction: 2, photo: null, hasPhoto: false, message: "", createdAt: at(95) },
      { id: "sample-4", slot: 3, nickname: name(3), style: "tower", direction: 3, photo: null, hasPhoto: false, message: "", createdAt: at(120) },
      { id: "sample-5", slot: 4, nickname: name(4), style: "windmill", direction: 0, photo: null, hasPhoto: false, message: "", createdAt: at(150) },
      { id: "sample-6", slot: 5, nickname: name(5), style: "greenhouse", direction: 1, photo: null, hasPhoto: false, message: "", createdAt: at(170) },
      { id: "sample-7", slot: 7, nickname: name(6), style: "aframe", direction: 2, photo: null, hasPhoto: false, message: "", createdAt: at(200) },
    ],
  };
}
