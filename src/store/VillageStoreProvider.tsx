"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createRemoteApi, remoteConfig } from "@/lib/remote";
import { createVillageStore, SERVER_STATE, type VillageState, type VillageStore } from "./villageStore";

const StoreContext = createContext<VillageStore | null>(null);

function browserStorage(kind: "sessionStorage" | "localStorage"): Storage | null {
  try {
    return typeof window === "undefined" ? null : window[kind];
  } catch {
    return null;
  }
}

function createBrowserStore(): VillageStore {
  const config = remoteConfig();
  return createVillageStore({
    storage: browserStorage("sessionStorage"),
    identityStorage: browserStorage("localStorage"),
    remote: config ? createRemoteApi(config) : null,
  });
}

export function VillageStoreProvider({ children, store }: { children: ReactNode; store?: VillageStore }) {
  const [value] = useState(() => store ?? createBrowserStore());
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
