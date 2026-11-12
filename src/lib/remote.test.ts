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

  it("converts data URLs to blobs", async () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64," + btoa("abc"));
    expect(blob.type).toBe("image/jpeg");
    expect(await blob.text()).toBe("abc");
  });
});
