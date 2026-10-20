import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const WEB = process.env.AUTH_TEST_WEB || "http://localhost:3003";
const MAIL = process.env.AUTH_TEST_MAIL || "http://localhost:8026";
const RESULTS = process.env.AUTH_TEST_RESULTS || "test-results";
const patientEmail = `phaseb.browser.${Date.now()}@example.com`;
const patientName = patientEmail.split("@")[0];
const expiredPatientEmail = `phasec.expired.${Date.now()}@example.com`;
const expiredPatientName = expiredPatientEmail.split("@")[0];
const errors = [];

await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch();

async function getOtp(email) {
  await assertEventually(async () => {
    const inbox = await (await fetch(`${MAIL}/api/v1/messages`)).json();
    return inbox.messages.some((item) => item.To.some((to) => to.Address === email));
  }, "OTP email was not delivered");
  const inbox = await (await fetch(`${MAIL}/api/v1/messages`)).json();
  const mail = inbox.messages.find((item) => item.To.some((to) => to.Address === email));
  const detail = await (await fetch(`${MAIL}/api/v1/message/${mail.ID}`)).json();
  const otp = detail.Text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp, "Delivered email must contain an OTP");
  return otp;
}

async function assertEventually(check, message, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.fail(message);
}

async function createPatientWithHallTicket(email, label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
  await page.goto(`${WEB}/`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Nhận mã OTP", exact: true }).click();
  await page.getByText("Mã OTP đã được gửi", { exact: true }).waitFor();
  await page.getByLabel("Mã OTP", { exact: true }).fill(await getOtp(email));
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`${WEB}/dashboard/patient`);
  const hallRequest = page.waitForResponse((response) =>
    response.url().endsWith("/api/clinical/visits/hall-ticket")
  );
  await page.getByRole("button", { name: "Lấy số tiếp nhận", exact: true }).click();
  const hallResponse = await hallRequest;
  assert.equal(hallResponse.status(), 201, `Hall ticket failed: ${hallResponse.status()}`);
  const ticket = await hallResponse.json();
  const hallHeading = page.getByRole("heading", { name: /^Số tiếp nhận A-/ });
  await hallHeading.waitFor();
  const hallNumber = (await hallHeading.textContent()).replace("Số tiếp nhận ", "");
  await page.reload();
  await page.getByRole("heading", { name: `Số tiếp nhận ${hallNumber}` }).waitFor();
  await page.getByText("Đang chờ tiếp nhận", { exact: true }).waitFor();
  return { context, page, visitId: ticket.visitId, hallNumber };
}

