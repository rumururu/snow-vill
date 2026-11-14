/**
 * Village store.
 *
 * - Remote mode (NEXT_PUBLIC_SUPABASE_* set): villages live on Supabase. A guest's ownership is
 *   proven by random secrets the server returned once, kept in this browser's localStorage.
 *   Signing in (optional, lib/auth) moves those to the account (`snowvill_link_device`); from then
 *   on the server's `me.role` / `me.house_id` also count, on every device.
 * - Local/simulated: the bundled sample village ("demo") always, and every village when no
 *   Supabase config exists. Data stays in memory + this tab's sessionStorage.
 */
import { tr, trList } from "@/lib/i18n";
import type { AuthClient, AuthProvider, AuthUser } from "@/lib/auth";
import { dataUrlToBlob, remoteErrorMessage, type Member, type MyVillage, type RemoteApi } from "@/lib/remote";
import {
  claimHouse as claimHouseRule,
  createSampleVillage,
  createVillage as createVillageRule,
  capacityOf,
  MAX_CAPACITY,
  openNextHalf,
  FREE_CAPACITY,
  FREE_OPEN_HALVES,
  freeSlots,
  HOUSE_STYLES,
  removeHouse as removeHouseRule,
  SAMPLE_VILLAGE_ID,
  validateHouseInput,
  validateVillageName,
  type DecorSpots,
  type FieldErrors,
  type House,
  type MemberRole,
  type VillageVisibility,
  type PathStyle,
  type HouseInput,
  type Village,
} from "@/lib/village";
import { LOTS } from "@/lib/map";

/** Types a simulated friend picks (legacy colourways excluded). */
const FRIEND_STYLES = HOUSE_STYLES.filter((x) => x !== "sage" && x !== "indigo");

export const STORAGE_KEY = "snow-village:m0-mock";
export const IDENTITY_KEY = "snow-village:identity:v1";

export type VillageStatus = "loading" | "ready" | "missing" | "error";

export interface VillageState {
  /** False until client storage has been read (server render / first paint). */
  hydrated: boolean;
  villages: Record<string, Village>;
  status: Record<string, VillageStatus>;
  /** villageId → houseId claimed from this browser. */
  myHouses: Record<string, string>;
  /** Villages created from this browser (owner secret held) or owned by the signed-in account. */
  ownedVillages: string[];
  persistWarning: string | null;
  /** Signed-in user, null for guests. */
  account: AuthUser | null;
  /** Signed in: the account's villages from the server (null until loaded). */
  myVillages: MyVillage[] | null;
  /** Owner: join requests and members per village (loaded on demand). */
  members: Record<string, Member[]>;
}

/** One row of the "내 마을" list. */
export interface MyVillageEntry {
  id: string;
  name: string;
  role: Exclude<MemberRole, null>;
  pending: number;
  visibility: VillageVisibility;
}

export type StoreClaimResult =
  | { ok: true; house: House; photoError?: string }
  | { ok: false; reason: "INVALID_SLOT" | "SLOT_TAKEN" | "SLOT_LOCKED" | "VILLAGE_FULL" | "NOT_FOUND" | "ALREADY_JOINED" | "FORBIDDEN" }
  | { ok: false; reason: "INVALID_INPUT"; errors: FieldErrors }
  | { ok: false; reason: "REMOTE_ERROR"; message: string };

export type ActionResult = { ok: true } | { ok: false; message: string };

type Listener = () => void;
type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface Identity {
  installId: string;
  owners: Record<string, string>;
  houses: Record<string, { houseId: string; secret: string }>;
  /** Secrets already moved to this account (`user:key` entries), so they are not sent again. */
  linked?: string[];
}

export interface VillageStoreOptions {
  /** Session storage for simulated data. */
  storage?: KV | null;
  /** Local storage for install id + ownership secrets (remote mode). */
  identityStorage?: KV | null;
  remote?: RemoteApi | null;
  /** Optional sign-in (remote mode only). */
  auth?: AuthClient | null;
  idGen?: () => string;
  now?: () => Date;
  hydrated?: boolean;
}

export function randomId(length = 10): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

function initialState(hydrated: boolean): VillageState {
  return {
    hydrated,
    villages: { [SAMPLE_VILLAGE_ID]: createSampleVillage() },
    status: { [SAMPLE_VILLAGE_ID]: "ready" },
    myHouses: {},
    ownedVillages: [],
    persistWarning: null,
    account: null,
    myVillages: null,
    members: {},
  };
}

