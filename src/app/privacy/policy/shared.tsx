import type { ReactNode } from "react";

export const EFFECTIVE_DATE = "2026-11-14";
export const CONTACT = "mkideabox.feedback@gmail.com";
// Company-standard privacy officer (same as other mkideabox app policies).
export const OFFICER = { name: "hyung-woo park", email: "mkideabox@gmail.com", phone: "+82-10-4732-7825" };

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-7" aria-labelledby={`p${n}`}>
      <h2 id={`p${n}`} className="text-base font-bold text-night">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-night/85">{children}</div>
    </section>
  );
}

export function Mail({ to = CONTACT }: { to?: string }) {
  return (
    <a className="underline" href={`mailto:${to}`}>
      {to}
    </a>
  );
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}
