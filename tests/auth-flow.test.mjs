import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";

const API = process.env.AUTH_TEST_API || "http://localhost:3000/api";
const WEB = process.env.AUTH_TEST_WEB || "http://localhost:3001";
const MAIL = process.env.AUTH_TEST_MAIL || "http://localhost:8025";
const TEST_SECRET = process.env.AUTH_TEST_SECRET || process.env.AUTH_JWT_ACCESS_SECRET;
assert.ok(TEST_SECRET, "Configure AUTH_JWT_ACCESS_SECRET in .env or AUTH_TEST_SECRET");
const staff = [
  ["ADMIN", "admin@ezhealthcare.com", "Admin@123456"],
  ["DOCTOR", "dr.smith@ezhealthcare.com", "Doctor@123456"],
  ["NURSE", "nurse.emily@ezhealthcare.com", "Nurse@123456"],
  ["RECEPTIONIST", "reception.clara@ezhealthcare.com", "Reception@123456"],
  ["LAB_TECHNICIAN", "lab.tech@ezhealthcare.com", "Lab@123456"],
  ["EMERGENCY_STAFF", "er.staff@ezhealthcare.com", "Emergency@123456"],
];

async function call(base, path, { body, cookie = "", origin, method } = {}) {
  const response = await fetch(base + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
    redirect: "manual",
  });
  const cookies = response.headers.getSetCookie();
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: response.status,
    headers: response.headers,
    data,
    cookies,
    cookie: cookies.map((value) => value.split(";")[0]).join("; "),
  };
}

