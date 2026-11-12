"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useT } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n";
import { districtName, DISTRICTS } from "@/lib/map";
import { districtState, EXPANSION_STEP, MAX_CAPACITY, stepTier, TIER_PRICE_KRW, type Village } from "@/lib/village";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

/** District facility sprite → its name (message key). */
const FACILITY_LABEL: Record<string, MessageKey> = {
  decor_snowfamily: "facility.decor_snowfamily",
  landmark_rink: "facility.landmark_rink",
  landmark_santa: "facility.landmark_santa",
  landmark_rudolph: "facility.landmark_rudolph",
  decor_sled: "facility.decor_sled",
  prop_pines: "facility.prop_pines",
  prop_lamp: "facility.prop_lamp",
};

/**
 * "마을 넓히기": each paid step (in the app) opens 3 lots — the next half of a district the buyer picks.
 * Free 6 → 9 ₩2,900 → 12 ₩6,900 → 15 ₩12,900 → then ₩25,900 per step, up to 60.
 */
export function UpgradeSheet({
  village,
  open,
  district,
  simulated,
  onClose,
  onSimulatedUpgrade,
}: {
  village: Village;
  open: boolean;
  /** District pre-selected from the map (tap on a closed district), or null. */
  district: number | null;
  simulated: boolean;
  onClose: () => void;
  onSimulatedUpgrade: (district: number) => void;
}) {
  const t = useT();
  const tier = stepTier(village.capacity);
  const choices = DISTRICTS.filter((d) => districtState(village.openHalves, d.index) < 2);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? district ?? choices.find((d) => districtState(village.openHalves, d.index) === 1)?.index ?? choices[0]?.index ?? null;
  const sel = selected !== null ? DISTRICTS[selected] : null;
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={t("common.expand")}
      footer={
        tier === 0 || !sel ? (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">{t("upgrade.maxed", { max: MAX_CAPACITY })}</p>
        ) : simulated ? (
          <button type="button" onClick={() => (setPicked(null), onSimulatedUpgrade(sel.index))} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
            {t("upgrade.simOpen", { district: districtName(sel.index, t.locale) })}
          </button>
        ) : (
          <p className="rounded-2xl bg-sky px-4 py-3 text-center text-sm font-semibold text-night">
            {/* KRW list prices only in Korean; other languages see the local store price in the app. */}
            {t("upgrade.inApp", { price: won(TIER_PRICE_KRW[tier]), district: districtName(sel.index, t.locale) })}
          </p>
        )
      }
    >
      <div className="space-y-3 text-[15px] leading-relaxed text-night">
        <p>
          {t.rich("upgrade.lead", { name: <b>{village.name}</b>, step: EXPANSION_STEP }, village.capacity)}
        </p>
        {tier > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("upgrade.pick")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {choices.map((d) => {
                const half = districtState(village.openHalves, d.index) === 1;
                const facKey = d.facility ? FACILITY_LABEL[d.facility.sprite] : undefined;
                const fac = facKey ? t(facKey) : null;
                return (
                  <label
                    key={d.index}
                    className="flex cursor-pointer flex-col rounded-xl border-2 border-transparent bg-white px-3 py-2 text-sm has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
                  >
                    <input type="radio" name="district" value={d.index} checked={selected === d.index} onChange={() => setPicked(d.index)} className="sr-only" />
                    <span className="font-semibold">{districtName(d.index, t.locale)}</span>
                    <span className="text-xs text-night/65">
                      {half ? t("upgrade.halfOpen") : t("upgrade.newDistrict")}
                      {fac && !half ? ` · ${fac}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="text-xs text-night/65">
          {t("upgrade.prices", {
            p1: won(TIER_PRICE_KRW[1]),
            p2: won(TIER_PRICE_KRW[2]),
            p3: won(TIER_PRICE_KRW[3]),
            p4: won(TIER_PRICE_KRW[4]),
            max: MAX_CAPACITY,
          })}{" "}
          {t("upgrade.anyone")}
        </p>
      </div>
    </BottomSheet>
  );
}
