import { describe, expect, it } from "vitest";
import { createVillageStore, STORAGE_KEY } from "./villageStore";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

let n = 0;
const make = (storage = memoryStorage()) => createVillageStore({ storage, idGen: () => `id${++n}` });

describe("mock village store", () => {
  it("creates a village owned by this browser", () => {
    const store = make();
    const r = store.createVillage("우리 마을");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(store.getState().villages[r.id].name).toBe("우리 마을");
    expect(store.getState().ownedVillages).toContain(r.id);
  });

  it("rejects an invalid village name", () => {
    expect(make().createVillage(" ").ok).toBe(false);
  });

  it("resolves a slot collision: the second claimant gets SLOT_TAKEN", () => {
    const store = make();
    const r = store.createVillage("마을");
    if (!r.ok) throw new Error();
    // A friend takes slot 3 first (simulated concurrent claim) …
    expect(store.simulateFriendClaim(r.id, 3).ok).toBe(true);
    // … then this browser submits for the same slot.
    const mine = store.claimHouse(r.id, 3, { nickname: "나", style: "sage" });
    expect(mine).toEqual({ ok: false, reason: "SLOT_TAKEN" });
    expect(store.getState().myHouses[r.id]).toBeUndefined();
    // Draft can be retried on another free slot.
    expect(store.claimHouse(r.id, 4, { nickname: "나", style: "sage" }).ok).toBe(true);
  });

  it("allows one house per village per browser", () => {
    const store = make();
    const r = store.createVillage("마을");
    if (!r.ok) throw new Error();
    expect(store.claimHouse(r.id, 0, { nickname: "나", style: "wood" }).ok).toBe(true);
    expect(store.claimHouse(r.id, 1, { nickname: "나2", style: "wood" })).toEqual({ ok: false, reason: "ALREADY_JOINED" });
  });

  it("never exceeds 8 houses even with simulated friends", () => {
    const store = make();
    const r = store.createVillage("마을");
    if (!r.ok) throw new Error();
    for (let i = 0; i < 8; i++) expect(store.simulateFriendClaim(r.id).ok).toBe(true);
    expect(store.simulateFriendClaim(r.id).ok).toBe(false);
    expect(store.claimHouse(r.id, 0, { nickname: "나", style: "wood" })).toEqual({ ok: false, reason: "VILLAGE_FULL" });
    expect(store.getState().villages[r.id].houses).toHaveLength(8);
  });

  it("returns NOT_FOUND for unknown villages", () => {
    expect(make().claimHouse("nope", 0, { nickname: "a", style: "wood" })).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("removing my house frees the slot and my membership", () => {
    const store = make();
    const r = store.createVillage("마을");
    if (!r.ok) throw new Error();
    const claim = store.claimHouse(r.id, 0, { nickname: "나", style: "wood" });
    if (!claim.ok) throw new Error();
    store.removeHouse(r.id, claim.house.id);
    expect(store.getState().villages[r.id].houses).toHaveLength(0);
    expect(store.getState().myHouses[r.id]).toBeUndefined();
  });

  it("mirrors state to session storage and restores it", () => {
    const storage = memoryStorage();
    const a = make(storage);
    const r = a.createVillage("저장 마을");
    if (!r.ok) throw new Error();
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    const b = make(storage);
    expect(b.getState().villages[r.id]?.name).toBe("저장 마을");
  });

  it("survives corrupt storage and quota errors", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const store = make(storage);
    expect(store.getState().villages.demo).toBeDefined();
    storage.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    expect(store.createVillage("마을").ok).toBe(true);
    expect(store.getState().persistWarning).not.toBeNull();
  });
});
