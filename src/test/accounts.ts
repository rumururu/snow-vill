/** Test doubles for signed-in flows (lib/auth, lib/remote account calls). */
import { vi } from "vitest";
import type { AuthClient, AuthUser } from "@/lib/auth";
import type { RemoteApi } from "@/lib/remote";
import type { Village } from "@/lib/village";

export const USER: AuthUser = { id: "u1", email: "a@example.test", provider: "google" };

/** In-memory stand-in for lib/auth. */
export function fakeAuth(initial: AuthUser | null = null) {
  let user = initial;
  const listeners = new Set<() => void>();
  const setUser = (u: AuthUser | null) => {
    user = u;
    listeners.forEach((l) => l());
  };
  const auth = {
    getSession: () => (user ? { accessToken: "t", refreshToken: "r", expiresAt: 9e9, user } : null),
    getUser: () => user,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    signInWithIdToken: vi.fn(async () => {
      setUser(USER);
      return auth.getSession()!;
    }),
    accessToken: async () => (user ? "t" : null),
    signOut: vi.fn(async () => setUser(null)),
    clear: vi.fn(() => setUser(null)),
  };
  return Object.assign(auth as unknown as AuthClient, { setUser });
}

export const village = (over: Partial<Village> = {}): Village => ({
  id: "abcdefghjk",
  name: "마을",
  createdAt: "x",
  capacity: 6,
  openHalves: 3,
  houses: [],
  visibility: "public",
  ...over,
});

export function fakeAccountApi(over: Partial<RemoteApi> = {}): RemoteApi {
  return {
    createVillage: vi.fn(async () => ({ id: "abcdefghjk", ownerSecret: "owner-secret" })),
    getVillage: vi.fn(async () => village()),
    claimHouse: vi.fn(),
    report: vi.fn(),
    uploadPhoto: vi.fn(async () => undefined),
    photoUrl: vi.fn(async () => "https://example.test/signed.jpg"),
    removeHouse: vi.fn(async () => undefined),
    deleteVillage: vi.fn(async () => undefined),
    setVillageLook: vi.fn(async () => ({ ok: true as const })),
    linkDevice: vi.fn(async () => ({ villages: 1, houses: 0 })),
    myVillages: vi.fn(async () => []),
    setVisibility: vi.fn(async () => ({ ok: true as const })),
    requestJoin: vi.fn(async () => ({ ok: true as const, role: "pending" as const })),
    membersOf: vi.fn(async () => []),
    decideMember: vi.fn(async () => true),
    deleteAccount: vi.fn(async () => undefined),
    ...over,
  } as RemoteApi;
}

