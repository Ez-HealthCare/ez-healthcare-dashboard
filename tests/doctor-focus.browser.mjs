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
const output = process.env.DOCTOR_FOCUS_OUTPUT || join(tmpdir(), "ez-healthcare-doctor-focus");
await mkdir(output, { recursive: true });
const rows = [
  {
    visitId: "11111111-1111-4111-8111-111111111111",
    patientName: "Sophia Le",
    status: "IN_EXAMINATION",
    clinicTicketNumber: "CL-109-03",
    hallTicketNumber: "A-003",
    chiefComplaint: "Đau vùng thượng vị",
    currentDoctor: { id: "doctor", name: "Bác sĩ Nguyễn Minh" },
  },
  {
    visitId: "22222222-2222-4222-8222-222222222222",
    patientName: "James Pham",
    status: "PARACLINICAL_PENDING",
    clinicTicketNumber: "CL-109-04",
    hallTicketNumber: "A-004",
    chiefComplaint: "Sốt và đau bụng cần làm xét nghiệm",
    currentDoctor: { id: "doctor", name: "Bác sĩ Nguyễn Minh" },
  },
].map((r) => ({
  ...r,
  callAttempts: 0,
  isPriority: false,
  vitals: { bp: "120/80", hr: 78, spo2: 98, temp: 36.8 },
}));
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (data) => res.end(JSON.stringify(data));
  const path = new URL(req.url, "http://fixture").pathname;
  if (path === "/api/auth/me")
    return reply({
      id: "doctor",
      role: "DOCTOR",
      name: "Bác sĩ Nguyễn Minh",
      email: "doctor@fixture.test",
      profileComplete: true,
    });
  if (path === "/api/visits/doctor/rooms")
    return reply([{ code: "P.109", name: "Nội tổng quát", shiftType: "MORNING" }]);
  if (path.startsWith("/api/visits/queue/")) return reply({ queue: rows });
  if (path === "/api/notifications" || path === "/api/departments") return reply([]);
  const row = rows.find((r) => path.includes(r.visitId));
  if (row)
    return reply({
      ...row,
      patient: {
        id: "patient",
        name: row.patientName,
        dateOfBirth: "1990-05-20",
        allergies: ["Penicillin"],
      },
      vital: {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 78,
        spo2: 98,
        temperature: 36.8,
      },
      steps: [],
    });
  res.statusCode = 404;
  return reply({ message: "Not found" });
});
api.listen(0, "127.0.0.1");
await once(api, "listening");
const reserve = createServer();
reserve.listen(0, "127.0.0.1");
await once(reserve, "listening");
const port = reserve.address().port;
await new Promise((r) => reserve.close(r));
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
web.stdout.on("data", (c) => (log += c));
web.stderr.on("data", (c) => (log += c));

try {
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await delay(200);
  }
  browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([{ name: "ez_access", value: "valid.DOCTOR", url: origin }]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + "/dashboard/doctor");
    await page.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).waitFor();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "overflow " + width
    );
    assert.equal(
      await page.getByRole("button", { name: "Tiếp nhận khám", exact: true }).count(),
      0
    );
    assert.equal(await page.getByRole("button", { name: "Gọi (0/3)", exact: true }).count(), 0);
    if (width >= 1024) {
      const record = await page.locator('[aria-label="Hồ sơ khám bệnh"]').boundingBox();
      const support = await page
        .getByRole("heading", { name: "Theo dõi cận lâm sàng" })
        .boundingBox();
      assert.ok(support.y - record.y - record.height < 90, "large gap");
    }
    await page.screenshot({ path: join(output, `doctor-focus-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).click();
  await page.getByText("Ghi chép khám bệnh lâm sàng của Bác sĩ", { exact: true }).waitFor();
  await page.goto(origin + "/dashboard/doctor?view=orders");
  await page.getByRole("heading", { name: "Danh mục dịch vụ cận lâm sàng", exact: true }).waitFor();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "orders overflow " + width
    );
    await page.screenshot({ path: join(output, `doctor-orders-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByPlaceholder("Nhập chẩn đoán sơ bộ").fill("Đau thượng vị cần đánh giá");
  await page.getByRole("checkbox").first().check();
  const summary = page
    .locator("aside")
    .filter({ has: page.getByRole("heading", { name: /Chỉ định đang tạo/ }) });
  await summary.getByRole("button", { name: "Xác nhận gửi chỉ định", exact: true }).click();
  await page.getByRole("dialog", { name: "Xác nhận chỉ định cận lâm sàng" }).waitFor();
  await page.getByRole("button", { name: "Quay lại chỉnh sửa", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Xác nhận chỉ định cận lâm sàng" })
    .waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Tạo chỉ định cận lâm sàng", exact: true }).click();
  await page.screenshot({ path: join(output, "doctor-orders-selected.png"), fullPage: true });
  assert.deepEqual(errors, []);
  process.stdout.write(
    JSON.stringify({
      passed: true,
      widths: [1440, 1280, 1024, 768, 390, 320],
      checks: [
        "no overflow",
        "no irrelevant call/receive buttons",
        "CLS follows record without large gap",
        "primary opens clinical record",
      ],
      output,
    })
  );
} catch (error) {
  console.error(error);
  console.error(log.slice(-1500));
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages())
        await p.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  api.close();
}
