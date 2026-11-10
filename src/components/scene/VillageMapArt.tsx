"use client";

/**
 * Expandable village art (SVG): sky, snow ground sized to the village, ring paths, edge pines,
 * facilities unlocked by house count, houses facing their chosen direction, and empty / locked lots
 * drawn on the ground (dashed outline + "+", no grey houses). Never shows photos; names only when
 * `names` is set (the share card passes none).
 */
import { useEffect, useState } from "react";
import {
  AURORA_MIN_HOUSES,
  groundEllipse,
  groundRadius,
  GROUND_ASPECT,
  HOUSE_TILES,
  houseView,
  lotsView,
  LOTS,
  mapOrder,
  placeSprite,
  project,
  RING_RADII,
  RINK_FRAMES,
  SPRITES,
  TILE,
  tileDiamond,
  visibleLots,
  type Point,
} from "@/lib/map";
import type { Direction, HouseStyle } from "@/lib/village";

export interface MapHouseArt {
  slot: number;
  style: HouseStyle;
  direction: Direction;
  name?: string;
  mine?: boolean;
}

interface Props {
  capacity: number;
  houses: MapHouseArt[];
  /** viewBox [x, y, w, h] in world units; defaults to fitting the whole village. */
  view?: [number, number, number, number];
  /** Show name chips over houses. */
  names?: boolean;
  igniteSlot?: number | null;
  className?: string;
  title?: string;
  /** Position when nested inside another SVG (share card). */
  frame?: { x: number; y: number; width: number; height: number };
}

