"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>🌨️</p>
      <h1 className="text-xl font-bold text-night">마을을 불러오지 못했어요</h1>
      <p className="text-sm text-night/70">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset} className="min-h-12 w-full rounded-2xl bg-night font-bold text-ivory">
        다시 시도
      </button>
    </main>
  );
}
