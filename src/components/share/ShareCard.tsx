import { forwardRef } from "react";
import { SceneArt } from "@/components/scene/SceneArt";
import { PALETTE } from "@/lib/assets";
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, type ShareCardData } from "@/lib/share";

const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif";

/**
 * 1080×1350 photo-free share card. Accepts only ShareCardData (styles +
 * completion) so participant photos/names cannot reach it by construction.
 */
export const ShareCard = forwardRef<SVGSVGElement, { data: ShareCardData; className?: string }>(function ShareCard(
  { data, className },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}`}
      width={SHARE_CARD_WIDTH}
      height={SHARE_CARD_HEIGHT}
      className={className}
      role="img"
      aria-label="사진이 들어가지 않는 마을 공유 카드"
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
      <text x="540" y="200" textAnchor="middle" fontFamily={FONT} fontSize="64" fontWeight="800" fill={PALETTE.indigo}>
        {data.complete ? "우리 마을이 완성됐어요!" : "우리 마을에 불이 켜지고 있어요"}
      </text>
      <svg x="48" y="240" width="984" height="984" viewBox="0 0 1024 1024">
        <SceneArt slots={data.slots} complete={data.complete} idPrefix="card" title="마을 장면" />
      </svg>
      <text x="540" y="1290" textAnchor="middle" fontFamily={FONT} fontSize="34" fill={PALETTE.indigo} opacity=".75">
        친구들과 만드는 우리만의 겨울 마을 ❄
      </text>
    </svg>
  );
});

/** Rasterize the card SVG to a PNG blob (client only). */
export async function rasterizeShareCard(svg: SVGSVGElement): Promise<Blob> {
  const markup = new XMLSerializer().serializeToString(svg);
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
