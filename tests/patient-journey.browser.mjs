import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const repo = fileURLToPath(new URL("..", import.meta.url));
const output =
  process.env.PATIENT_JOURNEY_OUTPUT || join(tmpdir(), "ez-healthcare-patient-journey");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
let notificationFailure = false;
let summaryFailure = false;
let largeFeed = false,
  pageFailure = false,
  slowPage = false;
const pageRequests = [];
const notices = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Đã phân phòng khám",
    message: "Vui lòng đến phòng P.101.",
    type: "CLINIC_ASSIGNED",
    visitId: id,
    createdAt: "2026-11-09T03:00:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Mời đến quầy tiếp nhận",
    message: "Mời số A-014 đến quầy.",
    type: "HALL_CALLED",
    visitId: id,
    createdAt: "2026-11-09T02:55:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Đã cấp số tiếp nhận",
    message: "Số tiếp nhận A-014.",
    type: "HALL_ISSUED",
    readAt: "2026-11-09T02:51:00Z",
    createdAt: "2026-11-09T02:50:00Z",
  },
];
const olderNotices = Array.from({ length: 24 }, (_, index) => ({
  id: `55555555-5555-4555-8555-${String(index).padStart(12, "0")}`,
  title: `Thông báo trước ${index + 1}`,
  message: "Nội dung kiểm thử tải thêm.",
  type: "HALL_ISSUED",
  createdAt: new Date(Date.UTC(2026, 10, 8, 0, 0, 24 - index)).toISOString(),
}));
let scenario = "working",
  reads = 0;
const clinic = { code: "P.101", name: "Nội tổng quát", floor: 1, roomType: "CONSULTATION" };
const lab = { code: "P.202", name: "Xét nghiệm", floor: 2, roomType: "LABORATORY" };
const imaging = { code: "P.303", name: "Chẩn đoán hình ảnh", floor: 3, roomType: "IMAGING" };
const status = () =>
  scenario === "return" || scenario === "stale"
    ? "RE_EXAM_CALLING"
    : scenario === "reexam"
      ? "IN_EXAMINATION"
      : scenario === "cancelled"
        ? "CANCELLED"
        : "PARACLINICAL_PENDING";
