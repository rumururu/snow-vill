/** Decorative CSS snowfall. Hidden entirely when prefers-reduced-motion is set. */
const FLAKES = [
  { left: 8, delay: 0, duration: 9, size: 5 },
  { left: 22, delay: 3, duration: 11, size: 4 },
  { left: 37, delay: 6, duration: 10, size: 6 },
  { left: 51, delay: 1.5, duration: 12, size: 4 },
  { left: 64, delay: 4.5, duration: 9.5, size: 5 },
  { left: 78, delay: 2, duration: 11.5, size: 6 },
  { left: 90, delay: 7, duration: 10.5, size: 4 },
];

export function Snowfall() {
  return (
    <div aria-hidden className="sv-snowfall pointer-events-none absolute inset-0 overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="sv-flake absolute top-[-10px] rounded-full bg-white/90"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
