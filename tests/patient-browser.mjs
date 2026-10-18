import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const WEB = process.env.AUTH_TEST_WEB || "http://localhost:3001";
const MAIL = process.env.AUTH_TEST_MAIL || "http://localhost:8025";
const RESULTS = process.env.AUTH_TEST_RESULTS || "test-results";
const HOME = WEB + "/dashboard/patient";
await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1330 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(HOME);
  await page.waitForURL(WEB + "/");
  await page.getByLabel("Email", { exact: true }).fill("patient.david@example.com");
  await page.getByRole("button", { name: "Nhận mã OTP", exact: true }).click();
  await page.getByText("Mã OTP đã được gửi", { exact: true }).waitFor();
  const inbox = await (await fetch(MAIL + "/api/v1/messages")).json();
  const message = inbox.messages.find((mail) =>
    mail.To.some((to) => to.Address === "patient.david@example.com")
  );
  assert.ok(message);
  const mail = await (await fetch(MAIL + "/api/v1/message/" + message.ID)).json();
  const code = mail.Text.match(/\b\d{6}\b/)?.[0];
  assert.ok(code);
  await page.getByLabel("Mã OTP", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(HOME);
  await page.getByRole("heading", { name: "Chào buổi sáng, David Miller" }).waitFor();
  await page.getByText("Bản xem trước · Dữ liệu khám minh họa", { exact: true }).waitFor();
  const nav = page.getByRole("navigation", { name: "Điều hướng bệnh nhân" });
  assert.equal(await nav.getByRole("link").count(), 3);
  assert.equal(
    await nav.getByRole("link", { name: "Trang chủ", exact: true }).getAttribute("aria-current"),
    "page"
  );
  assert.equal(
    await page.getByRole("link", { name: /Bàn Khám|Tiếp Nhận S0|Người Dùng/ }).count(),
    0
  );
  await page.screenshot({ path: RESULTS + "/patient-dashboard-desktop.png", fullPage: true });
  assert.ok(
    await page.evaluate(() =>
      [...document.images].every((img) => img.complete && img.naturalWidth > 0)
    )
  );
  const brandImage = page
    .getByRole("link", { name: "MediRoute — Trang chủ bệnh nhân" })
    .locator("img");
  const brandBounds = await brandImage.boundingBox();
  assert.equal(brandBounds?.width, 18);
  assert.equal(brandBounds?.height, 18);

  await page.getByRole("button", { name: "Lấy số tiếp nhận", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByText(/chưa kết nối API và chưa thực hiện/).waitFor();
  await page.getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await page.getByRole("button", { name: "Đánh dấu đã đọc tất cả" }).click();
  await page.getByRole("button", { name: "Đã đọc tất cả", exact: true }).waitFor();

  for (const [label, path] of [
    ["Lượt khám của tôi", "visits"],
    ["Hồ sơ khám bệnh", "records"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await page.waitForURL(HOME + "/" + path);
    await page.getByRole("heading", { name: label, exact: true }).waitFor();
    await page.getByText(/chưa kết nối dữ liệu khám bệnh/).waitFor();
    assert.equal(
      await nav.getByRole("link", { name: label, exact: true }).getAttribute("aria-current"),
      "page"
    );
  }
  await context.clearCookies({ name: "ez_access" });
  await page.reload();
  await page.getByRole("heading", { name: "Hồ sơ khám bệnh", exact: true }).waitFor();
  assert.equal(page.url(), HOME + "/records");
  await page.goto(HOME);
  await page.getByRole("heading", { name: /Chào buổi sáng/ }).waitFor();
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: RESULTS + "/patient-dashboard-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Keyboard skip link must take focus before navigation; no mouse is required.
  await page.reload();
  await page.getByRole("heading", { name: /Chào buổi sáng/ }).waitFor();
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Bỏ qua điều hướng");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Tài khoản bệnh nhân" }).click();
  assert.equal(await page.getByTestId("identity-role").textContent(), "Bệnh nhân");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.waitForURL(WEB + "/");
  await page.goto(HOME + "/records");
  await page.waitForURL(WEB + "/");
  assert.deepEqual(errors, []);

  // Every seeded staff role, including ADMIN, is denied the patient workspace.
  for (const [email, password] of [
    ["admin@ezhealthcare.com", "Admin@123456"],
    ["dr.smith@ezhealthcare.com", "Doctor@123456"],
    ["nurse.emily@ezhealthcare.com", "Nurse@123456"],
    ["reception.clara@ezhealthcare.com", "Reception@123456"],
    ["lab.tech@ezhealthcare.com", "Lab@123456"],
    ["er.staff@ezhealthcare.com", "Emergency@123456"],
  ]) {
    const staffContext = await browser.newContext();
    const login = await staffContext.request.post(WEB + "/api/auth/staff/login", {
      data: { email, password },
    });
    assert.equal(login.status(), 200);
    for (const path of ["", "/visits", "/records"]) {
      const response = await staffContext.request.get(HOME + path + "?_rsc", {
        headers: { RSC: "1" },
      });
      const body = await response.text();
      assert.ok(body.includes("WorkspaceAccessDenied"));
      assert.ok(
        !body.includes('"PatientDashboard"'),
        "Denied RSC must not contain the patient screen"
      );
    }
    const staffPage = await staffContext.newPage();
    await staffPage.goto(HOME);
    await staffPage.getByText("Không có quyền truy cập", { exact: true }).waitFor();
    await staffContext.request.post(WEB + "/api/auth/logout", { data: {} });
    await staffContext.close();
  }
  const fakeContext = await browser.newContext();
  await fakeContext.addCookies([{ name: "ez_access", value: "fake.patient.jwt", url: WEB }]);
  const forged = await fakeContext.request.get(HOME, { maxRedirects: 0 });
  // Next may stream a 200 shell before the asynchronous API check redirects.
  // Verify the redirect outcome and absence of patient content, not only status.
  assert.ok([200, 307].includes(forged.status()));
  const forgedBody = await forged.text();
  assert.ok(!forgedBody.includes('"PatientDashboard"'));
  const fakePage = await fakeContext.newPage();
  await fakePage.goto(HOME);
  await fakePage.waitForURL(WEB + "/");
  await fakeContext.close();
  process.stdout.write(
    "PASS patient: seeded OTP, real identity, menus, preview actions, session recovery, logout, 1280/768/375, keyboard, six staff denied + RSC, forged JWT\n"
  );
} catch (error) {
  await page
    .screenshot({ path: RESULTS + "/patient-browser-failure.png", fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
