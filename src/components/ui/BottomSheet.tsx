"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/I18nProvider";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky footer (primary actions), safe-area aware. */
  footer?: ReactNode;
  /** Element to focus when the sheet opens; defaults to the close button. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal bottom sheet: role=dialog + aria-modal, focus moves in on
 * open, Tab is trapped, Esc / backdrop / close button dismiss, and focus
 * returns to the element that opened it. Background is made inert.
 */
export function BottomSheet({ open, onClose, title, children, footer, initialFocusRef }: BottomSheetProps) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const appRoot = document.getElementById("app-root");
    appRoot?.setAttribute("inert", "");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    (initialFocusRef?.current ?? closeRef.current)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true",
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      appRoot?.removeAttribute("inert");
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
    // initialFocusRef is a ref object; reading it at open time is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        data-testid="sheet-backdrop"
        className="sv-fade-in absolute inset-0 bg-night/45"
        onClick={() => onCloseRef.current()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sv-sheet-in relative flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-ivory shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-3">
          <span aria-hidden className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-night/15" />
          <h2 id={titleId} className="mt-3 text-lg font-bold text-night">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onCloseRef.current()}
            className="mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl text-night/70 hover:bg-night/5 focus-visible:ring-4 focus-visible:ring-night/40 focus-visible:outline-none"
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-night/10 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
