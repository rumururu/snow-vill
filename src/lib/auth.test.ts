import { describe, expect, it, vi } from "vitest";
import { AUTH_KEY, createAuth, parseSession, sha256Hex } from "./auth";

const config = { url: "https://proj.supabase.co", anonKey: "anon-key" };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const goTrue = (token: string, expiresAt: number, provider = "google") => ({
  access_token: token,
  refresh_token: `r-${token}`,
  expires_in: 3600,
  expires_at: expiresAt,
  user: { id: "u1", email: "a@example.test", app_metadata: { provider } },
});

describe("auth (GoTrue REST)", () => {
  it("signs in with an ID token and a raw nonce, and keeps the session in storage", async () => {
    const storage = memoryStorage();
    const fetchMock = vi.fn(async () => json(200, goTrue("t1", 5000, "apple")));
    const auth = createAuth(config, { storage, fetchImpl: fetchMock as unknown as typeof fetch, nowS: () => 1000 });
    const listener = vi.fn();
    auth.subscribe(listener);
    const s = await auth.signInWithIdToken("apple", "id-token", "raw-nonce");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/auth/v1/token?grant_type=id_token");
    expect(JSON.parse(init.body as string)).toEqual({ provider: "apple", id_token: "id-token", nonce: "raw-nonce" });
    expect((init.headers as Record<string, string>).apikey).toBe("anon-key");
    expect(s.user).toEqual({ id: "u1", email: "a@example.test", provider: "apple" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.getItem(AUTH_KEY)!).access_token).toBe("t1");
    // A new page restores it.
    const again = createAuth(config, { storage, nowS: () => 1000 });
    expect(again.getUser()?.id).toBe("u1");
    expect(await again.accessToken()).toBe("t1");
  });

  it("refreshes shortly before expiry (once for concurrent callers)", async () => {
    const storage = memoryStorage();
    storage.setItem(AUTH_KEY, JSON.stringify(goTrue("old", 1030)));
    const fetchMock = vi.fn(async () => json(200, goTrue("new", 4600)));
    const auth = createAuth(config, { storage, fetchImpl: fetchMock as unknown as typeof fetch, nowS: () => 1000 });
    const [a, b] = await Promise.all([auth.accessToken(), auth.accessToken()]);
    expect([a, b]).toEqual(["new", "new"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/auth/v1/token?grant_type=refresh_token");
    expect(JSON.parse(init.body as string)).toEqual({ refresh_token: "r-old" });
  });

  it("signs out locally when the refresh token is rejected; keeps the session when offline", async () => {
    const storage = memoryStorage();
    storage.setItem(AUTH_KEY, JSON.stringify(goTrue("old", 1010)));
    const offline = createAuth(config, { storage, fetchImpl: (async () => Promise.reject(new TypeError("offline"))) as typeof fetch, nowS: () => 1000 });
    expect(await offline.accessToken()).toBe("old");
    const rejected = createAuth(config, { storage, fetchImpl: (async () => json(400, { error: "invalid_grant" })) as typeof fetch, nowS: () => 1000 });
    expect(await rejected.accessToken()).toBeNull();
    expect(rejected.getUser()).toBeNull();
    expect(storage.getItem(AUTH_KEY)).toBeNull();
  });

  it("logs out on the server with the access token and forgets the session", async () => {
    const storage = memoryStorage();
    storage.setItem(AUTH_KEY, JSON.stringify(goTrue("t1", 5000)));
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const auth = createAuth(config, { storage, fetchImpl: fetchMock as unknown as typeof fetch, nowS: () => 1000 });
    await auth.signOut();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/auth/v1/logout");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t1");
    expect(auth.getSession()).toBeNull();
    expect(storage.getItem(AUTH_KEY)).toBeNull();
  });

  it("rejects a failed sign-in and survives broken storage", async () => {
    const auth = createAuth(config, { storage: null, fetchImpl: (async () => json(400, { error: "bad id token" })) as typeof fetch });
    await expect(auth.signInWithIdToken("google", "x")).rejects.toMatchObject({ code: "REJECTED" });
    const broken = { getItem: () => "{not json", setItem: () => { throw new Error("quota"); }, removeItem: () => undefined };
    expect(createAuth(config, { storage: broken }).getUser()).toBeNull();
    expect(parseSession({ access_token: "a" }, 0)).toBeNull();
  });

  it("hashes the nonce as hex SHA-256", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
