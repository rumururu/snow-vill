/**
 * Supabase access (dedicated snow-village project, prefix snowvill_).
 * The browser only calls RPC functions and the snowvill-photo Edge Function; tables and the photo
 * bucket are not reachable directly (see supabase/migrations). Guests send the anon key; a signed-in
 * user sends the access token (docs/12-accounts-and-private-villages.md, "Client contract").
 */
import { tr } from "./i18n";
import { capacityOf, cleanDecor, type MemberRole, type VillageVisibility, FREE_CAPACITY, halvesForCapacity, isDirection, isHouseStyle, isPathStyle, MAX_CAPACITY, type DecorSpots, type Direction, type House, type HouseStyle, type PathStyle, type Village } from "./village";

/** Opened district halves from the server (falls back to halves in order for older responses). */
function districtsOf(v: RemoteVillage): { capacity: number; openHalves: number } {
  const open = typeof v.open_halves === "number" && v.open_halves > 0 ? v.open_halves : halvesForCapacity(normalizeCapacity(v.capacity));
  return { capacity: capacityOf(open), openHalves: open };
}

/** Server capacity is 6, 9, … 60; anything else (older rows, bad data) falls back to the nearest valid size. */
function normalizeCapacity(c: unknown): number {
  const n = typeof c === "number" && Number.isFinite(c) ? Math.round(c) : FREE_CAPACITY;
  return Math.min(MAX_CAPACITY, Math.max(FREE_CAPACITY, Math.ceil(n / 3) * 3));
}

export interface RemoteConfig {
  url: string;
  anonKey: string;
}

export function remoteConfig(): RemoteConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url: url.replace(/\/$/, ""), anonKey } : null;
}

export type RemoteErrorCode =
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TOO_LARGE"
  | "UNSUPPORTED"
  | "NETWORK"
  | "SERVER";

export class RemoteError extends Error {
  constructor(public code: RemoteErrorCode, public status = 0) {
    super(code);
  }
}

/** User message for a remote failure (active language). */
export function remoteErrorMessage(err: unknown): string {
  const code = err instanceof RemoteError ? err.code : "SERVER";
  switch (code) {
    case "RATE_LIMITED":
      return tr("remote.rateLimited");
    case "NETWORK":
      return tr("remote.network");
    case "INVALID_INPUT":
      return tr("remote.invalidInput");
    case "FORBIDDEN":
      return tr("remote.forbidden");
    case "NOT_FOUND":
      return tr("remote.notFound");
    case "TOO_LARGE":
      return tr("remote.tooLarge");
    case "UNSUPPORTED":
      return tr("remote.unsupported");
    default:
      return tr("remote.server");
  }
}

function statusToCode(status: number, bodyCode?: string): RemoteErrorCode {
  if (bodyCode && ["INVALID_INPUT", "RATE_LIMITED", "FORBIDDEN", "NOT_FOUND", "TOO_LARGE", "UNSUPPORTED"].includes(bodyCode))
    return bodyCode as RemoteErrorCode;
  if (status === 429) return "RATE_LIMITED";
  if (status === 400) return "INVALID_INPUT";
  if (status === 403 || status === 401) return "FORBIDDEN";
  if (status === 404) return bodyCode === "NO_PHOTO" ? "NOT_FOUND" : "NOT_FOUND";
  if (status === 413) return "TOO_LARGE";
  if (status === 415) return "UNSUPPORTED";
  return "SERVER";
}

type Fetch = typeof fetch;

/** Signed-in access token (refreshed when needed) or null for guests. */
export type TokenSource = () => Promise<string | null>;

export interface MyVillage {
  id: string;
  name: string;
  capacity: number;
  visibility: VillageVisibility;
  createdAt: string;
  role: MemberRole;
  houses: number;
  /** Pending join requests (owned villages only). */
  pending: number;
}

export interface Member {
  userId: string;
  nickname: string;
  status: "pending" | "approved";
  createdAt: string;
}

type ClaimFailure = "SLOT_TAKEN" | "SLOT_LOCKED" | "VILLAGE_FULL" | "NOT_FOUND" | "ALREADY_JOINED" | "FORBIDDEN";

