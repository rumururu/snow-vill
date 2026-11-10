"use client";

/**
 * Village art (SVG): the cathedral plaza island in the middle, district islands ("동네") joined to it by
 * paths, a faint outline + name for districts that are not open yet, facilities, houses facing their
 * chosen direction, and empty lots drawn on the ground (dashed outline + "+"; no grey houses).
 * Never shows photos; names only when `names` is set (the share card passes none).
 */
import { useEffect, useState } from "react";
import {
  AURORA_MIN_HOUSES,
  DISTRICTS,
  HOUSE_TILES,
  houseView,
  LOTS,
  lotsView,
  mapOrder,
  placeSprite,
  PLAZA_PLOT,
  PLOT_TILES,
  project,
  RINK_FRAMES,
  SPRITES,
  TILE,
  tileDiamond,
  type Point,
} from "@/lib/map";
import { districtState, type Direction, type HouseStyle } from "@/lib/village";

export interface MapHouseArt {
  slot: number;
  style: HouseStyle;
  direction: Direction;
  name?: string;
  mine?: boolean;
}

interface Props {
  openHalves: number;
  houses: MapHouseArt[];
  /** viewBox [x, y, w, h] in world units; defaults to framing the opened districts. */
  view?: [number, number, number, number];
  /** Show name chips over houses. */
  names?: boolean;
  /** Show closed districts as outlines with their names. */
  ghosts?: boolean;
  igniteSlot?: number | null;
  className?: string;
  title?: string;
  /** Position when nested inside another SVG (share card). */
  frame?: { x: number; y: number; width: number; height: number };
}

const pts = (p: Point[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

export function defaultView(openHalves: number): [number, number, number, number] {
  return lotsView({ openHalves });
}

function useRinkFrame(): string | null {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (RINK_FRAMES.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % RINK_FRAMES.length), 140);
    return () => window.clearInterval(t);
  }, []);
  return RINK_FRAMES.length ? RINK_FRAMES[i] : null;
}

function Backdrop({ vb }: { vb: [number, number, number, number] }) {
  const left = vb[0] - vb[2];
  const right = vb[0] + vb[2] * 2;
  const horizon = vb[1] + vb[3] * 0.22;
  const stars = Array.from({ length: 70 }, (_, k) => ({
    x: vb[0] + (((k * 7919) % 1000) / 1000) * vb[2],
    y: vb[1] + (((k * 104729) % 1000) / 1000) * Math.max(10, horizon - vb[1] - 20),
    r: 1.4 + ((k * 31) % 5) * 0.6,
  }));
  const hill = (base: number, amp: number, phase: number) => {
    const p: string[] = [];
    for (let x = left; x <= right; x += 40) {
      const y = base - amp * (0.55 + 0.45 * Math.sin(x / 190 + phase) * Math.cos(x / 430 + phase * 2));
      p.push(`${x.toFixed(0)},${y.toFixed(0)}`);
    }
    return `M ${left},${base + 400} L ${p.join(" L ")} L ${right},${base + 400} Z`;
  };
  return (
    <g pointerEvents="none" aria-hidden>
      {stars.map((st, k) => (
        <circle key={k} cx={st.x} cy={st.y} r={st.r} fill="#FFFFFF" opacity={0.35 + (k % 4) * 0.15} />
      ))}
      <path d={hill(horizon, 160, 0.4)} fill="#3B4C74" />
      <path d={hill(horizon + 45, 100, 1.7)} fill="#56688F" />
      <rect x={left} y={horizon + 70} width={right - left} height={Math.abs(vb[3]) * 4} fill="url(#sv-field)" />
    </g>
  );
}

