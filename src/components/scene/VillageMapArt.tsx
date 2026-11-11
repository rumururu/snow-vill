"use client";

/**
 * Village art (SVG, layout v5): a snowy forest land; the cathedral plaza on a rise in the middle; opened
 * districts are raised clearings joined to it by paths, with their landmark, houses facing their chosen
 * direction and empty lots drawn on the ground (dashed outline + "+"; no grey houses). Closed districts stay
 * forest with a faint outline + name.
 * Never shows photos; names only when `names` is set (the share card passes none).
 */
import { useEffect, useState } from "react";
import {
  areaBank,
  areaOutline,
  AURORA_MIN_HOUSES,
  DISTRICTS,
  HOUSE_TILES,
  houseView,
  landOutline,
  LOTS,
  lotsView,
  mapOrder,
  shapeBank,
  shapeOutline,
  villageShape,
  PATH_WIDTH,
  pathPolygon,
  placeSprite,
  PLAZA_AREA,
  project,
  SNOW_TEXTURE,
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

const LAND = landOutline();
const LAND_TOP = Math.min(...LAND.map((p) => p.y));

function Backdrop({ vb, aurora, base }: { vb: [number, number, number, number]; aurora: boolean; base: [number, number, number, number] }) {
  const left = vb[0] - vb[2];
  const right = vb[0] + vb[2] * 2;
  const horizon = LAND_TOP + 60;
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
      {aurora && (() => {
        // A soft band in the sky just above the hills (behind them), across the village's width.
        const w = base[2] * 1.3;
        const x = base[0] + base[2] / 2 - w / 2;
        const h = 420;
        const y = horizon - 330;
        return (
          <path
            d={`M ${x} ${y + h * 0.45} C ${x + w * 0.3} ${y}, ${x + w * 0.6} ${y + h * 0.55}, ${x + w} ${y + h * 0.2} L ${x + w} ${y + h * 0.5} C ${x + w * 0.6} ${y + h * 0.95}, ${x + w * 0.3} ${y + h * 0.3}, ${x} ${y + h * 0.8} Z`}
            fill="url(#sv-aurora)"
            filter="url(#sv-blur)"
            data-aurora
          />
        );
      })()}
      <path d={hill(horizon, 160, 0.4)} fill="#3B4C74" />
      <path d={hill(horizon + 45, 100, 1.7)} fill="#56688F" />
      <rect x={left} y={horizon + 70} width={right - left} height={Math.abs(vb[3]) * 6 + 8000} fill="url(#sv-field)" />
    </g>
  );
}

/** Snow texture laid on the ground plane (isometric pattern). */
function GroundPattern() {
  const s = 3; // texture repeats every 3 tiles
  return (
    <pattern id="sv-ground" patternUnits="userSpaceOnUse" width={1} height={1}
      patternTransform={`matrix(${(TILE / 2) * s} ${(TILE / 4) * s} ${(-TILE / 2) * s} ${(TILE / 4) * s} 0 0)`}>
      <image href={SNOW_TEXTURE} x={0} y={0} width={1} height={1} preserveAspectRatio="none" />
    </pattern>
  );
}

