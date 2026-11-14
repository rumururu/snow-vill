"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { villagePath } from "@/lib/share";
import { myVillageList } from "@/store/villageStore";
import { useVillageState, useVillageStore } from "@/store/VillageStoreProvider";

/** "내 마을": the account's villages when signed in, plus villages this browser owns or lives in. */
export function MyVillages() {
  const t = useT();
  const store = useVillageStore();
  const state = useVillageState();
  const accountId = state.account?.id ?? null;

  useEffect(() => {
    if (state.hydrated) void store.loadMyVillages();
  }, [store, state.hydrated, accountId]);

  const list = myVillageList(state);
  if (list.length === 0) return null;

  return (
    <section className="mt-7" aria-labelledby="my-villages-title">
      <h2 id="my-villages-title" className="mb-2 text-[17px] font-extrabold text-night">
        {t("home.myVillages")}
      </h2>
      <ul className="flex flex-col gap-2">
        {list.map((v) => (
          <li key={v.id}>
            <Link
              href={villagePath(v.id)}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
              data-testid={`my-village-${v.id}`}
            >
              <span aria-hidden className="text-xl">
                {v.role === "owner" ? "🏡" : v.role === "pending" ? "✉️" : "🏠"}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold text-night">{v.name}</span>
              {v.visibility === "private" && (
                <span className="text-sm" role="img" aria-label={t("private.badge")}>
                  🔒
                </span>
              )}
              {v.role === "pending" && (
                <span className="shrink-0 rounded-full bg-night/8 px-2 py-0.5 text-[11px] font-semibold text-night/70">
                  {t("home.waiting")}
                </span>
              )}
              {v.role === "owner" && v.pending > 0 && (
                <span
                  className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#B5523B] px-1.5 text-xs font-bold text-white"
                  aria-label={t("home.pendingSr", { count: v.pending })}
                >
                  {v.pending}
                </span>
              )}
              <span aria-hidden className="text-night/40">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
