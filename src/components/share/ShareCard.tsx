import { forwardRef } from "react";
import { VillageMapArt } from "@/components/scene/VillageMapArt";
import { PALETTE } from "@/lib/assets";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, type ShareCardData } from "@/lib/share";
import { useT } from "@/lib/i18n/I18nProvider";

const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif";

/** Font size that keeps one line of `text` within `width` (wide CJK glyphs ≈ 1em, others ≈ 0.56em). */
function fitFont(text: string, max: number, width: number): number {
  const em = Array.from(text).reduce((w, ch) => w + (/[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 1 : 0.56), 0);
  return Math.min(max, Math.floor(width / Math.max(em, 1)));
}

/**
 * 1080×1350 photo-free share card. Accepts only ShareCardData (styles +
 * completion) so participant photos/names cannot reach it by construction.
 */
export const ShareCard = forwardRef<SVGSVGElement, { data: ShareCardData; className?: string }>(function ShareCard(
  { data, className },
  ref,
) {
  const t = useT();
  const headline = data.complete ? t("common.villageComplete") : t("card.inProgress");
  const tagline = t("card.tagline");
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}`}
      width={SHARE_CARD_WIDTH}
      height={SHARE_CARD_HEIGHT}
      className={className}
      role="img"
      aria-label={t("card.aria")}
      data-testid="share-card"
    >
      <defs>
        <linearGradient id="card-bg" x2="0" y2="1">
          <stop stopColor="#DCE8EF" />
          <stop offset="1" stopColor={PALETTE.ivory} />
        </linearGradient>
      </defs>
      <rect width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} fill="url(#card-bg)" />
      <text x="540" y="120" textAnchor="middle" fontFamily={FONT} fontSize="40" fontWeight="600" fill={PALETTE.sage} letterSpacing="6">
        SNOW VILLAGE
      </text>
      <text x="540" y="200" textAnchor="middle" fontFamily={FONT} fontSize={fitFont(headline, 64, 980)} fontWeight="800" fill={PALETTE.indigo}>
        {headline}
      </text>
      <VillageMapArt openHalves={data.openHalves} houses={data.houses} pathStyle={data.pathStyle} decor={data.decor} ghosts={false} frame={{ x: 48, y: 250, width: 984, height: 984 }} title={t("card.scene")} />
      <text x="540" y="1290" textAnchor="middle" fontFamily={FONT} fontSize={fitFont(tagline, 34, 980)} fill={PALETTE.indigo} opacity=".75">
        {tagline}
      </text>
    </svg>
  );
});

/** Rasterize the card SVG to a PNG blob (client only). */
export async function rasterizeShareCard(svg: SVGSVGElement): Promise<Blob> {
  // An SVG drawn as an <img> cannot load external files, so inline the scene sprites
  // (same-origin /assets/*.webp only — the card never contains participant photos).
  const clone = svg.cloneNode(true) as SVGSVGElement;
  await Promise.all(
    Array.from(clone.querySelectorAll("image")).map(async (node) => {
      const href = node.getAttribute("href") ?? "";
      if (!href.startsWith("/assets/")) throw new Error(`unexpected image in share card: ${href}`);
      const blob = await (await fetch(href)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      node.setAttribute("href", dataUrl);
    }),
  );
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("card image failed to load"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = SHARE_CARD_WIDTH;
    canvas.height = SHARE_CARD_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