const pts = (p: Point[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");


export function defaultView(capacity: number, houses: { slot: number }[] = []): [number, number, number, number] {
  return lotsView({ capacity, houses: houses as never });
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

/** Deterministic pine positions around the ground rim (outside the outermost visible ring). */
function rimPines(radius: number): Array<{ i: number; j: number; s: number }> {
  const out: Array<{ i: number; j: number; s: number }> = [];
  const n = Math.round(radius * 1.1);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.37;
    const r = radius - 0.45 + ((k * 7) % 5) * 0.08; // on the rim, clear of the outer ring
    const u = r * Math.SQRT2 * Math.cos(a);
    const v = r * Math.SQRT2 * Math.sin(a) * (GROUND_ASPECT / 0.5);
    out.push({ i: (u + v) / 2, j: (v - u) / 2, s: 0.85 + ((k * 13) % 7) * 0.05 });
  }
  return out;
}

/** Deterministic stars, hills and snowfield around the village plateau. */
function Backdrop({ ry, vb }: { ry: number; vb: [number, number, number, number] }) {
  const horizon = -ry * 0.62;
  const left = vb[0] - vb[2];
  const right = vb[0] + vb[2] * 2;
  const stars = Array.from({ length: 70 }, (_, k) => ({
    x: vb[0] + ((k * 7919) % 1000) / 1000 * vb[2],
    y: vb[1] + ((k * 104729) % 1000) / 1000 * Math.max(10, horizon - vb[1] - 30),
    r: 1.2 + ((k * 31) % 5) * 0.5,
  }));
  const hill = (base: number, amp: number, phase: number) => {
    const pts: string[] = [];
    for (let x = left; x <= right; x += 40) {
      const y = base - amp * (0.55 + 0.45 * Math.sin(x / 170 + phase) * Math.cos(x / 410 + phase * 2));
      pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
    }
    return `M ${left},${base + 400} L ${pts.join(" L ")} L ${right},${base + 400} Z`;
  };
  return (
    <g pointerEvents="none" aria-hidden>
      {stars.map((st, k) => (
        <circle key={k} cx={st.x} cy={st.y} r={st.r} fill="#FFFFFF" opacity={0.35 + (k % 4) * 0.15} />
      ))}
      <path d={hill(horizon, 150, 0.4)} fill="#3B4C74" />
      <path d={hill(horizon + 40, 95, 1.7)} fill="#56688F" />
      {/* Snowfield from the horizon down past the bottom of the view. */}
      <rect x={left} y={horizon + 60} width={right - left} height={Math.max(200, vb[1] + vb[3] - horizon) + 400} fill="url(#sv-field)" />
    </g>
  );
}

export function VillageMapArt({ capacity, houses, view, names = false, igniteSlot = null, className, title, frame }: Props) {
  const rinkFrame = useRinkFrame();
  const bySlot = new Map(houses.map((h) => [h.slot, h]));
  const village = { capacity, houses: houses as never[] } as { capacity: number; houses: { slot: number }[] };
  const lots = visibleLots(village as never);
  const radius = groundRadius(lots);
  const { rx, ry } = groundEllipse(radius);
  const vb = view ?? defaultView(capacity, houses);
  const aurora = houses.length >= AURORA_MIN_HOUSES;
  const outerRing = Math.max(0, ...lots.map((l) => l.ring));
  const order = mapOrder(village as never);
  const pines = rimPines(radius);
  const pinesBack = pines.filter((p) => p.i + p.j < 0);
  const pinesFront = pines.filter((p) => p.i + p.j >= 0);

  const pine = (p: { i: number; j: number; s: number }, k: number) => {
    const r = placeSprite("prop_pines", p.i, p.j, p.s);
    return <image key={`pine-${k}`} href={SPRITES.prop_pines.src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none" />;
  };

  return (
    <svg viewBox={vb.join(" ")} {...frame} className={className} role="img" aria-label={title ?? "겨울 마을 지도"} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C284A" />
          <stop offset="0.55" stopColor="#3A4E7A" />
          <stop offset="1" stopColor="#7C8DB0" />
        </linearGradient>
        <linearGradient id="sv-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5FE3B0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#5FE3B0" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#8FB7FF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#C58CFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sv-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B7C5DA" />
          <stop offset="0.25" stopColor="#DDE6F0" />
          <stop offset="1" stopColor="#F3F6FA" />
        </linearGradient>
        <radialGradient id="sv-snow" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.8" stopColor="#EEF3F8" />
          <stop offset="1" stopColor="#D5DEEA" />
        </radialGradient>
      </defs>
      {/* Sky fills whatever the camera shows. */}
      <rect x={vb[0] - 4000} y={vb[1] - 4000} width={vb[2] + 8000} height={vb[3] + 8000} fill="url(#sv-sky)" />
      {aurora && (
        <path
          d={`M ${-rx * 1.3} ${-ry - TILE * 1.2} C ${-rx * 0.4} ${-ry - TILE * 2.6}, ${rx * 0.3} ${-ry - TILE * 0.6}, ${rx * 1.3} ${-ry - TILE * 2.2} L ${rx * 1.3} ${-ry - TILE * 1.4} C ${rx * 0.3} ${-ry + TILE * 0.1}, ${-rx * 0.4} ${-ry - TILE * 1.9}, ${-rx * 1.3} ${-ry - TILE * 0.5} Z`}
          fill="url(#sv-aurora)"
          data-aurora
        />
      )}
      {/* Backdrop: stars, two layers of distant snowy hills at the horizon, and a snowfield that runs
          to the bottom of the view, so a tall phone screen never shows an empty sky below the village. */}
      <Backdrop ry={ry} vb={vb} />
      {/* Snow ground: a soft shadow lip, the disc, and faint ring paths. */}
      <ellipse cx={0} cy={TILE * 0.12} rx={rx * 1.01} ry={ry * 1.05} fill="#9FB0C8" opacity="0.55" />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="url(#sv-snow)" data-ground={radius.toFixed(1)} />
      {RING_RADII.slice(0, outerRing + 1).map((r, k) => {
        const e = groundEllipse(r - 1.05);
        return <ellipse key={k} cx={0} cy={0} rx={e.rx} ry={e.ry} fill="none" stroke="#D7E1EC" strokeWidth={TILE * 0.18} opacity="0.55" />;
      })}
      {pinesBack.map(pine)}
      {order.map((e) => {
        if (e.kind === "facility") {
          const f = e.facility;
          const href = f.id === "rink" && rinkFrame ? rinkFrame : SPRITES[f.sprite].src;
          const r = placeSprite(f.sprite, f.at[0], f.at[1], f.tiles);
          return <image key={f.id} href={href} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none" data-facility={f.id} />;
        }
        const lot = LOTS[e.slot];
        const [i, j] = lot.at;
        if (e.kind === "lot") {
          const locked = e.slot >= capacity;
          const c = project(i, j);
          return (
            <g key={`lot-${e.slot}`} data-lot={e.slot} data-state={locked ? "locked" : "empty"} opacity={locked ? 0.55 : 1}>
              <polygon points={pts(tileDiamond(i, j, HOUSE_TILES * 0.62))} fill={locked ? "#B8C4D6" : "#FFFFFF"} fillOpacity={locked ? 0.25 : 0.45}
                stroke={locked ? "#7D8CA6" : "#708B82"} strokeWidth={2.2} strokeDasharray="7 6" strokeLinejoin="round" />
              <text x={c.x} y={c.y + 7} textAnchor="middle" fontSize={locked ? 26 : 34} fontWeight={800} fill={locked ? "#7D8CA6" : "#708B82"}>
                {locked ? "🔒" : "+"}
              </text>
            </g>
          );
        }
        const h = bySlot.get(e.slot)!;
        const v = houseView(h.style, h.direction);
        const r = placeSprite(v.sprite, i, j, HOUSE_TILES);
        const ax = r.x + SPRITES[v.sprite].anchor[0] * r.width;
        const igniting = igniteSlot === e.slot;
        return (
          <g key={`h-${e.slot}`} data-slot={e.slot} data-house-style={h.style} data-direction={h.direction}>
            <image
              href={SPRITES[v.sprite].src}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              preserveAspectRatio="none"
              transform={v.mirror ? `translate(${2 * ax} 0) scale(-1 1)` : undefined}
              className={igniting ? "sv-ignite" : undefined}
            />
          </g>
        );
      })}
      {pinesFront.map(pine)}
      {/* Name chips on roofs: drawn last so neighbours never cover them. */}
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
