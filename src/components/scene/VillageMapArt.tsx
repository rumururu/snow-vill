"use client";

/**
 * Village art (SVG, layout v5): a snowy forest land; the cathedral plaza on a rise in the middle; opened
 * districts are raised clearings joined to it by paths, with their landmark, houses facing their chosen
 * direction and empty lots drawn on the ground (dashed outline + "+"; no grey houses). Closed districts stay
 * forest with a faint outline + name.
 * Never shows photos; names only when `names` is set (the share card passes none).
 */
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  areaBank,
  areaOutline,
  AURORA_MIN_HOUSES,
  DISTRICTS,
  districtName,
  ELEVATION_PX,
  HOUSE_TILES,
  houseView,
  landOutline,
  LOTS,
  lotsView,
  cameraView,
  plazaShown,
  villageFence,
  mapOrder,
  shapeOutline,
  villageShape,
  pathBand,
  pathSteps,
  plazaFence,
  plazaSlope,
  type PathBand,
  type PathStep,
  type GZ,
  convexHullPoints,
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
import { districtState, type DecorSpots, type Direction, type HouseStyle, type PathStyle } from "@/lib/village";

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
  /** Default camera [x, y, w, h]: a closed district's name chip is drawn only when it fits inside (no half-cut
   *  chips around the small starting village). Same rule as the app's `_chipArea`. */
  chipArea?: [number, number, number, number];
  igniteSlot?: number | null;
  className?: string;
  title?: string;
  /** Position when nested inside another SVG (share card). */
  frame?: { x: number; y: number; width: number; height: number };
  /** One path style for the whole village (default dirt). */
  pathStyle?: PathStyle;
  /** Decorations the owner moved (id → ground spot). */
  decor?: DecorSpots;
}

