"use client";

/**
 * Interactive village map: VillageMapArt + an aligned hit layer (same viewBox) with one button per
 * lot or house, plus pan (drag), zoom (wheel, pinch, buttons) and "fit". A drag never triggers a tap.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { areaOutline, decorSpotOk, districtName, DISTRICTS, fullView, groundAt, HOUSE_TILES, houseStyleLabel, houseView, LOTS, movableDecor, project, spriteHull, tileDiamond, visibleLots, type Point, clampToLand } from "@/lib/map";
import { districtState, houseAt, type DecorSpots, type PathStyle, type Village } from "@/lib/village";
import { defaultView, VillageMapArt } from "./VillageMapArt";
import { Snowfall } from "./Snowfall";

interface Props {
  village: Village;
  myHouseId?: string | null;
  igniteSlot?: number | null;
  onSelectSlot?: (slot: number, trigger: Element) => void;
  /** Tap on a closed district (or the closed half of one): offer to open it. */
  onSelectDistrict?: (district: number, trigger: Element) => void;
  className?: string;
  /** Fill the parent's height (village screen); otherwise keep the village's own aspect ratio. */
  fill?: boolean;
  /**
   * Edit mode (village owner): the draft look is drawn, every movable decoration gets a drag handle, and
   * lots / districts are not tappable. A drop on a spot that breaks the placement rule snaps back.
   */
  edit?: { pathStyle: PathStyle; decor: DecorSpots; onMove: (id: string, at: [number, number]) => void };
}