/**
 * "내 마을": the account's villages (signed in), then villages this browser owns or lives in
 * (guest secrets) that the server list does not have. The sample village is not listed.
 */
export function myVillageList(state: VillageState): MyVillageEntry[] {
  const out: MyVillageEntry[] = (state.myVillages ?? [])
    .filter((v) => v.role)
    .map((v) => ({ id: v.id, name: v.name, role: v.role!, pending: v.pending, visibility: v.visibility }));
  const seen = new Set(out.map((v) => v.id));
  for (const id of [...state.ownedVillages, ...Object.keys(state.myHouses)]) {
    if (seen.has(id) || id === SAMPLE_VILLAGE_ID || state.status[id] === "missing") continue;
    seen.add(id);
    const v = state.villages[id];
    if (!v) continue;
    out.push({
      id,
      name: v.name,
      role: state.ownedVillages.includes(id) ? "owner" : "resident",
      pending: 0,
      visibility: v.visibility ?? "public",
    });
  }
  return out;
}

export const JOIN_NICKNAME_MAX = 10;


export type VillageStore = ReturnType<typeof createVillageStore>;

export function createVillageStore(opts: VillageStoreOptions = {}) {
  const storage = opts.storage ?? null;
  const identityStorage = opts.identityStorage ?? null;
  const remote = opts.remote ?? null;
  const auth = remote ? (opts.auth ?? null) : null;
  const idGen = opts.idGen ?? (() => randomId());
  const now = opts.now ?? (() => new Date());

  let state = initialState(opts.hydrated ?? true);
  const listeners = new Set<Listener>();
  let identity: Identity = { installId: uuid(), owners: {}, houses: {} };

  const isLocal = (villageId: string) => !remote || villageId === SAMPLE_VILLAGE_ID;

  // ---- restore ----
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<VillageState>;
        const villages = Object.fromEntries(
          Object.entries(saved.villages ?? {})
            .filter(([id]) => isLocal(id))
            .map(([id, v]) => [id, { ...v, capacity: v.capacity ?? FREE_CAPACITY, houses: v.houses.map((h) => ({ ...h, hasPhoto: h.hasPhoto ?? Boolean(h.photo) })) }]),
        );
        state = {
          ...state,
          villages: { ...state.villages, ...villages },
          status: { ...state.status, ...Object.fromEntries(Object.keys(villages).map((id) => [id, "ready" as const])) },
          myHouses: saved.myHouses ?? {},
          ownedVillages: saved.ownedVillages ?? [],
        };
      }
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }
  if (identityStorage && remote) {
    try {
      const raw = identityStorage.getItem(IDENTITY_KEY);
      if (raw) identity = { ...identity, ...(JSON.parse(raw) as Partial<Identity>) };
      else identityStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    } catch {
      /* private mode: identity lives in memory for this page only */
    }
    state = {
      ...state,
      myHouses: { ...state.myHouses, ...Object.fromEntries(Object.entries(identity.houses).map(([v, h]) => [v, h.houseId])) },
      ownedVillages: Array.from(new Set([...state.ownedVillages, ...Object.keys(identity.owners)])),
    };
  }

  if (auth) state = { ...state, account: auth.getUser() };

  // ---- persistence ----
  function persist() {
    if (storage) {
      try {
        const villages = Object.fromEntries(Object.entries(state.villages).filter(([id]) => isLocal(id)));
        const myHouses = Object.fromEntries(Object.entries(state.myHouses).filter(([id]) => isLocal(id)));
        const ownedVillages = state.ownedVillages.filter(isLocal);
        storage.setItem(STORAGE_KEY, JSON.stringify({ villages, myHouses, ownedVillages }));
        if (state.persistWarning) state = { ...state, persistWarning: null };
      } catch {
        state = { ...state, persistWarning: tr("store.persistWarning") };
      }
    }
  }
  function saveIdentity() {
    try {
      identityStorage?.setItem(IDENTITY_KEY, JSON.stringify(identity));
    } catch {
      /* ignore: secrets stay in memory */
    }
  }

  function set(patch: Partial<VillageState>) {
    state = { ...state, ...patch };
    persist();
    listeners.forEach((l) => l());
  }
  const withVillage = (village: Village) => ({
    villages: { ...state.villages, [village.id]: village },
    status: { ...state.status, [village.id]: "ready" as VillageStatus },
  });

  function updateHouse(villageId: string, houseId: string, patch: Partial<House>) {
    const village = state.villages[villageId];
    if (!village) return;
    set(withVillage({ ...village, houses: village.houses.map((h) => (h.id === houseId ? { ...h, ...patch } : h)) }));
  }

  // ---- local (simulated) claim ----
  function claimLocal(villageId: string, slot: number, input: HouseInput): StoreClaimResult {
    const village = state.villages[villageId];
    if (!village) return { ok: false, reason: "NOT_FOUND" };
    if (state.myHouses[villageId] && village.houses.some((h) => h.id === state.myHouses[villageId]))
      return { ok: false, reason: "ALREADY_JOINED" };
    const result = claimHouseRule(village, slot, input, { id: idGen(), now: now() });
    if (!result.ok) return result;
    set({ ...withVillage(result.village), myHouses: { ...state.myHouses, [villageId]: result.house.id } });
    return { ok: true, house: result.house };
  }

  // ---- accounts ----
  /** The signed-in caller's role in a loaded village (server), null for guests. */
  const serverRole = (villageId: string): MemberRole => (state.account ? (state.villages[villageId]?.me?.role ?? null) : null);
  const serverHouse = (villageId: string): string | null => (state.account ? (state.villages[villageId]?.me?.houseId ?? null) : null);
  const isServerOwner = (villageId: string) => serverRole(villageId) === "owner";

  /** Guest secrets for this village; omitted when the account already gives access. */
  function secretsFor(villageId: string): string[] {
    const role = serverRole(villageId);
    if (role === "owner" || role === "resident" || role === "member") return [];
    return [identity.owners[villageId], identity.houses[villageId]?.secret].filter((x): x is string => Boolean(x));
  }

  /** myHouses / ownedVillages for a remote village: this browser's secrets, plus the account (`me`). */
  function minePatch(village: Village): Pick<VillageState, "myHouses" | "ownedVillages"> {
    const id = village.id;
    const myHouses = { ...state.myHouses };
    const house = identity.houses[id]?.houseId ?? (state.account ? (village.me?.houseId ?? null) : null);
    if (house) myHouses[id] = house;
    else delete myHouses[id];
    const owner = Boolean(identity.owners[id]) || (Boolean(state.account) && village.me?.role === "owner");
    const others = state.ownedVillages.filter((v) => v !== id);
    return { myHouses, ownedVillages: owner ? [...others, id] : others };
  }

  /** Guest data from identity only (after sign-out). */
  function guestMine(): Pick<VillageState, "myHouses" | "ownedVillages"> {
    const myHouses = Object.fromEntries(Object.entries(state.myHouses).filter(([id]) => isLocal(id)));
    for (const [v, h] of Object.entries(identity.houses)) myHouses[v] = h.houseId;
    const ownedVillages = Array.from(new Set([...state.ownedVillages.filter(isLocal), ...Object.keys(identity.owners)]));
    return { myHouses, ownedVillages };
  }

  const remoteLoaded = () => Object.keys(state.villages).filter((id) => !isLocal(id));

  /** Moves this browser's guest villages and houses to the account (once per secret). */
  async function linkDevice(user: AuthUser) {
    if (!remote) return;
    const done = new Set(identity.linked ?? []);
    const owners = Object.fromEntries(Object.entries(identity.owners).filter(([v]) => !done.has(`${user.id}:o:${v}`)));
    const houses = Object.fromEntries(
      Object.values(identity.houses)
        .filter((h) => !done.has(`${user.id}:h:${h.houseId}`))
        .map((h) => [h.houseId, h.secret]),
    );
    if (Object.keys(owners).length === 0 && Object.keys(houses).length === 0) return;
    await remote.linkDevice(owners, houses);
    identity = {
      ...identity,
      linked: [...done, ...Object.keys(owners).map((v) => `${user.id}:o:${v}`), ...Object.keys(houses).map((h) => `${user.id}:h:${h}`)].slice(-400),
    };
    saveIdentity();
  }

  async function afterSignIn(user: AuthUser) {
    await linkDevice(user).catch(() => undefined);
    await Promise.all([api.loadMyVillages(), ...remoteLoaded().map((id) => api.loadVillage(id).catch(() => undefined))]);
  }

  function onSignedOut() {
    const villages = Object.fromEntries(
      Object.entries(state.villages).map(([id, v]) => {
        if (!v.me) return [id, v];
        const rest = { ...v };
        delete rest.me;
        return [id, rest];
      }),
    );
    set({ villages, account: null, myVillages: null, members: {} });
    set(guestMine());
    for (const id of remoteLoaded()) api.loadVillage(id).catch(() => undefined);
  }

  auth?.subscribe(() => {
    const user = auth.getUser();
    if (!user && state.account) onSignedOut();
    else if (user && state.account?.id !== user.id) set({ account: user });
  });
  // A session restored from storage: move anything made as a guest since the last link.
  if (state.account) {
    const user = state.account;
    void linkDevice(user)
      .then(() => api.loadMyVillages())
      .catch(() => undefined);
  }

  const api = {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** True when the village is simulated (sample village or no backend configured). */
    isLocal,
    isRemoteEnabled: () => Boolean(remote),

    async createVillage(name: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
      const valid = validateVillageName(name);
      if (!valid.ok) return valid;
      if (!remote) {
        let id = idGen();
        while (state.villages[id]) id = idGen();
        const village = createVillageRule(valid.value, id, now());
        set({ ...withVillage(village), ownedVillages: [...state.ownedVillages, id] });
        return { ok: true, id };
      }
      try {
        const { id, ownerSecret } = await remote.createVillage(identity.installId, valid.value);
        identity = { ...identity, owners: { ...identity.owners, [id]: ownerSecret } };
        // Signed in: the server already stamped the account as owner.
        if (state.account) identity = { ...identity, linked: [...(identity.linked ?? []), `${state.account.id}:o:${id}`] };
        saveIdentity();
        set({
          ...withVillage({ id, name: valid.value, createdAt: now().toISOString(), houses: [], capacity: FREE_CAPACITY, openHalves: FREE_OPEN_HALVES }),
          ownedVillages: [...state.ownedVillages, id],
        });
        return { ok: true, id };
      } catch (err) {
        return { ok: false, error: remoteErrorMessage(err) };
      }
    },

    /** Fetch (or re-fetch) a village. Keeps stale data visible if a refresh fails. */
    async loadVillage(villageId: string): Promise<void> {
      if (isLocal(villageId)) {
        if (!state.villages[villageId]) set({ status: { ...state.status, [villageId]: "missing" } });
        return;
      }
      if (!state.villages[villageId]) set({ status: { ...state.status, [villageId]: "loading" } });
      try {
        const village = await remote!.getVillage(villageId, secretsFor(villageId));
        if (village) set({ ...withVillage(village), ...minePatch(village) });
        else {
          const villages = { ...state.villages };
          delete villages[villageId];
          set({ villages, status: { ...state.status, [villageId]: "missing" } });
        }
      } catch {
        set({ status: { ...state.status, [villageId]: state.villages[villageId] ? "ready" : "error" } });
        throw new Error("load failed");
      }
    },

    async claimHouse(villageId: string, slot: number, input: HouseInput): Promise<StoreClaimResult> {
      if (isLocal(villageId)) return claimLocal(villageId, slot, input);
      const validated = validateHouseInput(input);
      if (!validated.ok) return { ok: false, reason: "INVALID_INPUT", errors: validated.errors };
      let claimed;
      try {
        claimed = await remote!.claimHouse(identity.installId, villageId, slot, validated.value);
      } catch (err) {
        return { ok: false, reason: "REMOTE_ERROR", message: remoteErrorMessage(err) };
      }
      if (!claimed.ok) {
        await api.loadVillage(villageId).catch(() => undefined);
        return claimed;
      }
      if (state.account) {
        // The server bound the house to the account already.
        identity = { ...identity, linked: [...(identity.linked ?? []), `${state.account.id}:h:${claimed.house.id}`] };
      }
      identity = { ...identity, houses: { ...identity.houses, [villageId]: { houseId: claimed.house.id, secret: claimed.claimSecret } } };
      saveIdentity();
      const village = state.villages[villageId];
      if (village) {
        const houses = [...village.houses.filter((h) => h.slot !== slot), claimed.house].sort((a, b) => a.slot - b.slot);
        set({ ...withVillage({ ...village, houses }), myHouses: { ...state.myHouses, [villageId]: claimed.house.id } });
      }
      if (validated.value.photo) {
        const up = await api.uploadPhoto(villageId, claimed.house.id, validated.value.photo);
        if (!up.ok) return { ok: true, house: claimed.house, photoError: up.message };
        return { ok: true, house: { ...claimed.house, hasPhoto: true } };
      }
      return { ok: true, house: claimed.house };
    },

    /** Add or replace the photo of my house. `dataUrl` is an already re-encoded JPEG. */
    async uploadPhoto(villageId: string, houseId: string, dataUrl: string): Promise<ActionResult> {
      if (isLocal(villageId)) {
        updateHouse(villageId, houseId, { photo: dataUrl, hasPhoto: true });
        return { ok: true };
      }
      const mine = identity.houses[villageId];
      const secret = mine?.houseId === houseId ? mine.secret : null;
      if (!secret && serverHouse(villageId) !== houseId) return { ok: false, message: tr("store.photoOnlyMine") };
      try {
        await remote!.uploadPhoto(identity.installId, houseId, secret, dataUrlToBlob(dataUrl));
        updateHouse(villageId, houseId, { hasPhoto: true });
        return { ok: true };
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
    },

    /** Photo source for the frame sheet (local data URL or a short-lived signed URL). */
    async photoUrl(villageId: string, house: House): Promise<string | null> {
      if (!house.hasPhoto) return null;
      if (isLocal(villageId)) return house.photo;
      return remote!.photoUrl(identity.installId, villageId, house.id, secretsFor(villageId));
    },

    async removeHouse(villageId: string, houseId: string): Promise<ActionResult> {
      const village = state.villages[villageId];
      if (!village) return { ok: false, message: tr("store.villageNotFound") };
      if (!isLocal(villageId)) {
        const mine = identity.houses[villageId];
        const secret = (mine?.houseId === houseId ? mine.secret : identity.owners[villageId]) ?? null;
        if (!secret && serverHouse(villageId) !== houseId && !isServerOwner(villageId))
          return { ok: false, message: tr("store.noRemovePermission") };
        try {
          await remote!.removeHouse(identity.installId, houseId, secret);
        } catch (err) {
          return { ok: false, message: remoteErrorMessage(err) };
        }
        if (mine?.houseId === houseId) {
          const houses = { ...identity.houses };
          delete houses[villageId];
          identity = { ...identity, houses };
          saveIdentity();
        }
      }
      const myHouses = { ...state.myHouses };
      if (myHouses[villageId] === houseId) delete myHouses[villageId];
      set({ ...withVillage(removeHouseRule(village, houseId)), myHouses });
      return { ok: true };
    },

    /** May this browser change the village's look? Owner (secret held) or a simulated village. */
    canEditLook(villageId: string): boolean {
      return isLocal(villageId) || Boolean(identity.owners[villageId]) || isServerOwner(villageId);
    },

    /** Owner only: one path style for the whole village and the moved decorations. */
    async setVillageLook(villageId: string, pathStyle: PathStyle, decor: DecorSpots): Promise<ActionResult> {
      const village = state.villages[villageId];
      if (!village) return { ok: false, message: tr("store.villageNotFound") };
      const spots = Object.fromEntries(Object.entries(decor).map(([k, [i, j]]) => [k, [Math.round(i * 100) / 100, Math.round(j * 100) / 100]])) as DecorSpots;
      if (!isLocal(villageId)) {
        const secret = identity.owners[villageId] ?? null;
        if (!secret && !isServerOwner(villageId)) return { ok: false, message: tr("store.ownerOnlyLook") };
        try {
          const r = await remote!.setVillageLook(identity.installId, villageId, secret, pathStyle, spots);
          if (!r.ok) return { ok: false, message: r.reason === "FORBIDDEN" ? tr("store.ownerOnlyLook") : tr("store.villageNotFound") };
        } catch (err) {
          return { ok: false, message: remoteErrorMessage(err) };
        }
      }
      set(withVillage({ ...state.villages[villageId]!, pathStyle, decor: spots }));
      return { ok: true };
    },

    async report(villageId: string, houseId: string, reason: string): Promise<ActionResult & { simulated?: boolean }> {
      if (isLocal(villageId)) return { ok: true, simulated: true };
      try {
        await remote!.report(identity.installId, houseId, reason);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
    },

    async deleteVillage(villageId: string): Promise<ActionResult> {
      if (!isLocal(villageId)) {
        const secret = identity.owners[villageId] ?? null;
        if (!secret && !isServerOwner(villageId)) return { ok: false, message: tr("store.deleteCreatorOnly") };
        try {
          await remote!.deleteVillage(identity.installId, villageId, secret);
        } catch (err) {
          return { ok: false, message: remoteErrorMessage(err) };
        }
        const owners = { ...identity.owners };
        const houses = { ...identity.houses };
        delete owners[villageId];
        delete houses[villageId];
        identity = { ...identity, owners, houses };
        saveIdentity();
      }
      const villages = { ...state.villages };
      delete villages[villageId];
      const myHouses = { ...state.myHouses };
      delete myHouses[villageId];
      set({
        villages,
        myHouses,
        ownedVillages: state.ownedVillages.filter((id) => id !== villageId),
        status: { ...state.status, [villageId]: "missing" },
        myVillages: state.myVillages?.filter((v) => v.id !== villageId) ?? null,
      });
      if (villageId === SAMPLE_VILLAGE_ID) api.resetSample();
      return { ok: true };
    },

    /** Simulation only (local villages): a fictional friend claims a slot (default: first free). */
    simulateFriendClaim(villageId: string, slot?: number): StoreClaimResult {
      const village = state.villages[villageId];
      if (!village || !isLocal(villageId)) return { ok: false, reason: "NOT_FOUND" };
      const target = slot ?? freeSlots(village)[0];
      const n = village.houses.length;
      const names = trList("sim.friendNames");
      const messages = trList("sim.friendMessages", "|");
      const result = claimHouseRule(
        village,
        target ?? -1,
        {
          nickname: names[(n * 3 + (target ?? 0)) % names.length],
          style: FRIEND_STYLES[(n * 5 + (target ?? 0)) % FRIEND_STYLES.length],
          direction: LOTS[target ?? 0]?.facing ?? 0,
          message: messages[n % messages.length],
        },
        { id: idGen(), now: now() },
      );
      if (!result.ok) return result;
      set(withVillage(result.village));
      return { ok: true, house: result.house };
    },

    /**
     * Expansion (+3 houses). Simulated villages grow immediately (demo); real villages grow from the
     * app after an app-store purchase (the server spends the purchased credit).
     */
    upgradeVillage(villageId: string, district: number): ActionResult {
      const village = state.villages[villageId];
      if (!village) return { ok: false, message: tr("store.villageNotFound") };
      if (!isLocal(villageId)) return { ok: false, message: tr("store.expandInApp") };
      if (village.capacity >= MAX_CAPACITY) return { ok: false, message: tr("store.alreadyMax") };
      const open = openNextHalf(village.openHalves, district);
      if (open === null) return { ok: false, message: tr("store.districtFull") };
      set(withVillage({ ...village, openHalves: open, capacity: capacityOf(open) }));
      return { ok: true };
    },

    // ---- accounts and private villages ----

    /** Sign-in is offered only with a backend. */
    canSignIn: () => Boolean(auth),

    /** Google / Apple ID token → session, then this browser's guest data moves to the account. */
    async signIn(provider: AuthProvider, idToken: string, nonce?: string): Promise<ActionResult> {
      if (!auth) return { ok: false, message: tr("remote.server") };
      let user: AuthUser;
      try {
        user = (await auth.signInWithIdToken(provider, idToken, nonce)).user;
      } catch {
        return { ok: false, message: tr("auth.failed") };
      }
      set({ account: user });
      await afterSignIn(user);
      return { ok: true };
    },

    async signOut(): Promise<void> {
      await auth?.signOut();
      if (state.account) onSignedOut();
    },

    /**
     * Deletes the account with its villages, houses and photos. `appleCode`: a fresh Sign in with Apple
     * authorization code so the server can revoke the Apple grant (best effort).
     */
    async deleteAccount(appleCode?: string | null): Promise<ActionResult> {
      if (!auth || !remote || !state.account) return { ok: false, message: tr("remote.forbidden") };
      if (!state.myVillages) await api.loadMyVillages();
      const list = state.myVillages ?? [];
      try {
        await remote.deleteAccount(identity.installId, appleCode);
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
      // Owned villages are gone; so are the account's houses elsewhere.
      const owners = { ...identity.owners };
      const houses = { ...identity.houses };
      const gone: string[] = [];
      for (const v of list) {
        if (v.role === "owner") {
          delete owners[v.id];
          delete houses[v.id];
          gone.push(v.id);
        } else if (v.role === "resident") delete houses[v.id];
      }
      identity = { ...identity, owners, houses, linked: [] };
      saveIdentity();
      const villages = { ...state.villages };
      for (const id of gone) delete villages[id];
      set({ villages, status: { ...state.status, ...Object.fromEntries(gone.map((id) => [id, "missing" as const])) } });
      auth.clear();
      if (state.account) onSignedOut();
      return { ok: true };
    },

    /** "내 마을": the account's list (signed in) and names of this browser's guest villages. */
    async loadMyVillages(): Promise<void> {
      if (!remote) return;
      if (state.account) {
        try {
          set({ myVillages: await remote.myVillages() });
        } catch {
          /* keep the last list */
        }
      }
      const ids = Array.from(new Set([...Object.keys(identity.owners), ...Object.keys(identity.houses)]))
        .filter((id) => !state.villages[id] && state.status[id] !== "missing" && !state.myVillages?.some((v) => v.id === id))
        .slice(0, 30);
      await Promise.all(ids.map((id) => api.loadVillage(id).catch(() => undefined)));
    },

    /** Owner: public / private. Private villages need a signed-in owner. */
    async setVisibility(villageId: string, visibility: VillageVisibility): Promise<ActionResult | { ok: false; signIn: true }> {
      if (!remote || isLocal(villageId)) return { ok: false, message: tr("remote.forbidden") };
      if (!state.account) return { ok: false, signIn: true };
      try {
        const r = await remote.setVisibility(villageId, visibility);
        if (!r.ok) return { ok: false, message: tr("remote.forbidden") };
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
      const village = state.villages[villageId];
      if (village) set(withVillage({ ...village, visibility }));
      set({ myVillages: state.myVillages?.map((v) => (v.id === villageId ? { ...v, visibility } : v)) ?? null });
      return { ok: true };
    },

    /** Signed-in visitor of a private village asks to join under a nickname (1–10 characters). */
    async requestJoin(villageId: string, nickname: string): Promise<ActionResult> {
      const name = nickname.trim();
      if (!name) return { ok: false, message: tr("err.nicknameRequired") };
      if (Array.from(name).length > JOIN_NICKNAME_MAX) return { ok: false, message: tr("err.nicknameTooLong", { max: JOIN_NICKNAME_MAX }) };
      if (!remote || !state.account) return { ok: false, message: tr("remote.forbidden") };
      try {
        const r = await remote.requestJoin(villageId, name);
        if (!r.ok) return { ok: false, message: tr("remote.notFound") };
        const village = state.villages[villageId];
        if (village) set(withVillage({ ...village, me: { role: r.role, houseId: village.me?.houseId ?? null } }));
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
      await Promise.all([api.loadVillage(villageId).catch(() => undefined), api.loadMyVillages()]);
      return { ok: true };
    },

    /** Owner: join requests and members (kept in state.members). */
    async loadMembers(villageId: string): Promise<ActionResult> {
      if (!remote || !state.account || isLocal(villageId)) return { ok: false, message: tr("remote.forbidden") };
      try {
        const list = await remote.membersOf(villageId);
        if (!list) return { ok: false, message: tr("remote.forbidden") };
        set({
          members: { ...state.members, [villageId]: list },
          myVillages:
            state.myVillages?.map((v) => (v.id === villageId ? { ...v, pending: list.filter((m) => m.status === "pending").length } : v)) ?? null,
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
    },

    /** Owner: approve a request, or decline a request / remove a member. */
    async decideMember(villageId: string, userId: string, approve: boolean): Promise<ActionResult> {
      if (!remote || !state.account) return { ok: false, message: tr("remote.forbidden") };
      try {
        if (!(await remote.decideMember(villageId, userId, approve))) return { ok: false, message: tr("remote.notFound") };
      } catch (err) {
        return { ok: false, message: remoteErrorMessage(err) };
      }
      return api.loadMembers(villageId);
    },

    resetSample() {
      const myHouses = { ...state.myHouses };
      delete myHouses[SAMPLE_VILLAGE_ID];
      set({ ...withVillage(createSampleVillage()), myHouses });
    },
  };
  return api;
}

/** State used for the server render: sample only, not yet hydrated. */
export const SERVER_STATE: VillageState = initialState(false);