const pts = (p: Point[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

export function defaultView(openHalves: number): [number, number, number, number] {
  return cameraView({ openHalves });
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
      <path d={hill(horizon, 160, 0.4)} fill="#5A5F9A" />
      <path d={hill(horizon + 45, 100, 1.7)} fill="#7C80B8" />
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

/** The village ground: a cleared snowfield level with the forest floor (owner 2026-11-14: no raised slab).
 *  A wide blurred band of snow spills past the edge so the clearing blends into the field instead of ending in a cut. */
function Clearing({ outline }: { outline: Point[] }) {
  return (
    <>
      <polygon points={pts(outline)} fill="#E4E1F2" stroke="#E4E1F2" strokeWidth={70} strokeLinejoin="round" filter="url(#sv-soft-wide)" opacity={0.85} />
      <polygon points={pts(outline)} fill="url(#sv-snow)" filter="url(#sv-soft-thin)" />
      <polygon points={pts(outline)} fill="url(#sv-ground)" opacity={0.7} />
    </>
  );
}

/** A raised snowy slab: stone wall sides with mortar joints, a soft shadow under a rounded snow lip, then the top. */
function Slab({ id, outline, bank, drop, top, texture, lip, rim = 0.3, rimColor = "#B3AAD6" }: { id: string; rim?: number; rimColor?: string; outline: Point[]; bank: Point[][]; drop: number; top: string; texture: number; lip: number }) {
  const shift = (d: number) => outline.map((p) => ({ x: p.x, y: p.y + d }));
  const joints = outline
    .filter((_, k) => k % 2 === 0)
    .map((p, k) => (k % 2 ? `M ${p.x.toFixed(1)} ${(p.y + drop * 0.5).toFixed(1)} v ${(drop * 0.5).toFixed(1)}` : `M ${p.x.toFixed(1)} ${(p.y + drop * 0.1).toFixed(1)} v ${(drop * 0.4).toFixed(1)}`))
    .join(" ");
  return (
    <>
      {bank.map((q, k) => (
        <polygon key={k} points={pts(q)} fill="url(#sv-bank)" stroke="url(#sv-bank)" strokeWidth={1} />
      ))}
      {drop > 24 && (
        <>
          <polygon points={pts(shift(drop * 0.5))} fill="none" stroke="#575174" strokeOpacity={0.45} strokeWidth={2} />
          <path d={joints} stroke="#575174" strokeOpacity={0.4} strokeWidth={2} />
        </>
      )}
      <polygon points={pts(shift(lip * 0.6))} fill="none" stroke="#4A4470" strokeOpacity={0.4} strokeWidth={lip * 1.2} filter="url(#sv-soft)" />
      <polygon points={pts(outline)} fill={top} stroke="#FAF8FE" strokeWidth={lip} strokeLinejoin="round" />
      <polygon points={pts(outline)} fill="url(#sv-ground)" opacity={texture} />
      {/* Inner shading along the rim: the snow reads as a soft, rounded pillow instead of a flat cut. */}
      <clipPath id={id}>
        <polygon points={pts(outline)} />
      </clipPath>
      <polygon clipPath={`url(#${id})`} points={pts(outline)} fill="none" stroke={rimColor} strokeOpacity={rim} strokeWidth={lip * 5} filter="url(#sv-soft-wide)" />
    </>
  );
}

const gz = (p: GZ) => project(p[0], p[1], p[2]);

/** A dirt path: soft dusky edge, the brown band, a lighter worn middle, snow banked along both edges, a few snow patches. */
function DirtPath({ band }: { band: PathBand }) {
  if (band.left.length < 2) return null;
  const L = band.left.map(gz);
  const R = band.right.map(gz);
  const poly = pts([...L, ...[...R].reverse()]);
  const mid = (f: number) => pts([...band.left.map((p, k) => gz([p[0] + (band.right[k][0] - p[0]) * f, p[1] + (band.right[k][1] - p[1]) * f, p[2]])),
    ...band.right.map((p, k) => gz([p[0] + (band.left[k][0] - p[0]) * f, p[1] + (band.left[k][1] - p[1]) * f, p[2]])).reverse()]);
  return (
    <g data-path-dirt>
      <polygon points={poly} fill="#5E4A64" opacity={0.35} stroke="#5E4A64" strokeWidth={14} strokeLinejoin="round" filter="url(#sv-soft)" />
      <polygon points={poly} fill="#9A7A62" stroke="#9A7A62" strokeWidth={2} strokeLinejoin="round" />
      <polygon points={mid(0.3)} fill="#B4937A" opacity={0.55} filter="url(#sv-soft-thin)" />
      <polyline points={pts(L)} fill="none" stroke="#F7F4FC" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} filter="url(#sv-soft-thin)" />
      <polyline points={pts(R)} fill="none" stroke="#F7F4FC" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} filter="url(#sv-soft-thin)" />
    </g>
  );
}

/** Point at sample k of a band, fraction f across it (0 = left edge, 1 = right edge). */
function across(band: PathBand, k: number, f: number): GZ {
  const l = band.left[k];
  const r = band.right[k];
  return [l[0] + (r[0] - l[0]) * f, l[1] + (r[1] - l[1]) * f, l[2]];
}
const rnd = (k: number) => {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Trodden snow under stepping stones / footprints: a soft lavender band without a hard edge. */
function SnowBand({ band, opacity }: { band: PathBand; opacity: number }) {
  const poly = pts([...band.left.map(gz), ...[...band.right].reverse().map(gz)]);
  return <polygon points={poly} fill="#BDB2D6" opacity={opacity} stroke="#BDB2D6" strokeWidth={8} strokeLinejoin="round" filter="url(#sv-soft)" />;
}

/**
 * Stepping stones: ONE stone every 0.48 tiles, alternating a little left/right, never touching
 * (radius 0.17–0.2 tiles, spacing 0.48). Shadow, body, top highlight and a snow cap on some.
 */
function StonesPath({ band, seed }: { band: PathBand; seed: number }) {
  const stones = band.left.map((_, k) => k).filter((k) => k % 4 === 2);
  return (
    <g data-path-style="stones">
      <SnowBand band={band} opacity={0.5} />
      {stones.map((k, n) => {
        const c = gz(across(band, k, n % 2 ? 0.36 : 0.64));
        const h = rnd(seed * 101 + n);
        const rx = (0.17 + h * 0.03) * TILE * 0.72;
        const ry = rx * 0.52;
        const body = h < 0.33 ? "#9A8F8A" : h < 0.66 ? "#A89D96" : "#B4AAA2";
        return (
          <g key={k}>
            <ellipse cx={c.x + 1} cy={c.y + 3.5} rx={rx} ry={ry} fill="#4E4670" opacity={0.35} />
            <ellipse cx={c.x} cy={c.y} rx={rx} ry={ry} fill={body} />
            <ellipse cx={c.x - rx * 0.12} cy={c.y - ry * 0.22} rx={rx * 0.66} ry={ry * 0.5} fill="#D2C9C2" opacity={0.85} />
            {h > 0.6 && <ellipse cx={c.x + rx * 0.3} cy={c.y - ry * 0.25} rx={rx * 0.4} ry={ry * 0.34} fill="#FFFFFF" opacity={0.95} />}
          </g>
        );
      })}
    </g>
  );
}

/** Brick path: muted red-brown band in running bond (rows every 0.24 tiles), snow banked along the edges. */
function BrickPath({ band }: { band: PathBand }) {
  const L = band.left.map(gz);
  const R = band.right.map(gz);
  const poly = pts([...L, ...[...R].reverse()]);
  const rows = band.left.map((_, k) => k).filter((k) => k % 2 === 0);
  let joints = "";
  rows.forEach((k, n) => {
    const a = L[k];
    const b = R[k];
    joints += `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)} `;
    const next = rows[n + 1];
    if (next === undefined) return;
    for (const f of n % 2 ? [0.25, 0.75] : [0.5]) {
      const p = gz(across(band, k, f));
      const q = gz(across(band, next, f));
      joints += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${q.x.toFixed(1)} ${q.y.toFixed(1)} `;
    }
  });
  return (
    <g data-path-style="brick">
      <polygon points={poly} fill="#5E4A64" opacity={0.35} stroke="#5E4A64" strokeWidth={14} strokeLinejoin="round" filter="url(#sv-soft)" />
      <polygon points={poly} fill="#A4675A" stroke="#A4675A" strokeWidth={2} strokeLinejoin="round" />
      <path d={joints} stroke="#7B4A44" strokeWidth={1.8} strokeLinecap="round" opacity={0.85} />
      <polygon points={poly} fill="#FFFFFF" opacity={0.12} />
      <polyline points={pts(L)} fill="none" stroke="#F7F4FC" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} filter="url(#sv-soft-thin)" />
      <polyline points={pts(R)} fill="none" stroke="#F7F4FC" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} filter="url(#sv-soft-thin)" />
    </g>
  );
}

/** Snow path: a trodden lavender band with a line of small footprints. */
function SnowPath({ band }: { band: PathBand }) {
  const steps = band.left.map((_, k) => k).filter((k) => k % 3 === 1);
  return (
    <g data-path-style="snow">
      <SnowBand band={band} opacity={0.75} />
      {steps.map((k, n) => {
        const c = gz(across(band, k, n % 2 ? 0.4 : 0.6));
        return <ellipse key={k} cx={c.x} cy={c.y} rx={4.5} ry={2.6} fill="#9F95C4" opacity={0.75} />;
      })}
    </g>
  );
}

function PathArt({ style, band, seed }: { style: PathStyle; band: PathBand; seed: number }) {
  if (band.left.length < 2) return null;
  switch (style) {
    case "stones":
      return <StonesPath band={band} seed={seed} />;
    case "brick":
      return <BrickPath band={band} />;
    case "snow":
      return <SnowPath band={band} />;
    default:
      return <DirtPath band={band} />;
  }
}

/** Wooden steps down the plaza mound: dark riser (silhouette), plank top, and a snow line on the front edge. */
function Steps({ steps }: { steps: PathStep[] }) {
  return (
    <g data-path-steps>
      {steps.map((st, k) => {
        const top = st.corners.map(([i, j]) => project(i, j, st.z));
        const foot = st.corners.map(([i, j]) => project(i, j, 0));
        const body = convexHullPoints([...top, ...foot]);
        return (
          <g key={k}>
            <polygon points={pts(body)} fill="#5E4434" />
            <polygon points={pts(top)} fill="#9C7656" />
            <polyline points={pts([top[1], top[2]])} fill="none" stroke="#F6F2FB" strokeWidth={3} strokeLinecap="round" opacity={0.75} />
          </g>
        );
      })}
    </g>
  );
}

/** The plaza fence: snow-capped wooden posts, two rails with snow on the top one, and a string of warm lights. */
function Fence({ runs, z }: { runs: Array<Array<[number, number]>>; z: number }) {
  const H = 30;
  return (
    <g data-plaza-fence pointerEvents="none">
      {runs.map((run, r) => {
        const p = run.map(([i, j]) => project(i, j, z));
        const spans = p.slice(1).map((b, k) => [p[k], b] as const);
        return (
          <g key={r}>
            {spans.map(([a, b], k) => (
              <g key={k}>
                <line x1={a.x} y1={a.y - 9} x2={b.x} y2={b.y - 9} stroke="#6B4632" strokeWidth={4} strokeLinecap="round" />
                <line x1={a.x} y1={a.y - 21} x2={b.x} y2={b.y - 21} stroke="#7A5038" strokeWidth={4.5} strokeLinecap="round" />
                <line x1={a.x} y1={a.y - 24} x2={b.x} y2={b.y - 24} stroke="#FBFAFE" strokeWidth={3.5} strokeLinecap="round" />
              </g>
            ))}
            {p.map((q, k) => (
              <g key={k}>
                <rect x={q.x - 4} y={q.y - H} width={8} height={H + 2} rx={1.5} fill="#7A5038" />
                <rect x={q.x} y={q.y - H} width={4} height={H + 2} rx={1.5} fill="#5E3C2A" />
                <ellipse cx={q.x} cy={q.y - H} rx={6.5} ry={3.6} fill="#FFFFFF" />
              </g>
            ))}
            {spans.map(([a, b], k) =>
              [0.25, 0.5, 0.75].map((t) => {
                const x = a.x + (b.x - a.x) * t;
                const y = a.y + (b.y - a.y) * t - 26 + Math.sin(Math.PI * t) * 6;
                return (
                  <g key={`${k}-${t}`}>
                    <circle cx={x} cy={y} r={6} fill="#FFC36A" opacity={0.3} />
                    <circle cx={x} cy={y} r={2.4} fill="#FFE2A0" />
                  </g>
                );
              }),
            )}
          </g>
        );
      })}
    </g>
  );
}

const GLOW: Record<string, number> = { prop_lamp: 75, prop_snowman_lantern: 55, landmark_cathedral: 230, tree_complete: 120, landmark_santa: 150 };

/** Warm light pools: under every lit (occupied) house and every light-giving prop. */
function glows(order: ReturnType<typeof mapOrder>, bySlot: Map<number, MapHouseArt>): Array<{ x: number; y: number; r: number }> {
  const out: Array<{ x: number; y: number; r: number }> = [];
  for (const e of order) {
    if (e.kind === "facility") {
      const r = GLOW[e.facility.sprite];
      if (r) out.push({ ...project(e.facility.at[0], e.facility.at[1], e.facility.z), r });
    } else if (e.kind === "house" && bySlot.has(e.slot)) {
      const l = LOTS[e.slot];
      out.push({ ...project(l.at[0], l.at[1], l.z), r: 150 });
    }
  }
  return out;
}

export function VillageMapArt({ openHalves, houses, view, names = false, ghosts = true, chipArea, igniteSlot = null, className, title, frame, pathStyle = "dirt", decor }: Props) {
  const rinkFrame = useRinkFrame();
  const t = useT();
  const bySlot = new Map(houses.map((h) => [h.slot, h]));
  const village = { openHalves, houses: houses as never[], decor };
  const vb = view ?? defaultView(openHalves);
  const aurora = houses.length >= AURORA_MIN_HOUSES;
  const order = mapOrder(village as never);
  const closed = DISTRICTS.filter((d) => districtState(openHalves, d.index) === 0);
  const shape = villageShape({ openHalves });
  const withPlaza = plazaShown(openHalves);
  const openDistricts = DISTRICTS.filter((d) => districtState(openHalves, d.index) > 0);
  // Second halves still closed inside an open district: dashed, locked lots.
  const halfLocked = LOTS.filter((l) => districtState(openHalves, l.district) === 1 && l.half === 1);

  return (
    <svg viewBox={vb.join(" ")} {...frame} className={className} role="img" aria-label={title ?? t("map.artTitle")} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121A3A" />
          <stop offset="0.55" stopColor="#2C366B" />
          <stop offset="0.85" stopColor="#584F8C" />
          <stop offset="1" stopColor="#9483B5" />
        </linearGradient>
        <linearGradient id="sv-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8F92C2" />
          <stop offset="0.12" stopColor="#B4B3D8" />
          <stop offset="1" stopColor="#D2CFE8" />
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
          <stop offset="0" stopColor="#A7A1C2" />
          <stop offset="1" stopColor="#6C668F" />
        </linearGradient>
        <radialGradient id="sv-snow" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#F5F3FB" />
          <stop offset="1" stopColor="#E2DEF0" />
        </radialGradient>
        {/* Warm light pooling on the snow under lit houses, lamps and the cathedral. */}
        <radialGradient id="sv-glow">
          <stop offset="0" stopColor="#FFC36A" stopOpacity="0.7" />
          <stop offset="0.45" stopColor="#FFB45C" stopOpacity="0.28" />
          <stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
        </radialGradient>
        {/* Dusk vignette: keeps the eye on the village, like the concept's diorama lighting. */}
        <radialGradient id="sv-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#1A1C44" stopOpacity="0" />
          <stop offset="1" stopColor="#1A1C44" stopOpacity="0.38" />
        </radialGradient>
        <filter id="sv-soft-wide" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="sv-soft-thin" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="sv-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect x={vb[0] - 4000} y={vb[1] - 4000} width={vb[2] + 8000} height={vb[3] + 8000} fill="url(#sv-sky)" />
      <Backdrop vb={vb} aurora={aurora} base={lotsView({ openHalves })} />
      {/* The village ground: ONE smooth cleared snowfield, level with the forest, then the cathedral mound. */}
      <g data-area="village">
        <Clearing outline={shapeOutline(shape)} />
      </g>
      {/* Free village (district 0 alone): no plaza yet; a fence all around its snowy base, like the first concept. */}
      {!withPlaza && <Fence runs={villageFence(shape)} z={0} />}
      {/* Behind the mound the snow rises gently to it (no wall there); in front and at the sides it is walled. */}
      {withPlaza && <g data-plaza-slope>
        {/* Shaded toward its foot, bright toward the top: reads as snow rising to the mound. */}
        <g filter="url(#sv-soft-wide)">
          {plazaSlope().map((q, k) => (
            <polygon key={k} points={pts(q.map(gz))} fill="#D6CFEA" stroke="#D6CFEA" strokeWidth={1.5} strokeLinejoin="round" />
          ))}
        </g>
        <g filter="url(#sv-soft)">
          {plazaSlope().map((q, k) => {
            const top = [q[0], q[1]];
            const mid = [q[2], q[3]].map((f, n): GZ => {
              const t = top[1 - n];
              return [t[0] + (f[0] - t[0]) * 0.55, t[1] + (f[1] - t[1]) * 0.55, t[2] + (f[2] - t[2]) * 0.55];
            });
            return <polygon key={k} points={pts([...top, ...mid].map(gz))} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />;
          })}
        </g>
      </g>}
      {withPlaza && <g data-area="plaza">
        <Slab id="sv-clip-plaza" outline={areaOutline(PLAZA_AREA)} bank={areaBank(PLAZA_AREA)} drop={(PLAZA_AREA.z + 0.05) * ELEVATION_PX} top="#B59A85" texture={0.2} lip={10} rim={0.75} rimColor="#FFFFFF" />
      </g>}
      {/* Dirt paths from the plaza to each opened clearing; wooden steps where one leaves the walled side. */}
      {withPlaza && openDistricts.map((d) => (
        <g key={`path${d.index}`}>
          <PathArt style={pathStyle} band={pathBand(d.path)} seed={d.index} />
          <Steps steps={pathSteps(d.path)} />
        </g>
      ))}
      {withPlaza && <Fence runs={plazaFence(openDistricts.map((d) => d.path))} z={PLAZA_AREA.z} />}
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
      <g pointerEvents="none" aria-hidden data-glow>
        {glows(order, bySlot).map((g, k) => (
          <ellipse key={k} cx={g.x} cy={g.y} rx={g.r} ry={g.r / 2} fill="url(#sv-glow)" />
        ))}
      </g>
      {halfLocked.map((l) => {
        const c = project(l.at[0], l.at[1], l.z);
        return (
          <g key={`hl${l.slot}`} data-lot={l.slot} data-state="locked" opacity={0.45}>
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
              <polygon points={pts(tileDiamond(i, j, HOUSE_TILES * 0.62, z))} fill="#FFFFFF" fillOpacity={0.3} stroke="#A49CC8" strokeOpacity={0.6} strokeWidth={2}
                strokeDasharray="7 7" strokeLinejoin="round" />
              <circle cx={c.x} cy={c.y} r={15} fill="#FFFFFF" opacity={0.8} />
              <path d={`M ${c.x - 8} ${c.y} h 16 M ${c.x} ${c.y - 8} v 16`} stroke="#7D74A8" strokeWidth={3.4} strokeLinecap="round" />
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
      {/* Night grade (concept image: deep blue night, warm lights): darken the whole scene, then add the lights back. */}
      <rect pointerEvents="none" aria-hidden data-night x={vb[0] - 4000} y={vb[1] - 4000} width={vb[2] + 8000} height={vb[3] + 8000}
        fill="#4B4C93" opacity={0.5} style={{ mixBlendMode: "multiply" }} />
      <g pointerEvents="none" aria-hidden data-relight style={{ mixBlendMode: "screen" }}>
        {glows(order, bySlot).map((g, k) => (
          <ellipse key={k} cx={g.x} cy={g.y} rx={g.r * 0.9} ry={g.r * 0.45} fill="url(#sv-glow)" />
        ))}
      </g>
      {/* Lit things stay bright under the grade: lit houses and light-giving props drawn again over it. */}
      <g pointerEvents="none" aria-hidden data-lit opacity={0.62}>
        {order.map((e, n) => {
          if (e.kind === "facility" && GLOW[e.facility.sprite]) {
            const f = e.facility;
            const r = placeSprite(f.sprite, f.at[0], f.at[1], f.tiles, f.z);
            return <image key={`lit-f${n}`} href={SPRITES[f.sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none" />;
          }
          if (e.kind === "house" && bySlot.has(e.slot)) {
            const h = bySlot.get(e.slot)!;
            const v = houseView(h.style, h.direction);
            const lot = LOTS[e.slot];
            const r = placeSprite(v.sprite, lot.at[0], lot.at[1], HOUSE_TILES, lot.z);
            const ax = r.x + SPRITES[v.sprite].anchor[0] * r.width;
            return (
              <image key={`lit-h${n}`} href={SPRITES[v.sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
                transform={v.mirror ? `translate(${2 * ax} 0) scale(-1 1)` : undefined} />
            );
          }
          return null;
        })}
      </g>
      <rect pointerEvents="none" aria-hidden x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} fill="url(#sv-vignette)" />
      {names &&
        houses.map((h) => {
          const lot = LOTS[h.slot];
          if (!lot || !h.name) return null;
          const c = project(lot.at[0], lot.at[1], lot.z);
          const label = h.mine ? t("map.mine", { name: h.name }) : h.name;
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
          const name = districtName(d.index, t.locale);
          // Chip grows with the name (wide CJK glyphs ≈ 24px, others ≈ 13.5px at fontSize 24).
          const w = Math.max(200, 70 + Array.from(name).reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 24 : 13.5), 0));
          if (chipArea) {
            const [ax, ay, aw, ah] = chipArea;
            const m = 12;
            if (c.x - w / 2 < ax + m || c.x + w / 2 > ax + aw - m || c.y - 23 < ay + m || c.y + 23 > ay + ah - m) return null;
          }
          return (
            <g key={`ghn${d.index}`} pointerEvents="none">
              <rect x={c.x - w / 2} y={c.y - 23} width={w} height={46} rx={23} fill="#1C284A" opacity="0.72" />
              <text x={c.x} y={c.y + 8} textAnchor="middle" fontSize={24} fontWeight={700} fill="#F6F0E4">
                🔒 {name}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
