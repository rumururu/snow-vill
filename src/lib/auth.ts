/**
 * Optional sign-in (docs/12-accounts-and-private-villages.md, "Client contract").
 *
 * A small GoTrue REST client: Google / Apple ID token → session, refresh before expiry, logout.
 * The session is kept in this browser's localStorage (inside try/catch like the guest identity);
 * without storage it lives in memory for this page only.
 */
import type { RemoteConfig } from "./remote";

export const AUTH_KEY = "snow-village:auth:v1";
/** Refresh this many seconds before the access token expires. */
const REFRESH_MARGIN_S = 60;

export type AuthProvider = "google" | "apple";

export interface AuthUser {
  id: string;
  email: string | null;
  /** Provider used for this account (`app_metadata.provider`). */
  provider: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  user: AuthUser;
}

export class AuthError extends Error {
  constructor(public code: "NETWORK" | "REJECTED" | "SERVER", public status = 0) {
    super(code);
  }
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Listener = () => void;

/** GoTrue session JSON (token / verify responses) → AuthSession; null if it is not a session. */
export function parseSession(raw: unknown, nowS: number): AuthSession | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const user = (r.user ?? {}) as Record<string, unknown>;
  const accessToken = r.access_token ?? r.accessToken;
  const refreshToken = r.refresh_token ?? r.refreshToken;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || typeof user.id !== "string") return null;
  const expiresAtRaw = r.expires_at ?? r.expiresAt;
  const expiresIn = r.expires_in;
  const expiresAt =
    typeof expiresAtRaw === "number" ? expiresAtRaw : typeof expiresIn === "number" ? nowS + expiresIn : nowS;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: {
      id: user.id,
      email: typeof user.email === "string" && user.email ? user.email : null,
      provider: typeof meta.provider === "string" ? meta.provider : typeof user.provider === "string" ? user.provider : null,
    },
  };
}

/** Stored form: GoTrue field names, so a session JSON from the server can be stored as it is. */
function toStored(s: AuthSession) {
  return {
    access_token: s.accessToken,
    refresh_token: s.refreshToken,
    expires_at: s.expiresAt,
    user: { id: s.user.id, email: s.user.email, app_metadata: { provider: s.user.provider } },
  };
}

export interface AuthOptions {
  storage?: KV | null;
  fetchImpl?: typeof fetch;
  /** Unix seconds. */
  nowS?: () => number;
}

export type AuthClient = ReturnType<typeof createAuth>;

export function createAuth(config: RemoteConfig, opts: AuthOptions = {}) {
  const storage = opts.storage ?? null;
  const fetchImpl = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const nowS = opts.nowS ?? (() => Math.floor(Date.now() / 1000));
  const listeners = new Set<Listener>();
  let session: AuthSession | null = read();
  let refreshing: Promise<AuthSession | null> | null = null;

  function read(): AuthSession | null {
    try {
      const raw = storage?.getItem(AUTH_KEY);
      return raw ? parseSession(JSON.parse(raw), nowS()) : null;
    } catch {
      return null;
    }
  }
  function write(next: AuthSession | null) {
    try {
      if (next) storage?.setItem(AUTH_KEY, JSON.stringify(toStored(next)));
      else storage?.removeItem(AUTH_KEY);
    } catch {
      /* private mode: the session stays in memory */
    }
  }
  function set(next: AuthSession | null) {
    const changed = session?.user.id !== next?.user.id || Boolean(session) !== Boolean(next);
    session = next;
    write(next);
    if (changed) listeners.forEach((l) => l());
  }

  async function post(path: string, body: unknown, token?: string): Promise<Response> {
    try {
      return await fetchImpl(`${config.url}/auth/v1${path}`, {
        method: "POST",
        headers: { apikey: config.anonKey, Authorization: `Bearer ${token ?? config.anonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthError("NETWORK");
    }
  }

  async function sessionFrom(res: Response): Promise<AuthSession> {
    if (!res.ok) throw new AuthError(res.status >= 500 ? "SERVER" : "REJECTED", res.status);
    const next = parseSession(await res.json().catch(() => null), nowS());
    if (!next) throw new AuthError("SERVER", res.status);
    return next;
  }

  async function refresh(current: AuthSession): Promise<AuthSession | null> {
    // Another tab may already have rotated the refresh token.
    const stored = read();
    if (stored && stored.user.id === current.user.id && stored.expiresAt > current.expiresAt) {
      session = stored;
      if (stored.expiresAt - nowS() > REFRESH_MARGIN_S) return stored;
      current = stored;
    }
    try {
      const next = await sessionFrom(await post("/token?grant_type=refresh_token", { refresh_token: current.refreshToken }));
      set(next);
      return next;
    } catch (err) {
      if (err instanceof AuthError && err.code === "REJECTED") {
        // Revoked / reused refresh token: signed out (unless another tab just stored a fresh one).
        const again = read();
        if (again && again.refreshToken !== current.refreshToken) {
          session = again;
          return again;
        }
        set(null);
        return null;
      }
      return current; // offline: keep the session, the server decides
    }
  }

  return {
    getSession: () => session,
    getUser: () => session?.user ?? null,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    /** `nonce` is the raw nonce; its SHA-256 (hex) went to Google / Apple. */
    async signInWithIdToken(provider: AuthProvider, idToken: string, nonce?: string): Promise<AuthSession> {
      const next = await sessionFrom(await post("/token?grant_type=id_token", { provider, id_token: idToken, ...(nonce ? { nonce } : {}) }));
      set(next);
      return next;
    },

    /** Current access token, refreshed first when it is about to expire; null for guests. */
    async accessToken(): Promise<string | null> {
      if (!session) return null;
      if (session.expiresAt - nowS() > REFRESH_MARGIN_S) return session.accessToken;
      refreshing ??= refresh(session).finally(() => {
        refreshing = null;
      });
      return (await refreshing)?.accessToken ?? null;
    },

    /** Server logout (best effort), then forget the session here. */
    async signOut(): Promise<void> {
      const current = session;
      set(null);
      if (current) await post("/logout", {}, current.accessToken).catch(() => undefined);
    },

    /** Forget the session without calling the server (account already deleted). */
    clear() {
      set(null);
    },
  };
}

// ---- nonce helpers ----

export function randomNonce(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex, the form Supabase compares against the ID token's `nonce` claim. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
