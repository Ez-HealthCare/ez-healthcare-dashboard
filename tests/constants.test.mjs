import {
  formatDate,
  formatTime,
  formatDateTime,
  businessDateInput,
  shortIdentifier,
  shiftLabel,
} from "../lib/display-format.ts";
import { execFileSync } from "node:child_process";
import { notificationLink } from "../lib/notification-link.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  AUTH_COOKIE_NAMES,
  OTP_PATTERN,
  OTP_RESEND_DELAY_MS,
  ROLE_LABELS,
} from "../lib/constants/auth.ts";
import { PATIENT_NAVIGATION, ROUTES } from "../lib/constants/routes.ts";

test("auth constants preserve the API contract and six-digit OTP validation", () => {
  assert.deepEqual(AUTH_COOKIE_NAMES, ["ez_access", "ez_refresh"]);
  assert.equal(OTP_RESEND_DELAY_MS, 60_000);
  assert.equal(Object.keys(ROLE_LABELS).length, 7);
  assert.equal(OTP_PATTERN.test("123456"), true);
  for (const invalid of ["12345", "1234567", "abcdef", "123456\n", " 123456"])
    assert.equal(OTP_PATTERN.test(invalid), false);
});

test("patient navigation remains the server tab allowlist", () => {
  assert.equal(ROUTES.PATIENT, "/dashboard/patient");
  assert.deepEqual(
    PATIENT_NAVIGATION.map(([tab]) => tab),
    ["", "visits", "records"]
  );
});

test("startup keeps local frontend on 3001 and isolated Docker on 3003", async () => {
  const rootFile = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
  const { scripts } = JSON.parse(await rootFile("package.json"));
  assert.equal(scripts.dev, "next dev --port 3001");
  assert.equal(scripts.start, "next start --port 3001");
  assert.match(scripts["test:auth"], /--env-file=\.env/);
  const dockerfile = await rootFile("Dockerfile");
  const command = JSON.parse(dockerfile.match(/^CMD (.+)$/m)[1]);
  assert.deepEqual(command.slice(-3), ["start", "--port", "3000"]);
  const compose = await rootFile("compose.auth.yml");
  assert.ok(compose.includes("127.0.0.1:3003:3000"));
  assert.ok(compose.includes("POSTGRES_PASSWORD: ${AUTH_DB_PASSWORD:?"));
  assert.ok(compose.includes("JWT_ACCESS_SECRET: ${AUTH_JWT_ACCESS_SECRET:?"));
});

test("notification destinations preserve visit context within staff workspaces", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(notificationLink("doctor", id), "/dashboard/doctor?visitId=" + id);
  assert.equal(notificationLink("nurse", id), "/dashboard/nurse/queue?visitId=" + id);
  assert.equal(
    notificationLink("receptionist", id),
    "/dashboard/receptionist/records?search=" + id
  );
  for (const invalid of [
    undefined,
    null,
    "",
    "../admin",
    "https://example.com",
    id + "?role=admin",
  ])
    assert.equal(notificationLink("doctor", invalid), undefined);
});

test("calendar dates preserve DOB and reject impossible dates", () => {
  assert.equal(formatDate("1990-05-20"), "20/05/1990");
  assert.equal(formatDate("2024-02-29"), "29/02/2024");
  for (const value of [undefined, null, "", "bad-date", "2026-02-29", "2026-02-30"])
    assert.equal(formatDate(value), "—");
});
test("clinical timestamps and business days use Vietnam timezone across date boundaries", () => {
  const value = "2026-12-31T18:30:00Z";
  assert.equal(formatTime(value), "01:30");
  assert.equal(formatDateTime(value), "01:30 · 01/01/2027");
  assert.equal(businessDateInput(new Date(value)), "2027-01-01");
  assert.equal(formatTime("2026-11-01T17:00:00Z"), "00:00");
  assert.equal(formatDateTime("invalid"), "—");
});
test("technical identifiers can be shortened without truncating human-facing ticket numbers", () => {
  assert.equal(shortIdentifier("11111111-1111-4111-8111-111111111111"), "11111111…1111");
  for (const value of ["A-014", "CL-102-02", "BN-88204", "DEMO-PATIENT-WITH-LONG-NUMBER"])
    assert.equal(shortIdentifier(value), value);
  assert.equal(shortIdentifier(null), "—");
  assert.equal(shiftLabel("MORNING"), "Ca sáng");
  assert.equal(shiftLabel("AFTERNOON"), "Ca chiều");
});
test("generated CSS and TypeScript design tokens stay synchronized", () => {
  execFileSync(process.execPath, ["scripts/generate-design-tokens.mjs", "--check"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
});
test("self-hosted Be Vietnam Pro includes every configured weight and its license", async () => {
  for (const weight of ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"]) {
    const font = await readFile(
      new URL(`../app/fonts/BeVietnamPro-${weight}.ttf`, import.meta.url)
    );
    assert.equal(font.readUInt32BE(0), 65536);
  }
  const license = await readFile(
    new URL("../app/fonts/BeVietnamPro-OFL.txt", import.meta.url),
    "utf8"
  );
  assert.ok(license.includes("SIL OPEN FONT LICENSE"));
});
