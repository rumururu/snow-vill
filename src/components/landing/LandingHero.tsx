import { SceneArt } from "@/components/scene/SceneArt";
import { Snowfall } from "@/components/scene/Snowfall";
import { HOUSE_STYLES } from "@/lib/village";

/** Decorative hero: a mostly lit village (illustrative, no user data). */
const HERO_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => ({
  slot,
  style: slot === 6 ? null : HOUSE_STYLES[slot % 3],
}));

export function LandingHero() {
  return (
    <div className="relative mx-auto mt-4 aspect-square w-full max-w-[400px] overflow-hidden rounded-3xl">
      <SceneArt slots={HERO_SLOTS} idPrefix="hero" className="h-full w-full" title="불이 켜진 집들이 모인 겨울 마을 그림" />
      <Snowfall />
    </div>
  );
}
