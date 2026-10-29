import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { http, HttpError } from "../lib/api/http.ts";
import { isUserProfile } from "../lib/auth.ts";

let baseURL;
let unauthorizedRequests = 0;
let redirectTargets = 0;
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/unauthorized") {
    unauthorizedRequests++;
    res.writeHead(401).end(JSON.stringify({ message: "Invalid session" }));
  } else if (req.url === "/redirect") {
    res.writeHead(302, { Location: "/redirect-target" }).end("{}");
  } else if (req.url === "/redirect-target") {
    redirectTargets++;
    res.end("{}");
  } else if (req.url === "/bad-json") {
    res.end("not-json");
  } else if (req.url === "/slow") {
    setTimeout(() => res.end("{}"), 200);
  } else {
    res.setHeader("Set-Cookie", [
      "ez_access=access; HttpOnly; Path=/",
      "ez_refresh=refresh; HttpOnly; Path=/",
    ]);
    setTimeout(
      () => res.end(JSON.stringify({ cookie: req.headers.cookie || "" })),
      req.headers.cookie === "user=A" ? 20 : 0
    );
  }
});

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("concurrent server requests keep cookies isolated and preserve both Set-Cookie headers", async () => {
  const [a, b] = await Promise.all([
    http.get("/echo", { baseURL, headers: { Cookie: "user=A" } }),
    http.get("/echo", { baseURL, headers: { Cookie: "user=B" } }),
  ]);
  assert.equal(a.data.cookie, "user=A");
  assert.equal(b.data.cookie, "user=B");
  assert.equal(a.headers["set-cookie"].length, 2);
  assert.equal((await http.get("/echo", { baseURL })).data.cookie, "");
  assert.equal(http.defaults.headers.common.Cookie, undefined);
});

test("HTTP errors are normalized without leaking Axios request config or retrying 401", async () => {
  await assert.rejects(
    http.post("/unauthorized", { password: "do-not-leak" }, { baseURL }),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 401);
      assert.equal(error.data.message, "Invalid session");
      assert.equal(error.config, undefined);
      assert.equal(error.request, undefined);
      assert.ok(!JSON.stringify(error).includes("do-not-leak"));
      return true;
    }
  );
  assert.equal(unauthorizedRequests, 1);
});

test("server services can explicitly relay non-2xx responses", async () => {
  const response = await http.get("/unauthorized", { baseURL, validateStatus: () => true });
  assert.equal(response.status, 401);
});

test("upstream redirects are not followed", async () => {
  await assert.rejects(
    http.get("/redirect", { baseURL }),
    (error) => error instanceof HttpError && error.status === 302
  );
  assert.equal(redirectTargets, 0);
});

test("timeouts and malformed JSON fail closed", async () => {
  await assert.rejects(
    http.get("/slow", { baseURL, timeout: 20 }),
    (error) => error instanceof HttpError && error.status === 0
  );
  await assert.rejects(http.get("/bad-json", { baseURL }), (error) => error instanceof HttpError);
});

test("identity boundary rejects malformed users and unknown/inherited roles", () => {
  const user = {
    id: "id",
    email: "patient@example.com",
    name: null,
    role: "PATIENT",
    profileComplete: true,
  };
  assert.ok(isUserProfile(user));
  for (const bad of [
    null,
    {},
    { ...user, role: "__proto__" },
    { ...user, role: "UNKNOWN" },
    { ...user, email: null },
    { ...user, profileComplete: undefined },
  ]) {
    assert.equal(isUserProfile(bad), false);
  }
});
