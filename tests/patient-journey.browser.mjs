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
  if (path === "/api/notifications") return reply([]);
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
  await home();
  await p
    .getByRole("heading", { name: "Đang thực hiện: Chẩn đoán hình ảnh", exact: true })
    .waitFor();
  assert.equal(reads, 1, "Overview and timeline share one dossier request");
  assert.ok(await overview.getByText("Tầng 3", { exact: true }).isVisible());
  assert.equal(await journey.locator('[data-focus="true"]').count(), 1);
  await overview.getByRole("link", { name: "Xem bước cần theo dõi", exact: true }).click();
  const imagingToggle = journey.getByRole("button", { name: "Chẩn đoán hình ảnh", exact: true });
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
  await overview.getByRole("link", { name: "Xem bước cần theo dõi", exact: true }).click();
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
