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
const output = process.env.LOGIN_LAYOUT_OUTPUT || join(tmpdir(), "ez-healthcare-login-layout");
await mkdir(output, { recursive: true });
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (data, code = 200) => res.writeHead(code).end(JSON.stringify(data));
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const path = new URL(req.url, "http://fixture").pathname;
  if (path === "/api/auth/me")
    return req.headers.cookie?.includes("valid.PATIENT")
      ? reply({
          id: "patient-layout",
          name: "Bệnh nhân mô phỏng",
          role: "PATIENT",
          email: "patient@fixture.test",
          profileComplete: true,
        })
      : reply({ message: "Unauthenticated" }, 401);
  if (path === "/api/auth/patient/request-otp") return reply({ success: true });
  if (path === "/api/auth/patient/verify-otp") {
    if (body.otpCode !== "123456") return reply({ message: "Invalid OTP" }, 400);
    res.setHeader("Set-Cookie", [
      "ez_access=valid.PATIENT; Path=/; HttpOnly; SameSite=Lax",
      "ez_refresh=valid.PATIENT; Path=/; HttpOnly; SameSite=Lax",
    ]);
    return reply({ success: true });
  }
  if (path === "/api/auth/staff/login") return reply({ message: "Invalid credentials" }, 401);
  if (path === "/api/notifications") return reply([]);
  if (path === "/api/visits/me/current" || path === "/api/reception-requests/me/current")
    return reply(null);
  return reply({ message: "Not found" }, 404);
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
async function reachable(button) {
  await button.evaluate((e) =>
    window.scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight / 2)
  );
  await button.page().waitForTimeout(60);
  return button.evaluate((e) => {
    const r = e.getBoundingClientRect();
    for (let parent = e.parentElement; parent; parent = parent.parentElement) {
      const s = getComputedStyle(parent),
        p = parent.getBoundingClientRect();
      if (
        ["hidden", "clip"].includes(s.overflowY) &&
        (r.bottom > p.bottom + 1 || r.top < p.top - 1)
      )
        return false;
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.top >= 0 && r.bottom <= innerHeight && hit && (hit === e || e.contains(hit));
  });
}
try {
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await delay(200);
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    checked = [];
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [1024, 600],
    [900, 650],
    [768, 600],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(origin);
    assert.equal(await p.locator("h1").count(), 1);
    await p
      .getByLabel("Email", { exact: true })
      .fill("patient.long.email.for.viewport.checking@fixture.example.test");
    const request = p.getByRole("button", { name: "Nhận mã OTP", exact: true });
    assert.ok(await reachable(request), `request reachable ${width}x${height}`);
    await request.click();
    await p.getByText("Mã OTP đã được gửi", { exact: true }).waitFor();
    const otp = p.getByLabel("Mã OTP", { exact: true });
    await otp.fill("000000");
    const login = p.getByRole("button", { name: "Đăng nhập", exact: true });
    assert.ok(await reachable(login), `OTP submit reachable ${width}x${height}`);
    await login.click();
    await p.getByText("Mã OTP không đúng hoặc đã được sử dụng.", { exact: true }).waitFor();
    assert.ok(await reachable(login), `submit still reachable with errors ${width}x${height}`);
    assert.ok(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `no horizontal overflow ${width}`
    );
    assert.ok(await otp.evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16));
    if (width === 1440 || width === 1280 || width === 390) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({
        path: join(output, `login-otp-${width}x${height}.png`),
        fullPage: true,
      });
    }
    await p.getByRole("button", { name: "Đổi email", exact: true }).click();
    assert.ok(await p.getByLabel("Email", { exact: true }).isEnabled());
    await p.getByRole("button", { name: "Nhận mã OTP", exact: true }).click();
    await otp.fill("123456");
    assert.ok(await reachable(login));
    await login.click();
    await p.waitForURL("**/dashboard/patient");
    checked.push(`${width}x${height}`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 600 } }),
    p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(origin);
  await p.getByText("Nhân viên y tế", { exact: true }).click();
  await p.getByLabel("Email", { exact: true }).fill("staff@fixture.test");
  await p.getByLabel("Mật khẩu", { exact: true }).fill("Invalid@123");
  await p.getByRole("button", { name: "Quên mật khẩu?", exact: true }).click();
  const login = p.getByRole("button", { name: "Đăng nhập", exact: true });
  assert.ok(await reachable(login));
  await login.click();
  await p
    .getByText("Email hoặc mật khẩu không đúng, hoặc tài khoản không hoạt động.", { exact: true })
    .waitFor();
  assert.ok(await reachable(login));
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: join(output, "login-staff-1280x600.png"), fullPage: true });
  assert.deepEqual(errors, []);
  process.stdout.write(
    JSON.stringify({
      passed: true,
      viewports: checked,
      checks: [
        "OTP submit not clipped",
        "reachable with success and error messages",
        "change email",
        "OTP verifies and enters patient workspace",
        "staff error and forgot-password panel",
        "16px inputs",
        "no horizontal overflow",
        "one visible page H1",
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