async function otpFor(email) {
  for (let i = 0; i < 20; i++) {
    const response = await fetch(MAIL + "/api/v1/messages", { signal: AbortSignal.timeout(5000) });
    const inbox = await response.json();
    const mail = inbox.messages.find((item) => item.To.some((to) => to.Address === email));
    if (mail) {
      const detail = await (await fetch(MAIL + "/api/v1/message/" + mail.ID)).json();
      const code = detail.Text.match(/\b\d{6}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("OTP email was not received in Mailpit");
}

test("unauthenticated API and dashboard are protected", async () => {
  assert.equal((await call(API, "/auth/me")).status, 401);
  const dashboard = await call(WEB, "/dashboard");
  assert.equal(dashboard.status, 307);
  assert.match(dashboard.headers.get("location"), /\/$/);
  assert.equal((await call(WEB, "/api/auth/session", { body: {} })).status, 401);
});

for (const [role, email, password] of staff) {
  test("seeded " + role + ": login, identity, rotation, logout", async () => {
    const login = await call(API, "/auth/staff/login", {
      body: { email, password, rememberMe: true },
    });
    assert.equal(login.status, 200);
    assert.equal(typeof login.data.accessToken, "string");
    assert.equal(login.data.refreshToken, undefined);
    assert.ok(
      login.cookies.every((cookie) => /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie))
    );
    assert.match(
      login.cookies.find((cookie) => cookie.startsWith("ez_refresh=")),
      /Expires=/i
    );
    const me = await call(API, "/auth/me", { cookie: login.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.data.role, role);
    assert.equal(me.data.email, email);
    assert.equal(me.data.password, undefined);
    const refresh = await call(API, "/auth/refresh", { body: {}, cookie: login.cookie });
    assert.equal(refresh.status, 200);
    assert.notEqual(refresh.cookie, login.cookie);
    assert.equal(
      (await call(API, "/auth/refresh", { body: {}, cookie: login.cookie })).status,
      401
    );
    assert.equal(
      (await call(API, "/auth/logout", { body: {}, cookie: refresh.cookie })).status,
      200
    );
    assert.equal((await call(API, "/auth/me", { cookie: refresh.cookie })).status, 401);
    assert.equal(
      (await call(API, "/auth/refresh", { body: {}, cookie: refresh.cookie })).status,
      401
    );
  });
}

test("invalid staff credentials, invalid DTO and patient password login are rejected", async () => {
  assert.equal(
    (
      await call(API, "/auth/staff/login", {
        body: { email: staff[0][1], password: "Incorrect@123" },
      })
    ).status,
    401
  );
  assert.equal(
    (
      await call(API, "/auth/staff/login", {
        body: { email: "invalid", password: "x" },
      })
    ).status,
    400
  );
  assert.equal(
    (
      await call(API, "/auth/staff/login", {
        body: { email: "patient.david@example.com", password: "Patient@123456" },
      })
    ).status,
    401
  );
});

test("CORS credentials work for the configured origin and foreign mutations fail", async () => {
  const preflight = await fetch(API + "/auth/staff/login", {
    method: "OPTIONS",
    headers: {
      Origin: WEB,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), WEB);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  assert.equal(
    (await call(API, "/auth/refresh", { body: {}, origin: "https://foreign.invalid" })).status,
    403
  );
  assert.equal(
    (await call(WEB, "/api/auth/logout", { body: {}, origin: "https://foreign.invalid" })).status,
    403
  );
});

test("seeded PATIENT: email delivery, OTP, identity and single-use code", async () => {
  const email = "patient.david@example.com";
  const request = await call(API, "/auth/patient/request-otp", { body: { email } });
  assert.equal(request.status, 200);
  assert.equal(request.data.otpCodePreview, undefined);
  assert.equal((await call(API, "/auth/patient/request-otp", { body: { email } })).status, 429);
  const otpCode = await otpFor(email);
  const login = await call(API, "/auth/patient/verify-otp", { body: { email, otpCode } });
  assert.equal(login.status, 200);
  assert.doesNotMatch(
    login.cookies.find((cookie) => cookie.startsWith("ez_refresh=")),
    /Expires=|Max-Age=/i
  );
  const me = await call(API, "/auth/me", { cookie: login.cookie });
  assert.equal(me.data.role, "PATIENT");
  assert.equal(me.data.email, email);
  assert.equal(
    (await call(API, "/auth/patient/verify-otp", { body: { email, otpCode } })).status,
    400
  );
  await call(API, "/auth/logout", { cookie: login.cookie, body: {} });
});

test("three incorrect OTP attempts lock verification and resends", async () => {
  const email = "auth-lock-" + Date.now() + "@example.com";
  assert.equal((await call(API, "/auth/patient/request-otp", { body: { email } })).status, 200);
  const otpCode = await otpFor(email);
  const wrong = otpCode === "000000" ? "999999" : "000000";
  for (const expected of [400, 400, 429]) {
    assert.equal(
      (await call(API, "/auth/patient/verify-otp", { body: { email, otpCode: wrong } })).status,
      expected
    );
  }
  assert.equal(
    (await call(API, "/auth/patient/verify-otp", { body: { email, otpCode } })).status,
    429
  );
  assert.equal((await call(API, "/auth/patient/request-otp", { body: { email } })).status, 429);
});

test("dashboard proxy restores the session with HttpOnly cookies and exposes identity only", async () => {
  const [, email, password] = staff.find(([role]) => role === "RECEPTIONIST");
  const login = await call(WEB, "/api/auth/staff/login", {
    body: { email, password },
    origin: WEB,
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.accessToken, undefined);
  const refreshCookie = login.cookie.split("; ").find((cookie) => cookie.startsWith("ez_refresh="));
  const restored = await call(WEB, "/api/auth/session", {
    body: {},
    cookie: refreshCookie,
    origin: WEB,
  });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.role, "RECEPTIONIST");
  assert.ok(restored.cookies.length >= 2);
  const entry = await call(WEB, "/dashboard", { cookie: restored.cookie });
  assert.ok([200, 307].includes(entry.status));
  assert.ok(
    entry.headers.get("location")?.endsWith("/dashboard/nurse") ||
      String(entry.data).includes("/dashboard/nurse")
  );
  const logout = await call(WEB, "/api/auth/logout", {
    cookie: restored.cookie,
    body: {},
    origin: WEB,
  });
  assert.equal(logout.status, 200);
  assert.equal(
    (await call(WEB, "/api/auth/session", { body: {}, cookie: restored.cookie, origin: WEB }))
      .status,
    401
  );
});

test("expired access JWT is rejected and the dashboard restores via refresh cookie", async () => {
  const [, email, password] = staff[2];
  const login = await call(API, "/auth/staff/login", { body: { email, password } });
  const [header, payload] = login.data.accessToken.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  const expiredPayload = Buffer.from(JSON.stringify({ ...claims, exp: 1 })).toString("base64url");
  const message = header + "." + expiredPayload;
  const expired =
    message + "." + createHmac("sha256", TEST_SECRET).update(message).digest("base64url");
  const refreshCookie = login.cookie.split("; ").find((entry) => entry.startsWith("ez_refresh="));
  const cookie = "ez_access=" + expired + "; " + refreshCookie;
  assert.equal((await call(API, "/auth/me", { cookie })).status, 401);
  const restored = await call(WEB, "/api/auth/session", { body: {}, cookie, origin: WEB });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.role, "NURSE");
  await call(WEB, "/api/auth/logout", { body: {}, cookie: restored.cookie, origin: WEB });
});
