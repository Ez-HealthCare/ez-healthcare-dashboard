import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint();
async function rules(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

test("lint rejects direct fetch and Axios outside the transport module", async () => {
  assert.ok(
    (
      await rules('export const call = () => fetch("/api/auth/me");', "services/example.ts")
    ).includes("no-restricted-globals")
  );
  assert.ok(
    (
      await rules(
        'export const call = () => window.fetch("/api/auth/me");',
        "components/example.tsx"
      )
    ).includes("no-restricted-syntax")
  );
  assert.ok(
    (
      await rules(
        'import axios from "axios"; export const call = axios.get;',
        "services/example.ts"
      )
    ).includes("no-restricted-imports")
  );
});

test("lint prevents components from importing services and hooks from importing HTTP", async () => {
  assert.ok(
    (
      await rules(
        'import { authService } from "@/services/auth.service"; export const call = authService.logout;',
        "components/example.tsx"
      )
    ).includes("no-restricted-imports")
  );
  assert.ok(
    (
      await rules(
        'import { http } from "@/lib/api/http"; export const call = http.get;',
        "hooks/example.ts"
      )
    ).includes("no-restricted-imports")
  );
});

test("lint permits hook-to-service and server-page-to-loader boundaries", async () => {
  assert.ok(
    !(
      await rules(
        'import { getDashboardSession } from "@/services/auth-session.server"; export const call = getDashboardSession;',
        "app/dashboard/page.tsx"
      )
    ).includes("no-restricted-imports")
  );
  assert.ok(
    !(
      await rules(
        'import { authService } from "@/services/auth.service"; export const call = authService.logout;',
        "hooks/example.ts"
      )
    ).includes("no-restricted-imports")
  );
  assert.ok(
    !(
      await rules(
        'import { getPatientAccess } from "@/services/auth-session.server"; export const call = getPatientAccess;',
        "app/dashboard/patient/[[...section]]/page.tsx"
      )
    ).includes("no-restricted-imports")
  );
});
