import { describe, expect, it, vi } from "vitest";
import { RemoteError, type RemoteApi } from "@/lib/remote";
import type { House, Village } from "@/lib/village";
import { createVillageStore, IDENTITY_KEY, STORAGE_KEY } from "./villageStore";

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

describe("simulated (local) village store", () => {
  it("creates a village owned by this browser", async () => {
    const store = make();
    const r = await store.createVillage("우리 마을");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(store.getState().villages[r.id].name).toBe("우리 마을");
    expect(store.getState().ownedVillages).toContain(r.id);
    expect(store.isLocal(r.id)).toBe(true);
  });

  it("rejects an invalid village name", async () => {
    expect((await make().createVillage(" ")).ok).toBe(false);
  });

  it("resolves a slot collision: the second claimant gets SLOT_TAKEN", async () => {
    const store = make();
    const r = await store.createVillage("마을");
    if (!r.ok) throw new Error();
    expect(store.simulateFriendClaim(r.id, 3).ok).toBe(true);
    expect(await store.claimHouse(r.id, 3, { nickname: "나", style: "sage" })).toEqual({ ok: false, reason: "SLOT_TAKEN" });
    expect(store.getState().myHouses[r.id]).toBeUndefined();
    expect((await store.claimHouse(r.id, 4, { nickname: "나", style: "sage" })).ok).toBe(true);
  });

  it("allows one house per village per browser", async () => {
    const store = make();
    const r = await store.createVillage("마을");
    if (!r.ok) throw new Error();
    expect((await store.claimHouse(r.id, 0, { nickname: "나", style: "wood" })).ok).toBe(true);
    expect(await store.claimHouse(r.id, 1, { nickname: "나2", style: "wood" })).toEqual({ ok: false, reason: "ALREADY_JOINED" });
  });

  it("never exceeds 8 houses even with simulated friends", async () => {
    const store = make();
    const r = await store.createVillage("마을");
    if (!r.ok) throw new Error();
    for (let i = 0; i < 8; i++) expect(store.simulateFriendClaim(r.id).ok).toBe(true);
    expect(store.simulateFriendClaim(r.id).ok).toBe(false);
    expect(await store.claimHouse(r.id, 0, { nickname: "나", style: "wood" })).toEqual({ ok: false, reason: "VILLAGE_FULL" });
    expect(store.getState().villages[r.id].houses).toHaveLength(8);
  });

  it("returns NOT_FOUND for unknown villages and marks them missing on load", async () => {
    const store = make();
    expect(await store.claimHouse("nope", 0, { nickname: "a", style: "wood" })).toEqual({ ok: false, reason: "NOT_FOUND" });
    await store.loadVillage("nope");
    expect(store.getState().status.nope).toBe("missing");
  });

  it("removing my house frees the slot and my membership", async () => {
    const store = make();
    const r = await store.createVillage("마을");
    if (!r.ok) throw new Error();
    const claim = await store.claimHouse(r.id, 0, { nickname: "나", style: "wood" });
    if (!claim.ok) throw new Error();
    expect(await store.removeHouse(r.id, claim.house.id)).toEqual({ ok: true });
    expect(store.getState().villages[r.id].houses).toHaveLength(0);
    expect(store.getState().myHouses[r.id]).toBeUndefined();
  });

  it("mirrors state to session storage and restores it", async () => {
    const storage = memoryStorage();
    const r = await make(storage).createVillage("저장 마을");
    if (!r.ok) throw new Error();
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    expect(make(storage).getState().villages[r.id]?.name).toBe("저장 마을");
  });

  it("survives corrupt storage and quota errors", async () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const store = make(storage);
    expect(store.getState().villages.demo).toBeDefined();
    storage.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    expect((await store.createVillage("마을")).ok).toBe(true);
    expect(store.getState().persistWarning).not.toBeNull();
  });
});

// ---------------- remote mode with a fake API ----------------

function house(over: Partial<House> = {}): House {
  return { id: "h1", slot: 0, nickname: "하늘", style: "wood", photo: null, hasPhoto: false, message: "", createdAt: "2026-12-01T00:00:00Z", ...over };
}

function fakeApi(over: Partial<RemoteApi> = {}): RemoteApi {
  const villages = new Map<string, Village>();
  return {
    createVillage: vi.fn(async (_i: string, name: string) => {
      villages.set("abcdefghjk", { id: "abcdefghjk", name, createdAt: "2026-12-01T00:00:00Z", houses: [] });
      return { id: "abcdefghjk", ownerSecret: "owner-secret" };
    }),
    getVillage: vi.fn(async (id: string) => villages.get(id) ?? null),
    claimHouse: vi.fn(async () => ({ ok: true as const, house: house(), claimSecret: "claim-secret" })),
    report: vi.fn(async () => undefined),
    uploadPhoto: vi.fn(async () => undefined),
    photoUrl: vi.fn(async () => "https://example.test/signed.jpg"),
    removeHouse: vi.fn(async () => undefined),
    deleteVillage: vi.fn(async () => undefined),
    ...over,
  } as RemoteApi;
}

const JPEG_DATA_URL = "data:image/jpeg;base64,/9j/4AAQ";

