import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routerMock, renderWithStore } from "@/test/render";
import { createVillageStore } from "@/store/villageStore";
import { VillageView } from "./VillageView";

function slotButton(slot: number) {
  const el = document.querySelector<HTMLButtonElement>(`button[data-slot="${slot}"]`);
  if (!el) throw new Error(`slot ${slot} button missing`);
  return el;
}

describe("VillageView (sample village)", () => {
  it("renders 8 house hotspots and the 3/8 occupancy", () => {
    renderWithStore(<VillageView villageId="demo" />);
    expect(screen.getAllByRole("button", { name: /번 (집|빈 집터)/ })).toHaveLength(8);
    expect(document.querySelectorAll('button[data-state="occupied"]')).toHaveLength(3);
    expect(screen.getByText("3/8")).toBeInTheDocument();
    expect(screen.getAllByText("시뮬레이션 데이터").length).toBeGreaterThan(0);
  });

  it("empty house opens the claim sheet; Esc closes it and returns focus", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    const trigger = slotButton(1);
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "2번 집터에 내 집 만들기" });
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
    const dialog = screen.getByRole("dialog", { name: "하늘의 작은 집" });
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
    await user.click(slotButton(1));
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
    await user.click(slotButton(1));
    await user.type(screen.getByLabelText(/닉네임/), "눈사람");
    await user.click(screen.getByRole("radio", { name: "세이지" }));
    await user.click(screen.getByRole("button", { name: "내 집 완성하기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(slotButton(1)).toHaveAttribute("data-state", "occupied");
    expect(screen.getByText("4/8")).toBeInTheDocument();
    expect(screen.getByText("내 집 · 눈사람")).toBeInTheDocument();
    expect(store.getState().villages.demo.houses.find((h) => h.slot === 1)?.style).toBe("sage");
    // Already joined: primary action becomes "내 집 보기".
    expect(screen.getByRole("button", { name: "내 집 보기" })).toBeInTheDocument();
  });

  it("keeps the draft and offers another slot after a simulated collision", async () => {
    const user = userEvent.setup();
    renderWithStore(<VillageView villageId="demo" />);
    await user.click(slotButton(1));
    await user.type(screen.getByLabelText(/닉네임/), "늦은친구");
    await user.click(screen.getByText("테스트용 시뮬레이션 (프로토타입)"));
    await user.click(screen.getByLabelText("제출 직전에 다른 친구가 이 집터를 차지하기"));
    await user.click(screen.getByRole("button", { name: "내 집 완성하기" }));
    expect(await screen.findByText(/다른 친구가 이 집터에 먼저 입주했어요/)).toBeInTheDocument();
    expect(screen.getByLabelText(/닉네임/)).toHaveValue("늦은친구");
    await user.click(screen.getByRole("button", { name: "3번 빈 집터로 옮기기" }));
    expect(screen.getByRole("dialog", { name: "3번 집터에 내 집 만들기" })).toBeInTheDocument();
  });

  it("full village hides house creation and offers share + new village", () => {
    const store = createVillageStore({ storage: null });
    for (let i = 0; i < 5; i++) store.simulateFriendClaim("demo");
    renderWithStore(<VillageView villageId="demo" />, store);
    expect(screen.getByText("8/8")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "내 집 만들기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공유 카드 만들기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 마을 만들기" })).toHaveAttribute("href", "/create");
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
