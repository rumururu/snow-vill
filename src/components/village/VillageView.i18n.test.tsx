import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { INTL_LOCALE, setActiveLocale, translate, type Locale } from "@/lib/i18n";
import { createVillageStore } from "@/store/villageStore";
import { renderWithStore } from "@/test/render";
import { VillageView } from "./VillageView";

/** Geometry names (src/lib/village-geometry.json): districts 3 and 4 are closed in the sample village (4 sits inside the default camera, 3 does not); slot 0 is a brick house. */
const CASES: Array<{ locale: Locale; district: string; chip: string; brick: string }> = [
  { locale: "en", district: "Rudolph Lane", chip: "Sled Lane", brick: "Brick house" },
  { locale: "ja", district: "ルドルフ通り", chip: "そり通り", brick: "レンガの家" },
];

describe.each(CASES)("VillageView in $locale", ({ locale, district, chip, brick }) => {
  it("shows translated UI text, district and house type names", async () => {
    setActiveLocale(locale);
    // Store created after the switch, so the sample village is in the same language.
    renderWithStore(<VillageView villageId="demo" />, createVillageStore({ storage: null }));

    expect(document.documentElement.lang).toBe(INTL_LOCALE[locale]);
    const invite = translate(locale, "view.invite");
    expect(invite).not.toBe(translate("ko", "view.invite"));
    expect(screen.getByRole("button", { name: invite })).toBeInTheDocument();
    expect(screen.queryByText("친구 초대")).not.toBeInTheDocument();

    // Closed district: hit target label and the name chip on the map.
    expect(screen.getByRole("button", { name: translate(locale, "map.closedDistrict", { district }) })).toBeInTheDocument();
    // Name chips only where they fit the default camera: Sled Lane does, Rudolph Lane (off the edge) does not.
    expect(screen.getByText(`🔒 ${chip}`)).toBeInTheDocument();
    expect(screen.queryByText(`🔒 ${district}`)).not.toBeInTheDocument();

    // Sample village content follows the language too.
    expect(screen.getByRole("heading", { level: 1, name: translate(locale, "sample.name") })).toBeInTheDocument();

    const user = userEvent.setup();
    const firstName = translate(locale, "sample.names").split(",")[0];
    await user.click(screen.getByRole("button", { name: translate(locale, "map.house", { n: 1, name: firstName, style: brick }) }));
    const dialog = screen.getByRole("dialog", { name: translate(locale, "frame.title", { name: firstName }) });
    expect(within(dialog).getByText(new RegExp(brick))).toBeInTheDocument();
  });
});
