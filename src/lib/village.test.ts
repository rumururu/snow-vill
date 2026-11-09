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

  it("caps the village at 8 houses", () => {
    let v = emptyVillage();
    for (let slot = 0; slot < VILLAGE_CAPACITY; slot++) {
      const r = claimHouse(v, slot, input(`n${slot}`), opts());
      if (!r.ok) throw new Error(`slot ${slot} failed`);
      v = r.village;
    }
    expect(isFull(v)).toBe(true);
    expect(freeSlots(v)).toEqual([]);
    expect(claimHouse(v, 0, input(), opts())).toEqual({ ok: false, reason: "VILLAGE_FULL" });
  });

  it("rejects slots outside 0..7", () => {
    for (const slot of [-1, 8, 1.5, Number.NaN]) {
      expect(claimHouse(emptyVillage(), slot, input(), opts())).toEqual({ ok: false, reason: "INVALID_SLOT" });
    }
  });

  it("returns field errors for invalid input", () => {
    const r = claimHouse(emptyVillage(), 0, { nickname: "", style: "wood" }, opts());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_INPUT");
  });
});

describe("sample village", () => {
  it("is 3/8 occupied with no photos", () => {
    const v = createSampleVillage();
    expect(v.houses).toHaveLength(3);
    expect(v.houses.every((h) => h.photo === null)).toBe(true);
    expect(v.isSample).toBe(true);
  });
});
