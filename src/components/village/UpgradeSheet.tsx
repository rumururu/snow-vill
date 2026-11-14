"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useT } from "@/lib/i18n/I18nProvider";
import { districtName, DISTRICTS, SPRITES } from "@/lib/map";
import { districtState, MAX_CAPACITY, stepTier, TIER_PRICE_KRW, type Village } from "@/lib/village";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;


/**
 * "마을 넓히기": each paid step (in the app) opens 3 lots — the next half of a district the buyer picks.
 * Only the choice and the price are shown (owner 2026-11-14: no price ladder or explanations).
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
      <div className="text-[15px] leading-relaxed text-night">
        {tier > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("upgrade.pick")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {choices.map((d) => {
                const half = districtState(village.openHalves, d.index) === 1;
                return (
                  <label
                    key={d.index}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-transparent bg-white px-2 py-1.5 text-sm has-[:checked]:border-night has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-night/30"
                  >
                    <input type="radio" name="district" value={d.index} checked={selected === d.index} onChange={() => setPicked(d.index)} className="sr-only" />
                    {/* The district's landmark (its name comes from it); the lake has a pond. */}
                    {d.facility ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={SPRITES[d.facility.sprite].src} alt="" className="h-13 w-13 shrink-0 object-contain" />
                    ) : (
                      <span aria-hidden className="grid h-13 w-13 shrink-0 place-items-center">
                        <span className="h-5 w-11 rounded-full border-2 border-[#7FA9C4] bg-[#A9CFE6]" />
                      </span>
                    )}
                    <span className="flex flex-col">
                      <span className="font-semibold hyphens-auto" lang={t.locale}>{districtName(d.index, t.locale)}</span>
                      {half && <span className="text-xs text-night/65">{t("upgrade.halfOpen")}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>
    </BottomSheet>
  );
}
