import { useT } from "@/lib/i18n/I18nProvider";

/** Visible label that the data on screen is simulated (M0 has no backend). */
export function SimulatedBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      title={t("badge.title")}
      className={`inline-flex shrink-0 items-center rounded-full border border-dashed border-night/40 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-night/80 ${className ?? ""}`}
    >
      {t("badge.label")}
    </span>
  );
}
