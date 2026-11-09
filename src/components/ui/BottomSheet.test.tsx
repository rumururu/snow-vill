import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { BottomSheet } from "./BottomSheet";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div id="app-root">
        <button onClick={() => setOpen(true)}>열기</button>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="시트">
        <input aria-label="첫 입력" />
        <button>마지막 버튼</button>
      </BottomSheet>
    </>
  );
}

describe("BottomSheet", () => {
  it("traps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("열기"));
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("첫 입력")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("마지막 버튼")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("마지막 버튼")).toHaveFocus();
  });

  it("restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByText("열기");
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