export function VillageMapArt({ openHalves, houses, view, names = false, ghosts = true, igniteSlot = null, className, title, frame }: Props) {
  const rinkFrame = useRinkFrame();
  const bySlot = new Map(houses.map((h) => [h.slot, h]));
  const village = { openHalves, houses: houses as never[] };
  const vb = view ?? defaultView(openHalves);
  const aurora = houses.length >= AURORA_MIN_HOUSES;
  const order = mapOrder(village as never);
  const closed = DISTRICTS.filter((d) => districtState(openHalves, d.index) === 0);
  const shape = villageShape({ openHalves });
  const openDistricts = DISTRICTS.filter((d) => districtState(openHalves, d.index) > 0);
  // Second halves still closed inside an open district: dashed, locked lots.
  const halfLocked = LOTS.filter((l) => districtState(openHalves, l.district) === 1 && l.half === 1);

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
          <stop offset="0.35" stopColor="#5FE3B0" stopOpacity="0.65" />
          <stop offset="0.7" stopColor="#8FB7FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#C58CFF" stopOpacity="0" />
        </linearGradient>
        <GroundPattern />
        <filter id="sv-blur" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <linearGradient id="sv-bank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C3CEDF" />
          <stop offset="1" stopColor="#9DABC2" />
        </linearGradient>
        <radialGradient id="sv-snow" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.8" stopColor="#F1F5FA" />
          <stop offset="1" stopColor="#DCE4EE" />
        </radialGradient>
      </defs>
      <rect x={vb[0] - 4000} y={vb[1] - 4000} width={vb[2] + 8000} height={vb[3] + 8000} fill="url(#sv-sky)" />
      <Backdrop vb={vb} aurora={aurora} base={lotsView({ openHalves })} />
      <polygon points={pts(LAND)} fill="#DCE4EF" />
      {/* Ghost districts: dashed outline (the forest still covers them); names are drawn on top later. */}
      {ghosts &&
        closed.map((d) => (
          <polygon key={`gh${d.index}`} data-district-ghost={d.index} pointerEvents="none" points={pts(areaOutline(d))} fill="#FFFFFF" fillOpacity="0.1"
            stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth={3} strokeDasharray="14 12" />
        ))}
      {/* The village ground: ONE rounded shape (bank first, then the snowy top), then the cathedral mound. */}
      <g data-area="village">
        {shapeBank(shape).map((q, k) => (
          <polygon key={k} points={pts(q)} fill="url(#sv-bank)" stroke="url(#sv-bank)" strokeWidth={1} />
        ))}
        <polygon points={pts(shapeOutline(shape))} fill="#F4F7FB" />
        <polygon points={pts(shapeOutline(shape))} fill="url(#sv-ground)" opacity={0.85} />
      </g>
      <g data-area="plaza">
        {areaBank(PLAZA_AREA).map((q, k) => (
          <polygon key={k} points={pts(q)} fill="url(#sv-bank)" stroke="url(#sv-bank)" strokeWidth={1} />
        ))}
        <polygon points={pts(areaOutline(PLAZA_AREA))} fill="#DCD3C6" />
        <polygon points={pts(areaOutline(PLAZA_AREA))} fill="url(#sv-ground)" opacity={0.35} />
      </g>
      {/* Paths from the plaza to each opened clearing (ramps between heights). */}
      {openDistricts.map((d) => (
        <g key={`path${d.index}`}>
          <polygon points={pts(pathPolygon(d.path, PATH_WIDTH + 0.25))} fill="#B9AE9F" opacity="0.5" />
          <polygon points={pts(pathPolygon(d.path))} fill="#D6CCBE" />
        </g>
      ))}
      {openDistricts
        .filter((d) => d.pond)
        .map((d) => {
          const ring = d.pond!.map(([i, j]) => project(i, j, d.z));
          const c = project(d.at[0], d.at[1], d.z);
          return (
            <g key={`pond${d.index}`} data-pond>
              <polygon points={pts(ring)} fill="#A9CFE6" stroke="#7FA9C4" strokeWidth={4} />
              <polygon points={pts(ring.map((p) => ({ x: c.x + (p.x - c.x) * 0.72, y: c.y + (p.y - c.y) * 0.72 - 4 })))} fill="#CDE6F4" opacity="0.8" />
              <path d={`M ${c.x - 40} ${c.y - 6} l 34 -10 M ${c.x + 8} ${c.y + 10} l 30 -9`} stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity="0.9" />
            </g>
          );
        })}
      {halfLocked.map((l) => {
        const c = project(l.at[0], l.at[1], l.z);
        return (
          <g key={`hl${l.slot}`} data-lot={l.slot} data-state="locked" opacity={0.6}>
            <polygon points={pts(tileDiamond(l.at[0], l.at[1], HOUSE_TILES * 0.62, l.z))} fill="#B8C4D6" fillOpacity={0.25} stroke="#7D8CA6" strokeWidth={2.4}
              strokeDasharray="8 7" />
            <text x={c.x} y={c.y + 9} textAnchor="middle" fontSize={26}>
              🔒
            </text>
          </g>
        );
      })}
      {order.map((e, n) => {
        if (e.kind === "tree") {
          const t = e.tree;
          const r = placeSprite(t.sprite, t.at[0], t.at[1], t.tiles, t.z);
          const ax = r.x + SPRITES[t.sprite].anchor[0] * r.width;
          return (
            <image key={`t${n}`} href={SPRITES[t.sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
              transform={t.mirror ? `translate(${2 * ax} 0) scale(-1 1)` : undefined} />
          );
        }
        if (e.kind === "facility") {
          const f = e.facility;
          const href = f.sprite === "landmark_rink" && rinkFrame ? rinkFrame : SPRITES[f.sprite].src;
          const r = placeSprite(f.sprite, f.at[0], f.at[1], f.tiles, f.z);
          return (
            <image key={f.id} href={href} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
              data-facility={f.id === "cathedral" || f.id === "tree" ? f.id : f.sprite} />
          );
        }
        const lot = LOTS[e.slot];
        const [i, j] = lot.at;
        const z = lot.z;
        if (e.kind === "lot") {
          const c = project(i, j, z);
          return (
            <g key={`lot-${e.slot}`} data-lot={e.slot} data-state="empty">
              <polygon points={pts(tileDiamond(i, j, HOUSE_TILES * 0.62, z))} fill="#FFFFFF" fillOpacity={0.6} stroke="#708B82" strokeWidth={2.4}
                strokeDasharray="8 7" strokeLinejoin="round" />
              <text x={c.x} y={c.y + 10} textAnchor="middle" fontSize={34} fontWeight={800} fill="#708B82">
                +
              </text>
            </g>
          );
        }
        const h = bySlot.get(e.slot)!;
        const v = houseView(h.style, h.direction);
        const r = placeSprite(v.sprite, i, j, HOUSE_TILES, z);
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
          const c = project(lot.at[0], lot.at[1], lot.z);
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
      {ghosts &&
        closed.map((d) => {
          const c = project(d.at[0], d.at[1], d.z);
          return (
            <g key={`ghn${d.index}`} pointerEvents="none">
              <rect x={c.x - 112} y={c.y - 27} width={224} height={54} rx={27} fill="#1C284A" opacity="0.8" />
              <text x={c.x} y={c.y + 10} textAnchor="middle" fontSize={28} fontWeight={700} fill="#F6F0E4">
                🔒 {d.name.ko}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
