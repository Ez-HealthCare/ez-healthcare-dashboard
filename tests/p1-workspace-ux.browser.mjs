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
const repo = fileURLToPath(new URL("..", import.meta.url)),
  output = join(tmpdir(), "ez-healthcare-p1-preview");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111",
  stepId = "33333333-3333-4333-8333-333333333333";
let read = false,
  failRead = true;

const owner = "doctor-fixture";
let status = "IN_EXAMINATION";
const row = () => ({
  visitId: id,
  patientName: "Nguyễn Minh Anh",
  patientId: "22222222-2222-4222-8222-222222222222",
  clinicTicketNumber: "K-014",
  hallTicketNumber: "A-014",
  status,
  currentDoctor: {
    id: owner,
    name: owner === "doctor-fixture" ? "BS. Trần Văn An" : "Dr. John Smith",
  },
  callAttempts: status === "TEMPORARILY_ABSENT" ? 3 : 0,
  isPriority: false,
  chiefComplaint: "Ho kéo dài, sốt nhẹ về chiều",
});
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (d, s = 200) => res.writeHead(s).end(JSON.stringify(d));
  let raw = "";
  for await (const c of req) raw += c;
  const body = raw ? JSON.parse(raw) : {};
  if (req.url === "/api/users/me/profile") {
    if (req.method === "PUT") {
    }
    return reply({
      id: "patient-fixture",
      email: "patient@fixture.test",
      name: "Nguyễn Minh Anh",
      dateOfBirth: "1990-05-20",
      gender: "FEMALE",
      phone: "0901234567",
      nationalId: "070000000001",
      allergies: [],
    });
  }
  if (req.url === "/api/reception-requests/me/current") return reply(null);
  if (req.url === "/api/reception-requests/me/draft") {
    await delay(700);
    return reply({ id: "draft", status: "DRAFT", ...body });
  }
  if (req.url === "/api/visits/me/current") return reply(null);
  if (req.url === "/api/auth/me" && req.headers.cookie?.includes("valid.PATIENT"))
    return reply({
      id: "patient-fixture",
      name: "Nguyễn Minh Anh",
      email: "patient@fixture.test",
      role: "PATIENT",
      profileComplete: true,
    });
  if (req.url === "/api/auth/me")
    return reply({
      id: "doctor-fixture",
      name: "BS. Trần Văn An",
      email: "doctor@fixture.test",
      role: "DOCTOR",
      profileComplete: true,
    });
  if (req.url === "/api/notifications/read-all") {
    if (failRead) return reply({ message: "Thử nghiệm lỗi đánh dấu" }, 503);
    read = true;
    return reply({ success: true });
  }
  if (req.url === "/api/notifications")
    return reply([
      {
        id: "notice1",
        visitId: id,
        type: "PATIENT_RETURN_REPORTED",
        title: "Người bệnh đã quay lại",
        message: "Mở đúng lượt cần xử lý",
        createdAt: "2026-11-02T02:00:00Z",
        readAt: read ? "2026-11-02T03:00:00Z" : undefined,
      },
      {
        id: "notice2",
        visitId: "77777777-7777-4777-8777-777777777777",
        type: "VISIT_CHANGED",
        title: "Lượt cũ đã hoàn tất",
        message: "Không chọn thay hồ sơ",
        createdAt: "2026-11-02T01:00:00Z",
        readAt: read ? "2026-11-02T03:00:00Z" : undefined,
      },
    ]);
  if (req.url === "/api/visits/doctor/rooms")
    return reply([{ code: "P.105", name: "Hô hấp", shiftType: "MORNING" }]);
  if (req.url === "/api/departments")
    return reply([
      { code: "P.105", name: "Hô hấp", roomType: "CONSULTATION" },
      { code: "P.108", name: "Tiêu hóa", roomType: "CONSULTATION" },
    ]);
  if (req.url === "/api/visits/queue/P.105")
    return reply({
      departmentCode: "P.105",
      departmentName: "Hô hấp",
      queueLength: 2,
      queue: [
        row(),
        {
          ...row(),
          visitId: "55555555-5555-4555-8555-555555555555",
          patientName: "Người bệnh đang chờ",
          status: "CLINIC_WAITING",
          currentDoctor: null,
        },
      ],
    });
  if (req.url === `/api/visits/${id}`)
    return reply({
      ...row(),
      patient: {
        id: row().patientId,
        name: row().patientName,
        dateOfBirth: "1990-05-20",
        gender: "FEMALE",
        allergies: ["Penicillin"],
      },
      vital: {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 78,
        temperature: 37.2,
        spo2: 98,
        respiratoryRate: 18,
      },
      steps: [
        {
          stepId,
          sequenceOrder: 1,
          status: "COMPLETED",
          isReExam: false,
          department: { code: "P.201", name: "Huyết học", roomType: "LABORATORY" },
        },
      ],
    });
  if (req.url === `/api/paraclinical/${stepId}/result`)
    return reply({
      resultId: "result1",
      stepId,
      serviceName: "Huyết học",
      quantitativeValues: { WBC: { value: 7.2, unit: "G/L", reference: "4–10" } },
      findings: "Chưa ghi nhận bất thường",
      isPanicValue: false,
      approvedAt: "2026-10-31T02:00:00Z",
      technician: { id: "tech1", name: "KTV Nguyễn Hà" },
    });
  if (req.url?.endsWith("/requeue")) {
    assert.match(body.reason, /quay lại/);
    status = "CLINIC_WAITING";
    return reply({ visitId: id, status }, 201);
  }
  if (req.url?.endsWith("/orders")) {
    return reply({ sortedOrder: body.orders, isStatEmergency: false });
  }
  if (req.url?.endsWith("/transfer")) {
    return reply({ success: true });
  }
  if (req.url?.endsWith("/conclusion")) {
    return reply({ success: true });
  }
  return reply({ message: "Fixture route not found" }, 404);
});
api.listen(0, "127.0.0.1");
await once(api, "listening");
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3025"],
  {
    cwd: repo,
    env: {
      ...process.env,
      API_URL: `http://127.0.0.1:${api.address().port}/api`,
      APP_ORIGIN: "http://127.0.0.1:3025",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let log = "",
  browser;
web.stdout.on("data", (c) => (log += c));
web.stderr.on("data", (c) => (log += c));
try {
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw Error(log);
    try {
      await fetch("http://127.0.0.1:3025");
      break;
    } catch {
      await delay(200);
    }
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addCookies([
    { name: "ez_access", value: "valid.DOCTOR", url: "http://127.0.0.1:3025" },
  ]);
  const d = await context.newPage();
  d.on("pageerror", (e) => errors.push(e.message));
  await d.goto("http://127.0.0.1:3025/dashboard/doctor");
  await d.getByText("120/80", { exact: true }).first().waitFor();
  await d.getByRole("button", { name: /^Thông báo/ }).click();
  await d.getByRole("dialog", { name: "Thông báo", exact: true }).waitFor();
  await d.keyboard.press("Escape");
  await d.waitForFunction(
    () =>
      document.querySelector('button[aria-haspopup="dialog"]').getAttribute("aria-expanded") ===
      "false"
  );
  await d.getByRole("button", { name: /^Thông báo/ }).click();
  await d.getByRole("link", { name: "Xem lượt khám liên quan" }).first().waitFor();
  await d.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }).click();
  await d.getByText("Chưa đánh dấu được thông báo", { exact: true }).waitFor();
  failRead = false;
  await d.getByRole("button", { name: /Đánh dấu tất cả/ }).click();
  await d
    .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
    .waitFor({ state: "visible" });
  await d.waitForFunction(() => document.querySelector('button[aria-label="Thông báo"]'));
  await d.getByRole("link", { name: "Xem lượt khám liên quan" }).last().click();
  await d
    .getByText("Lượt được nhắc đến không còn trong hàng đợi phòng này", { exact: true })
    .waitFor();
  assert.equal(await d.getByText("120/80", { exact: true }).count(), 0);
  await d.getByRole("button", { name: /^Thông báo/ }).click();
  const link = d.getByRole("link", { name: "Xem lượt khám liên quan" }).first();
  await link.focus();
  await d.keyboard.press("Enter");
  await d.getByText("120/80", { exact: true }).first().waitFor();
  assert.ok(d.url().includes(id));
  await d.setViewportSize({ width: 390, height: 844 });
  await d.getByRole("button", { name: "Hồ sơ đang chọn", exact: true }).waitFor();
  assert.equal(await d.locator("#doctor-queue").isVisible(), false);
  assert.equal(await d.locator("#doctor-record").isVisible(), true);
  await d.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).click();
  await d
    .getByPlaceholder("Nhập ghi nhận khám bệnh…")
    .first()
    .fill("Ghi chép còn nguyên trên mobile");
  await d.getByRole("button", { name: "← Bàn khám", exact: true }).click();
  await d.getByRole("button", { name: /^Hàng đợi \(/ }).click();
  assert.equal(await d.locator("#doctor-record").isVisible(), false);
  await d.getByRole("button", { name: "Hồ sơ đang chọn", exact: true }).click();
  await d.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).click();
  assert.equal(
    await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().inputValue(),
    "Ghi chép còn nguyên trên mobile"
  );
  await d.getByRole("button", { name: "← Bàn khám", exact: true }).click();
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await d.setViewportSize({ width, height: 900 });
    await d.waitForTimeout(100);
    assert.ok(
      await d.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "overflow at " + width
    );
    if (width < 1024) {
      const box = await d
        .getByRole("button", { name: "Hồ sơ đang chọn", exact: true })
        .boundingBox();
      assert.ok(box.height >= 44);
    }
  }
  await d.setViewportSize({ width: 390, height: 844 });
  const pairs = await d.locator("#doctor-record").evaluate((root) => {
    const small = root.querySelector('[class*="vitals"] small');
    const tag = root.querySelector(".ant-tag-cyan");
    return [
      small && [
        getComputedStyle(small).color,
        getComputedStyle(small.parentElement).backgroundColor,
      ],
      tag && [getComputedStyle(tag).color, getComputedStyle(tag).backgroundColor],
    ].filter(Boolean);
  });
  const lum = (rgb) => {
    const c = rgb
      .match(/[0-9.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((x) => x / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return c.reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
  };
  for (const [fg, bg] of pairs) {
    const l = [lum(fg), lum(bg)].sort((a, b) => a - b);
    assert.ok((l[1] + 0.05) / (l[0] + 0.05) >= 4.5, "text contrast " + fg + " / " + bg);
  }
  await d.screenshot({ path: output + "/doctor-mobile.png", fullPage: true });
  const patientContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await patientContext.addCookies([
    { name: "ez_access", value: "valid.PATIENT", url: "http://127.0.0.1:3025" },
  ]);
  const p = await patientContext.newPage();
  await p.goto("http://127.0.0.1:3025/dashboard/patient/profile");
  await p.getByLabel("Họ và tên", { exact: true }).waitFor();
  assert.ok(
    await p
      .getByLabel("Họ và tên", { exact: true })
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16)
  );
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: output + "/patient-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.error(
    JSON.stringify({
      passed: true,
      checks: [
        "notification error/retry/read",
        "keyboard notification link",
        "missing visit never selects substitute",
        "correct visit deep link",
        "mobile queue/record switch retains notes",
        "320–1440 no overflow",
        "44px pane switch",
        "16px patient input",
      ],
    })
  );
} catch (e) {
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages()) {
        console.error((await p.locator("body").innerText()).slice(-2200));
        await p
          .screenshot({ path: output + "/failure-" + Date.now() + ".png", fullPage: true })
          .catch(() => {});
      }
  throw e;
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  api.close();
}
