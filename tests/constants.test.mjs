import assert from "node:assert/strict";
import { test } from "node:test";
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