const steps = () => [
  {
    stepId: "lab",
    sequenceOrder: 1,
    isReExam: false,
    department: lab,
    status:
      scenario === "waiting"
        ? "WAITING"
        : scenario === "pending"
          ? "PENDING"
          : scenario === "parallel"
            ? "IN_PROGRESS"
            : "COMPLETED",
  },
  {
    stepId: "imaging",
    sequenceOrder: 2,
    isReExam: false,
    department: imaging,
    status: ["return", "reexam", "all-complete"].includes(scenario)
      ? "COMPLETED"
      : ["waiting", "pending"].includes(scenario)
        ? "PENDING"
        : "IN_PROGRESS",
  },
  {
    stepId: "return",
    sequenceOrder: 3,
    isReExam: true,
    department: clinic,
    status: scenario === "return" ? "WAITING" : scenario === "reexam" ? "IN_PROGRESS" : "PENDING",
  },
];
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (data, code = 200) => res.writeHead(code).end(JSON.stringify(data));
  const path = new URL(req.url, "http://fixture").pathname;
  for await (const _chunk of req) {
    /* Drain request. */
  }
  if (path === "/api/auth/me")
    return reply({
      id: "patient",
      name: "Nguyễn Minh Anh",
      email: "patient@fixture.test",
      role: "PATIENT",
      profileComplete: true,
    });
  if (path === "/api/reception-requests/me/current") return reply(null);
  if (path === "/api/notifications/page") {
    const url = new URL(req.url, "http://fixture");
    const filter = url.searchParams.get("filter") || "all";
    const cursor = url.searchParams.get("cursor");
    const limit = Number(url.searchParams.get("limit") || 10);
    if (limit === 1 && summaryFailure) return reply({ message: "technical count error" }, 503);
    if (limit > 1) pageRequests.push({ filter, cursor });
    if (cursor && pageFailure) return reply({ message: "Lỗi tải thêm mô phỏng" }, 503);
    if (cursor && slowPage) await delay(500);
    const all = largeFeed ? [...notices, ...olderNotices] : notices;
    const filtered = all.filter(
      (entry) => filter === "all" || (filter === "read" ? !!entry.readAt : !entry.readAt)
    );
    const start = cursor ? filtered.findIndex((entry) => entry.id === cursor) + 1 : 0;
    const items = filtered.slice(start, start + limit);
    return reply({
      items,
      nextCursor: start + limit < filtered.length ? items.at(-1).id : null,
      total: all.length,
      unreadCount: all.filter((entry) => !entry.readAt).length,
    });
  }
  if (path === "/api/notifications") return reply(notices);
  if (req.method === "PATCH" && path.startsWith("/api/notifications/")) {
    if (notificationFailure) return reply({ message: "Lỗi đọc thông báo mô phỏng" }, 503);
    const noticeId = path.split("/")[3];
    for (const notice of notices)
      if (noticeId === "read-all" || notice.id === noticeId) notice.readAt = "2026-11-09T03:01:00Z";
    return reply({ success: true });
  }
  if (path === "/api/visits/me/current")
    return reply({
      visitId: id,
      status: status(),
      hallTicketNumber: "A-014",
      clinicTicketNumber: "K-014",
      ticketStatus: scenario === "expired" ? "EXPIRED" : "ACTIVE",
      room: clinic,
      intakeCompleted: true,
      canPatientReissue: false,
    });
  if (path === `/api/visits/${id}`) {
    reads++;
    if (scenario === "error") return reply({ message: "Lỗi hành trình mô phỏng" }, 503);
    return reply({
      visitId: id,
      status: scenario === "stale" ? "PARACLINICAL_PENDING" : status(),
      patient: { name: "Nguyễn Minh Anh" },
      currentDepartment: clinic,
      steps: steps(),
      updatedAt: "2026-11-07T03:24:00Z",
    });
  }
  return reply({ success: true });
});
api.listen(0, "127.0.0.1");
await once(api, "listening");
const reserve = createServer();
reserve.listen(0, "127.0.0.1");
await once(reserve, "listening");
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: repo,
    env: {
      ...process.env,
      API_URL: `http://127.0.0.1:${api.address().port}/api`,
      APP_ORIGIN: origin,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let log = "",
  browser;
web.stdout.on("data", (chunk) => (log += chunk));
web.stderr.on("data", (chunk) => (log += chunk));
try {
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await delay(200);
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([{ name: "ez_access", value: "valid.PATIENT", url: origin }]);
  const p = await context.newPage(),
    errors = [];
  p.on("pageerror", (error) => errors.push(error.message));
  const home = () => p.goto(origin + "/dashboard/patient");
  const journey = p.getByRole("region", { name: "Hành trình khám của bạn", exact: true });
  const overview = p.getByRole("region", { name: "Lượt khám hiện tại", exact: true });
  summaryFailure = true;
  await home();
  await p.getByLabel("Chưa xác định số thông báo chưa đọc", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Thông báo", exact: true }).click();
  const countPopup = p.getByRole("dialog", { name: "Thông báo bệnh nhân", exact: true });
  await countPopup
    .getByText("Chưa tải được số lượng thông báo. Bạn vẫn có thể đọc từng thông báo.", {
      exact: true,
    })
    .waitFor();
  await countPopup.locator("li").first().waitFor();
  assert.ok(
    !(await countPopup.innerText()).includes("0 chưa đọc"),
    "Initial count failure must not look like zero unread"
  );
  assert.ok(!(await countPopup.innerText()).includes("technical count error"));
  assert.ok(
    await countPopup
      .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
      .isDisabled()
  );
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 568, height: 320 },
    { width: 1440, height: 1100 },
  ]) {
    await p.setViewportSize(viewport);
    await delay(350);
    const box = await countPopup.boundingBox();
    assert.ok(
      box.x >= -1 && box.x + box.width <= viewport.width + 1,
      "Count error popup fits width"
    );
    assert.ok(
      box.y >= -1 && box.y + box.height <= viewport.height + 1,
      "Count error popup fits height"
    );
  }
  summaryFailure = false;
  await countPopup.getByRole("button", { name: "Thử lại", exact: true }).click();
  await countPopup.getByText("2 chưa đọc · 3 thông báo", { exact: true }).waitFor();
  assert.ok(
    await countPopup
      .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
      .isEnabled()
  );
  await p.keyboard.press("Escape");
  summaryFailure = true;
  await p.getByRole("button", { name: "Thông báo", exact: true }).click();
  await countPopup
    .getByText("Chưa tải được số lượng thông báo. Bạn vẫn có thể đọc từng thông báo.", {
      exact: true,
    })
    .waitFor();
  assert.ok(
    !(await countPopup.innerText()).includes("2 chưa đọc"),
    "A failed refresh cannot present cached counts as current"
  );
  summaryFailure = false;
  await countPopup.getByRole("button", { name: "Thử lại", exact: true }).click();
  await countPopup.getByText("2 chưa đọc · 3 thông báo", { exact: true }).waitFor();
  await p.keyboard.press("Escape");
  reads = 0;
  await home();
  await p
    .getByRole("heading", { name: "Đang thực hiện: Chẩn đoán hình ảnh", exact: true })
    .waitFor();
  assert.equal(reads, 1, "Overview and timeline share one dossier request");
  assert.equal(
    await p.locator("main #notifications").count(),
    0,
    "No notification section on dashboard"
  );
  const bell = p.getByRole("button", { name: "Thông báo", exact: true });
  await bell.click();
  const popup = p.getByRole("dialog", { name: "Thông báo bệnh nhân", exact: true });
  await popup.waitFor();
  assert.equal(await popup.locator("li[data-read]").count(), 3);
  assert.equal(await popup.locator('li[data-read="false"]').count(), 2);
  await popup.screenshot({ path: join(output, "patient-notifications-popup.png") });
  await p.setViewportSize({ width: 320, height: 800 });
  const popupBox = await popup.boundingBox();
  assert.ok(
    popupBox && popupBox.x >= 0 && popupBox.x + popupBox.width <= 321,
    "Popup fits mobile viewport"
  );
  await p.setViewportSize({ width: 1440, height: 1100 });
  await popup.getByRole("tab", { name: "Chưa đọc", exact: true }).click();
  await popup
    .getByRole("button", { name: "Đánh dấu đã đọc: Đã phân phòng khám", exact: true })
    .click();
  await popup
    .getByRole("button", { name: "Đánh dấu đã đọc: Đã phân phòng khám", exact: true })
    .waitFor({ state: "hidden" });
  assert.equal(
    await popup.locator('li[data-read="false"]').count(),
    1,
    "A successfully read item disappears from Unread"
  );
  await popup.getByRole("tab", { name: "Đã đọc", exact: true }).click();
  assert.equal(await popup.locator('li[data-read="true"]').count(), 2);
  await popup.getByRole("tab", { name: "Chưa đọc", exact: true }).click();
  notificationFailure = true;
  await popup
    .getByRole("button", { name: "Đánh dấu đã đọc: Mời đến quầy tiếp nhận", exact: true })
    .click();
  await popup.getByText("Chưa đánh dấu được thông báo", { exact: true }).waitFor();
  assert.equal(
    await popup.locator('li[data-read="false"]').count(),
    1,
    "Failed mutation must not mark read"
  );
  notificationFailure = false;
  await popup.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }).click();
  await popup.getByText("Bạn đã đọc hết thông báo", { exact: true }).waitFor();
  await popup.getByText("0 chưa đọc · 3 thông báo", { exact: true }).waitFor();
  await popup.getByRole("tab", { name: "Đã đọc", exact: true }).click();
  assert.equal(await popup.locator('li[data-read="true"]').count(), 3);
  await p.keyboard.press("Escape");
  await popup.waitFor({ state: "hidden" });
  assert.equal(
    await bell.evaluate((element) => element === document.activeElement),
    true,
    "Escape restores focus to bell"
  );
  await bell.click();
  await popup.waitFor();
  await p.locator("h1").click();
  await popup.waitFor({ state: "hidden" });
  largeFeed = true;
  await bell.click();
  await popup.getByRole("tab", { name: "Tất cả", exact: true }).click();
  const notificationList = popup.getByRole("region", { name: "Danh sách thông báo", exact: true });
  await p.waitForFunction(
    () => document.querySelectorAll('[role="dialog"] li[data-read]').length === 10
  );
  const bounds = await notificationList.evaluate((element) => ({
    height: element.clientHeight,
    content: element.scrollHeight,
  }));
  assert.ok(
    bounds.height <= 360 && bounds.content > bounds.height,
    "Only a bounded notification list scrolls"
  );
  const beforeScroll = pageRequests.length;
  await p.waitForTimeout(250);
  assert.equal(
    pageRequests.length,
    beforeScroll,
    "Older pages must not load before reaching the sentinel"
  );
  pageFailure = true;
  await notificationList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await popup.getByRole("button", { name: "Thử lại tải thông báo", exact: true }).waitFor();
  const failedRequests = pageRequests.length;
  await p.waitForTimeout(300);
  assert.equal(pageRequests.length, failedRequests, "A failed sentinel request must not auto-loop");
  assert.equal(
    await popup.locator("li[data-read]").count(),
    10,
    "Existing rows survive load-more failure"
  );
  pageFailure = false;
  await popup.getByRole("button", { name: "Thử lại tải thông báo", exact: true }).click();
  await p.waitForFunction(
    () => document.querySelectorAll('[role="dialog"] li[data-read]').length === 20
  );
  slowPage = true;
  await notificationList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await popup.getByText("Đang tải thêm thông báo…", { exact: true }).waitFor();
  await popup.getByRole("tab", { name: "Đã đọc", exact: true }).click();
  await p.waitForFunction(
    () => document.querySelectorAll('[role="dialog"] li[data-read]').length === 3
  );
  await p.waitForTimeout(600);
  assert.equal(
    await popup.locator('li[data-read="false"]').count(),
    0,
    "Late All response must not leak into Read tab"
  );
  slowPage = false;
  await popup.getByRole("tab", { name: "Tất cả", exact: true }).click();
  await p.waitForFunction(
    () => document.querySelectorAll('[role="dialog"] li[data-read]').length === 10
  );
  await notificationList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await p.waitForFunction(
    () => document.querySelectorAll('[role="dialog"] li[data-read]').length === 20
  );
  await notificationList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await popup.getByText("Đã hiển thị hết thông báo", { exact: true }).waitFor();
  assert.equal(await popup.locator("li[data-read]").count(), 27);
  const uniqueIds = await popup.locator("li[data-read] h3").allTextContents();
  assert.equal(new Set(uniqueIds).size, 27, "Pages append without duplication");
  const endRequests = pageRequests.length;
  await notificationList.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await p.waitForTimeout(250);
  assert.equal(pageRequests.length, endRequests, "No request after end of feed");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 600 },
    { width: 844, height: 390 },
    { width: 1440, height: 1100 },
  ]) {
    await p.setViewportSize(viewport);
    await p.waitForTimeout(120);
    const box = await popup.boundingBox();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.x + box.width <= viewport.width + 1 &&
        box.y + box.height <= viewport.height + 1,
      `Popup fits ${viewport.width}x${viewport.height}`
    );
  }
  await notificationList.evaluate((element) => {
    element.scrollTop = 0;
  });
  await popup.screenshot({ path: join(output, "patient-notifications-infinite-scroll.png") });
  await p.keyboard.press("Escape");
  await popup.waitFor({ state: "hidden" });
  // The Patient redesign must keep its header on one row at desktop/tablet widths.
  for (const width of [768, 1024, 1440]) {
    await p.setViewportSize({ width, height: 1100 });
    const brand = await p.getByRole("link", { name: "ezHealthcare", exact: true }).boundingBox();
    const nav = await p.getByRole("navigation", { name: "Điều hướng bệnh nhân" }).boundingBox();
    const account = await p.getByRole("button", { name: "Tài khoản bệnh nhân" }).boundingBox();
    assert.ok(brand && nav && account);
    assert.ok(
      Math.abs(brand.y + brand.height / 2 - (nav.y + nav.height / 2)) < 2,
      `header nav alignment ${width}`
    );
    assert.ok(
      Math.abs(account.y + account.height / 2 - (nav.y + nav.height / 2)) < 2,
      `header account alignment ${width}`
    );
  }
  const directions = overview.getByRole("button", { name: "Xem hướng dẫn đến phòng", exact: true });
  await directions.click();
  assert.equal(await directions.getAttribute("aria-expanded"), "true");
  await p.locator("#patient-room-directions").getByText(/P.303/).waitFor();
  await directions.click();
  assert.equal(await directions.getAttribute("aria-expanded"), "false");
  const help = p.getByRole("button", { name: "Xem điểm hỗ trợ", exact: true });
  await help.click();
  await p.locator("#patient-support-details").waitFor();
  await help.click();
  assert.equal(await help.getAttribute("aria-expanded"), "false");
  await p.locator('img[src*="support-nurse"]').evaluate((img) => img.decode());
  assert.ok(await overview.getByText("Tầng 3", { exact: true }).isVisible());
  assert.equal(await journey.locator('[data-focus="true"]').count(), 1);
  const imagingToggle = journey.getByRole("button", { name: "Chẩn đoán hình ảnh", exact: true });
  assert.equal(
    await overview.getByRole("link", { name: /Xem hành trình|Xem bước cần theo dõi/ }).count(),
    0
  );
  const alignment = await overview
    .getByRole("button", { name: "Xem hướng dẫn đến phòng", exact: true })
    .evaluate((element) => ({
      button: element.getBoundingClientRect().right,
      row: element.parentElement.getBoundingClientRect().right,
    }));
  assert.ok(Math.abs(alignment.button - alignment.row) < 1, "Visit CTA aligns right on desktop");
  await imagingToggle.click();
  assert.equal(await imagingToggle.getAttribute("aria-expanded"), "true");
  assert.ok(await p.locator("#journey-step-imaging").isVisible());
  await imagingToggle.focus();
  await p.keyboard.press("Space");
  assert.equal(await imagingToggle.getAttribute("aria-expanded"), "false");
  await imagingToggle.click();
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: join(output, "journey-working-desktop.png"), fullPage: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow ${width}`
    );
    if (width === 390)
      await p.screenshot({ path: join(output, "journey-working-mobile.png"), fullPage: true });
  }
  scenario = "waiting";
  await home();
  await p.getByRole("heading", { name: "Chờ thực hiện: Xét nghiệm", exact: true }).waitFor();
  assert.ok(await overview.getByText("Tầng 2", { exact: true }).isVisible());
  scenario = "pending";
  await home();
  await p.getByRole("heading", { name: "Chờ hướng dẫn thực hiện chỉ định", exact: true }).waitFor();
  assert.equal(await journey.locator('[data-focus="true"]').count(), 0);
  scenario = "parallel";
  await home();
  await p.getByRole("heading", { name: "Có 2 chỉ định đang thực hiện", exact: true }).waitFor();
  assert.equal(await journey.locator('[data-focus="true"]').count(), 0);
  scenario = "all-complete";
  await home();
  await p.getByRole("heading", { name: "Chờ thông báo quay lại bác sĩ", exact: true }).waitFor();
  scenario = "return";
  await home();
  await p.getByRole("heading", { name: "Quay lại phòng khám để tái khám", exact: true }).waitFor();
  await journey.getByRole("button", { name: "Quay lại bác sĩ · Tái khám", exact: true }).click();
  await p
    .locator("#journey-step-return")
    .getByText(/Hệ thống đã xác nhận đủ kết quả/)
    .waitFor();
  assert.ok(
    await journey
      .getByRole("button", { name: "Quay lại bác sĩ · Tái khám", exact: true })
      .isVisible()
  );
  await p.setViewportSize({ width: 1440, height: 1100 });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: join(output, "journey-return-desktop.png"), fullPage: true });
  scenario = "reexam";
  await home();
  await p
    .getByRole("heading", { name: "Bác sĩ đang đọc kết quả và tái khám", exact: true })
    .waitFor();
  scenario = "stale";
  await home();
  await journey.getByText("Đang đồng bộ hành trình", { exact: true }).waitFor();
  assert.equal(await journey.locator('[data-focus="true"]').count(), 0);
  await journey.getByRole("button", { name: "Quay lại bác sĩ · Tái khám", exact: true }).click();
  await p
    .locator("#journey-step-return")
    .getByText(/Thông tin bước đang được cập nhật/)
    .waitFor();
  for (const ended of ["expired", "cancelled"]) {
    scenario = ended;
    await home();
    await journey.getByRole("button", { name: "Chẩn đoán hình ảnh", exact: true }).waitFor();
    assert.equal(await journey.locator('[data-focus="true"]').count(), 0);
  }
  scenario = "error";
  await home();
  await journey.getByText("Chưa tải được hành trình", { exact: true }).waitFor();
  scenario = "working";
  await journey.getByRole("button", { name: "Thử lại", exact: true }).click();
  await p
    .getByRole("heading", { name: "Đang thực hiện: Chẩn đoán hình ảnh", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  process.stdout.write(
    JSON.stringify({
      passed: true,
      checks: [
        "one shared dossier snapshot",
        "working and waiting room/floor",
        "step details and keyboard",
        "pending not treated as ready",
        "parallel steps",
        "no early return",
        "separate return and re-exam",
        "stale snapshot guard",
        "ended visit guard",
        "error/retry",
        "responsive 320–1440",
        "single-row Patient header 768–1440",
        "actual destination guidance and support disclosure",
        "local nurse illustration loads",
        "notification popup tabs, single/all read, failed-write guard, mobile fit, Escape/outside close",
        "cursor infinite scroll, retry without loops, stale-tab cancellation, end-of-list and bounded responsive popup",
      ],
      output,
    })
  );
} catch (error) {
  console.error(error);
  console.error(log.slice(-1500));
  if (browser)
    for (const context of browser.contexts())
      for (const p of context.pages())
        await p.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  api.close();
}
