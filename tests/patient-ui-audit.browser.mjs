import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const repo = fileURLToPath(new URL("..", import.meta.url));
const output =
  process.env.PATIENT_UI_AUDIT_OUTPUT || join(tmpdir(), "ez-healthcare-patient-stage1-audit");
await mkdir(output, { recursive: true });
const id = "11111111-1111-4111-8111-111111111111";
const long = "ThongTinDaiKhongCoKhoangTrang".repeat(10);
let hold = false;
let mode = "normal",
  status = "PARACLINICAL_PENDING",
  ticketStatus = "ACTIVE";
const person = () => ({
  id: "patient",
  name: mode === "long" ? long : "Nguyễn Minh Anh",
  email: mode === "long" ? long + "@fixture.test" : "patient@fixture.test",
  profileComplete: true,
  role: "PATIENT",
  gender: "FEMALE",
  phone: "0901234567",
  dateOfBirth: "1990-05-20",
  nationalId: "070000000001",
  insuranceCardNumber: "DN4012345678901",
  allergies: mode === "long" ? [long, "Penicillin"] : ["Penicillin"],
});
const room = () => ({
  code: mode === "long" ? long : "P.101",
  name: mode === "long" ? long : "Nội tổng quát",
});
const visit = () => ({
  visitId: id,
  status,
  ticketStatus,
  hallTicketNumber: "A-014",
  clinicTicketNumber: mode === "long" ? long : "K-014",
  businessDate: "2026-11-07",
  intakeCompleted: true,
  canPatientReissue: false,
  room: room(),
});
const dossier = () => ({
  ...visit(),
  createdAt: "2026-11-07T03:00:00Z",
  updatedAt: "2026-11-07T03:24:00Z",
  patient: person(),
  isVerified: true,
  currentDepartment: room(),
  currentDoctor: { id: "doctor", name: mode === "long" ? long : "BS. Trần Văn An" },
  chiefComplaint: mode === "long" ? long : "Thông tin kiểm thử giao diện",
  steps:
    mode === "empty"
      ? []
      : [
          {
            stepId: "s1",
            sequenceOrder: 1,
            status: "COMPLETED",
            isReExam: false,
            department: room(),
          },
          {
            stepId: "s2",
            sequenceOrder: 2,
            status: "IN_PROGRESS",
            isReExam: false,
            department: { code: "P.203", name: mode === "long" ? long : "Chẩn đoán hình ảnh" },
          },
          { stepId: "s3", sequenceOrder: 3, status: "PENDING", isReExam: true, department: room() },
        ],
  prescription: {
    id: "p",
    icd10Code: "TEST",
    icd10Name: mode === "long" ? long : "Kết luận mô phỏng",
    signedAt: "2026-11-07T03:24:00Z",
    notes: mode === "long" ? long : "Lời dặn kiểm thử, không dùng điều trị.",
    revisitDate: "2026-11-20",
    items: [
      {
        medicationName: mode === "long" ? long : "Thuốc mô phỏng",
        dosage: mode === "long" ? long : "1 đơn vị/lần",
        route: "ORAL",
        frequency: "1 lần/ngày",
        quantity: 3,
        durationDays: 3,
        instructions: mode === "long" ? long : "Dữ liệu mô phỏng",
      },
    ],
  },
});
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const reply = (data, code = 200) => res.writeHead(code).end(JSON.stringify(data));
  const u = new URL(req.url, "http://fixture");
  for await (const _chunk of req) {
  }
  if (u.pathname === "/api/auth/me") return reply(person());
  if (hold) await delay(1000);
  if (u.pathname === "/api/reception-requests/me/current") return reply(null);
  if (u.pathname === "/api/users/me/profile")
    return mode === "errors" ? reply({ message: "Lỗi hồ sơ mô phỏng" }, 503) : reply(person());
  if (u.pathname === "/api/visits/me/current")
    return mode === "errors"
      ? reply({ message: "Lỗi lượt khám mô phỏng" }, 503)
      : reply(mode === "empty" ? null : visit());
  if (u.pathname === "/api/visits/me/history") {
    if (mode === "errors") return reply({ message: "Lỗi lịch sử mô phỏng" }, 503);
    const page = Number(u.searchParams.get("page") || 1),
      total = mode === "empty" ? 0 : 12;
    return reply({
      items: Array.from({ length: Math.max(0, Math.min(10, total - (page - 1) * 10)) }, (_, i) => ({
        ...dossier(),
        visitId: i === 0 ? id : `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
        status: u.searchParams.get("status") || "COMPLETED",
        room: room(),
        doctor: dossier().currentDoctor,
        conclusion: { icd10Name: mode === "long" ? long : "Kết luận mô phỏng" },
      })),
      page,
      pageSize: 10,
      total,
    });
  }
  if (u.pathname === `/api/visits/${id}`)
    return mode === "errors" ? reply({ message: "Lỗi chi tiết mô phỏng" }, 503) : reply(dossier());
  if (u.pathname === "/api/notifications")
    return mode === "errors"
      ? reply({ message: "Lỗi thông báo mô phỏng" }, 503)
      : reply(
          mode === "empty"
            ? []
            : [
                {
                  id: "n",
                  visitId: id,
                  type: "UPDATE",
                  title: mode === "long" ? long : "Cập nhật lượt khám",
                  message: mode === "long" ? long : "Theo dõi hướng dẫn của nhân viên y tế.",
                  createdAt: "2026-11-07T03:24:00Z",
                  readAt: null,
                },
              ]
        );
  return reply({ success: true });
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
const report = { checks: [], issues: [], samples: [] };
try {
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await delay(200);
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addCookies([{ name: "ez_access", value: "valid.PATIENT", url: origin }]);
  const p = await context.newPage();
  const pageErrors = [];
  p.on("pageerror", (e) => pageErrors.push(e.message));
  const routes = [
    ["home", ""],
    ["visits", "/visits"],
    ["records", "/records"],
    ["detail", `/records?visitId=${id}`],
    ["profile", "/profile"],
  ];
  hold = true;
  for (const [, path] of routes) {
    await p.goto(origin + "/dashboard/patient" + path);
    await p.locator("h1").waitFor();
    assert.equal(await p.locator("h1").count(), 1);
    assert.ok(
      !(await p.getByRole("button", { name: "Tạo yêu cầu tiếp nhận", exact: true }).isVisible())
    );
  }
  hold = false;
  report.checks.push({ loadingHeadings: true });
  for (const scenario of ["normal", "long", "empty", "errors"]) {
    mode = scenario;
    for (const [name, path] of routes) {
      await p.goto(origin + "/dashboard/patient" + path);
      await p.waitForTimeout(450);
      await p
        .locator(".ant-skeleton")
        .first()
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.waitForTimeout(60);
        const scan = await p.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          width: document.documentElement.scrollWidth,
          h1: document.querySelectorAll("h1").length,
          elements: [...document.querySelectorAll("main *, header *")]
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return (
                r.width && r.height && r.bottom > 0 && (r.right > innerWidth + 1 || r.left < -1)
              );
            })
            .slice(0, 7)
            .map((e) => ({
              tag: e.tagName,
              cls: typeof e.className === "string" ? e.className : "",
              text: (e.textContent || "").slice(0, 45),
            })),
        }));
        report.samples.push({ scenario, page: name, viewport: width, ...scan });
        if (scan.overflow)
          report.issues.push({
            kind: "overflow",
            scenario,
            page: name,
            viewport: width,
            elements: scan.elements,
          });
        if (scan.h1 !== 1)
          report.issues.push({
            kind: "heading",
            scenario,
            page: name,
            viewport: width,
            count: scan.h1,
          });
        if (scenario === "normal" && width === 1440) {
          const box = await p
            .locator('main > section, main > div[class*="profilePage"]')
            .last()
            .boundingBox();
          if (
            ["visits", "records", "detail", "profile"].includes(name) &&
            box &&
            Math.abs(box.width - 1120) > 1
          )
            report.issues.push({ kind: "container", page: name, width: box.width });
          if (["visits", "records", "detail", "profile"].includes(name) && box) {
            const crumb = await p.locator("main > div[class*=breadcrumb]").boundingBox();
            if (crumb && Math.abs(crumb.x - box.x) > 1)
              report.issues.push({ kind: "breadcrumb", page: name, offset: crumb.x - box.x });
          }
        }
        if (scenario === "normal" && width === 390) {
          const touch = await p
            .locator(
              "main .ant-pagination-item, main input:not([type=hidden]):not(.ant-select-input), main .ant-select"
            )
            .evaluateAll((es) =>
              es
                .filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.width && r.height && r.height < 43.5;
                })
                .map((e) => ({
                  tag: e.tagName,
                  cls: e.className,
                  height: e.getBoundingClientRect().height,
                }))
            );
          if (touch.length)
            report.issues.push({ kind: "touch-target", page: name, elements: touch });
        }
        if ((scenario === "normal" || scenario === "long") && (width === 390 || width === 1440))
          await p.screenshot({
            path: output + `/${scenario}-${name}-${width}.png`,
            fullPage: name === "profile" || name === "detail",
          });
      }
    }
  }
  mode = "normal";
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(origin + "/dashboard/patient");
  await p.keyboard.press("Tab");
  report.checks.push({ keyboardFirstFocus: await p.locator(":focus").innerText() });
  await p.getByRole("button", { name: "Tài khoản bệnh nhân", exact: true }).click();
  await p.keyboard.press("Escape");
  report.checks.push({
    avatarEscapeClosed:
      (await p
        .getByRole("button", { name: "Tài khoản bệnh nhân", exact: true })
        .getAttribute("aria-expanded")) === "false",
  });
  await p.goto(origin + "/dashboard/patient/visits?page=999");
  await p.waitForTimeout(400);
  const recover = p.getByRole("button", { name: "Về trang đầu", exact: true });
  report.checks.push({ outOfRangeRecovery: await recover.isVisible() });
  await recover.click();
  await p.waitForURL("**/dashboard/patient/visits");
  mode = "errors";
  await p.goto(origin + "/dashboard/patient");
  await p.waitForTimeout(400);
  report.checks.push({
    visitErrorJourneyUnavailable: (await p.locator("#patient-journey").innerText()).includes(
      "Chưa thể tải hành trình"
    ),
  });
  mode = "normal";
  ticketStatus = "EXPIRED";
  status = "CLINIC_WAITING";
  await p.goto(origin + "/dashboard/patient");
  await p.waitForTimeout(400);
  report.checks.push({
    expiredBadgeCorrect: await p
      .getByRole("region", { name: "Lượt khám hiện tại", exact: true })
      .getByRole("status")
      .getByText("Vé hết hiệu lực", { exact: true })
      .isVisible(),
  });
  mode = "normal";
  ticketStatus = "ACTIVE";
  status = "PARACLINICAL_PENDING";
  await p.goto(origin + "/dashboard/patient");
  await p.waitForTimeout(400);
  const colors = await p
    .locator(
      'main h1, main [class*="status"],main [class*="primaryAction"],main [class*="ticket"] strong, main [class*="stepStatus"]'
    )
    .evaluateAll((es) =>
      es
        .filter((e) => e.getBoundingClientRect().width)
        .map((e) => {
          const cs = getComputedStyle(e);
          let bg = e;
          while (bg && getComputedStyle(bg).backgroundColor === "rgba(0, 0, 0, 0)")
            bg = bg.parentElement;
          return {
            fg: cs.color,
            bg: bg ? getComputedStyle(bg).backgroundColor : "rgb(255,255,255)",
            size: parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight),
            text: (e.textContent || "").slice(0, 30),
          };
        })
    );
  const lum = (rgb) =>
    rgb
      .match(/[0-9.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((x) => x / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
      .reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
  for (const c of colors) {
    const ls = [lum(c.fg), lum(c.bg)].sort((a, b) => a - b);
    const ratio = (ls[1] + 0.05) / (ls[0] + 0.05),
      min = c.size >= 24 || (c.size >= 18.67 && c.weight >= 700) ? 3 : 4.5;
    if (ratio < min) report.issues.push({ kind: "contrast", ...c, ratio });
  }
  report.checks.push({ contrastPairs: colors.length });
  report.pageErrors = pageErrors;
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  process.stdout.write(
    JSON.stringify({
      samples: report.samples.length,
      issues: report.issues,
      checks: report.checks,
      pageErrors,
      output,
    })
  );
  assert.equal(report.issues.length, 0, "Audit issues must be fixed");
  assert.equal(pageErrors.length, 0);
  for (const check of report.checks)
    for (const [key, value] of Object.entries(check)) {
      if (typeof value === "boolean") assert.equal(value, true, key);
    }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  api.close();
}
