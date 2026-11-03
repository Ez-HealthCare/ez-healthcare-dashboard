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
const output = join(tmpdir(), "ez-healthcare-patient-records");
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
      role: "PATIENT",
      email: "patient@fixture.test",
      name: "Nguyễn Minh Anh",
      profileComplete: true,
    });
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
  if (url.pathname === "/api/visits/me/history") {
    if (failHistory) return reply({ message: "Lỗi lịch sử mô phỏng" }, 503);
    const page = Number(url.searchParams.get("page") || 1);
    return reply({ items: items.slice((page - 1) * 10, page * 10), total: 12, page, pageSize: 10 });
  }
  if (url.pathname === `/api/visits/${foreignId}`)
    return reply({ message: "Bạn không có quyền xem hồ sơ này." }, 403);
  const row = items.find((item) => url.pathname === `/api/visits/${item.visitId}`);
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
const origin = "http://127.0.0.1:3027";
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3027"],
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
  await context.addCookies([{ name: "ez_access", value: "valid.PATIENT", url: origin }]);
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(origin + "/dashboard/patient");
  await p.getByText("Đang khám", { exact: true }).waitFor();
  for (const next of ["PARACLINICAL_PENDING", "RE_EXAM_CALLING", "COMPLETED"]) {
    status = next;
    await p.reload();
    await p
      .getByText(
        {
          PARACLINICAL_PENDING: "Chờ kết quả CLS",
          RE_EXAM_CALLING: "Có kết quả · Chờ tái khám",
          COMPLETED: "Đã hoàn tất khám",
        }[next],
        { exact: true }
      )
      .first()
      .waitFor();
  }
  await p.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).click();
  await p.getByText("Đã hoàn tất khám · Đã đọc", { exact: true }).waitFor();
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: join(output, "patient-home-desktop.png"), fullPage: true });
  await p.reload();
  await p.getByText("Đã hoàn tất khám · Đã đọc", { exact: true }).waitFor();
  failDetail = true;
  await p
    .locator("#notifications")
    .getByRole("link", { name: "Xem kết luận & Đơn thuốc", exact: true })
    .click();
  await p.waitForURL(`**/records?visitId=${id}`);
  assert.match(p.url(), new RegExp(`records\\?visitId=${id}`));
  await p.getByText("Không mở được hồ sơ", { exact: true }).waitFor();
  failDetail = false;
  await p.getByRole("button", { name: "Thử lại", exact: true }).click();
  await p
    .getByRole("region", { name: "Đơn thuốc đã lưu", exact: true })
    .getByText("1. Thuốc mô phỏng E2E", { exact: true })
    .waitFor();
  await p.getByText("3 ngày", { exact: true }).waitFor();
  assert.equal(await p.locator("h1").count(), 1);
  assert.equal(await p.getByRole("heading", { name: /Xin chào/ }).count(), 0);
  await p.getByText("27/11/2026", { exact: true }).waitFor();
  await p.screenshot({ path: join(output, "record-desktop.png"), fullPage: true });
  for (const width of [390, 320]) {
    await p.setViewportSize({ width, height: 844 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await p.screenshot({ path: join(output, `record-${width}.png`), fullPage: true });
  }
  await p.reload();
  await p.getByText("1. Thuốc mô phỏng E2E", { exact: true }).waitFor();
  await p.getByRole("link", { name: "← Hồ sơ khám bệnh", exact: true }).click();
  await p.getByText("Không tải được lịch sử khám", { exact: true }).waitFor();
  failHistory = false;
  await p.getByRole("button", { name: "Thử lại", exact: true }).click();
  await p.getByRole("article").first().waitFor();
  await p.screenshot({ path: join(output, "patient-history-mobile.png"), fullPage: true });
  assert.equal(await p.getByRole("article").count(), 10);
  await p.locator(".ant-pagination-item-2").click();
  await p.waitForFunction(() => document.querySelectorAll("article").length === 2);
  await p.getByRole("article").first().getByRole("link").click();
  await p.getByText("Bác sĩ không kê thuốc cho lượt khám này.", { exact: true }).waitFor();
  await p.goto(origin + `/dashboard/patient/records?visitId=${foreignId}`);
  await p.getByText("Không mở được hồ sơ", { exact: true }).waitFor();
  assert.equal(await p.getByRole("region", { name: "Đơn thuốc đã lưu", exact: true }).count(), 0);
  await p.goto(origin + "/dashboard/patient/records?visitId=invalid");
  await p.getByText("Mã lượt khám không hợp lệ", { exact: true }).waitFor();
  hasVisit = false;
  await p.goto(origin + "/dashboard/patient");
  await p.getByRole("button", { name: "Tạo yêu cầu tiếp nhận", exact: true }).waitFor();
  assert.equal(
    await p.getByRole("button", { name: "Tạo yêu cầu tiếp nhận", exact: true }).isEnabled(),
    true
  );
  for (const width of [320, 390, 768, 1024, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `home overflow at ${width}`
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "full status labels",
        "completed dashboard notification and exact visit link",
        "read state survives reload",
        "saved prescription survives reload",
        "history pagination and error retry",
        "detail error retry",
        "no-medication conclusion",
        "foreign and invalid records fail closed",
        "responsive 320/390",
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
