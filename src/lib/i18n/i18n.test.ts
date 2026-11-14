import { describe, expect, it } from "vitest";
import { detectLocale, LOCALES, localized, matchLocale, MESSAGES, translate, type MessageKey } from "./index";
import { getActiveLocale, setActiveLocale, tr } from "./translate";
import { ko } from "./messages/ko";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const texts = (m: (typeof MESSAGES)["ko"][MessageKey]) => (typeof m === "string" ? [m] : Object.values(m));

describe("detectLocale", () => {
  it("maps browser language tags to supported locales", () => {
    expect(detectLocale(["ko-KR"])).toBe("ko");
    expect(detectLocale(["en-US", "ko"])).toBe("en");
    expect(detectLocale(["zh-TW"])).toBe("zh");
    expect(detectLocale(["zh-Hans-CN"])).toBe("zh");
    expect(detectLocale(["pt-PT"])).toBe("pt");
    expect(detectLocale(["es-MX"])).toBe("es");
    expect(detectLocale(["es-ES"])).toBe("es");
    expect(detectLocale(["ja"])).toBe("ja");
    expect(detectLocale(["ru-RU"])).toBe("ru");
    expect(detectLocale(["in-ID"])).toBe("id");
    expect(detectLocale(["de_AT"])).toBe("de");
  });

  it("skips unsupported languages and falls back to English", () => {
    expect(detectLocale(["it-IT", "fr-CA"])).toBe("fr");
    expect(detectLocale(["it-IT", "nl"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(matchLocale("xx")).toBeNull();
  });

  it("honours ?lang= over the browser languages (unsupported values ignored)", () => {
    expect(detectLocale(["ko-KR"], "?id=abc&lang=ja")).toBe("ja");
    expect(detectLocale(["ko-KR"], "?lang=pt-BR")).toBe("pt");
    expect(detectLocale(["ko-KR"], "?lang=klingon")).toBe("ko");
  });
});

describe("dictionaries", () => {
  const keys = Object.keys(ko).sort();

  it.each(LOCALES)("%s has exactly the Korean keys", (locale) => {
    expect(Object.keys(MESSAGES[locale]).sort()).toEqual(keys);
  });

  it.each(LOCALES)("%s has no empty texts and only known placeholders", (locale) => {
    for (const key of keys as MessageKey[]) {
      const source = new Set(texts(ko[key]).flatMap(placeholders));
      for (const text of texts(MESSAGES[locale][key])) {
        if (key !== "sim.friendMessages") expect(text.trim(), `${locale} ${key}`).not.toBe("");
        for (const p of placeholders(text)) expect(source.has(p), `${locale} ${key} {${p}}`).toBe(true);
      }
    }
  });

  it("list messages keep their length (sample names, simulated friends)", () => {
    for (const locale of LOCALES) {
      expect(translate(locale, "sample.names").split(",")).toHaveLength(7);
      expect(translate(locale, "sim.friendNames").split(",")).toHaveLength(10);
      expect(translate(locale, "sim.friendMessages").split("|")).toHaveLength(5);
    }
  });

  it("KRW prices appear only in Korean", () => {
    const params = { price: "₩2,900", p1: "₩2,900", p2: "₩6,900", p3: "₩12,900", p4: "₩25,900", district: "X", max: 60 };
    expect(translate("ko", "upgrade.inApp", params)).toContain("₩2,900");
    for (const locale of LOCALES.filter((l) => l !== "ko")) {
      expect(translate(locale, "upgrade.inApp", params)).not.toContain("₩");
    }
  });
});

describe("translate", () => {
  it("interpolates params", () => {
    expect(translate("ko", "view.claimed", { name: "하늘" })).toBe("하늘님의 집에 불이 켜졌어요!");
    expect(translate("en", "view.claimed", { name: "Sky" })).toContain("Sky");
  });

  it("picks Russian plural forms by count", () => {
    const one = translate("ru", "invite.left", { count: 1 });
    const few = translate("ru", "invite.left", { count: 3 });
    const many = translate("ru", "invite.left", { count: 5 });
    expect(new Set([one, few, many].map((s) => s.replace(/\d+/, "#"))).size).toBe(3);
    expect(translate("ru", "invite.left", { count: 21 }).replace("21", "#")).toBe(one.replace("1", "#"));
  });

  it("tr() follows the active locale", () => {
    setActiveLocale("ja");
    expect(getActiveLocale()).toBe("ja");
    expect(tr("common.retry")).toBe(translate("ja", "common.retry"));
    setActiveLocale("ko");
    expect(tr("common.retry")).toBe("다시 시도");
  });

  it("localized() falls back to English", () => {
    expect(localized({ ko: "눈송이 동네", en: "Snowflake Lane" }, "fr")).toBe("Snowflake Lane");
    expect(localized({ ko: "눈송이 동네", en: "Snowflake Lane", fr: "Rue des Flocons" }, "fr")).toBe("Rue des Flocons");
  });
});
