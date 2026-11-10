/**
 * Snow Village domain model — M0 (mock, client-side only).
 *
 * Pure functions: no I/O, no randomness unless injected. The M1 backend must
 * re-implement every rule here server-side (atomic slot claim, validation);
 * these client checks are UX only, never an authorization boundary.
 */

/**
 * Village size (owner decision 2026-11-10, docs/11-village-expansion-plan.md): free villages hold 6
 * houses; each paid step adds 3, up to 60. The server (snowvill_upgrade_village) is the arbiter.
 */
export const FREE_CAPACITY = 6;
export const EXPANSION_STEP = 3;
export const MAX_CAPACITY = 60;
/** Number of lots in the map (the largest possible village). */
export const VILLAGE_CAPACITY = MAX_CAPACITY;

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
export const TIER_PRICE_KRW: Record<1 | 2 | 3 | 4, number> = { 1: 2900, 2: 6900, 3: 12900, 4: 25800 };
export const VILLAGE_NAME_MAX = 20;
export const NICKNAME_MAX = 10;
export const MESSAGE_MAX = 60;

export const HOUSE_STYLES = [
  "wood", "brick", "bakery", "tower", "gingerbread", "timber", "aframe", "windmill", "greenhouse", "sage", "indigo",
] as const;
export type HouseStyle = (typeof HOUSE_STYLES)[number];

export const HOUSE_STYLE_LABEL: Record<HouseStyle, string> = {
  wood: "통나무집",
  brick: "벽돌집",
  bakery: "빵집",
  tower: "탑 집",
  gingerbread: "진저브레드 집",
  timber: "반목조 집",
  aframe: "산장",
  windmill: "풍차 집",
  greenhouse: "온실 집",
  sage: "세이지 집",
  indigo: "인디고 집",
};

/** Door direction: 0 front-left, 1 front-right, 2 back-right, 3 back-left (village-geometry.json). */
export type Direction = 0 | 1 | 2 | 3;
export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3];
export const DIRECTION_LABEL: Record<Direction, string> = { 0: "왼쪽 앞", 1: "오른쪽 앞", 2: "오른쪽 뒤", 3: "왼쪽 뒤" };
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
  /** 6 (free), then 9, 12, … 60 after paid expansion steps. */
  capacity: number;
  /** True for the bundled demo village (simulated sample data). */
  isSample?: boolean;
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
  if (!value) return { ok: false, error: "마을 이름을 입력해 주세요." };
  if (charLength(value) > VILLAGE_NAME_MAX)
    return { ok: false, error: `마을 이름은 ${VILLAGE_NAME_MAX}자 이내로 적어 주세요.` };
  return { ok: true, value };
}

export function validateHouseInput(
  input: HouseInput,
): { ok: true; value: Omit<House, "id" | "slot" | "createdAt" | "hasPhoto"> } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const nickname = sanitizeText(input.nickname ?? "");
  const message = sanitizeText(input.message ?? "", { multiline: true });

  if (!nickname) errors.nickname = "닉네임을 입력해 주세요.";
  else if (charLength(nickname) > NICKNAME_MAX) errors.nickname = `닉네임은 ${NICKNAME_MAX}자 이내로 적어 주세요.`;

  if (!isHouseStyle(input.style)) errors.style = "집 모양을 골라 주세요.";
  const direction = input.direction ?? 0;
  if (!isDirection(direction)) errors.direction = "문 방향을 골라 주세요.";

  if (charLength(message) > MESSAGE_MAX) errors.message = `메시지는 ${MESSAGE_MAX}자 이내로 적어 주세요.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { nickname, style: input.style as HouseStyle, direction: direction as Direction, message, photo: input.photo ?? null },
  };
}

export function createVillage(name: string, id: string, now: Date): Village {
  const result = validateVillageName(name);
  if (!result.ok) throw new Error(result.error);
  return { id, name: result.value, createdAt: now.toISOString(), houses: [], capacity: FREE_CAPACITY };
}

export function isSlotValid(slot: number, capacity: number = VILLAGE_CAPACITY): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < Math.min(capacity, MAX_CAPACITY);
}

export function houseAt(village: Village, slot: number): House | undefined {
  return village.houses.find((h) => h.slot === slot);
}

function emptySlots(village: Village): number[] {
  const taken = new Set(village.houses.map((h) => h.slot));
  return Array.from({ length: Math.min(village.capacity, MAX_CAPACITY) }, (_, i) => i).filter((i) => !taken.has(i));
}

/** Lots that can be claimed now (lots 0…capacity-1 without a house; none once the village is full). */
export function freeSlots(village: Village): number[] {
  return isFull(village) ? [] : emptySlots(village);
}

/** The next expansion's lots, drawn locked on the map (capacity … capacity+2). */
export function lockedSlots(village: Village): number[] {
  if (village.capacity >= MAX_CAPACITY) return [];
  return Array.from({ length: EXPANSION_STEP }, (_, i) => village.capacity + i);
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
  if (!isSlotValid(slot, village.capacity)) return { ok: false, reason: "INVALID_SLOT" };
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

/** Simulated sample: a 15-house village with 7 houses, no photos. */
export function createSampleVillage(now: Date = new Date("2026-12-01T09:00:00+09:00")): Village {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
  return {
    id: SAMPLE_VILLAGE_ID,
    name: "눈송이 마을 (샘플)",
    createdAt: at(0),
    capacity: 15,
    isSample: true,
    houses: [
      { id: "sample-1", slot: 0, nickname: "하늘", style: "brick", direction: 0, photo: null, hasPhoto: false, message: "올해도 고마웠어! 메리 크리스마스 🎄", createdAt: at(1) },
      { id: "sample-2", slot: 1, nickname: "도윤", style: "bakery", direction: 1, photo: null, hasPhoto: false, message: "따뜻한 겨울 보내자", createdAt: at(30) },
      { id: "sample-3", slot: 2, nickname: "서연", style: "gingerbread", direction: 2, photo: null, hasPhoto: false, message: "", createdAt: at(95) },
      { id: "sample-4", slot: 3, nickname: "민준", style: "tower", direction: 3, photo: null, hasPhoto: false, message: "", createdAt: at(120) },
      { id: "sample-5", slot: 4, nickname: "지우", style: "windmill", direction: 0, photo: null, hasPhoto: false, message: "", createdAt: at(150) },
      { id: "sample-6", slot: 5, nickname: "하준", style: "greenhouse", direction: 1, photo: null, hasPhoto: false, message: "", createdAt: at(170) },
      { id: "sample-7", slot: 7, nickname: "유나", style: "aframe", direction: 2, photo: null, hasPhoto: false, message: "", createdAt: at(200) },
    ],
  };
}
