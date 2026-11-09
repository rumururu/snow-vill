/**
 * Browser smoke test + README screenshots for the M0 prototype.
 *
 * Connects to an already running, installed Google Chrome over loopback CDP
 * (no bundled Chromium). Usage:
 *   CDP_URL=http://127.0.0.1:<port> BASE_URL=http://localhost:3000 npm run screenshots
 * See README "Screenshots / browser smoke test" for launching Chrome.
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const CDP_URL = process.env.CDP_URL;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
if (!CDP_URL) {
  console.error("Set CDP_URL (e.g. http://127.0.0.1:9222) to a Chrome started with --remote-debugging-port.");
  process.exit(2);
}

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures.push(label);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.connectOverCDP(CDP_URL);
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
// Let sheet slide-in (220ms) and illumination (600ms) animations settle before capturing.
const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}${name}.png` });
};
const slot = (n) => page.locator(`button[data-slot="${n}"]`);

try {
  // S01 landing
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("link", { name: "무료로 마을 만들기" }).waitFor();
  await shot("01-landing");

  // S03 sample village
  await page.goto(`${BASE_URL}/v/?id=demo`);
  await slot(0).waitFor();
  check((await page.locator("button[data-slot]").count()) === 8, "8 house hotspots rendered");
  for (let i = 0; i < 8; i++) {
    const box = await slot(i).boundingBox();
    check(box && box.width >= 44 && box.height >= 44, `slot ${i} hit box >= 44px (${box?.width.toFixed(0)}x${box?.height.toFixed(0)})`);
  }
  await shot("02-village");

  // S04 claim sheet with a real photo upload (re-encoded via canvas)
  await slot(1).click();
  await page.getByRole("dialog", { name: "2번 집터에 내 집 만들기" }).waitFor();
  await page.getByLabel(/닉네임/).fill("눈사람");
  await page.getByText("세이지", { exact: true }).click();
  await page.getByLabel(/한마디/).fill("올겨울도 따뜻하게 보내자! ☃️");
  const pngDataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0, "#f2b8a0");
    grad.addColorStop(1, "#708b82");
    g.fillStyle = grad;
    g.fillRect(0, 0, 800, 600);
    g.fillStyle = "#fffaf0";
    g.beginPath();
    g.arc(400, 300, 140, 0, Math.PI * 2);
    g.fill();
    return c.toDataURL("image/png");
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "test-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngDataUrl.split(",")[1], "base64"),
  });
  await page.getByRole("img", { name: "선택한 사진 미리보기" }).waitFor();
  const previewSrc = await page.getByRole("img", { name: "선택한 사진 미리보기" }).getAttribute("src");
  check(previewSrc?.startsWith("data:image/jpeg"), "photo re-encoded to JPEG (metadata stripped)");
  await shot("03-claim-sheet");

  // Wrong file type is rejected and the draft is kept.
  await page.locator('input[type="file"]').setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("GIF89a-not-a-jpeg") });
  await page.getByText("JPG, PNG, WEBP 사진만 올릴 수 있어요.").waitFor();
  check((await page.getByLabel(/닉네임/).inputValue()) === "눈사람", "draft preserved after rejected upload");

  await page.getByRole("button", { name: "내 집 완성하기" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  check((await slot(1).getAttribute("data-state")) === "occupied", "claimed slot becomes occupied");
  await page.waitForTimeout(700);
  await shot("04-house-lit");

  // S05 photo frame
  await slot(1).click();
  await page.getByRole("dialog", { name: "눈사람의 작은 집" }).waitFor();
  check(await page.getByTestId("frame-photo").isVisible(), "photo shown inside the frame after tapping the house");
  await shot("05-photo-frame");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  check(await slot(1).evaluate((el) => el === document.activeElement), "focus returns to house after Esc");

  // Invite
  await page.getByRole("button", { name: "친구 초대" }).click();
  await page.getByRole("dialog", { name: "친구 초대" }).waitFor();
  const invite = await page.getByLabel("초대 링크").inputValue();
  check(invite.endsWith("/v/?id=demo&src=invite_copy"), `invite url ${invite}`);
  await shot("06-invite");
  await page.keyboard.press("Escape");

  // Fill the village via simulation → completion share sheet
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "더보기 메뉴" }).click();
    await page.getByRole("button", { name: "친구 입주 시뮬레이션" }).click();
  }
  const shareDialog = page.getByRole("dialog", { name: "우리 마을이 완성됐어요!" });
  await shareDialog.waitFor();
  check((await shareDialog.locator("img, image").count()) === 0, "share sheet contains no <img>/<image>");
  check(!(await shareDialog.innerHTML()).includes("data:image"), "share sheet contains no photo data URL");
  await page.waitForTimeout(400);
  await shot("07-share-complete");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "이미지 저장" }).click()]);
  await download.saveAs(`${OUT}share-card-export.png`);
  check(true, "share card PNG exported");
  await page.keyboard.press("Escape");

  // S02 create flow → first-claim prompt
  await page.goto(`${BASE_URL}/create`);
  await page.getByLabel("우리 마을의 이름은?").fill("");
  await page.getByRole("button", { name: "마을 생성하기" }).click();
  check(await page.getByText("마을 이름을 입력해 주세요.").isVisible(), "empty village name rejected");
  await page.getByLabel("우리 마을의 이름은?").fill("13학번 동기 마을");
  await shot("08-create");
  await page.getByRole("button", { name: "마을 생성하기" }).click();
  await page.getByRole("dialog", { name: "1번 집터에 내 집 만들기" }).waitFor();
  check(/^[a-z0-9]+$/.test(new URL(page.url()).searchParams.get("id") ?? ""), `created village route ${page.url()}`);
  await shot("09-first-claim");

  // Unknown village
  await page.goto(`${BASE_URL}/v/?id=does-not-exist`);
  await page.getByRole("heading", { name: "마을을 찾을 수 없어요" }).waitFor();
  check(true, "unknown village shows not-found state");

  // 320 / 390 / 480 widths: no horizontal overflow
  for (const width of [320, 390, 480]) {
    await page.setViewportSize({ width, height: 740 });
    for (const path of ["/", "/create/", "/v/?id=demo"]) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${width}px ${path} no horizontal overflow (${overflow})`);
    }
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${BASE_URL}/v/?id=demo`);
  await slot(0).waitFor();
  await shot("10-village-320");

  // Reduced motion: snowfall hidden, no animations
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await slot(0).waitFor();
  const snowDisplay = await page.locator(".sv-snowfall").first().evaluate((el) => getComputedStyle(el).display);
  check(snowDisplay === "none", "reduced motion hides snowfall");

  check(consoleErrors.length === 0, `no console errors (${consoleErrors.join(" | ")})`);
} catch (err) {
  console.error(err);
  failures.push(String(err));
} finally {
  await context.close();
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall browser checks passed");
process.exit(failures.length ? 1 : 0);
