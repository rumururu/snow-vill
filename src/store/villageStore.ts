/**
 * MOCK village store for the M0 prototype.
 *
 * Data lives in memory and is mirrored to this tab's sessionStorage so a
 * reload keeps the demo going. Nothing is sent to a server; other devices and
 * other browsers cannot see these villages. "Ownership" here is a local UX
 * flag, NOT an authorization mechanism (see docs/04-technical-design.md).
 */
import {
  claimHouse as claimHouseRule,
  createSampleVillage,
  createVillage as createVillageRule,
  freeSlots,
  HOUSE_STYLES,
  removeHouse as removeHouseRule,
  SAMPLE_VILLAGE_ID,
  validateVillageName,
  type ClaimResult,
  type HouseInput,
  type Village,
} from "@/lib/village";

export const STORAGE_KEY = "snow-village:m0-mock";

export interface VillageState {
  /** False until client storage has been read (server render / first paint). */
  hydrated: boolean;
  villages: Record<string, Village>;
  /** villageId → houseId claimed from this browser (mock "my house"). */
  myHouses: Record<string, string>;
  /** Villages created from this browser (mock owner role). */
  ownedVillages: string[];
  /** Last persistence problem (e.g. sessionStorage quota with large photos). */
  persistWarning: string | null;
}

export type StoreClaimResult = ClaimResult | { ok: false; reason: "NOT_FOUND" | "ALREADY_JOINED" };

type Listener = () => void;

export interface VillageStoreOptions {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
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

function initialState(hydrated: boolean): VillageState {
  return {
    hydrated,
    villages: { [SAMPLE_VILLAGE_ID]: createSampleVillage() },
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
  const idGen = opts.idGen ?? (() => randomId());
  const now = opts.now ?? (() => new Date());

  let state = initialState(opts.hydrated ?? true);
  const listeners = new Set<Listener>();

  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<VillageState>;
        state = {
          ...state,
          villages: { ...state.villages, ...(saved.villages ?? {}) },
          myHouses: saved.myHouses ?? {},
          ownedVillages: saved.ownedVillages ?? [],
        };
      }
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }

  function persist() {
    if (!storage) return;
    try {
      const { villages, myHouses, ownedVillages } = state;
      storage.setItem(STORAGE_KEY, JSON.stringify({ villages, myHouses, ownedVillages }));
      if (state.persistWarning) state = { ...state, persistWarning: null };
    } catch {
      state = { ...state, persistWarning: "브라우저 임시 저장 공간이 부족해 새로고침하면 일부 내용이 사라질 수 있어요." };
    }
  }

  function set(next: VillageState) {
    state = next;
    persist();
    listeners.forEach((l) => l());
  }

  function updateVillage(village: Village) {
    return { ...state.villages, [village.id]: village };
  }

  return {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    createVillage(name: string): { ok: true; id: string } | { ok: false; error: string } {
      const valid = validateVillageName(name);
      if (!valid.ok) return valid;
      let id = idGen();
      while (state.villages[id]) id = idGen();
      const village = createVillageRule(valid.value, id, now());
      set({ ...state, villages: updateVillage(village), ownedVillages: [...state.ownedVillages, id] });
      return { ok: true, id };
    },

    /** Claim a slot as "me". One house per village per browser in M0. */
    claimHouse(villageId: string, slot: number, input: HouseInput): StoreClaimResult {
      const village = state.villages[villageId];
      if (!village) return { ok: false, reason: "NOT_FOUND" };
      if (state.myHouses[villageId] && village.houses.some((h) => h.id === state.myHouses[villageId]))
        return { ok: false, reason: "ALREADY_JOINED" };
      const result = claimHouseRule(village, slot, input, { id: idGen(), now: now() });
      if (!result.ok) return result;
      set({
        ...state,
        villages: updateVillage(result.village),
        myHouses: { ...state.myHouses, [villageId]: result.house.id },
      });
      return result;
    },

    /** Simulation only: a fictional friend claims a slot (default: first free). */
    simulateFriendClaim(villageId: string, slot?: number): StoreClaimResult {
      const village = state.villages[villageId];
      if (!village) return { ok: false, reason: "NOT_FOUND" };
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
      if (result.ok) set({ ...state, villages: updateVillage(result.village) });
      return result;
    },

    removeHouse(villageId: string, houseId: string) {
      const village = state.villages[villageId];
      if (!village) return;
      const myHouses = { ...state.myHouses };
      if (myHouses[villageId] === houseId) delete myHouses[villageId];
      set({ ...state, villages: updateVillage(removeHouseRule(village, houseId)), myHouses });
    },

    resetSample() {
      const myHouses = { ...state.myHouses };
      delete myHouses[SAMPLE_VILLAGE_ID];
      set({ ...state, villages: updateVillage(createSampleVillage()), myHouses });
    },
  };
}

/** State used for the server render: sample only, not yet hydrated. */
export const SERVER_STATE: VillageState = initialState(false);
