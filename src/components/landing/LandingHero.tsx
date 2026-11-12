import { Snowfall } from "@/components/scene/Snowfall";
import { VillageMapArt, type MapHouseArt } from "@/components/scene/VillageMapArt";
import { LOTS } from "@/lib/map";
import { useT } from "@/lib/i18n/I18nProvider";

/** Decorative hero: a lively 15-house village (illustrative, no user data). */
const HERO_STYLES = ["brick", "bakery", "tower", "gingerbread", "timber", "aframe", "windmill", "greenhouse", "wood"] as const;
const HERO_HOUSES: MapHouseArt[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13].map((slot, k) => ({
  slot,
  style: HERO_STYLES[k % HERO_STYLES.length],
  direction: LOTS[slot].facing,
}));

export function LandingHero() {
  const t = useT();
  return (
    <div className="relative mx-auto mt-4 w-full max-w-[440px] overflow-hidden rounded-3xl">
      <VillageMapArt openHalves={0b11111} houses={HERO_HOUSES} className="h-auto w-full" title={t("landing.heroAlt")} />
      <Snowfall />
    </div>
  );
}
