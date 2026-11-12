import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setActiveLocale } from "@/lib/i18n";

// Tests assert the Korean source text unless a test switches the language itself.
setActiveLocale("ko");

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  setActiveLocale("ko");
});
