import { Snowfall } from "@/components/scene/Snowfall";
import { VillageMapArt, type MapHouseArt } from "@/components/scene/VillageMapArt";
import { LOTS } from "@/lib/map";
import { FREE_OPEN_HALVES } from "@/lib/village";
import { useT } from "@/lib/i18n/I18nProvider";

/** Decorative hero: a small free village (6 lots, 4 houses lit, 2 lots waiting for friends). Illustrative, no user data. */
const HERO_HOUSES: MapHouseArt[] = ([[0, "brick"], [1, "gingerbread"], [2, "bakery"], [4, "timber"]] as const).map(([slot, style]) => ({
  slot,
  style,
  direction: LOTS[slot].facing,
}));

export function LandingHero() {
  const t = useT();
  return (
    <div className="relative mx-auto mt-4 w-full max-w-[440px] overflow-hidden rounded-3xl">
      <VillageMapArt openHalves={FREE_OPEN_HALVES} houses={HERO_HOUSES} className="h-auto w-full" title={t("landing.heroAlt")} />
      <Snowfall />
    </div>
  );
}
