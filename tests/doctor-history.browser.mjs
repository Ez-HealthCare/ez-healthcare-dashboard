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
const output = join(tmpdir(), "ez-healthcare-doctor-history");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
const foreignId = "99999999-9999-4999-8999-999999999999";
let status = "IN_EXAMINATION",
  hasVisit = true,
  read = false,
  failHistory = true,
  failDetail = false;
const items = Array.from({ length: 12 }, (_, i) => ({
  visitId: i ? `22222222-2222-4222-8222-${String(i).padStart(12, "0")}` : id,
  createdAt: "2026-11-03T04:00:00Z",
  updatedAt: "2026-11-03T05:00:00Z",
  hallTicketNumber: `A-${i + 1}`,
  clinicTicketNumber: `CL-102-${i + 1}`,
  status: "COMPLETED",
  room: { code: "P.102", name: "Nội tổng quát" },
  doctor: { id: "doctor", name: "Bác sĩ kiểm thử" },
  conclusion: {
    icd10Code: "TEST-E2E",
    icd10Name: "Kết luận mô phỏng",
    signedAt: "2026-11-03T05:00:00Z",
  },
}));
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (data, code = 200) => res.writeHead(code).end(JSON.stringify(data));
  const url = new URL(req.url, "http://fixture");
  if (url.pathname === "/api/auth/me")
    return reply({
      id: "patient",
      role: "DOCTOR",
      email: "patient@fixture.test",
      name: "Nguyễn Minh Anh",
      profileComplete: true,
    });
  if (url.pathname === "/api/visits/doctor/rooms") return reply([]);
  if (url.pathname === "/api/reception-requests/me/current") return reply(null);
  if (url.pathname === "/api/visits/me/current")
    return reply(
      hasVisit
        ? {
            visitId: id,
            status,
            hallTicketNumber: "A-001",
            clinicTicketNumber: "CL-102-01",
            room: { code: "P.102", name: "Nội tổng quát" },
            intakeCompleted: true,
            canPatientReissue: false,
          }
        : null
    );
  if (url.pathname === "/api/notifications/read-all") {
    read = true;
    return reply({ success: true });
  }
  if (url.pathname === "/api/notifications")
    return reply(
      status === "COMPLETED"
        ? [
            {
              id: "33333333-3333-4333-8333-333333333333",
              visitId: id,
              type: "VISIT_COMPLETED",
              title: "Đã hoàn tất khám",
              message: "Bác sĩ đã lưu kết luận và đơn thuốc.",
              createdAt: "2026-11-03T05:00:00Z",
              readAt: read ? "2026-11-03T05:02:00Z" : null,
            },
          ]
        : []
    );
  if (url.pathname === "/api/visits/doctor/history") {
    if (failHistory) return reply({ message: "Lỗi lịch sử mô phỏng" }, 503);
    const page = Number(url.searchParams.get("page") || 1);
    const search = url.searchParams.get("search") || "";
    const date = url.searchParams.get("completedDate");
    const rows = search ? items.filter((item) => item.clinicTicketNumber === search) : items;
    const filtered = date && date !== "2026-11-03" ? [] : rows;
    return reply({
      items: filtered
        .slice((page - 1) * 10, page * 10)
        .map((item) => ({
          ...item,
          patientName: "Nguyễn Minh Anh",
          completedAt: item.updatedAt,
          icd10Code: "TEST-E2E",
          icd10Name: "Kết luận mô phỏng",
        })),
      total: filtered.length,
      page,
      pageSize: 10,
    });
  }
  if (url.pathname === `/api/visits/doctor/history/${foreignId}`)
    return reply({ message: "Bạn không có quyền xem hồ sơ này." }, 403);
  const row = items.find((item) => url.pathname === `/api/visits/doctor/history/${item.visitId}`);
  if (row) {
    if (failDetail) return reply({ message: "Lỗi chi tiết mô phỏng" }, 503);
    return reply({
      ...row,
      patient: { id: "patient", name: "Nguyễn Minh Anh", dateOfBirth: "1990-05-20" },
      currentDepartment: row.room,
      currentDoctor: row.doctor,
      chiefComplaint: "Ca kiểm thử phần mềm",
      prescription: {
        id: "prescription",
        signedAt: "2026-11-03T05:00:00Z",
        doctor: row.doctor,
        icd10Code: "TEST-E2E",
        icd10Name: "Kết luận mô phỏng",
        notes: "Lời dặn kiểm thử\nKhông dùng điều trị",
        revisitDate: "2026-11-27",
        items:
          row.visitId === id
            ? [
                {
                  medicationName: "Thuốc mô phỏng E2E",
                  dosage: "1 đơn vị mô phỏng/lần",
                  route: "ORAL",
                  frequency: "1 lần/ngày",
                  durationDays: 3,
                  quantity: 3,
                  instructions: "Dữ liệu mô phỏng",
                },
              ]
            : [],
      },
      steps: [
        {
          stepId: "step",
          isReExam: true,
          sequenceOrder: 2,
          status: "COMPLETED",
          department: row.room,
        },
      ],
    });
  }
  return reply({ message: "Not found" }, 404);
});
api.listen(0, "127.0.0.1");
await once(api, "listening");
const origin = "http://127.0.0.1:3028";
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3028"],
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
      await fetch(origin);
      break;
    } catch {
      await delay(200);
    }
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "ez_access", value: "valid.DOCTOR", url: origin }]);
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));

  await p.goto(origin + "/dashboard/doctor/history");
  await p.getByText("Không tải được lịch sử khám", { exact: true }).waitFor();
  failHistory = false;
  await p.getByRole("button", { name: "Thử lại", exact: true }).click();
  await p.getByRole("article").first().waitFor();
  assert.equal(await p.getByRole("article").count(), 10);
  assert.equal(await p.locator("header nav a").count(), 3);
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await p.setViewportSize({ width, height: 900 });
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "overflow at " + width
    );
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.screenshot({ path: join(output, "history-desktop.png"), fullPage: true });
  await p.getByRole("textbox", { name: "Tìm trong lịch sử khám" }).fill("CL-102-1");
  await p.getByLabel("Ngày hoàn tất", { exact: true }).fill("2026-11-03");
  await p.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await p.waitForFunction(() => document.querySelectorAll("article").length === 1);
  assert.match(p.url(), /completedDate=2026-11-03/);
  await p.reload();
  await p.getByRole("article").first().waitFor();
  failDetail = true;
  await p.getByRole("article").first().getByRole("link").click();
  await p.getByText("Không mở được hồ sơ", { exact: true }).waitFor();
  failDetail = false;
  await p.getByRole("button", { name: "Thử lại", exact: true }).click();
  await p.getByText("1. Thuốc mô phỏng E2E", { exact: true }).waitFor();
  await p.getByText("3 ngày", { exact: true }).waitFor();
  assert.equal(await p.getByRole("textbox").count(), 0);
  assert.equal(await p.locator('button[type="submit"]').count(), 0);
  await p.reload();
  await p.getByText("1. Thuốc mô phỏng E2E", { exact: true }).waitFor();
  await p.screenshot({ path: join(output, "detail-desktop.png"), fullPage: true });
  await p.setViewportSize({ width: 320, height: 844 });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: join(output, "detail-mobile.png"), fullPage: true });
  await p.getByRole("link", { name: "← Lịch sử khám bệnh", exact: true }).click();
  await p.getByRole("article").first().waitFor();
  assert.match(p.url(), /search=CL-102-1/);
  await p.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await p.waitForFunction(() => document.querySelectorAll("article").length === 10);
  await p.screenshot({ path: join(output, "history-mobile.png"), fullPage: true });
  await p.locator(".ant-pagination-item-2").click();
  await p.waitForFunction(() => document.querySelectorAll("article").length === 2);
  await p.getByRole("article").first().getByRole("link").click();
  await p.getByText("Bác sĩ không kê thuốc cho lượt khám này.", { exact: true }).waitFor();
  await p.goto(origin + "/dashboard/doctor/history?visitId=" + foreignId);
  await p.getByText("Không mở được hồ sơ", { exact: true }).waitFor();
  assert.equal(await p.getByRole("region", { name: "Đơn thuốc đã lưu" }).count(), 0);
  await p.goto(origin + "/dashboard/doctor/history?visitId=invalid");
  await p.getByText("Mã lượt khám không hợp lệ", { exact: true }).waitFor();
  await p.goto(origin + "/dashboard/doctor/history?completedDate=2026-11-04");
  await p.getByText("Không có lượt khám đã hoàn tất phù hợp", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "history without current room",
        "nav",
        "date and search",
        "URL filter persistence",
        "pagination",
        "read-only saved prescription",
        "no medication",
        "error retry",
        "foreign/invalid failure",
        "responsive 320–1440",
      ],
    })
  );
} catch (e) {
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages()) {
        console.error((await p.locator("body").innerText()).slice(-1800));
        await p.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
      }
  throw e;
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  api.close();
}
