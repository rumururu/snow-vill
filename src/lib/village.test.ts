import { describe, expect, it } from "vitest";
import {
  charLength,
  claimHouse,
  createSampleVillage,
  createVillage,
  freeSlots,
  isFull,
  MESSAGE_MAX,
  validateHouseInput,
  validateVillageName,
  VILLAGE_CAPACITY,
  MAX_CAPACITY,
  stepTier,
  canUpgrade,
  FREE_CAPACITY,
  lockedSlots,
  type Village,
} from "./village";

const NOW = new Date("2026-12-01T00:00:00Z");
let seq = 0;
const opts = () => ({ id: `h${++seq}`, now: NOW });
const input = (nickname = "민지") => ({ nickname, style: "wood", message: "안녕" });

function emptyVillage(): Village {
  return createVillage("눈송이 마을", "v1", NOW);
}

describe("village name validation", () => {
  it("requires a non-blank name and trims/sanitizes it", () => {
    expect(validateVillageName("   ").ok).toBe(false);
    expect(validateVillageName("  우리\n\t마을  ")).toEqual({ ok: true, value: "우리 마을" });
  });
  it("limits to 20 characters", () => {
    expect(validateVillageName("가".repeat(20)).ok).toBe(true);
    expect(validateVillageName("가".repeat(21)).ok).toBe(false);
  });
});

describe("house input validation", () => {
  it("requires a nickname", () => {
    const r = validateHouseInput({ nickname: "  ", style: "wood" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.nickname).toBeDefined();
  });
  it("only accepts the three house styles", () => {
    expect(validateHouseInput({ nickname: "a", style: "wood" }).ok).toBe(true);
    expect(validateHouseInput({ nickname: "a", style: "sage" }).ok).toBe(true);
    expect(validateHouseInput({ nickname: "a", style: "indigo" }).ok).toBe(true);
    const r = validateHouseInput({ nickname: "a", style: "gold" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.style).toBeDefined();
  });
  it("accepts a 60-character message and rejects 61", () => {
    expect(validateHouseInput({ nickname: "a", style: "wood", message: "눈".repeat(MESSAGE_MAX) }).ok).toBe(true);
    const r = validateHouseInput({ nickname: "a", style: "wood", message: "눈".repeat(MESSAGE_MAX + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.message).toBeDefined();
  });
  it("counts code points like PostgreSQL char_length", () => {
    expect(charLength("눈사람🎄⛄")).toBe(5);
    expect(charLength("👨‍👩‍👧")).toBe(5); // ZWJ sequence = 5 code points
    expect(validateHouseInput({ nickname: "a", style: "wood", message: "🎄".repeat(60) }).ok).toBe(true);
  });
  it("photo is optional", () => {
    const r = validateHouseInput({ nickname: "a", style: "wood" });
    expect(r.ok && r.value.photo).toBe(null);
  });
  it("keeps markup as plain text (rendering escapes it)", () => {
    const r = validateHouseInput({ nickname: "<b>x</b>", style: "wood", message: "<script>alert(1)</script>" });
    expect(r.ok).toBe(true);
  });
});

describe("claimHouse", () => {
  it("claims an empty slot", () => {
    const r = claimHouse(emptyVillage(), 2, input(), opts());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.house.slot).toBe(2);
      expect(r.village.houses).toHaveLength(1);
    }
  });

  it("rejects a second claim of the same slot (collision)", () => {
    const first = claimHouse(emptyVillage(), 4, input("A"), opts());
    if (!first.ok) throw new Error("setup failed");
    const second = claimHouse(first.village, 4, input("B"), opts());
    expect(second).toEqual({ ok: false, reason: "SLOT_TAKEN" });
    expect(first.village.houses.find((h) => h.slot === 4)?.nickname).toBe("A");
  });

  it("does not mutate the input village", () => {
    const v = emptyVillage();
    claimHouse(v, 0, input(), opts());
    expect(v.houses).toHaveLength(0);
  });

  it("free village stops at 6 houses and locks the remaining lots", () => {
    let v = emptyVillage();
    expect(v.capacity).toBe(FREE_CAPACITY);
    for (let slot = 0; slot < FREE_CAPACITY; slot++) {
      const r = claimHouse(v, slot, input(`n${slot}`), opts());
      if (!r.ok) throw new Error(`slot ${slot} failed`);
      v = r.village;
    }
    expect(isFull(v)).toBe(true);
    expect(freeSlots(v)).toEqual([]);
    expect(lockedSlots(v)).toEqual([6, 7, 8]);
    expect(canUpgrade(v)).toBe(true);
    expect(claimHouse(v, 6, input(), opts())).toEqual({ ok: false, reason: "VILLAGE_FULL" });
  });

  it("a fully expanded village holds 60 houses", () => {
    let v: Village = { ...emptyVillage(), capacity: MAX_CAPACITY };
    for (let slot = 0; slot < VILLAGE_CAPACITY; slot++) {
      const r = claimHouse(v, slot, input(`n${slot % 10}`), opts());
      if (!r.ok) throw new Error(`slot ${slot} failed`);
      v = r.village;
    }
    expect(v.houses).toHaveLength(60);
    expect(isFull(v)).toBe(true);
    expect(lockedSlots(v)).toEqual([]);
    expect(canUpgrade(v)).toBe(false);
    expect(claimHouse(v, 0, input(), opts())).toEqual({ ok: false, reason: "VILLAGE_FULL" });
  });

  it("rejects lots outside the village's capacity", () => {
    for (const slot of [-1, 6, 59, 1.5, Number.NaN]) {
      expect(claimHouse(emptyVillage(), slot, input(), opts())).toEqual({ ok: false, reason: "INVALID_SLOT" });
    }
  });

  it("prices each +3 step by size (₩2,900 / 6,900 / 12,900 / then 25,800 up to 60)", () => {
    expect([6, 9, 12, 15, 18, 57, 60].map(stepTier)).toEqual([1, 2, 3, 4, 4, 4, 0]);
  });

  it("keeps the chosen door direction and rejects an invalid one", () => {
    const r = claimHouse(emptyVillage(), 0, { ...input(), direction: 2 }, opts());
    expect(r.ok && r.house.direction).toBe(2);
    const bad = claimHouse(emptyVillage(), 0, { ...input(), direction: 4 }, opts());
    expect(!bad.ok && bad.reason).toBe("INVALID_INPUT");
  });

  it("returns field errors for invalid input", () => {
    const r = claimHouse(emptyVillage(), 0, { nickname: "", style: "wood" }, opts());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_INPUT");
  });
});

describe("sample village", () => {
  it("is a 15-house village with 7 houses and no photos", () => {
    const v = createSampleVillage();
    expect(v.capacity).toBe(15);
    expect(v.houses).toHaveLength(7);
    expect(v.houses.every((h) => h.photo === null)).toBe(true);
    expect(v.isSample).toBe(true);
  });
});
