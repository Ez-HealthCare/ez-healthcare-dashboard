import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import { http } from "../lib/api/http.ts";
import { AuthError } from "../lib/auth.ts";

const user = {
  id: "patient-id",
  email: "patient@example.com",
  name: "Patient",
  role: "PATIENT",
  profileComplete: true,
};
const issuedCookies = [
  "ez_access=fresh; HttpOnly; SameSite=Lax; Path=/",
  "ez_refresh=fresh-refresh; HttpOnly; SameSite=Lax; Path=/",
];
let mode = "normal";
let calls = [];
let authService;
let proxy;
const previousApiUrl = process.env.API_URL;
const previousBaseUrl = http.defaults.baseURL;
const server = createServer(async (req, res) => {
  let text = "";
  for await (const chunk of req) text += chunk;
  calls.push({
    path: req.url,
    method: req.method,
    cookie: req.headers.cookie || "",
    body: text ? JSON.parse(text) : undefined,
  });
  res.setHeader("Content-Type", "application/json");
  const send = (status, body) => res.writeHead(status).end(JSON.stringify(body));
  if (mode === "server-error") return send(503, { message: "Do not expose upstream details" });
  if (req.url === "/api/auth/me") {
    if (!req.headers.cookie?.includes("ez_access=fresh")) return send(401, { message: "Expired" });
    return send(200, user);
  }
  if (req.url === "/api/auth/refresh") {
    if (mode === "refresh-failure") return send(401, { message: "Invalid refresh" });
    res.setHeader("Set-Cookie", issuedCookies);
    return send(200, {
      accessToken: "private-access",
      refreshToken: "private-refresh",
      expiresIn: 900,
    });
  }
  if (req.url === "/api/auth/session") {
    return setTimeout(() => send(200, mode === "invalid-user" ? { role: "PATIENT" } : user), 20);
  }
  if (req.url === "/api/auth/staff/login") {
    if (mode === "wrong-password") return send(401, { message: "Invalid credentials" });
    res.setHeader("Set-Cookie", issuedCookies);
    return send(200, {
      accessToken: "private-access",
      refreshToken: "private-refresh",
      expiresIn: 900,
    });
  }
  if (mode === "throttled") return send(429, { message: "Please wait 60 seconds" });
  if (mode === "expired-otp") return send(400, { message: "OTP expired" });
  return send(200, { message: "OK" });
});

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  process.env.API_URL = "http://127.0.0.1:" + server.address().port + "/api";
  http.defaults.baseURL = process.env.API_URL;
  ({ authService } = await import("../services/auth.service.ts"));
  proxy = await import("../services/auth-proxy.server.ts");
});
beforeEach(() => {
  mode = "normal";
  calls = [];
});
after(async () => {
  http.defaults.baseURL = previousBaseUrl;
  if (previousApiUrl === undefined) delete process.env.API_URL;
  else process.env.API_URL = previousApiUrl;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("proxy allowlist rejects unknown paths/methods and forwards only auth cookies", () => {
  for (const [path, method] of [
    ["https://foreign.invalid", "POST"],
    ["../users", "POST"],
    ["me", "POST"],
    ["staff/login", "GET"],
    ["me", "DELETE"],
  ]) {
    assert.equal(proxy.isAuthProxyPath(path, method), false);
  }
  assert.equal(proxy.isAuthProxyPath("session", "POST"), true);
  assert.equal(proxy.isAuthProxyPath("me", "GET"), true);
  const jar = new Map([
    ["ez_access", { value: "a" }],
    ["ez_refresh", { value: "r" }],
    ["unrelated", { value: "secret" }],
  ]);
  assert.equal(proxy.authCookieHeader(jar), "ez_access=a; ez_refresh=r");
});

test("proxy strips both token fields and preserves separate HttpOnly cookies", async () => {
  const body = { email: "staff@example.com", password: "private", rememberMe: true };
  const result = await proxy.proxyAuthRequest(
    "staff/login",
    "POST",
    "",
    false,
    JSON.stringify(body)
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { expiresIn: 900 });
  assert.deepEqual(result.setCookies, issuedCookies);
  assert.deepEqual(calls[0].body, body);
});

test("session rotates once, re-verifies identity using fresh cookies, and returns no tokens", async () => {
  const result = await proxy.proxyAuthRequest(
    "session",
    "POST",
    "ez_access=stale; ez_refresh=old",
    true
  );
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/api/auth/me", "/api/auth/refresh", "/api/auth/me"]
  );
  assert.equal(calls[2].cookie, "ez_access=fresh; ez_refresh=fresh-refresh");
  assert.deepEqual(result.data, user);
  assert.deepEqual(result.setCookies, issuedCookies);
  assert.equal(result.clearCookies, false);
});

test("missing or rejected refresh ends in 401 with cookie clearing, not a retry loop", async () => {
  const noRefresh = await proxy.proxyAuthRequest("session", "POST", "ez_access=stale", false);
  assert.equal(noRefresh.status, 401);
  assert.equal(noRefresh.clearCookies, true);
  assert.equal(calls.length, 1);
  calls = [];
  mode = "refresh-failure";
  const rejected = await proxy.proxyAuthRequest("session", "POST", "ez_refresh=old", true);
  assert.equal(rejected.status, 401);
  assert.equal(rejected.clearCookies, true);
  assert.equal(calls.length, 2);
});

test("browser auth service deduplicates concurrent session requests", async () => {
  const a = authService.getCurrentUser();
  const b = authService.getCurrentUser();
  assert.equal(a, b);
  assert.deepEqual(await a, user);
  assert.equal(calls.length, 1);
  await authService.getCurrentUser();
  assert.equal(calls.length, 2, "Do not cache identity beyond the in-flight request");
});

test("auth service preserves localized credential, resend, OTP and server errors", async () => {
  for (const [nextMode, action, status, message] of [
    [
      "wrong-password",
      () => authService.loginStaff({ email: user.email, password: "bad", rememberMe: false }),
      401,
      /Email hoặc mật khẩu không đúng/,
    ],
    ["throttled", () => authService.requestPatientOtp(user.email), 429, /đợi 60 giây/],
    [
      "expired-otp",
      () =>
        authService.verifyPatientOtp({ email: user.email, otpCode: "123456", rememberMe: false }),
      400,
      /OTP đã hết hạn/,
    ],
    ["server-error", () => authService.logout(), 503, /tạm thời gián đoạn/],
  ]) {
    mode = nextMode;
    await assert.rejects(
      action,
      (error) =>
        error instanceof AuthError && error.status === status && message.test(error.message)
    );
  }
});

test("auth service rejects malformed identity instead of trusting a successful status", async () => {
  mode = "invalid-user";
  await assert.rejects(
    authService.getCurrentUser(),
    (error) => error instanceof AuthError && error.status === 503
  );
});