type View = [number, number, number, number];
const pts = (p: Point[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

export function VillageMap({ village, myHouseId, igniteSlot = null, onSelectSlot, onSelectDistrict, className, fill = false, edit }: Props) {
  const t = useT();
  const base = useMemo(() => defaultView(village.openHalves), [village.openHalves]);
  // Container aspect (h / w), measured; the camera grows the short side so the map fills the box.
  const [aspect, setAspect] = useState<number | null>(null);
  const [boxWidth, setBoxWidth] = useState(390);
  const fit = useMemo<View>(() => {
    if (!fill || !aspect) return base;
    const [x, y, w, h] = base;
    // Fill the box; never show more than ~19 tiles across, so houses stay readable on a phone (pan for the rest).
    const MAX_W = 1900;
    let nw = aspect > h / w ? Math.max(w * 0.92, h / aspect) : h / aspect;
    nw = Math.min(nw, MAX_W);
    const nh = nw * aspect;
    return clampToLand([x + (w - nw) / 2, y + (h - nh) / 2, nw, nh]);
  }, [base, aspect, fill]);
  const [view, setView] = useState<View>(fit);
  // Re-fit when the village grows (new lots appear): reset during render, not in an effect.
  const [fitFor, setFitFor] = useState(fit);
  if (fitFor !== fit) {
    setFitFor(fit);
    setView(fit);
  }
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; view: View } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; view: View } | null>(null);
  const suppressClick = useRef(false);
  const hitSvg = useRef<SVGSVGElement>(null);
  // Decoration being dragged (edit mode): where it is now and whether it may stay there.
  const [moving, setMoving] = useState<{ id: string; pointer: number; z: number; at: [number, number]; ok: boolean } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!fill || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) {
        setAspect(Math.round((height / width) * 100) / 100);
        setBoxWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const clampView = useCallback(
    (v: View): View => {
      // Zoom in to 30% of the fit; zoom out / pan far enough to see every district (to pick one to open).
      const all = fullView();
      const minW = fit[2] * 0.3;
      const maxW = Math.max(fit[2] * 1.2, all[2] * 1.05, (all[3] * 1.05 * fit[2]) / fit[3]);
      const w = Math.min(maxW, Math.max(minW, v[2]));
      const h = (w / fit[2]) * fit[3];
      const bx0 = Math.min(fit[0], all[0]);
      const bx1 = Math.max(fit[0] + fit[2], all[0] + all[2]);
      const by0 = Math.min(fit[1], all[1]);
      const by1 = Math.max(fit[1] + fit[3], all[1] + all[3]);
      const cx = Math.min(bx1, Math.max(bx0, v[0] + v[2] / 2));
      const cy = Math.min(by1, Math.max(by0, v[1] + v[3] / 2));
      return [cx - w / 2, cy - h / 2, w, h];
    },
    [fit],
  );

  const zoomBy = useCallback(
    (factor: number, at?: { fx: number; fy: number }) =>
      setView((v) => {
        const fx = at?.fx ?? 0.5;
        const fy = at?.fy ?? 0.5;
        const w = v[2] / factor;
        const h = v[3] / factor;
        return clampView([v[0] + (v[2] - w) * fx, v[1] + (v[3] - h) * fy, w, h]);
      }),
    [clampView],
  );

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view };
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, view };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pinch.current.has(e.pointerId)) return;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()];
      const f = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinchStart.current.dist);
      const v0 = pinchStart.current.view;
      const w = v0[2] / f;
      const h = v0[3] / f;
      setView(clampView([v0[0] + (v0[2] - w) / 2, v0[1] + (v0[3] - h) / 2, w, h]));
      suppressClick.current = true;
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    suppressClick.current = true;
    const s = d.view[2] / r.width;
    setView(clampView([d.view[0] - dx * s, d.view[1] - dy * s, d.view[2], d.view[3]]));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
    // Clear after the click event that follows this pointerup.
    window.setTimeout(() => (suppressClick.current = false), 0);
  };

  const art = village.houses.map((h) => ({
    slot: h.slot,
    style: h.style,
    direction: h.direction,
    name: h.nickname,
    mine: Boolean(myHouseId && h.id === myHouseId),
  }));
  const lots = visibleLots(village);
  const interactive = Boolean(onSelectSlot) && !edit;
  const look = edit
    ? { pathStyle: edit.pathStyle, decor: moving ? { ...edit.decor, [moving.id]: moving.at } : edit.decor }
    : { pathStyle: village.pathStyle, decor: village.decor };
  const handles = edit ? movableDecor({ openHalves: village.openHalves, decor: look.decor }) : [];
  // Drag handle: a ring ≥ 28 px across on screen, a 44 px touch circle, whatever the zoom.
  const handleR = Math.max(30, (14 * view[2]) / boxWidth);
  const touchR = Math.max(34, (22 * view[2]) / boxWidth);

  /** Client point → ground tile at elevation z, through the hit layer's own transform. */
  const toGround = (clientX: number, clientY: number, z: number): [number, number] | null => {
    const svg = hitSvg.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return groundAt(p.x, p.y, z);
  };
  const decorOk = (id: string, at: [number, number]) => decorSpotOk({ openHalves: village.openHalves, decor: look.decor }, id, at);
  const zoomed = view[2] < fit[2] * 0.97;

  const select = (slot: number, el: Element) => {
    if (suppressClick.current) return;
    onSelectSlot?.(slot, el);
  };

  return (
    <div
      ref={wrap}
      className={`relative w-full touch-none select-none overflow-hidden ${className ?? ""}`}
      style={fill ? undefined : { aspectRatio: `${fit[2]} / ${fit[3]}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <VillageMapArt
        openHalves={village.openHalves}
        houses={art}
        view={view}
        chipArea={fit}
        names
        igniteSlot={igniteSlot}
        pathStyle={look.pathStyle}
        decor={look.decor}
        className="absolute inset-0 h-full w-full"
        title={t("map.title", { name: village.name, capacity: village.capacity, count: village.houses.length })}
      />
      <Snowfall />
      {edit && (
        <svg ref={hitSvg} viewBox={view.join(" ")} className="absolute inset-0 h-full w-full" role="group" aria-label={t("map.decorGroup")}>
          {handles.map((f) => {
            const c = project(f.at[0], f.at[1], f.z);
            const active = moving?.id === f.id;
            const bad = active && !moving.ok;
            return (
              <g key={f.id} data-decor={f.id} data-state={bad ? "blocked" : active ? "moving" : "idle"}>
                <ellipse cx={c.x} cy={c.y} rx={handleR} ry={handleR / 2} fill={bad ? "#E0604A" : "#FFFFFF"} fillOpacity={bad ? 0.45 : 0.35}
                  stroke={bad ? "#C2412C" : "#5B4FA0"} strokeWidth={handleR * 0.09} strokeDasharray={active ? undefined : `${handleR * 0.18} ${handleR * 0.15}`} />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={touchR}
                  fill="transparent"
                  role="button"
                  aria-label={t("map.moveDecor", { id: f.id })}
                  className="cursor-grab touch-none outline-none"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setMoving({ id: f.id, pointer: e.pointerId, z: f.z, at: f.at, ok: true });
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (!moving || moving.pointer !== e.pointerId) return;
                    const at = toGround(e.clientX, e.clientY, moving.z);
                    if (at) setMoving({ ...moving, at, ok: decorOk(moving.id, at) });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (moving && moving.pointer === e.pointerId && moving.ok) edit.onMove(moving.id, moving.at);
                    setMoving(null);
                  }}
                  onPointerCancel={() => setMoving(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {interactive && (
        <svg viewBox={view.join(" ")} className="absolute inset-0 h-full w-full" aria-label={t("map.lotsGroup", { count: village.capacity })} role="group">
          {/* Closed districts (behind everything): tap to open one. */}
          {DISTRICTS.filter((d) => districtState(village.openHalves, d.index) === 0).map((d) => {
            const ring = areaOutline(d);
            return (
              <polygon
                key={`d${d.index}`}
                points={pts(ring)}
                role="button"
                tabIndex={0}
                aria-label={t("map.closedDistrict", { district: districtName(d.index, t.locale) })}
                data-district={d.index}
                data-state="closed"
                fill="transparent"
                className="cursor-pointer outline-none focus-visible:fill-white/20"
                onClick={(e) => !suppressClick.current && onSelectDistrict?.(d.index, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDistrict?.(d.index, e.currentTarget);
                  }
                }}
              />
            );
          })}
          {/* Lots/houses back → front so the front one wins where shapes overlap. */}
          {[...lots, ...LOTS.filter((l) => l.half === 1 && districtState(village.openHalves, l.district) === 1)]
            .sort((a, b) => a.at[0] + a.at[1] - (b.at[0] + b.at[1]))
            .map((lot) => {
              const house = houseAt(village, lot.slot);
              const locked = !lots.includes(lot);
              const mine = Boolean(house && myHouseId && house.id === myHouseId);
              const shape = house
                ? (() => {
                    const v = houseView(house.style, house.direction);
                    return spriteHull(v.sprite, lot.at[0], lot.at[1], HOUSE_TILES, v.mirror, lot.z);
                  })()
                : tileDiamond(lot.at[0], lot.at[1], HOUSE_TILES * 0.9, lot.z);
              const label = house
                ? t(mine ? "map.houseMine" : "map.house", { n: lot.slot + 1, name: house.nickname, style: houseStyleLabel(house.style, t.locale) })
                : locked
                  ? t("map.lockedLot", { n: lot.slot + 1, district: districtName(lot.district, t.locale) })
                  : t("map.emptyLot", { n: lot.slot + 1 });
              return (
                <polygon
                  key={lot.slot}
                  points={pts(shape)}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  data-slot={lot.slot}
                  data-state={house ? "occupied" : locked ? "locked" : "empty"}
                  fill="transparent"
                  className="cursor-pointer outline-none focus-visible:fill-white/25"
                  onClick={(e) => (locked ? !suppressClick.current && onSelectDistrict?.(lot.district, e.currentTarget) : select(lot.slot, e.currentTarget))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (locked) onSelectDistrict?.(lot.district, e.currentTarget);
                      else onSelectSlot?.(lot.slot, e.currentTarget);
                    }
                  }}
                />
              );
            })}
        </svg>
      )}
      <div className="absolute bottom-2 right-2 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label={t("map.zoomIn")} className="grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-lg font-bold text-night shadow" onClick={() => zoomBy(1.35)}>
          +
        </button>
        <button type="button" aria-label={t("map.zoomOut")} className="grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-lg font-bold text-night shadow" onClick={() => zoomBy(1 / 1.35)}>
          −
        </button>
        {zoomed && (
          <button type="button" className="h-11 rounded-full bg-ivory/90 px-3 text-sm font-semibold text-night shadow" onClick={() => setView(fit)}>
            {t("map.fit")}
          </button>
        )}
      </div>
    </div>
  );
}
