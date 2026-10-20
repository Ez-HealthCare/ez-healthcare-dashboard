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
