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
  output = join(tmpdir(), "ez-healthcare-p0-preview");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111",
  stepId = "33333333-3333-4333-8333-333333333333";
let profileSaves = 0,
  draftSaves = 0,
  failProfile = true;
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
      profileSaves++;
      await delay(700);
      if (failProfile) return reply({ message: "Không lưu được hồ sơ thử nghiệm" }, 503);
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
    draftSaves++;
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
  if (req.url === "/api/notifications") return reply([]);
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
    status = "PARACLINICAL_PENDING";
    return reply({ sortedOrder: body.orders, isStatEmergency: false });
  }
  if (req.url?.endsWith("/start-exam")) {
    status = "IN_EXAMINATION";
    return reply({ visitId: id, status });
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
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3024"],
  {
    cwd: repo,
    env: {
      ...process.env,
      API_URL: `http://127.0.0.1:${api.address().port}/api`,
      APP_ORIGIN: "http://127.0.0.1:3024",
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
      await fetch("http://127.0.0.1:3024");
      break;
    } catch {
      await delay(200);
    }
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const make = async (role) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await c.addCookies([
      { name: "ez_access", value: "valid." + role, url: "http://127.0.0.1:3024" },
    ]);
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  };
  const p = await make("PATIENT");
  await p.goto("http://127.0.0.1:3024/dashboard/patient/profile");
  await p.getByLabel("Họ và tên", { exact: true }).fill("Tên mới đang nhập");
  p.once("dialog", (d) => d.dismiss());
  await p.getByRole("navigation").getByRole("link", { name: "Trang chủ", exact: true }).click();
  assert.match(p.url(), /profile$/);
  assert.equal(await p.getByLabel("Họ và tên", { exact: true }).inputValue(), "Tên mới đang nhập");
  await p.getByRole("button", { name: "Lưu thông tin", exact: true }).evaluate((b) => {
    b.click();
    b.click();
    b.click();
  });
  await p.getByText("Chưa lưu được thông tin", { exact: true }).waitFor();
  assert.equal(profileSaves, 1);
  assert.equal(await p.getByLabel("Họ và tên", { exact: true }).inputValue(), "Tên mới đang nhập");
  failProfile = false;
  await p.getByRole("button", { name: "Lưu thông tin", exact: true }).click();
  await p.waitForURL("**/dashboard/patient");
  assert.equal(profileSaves, 2);
  await p.goto("http://127.0.0.1:3024/dashboard/patient/reception-request");
  await p.getByLabel("Lý do đến khám", { exact: true }).fill("Đau đầu");
  await p.getByRole("button", { name: "Lưu nháp", exact: true }).evaluate((b) => {
    b.click();
    b.click();
    b.click();
  });
  await p.waitForURL("**/dashboard/patient");
  assert.equal(draftSaves, 1);
  const d = await make("DOCTOR");
  await d.goto("http://127.0.0.1:3024/dashboard/doctor/consultation");
  await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().fill("Ghi chép cần giữ");
  d.once("dialog", (x) => x.dismiss());
  await d.locator("header nav").getByRole("link", { name: "Kết quả CLS", exact: true }).click();
  assert.match(d.url(), /dashboard\/doctor\?view=clinical$/);
  assert.equal(
    await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().inputValue(),
    "Ghi chép cần giữ"
  );
  const tab = (n) =>
    d
      .getByRole("navigation", { name: "Các bước khám bệnh" })
      .getByRole("button", { name: n, exact: true });
  await tab("Chỉ định CLS").click();
  await tab("Khám lâm sàng").click();
  assert.equal(
    await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().inputValue(),
    "Ghi chép cần giữ"
  );
  await d.getByRole("button", { name: "← Bàn khám", exact: true }).click();
  d.once("dialog", (x) => x.dismiss());
  await d
    .getByRole("article")
    .filter({ hasText: "Người bệnh đang chờ" })
    .getByRole("button", { name: /Người bệnh đang chờ/ })
    .click();
  assert.equal(
    await d.getByRole("button", { name: /Người bệnh đang chờ/ }).getAttribute("aria-pressed"),
    "false"
  );
  await d.getByRole("button", { name: "Mở hồ sơ khám bệnh", exact: true }).click();
  assert.equal(
    await d.getByPlaceholder("Nhập ghi nhận khám bệnh…").first().inputValue(),
    "Ghi chép cần giữ"
  );
  await d.screenshot({ path: output + "/doctor-unsaved.png", fullPage: true });
  await tab("Chỉ định CLS").click();
  const diagnosis = d.getByPlaceholder("Nhập chẩn đoán sơ bộ", { exact: true });
  await diagnosis.fill("Chỉ định kiểm thử");
  await d.locator('input[type="checkbox"]').first().check();
  await tab("Kết luận & Kê đơn").click();
  await tab("Chỉ định CLS").click();
  assert.equal(await diagnosis.inputValue(), "Chỉ định kiểm thử");
  assert.equal(await diagnosis.isEnabled(), true);

  assert.equal(await d.locator('input[type="checkbox"]').first().isChecked(), true);
  await d.getByRole("button", { name: "Xác nhận gửi chỉ định", exact: true }).click();
  await d.getByRole("dialog").getByRole("button", { name: "Gửi chỉ định", exact: true }).click();
  await d.getByText("Đã gửi chỉ định · Đang chờ kết quả CLS", { exact: true }).waitFor();
  assert.equal(await d.getByText("Có nội dung chưa lưu", { exact: true }).count(), 0);
  await tab("Chỉ định CLS").click();
  assert.equal(await diagnosis.isDisabled(), true);
  assert.equal(await diagnosis.inputValue(), "");
  await d.getByRole("button", { name: "Theo dõi kết quả CLS", exact: true }).click();
  status = "RE_EXAM_CALLING";
  await d.getByText("Đã có kết quả · Chờ tiếp nhận tái khám", { exact: true }).waitFor();
  await d.getByRole("button", { name: "Tiếp nhận tái khám", exact: true }).click();
  await tab("Chỉ định CLS").click();
  await diagnosis.waitFor();
  await d.waitForFunction(
    () => document.querySelector('[placeholder="Nhập chẩn đoán sơ bộ"]')?.disabled === false
  );
  assert.equal(await diagnosis.isEnabled(), true);
  await tab("Kết luận & Kê đơn").click();
  await d.getByLabel("Mã ICD-10", { exact: true }).fill("TEST-E2E");
  await d.getByLabel("Tên chẩn đoán", { exact: true }).fill("Chẩn đoán mô phỏng E2E");
  await d.getByRole("button", { name: "Xem lại & Hoàn tất khám", exact: true }).click();
  const review = d.getByRole("dialog", { name: "Xem lại kết luận & Đơn thuốc" });
  await review.getByText("Không kê thuốc cho lượt khám này.", { exact: true }).waitFor();
  await review.getByRole("button", { name: "Quay lại chỉnh sửa" }).click();
  await d.getByRole("button", { name: "Thêm thuốc", exact: false }).click();
  await d.getByLabel("Tên thuốc", { exact: true }).fill("Thuốc mô phỏng E2E");
  await d.getByLabel("Hàm lượng / Liều dùng", { exact: true }).fill("1 đơn vị mô phỏng/lần");
  await d.getByLabel("Tần suất sử dụng", { exact: true }).fill("1 lần/ngày");
  await d.getByLabel("Số ngày", { exact: true }).fill("3");
  await d.getByLabel("Số lượng", { exact: true }).fill("3");
  await d
    .getByLabel("Hướng dẫn dùng", { exact: true })
    .fill("Dữ liệu kiểm thử, không dùng điều trị.");
  await d.getByLabel("Ngày tái khám (tùy chọn)", { exact: true }).fill("2026-11-27");
  await d.getByRole("button", { name: "Xem lại & Hoàn tất khám", exact: true }).click();
  await review.getByText("3 ngày", { exact: true }).waitFor();
  await review.getByText("Đường uống", { exact: true }).waitFor();
  await review.getByText("27/11/2026", { exact: true }).waitFor();
  await delay(350);
  await d.screenshot({ path: output + "/prescription-review-desktop.png" });
  for (const width of [390, 320]) {
    await d.setViewportSize({ width, height: 844 });
    await delay(350);
    const sizes = await review.evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert.ok(sizes.scroll <= sizes.client + 1, "review must not overflow horizontally");
    const button = review.getByRole("button", { name: "Ký đơn & Hoàn tất khám" });
    assert.ok((await button.boundingBox()).height >= 44);
    const bounds = await button.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844, "sign button stays visible");
    await d.screenshot({ path: output + "/prescription-review-" + width + ".png" });
  }
  await review.getByRole("button", { name: "Quay lại chỉnh sửa" }).click();
  assert.equal(await d.getByLabel("Tên thuốc", { exact: true }).inputValue(), "Thuốc mô phỏng E2E");
  assert.deepEqual(errors, []);
  console.error(
    JSON.stringify({
      passed: true,
      checks: [
        "patient cancel navigation retains data",
        "submit lock",
        "persistent error and retry",
        "save clears guard",
        "draft lock",
        "doctor cancel route",
        "doctor cross-step preservation",
        "doctor cancel patient switch",
        "unsent orders remain editable across tabs",
        "successful orders clear submitted draft and explain pending state",
        "re-examination restores order editing",
        "prescription review shows full medication details and revisit date",
        "review without medication and cancel preserve form data",
        "review fits 320px and 390px with visible sign button",
      ],
    })
  );
} catch (e) {
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages()) {
        console.error((await p.locator("body").innerText()).slice(-1400));
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
