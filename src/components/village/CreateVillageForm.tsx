"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { VillageMap } from "@/components/scene/VillageMap";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { charLength, FREE_CAPACITY, FREE_OPEN_HALVES, MAX_CAPACITY, VILLAGE_NAME_MAX, type Village } from "@/lib/village";
import { villagePath } from "@/lib/share";
import { useVillageStore } from "@/store/VillageStoreProvider";
import { useT } from "@/lib/i18n/I18nProvider";

const PREVIEW_DATE = "2026-12-01T00:00:00.000Z";

/** S02 — name the village, then land on the scene with the first-claim prompt. */
export function CreateVillageForm() {
  const router = useRouter();
  const store = useVillageStore();
  const t = useT();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview: Village = { id: "preview", name: name.trim() || t("create.defaultName"), createdAt: PREVIEW_DATE, houses: [], capacity: FREE_CAPACITY, openHalves: FREE_OPEN_HALVES };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await store.createVillage(name);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(villagePath(result.id, { new: "1" }));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-1">
        <Link
          href="/"
          aria-label={t("common.back")}
          className="grid h-11 w-11 place-items-center rounded-full text-xl text-night hover:bg-night/5"
        >
          ←
        </Link>
        <span className="flex-1" />
        {!store.isRemoteEnabled() && <SimulatedBadge />}
      </header>

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <label htmlFor="village-name" className="mt-4 block px-1 text-2xl font-extrabold text-night">
          {t("create.title")}
        </label>
        <input
          id="village-name"
          name="villageName"
          value={name}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "village-name-error" : "village-name-hint"}
          placeholder={t("create.placeholder")}
          className="mt-3 min-h-14 w-full rounded-2xl border border-night/20 bg-white px-4 text-lg text-night outline-none focus:border-night focus:ring-2 focus:ring-night/30 aria-[invalid=true]:border-[#B5523B]"
        />
        {error ? (
          <p id="village-name-error" role="alert" className="mt-1 px-1 text-sm text-[#B5523B]">
            {error}
          </p>
        ) : (
          <p id="village-name-hint" className="mt-1 px-1 text-xs text-night/60">
            {t("create.count", { count: charLength(name.trim()), max: VILLAGE_NAME_MAX })}
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-3xl" aria-hidden>
          <VillageMap village={preview} />
        </div>
        <p className="mt-2 text-center text-sm text-night/70">
          {t("create.note", { free: FREE_CAPACITY, max: MAX_CAPACITY })}
        </p>

        <button
          type="submit"
          disabled={busy}
          className="mt-auto min-h-14 w-full rounded-2xl bg-night text-lg font-bold text-ivory shadow-md disabled:opacity-60"
        >
          {busy ? t("create.submitting") : t("create.submit")}
        </button>
      </form>
    </main>
  );
}
