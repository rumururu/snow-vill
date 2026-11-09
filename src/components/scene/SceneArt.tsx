/**
 * Village scene art: background + 8 house sprites + tree, drawn rear → front in 1024×1024 world
 * space. Sprites are original art generated for this project (assets/source/PROVENANCE.md) and
 * placed with geometry measured by scripts/build_assets.py.
 *
 * Never receives participant photos or names — shared by the interactive scene and the
 * photo-free share card.
 */
import { BACKGROUND_SRC, renderOrder, SLOTS, SPRITES, spriteRect, TREE_ANCHOR, TREE_TILE_WORLD, WORLD_SIZE } from "@/lib/scene";
import type { HouseStyle } from "@/lib/village";

export interface SceneSlotArt {
  slot: number;
  /** null = unclaimed lot (lights off). */
  style: HouseStyle | null;
}

interface SceneArtProps {
  slots: SceneSlotArt[];
  complete?: boolean;
  /** Slot that plays the 0.6s illumination (lit sprite fades in over the empty one). */
  igniteSlot?: number | null;
  className?: string;
  title?: string;
}

const LIT: Record<HouseStyle, keyof typeof SPRITES> = {
  wood: "house_wood_lit",
  sage: "house_sage_lit",
  indigo: "house_indigo_lit",
};

export function houseSprite(style: HouseStyle | null) {
  return SPRITES[style ? LIT[style] : "house_empty"];
}

function Sprite({ name, ground, tile, className }: { name: keyof typeof SPRITES; ground: { x: number; y: number }; tile?: number; className?: string }) {
  const r = spriteRect(name, ground, tile);
  return (
    <image
      href={SPRITES[name].src}
      x={r.x}
      y={r.y}
      width={r.width}
      height={r.height}
      className={className}
      data-sprite={name}
      preserveAspectRatio="none"
    />
  );
}

export function SceneArt({ slots, complete = false, igniteSlot = null, className, title }: SceneArtProps) {
  const styleBySlot = new Map(slots.map((s) => [s.slot, s.style]));
  return (
    <svg
      viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
      className={className}
      role="img"
      aria-label={title ?? "겨울 마을 장면"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <image href={BACKGROUND_SRC} x={0} y={0} width={WORLD_SIZE} height={WORLD_SIZE} preserveAspectRatio="none" />
      {renderOrder().map((e) => {
        if (e.kind === "tree")
          return (
            <g key="tree" data-tree={complete ? "complete" : "base"}>
              <Sprite name={complete ? "tree_complete" : "tree_base"} ground={TREE_ANCHOR} tile={TREE_TILE_WORLD} />
            </g>
          );
        const def = SLOTS[e.slot];
        const style = styleBySlot.get(e.slot) ?? null;
        const igniting = style !== null && igniteSlot === e.slot;
        return (
          <g key={e.slot} data-slot={e.slot} data-house-style={style ?? "empty"}>
            {(style === null || igniting) && <Sprite name="house_empty" ground={def.anchor} />}
            {style !== null && <Sprite name={LIT[style]} ground={def.anchor} className={igniting ? "sv-ignite" : undefined} />}
          </g>
        );
      })}
    </svg>
  );
}
