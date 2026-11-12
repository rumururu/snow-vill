import { HOUSE_COLORS, PALETTE } from "@/lib/assets";
import type { HouseStyle } from "@/lib/village";
import { useT } from "@/lib/i18n/I18nProvider";

/** Original fallback profile illustration (snow buddy in a knit hat). */
export function FallbackAvatar({ style, className, label }: { style: HouseStyle; className?: string; label?: string }) {
  const t = useT();
  const c = HOUSE_COLORS[style];
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={label ?? t("avatar.default")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" fill="#EAF1F5" />
      <circle cx="40" cy="40" r="4" fill="#fff" />
      <circle cx="165" cy="60" r="5" fill="#fff" />
      <circle cx="150" cy="160" r="3" fill="#fff" />
      <ellipse cx="100" cy="190" rx="90" ry="34" fill={PALETTE.ivory} />
      <circle cx="100" cy="122" r="58" fill="#FFFDF8" />
      <path d="M46 100c4-34 28-52 54-52s50 18 54 52Z" fill={c.wall} />
      <rect x="42" y="94" width="116" height="18" rx="9" fill={c.roof} />
      <circle cx="100" cy="44" r="12" fill={PALETTE.ivory} />
      <circle cx="80" cy="128" r="5" fill={PALETTE.indigo} />
      <circle cx="120" cy="128" r="5" fill={PALETTE.indigo} />
      <ellipse cx="68" cy="142" rx="9" ry="5" fill="#F2B8A0" opacity=".6" />
      <ellipse cx="132" cy="142" rx="9" ry="5" fill="#F2B8A0" opacity=".6" />
      <path d="M100 136 118 141 100 145Z" fill={PALETTE.wood} />
      <path d="M90 154q10 7 20 0" stroke={PALETTE.indigo} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
