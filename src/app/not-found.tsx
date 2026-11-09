import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl" aria-hidden>⛄</p>
      <h1 className="text-xl font-bold text-night">페이지를 찾을 수 없어요</h1>
      <Link href="/" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-night font-bold text-ivory">
        처음으로 돌아가기
      </Link>
    </main>
  );
}
