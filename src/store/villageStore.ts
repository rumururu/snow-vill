/**
 * Village store.
 *
 * - Remote mode (NEXT_PUBLIC_SUPABASE_* set): villages live on the shared Supabase project.
 *   Ownership is proven by random secrets the server returned once; they are kept in this
 *   browser's localStorage (lost if site data is cleared — owner recovery is still open, see
 *   docs/09-decisions.md).
 * - Local/simulated: the bundled sample village ("demo") always, and every village when no
 *   Supabase config exists. Data stays in memory + this tab's sessionStorage.
 */
import { dataUrlToBlob, remoteErrorMessage, type RemoteApi } from "@/lib/remote";
import {
  claimHouse as claimHouseRule,
  createSampleVillage,
  createVillage as createVillageRule,
  freeSlots,
  HOUSE_STYLES,
  removeHouse as removeHouseRule,
  SAMPLE_VILLAGE_ID,
  validateHouseInput,
  validateVillageName,
  type FieldErrors,
  type House,
  type HouseInput,
  type Village,
} from "@/lib/village";

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
  /** Villages created from this browser (owner secret held). */
  ownedVillages: string[];
  persistWarning: string | null;
}

export type StoreClaimResult =
  | { ok: true; house: House; photoError?: string }
  | { ok: false; reason: "INVALID_SLOT" | "SLOT_TAKEN" | "VILLAGE_FULL" | "NOT_FOUND" | "ALREADY_JOINED" }
  | { ok: false; reason: "INVALID_INPUT"; errors: FieldErrors }
  | { ok: false; reason: "REMOTE_ERROR"; message: string };

export type ActionResult = { ok: true } | { ok: false; message: string };

type Listener = () => void;
type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface Identity {
  installId: string;
  owners: Record<string, string>;
  houses: Record<string, { houseId: string; secret: string }>;
}

export interface VillageStoreOptions {
  /** Session storage for simulated data. */
  storage?: KV | null;
  /** Local storage for install id + ownership secrets (remote mode). */
  identityStorage?: KV | null;
  remote?: RemoteApi | null;
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
  };
}

const FRIEND_NAMES = ["지우", "민준", "하린", "예준", "소율", "시우", "다은", "윤호", "채원", "준서"];
const FRIEND_MESSAGES = ["메리 크리스마스!", "내년에도 같이 놀자 ⛄", "", "따뜻한 연말 보내", "선물 기대해도 돼?"];

export type VillageStore = ReturnType<typeof createVillageStore>;

export function createVillageStore(opts: VillageStoreOptions = {}) {
  const storage = opts.storage ?? null;
  const identityStorage = opts.identityStorage ?? null;
  const remote = opts.remote ?? null;
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
            .map(([id, v]) => [id, { ...v, houses: v.houses.map((h) => ({ ...h, hasPhoto: h.hasPhoto ?? Boolean(h.photo) })) }]),
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
        state = { ...state, persistWarning: "브라우저 임시 저장 공간이 부족해 새로고침하면 일부 내용이 사라질 수 있어요." };
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
        saveIdentity();
        set({
          ...withVillage({ id, name: valid.value, createdAt: now().toISOString(), houses: [] }),
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
        const village = await remote!.getVillage(villageId);
        if (village) set(withVillage(village));
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
      if (!mine || mine.houseId !== houseId) return { ok: false, message: "내 집에만 사진을 올릴 수 있어요." };
      try {
        await remote!.uploadPhoto(identity.installId, houseId, mine.secret, dataUrlToBlob(dataUrl));
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
      return remote!.photoUrl(identity.installId, villageId, house.id);
    },

    async removeHouse(villageId: string, houseId: string): Promise<ActionResult> {
      const village = state.villages[villageId];
      if (!village) return { ok: false, message: "마을을 찾을 수 없어요." };
      if (!isLocal(villageId)) {
        const mine = identity.houses[villageId];
        const secret = mine?.houseId === houseId ? mine.secret : identity.owners[villageId];
        if (!secret) return { ok: false, message: "이 집을 비울 권한이 없어요." };
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
        const secret = identity.owners[villageId];
        if (!secret) return { ok: false, message: "마을을 만든 브라우저에서만 삭제할 수 있어요." };
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
      const result = claimHouseRule(
        village,
        target ?? -1,
        {
          nickname: FRIEND_NAMES[(n * 3 + (target ?? 0)) % FRIEND_NAMES.length],
          style: HOUSE_STYLES[(target ?? 0) % HOUSE_STYLES.length],
          message: FRIEND_MESSAGES[n % FRIEND_MESSAGES.length],
        },
        { id: idGen(), now: now() },
      );
      if (!result.ok) return result;
      set(withVillage(result.village));
      return { ok: true, house: result.house };
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
