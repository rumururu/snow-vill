import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { createVillageStore, type VillageStore } from "@/store/villageStore";
import { VillageStoreProvider } from "@/store/VillageStoreProvider";
import { LocaleProvider } from "@/lib/i18n/I18nProvider";

export const routerMock = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn(), forward: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

export function renderWithStore(ui: ReactElement, store: VillageStore = createVillageStore({ storage: null })) {
  return {
    store,
    ...render(
      <LocaleProvider>
        <VillageStoreProvider store={store}>
          <div id="app-root">{ui}</div>
        </VillageStoreProvider>
      </LocaleProvider>,
    ),
  };
}