describe("remote village store", () => {
  it("keeps the sample village local and real villages remote", () => {
    const store = createVillageStore({ remote: fakeApi() });
    expect(store.isLocal("demo")).toBe(true);
    expect(store.isLocal("abcdefghjk")).toBe(false);
  });

  it("creates a village, stores the owner secret in local storage, and reuses the install id", async () => {
    const identityStorage = memoryStorage();
    const api = fakeApi();
    const store = createVillageStore({ remote: api, identityStorage });
    const r = await store.createVillage("  원격 마을 ");
    expect(r).toEqual({ ok: true, id: "abcdefghjk" });
    const saved = JSON.parse(identityStorage.getItem(IDENTITY_KEY)!);
    expect(saved.owners).toEqual({ abcdefghjk: "owner-secret" });
    expect(api.createVillage).toHaveBeenCalledWith(saved.installId, "원격 마을");
    // A new page load restores ownership from local storage.
    const again = createVillageStore({ remote: fakeApi(), identityStorage });
    expect(again.getState().ownedVillages).toContain("abcdefghjk");
  });

  it("maps server failures to Korean messages", async () => {
    const store = createVillageStore({
      remote: fakeApi({ createVillage: vi.fn(async () => Promise.reject(new RemoteError("RATE_LIMITED", 429))) }),
    });
    expect(await store.createVillage("마을")).toEqual({ ok: false, error: expect.stringContaining("잠시 후") });
  });

  it("loads villages: ready, missing, and keeps stale data on refresh failure", async () => {
    const api = fakeApi();
    const store = createVillageStore({ remote: api });
    await store.createVillage("마을");
    await store.loadVillage("abcdefghjk");
    expect(store.getState().status.abcdefghjk).toBe("ready");
    await store.loadVillage("zzzzzzzzzz");
    expect(store.getState().status.zzzzzzzzzz).toBe("missing");
    (api.getVillage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new RemoteError("NETWORK"));
    await expect(store.loadVillage("abcdefghjk")).rejects.toThrow();
    expect(store.getState().villages.abcdefghjk).toBeDefined();
    expect(store.getState().status.abcdefghjk).toBe("ready");
  });

  it("claims a house, keeps the claim secret, and uploads the photo with it", async () => {
    const identityStorage = memoryStorage();
    const api = fakeApi();
    const store = createVillageStore({ remote: api, identityStorage });
    await store.createVillage("마을");
    const r = await store.claimHouse("abcdefghjk", 0, { nickname: "하늘", style: "wood", message: "", photo: JPEG_DATA_URL });
    expect(r).toMatchObject({ ok: true, house: { id: "h1", hasPhoto: true } });
    expect(api.uploadPhoto).toHaveBeenCalledWith(expect.any(String), "h1", "claim-secret", expect.any(Blob));
    expect(store.getState().myHouses.abcdefghjk).toBe("h1");
    expect(JSON.parse(identityStorage.getItem(IDENTITY_KEY)!).houses.abcdefghjk).toEqual({ houseId: "h1", secret: "claim-secret" });
  });

  it("reports a photo failure without losing the claimed house", async () => {
    const api = fakeApi({ uploadPhoto: vi.fn(async () => Promise.reject(new RemoteError("NETWORK"))) });
    const store = createVillageStore({ remote: api });
    await store.createVillage("마을");
    const r = await store.claimHouse("abcdefghjk", 0, { nickname: "하늘", style: "wood", photo: JPEG_DATA_URL });
    expect(r).toMatchObject({ ok: true, photoError: expect.stringContaining("연결") });
    expect(store.getState().myHouses.abcdefghjk).toBe("h1");
  });

  it("refreshes the village after SLOT_TAKEN so the taken slot shows up", async () => {
    const api = fakeApi({ claimHouse: vi.fn(async () => ({ ok: false as const, reason: "SLOT_TAKEN" as const })) });
    const store = createVillageStore({ remote: api });
    await store.createVillage("마을");
    expect(await store.claimHouse("abcdefghjk", 0, { nickname: "하늘", style: "wood" })).toEqual({ ok: false, reason: "SLOT_TAKEN" });
    expect(api.getVillage).toHaveBeenCalledWith("abcdefghjk");
  });

  it("validates locally before calling the server", async () => {
    const api = fakeApi();
    const store = createVillageStore({ remote: api });
    const r = await store.claimHouse("abcdefghjk", 0, { nickname: "", style: "wood" });
    expect(r).toMatchObject({ ok: false, reason: "INVALID_INPUT" });
    expect(api.claimHouse).not.toHaveBeenCalled();
  });

  it("removes my house with the claim secret, someone else's with the owner secret", async () => {
    const api = fakeApi();
    const store = createVillageStore({ remote: api });
    await store.createVillage("마을");
    await store.claimHouse("abcdefghjk", 0, { nickname: "하늘", style: "wood" });
    await store.removeHouse("abcdefghjk", "h1");
    expect(api.removeHouse).toHaveBeenLastCalledWith(expect.any(String), "h1", "claim-secret");
    expect(store.getState().myHouses.abcdefghjk).toBeUndefined();
  });

  it("refuses owner actions without the owner secret", async () => {
    const api = fakeApi({
      getVillage: vi.fn(async () => ({ id: "otherxxxxx", name: "남의 마을", createdAt: "x", houses: [house({ id: "h9" })] })),
    });
    const store = createVillageStore({ remote: api });
    await store.loadVillage("otherxxxxx");
    expect(await store.removeHouse("otherxxxxx", "h9")).toEqual({ ok: false, message: expect.any(String) });
    expect(await store.deleteVillage("otherxxxxx")).toEqual({ ok: false, message: expect.any(String) });
    expect(api.removeHouse).not.toHaveBeenCalled();
    expect(api.deleteVillage).not.toHaveBeenCalled();
  });

  it("fetches a signed URL only for houses that have a photo", async () => {
    const api = fakeApi();
    const store = createVillageStore({ remote: api });
    expect(await store.photoUrl("abcdefghjk", house({ hasPhoto: false }))).toBeNull();
    expect(await store.photoUrl("abcdefghjk", house({ hasPhoto: true }))).toBe("https://example.test/signed.jpg");
  });
});