export function createRemoteApi(config: RemoteConfig, fetchImpl: Fetch = (...a) => fetch(...a), token: TokenSource = async () => null) {
  async function authHeaders(): Promise<Record<string, string>> {
    const access = await token().catch(() => null);
    return { apikey: config.anonKey, Authorization: `Bearer ${access ?? config.anonKey}` };
  }

  async function request(url: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, headers: { ...(await authHeaders()), ...(init.headers as Record<string, string>) } });
    } catch {
      throw new RemoteError("NETWORK");
    }
    if (!res.ok) {
      let bodyCode: string | undefined;
      try {
        const body = await res.json();
        bodyCode = typeof body?.error === "string" ? body.error : undefined;
        if (!bodyCode && typeof body?.code === "string" && body.code === "PT429") bodyCode = "RATE_LIMITED";
      } catch {
        /* non-JSON error body */
      }
      throw new RemoteError(statusToCode(res.status, bodyCode), res.status);
    }
    return res;
  }

  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await request(`${config.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  async function photoFn<T>(body: Record<string, unknown> | FormData): Promise<T> {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await request(`${config.url}/functions/v1/snowvill-photo`, {
      method: "POST",
      headers: isForm ? {} : { "Content-Type": "application/json" },
      body: isForm ? body : JSON.stringify(body),
    });
    return (await res.json()) as T;
  }

  return {
    async createVillage(installId: string, name: string) {
      const r = await rpc<{ id: string; owner_secret: string }>("snowvill_create_village", {
        p_install_id: installId,
        p_name: name,
      });
      return { id: r.id, ownerSecret: r.owner_secret };
    },

    /** `secrets`: the guest's owner / claim secrets for this village (private villages). */
    async getVillage(villageId: string, secrets: string[] = []): Promise<Village | null> {
      const r = await rpc<RemoteVillage | null>("snowvill_get_village", {
        p_village_id: villageId,
        ...(secrets.length ? { p_secrets: secrets } : {}),
      });
      return r ? toVillage(r) : null;
    },

    async claimHouse(
      installId: string,
      villageId: string,
      slot: number,
      input: { nickname: string; style: HouseStyle; direction: Direction; message: string },
    ): Promise<{ ok: true; house: House; claimSecret: string } | { ok: false; reason: ClaimFailure }> {
      let r: { ok: true; claim_secret: string; house: RemoteHouse } | { ok: false; reason: ClaimFailure };
      try {
        r = await rpc("snowvill_claim_house", {
        p_install_id: installId,
        p_village_id: villageId,
        p_slot: slot,
        p_nickname: input.nickname,
        p_style: input.style,
        p_message: input.message,
        p_direction: input.direction,
        });
      } catch (err) {
        // Private village and not owner / approved member → 403 (401 for guests); second house for the account → 409.
        if (err instanceof RemoteError && (err.status === 403 || err.status === 401)) return { ok: false, reason: "FORBIDDEN" };
        if (err instanceof RemoteError && err.status === 409) return { ok: false, reason: "ALREADY_JOINED" };
        throw err;
      }
      return r.ok ? { ok: true, house: toHouse(r.house), claimSecret: r.claim_secret } : r;
    },

    /** Owner only: path style for the whole village and the moved decorations. `ownerSecret` null = signed-in owner. */
    async setVillageLook(
      installId: string,
      villageId: string,
      ownerSecret: string | null,
      pathStyle: PathStyle,
      decor: DecorSpots,
    ): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }> {
      const r = await rpc<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" }>("snowvill_set_village_look", {
        p_install_id: installId,
        p_village_id: villageId,
        p_owner_secret: ownerSecret,
        p_path_style: pathStyle,
        p_decor: decor,
      });
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    },

    async report(installId: string, houseId: string, reason: string) {
      await rpc("snowvill_report", { p_install_id: installId, p_house_id: houseId, p_reason: reason });
    },

    /** `secret` null = signed-in resident (the account proves it). */
    async uploadPhoto(installId: string, houseId: string, secret: string | null, jpeg: Blob) {
      const form = new FormData();
      form.set("install_id", installId);
      form.set("house_id", houseId);
      if (secret) form.set("secret", secret);
      form.set("file", jpeg, "photo.jpg");
      await photoFn(form);
    },

    async photoUrl(installId: string, villageId: string, houseId: string, secrets: string[] = []): Promise<string> {
      const r = await photoFn<{ url: string }>({
        action: "view",
        install_id: installId,
        village_id: villageId,
        house_id: houseId,
        ...(secrets.length ? { secrets } : {}),
      });
      return r.url;
    },

    async removeHouse(installId: string, houseId: string, secret: string | null) {
      await photoFn({ action: "remove", install_id: installId, house_id: houseId, ...(secret ? { secret } : {}) });
    },

    async deleteVillage(installId: string, villageId: string, secret: string | null) {
      await photoFn({ action: "delete_village", install_id: installId, village_id: villageId, ...(secret ? { secret } : {}) });
    },

    // ---- signed in ----

    /** Moves this browser's guest villages ({villageId: ownerSecret}) and houses ({houseId: claimSecret}) to the account. */
    async linkDevice(owners: Record<string, string>, houses: Record<string, string>): Promise<{ villages: number; houses: number }> {
      const r = await rpc<{ villages?: number; houses?: number } | null>("snowvill_link_device", { p_owner: owners, p_houses: houses });
      return { villages: r?.villages ?? 0, houses: r?.houses ?? 0 };
    },

    async myVillages(): Promise<MyVillage[]> {
      const r = await rpc<RemoteMyVillage[] | null>("snowvill_my_villages", {});
      return (r ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        capacity: normalizeCapacity(v.capacity),
        visibility: v.visibility === "private" ? "private" : "public",
        createdAt: v.created_at,
        role: toRole(v.role),
        houses: Number(v.houses) || 0,
        pending: Number(v.pending) || 0,
      }));
    },

    async setVisibility(villageId: string, visibility: VillageVisibility): Promise<{ ok: true } | { ok: false; reason: "FORBIDDEN" }> {
      const r = await rpc<{ ok: boolean }>("snowvill_set_visibility", { p_village_id: villageId, p_visibility: visibility });
      return r?.ok ? { ok: true } : { ok: false, reason: "FORBIDDEN" };
    },

    async requestJoin(villageId: string, nickname: string): Promise<{ ok: true; role: MemberRole } | { ok: false; reason: "NOT_FOUND" }> {
      const r = await rpc<{ ok: boolean; role?: string }>("snowvill_request_join", { p_village_id: villageId, p_nickname: nickname });
      return r?.ok ? { ok: true, role: toRole(r.role) } : { ok: false, reason: "NOT_FOUND" };
    },

    /** Owner: join requests and approved members; null for anyone else. */
    async membersOf(villageId: string): Promise<Member[] | null> {
      const r = await rpc<RemoteMember[] | null>("snowvill_members_of", { p_village_id: villageId });
      if (!Array.isArray(r)) return null;
      return r.map((m) => ({
        userId: m.user_id,
        nickname: m.nickname,
        status: m.status === "approved" ? "approved" : "pending",
        createdAt: m.created_at,
      }));
    },

    /** Owner: approve a request (true), or decline a request / remove a member (false). */
    async decideMember(villageId: string, userId: string, approve: boolean): Promise<boolean> {
      const r = await rpc<{ ok: boolean }>("snowvill_decide_member", { p_village_id: villageId, p_user_id: userId, p_approve: approve });
      return Boolean(r?.ok);
    },

    /** Deletes the signed-in account with its villages, houses and photos. `appleCode` lets the server revoke Apple. */
    async deleteAccount(installId: string, appleCode?: string | null) {
      await photoFn({ action: "delete_account", install_id: installId, ...(appleCode ? { apple_code: appleCode, apple_client: "web" } : {}) });
    },
  };
}

export type RemoteApi = ReturnType<typeof createRemoteApi>;

interface RemoteHouse {
  id: string;
  slot: number;
  nickname: string;
  style: string;
  direction?: number;
  message: string;
  has_photo: boolean;
  created_at: string;
}
interface RemoteMyVillage {
  id: string;
  name: string;
  capacity?: number;
  visibility?: string;
  created_at: string;
  role?: string | null;
  houses?: number;
  pending?: number;
}
interface RemoteMember {
  user_id: string;
  nickname: string;
  status: string;
  created_at: string;
}
interface RemoteVillage {
  id: string;
  name: string;
  created_at: string;
  visibility?: string;
  locked?: boolean;
  me?: { role?: string | null; house_id?: string | null } | null;
  capacity?: number;
  open_halves?: number;
  path_style?: string;
  decor?: unknown;
  houses: RemoteHouse[];
}

function toHouse(h: RemoteHouse): House {
  return {
    id: h.id,
    slot: h.slot,
    nickname: h.nickname,
    style: isHouseStyle(h.style) ? h.style : "wood",
    direction: isDirection(h.direction) ? h.direction : 0,
    message: h.message ?? "",
    photo: null,
    hasPhoto: Boolean(h.has_photo),
    createdAt: h.created_at,
  };
}

function toRole(r: unknown): MemberRole {
  return r === "owner" || r === "resident" || r === "member" || r === "pending" ? r : null;
}

function toVillage(v: RemoteVillage): Village {
  return {
    id: v.id,
    name: v.name,
    createdAt: v.created_at ?? "",
    visibility: v.visibility === "private" ? "private" : "public",
    ...(v.locked ? { locked: true } : {}),
    ...(v.me ? { me: { role: toRole(v.me.role), houseId: v.me.house_id ?? null } } : {}),
    ...districtsOf(v),
    pathStyle: isPathStyle(v.path_style) ? v.path_style : "dirt",
    decor: cleanDecor(v.decor),
    houses: (v.houses ?? []).map(toHouse),
  };
}

/** data:image/jpeg;base64,… → Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const type = /data:([^;]+)/.exec(meta)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