async function loginStaff(context, email, password, workspace) {
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${workspace}: ${error.message}`));
  await page.goto(`${WEB}/`);
  await page.getByText("Nhân viên y tế", { exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`${WEB}/dashboard/${workspace}`);
  return page;
}

let patientContext;
let expiredPatientContext;
let nurseContext;
let doctorContext;
let adminContext;
let currentPage;

try {
  const patient = await createPatientWithHallTicket(patientEmail, "patient");
  patientContext = patient.context;
  const patientPage = patient.page;
  currentPage = patientPage;
  const hallNumber = patient.hallNumber;

  const expiredPatient = await createPatientWithHallTicket(expiredPatientEmail, "expired-patient");
  expiredPatientContext = expiredPatient.context;
  const pgModule = await import(process.env.PG_MODULE || "pg");
  const DbClient = pgModule.Client || pgModule.default.Client;
  const db = new DbClient({
    host: process.env.AUTH_TEST_DB_HOST || "localhost",
    user: process.env.AUTH_TEST_DB_USER,
    password: process.env.AUTH_TEST_DB_PASSWORD,
    database: process.env.AUTH_TEST_DB_NAME,
  });
  await db.connect();
  await db.query(
    "UPDATE queue_tickets SET expires_at = NOW() - INTERVAL '1 minute' WHERE visit_id = $1 AND status = 'ACTIVE'",
    [expiredPatient.visitId]
  );
  await db.end();
  await expiredPatient.page.reload();
  await expiredPatient.page.getByText("Lượt đã hết hiệu lực", { exact: true }).waitFor();

  nurseContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const nursePage = await loginStaff(
    nurseContext,
    "nurse.emily@ezhealthcare.com",
    "Nurse@123456",
    "nurse"
  );
  currentPage = nursePage;
  const expiredTable = nursePage
    .getByRole("heading", { name: "Lượt hết hạn", exact: true })
    .locator("xpath=following::table[1]");
  const expiredRow = expiredTable.locator("tr", { hasText: expiredPatientName });
  await expiredRow.waitFor();
  await expiredRow.getByRole("button", { name: "Cấp lại", exact: true }).click();
  const expiredReissue = nursePage.getByRole("dialog", { name: "Cấp lại số tiếp nhận?" });
  await expiredReissue.getByRole("button", { name: "Cấp số mới", exact: true }).waitFor();
  assert.equal(
    await expiredReissue.getByRole("button", { name: "Cấp số mới", exact: true }).isDisabled(),
    true,
    "Expired-ticket reissue must require a reason"
  );
  await expiredReissue
    .getByPlaceholder("Lý do cấp lại (bắt buộc)")
    .fill("Bệnh nhân quay lại vào ngày làm việc mới");
  await expiredReissue.getByRole("button", { name: "Cấp số mới", exact: true }).click();
  await expiredReissue.waitFor({ state: "hidden" });
  await expiredRow.waitFor({ state: "hidden" });
  await expiredPatient.page.reload();
  await expiredPatient.page.getByText("Đã cấp lại số", { exact: true }).waitFor();
  await expiredPatient.page.getByRole("heading", { name: /^Số tiếp nhận A-/ }).waitFor();

  const nurseRow = nursePage.locator("tr", { hasText: patientName });
  await nurseRow.waitFor();
  await nurseRow.getByRole("button", { name: "Xác minh", exact: true }).click();
  await nurseRow.getByText("RECEPTION_VERIFIED", { exact: true }).waitFor();
  await nurseRow.getByRole("button", { name: "Ghi thông tin bệnh", exact: true }).click();
  const intake = nursePage.getByRole("dialog", { name: `Tiếp nhận ${patientName}` });
  await intake.getByLabel("Lý do khám", { exact: true }).fill("Đau đầu và chóng mặt");
  await intake.getByLabel("HA tâm thu", { exact: true }).fill("120");
  await intake.getByLabel("HA tâm trương", { exact: true }).fill("80");
  await intake.getByLabel("Mạch", { exact: true }).fill("76");
  await intake.getByLabel("Nhiệt độ", { exact: true }).fill("36.8");
  await intake.getByLabel("SpO₂", { exact: true }).fill("98");
  await intake.getByLabel("Nhịp thở", { exact: true }).fill("18");
  await intake.getByLabel("Thời gian triệu chứng", { exact: true }).fill("2 ngày");
  await intake.getByRole("button", { name: "Lưu sàng lọc", exact: true }).click();
  await intake.waitFor({ state: "hidden" });
  await nurseRow.getByText("TRIAGE_PENDING", { exact: true }).waitFor();
  await nurseRow.getByRole("button", { name: "Phân phòng", exact: true }).click();
  const assignment = nursePage.getByRole("dialog", { name: "Phân phòng và cấp số khám" });
  await assignment.getByRole("combobox").click();
  await nursePage.getByText(/^P\.102 · /).click();
  await assignment.waitFor({ state: "hidden" });
  await nurseRow.getByText("CLINIC_WAITING", { exact: true }).waitFor();
  await nursePage.screenshot({ path: `${RESULTS}/phase-b-nurse-assigned.png`, fullPage: true });

  doctorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const doctorPage = await loginStaff(
    doctorContext,
    "dr.smith@ezhealthcare.com",
    "Doctor@123456",
    "doctor"
  );
  currentPage = doctorPage;
  const doctorRow = doctorPage.locator("tr", { hasText: patientName });
  await doctorRow.waitFor();
  await doctorRow.getByText("Đau đầu và chóng mặt", { exact: true }).waitFor();
  await doctorRow.getByText(/120\/80 · 76 bpm · SpO₂ 98(?:\.0)?%/).waitFor();
  await doctorPage.screenshot({ path: `${RESULTS}/phase-b-doctor-queue.png`, fullPage: true });
  await doctorRow.getByRole("button", { name: "Gọi (0/3)", exact: true }).click();
  await doctorRow.getByText("CLINIC_CALLED", { exact: true }).waitFor();
  await doctorRow.getByRole("button", { name: "Tiếp nhận khám", exact: true }).click();
  await doctorRow.waitFor({ state: "hidden" });

  await patientPage.reload();
  await patientPage.getByText("Bác sĩ đang tiếp nhận", { exact: true }).waitFor();
  const clinicText = patientPage.getByText(/^Số khám CL-102-/);
  await clinicText.waitFor();
  const clinicNumber = (await clinicText.textContent()).replace("Số khám ", "");
  for (const title of ["Đã cấp số tiếp nhận", "Đã phân phòng khám", "Đến lượt khám"]) {
    await patientPage.getByText(title, { exact: true }).waitFor();
  }
  assert.ok(
    await patientPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Patient dashboard must not overflow a mobile viewport"
  );
  await patientPage.screenshot({ path: `${RESULTS}/phase-b-patient-final.png`, fullPage: true });

  const wrongRoom = await doctorContext.request.get(`${WEB}/api/clinical/visits/queue/P.105`);
  assert.equal(wrongRoom.status(), 403, "Doctor must not read an unassigned room");

  adminContext = await browser.newContext();
  const adminPage = await loginStaff(
    adminContext,
    "admin@ezhealthcare.com",
    "Admin@123456",
    "admin"
  );
  currentPage = adminPage;
  const adminClinical = await adminContext.request.get(
    `${WEB}/api/clinical/visits/reception/queue`
  );
  assert.equal(adminClinical.status(), 403, "Admin must not inherit clinical access");

  assert.deepEqual(errors, []);
  process.stdout.write(
    `PASS Phase C browser: ${hallNumber} -> ${clinicNumber} -> IN_EXAMINATION; expired reissue, notifications and 403 scope checks passed\n`
  );
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage
      .screenshot({ path: `${RESULTS}/phase-b-browser-failure.png`, fullPage: true })
      .catch(() => {});
  }
  throw error;
} finally {
  await Promise.all(
    [patientContext, expiredPatientContext, nurseContext, doctorContext, adminContext]
      .filter(Boolean)
      .map((context) => context.close())
  );
  await browser.close();
}
