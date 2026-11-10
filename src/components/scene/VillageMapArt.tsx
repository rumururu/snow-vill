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
  cellDiamond,
  fencePieces,
  groundEdges,
  openCells,
  PARTS,
  placeSprite,
  plotDiamond,
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

const SEG_TILES = 2.05;

/** A straight fence/gate part laid along a ground edge: its drawn width covers `tiles` of the edge
 *  (+8% overlap) and the middle of its base line sits on `at`. The art runs ↘; mirrored for ↙ edges. */
function placeAlong(sprite: string, at: [number, number], tiles: number, mirror: boolean) {
  const g = SPRITES[sprite];
  const aspect = g.aspect ?? 1;
  const bw = g.bbox[2] - g.bbox[0];
  const width = ((tiles * TILE) / 2) * 1.08 / bw;
  const height = width * aspect;
  const c = project(at[0], at[1]);
  const cx = (g.bbox[0] + bw / 2) * width;
  // base line runs down-right with the measured slope: its middle is slope·w/2 above the bottom
  const baseMid = g.bbox[3] * height - ((g.baseSlope ?? 0.5) * bw * width) / 2;
  const x = c.x - cx;
  const y = c.y - baseMid;
  // Shear vertically (posts stay upright) so the base line follows the true 2:1 ground edge.
  const k = 0.5 - (g.baseSlope ?? 0.5);
  const shear = Math.abs(k) > 0.01 ? ` translate(${c.x} ${c.y}) matrix(1 ${k} 0 1 0 0) translate(${-c.x} ${-c.y})` : "";
  const flip = mirror ? `translate(${2 * c.x} 0) scale(-1 1)` : "";
  const transform = `${flip}${shear}`.trim();
  return { x, y, width, height, transform: transform || undefined };
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
  // Second halves still closed inside an open district: dashed, locked lots.
  const cells = openCells({ openHalves });
  const edges = groundEdges({ openHalves });
  const fences = SPRITES[PARTS.fence] ? fencePieces({ openHalves }) : [];
  const halfLocked = LOTS.filter((l) => districtState(openHalves, l.district) === 1 && l.half === 1);

  const layered = [
    ...order.map((e) => ({ kind: "entity" as const, e, depth: e.depth })),
    ...fences.map((f, k) => ({ kind: "fence" as const, f, k, depth: f.depth })),
  ].sort((a, b) => a.depth - b.depth);

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
        <GroundPattern />
        <linearGradient id="sv-bank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9D3E0" />
          <stop offset="0.35" stopColor="#B4A99B" />
          <stop offset="1" stopColor="#8E8376" />
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
      {/* Ghost districts: dashed outline + name (not part of the ground yet). */}
      {ghosts &&
        closed.map((d) => {
          const c = project(d.at[0], d.at[1]);
          return (
            <g key={`gh${d.index}`} data-district-ghost={d.index} pointerEvents="none">
              <polygon points={pts(plotDiamond(d.at).map((p) => ({ x: p.x * 0.97 + c.x * 0.03, y: p.y * 0.97 + c.y * 0.03 })))} fill="#FFFFFF" fillOpacity="0.08"
                stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={3} strokeDasharray="14 12" />
              <rect x={c.x - 112} y={c.y - 27} width={224} height={54} rx={27} fill="#1C284A" opacity="0.8" />
              <text x={c.x} y={c.y + 10} textAnchor="middle" fontSize={28} fontWeight={700} fill="#F6F0E4">
                🔒 {d.name.ko}
              </text>
            </g>
          );
        })}
      {/* One continuous ground: bank on the outer edges facing the viewer, snow on top, cobble paths
          between districts. */}
      {edges.outer.filter((e) => e.front).map((e, k) => {
        const a = project(e.a[0], e.a[1]);
        const b = project(e.b[0], e.b[1]);
        const t = TILE * 0.42;
        return <polygon key={`bank${k}`} points={pts([a, b, { x: b.x, y: b.y + t }, { x: a.x, y: a.y + t }])} fill="url(#sv-bank)" />;
      })}
      {cells.map((c) => (
        <polygon key={`g${c}`} points={pts(cellDiamond(c, 0.04))} fill="#EEF3F8" />
      ))}
      {cells.map((c) => (
        <polygon key={`t${c}`} points={pts(cellDiamond(c, 0.04))} fill="url(#sv-ground)" opacity="0.9" />
      ))}
      {edges.inner.map((e, k) => {
        const w = 0.42;
        const off = e.axis === "i" ? ([0, w] as const) : ([w, 0] as const);
        const quad = [
          project(e.a[0] - off[0], e.a[1] - off[1]),
          project(e.b[0] - off[0], e.b[1] - off[1]),
          project(e.b[0] + off[0], e.b[1] + off[1]),
          project(e.a[0] + off[0], e.a[1] + off[1]),
        ];
        return <polygon key={`path${k}`} points={pts(quad)} fill="#CFC5B8" opacity="0.55" />;
      })}
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
        if (item.kind === "fence") {
          const f = item.f;
          if (f.kind === "post") {
            const r = placeSprite(PARTS.post, f.at[0], f.at[1], 0.55);
            return <image key={`fp${item.k}`} href={SPRITES[PARTS.post].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none" />;
          }
          const sprite = f.kind === "gate" && SPRITES[PARTS.gate] ? PARTS.gate : PARTS.fence;
          const r = placeAlong(sprite, f.at, SEG_TILES * (sprite === PARTS.gate ? 1.15 : 1), f.mirror);
          return (
            <image key={`f${item.k}`} href={SPRITES[sprite].src} x={r.x} y={r.y} width={r.width} height={r.height} preserveAspectRatio="none"
              transform={r.transform} data-fence={f.kind} />
          );
        }
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
