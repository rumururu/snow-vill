"use client";

/**
 * Interactive village map: VillageMapArt + an aligned hit layer (same viewBox) with one button per
 * lot or house, plus pan (drag), zoom (wheel, pinch, buttons) and "fit". A drag never triggers a tap.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISTRICTS, fullView, plotDiamond, HOUSE_TILES, houseView, LOTS, spriteHull, tileDiamond, visibleLots, type Point } from "@/lib/map";
import { districtState, houseAt, HOUSE_STYLE_LABEL, type Village } from "@/lib/village";
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
}

type View = [number, number, number, number];
const pts = (p: Point[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

export function VillageMap({ village, myHouseId, igniteSlot = null, onSelectSlot, onSelectDistrict, className, fill = false }: Props) {
  const base = useMemo(() => defaultView(village.openHalves), [village.openHalves]);
  // Container aspect (h / w), measured; the camera grows the short side so the map fills the box.
  const [aspect, setAspect] = useState<number | null>(null);
  const fit = useMemo<View>(() => {
    if (!fill || !aspect) return base;
    const [x, y, w, h] = base;
    if (aspect > h / w) {
      // Portrait: zoom in (crop the sides, the user pans) instead of showing an empty sky.
      const nw = Math.max(w * 0.68, h / aspect);
      const nh = nw * aspect;
      return [x + (w - nw) / 2, y - (nh - h) * 0.55, nw, nh];
    }
    const nw = h / aspect;
    return [x - (nw - w) / 2, y, nw, h];
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

  useEffect(() => {
    const el = wrap.current;
    if (!fill || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setAspect(Math.round((height / width) * 100) / 100);
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
  const interactive = Boolean(onSelectSlot);
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
        names
        igniteSlot={igniteSlot}
        className="absolute inset-0 h-full w-full"
        title={`${village.name} 지도, ${village.capacity}채 중 ${village.houses.length}채에 불이 켜져 있어요`}
      />
      <Snowfall />
      {interactive && (
        <svg viewBox={view.join(" ")} className="absolute inset-0 h-full w-full" aria-label={`마을의 집터 ${village.capacity}곳과 아직 열리지 않은 동네`} role="group">
          {/* Closed districts (behind everything): tap to open one. */}
          {DISTRICTS.filter((d) => districtState(village.openHalves, d.index) === 0).map((d) => {
            const ring = plotDiamond(d.at);
            return (
              <polygon
                key={`d${d.index}`}
                points={pts(ring)}
                role="button"
                tabIndex={0}
                aria-label={`${d.name.ko} (아직 열리지 않음), 마을 넓히기로 열기`}
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
                    return spriteHull(v.sprite, lot.at[0], lot.at[1], HOUSE_TILES, v.mirror);
                  })()
                : tileDiamond(lot.at[0], lot.at[1], HOUSE_TILES * 0.9);
              const label = house
                ? `${lot.slot + 1}번 집, ${house.nickname}의 ${HOUSE_STYLE_LABEL[house.style]}${mine ? ", 내 집" : ""} 열기`
                : locked
                  ? `${lot.slot + 1}번 집터 (잠김), ${DISTRICTS[lot.district].name.ko}의 나머지 절반을 열면 입주할 수 있어요`
                  : `${lot.slot + 1}번 빈 집터, 내 집 만들기`;
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
        <button type="button" aria-label="확대" className="grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-lg font-bold text-night shadow" onClick={() => zoomBy(1.35)}>
          +
        </button>
        <button type="button" aria-label="축소" className="grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-lg font-bold text-night shadow" onClick={() => zoomBy(1 / 1.35)}>
          −
        </button>
        {zoomed && (
          <button type="button" className="h-11 rounded-full bg-ivory/90 px-3 text-sm font-semibold text-night shadow" onClick={() => setView(fit)}>
            전체 보기
          </button>
        )}
      </div>
    </div>
  );
}

/** Lot index → default door direction (faces the plaza). */
export function defaultDirection(slot: number) {
  return LOTS[slot]?.facing ?? 0;
}
