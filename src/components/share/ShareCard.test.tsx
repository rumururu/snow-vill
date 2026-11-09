import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithStore } from "@/test/render";
import { createVillageStore } from "@/store/villageStore";
import { toShareCardData } from "@/lib/share";
import { createSampleVillage, type Village } from "@/lib/village";
import { VillageView } from "@/components/village/VillageView";
import { ShareCard } from "./ShareCard";

const PHOTO = "data:image/jpeg;base64,/9j/SECRETPHOTOPIXELS";

function villageWithPhotos(): Village {
  const v = createSampleVillage();
  return { ...v, houses: v.houses.map((h) => ({ ...h, photo: PHOTO, nickname: `${h.nickname}비밀` })) };
}

describe("photo-free share card", () => {
  it("share data carries only slot styles and completion", () => {
    const data = toShareCardData(villageWithPhotos());
    expect(JSON.stringify(data)).not.toContain("data:image");
    expect(JSON.stringify(data)).not.toContain("비밀");
    expect(Object.keys(data).sort()).toEqual(["complete", "slots"]);
    expect(data.slots.filter((s) => s.style !== null)).toHaveLength(3);
  });

  it("rendered card contains no raster images, photo data, names or messages", () => {
    render(<ShareCard data={toShareCardData(villageWithPhotos())} />);
    const card = screen.getByTestId("share-card");
    expect(card.querySelectorAll("image, img, foreignObject")).toHaveLength(0);
    expect(card.outerHTML).not.toContain("data:image");
    expect(card.outerHTML).not.toContain("비밀");
    expect(card.outerHTML).not.toContain("올해도 고마웠어");
    expect(card.getAttribute("viewBox")).toBe("0 0 1080 1350");
  });

  it("share sheet in a village with uploaded photos shows no photo pixels", async () => {
    const user = userEvent.setup();
    const store = createVillageStore({ storage: null });
    const r = store.createVillage("사진 마을");
    if (!r.ok) throw new Error();
    store.claimHouse(r.id, 0, { nickname: "사진주인", style: "wood", photo: PHOTO });
    renderWithStore(<VillageView villageId={r.id} />, store);

    await user.click(screen.getByRole("button", { name: "더보기 메뉴" }));
    await user.click(screen.getByRole("button", { name: "공유 카드 보기" }));
    const dialog = screen.getByRole("dialog", { name: "마을 공유 카드" });
    expect(dialog.querySelectorAll("img, image")).toHaveLength(0);
    expect(dialog.innerHTML).not.toContain("data:image");
    expect(within(dialog).getByText(/사진·이름·메시지가 들어가지 않아요/)).toBeInTheDocument();

    // The photo itself is only visible after tapping the house.
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    await user.click(document.querySelector<HTMLButtonElement>('button[data-slot="0"]')!);
    expect(screen.getByTestId("frame-photo")).toHaveAttribute("src", PHOTO);
  });
});
