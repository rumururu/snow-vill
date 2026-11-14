import { describe, expect, it, vi } from "vitest";
import { createRemoteApi, dataUrlToBlob, RemoteError } from "./remote";

const config = { url: "https://proj.supabase.co", anonKey: "anon-key" };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("remote api", () => {
  it("calls RPC functions with the anon key and maps village JSON", async () => {
    const fetchMock = vi.fn(async () =>
      json(200, {
        id: "abcdefghjk",
        name: "마을",
        created_at: "2026-12-01T00:00:00Z",
        houses: [{ id: "h1", slot: 2, nickname: "하늘", style: "sage", message: "", has_photo: true, created_at: "2026-12-01T00:00:00Z" }],
      }),
    );
    const api = createRemoteApi(config, fetchMock as unknown as typeof fetch);
    const v = await api.getVillage("abcdefghjk");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/rest/v1/rpc/snowvill_get_village");
    expect((init.headers as Record<string, string>).apikey).toBe("anon-key");
    expect(JSON.parse(init.body as string)).toEqual({ p_village_id: "abcdefghjk" });
    expect(v?.houses[0]).toMatchObject({ slot: 2, style: "sage", hasPhoto: true, photo: null });
  });

  it("reads the village look (unknown style → dirt, malformed decor dropped) and saves it owner-only", async () => {
    const api = createRemoteApi(config, (async () =>
      json(200, { id: "abcdefghjk", name: "마을", created_at: "2026-12-01T00:00:00Z", houses: [], path_style: "gold",
        decor: { "plaza-bench": [1, 2], cathedral: [0, 0], "d0-decor1": ["x", 1] } })) as typeof fetch);
    expect(await api.getVillage("abcdefghjk")).toMatchObject({ pathStyle: "dirt", decor: { "plaza-bench": [1, 2] } });
    const fetchMock = vi.fn(async () => json(200, { ok: true, path_style: "brick", decor: {} }));
    const api2 = createRemoteApi(config, fetchMock as unknown as typeof fetch);
    expect(await api2.setVillageLook("i", "abcdefghjk", "sec", "brick", {})).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/rest/v1/rpc/snowvill_set_village_look");
    expect(JSON.parse(init.body as string)).toEqual({ p_install_id: "i", p_village_id: "abcdefghjk", p_owner_secret: "sec", p_path_style: "brick", p_decor: {} });
  });

  it("returns null for a missing village", async () => {
    const api = createRemoteApi(config, (async () => new Response("null", { status: 200 })) as typeof fetch);
    expect(await api.getVillage("x")).toBeNull();
  });

  it("maps HTTP failures to error codes", async () => {
    const cases: Array<[Response, string]> = [
      [json(429, { code: "PT429" }), "RATE_LIMITED"],
      [json(400, { code: "22023" }), "INVALID_INPUT"],
      [json(403, { error: "FORBIDDEN" }), "FORBIDDEN"],
      [json(415, { error: "UNSUPPORTED" }), "UNSUPPORTED"],
      [json(500, {}), "SERVER"],
    ];
    for (const [res, code] of cases) {
      const api = createRemoteApi(config, (async () => res) as typeof fetch);
      await expect(api.createVillage("u", "n")).rejects.toMatchObject({ code });
    }
    const offline = createRemoteApi(config, (async () => Promise.reject(new TypeError("fetch failed"))) as typeof fetch);
    await expect(offline.getVillage("x")).rejects.toBeInstanceOf(RemoteError);
    await expect(offline.getVillage("x")).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("uploads photos as multipart to the Edge Function", async () => {
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    const api = createRemoteApi(config, fetchMock as unknown as typeof fetch);
    await api.uploadPhoto("install", "house", "secret", new Blob(["x"], { type: "image/jpeg" }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/functions/v1/snowvill-photo");
    const form = init.body as FormData;
    expect(form.get("house_id")).toBe("house");
    expect(form.get("secret")).toBe("secret");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("sends the access token when signed in, the anon key otherwise, and the guest's secrets", async () => {
    const fetchMock = vi.fn(async () =>
      json(200, { id: "abcdefghjk", name: "비밀", visibility: "private", locked: true, me: { role: "pending", house_id: null } }),
    );
    let token: string | null = "user-jwt";
    const api = createRemoteApi(config, fetchMock as unknown as typeof fetch, async () => token);
    const v = await api.getVillage("abcdefghjk", ["s1", "s2"]);
    let [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ apikey: "anon-key", Authorization: "Bearer user-jwt" });
    expect(JSON.parse(init.body as string)).toEqual({ p_village_id: "abcdefghjk", p_secrets: ["s1", "s2"] });
    expect(v).toMatchObject({ name: "비밀", visibility: "private", locked: true, me: { role: "pending", houseId: null }, houses: [] });
    token = null;
    await api.photoUrl("i", "abcdefghjk", "h1");
    [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: "Bearer anon-key" });
    expect(JSON.parse(init.body as string)).toEqual({ action: "view", install_id: "i", village_id: "abcdefghjk", house_id: "h1" });
  });

  it("maps claim_house 403 / 401 (private) to FORBIDDEN and 409 (second house) to ALREADY_JOINED", async () => {
    const input = { nickname: "나", style: "wood" as const, direction: 0 as const, message: "" };
    for (const [status, reason] of [[403, "FORBIDDEN"], [401, "FORBIDDEN"], [409, "ALREADY_JOINED"]] as const) {
      const api = createRemoteApi(config, (async () => json(status, { code: "42501" })) as typeof fetch);
      expect(await api.claimHouse("i", "abcdefghjk", 0, input)).toEqual({ ok: false, reason });
    }
    const api = createRemoteApi(config, (async () => json(500, {})) as typeof fetch);
    await expect(api.claimHouse("i", "abcdefghjk", 0, input)).rejects.toMatchObject({ code: "SERVER" });
  });

  it("calls the account RPCs with the contract's arguments", async () => {
    const replies: Record<string, unknown> = {
      snowvill_link_device: { villages: 1, houses: 2 },
      snowvill_my_villages: [{ id: "v1", name: "마을", capacity: 9, visibility: "private", created_at: "x", role: "owner", houses: 3, pending: 2 }],
      snowvill_set_visibility: { ok: true, visibility: "private" },
      snowvill_request_join: { ok: true, role: "pending" },
      snowvill_members_of: [{ user_id: "u2", nickname: "씨", status: "pending", created_at: "x" }],
      snowvill_decide_member: { ok: true },
    };
    const fetchMock = vi.fn(async (url: string) => json(200, replies[url.split("/").pop()!] ?? { ok: true }));
    const api = createRemoteApi(config, fetchMock as unknown as typeof fetch);
    const body = (n: number) => JSON.parse((fetchMock.mock.calls[n] as unknown as [string, RequestInit])[1].body as string);

    expect(await api.linkDevice({ v1: "os" }, { h1: "cs" })).toEqual({ villages: 1, houses: 2 });
    expect(body(0)).toEqual({ p_owner: { v1: "os" }, p_houses: { h1: "cs" } });
    expect(await api.myVillages()).toEqual([
      { id: "v1", name: "마을", capacity: 9, visibility: "private", createdAt: "x", role: "owner", houses: 3, pending: 2 },
    ]);
    expect(await api.setVisibility("v1", "private")).toEqual({ ok: true });
    expect(body(2)).toEqual({ p_village_id: "v1", p_visibility: "private" });
    expect(await api.requestJoin("v1", "씨")).toEqual({ ok: true, role: "pending" });
    expect(body(3)).toEqual({ p_village_id: "v1", p_nickname: "씨" });
    expect(await api.membersOf("v1")).toEqual([{ userId: "u2", nickname: "씨", status: "pending", createdAt: "x" }]);
    expect(await api.decideMember("v1", "u2", true)).toBe(true);
    expect(body(5)).toEqual({ p_village_id: "v1", p_user_id: "u2", p_approve: true });
    await api.deleteAccount("i", "apple-code");
    expect(fetchMock.mock.calls[6][0]).toBe("https://proj.supabase.co/functions/v1/snowvill-photo");
    expect(body(6)).toEqual({ action: "delete_account", install_id: "i", apple_code: "apple-code", apple_client: "web" });
    await api.deleteVillage("i", "v1", null);
    expect(body(7)).toEqual({ action: "delete_village", install_id: "i", village_id: "v1" });
  });

  it("converts data URLs to blobs", async () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64," + btoa("abc"));
    expect(blob.type).toBe("image/jpeg");
    expect(await blob.text()).toBe("abc");
  });
});
