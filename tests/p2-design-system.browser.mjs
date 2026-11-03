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
  output = join(tmpdir(), "ez-healthcare-p2-preview");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111",
  stepId = "33333333-3333-4333-8333-333333333333";
let read = false;
const failRead = true;

const owner = "doctor-fixture";
let status = "IN_EXAMINATION";
let emptyQueue = false;
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
      name: "BS. Nguyễn Minh An · Nội tổng quát",
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
    return reply([
      {
        code: "P.105",
        name: "General Internal Medicine Clinic · Nội tổng quát",
        shiftType: "MORNING",
      },
    ]);
  if (req.url === "/api/departments")
    return reply([
      { code: "P.105", name: "Hô hấp", roomType: "CONSULTATION" },
      { code: "P.108", name: "Tiêu hóa", roomType: "CONSULTATION" },
    ]);
  if (req.url === "/api/visits/queue/P.105")
    return reply({
      departmentCode: "P.105",
      departmentName: "Hô hấp",
      queueLength: emptyQueue ? 0 : 2,
      queue: emptyQueue
        ? []
        : [
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
  if (req.url?.endsWith("/start-exam")) {
    status = "IN_EXAMINATION";
    return reply({ visitId: id, status }, 201);
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
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3026"],
  {
    cwd: repo,
    env: {
      ...process.env,
      API_URL: `http://127.0.0.1:${api.address().port}/api`,
      APP_ORIGIN: "http://127.0.0.1:3026",
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
      await fetch("http://127.0.0.1:3026");
      break;
    } catch {
      await delay(200);
    }
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    fontRequests = [];
  const make = async (role) => {
    const c = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "America/Los_Angeles",
      reducedMotion: "reduce",
    });
    await c.addCookies([
      { name: "ez_access", value: "valid." + role, url: "http://127.0.0.1:3026" },
    ]);
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.resourceType() === "font") fontRequests.push(r.url());
    });
    return p;
  };
  const d = await make("DOCTOR");
  await d.goto("http://127.0.0.1:3026/dashboard/doctor");
  await d.getByText("120/80", { exact: true }).first().waitFor();
  await d.evaluate(() => document.fonts.ready);
  const cdp = await d.context().newCDPSession(d);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root: dom } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "h1" });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  assert.ok(fonts.length);
  assert.ok(
    fonts.every((f) => f.isCustomFont && /Be Vietnam Pro/i.test(f.familyName)),
    JSON.stringify(fonts)
  );
  assert.ok(fontRequests.length);
  assert.ok(fontRequests.every((url) => url.startsWith("http://127.0.0.1:3026/")));
  assert.equal(await d.getByText("Nguyễn Minh Anh", { exact: true }).count(), 2);
  assert.equal(await d.getByText("Tác vụ nhanh", { exact: true }).count(), 0);
  assert.equal(await d.locator("#doctor-metrics > div").count(), 4);
  await d.getByText("Ngày sinh: 20/05/1990", { exact: false }).waitFor();
  await d.getByText("Ca sáng", { exact: false }).waitFor();
  const detail = d.locator("#doctor-record .record-identifier").first();
  assert.equal(await detail.getByText(id, { exact: true }).isVisible(), false);
  await detail.locator("summary").click();
  await detail.getByText(id, { exact: true }).waitFor();
  await d.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await detail.locator(".ant-typography-copy").click();
  assert.equal(await d.evaluate(() => navigator.clipboard.readText()), id);
  await detail.locator("summary").click();
  const geometry = async (page) =>
    page.locator('[data-layout="container"]').evaluateAll((es) =>
      es.map((e) => {
        const b = e.getBoundingClientRect(),
          s = getComputedStyle(e);
        return { part: e.dataset.part, x: b.x, width: b.width, padding: parseFloat(s.paddingLeft) };
      })
    );
  const desktop = await geometry(d);
  const headerNav = await d.locator("header nav").boundingBox();
  const headerProfile = await d
    .getByRole("button", { name: "Tài khoản của tôi", exact: true })
    .boundingBox();
  assert.ok(
    Math.abs(headerNav.y + headerNav.height / 2 - headerProfile.y - headerProfile.height / 2) < 3,
    "Doctor header stays on one desktop row with a long room name"
  );
  await d.locator("header").screenshot({ path: output + "/doctor-header-desktop.png" });
  assert.equal(desktop.length, 3);
  for (const b of desktop) {
    assert.equal(Math.round(b.width), 1340);
    assert.equal(b.padding, 24);
    assert.equal(Math.round(b.x), 50);
  }
  const p = await make("PATIENT");
  await p.goto("http://127.0.0.1:3026/dashboard/patient/profile");
  await p.getByLabel("Họ và tên", { exact: true }).waitFor();
  await p.evaluate(() => document.fonts.ready);
  const patientCdp = await p.context().newCDPSession(p);
  await patientCdp.send("DOM.enable");
  await patientCdp.send("CSS.enable");
  const patientDom = await patientCdp.send("DOM.getDocument");
  const patientHeading = await patientCdp.send("DOM.querySelector", {
    nodeId: patientDom.root.nodeId,
    selector: "h1",
  });
  const patientFonts = await patientCdp.send("CSS.getPlatformFontsForNode", {
    nodeId: patientHeading.nodeId,
  });
  assert.ok(
    patientFonts.fonts.length &&
      patientFonts.fonts.every(
        (font) => font.isCustomFont && /Be Vietnam Pro/i.test(font.familyName)
      )
  );
  await p.getByText("Ngày đã chọn: 20/05/1990", { exact: true }).waitFor();
  const patientGeometry = await geometry(p);
  assert.deepEqual(patientGeometry, desktop);
  for (const page of [d, p])
    for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(80);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        "overflow " + page.url() + " " + width
      );
      const g = await geometry(page);
      if (page === d && width >= 1280) {
        assert.ok(
          (await d.locator("header").boundingBox()).height <= 100,
          "long room label must not wrap the desktop header"
        );
      }
      for (const b of g) {
        assert.equal(Math.round(b.width), Math.min(width, 1340));
        assert.equal(b.padding, width < 768 ? 16 : 24);
      }
    }
  await d.setViewportSize({ width: 1440, height: 1000 });
  await d.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).click();
  await d
    .getByRole("navigation", { name: "Các bước khám bệnh" })
    .getByRole("button", { name: "Kết quả CLS", exact: true })
    .click();
  await d.getByText("Thời gian duyệt: 09:00 · 31/10/2026", { exact: false }).waitFor();
  await d.screenshot({ path: output + "/doctor-desktop.png", fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: output + "/patient-mobile.png", fullPage: true });
  await d.setViewportSize({ width: 1440, height: 1000 });
  emptyQueue = true;
  await d.reload();
  await d.getByText("Chưa có bệnh nhân trong phòng khám", { exact: true }).waitFor();
  const count = d.locator("#doctor-queue").getByLabel("0 người bệnh", { exact: true });
  assert.ok((await count.boundingBox()).height <= 30, "queue count stays on one line");
  const filterBoxes = await d
    .getByRole("group", { name: "Lọc hàng đợi", exact: true })
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          clipped: button.scrollWidth > button.clientWidth,
        };
      })
    );
  assert.equal(filterBoxes.length, 4);
  assert.equal(filterBoxes[0].y, filterBoxes[1].y);
  assert.equal(filterBoxes[2].y, filterBoxes[3].y);
  assert.ok(filterBoxes[2].y > filterBoxes[0].y);
  assert.ok(filterBoxes.every((box) => !box.clipped));
  await d.screenshot({ path: output + "/doctor-dashboard-empty.png", fullPage: true });
  emptyQueue = false;
  status = "PARACLINICAL_PENDING";
  await d.reload();
  await d.getByRole("heading", { name: "Kết quả CLS", exact: true }).waitFor();
  await d
    .locator("#doctor-queue")
    .getByRole("button", { name: /Nguyễn Minh Anh/ })
    .click();
  await d.getByText("Ngày sinh: 20/05/1990", { exact: false }).waitFor();
  assert.equal(await d.getByText("Không tải được hồ sơ lượt khám", { exact: true }).count(), 0);
  assert.ok((await d.locator("#doctor-record").boundingBox()).width >= 480);
  await d.screenshot({ path: output + "/doctor-dashboard-results.png", fullPage: true });
  const doctorNav = d.locator("header nav");
  assert.deepEqual(await doctorNav.getByRole("link").allTextContents(), [
    "Bàn khám",
    "Kết quả CLS",
    "Lịch sử khám bệnh",
  ]);
  await doctorNav.getByRole("link", { name: "Kết quả CLS", exact: true }).click();
  await d.waitForURL("**/dashboard/doctor/results");
  await d.getByRole("heading", { name: "Theo dõi CLS", exact: true }).waitFor();
  assert.equal(await d.locator("#doctor-queue article").count(), 1);
  assert.equal(
    await d.locator("#doctor-queue").getByText("Người bệnh đang chờ", { exact: true }).count(),
    0
  );
  assert.equal(
    await d
      .locator("#doctor-queue")
      .getByRole("button", { name: /^Gọi \(/ })
      .count(),
    0
  );
  await d.screenshot({ path: output + "/doctor-results-worklist.png", fullPage: true });
  for (const width of [320, 390, 768, 1024, 1280]) {
    await d.setViewportSize({ width, height: 900 });
    assert.ok(
      await d.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `CLS worklist overflow at ${width}`
    );
  }
  await d.setViewportSize({ width: 1440, height: 1000 });
  status = "RE_EXAM_CALLING";
  await d.reload();
  await d.getByRole("button", { name: "Tiếp nhận tái khám", exact: true }).click();
  await d.waitForURL(`**/dashboard/doctor?visitId=${id}&view=clinical`);
  await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().waitFor();
  assert.equal(
    await doctorNav
      .getByRole("link", { name: "Bàn khám", exact: true })
      .getAttribute("aria-current"),
    "page"
  );
  await doctorNav.getByRole("link", { name: "Kết quả CLS", exact: true }).click();
  await d.getByText("Chưa có lượt chờ hoặc có kết quả CLS", { exact: true }).waitFor();
  assert.equal(await d.locator("#doctor-queue article").count(), 0);
  assert.deepEqual(errors, []);
  console.error(
    JSON.stringify({
      passed: true,
      checks: [
        "local Be Vietnam Pro renders Vietnamese glyphs",
        "no external font requests",
        "collapsed full ID and copy",
        "aligned 1340px shells",
        "mobile 16px and desktop 24px gutters",
        "320–1920 no overflow",
        "DOB and timestamps independent of browser timezone",
        "four metrics and no duplicate quick actions",
        "three Doctor navigation entries",
        "CLS worklist excludes routine consultations and returns re-examination to the correct visit",
        "empty CLS worklist never substitutes another visit",
      ],
    })
  );
} catch (e) {
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages()) {
        console.error((await p.locator("body").innerText()).slice(-1800));
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
