import Link from "next/link";
import { LandingHero } from "@/components/landing/LandingHero";

/** S01 — landing. Invite links (/v/[id]) bypass this page. */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2">
        <span aria-hidden className="text-2xl">❄️</span>
        <span className="text-lg font-extrabold tracking-tight text-night">Snow Village</span>
        <span className="ml-auto rounded-full border border-dashed border-night/40 px-2.5 py-1 text-[11px] font-semibold text-night/70">
          M0 프로토타입
        </span>
      </header>

      <section className="mt-6" aria-labelledby="hero-title">
        <h1 id="hero-title" className="text-[28px] font-extrabold leading-tight text-night min-[400px]:text-[32px]">
          친구들과 만드는
          <br />
          우리만의 겨울 마을
        </h1>
        <p className="mt-3 text-base leading-relaxed text-night/75">
          친구 한 명이 집 한 채. 8채의 작은 집에 불이 켜지면 우리 마을이 완성돼요. 사진은 집을 눌렀을 때만 보여요.
        </p>
      </section>

      <LandingHero />

      <div className="mt-auto space-y-3 pt-4">
        <Link
          href="/create"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-night text-lg font-bold text-ivory shadow-md"
        >
          무료로 마을 만들기
        </Link>
        <p className="text-center text-sm text-night/70">회원가입 없이 바로 시작</p>
        <Link
          href="/v/demo"
          className="flex min-h-12 items-center justify-center rounded-2xl bg-white/80 text-base font-semibold text-night"
        >
          샘플 마을 둘러보기
        </Link>
        <p className="text-center text-[11px] leading-relaxed text-night/55">
          지금은 서버 없이 동작하는 시연용 프로토타입이에요. 데이터는 이 브라우저 탭에만 임시 저장돼요.
        </p>
      </div>
    </main>
  );
}
