import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routerMock, renderWithStore } from "@/test/render";
import { createVillageStore } from "@/store/villageStore";
import { VillageView } from "./VillageView";

function slotButton(slot: number) {
  const el = document.querySelector<SVGPolygonElement>(`polygon[role="button"][data-slot="${slot}"]`);
  if (!el) throw new Error(`slot ${slot} button missing`);
  return el;
}

describe("VillageView (sample village)", () => {
  it("renders a hotspot per lot (15 + 3 locked) and the 7/15 occupancy", () => {
    renderWithStore(<VillageView villageId="demo" />);
    expect(screen.getAllByRole("button", { name: /번 (집|빈 집터|집터 \(잠김\))/ })).toHaveLength(18);
    expect(document.querySelectorAll('polygon[data-state="occupied"]')).toHaveLength(7);
    expect(document.querySelectorAll('polygon[data-state="locked"]')).toHaveLength(3);
    expect(document.querySelectorAll('polygon[data-state="empty"]')).toHaveLength(8);
    expect(screen.getByText("7/15")).toBeInTheDocument();
    expect(screen.getAllByText("시뮬레이션 데이터").length).toBeGreaterThan(0);
  });

  it("empty house opens the claim sheet; Esc closes it and returns focus", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    const trigger = slotButton(6);
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "7번 집터에 내 집 만들기" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByLabelText(/닉네임/)).toHaveFocus();
    expect(document.getElementById("app-root")).toHaveAttribute("inert");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.getElementById("app-root")).not.toHaveAttribute("inert");
  });

  it("occupied house opens the photo-frame sheet with fallback illustration", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(0));
    const dialog = screen.getByRole("dialog", { name: /하늘의/ });
    expect(within(dialog).getByRole("img", { name: "하늘님의 기본 프로필 그림" })).toBeInTheDocument();
    expect(within(dialog).getByText(/올해도 고마웠어/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "부적절한 내용 신고하기" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(slotButton(0)).toHaveFocus();
  });

  it("backdrop click closes the sheet", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(0));
    await user.click(screen.getByTestId("sheet-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("validates nickname and the 60-character message inline", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(6));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/한마디/));
    await user.paste("눈".repeat(61));
    expect(within(dialog).getByText("61/60")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "내 집 완성하기" }));
    expect(await within(dialog).findByText("닉네임을 입력해 주세요.")).toBeInTheDocument();
    expect(within(dialog).getByText("메시지는 60자 이내로 적어 주세요.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/닉네임/)).toHaveFocus();
  });

  it("claims a house end-to-end and updates the scene", async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(6));
    await user.type(screen.getByLabelText(/닉네임/), "눈사람");
    await user.click(screen.getByRole("radio", { name: "풍차 집" }));
    await user.click(screen.getByRole("radio", { name: /오른쪽 뒤/ }));
    await user.click(screen.getByRole("button", { name: "내 집 완성하기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(slotButton(6)).toHaveAttribute("data-state", "occupied");
    expect(screen.getByText("8/15")).toBeInTheDocument();
    expect(screen.getByText("내 집 · 눈사람")).toBeInTheDocument();
    const mine = store.getState().villages.demo.houses.find((h) => h.slot === 6);
    expect([mine?.style, mine?.direction]).toEqual(["windmill", 2]);
    expect(document.querySelector('[data-slot="6"][data-house-style="windmill"][data-direction="2"]')).not.toBeNull();
    // Already joined: primary action becomes "내 집 보기".
    expect(screen.getByRole("button", { name: "내 집 보기" })).toBeInTheDocument();
  });

  it("keeps the draft and offers another slot after a simulated collision", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(6));
    await user.type(screen.getByLabelText(/닉네임/), "늦은친구");
    await user.click(screen.getByText("테스트용 시뮬레이션 (프로토타입)"));
    await user.click(screen.getByLabelText("제출 직전에 다른 친구가 이 집터를 차지하기"));
    await user.click(screen.getByRole("button", { name: "내 집 완성하기" }));
    expect(await screen.findByText(/다른 친구가 이 집터에 먼저 입주했어요/)).toBeInTheDocument();
    expect(screen.getByLabelText(/닉네임/)).toHaveValue("늦은친구");
    await user.click(screen.getByRole("button", { name: /번 빈 집터로 옮기기/ }));
    expect(screen.getByRole("dialog", { name: /번 집터에 내 집 만들기/ })).toBeInTheDocument();
  });

  it("full village hides house creation and offers share + new village", () => {
    const store = createVillageStore({ storage: null });
    for (let i = 0; i < 8; i++) store.simulateFriendClaim("demo");
    renderWithStore(<VillageView villageId="demo" />, store);
    expect(screen.getByText("15/15")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "내 집 만들기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공유 카드 만들기" })).toBeInTheDocument();
    // A full village that can still grow offers the expansion next to the share card.
    expect(screen.getByRole("button", { name: "마을 넓히기" })).toBeInTheDocument();
  });

  it("free village: district 0 only; expanding opens 3 lots of the district the buyer picks", async () => {
    const user = userEvent.setup();
    const store = createVillageStore({ storage: null });
    const r = await store.createVillage("무료 마을");
    if (!r.ok) throw new Error();
    renderWithStore(<VillageView villageId={r.id} />, store);
    expect(document.querySelectorAll('polygon[data-state="empty"]')).toHaveLength(6);
    expect(document.querySelectorAll('polygon[data-state="closed"]')).toHaveLength(9);
    for (let i = 0; i < 6; i++) act(() => void store.simulateFriendClaim(r.id));
    expect(screen.getByText("6/6")).toBeInTheDocument();
    // Tap the closed Santa district on the map → the sheet opens with it selected.
    await user.click(document.querySelector('polygon[data-district="2"]')!);
    const sheet = screen.getByRole("dialog", { name: "마을 넓히기" });
    expect(within(sheet).getByRole("radio", { name: /산타 동네/ })).toBeChecked();
    expect(within(sheet).getByText(/₩2,900 → 12채 ₩6,900/)).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "산타 동네 열기 (시뮬레이션)" }));
    expect(screen.getByText("6/9")).toBeInTheDocument();
    expect(Array.from(document.querySelectorAll('polygon[data-state="empty"]')).map((n) => n.getAttribute("data-slot")).sort()).toEqual(["12", "13", "14"]);
    expect(document.querySelector('[data-facility="landmark_santa"]')).not.toBeNull();
    // The Santa district's second half stays locked until it is opened too.
    expect(document.querySelectorAll('polygon[data-state="locked"]')).toHaveLength(3);
  });

  it("facilities come with their districts", () => {
    const store = createVillageStore({ storage: null });
    renderWithStore(<VillageView villageId="demo" />, store);
    const ids = () => Array.from(document.querySelectorAll("[data-facility]")).map((n) => n.getAttribute("data-facility")).sort();
    // Sample: districts 0 (snowman family), 1 (rink) and half of 2 (Santa) are open.
    expect(ids()).toEqual(["cathedral", "decor_snowfamily", "landmark_rink", "landmark_santa", "tree"]);
    expect(document.querySelector("[data-aurora]")).toBeNull();
  });

  it("shows a not-found state for unknown villages", () => {
    renderWithStore(<VillageView villageId="missing" />);
    expect(screen.getByRole("heading", { name: "마을을 찾을 수 없어요" })).toBeInTheDocument();
  });

  it("opens the first-claim prompt after creation and cleans the URL", async () => {
    const store = createVillageStore({ storage: null });
    const r = await store.createVillage("새 마을");
    if (!r.ok) throw new Error();
    renderWithStore(<VillageView villageId={r.id} isNew />, store);
    expect(screen.getByRole("dialog", { name: "1번 집터에 내 집 만들기" })).toBeInTheDocument();
    expect(screen.getByText(/마을이 생겼어요!/)).toBeInTheDocument();
    expect(routerMock.replace).toHaveBeenCalledWith(`/v/?id=${r.id}`, { scroll: false });
  });

  it("invite sheet shows the invite URL with a non-PII source token", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(screen.getByRole("button", { name: "친구 초대" }));
    const dialog = screen.getByRole("dialog", { name: "친구 초대" });
    expect(within(dialog).getByLabelText("초대 링크")).toHaveValue("http://localhost:3000/v/?id=demo&src=invite_copy");
    await user.click(within(dialog).getByRole("button", { name: "복사" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent(/복사/);
  });
});
