import { describe, expect, it, vi } from "vitest";
import { fakeAccountApi as fakeApi, fakeAuth, USER, village } from "@/test/accounts";
import { createVillageStore, IDENTITY_KEY, myVillageList } from "./villageStore";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("sign-in and account linking", () => {
  it("after sign-in, moves this browser's owner and claim secrets to the account and loads 내 마을", async () => {
    const identityStorage = memoryStorage();
    identityStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({
        installId: "11111111-1111-4111-8111-111111111111",
        owners: { abcdefghjk: "owner-secret" },
        houses: { otherxxxxx: { houseId: "h9", secret: "claim-secret" } },
      }),
    );
    const api = fakeApi({
      myVillages: vi.fn(async () => [
        { id: "abcdefghjk", name: "마을", capacity: 6, visibility: "private" as const, createdAt: "x", role: "owner" as const, houses: 1, pending: 2 },
      ]),
    });
    const auth = fakeAuth();
    const store = createVillageStore({ remote: api, auth, identityStorage });
    expect(store.canSignIn()).toBe(true);
    expect(await store.signIn("google", "id-token", "nonce")).toEqual({ ok: true });
    expect(auth.signInWithIdToken).toHaveBeenCalledWith("google", "id-token", "nonce");
    expect(api.linkDevice).toHaveBeenCalledWith({ abcdefghjk: "owner-secret" }, { h9: "claim-secret" });
    expect(store.getState().account).toEqual(USER);
    expect(store.getState().myVillages).toHaveLength(1);
    expect(myVillageList(store.getState())[0]).toMatchObject({ id: "abcdefghjk", role: "owner", pending: 2, visibility: "private" });

    // Already linked: a new page with the same session does not send the secrets again.
    const again = createVillageStore({ remote: api, auth, identityStorage });
    await vi.waitFor(() => expect(again.getState().myVillages).not.toBeNull());
    expect(api.linkDevice).toHaveBeenCalledTimes(1);
  });

  it("reports a failed sign-in without changing anything", async () => {
    const auth = fakeAuth();
    (auth.signInWithIdToken as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("rejected"));
    const api = fakeApi();
    const store = createVillageStore({ remote: api, auth });
    expect(await store.signIn("apple", "x")).toEqual({ ok: false, message: expect.any(String) });
    expect(store.getState().account).toBeNull();
    expect(api.linkDevice).not.toHaveBeenCalled();
  });

  it("signed in: the server's me.role / me.house_id decide owner and resident, without secrets", async () => {
    const api = fakeApi({
      getVillage: vi.fn(async () => village({ houses: [{ id: "h1", slot: 0, nickname: "나", style: "wood", direction: 0, message: "", photo: null, hasPhoto: true, createdAt: "x" }], me: { role: "owner", houseId: "h1" } })),
    });
    const store = createVillageStore({ remote: api, auth: fakeAuth(USER) });
    await store.loadVillage("abcdefghjk");
    expect(api.getVillage).toHaveBeenCalledWith("abcdefghjk", []);
    expect(store.getState().ownedVillages).toContain("abcdefghjk");
    expect(store.getState().myHouses.abcdefghjk).toBe("h1");
    expect(store.canEditLook("abcdefghjk")).toBe(true);
    expect(await store.setVillageLook("abcdefghjk", "brick", {})).toEqual({ ok: true });
    expect(api.setVillageLook).toHaveBeenCalledWith(expect.any(String), "abcdefghjk", null, "brick", {});
    expect(await store.uploadPhoto("abcdefghjk", "h1", "data:image/jpeg;base64,/9j/")).toEqual({ ok: true });
    expect(api.uploadPhoto).toHaveBeenCalledWith(expect.any(String), "h1", null, expect.any(Blob));
    await store.photoUrl("abcdefghjk", store.getState().villages.abcdefghjk.houses[0]);
    expect(api.photoUrl).toHaveBeenCalledWith(expect.any(String), "abcdefghjk", "h1", []);
    expect(await store.deleteVillage("abcdefghjk")).toEqual({ ok: true });
    expect(api.deleteVillage).toHaveBeenCalledWith(expect.any(String), "abcdefghjk", null);
  });

  it("guests never get owner rights from a server role", async () => {
    const api = fakeApi({ getVillage: vi.fn(async () => village({ me: { role: "owner", houseId: null } })) });
    const store = createVillageStore({ remote: api, auth: fakeAuth(null) });
    await store.loadVillage("abcdefghjk");
    expect(store.getState().ownedVillages).not.toContain("abcdefghjk");
    expect(store.canEditLook("abcdefghjk")).toBe(false);
  });

  it("sign-out drops what only the account gave and reloads the village", async () => {
    const auth = fakeAuth(USER);
    // The server answers by the caller: owner with the token, nobody without.
    const api = fakeApi({ getVillage: vi.fn(async () => village({ me: { role: auth.getUser() ? "owner" : null, houseId: null } })) });
    const store = createVillageStore({ remote: api, auth });
    await store.loadVillage("abcdefghjk");
    expect(store.getState().ownedVillages).toContain("abcdefghjk");
    await store.signOut();
    expect(auth.signOut).toHaveBeenCalled();
    expect(store.getState().account).toBeNull();
    expect(store.getState().ownedVillages).not.toContain("abcdefghjk");
    expect(store.getState().myVillages).toBeNull();
    await vi.waitFor(() => expect(api.getVillage).toHaveBeenCalledTimes(2));
    expect(store.getState().villages.abcdefghjk.me?.role ?? null).toBeNull();
    expect(store.canEditLook("abcdefghjk")).toBe(false);
  });

  it("deletes the account, forgets its villages and houses here, and signs out", async () => {
    const identityStorage = memoryStorage();
    identityStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ installId: "i", owners: { abcdefghjk: "o" }, houses: { abcdefghjk: { houseId: "h1", secret: "c" }, otherxxxxx: { houseId: "h2", secret: "c2" } } }),
    );
    const api = fakeApi({
      myVillages: vi.fn(async () => [
        { id: "abcdefghjk", name: "a", capacity: 6, visibility: "public" as const, createdAt: "x", role: "owner" as const, houses: 1, pending: 0 },
        { id: "otherxxxxx", name: "b", capacity: 6, visibility: "public" as const, createdAt: "x", role: "resident" as const, houses: 1, pending: 0 },
      ]),
    });
    const auth = fakeAuth(USER);
    const store = createVillageStore({ remote: api, auth, identityStorage });
    expect(await store.deleteAccount("apple-code")).toEqual({ ok: true });
    expect(api.deleteAccount).toHaveBeenCalledWith("i", "apple-code");
    expect(auth.clear).toHaveBeenCalled();
    expect(store.getState().account).toBeNull();
    const saved = JSON.parse(identityStorage.getItem(IDENTITY_KEY)!);
    expect(saved.owners).toEqual({});
    expect(saved.houses).toEqual({});
    expect(store.getState().status.abcdefghjk).toBe("missing");
  });
});

