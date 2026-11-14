import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "@/test/render";
import { fakeAccountApi, fakeAuth, USER, village } from "@/test/accounts";
import type { MemberRole } from "@/lib/village";
import { createVillageStore } from "@/store/villageStore";
import LandingPage from "@/app/page";
import { VillageView } from "./VillageView";

function lockedStore(role: MemberRole, signedIn: boolean) {
  let current = role;
  const api = fakeAccountApi({
    getVillage: vi.fn(async () => village({ name: "비밀 마을", visibility: "private", locked: true, me: { role: current, houseId: null } })),
  });
  (api.requestJoin as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    current = "pending";
    return { ok: true, role: "pending" };
  });
  return { api, store: createVillageStore({ remote: api, auth: fakeAuth(signedIn ? USER : null) }) };
}

describe("locked private village", () => {
  it("guest: name and 로그인 only, no houses", async () => {
    const { store } = lockedStore(null, false);
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    expect(await screen.findByRole("heading", { name: "비밀 마을" })).toBeInTheDocument();
    expect(screen.getByTestId("locked-village")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(document.querySelectorAll("polygon[data-slot]")).toHaveLength(0);
  });

  it("signed in: nickname → 입주 신청 → waiting", async () => {
    const user = userEvent.setup();
    const { api, store } = lockedStore(null, true);
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    const submit = await screen.findByRole("button", { name: "입주 신청" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("닉네임"), "씨앗");
    await user.click(submit);
    expect(api.requestJoin).toHaveBeenCalledWith("abcdefghjk", "씨앗");
    expect(await screen.findByText("승인을 기다리고 있어요")).toBeInTheDocument();
  });
});

describe("owner of a server village", () => {
  function ownerStore(signedIn: boolean, visibility: "public" | "private" = "public") {
    const api = fakeAccountApi({
      getVillage: vi.fn(async () => village({ visibility, me: signedIn ? { role: "owner", houseId: null } : { role: null, houseId: null } })),
      membersOf: vi.fn(async () => [
        { userId: "u2", nickname: "씨", status: "pending" as const, createdAt: "x" },
        { userId: "u3", nickname: "디", status: "approved" as const, createdAt: "x" },
      ]),
    });
    const auth = fakeAuth(signedIn ? USER : null);
    const store = createVillageStore({ remote: api, auth });
    return { api, store };
  }

  it("signed in: 비공개 switch, 멤버 with the pending badge, approve / remove", async () => {
    const user = userEvent.setup();
    const { api, store } = ownerStore(true);
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    expect(await screen.findByTestId("menu-badge")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "더보기 메뉴" }));
    const toggle = screen.getByRole("switch", { name: /비공개/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(api.setVisibility).toHaveBeenCalledWith("abcdefghjk", "private");
    await waitFor(() => expect(screen.getByRole("img", { name: "비공개" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "더보기 메뉴" }));
    await user.click(screen.getByRole("button", { name: /멤버/ }));
    const sheet = await screen.findByRole("dialog", { name: "멤버" });
    await within(sheet).findByText("씨");
    await user.click(within(sheet).getByRole("button", { name: "승인" }));
    expect(api.decideMember).toHaveBeenCalledWith("abcdefghjk", "u2", true);
    await user.click(within(sheet).getByRole("button", { name: "내보내기" }));
    expect(api.decideMember).toHaveBeenCalledWith("abcdefghjk", "u3", false);
  });

  it("guest owner: 비공개 asks to sign in first", async () => {
    const user = userEvent.setup();
    const { api, store } = ownerStore(false);
    await store.createVillage("마을"); // this browser holds the owner secret
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    await user.click(await screen.findByRole("button", { name: "더보기 메뉴" }));
    expect(screen.queryByRole("button", { name: /멤버/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: /비공개/ }));
    expect(api.setVisibility).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "로그인" })).toBeInTheDocument();
  });

  it("private village: no share card (name and houses would leave the app)", async () => {
    const user = userEvent.setup();
    const { store } = ownerStore(true, "private");
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    await user.click(await screen.findByRole("button", { name: "더보기 메뉴" }));
    expect(screen.queryByRole("button", { name: "공유 카드 보기" })).not.toBeInTheDocument();
  });

  it("public village: the menu offers the share card", async () => {
    const user = userEvent.setup();
    const { store } = ownerStore(true, "public");
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    await user.click(await screen.findByRole("button", { name: "더보기 메뉴" }));
    expect(screen.getByRole("button", { name: "공유 카드 보기" })).toBeInTheDocument();
  });

  it("public village guests (not owners) see no owner controls", async () => {
    const user = userEvent.setup();
    const { store } = ownerStore(false);
    renderWithStore(<VillageView villageId="abcdefghjk" />, store);
    await user.click(await screen.findByRole("button", { name: "더보기 메뉴" }));
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 집 만들기" })).toBeInTheDocument();
  });
});

describe("landing", () => {
  it("signed in: 내 마을 from the account with the pending badge, and the 계정 control", async () => {
    const api = fakeAccountApi({
      myVillages: vi.fn(async () => [
        { id: "abcdefghjk", name: "우리 마을", capacity: 6, visibility: "private" as const, createdAt: "x", role: "owner" as const, houses: 2, pending: 3 },
        { id: "otherxxxxx", name: "친구 마을", capacity: 6, visibility: "private" as const, createdAt: "x", role: "pending" as const, houses: 1, pending: 0 },
      ]),
    });
    renderWithStore(<LandingPage />, createVillageStore({ remote: api, auth: fakeAuth(USER) }));
    const mine = await screen.findByTestId("my-village-abcdefghjk");
    expect(screen.getByRole("heading", { name: "내 마을" })).toBeInTheDocument();
    expect(within(mine).getByLabelText("입주 신청 3건")).toHaveTextContent("3");
    expect(within(screen.getByTestId("my-village-otherxxxxx")).getByText("승인 대기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /무료로 마을 만들기/ })).toBeInTheDocument();
    expect(screen.getByTestId("account-button")).toHaveTextContent("계정");
  });

  it("account sheet: 로그아웃, and 계정 삭제 asks for confirmation first", async () => {
    const user = userEvent.setup();
    const api = fakeAccountApi();
    const auth = fakeAuth(USER);
    renderWithStore(<LandingPage />, createVillageStore({ remote: api, auth }));
    await user.click(await screen.findByTestId("account-button"));
    const sheet = screen.getByRole("dialog", { name: "계정" });
    await user.click(within(sheet).getByRole("button", { name: "계정 삭제" }));
    const confirm = screen.getByRole("dialog", { name: "계정 삭제" });
    expect(within(confirm).getByText(/되돌릴 수 없어요/)).toBeInTheDocument();
    expect(api.deleteAccount).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole("button", { name: "계정 삭제" }));
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith(expect.any(String), null));
    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("no backend: no sign-in control and no list", () => {
    renderWithStore(<LandingPage />);
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 마을" })).not.toBeInTheDocument();
  });
});
