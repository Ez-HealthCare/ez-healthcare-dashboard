import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const WEB = process.env.AUTH_TEST_WEB || "http://localhost:3001";
const MAIL = process.env.AUTH_TEST_MAIL || "http://localhost:8025";
const RESULTS = process.env.AUTH_TEST_RESULTS || "test-results";
await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch();
let currentPage;
const staff = [
  ["Quản trị viên", "admin@ezhealthcare.com", "Admin@123456", "/dashboard/admin"],
  ["Bác sĩ", "dr.smith@ezhealthcare.com", "Doctor@123456", "/dashboard/doctor"],
  ["Điều dưỡng / Tiếp nhận", "nurse.emily@ezhealthcare.com", "Nurse@123456", "/dashboard/nurse"],
  [
    "Điều dưỡng / Tiếp nhận",
    "reception.clara@ezhealthcare.com",
    "Reception@123456",
    "/dashboard/nurse",
  ],
  ["Kỹ thuật viên xét nghiệm", "lab.tech@ezhealthcare.com", "Lab@123456", "/dashboard"],
  ["Nhân viên cấp cứu", "er.staff@ezhealthcare.com", "Emergency@123456", "/dashboard"],
];

async function checkIdentity(page, label, path) {
  await page.waitForURL(WEB + path);
  await page.getByTestId("identity-role").waitFor({ state: "visible" });
  assert.equal(await page.getByTestId("identity-role").textContent(), label);
}

async function getOtp(email) {
  const inbox = await (await fetch(MAIL + "/api/v1/messages")).json();
  const mail = inbox.messages.find((item) => item.To.some((to) => to.Address === email));
  assert.ok(mail, "Email must be delivered to Mailpit");
  const detail = await (await fetch(MAIL + "/api/v1/message/" + mail.ID)).json();
  const otp = detail.Text.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp, "Delivered email must contain an OTP");
  return otp;
}

try {
  for (const [role, email, password, path] of staff) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
    const page = await context.newPage();
    currentPage = page;
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(WEB + "/dashboard");
    await page.waitForURL(WEB + "/");
    await page.getByText("Nhân viên y tế", { exact: true }).click();
    if (role === "Quản trị viên") {
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await page.getByText("Vui lòng nhập email.", { exact: true }).waitFor();
      await page.getByText("Vui lòng nhập mật khẩu.", { exact: true }).waitFor();
    }
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    if (role === "Quản trị viên") {
      await page.getByLabel("Mật khẩu", { exact: true }).fill("Incorrect@123");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" }).waitFor();
      await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
      await context.setOffline(true);
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Không thể kết nối" }).waitFor();
      await context.setOffline(false);
    }
    await page.getByLabel("Ghi nhớ đăng nhập").check();
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await checkIdentity(page, role, path);
    assert.ok(
      (await context.cookies())
        .filter((cookie) => cookie.name.startsWith("ez_"))
        .every((cookie) => cookie.httpOnly)
    );
    assert.equal(await page.evaluate(() => Object.keys(localStorage).length), 0);
    await context.clearCookies({ name: "ez_access" });
    await page.reload();
    await checkIdentity(page, role, path);
    if (email === "nurse.emily@ezhealthcare.com") {
      await page.screenshot({ path: RESULTS + "/nurse-dashboard.png", fullPage: true });
    }
    if (await page.getByRole("button", { name: "Tài khoản của tôi" }).count())
      await page.getByRole("button", { name: "Tài khoản của tôi" }).click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await page.waitForURL(WEB + "/");
    await page.goto(WEB + "/dashboard");
    await page.waitForURL(WEB + "/");
    assert.deepEqual(errors, []);
    process.stdout.write("PASS browser staff: " + role + "\n");
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  currentPage = page;
  await page.goto(WEB + "/");
  await page.getByRole("button", { name: "Nhận mã OTP", exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: RESULTS + "/patient-login-mobile.png", fullPage: true });
  const email = "patient.elizabeth@example.com";
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Nhận mã OTP", exact: true }).click();
  await page.getByText("Mã OTP đã được gửi", { exact: true }).waitFor();
  const otp = await getOtp(email);
  await page.getByLabel("Mã OTP", { exact: true }).fill(otp === "000000" ? "999999" : "000000");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Mã OTP không đúng" }).waitFor();
  await page.getByLabel("Mã OTP", { exact: true }).fill(otp);
  await page.getByLabel("Mã OTP", { exact: true }).press("Enter");
  await page.waitForURL("**/dashboard/patient");
  // Patient identity and logout now live in the Figma header's account popover.
  await page.getByRole("button", { name: "Tài khoản bệnh nhân" }).click();
  await page
    .getByText("patient.elizabeth@example.com", { exact: true })
    .last()
    .waitFor({ state: "visible" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: RESULTS + "/patient-identity-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.waitForURL(WEB + "/");
  await context.close();
  process.stdout.write("PASS browser patient: OTP, wrong code, identity, mobile and logout\n");
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage
      .screenshot({ path: RESULTS + "/auth-browser-failure.png", fullPage: true })
      .catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
