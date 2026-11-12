import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCALES, type Locale } from "@/lib/i18n";

let current: Locale = "ko";
vi.mock("@/lib/i18n/I18nProvider", () => ({
  useLocale: () => current,
  useT: () => (k: string) => k,
}));

const { ChildSafety, CHILD_SAFETY_CONTACT } = await import("./ChildSafety");

describe("child safety standards page", () => {
  it.each(LOCALES)("%s: five sections, contact address and the in-app report label the app really shows", (l) => {
    current = l;
    const { container, unmount } = render(<ChildSafety />);
    expect(container.querySelectorAll("section")).toHaveLength(5);
    expect(screen.getAllByText(CHILD_SAFETY_CONTACT).length).toBeGreaterThanOrEqual(2);
    const arb = JSON.parse(readFileSync(`mobile/lib/l10n/app_${l}.arb`, "utf8")) as { report: string };
    expect(screen.getByText(arb.report).tagName).toBe("B");
    expect(container.textContent).not.toContain("{report}");
    unmount();
  });
});