/** A fenced snowy plot (art). Closed districts: faded, with the district name and a lock. */
function Plot({ sprite, at, ghost, label, index }: { sprite: string; at: [number, number]; ghost: boolean; label?: string; index: number }) {
  const r = placeSprite(sprite, at[0], at[1], PLOT_TILES);
  const c = project(at[0], at[1]);
  return (
    <g data-plot={index} data-district-ghost={ghost ? index : undefined} pointerEvents="none" opacity={ghost ? 0.38 : 1}>
      <image href={SPRITES[sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
        style={ghost ? { filter: "grayscale(0.6) brightness(1.08)" } : undefined} />
      {ghost && label && (
        <g transform={`translate(${c.x} ${c.y})`} opacity={2.4}>
          <rect x={-112} y={-27} width={224} height={54} rx={27} fill="#1C284A" opacity="0.85" />
          <text x={0} y={10} textAnchor="middle" fontSize={28} fontWeight={700} fill="#F6F0E4">
            🔒 {label}
          </text>
        </g>
      )}
    </g>
  );
}

export function VillageMapArt({ openHalves, houses, view, names = false, ghosts = true, igniteSlot = null, className, title, frame }: Props) {
  const rinkFrame = useRinkFrame();
  const bySlot = new Map(houses.map((h) => [h.slot, h]));
  const village = { openHalves, houses: houses as never[] };
  const vb = view ?? defaultView(openHalves);
  const aurora = houses.length >= AURORA_MIN_HOUSES;
  const order = mapOrder(village as never);
  const open = DISTRICTS.filter((d) => districtState(openHalves, d.index) > 0);
  const closed = DISTRICTS.filter((d) => districtState(openHalves, d.index) === 0);
  // Second halves still closed inside an open district: dashed, locked lots.
  const halfLocked = LOTS.filter((l) => districtState(openHalves, l.district) === 1 && l.half === 1);

  const layered = order.map((e) => ({ kind: "entity" as const, e, depth: e.depth }));

  return (
    <svg viewBox={vb.join(" ")} {...frame} className={className} role="img" aria-label={title ?? "겨울 마을 지도"} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C284A" />
          <stop offset="0.6" stopColor="#3A4E7A" />
          <stop offset="1" stopColor="#7C8DB0" />
        </linearGradient>
        <linearGradient id="sv-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B7C5DA" />
          <stop offset="0.12" stopColor="#D3DDEA" />
          <stop offset="1" stopColor="#E9EFF6" />
        </linearGradient>
        <linearGradient id="sv-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5FE3B0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#5FE3B0" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#8FB7FF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#C58CFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sv-snow" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.8" stopColor="#F1F5FA" />
          <stop offset="1" stopColor="#DCE4EE" />
        </radialGradient>
      </defs>
      <rect x={vb[0] - 4000} y={vb[1] - 4000} width={vb[2] + 8000} height={vb[3] + 8000} fill="url(#sv-sky)" />
      <Backdrop vb={vb} />
      {aurora && (
        <path
          d={`M ${vb[0]} ${vb[1] + vb[3] * 0.12} C ${vb[0] + vb[2] * 0.3} ${vb[1] - vb[3] * 0.02}, ${vb[0] + vb[2] * 0.6} ${vb[1] + vb[3] * 0.2}, ${vb[0] + vb[2]} ${vb[1] + vb[3] * 0.05} L ${vb[0] + vb[2]} ${vb[1] + vb[3] * 0.13} C ${vb[0] + vb[2] * 0.6} ${vb[1] + vb[3] * 0.28}, ${vb[0] + vb[2] * 0.3} ${vb[1] + vb[3] * 0.06}, ${vb[0]} ${vb[1] + vb[3] * 0.2} Z`}
          fill="url(#sv-aurora)"
          data-aurora
        />
      )}
      {/* Plots back → front (the board is drawn under every house and facility). */}
      {[{ index: -1, at: [0, 0] as [number, number], plot: PLAZA_PLOT, ghost: false, label: undefined as string | undefined },
        ...open.map((d) => ({ index: d.index, at: d.at, plot: d.plot, ghost: false, label: undefined as string | undefined })),
        ...(ghosts ? closed.map((d) => ({ index: d.index, at: d.at, plot: d.plot, ghost: true, label: d.name.ko })) : [])]
        .sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]))
        .map((p) => (
          <Plot key={`plot${p.index}`} sprite={p.plot} at={p.at} ghost={p.ghost} label={p.label} index={p.index} />
        ))}
      {halfLocked.map((l) => {
        const c = project(l.at[0], l.at[1]);
        return (
          <g key={`hl${l.slot}`} data-lot={l.slot} data-state="locked" opacity={0.6}>
            <polygon points={pts(tileDiamond(l.at[0], l.at[1], HOUSE_TILES * 0.62))} fill="#B8C4D6" fillOpacity={0.25} stroke="#7D8CA6" strokeWidth={2.4}
              strokeDasharray="8 7" />
            <text x={c.x} y={c.y + 9} textAnchor="middle" fontSize={26}>
              🔒
            </text>
          </g>
        );
      })}
      {layered.map((item) => {
        const e = item.e;
        if (e.kind === "facility") {
          const f = e.facility;
          const href = f.sprite === "landmark_rink" && rinkFrame ? rinkFrame : SPRITES[f.sprite].src;
          const r = placeSprite(f.sprite, f.at[0], f.at[1], f.tiles);
          return (
            <image key={f.id} href={href} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
              data-facility={f.id === "cathedral" || f.id === "tree" ? f.id : f.sprite} />
          );
        }
        const lot = LOTS[e.slot];
        const [i, j] = lot.at;
        if (e.kind === "lot") {
          const c = project(i, j);
          return (
            <g key={`lot-${e.slot}`} data-lot={e.slot} data-state="empty">
              <polygon points={pts(tileDiamond(i, j, HOUSE_TILES * 0.62))} fill="#FFFFFF" fillOpacity={0.45} stroke="#708B82" strokeWidth={2.4}
                strokeDasharray="8 7" strokeLinejoin="round" />
              <text x={c.x} y={c.y + 10} textAnchor="middle" fontSize={34} fontWeight={800} fill="#708B82">
                +
              </text>
            </g>
          );
        }
        const h = bySlot.get(e.slot)!;
        const v = houseView(h.style, h.direction);
        const r = placeSprite(v.sprite, i, j, HOUSE_TILES);
        const ax = r.x + SPRITES[v.sprite].anchor[0] * r.width;
        return (
          <g key={`h-${e.slot}`} data-slot={e.slot} data-house-style={h.style} data-direction={h.direction}>
            <image href={SPRITES[v.sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
              transform={v.mirror ? `translate(${2 * ax} 0) scale(-1 1)` : undefined} className={igniteSlot === e.slot ? "sv-ignite" : undefined} />
          </g>
        );
      })}
      {names &&
        houses.map((h) => {
          const lot = LOTS[h.slot];
          if (!lot || !h.name) return null;
          const c = project(lot.at[0], lot.at[1]);
          const label = h.mine ? `내 집 · ${h.name}` : h.name;
          const w = Math.min(230, 34 + Array.from(label).length * 21);
          return (
            <g key={`n-${h.slot}`} transform={`translate(${c.x} ${c.y - TILE * HOUSE_TILES * 1.12})`} pointerEvents="none">
              <rect x={-w / 2} y={-19} width={w} height={38} rx={19} fill={h.mine ? "#1C284A" : "#F6F0E4"} opacity="0.95" />
              <text x={0} y={8} textAnchor="middle" fontSize={23} fontWeight={700} fill={h.mine ? "#F6F0E4" : "#1C284A"}>
                {label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
