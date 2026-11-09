/** Visible label that the data on screen is simulated (M0 has no backend). */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      title="M0 프로토타입: 서버 없이 이 브라우저 탭에만 임시 저장되는 시뮬레이션 데이터예요."
      className={`inline-flex shrink-0 items-center rounded-full border border-dashed border-night/40 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-night/80 ${className ?? ""}`}
    >
      시뮬레이션 데이터
    </span>
  );
}
