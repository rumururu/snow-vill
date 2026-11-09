"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createVillageStore, SERVER_STATE, type VillageState, type VillageStore } from "./villageStore";

const StoreContext = createContext<VillageStore | null>(null);

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function VillageStoreProvider({ children, store }: { children: ReactNode; store?: VillageStore }) {
  const [value] = useState(() => store ?? createVillageStore({ storage: browserStorage() }));
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useVillageStore(): VillageStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useVillageStore must be used inside VillageStoreProvider");
  return store;
}

export function useVillageState(): VillageState {
  const store = useVillageStore();
  return useSyncExternalStore(store.subscribe, store.getState, () => SERVER_STATE);
}
