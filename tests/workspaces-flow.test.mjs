import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import { after, before, test } from "node:test";

// Real production Next pages/BFF with a local upstream identity fixture.
// This checks workspace authorization/UI, not backend JWT or PostgreSQL integration.
const roles = {
  PATIENT: "patient",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
  DOCTOR: "doctor",
  ADMIN: "admin",
  LAB_TECHNICIAN: undefined,
  EMERGENCY_STAFF: undefined,
};
const sections = {
  patient: ["", "visits", "records"],
  receptionist: ["", "queue", "requests", "records"],
  nurse: [""],
  doctor: ["", "queue", "consultation"],
  admin: ["", "users", "departments", "schedules", "settings"],
};
const cookie = (role) => "ez_access=valid." + role;
const tokenRole = (header, name) =>
  header
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(name + "="))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^valid\./, "");
const api = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (status, data) => res.writeHead(status).end(JSON.stringify(data));
  if (req.url === "/api/auth/logout") {
    res.setHeader("Set-Cookie", [
      "ez_access=; Max-Age=0; Path=/",
      "ez_refresh=; Max-Age=0; Path=/",
    ]);
    return reply(200, { success: true });
  }
  if (req.url === "/api/auth/refresh") {
    const role = tokenRole(req.headers.cookie, "ez_refresh");
    if (!(role in roles)) return reply(401, { message: "Session expired" });
    res.setHeader("Set-Cookie", [
      "ez_access=valid." + role + "; Path=/; HttpOnly",
      "ez_refresh=valid." + role + "; Path=/; HttpOnly",
    ]);
    return reply(200, { expiresIn: 900 });
  }
  if (req.url !== "/api/auth/me") return reply(404, { message: "Not found" });
  const role = tokenRole(req.headers.cookie, "ez_access");
  if (role === "SERVER_ERROR") return reply(503, { message: "Unavailable" });
  if (!(role in roles) && role !== "UNKNOWN") return reply(401, { message: "Invalid session" });
  return reply(200, {
    id: role,
    email: role.toLowerCase() + "@fixture.test",
    name: "Fixture " + role,
    role,
  });
});
let web,
  origin,
  output = "";