describe("private villages", () => {
  it("private needs a signed-in owner", async () => {
    const api = fakeApi();
    const guest = createVillageStore({ remote: api, auth: fakeAuth(null) });
    expect(await guest.setVisibility("abcdefghjk", "private")).toEqual({ ok: false, signIn: true });
    expect(api.setVisibility).not.toHaveBeenCalled();

    const store = createVillageStore({ remote: api, auth: fakeAuth(USER) });
    await store.loadVillage("abcdefghjk");
    expect(await store.setVisibility("abcdefghjk", "private")).toEqual({ ok: true });
    expect(store.getState().villages.abcdefghjk.visibility).toBe("private");
  });

  it("join request: nickname 1–10 characters, then the pending role", async () => {
    let role: "pending" | null = null;
    const api = fakeApi({ getVillage: vi.fn(async () => village({ visibility: "private", locked: true, me: { role, houseId: null } })) });
    (api.requestJoin as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      role = "pending";
      return { ok: true, role: "pending" };
    });
    const store = createVillageStore({ remote: api, auth: fakeAuth(USER) });
    await store.loadVillage("abcdefghjk");
    expect((await store.requestJoin("abcdefghjk", "   ")).ok).toBe(false);
    expect((await store.requestJoin("abcdefghjk", "열한글자닉네임입니다요")).ok).toBe(false);
    expect(api.requestJoin).not.toHaveBeenCalled();
    expect(await store.requestJoin("abcdefghjk", " 씨 ")).toEqual({ ok: true });
    expect(api.requestJoin).toHaveBeenCalledWith("abcdefghjk", "씨");
    expect(store.getState().villages.abcdefghjk.me?.role).toBe("pending");
  });

  it("owner loads, approves and removes members; the pending count follows", async () => {
    const members = [
      { userId: "u2", nickname: "씨", status: "pending" as const, createdAt: "x" },
      { userId: "u3", nickname: "디", status: "approved" as const, createdAt: "x" },
    ];
    const api = fakeApi({ membersOf: vi.fn(async () => members.map((m) => ({ ...m }))) });
    const store = createVillageStore({ remote: api, auth: fakeAuth(USER) });
    expect(await store.loadMembers("abcdefghjk")).toEqual({ ok: true });
    expect(store.getState().members.abcdefghjk).toHaveLength(2);
    (api.decideMember as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      members[0].status = "approved" as never;
      return true;
    });
    expect(await store.decideMember("abcdefghjk", "u2", true)).toEqual({ ok: true });
    expect(api.decideMember).toHaveBeenCalledWith("abcdefghjk", "u2", true);
    expect(store.getState().members.abcdefghjk.filter((m) => m.status === "pending")).toHaveLength(0);
  });

  it("a non-owner gets no member list", async () => {
    const store = createVillageStore({ remote: fakeApi({ membersOf: vi.fn(async () => null) }), auth: fakeAuth(USER) });
    expect((await store.loadMembers("abcdefghjk")).ok).toBe(false);
  });
});

describe("내 마을 list", () => {
  it("guest: villages this browser owns or lives in, with names, without the sample", async () => {
    const identityStorage = memoryStorage();
    identityStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ installId: "i", owners: { abcdefghjk: "o" }, houses: { otherxxxxx: { houseId: "h2", secret: "c" } } }),
    );
    const api = fakeApi({ getVillage: vi.fn(async (id: string) => village({ id, name: id === "abcdefghjk" ? "내가 만든" : "친구 마을" })) });
    const store = createVillageStore({ remote: api, identityStorage });
    await store.loadMyVillages();
    expect(api.myVillages).not.toHaveBeenCalled();
    expect(myVillageList(store.getState())).toEqual([
      { id: "abcdefghjk", name: "내가 만든", role: "owner", pending: 0, visibility: "public" },
      { id: "otherxxxxx", name: "친구 마을", role: "resident", pending: 0, visibility: "public" },
    ]);
  });
});
