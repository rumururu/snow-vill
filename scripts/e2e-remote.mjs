/**
 * Multi-device E2E against the real backend (shared mkideabox-games Supabase).
 * Each browser context has its own storage, standing in for a different phone.
 * Prints VILLAGE_ID / OWNER_SECRET lines so scripts/e2e-remote.sh can verify and clean up server-side.
 *
 *   CDP_URL=http://127.0.0.1:<port> BASE_URL=http://localhost:3100 node scripts/e2e-remote.mjs
 * The app must be built with NEXT_PUBLIC_SUPABASE_* set.
 */
import { chromium } from "playwright-core";

const CDP_URL = process.env.CDP_URL;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
if (!CDP_URL) {
  console.error("Set CDP_URL");
  process.exit(2);
}

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures.push(label);
};

const browser = await chromium.connectOverCDP(CDP_URL);
const errors = [];
async function device(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  return { context, page };
}
const slot = (page, n) => page.locator(`button[data-slot="${n}"]`);
const settle = (page) => page.waitForTimeout(450);

const A = await device("creator");
const B = await device("friend");
const C = await device("late-1");
const D = await device("late-2");
let villageId = null;

try {
  // ---- creator: create + claim with photo ----
  await A.page.goto(`${BASE_URL}/create`);
  check(!(await A.page.getByText("시뮬레이션 데이터").isVisible()), "remote mode: no simulation badge on create");
  const name = `E2E ${Math.random().toString(36).slice(2, 6)}`;
  await A.page.getByLabel("우리 마을의 이름은?").fill(name);
  await A.page.getByRole("button", { name: "마을 생성하기" }).click();
  await A.page.getByRole("dialog", { name: "1번 집터에 내 집 만들기" }).waitFor();
  villageId = new URL(A.page.url()).pathname.split("/").pop();
  console.log(`VILLAGE_ID=${villageId}`);
  const owner = await A.page.evaluate(() => JSON.parse(localStorage.getItem("snow-village:identity:v1") ?? "{}"));
  console.log(`OWNER_SECRET=${owner.owners?.[villageId] ?? ""}`);
  check(/^[a-km-z2-9]{10}$/.test(villageId) && Boolean(owner.owners?.[villageId]), `server village id ${villageId} + owner secret kept locally`);
  check((await A.page.locator("details", { hasText: "테스트용 시뮬레이션" }).count()) === 0, "remote mode: simulation tools hidden");

  await A.page.getByLabel(/닉네임/).fill("만길");
  await A.page.getByText("세이지", { exact: true }).click();
  await A.page.getByLabel(/한마디/).fill("원격 서버 첫 집!");
  const png = await A.page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 700;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 900, 700);
    grad.addColorStop(0, "#9fc5d8");
    grad.addColorStop(1, "#e7b66b");
    g.fillStyle = grad;
    g.fillRect(0, 0, 900, 700);
    g.fillStyle = "#fffaf0";
    g.beginPath();
    g.arc(450, 350, 160, 0, Math.PI * 2);
    g.fill();
    return c.toDataURL("image/png");
  });
  await A.page.locator('input[type="file"]').setInputFiles({ name: "e2e.png", mimeType: "image/png", buffer: Buffer.from(png.split(",")[1], "base64") });
  await A.page.getByRole("img", { name: "선택한 사진 미리보기" }).waitFor();
  await A.page.getByRole("button", { name: "내 집 완성하기" }).click();
  await A.page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
  check((await slot(A.page, 0).getAttribute("data-state")) === "occupied", "creator's house lit after server claim");
  check(await A.page.getByText("내 집 · 만길").isVisible(), "creator sees own-house label");

  await A.page.getByRole("button", { name: "친구 초대" }).click();
  const invite = await A.page.getByLabel("초대 링크").inputValue();
  check(invite.includes(`/v/${villageId}`), `invite link ${invite}`);
  await A.page.keyboard.press("Escape");

  // ---- friend on another "device": open link, view photo, claim ----
  await B.page.goto(invite);
  await slot(B.page, 0).waitFor();
  check(await B.page.getByRole("heading", { name }).isVisible(), "friend sees the village from the link");
  check((await slot(B.page, 0).getAttribute("data-state")) === "occupied", "friend sees creator's house");
  await slot(B.page, 0).click();
  const img = B.page.getByTestId("frame-photo");
  await img.waitFor({ timeout: 15000 });
  const src = await img.getAttribute("src");
  check(src?.includes("/storage/v1/object/sign/snowvill-photos/"), "photo served via signed URL");
  await img.evaluate((el) => (el.complete ? null : new Promise((r) => el.addEventListener("load", r, { once: true }))));
  const size = await img.evaluate((el) => `${el.naturalWidth}x${el.naturalHeight}`);
  check(size === "512x512", `photo loads at 512x512 (${size})`);
  await settle(B.page);
  await B.page.screenshot({ path: `${OUT}11-remote-friend-photo.png` });
  check(!(await B.page.getByRole("button", { name: /비우기/ }).isVisible()), "friend cannot remove creator's house");
  await B.page.keyboard.press("Escape");

  await slot(B.page, 1).click();
  await B.page.getByLabel(/닉네임/).fill("친구");
  await B.page.getByRole("button", { name: "내 집 완성하기" }).click();
  await B.page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
  check((await slot(B.page, 1).getAttribute("data-state")) === "occupied", "friend claimed slot 2");

  // ---- creator sees the friend's house after refresh (focus/poll) ----
  await A.page.reload();
  await slot(A.page, 1).waitFor();
  await A.page.waitForFunction(() => document.querySelector('button[data-slot="1"]')?.getAttribute("data-state") === "occupied", null, { timeout: 15000 });
  check(true, "creator sees friend's house");
  check(await A.page.getByText("2/8").isVisible(), "occupancy 2/8 on creator device");

  // ---- real collision: C opens slot 3, D claims it first, C submits ----
  await C.page.goto(invite);
  await D.page.goto(invite);
  await slot(C.page, 2).click();
  await C.page.getByLabel(/닉네임/).fill("늦은친구");
  await slot(D.page, 2).click();
  await D.page.getByLabel(/닉네임/).fill("빠른친구");
  await D.page.getByRole("button", { name: "내 집 완성하기" }).click();
  await D.page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
  await C.page.getByRole("button", { name: "내 집 완성하기" }).click();
  const collisionMsg = C.page.getByText(/다른 친구가 이 집터에 먼저 입주했어요/);
  await collisionMsg.waitFor({ timeout: 15000 });
  check(true, "server collision → SLOT_TAKEN message");
  check(
    await collisionMsg.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    }),
    "collision message is inside the viewport (no scrolling needed)",
  );
  check((await C.page.getByLabel(/닉네임/).inputValue()) === "늦은친구", "draft kept after collision");
  await settle(C.page);
  await C.page.screenshot({ path: `${OUT}12-remote-collision.png` });
  await C.page.getByRole("button", { name: /번 빈 집터로 옮기기/ }).click();
  await C.page.getByRole("button", { name: "내 집 완성하기" }).click();
  await C.page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
  check(await C.page.getByText("내 집 · 늦은친구").isVisible(), "late friend moved to another free slot");

  // ---- report ----
  await slot(C.page, 0).click();
  await C.page.getByRole("button", { name: "부적절한 내용 신고하기" }).click();
  await C.page.getByText("신고가 접수됐어요").waitFor({ timeout: 15000 });
  check(true, "report sent to server");
  await C.page.keyboard.press("Escape");

  // ---- owner removes the friend's house, then deletes the village ----
  await A.page.reload();
  await slot(A.page, 1).waitFor();
  await slot(A.page, 1).click();
  await A.page.getByRole("button", { name: "마을 주인으로 이 집 비우기" }).click();
  await A.page.getByRole("button", { name: "집 비우기", exact: true }).click();
  await A.page.getByRole("dialog").waitFor({ state: "detached", timeout: 20000 });
  check((await slot(A.page, 1).getAttribute("data-state")) === "empty", "owner removed friend's house");

  await A.page.getByRole("button", { name: "더보기 메뉴" }).click();
  await A.page.getByRole("button", { name: "마을 삭제…" }).click();
  await A.page.getByRole("button", { name: "마을과 모든 집 삭제하기" }).click();
  await A.page.waitForURL(`${BASE_URL}/`, { timeout: 20000 });
  check(true, "owner deleted the village");
  await B.page.reload();
  await B.page.getByRole("heading", { name: "마을을 찾을 수 없어요" }).waitFor({ timeout: 15000 });
  check(true, "friend's link now shows not-found");

  const consoleErrors = errors.filter((e) => !/Failed to load resource.*(404|409)/.test(e));
  check(consoleErrors.length === 0, `no unexpected console errors (${consoleErrors.join(" | ")})`);
} catch (err) {
  console.error(err);
  failures.push(String(err).split("\n")[0]);
} finally {
  for (const d of [A, B, C, D]) await d.context.close();
  await browser.close();
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall remote E2E checks passed");
process.exit(failures.length ? 1 : 0);