before(
  async () => {
    api.listen(0, "127.0.0.1");
    await once(api, "listening");
    const reserve = createServer();
    reserve.listen(0, "127.0.0.1");
    await once(reserve, "listening");
    const port = reserve.address().port;
    await new Promise((resolve) => reserve.close(resolve));
    origin = "http://127.0.0.1:" + port;
    web = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          API_URL: "http://127.0.0.1:" + api.address().port + "/api",
          APP_ORIGIN: origin,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    for (const stream of [web.stdout, web.stderr])
      stream.on("data", (chunk) => {
        output = (output + chunk).slice(-8000);
      });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (web.exitCode !== null) throw new Error("Next stopped: " + output);
      try {
        if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) return;
      } catch {}
      await delay(200);
    }
    throw new Error("Next startup timed out: " + output);
  },
  { timeout: 40_000 }
);
after(async () => {
  if (web && web.exitCode === null) {
    web.kill();
    await Promise.race([once(web, "exit"), delay(3000)]);
  }
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
});
async function page(path, role, rsc = false) {
  // Next 16 validates the RSC cache-busting param. With no router-state/prefetch
  // headers, the expected hash is empty (not absent).
  const response = await fetch(origin + path + (rsc ? "?_rsc" : ""), {
    headers: { ...(role ? { Cookie: cookie(role) } : {}), ...(rsc ? { RSC: "1" } : {}) },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  return { response, body: await response.text() };
}
function redirected(result, target) {
  assert.ok(
    result.response.headers.get("location")?.endsWith(target) ||
      (result.body.includes("NEXT_REDIRECT") && result.body.includes(target)),
    JSON.stringify({
      target,
      status: result.response.status,
      location: result.response.headers.get("location"),
      body: result.body.slice(0, 300),
    })
  );
}

test("entry redirects all supported roles and leaves unsupported accounts without a workspace", async () => {
  redirected(await page("/dashboard"), "/");
  for (const [role, workspace] of Object.entries(roles)) {
    const result = await page("/dashboard", role);
    if (workspace) redirected(result, "/dashboard/" + workspace);
    else {
      assert.match(result.body, /Workspace chưa được hỗ trợ/);
      assert.ok(!result.body.includes('"RoleWorkspace"'));
    }
  }
});

test("every page and RSC request enforces the complete role/workspace matrix", async () => {
  for (const [role, allowed] of Object.entries(roles)) {
    for (const [workspace, tabs] of Object.entries(sections)) {
      for (const tab of tabs) {
        const path = "/dashboard/" + workspace + (tab ? "/" + tab : "");
        for (const rsc of [false, true]) {
          const result = await page(path, role, rsc);
          if (workspace === allowed) {
            assert.equal(
              result.response.status,
              200,
              JSON.stringify({
                role,
                path,
                rsc,
                location: result.response.headers.get("location"),
                body: result.body.slice(0, 300),
              })
            );
            assert.ok(
              result.body.includes(workspace === "patient" ? "PatientDashboard" : "RoleWorkspace")
            );
          } else {
            assert.ok(
              result.body.includes("WorkspaceAccessDenied"),
              role + " must not enter " + path
            );
            assert.ok(!result.body.includes('"PatientDashboard"'));
            assert.ok(!result.body.includes('"RoleWorkspace"'));
          }
        }
      }
    }
  }
});

test("unknown paths, forged identities, expired sessions and upstream failure fail closed", async () => {
  for (const path of [
    "/dashboard/bogus",
    "/dashboard/admin/settings/extra",
    "/dashboard/nurse/constructor",
  ])
    assert.equal((await page(path, "ADMIN")).response.status, 404);
  for (const role of ["FORGED", "SERVER_ERROR", "UNKNOWN"]) {
    const result = await page("/dashboard/admin/settings", role, true);
    assert.ok(!result.body.includes('"RoleWorkspace"'));
    if (role === "FORGED") redirected(result, "/");
    else assert.ok(result.body.includes("SessionError"));
  }
  const recovery = await fetch(origin + "/dashboard/nurse/screening?_rsc", {
    headers: { Cookie: "ez_access=expired; ez_refresh=valid.NURSE", RSC: "1" },
  });
  const body = await recovery.text();
  assert.ok(body.includes("SessionRecovery"));
  assert.ok(!body.includes('"RoleWorkspace"'));
});

test(
  "browser: menus, mobile, keyboard, deep-link refresh, recovery and logout",
  {
    skip: !process.env.WORKSPACE_BROWSER,
    timeout: 120_000,
  },
  async () => {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
    const browser = await chromium.launch({
      channel: process.env.WORKSPACE_BROWSER_CHANNEL || "chrome",
      headless: true,
    });
    await mkdir("test-results", { recursive: true });
    try {
      for (const [role, workspace] of Object.entries(roles)) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
        await context.addCookies([
          { name: "ez_access", value: "valid." + role, url: origin, httpOnly: true },
        ]);
        const screen = await context.newPage();
        const errors = [];
        screen.on("pageerror", (error) => errors.push(error.message));
        await screen.goto(origin + "/dashboard");
        if (!workspace) {
          await screen.getByText("Workspace chưa được hỗ trợ", { exact: true }).waitFor();
          await screen.getByRole("button", { name: "Đăng xuất", exact: true }).click();
          await screen.waitForURL(origin + "/");
          await context.close();
          continue;
        }
        await screen.waitForURL(origin + "/dashboard/" + workspace);
        const navigation = screen.getByRole("navigation", {
          name: workspace === "patient" ? "Điều hướng bệnh nhân" : "Điều hướng workspace",
        });
        const links = await navigation
          .getByRole("link")
          .evaluateAll((items) => items.map((item) => item.getAttribute("href")));
        assert.equal(links.length, sections[workspace].length);
        assert.ok(links.every((href) => href.startsWith("/dashboard/" + workspace)));
        for (let i = 0; i < links.length; i++) {
          await screen.goto(origin + links[i]);
          await navigation.getByRole("link").nth(i).waitFor();
          assert.equal(
            await navigation.getByRole("link").nth(i).getAttribute("aria-current"),
            "page"
          );
        }
        const deep = links.at(-1);
        await screen.reload();
        await navigation.waitFor();
        assert.equal(new URL(screen.url()).pathname, deep);
        if (workspace !== "patient") {
          await context.clearCookies({ name: "ez_access" });
          await context.addCookies([
            { name: "ez_refresh", value: "valid." + role, url: origin, httpOnly: true },
          ]);
          await screen.reload();
          await navigation.waitFor();
          assert.equal(new URL(screen.url()).pathname, deep);
          await screen.goto(origin + "/dashboard/" + workspace);
          await navigation.waitFor();
          await screen.screenshot({
            path: "test-results/workspace-" + role + "-desktop.png",
            fullPage: true,
          });
        }
        await screen.setViewportSize({ width: 375, height: 812 });
        assert.ok(
          await screen.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          role + " mobile overflow"
        );
        if (workspace !== "patient")
          await screen.screenshot({
            path: "test-results/workspace-" + role + "-mobile.png",
            fullPage: true,
          });
        await screen.goto(origin + "/dashboard/" + workspace);
        await navigation.waitFor();
        await screen.keyboard.press("Tab");
        assert.equal(await screen.locator(":focus").textContent(), "Bỏ qua điều hướng");
        await screen.keyboard.press("Enter");
        for (const other of Object.keys(sections).filter((key) => key !== workspace)) {
          await screen.goto(origin + "/dashboard/" + other);
          await screen.getByText("Không có quyền truy cập", { exact: true }).waitFor();
        }
        await screen.goto(origin + "/dashboard/" + workspace);
        await navigation.waitFor();
        await screen
          .getByRole("button", {
            name: workspace === "patient" ? "Tài khoản bệnh nhân" : "Tài khoản của tôi",
          })
          .click();
        await screen.getByRole("button", { name: "Đăng xuất", exact: true }).click();
        await screen.waitForURL(origin + "/");
        await screen.goto(origin + deep);
        await screen.waitForURL(origin + "/");
        assert.deepEqual(errors, []);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
);
