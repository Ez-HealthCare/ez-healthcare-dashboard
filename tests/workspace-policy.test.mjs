import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WORKSPACES,
  canAccessWorkspace,
  isWorkspace,
  isWorkspaceSection,
  workspaceForRole,
} from "../lib/constants/workspaces.ts";

test("five workspaces use an explicit deny-by-default role matrix", () => {
  const roles = {
    PATIENT: "patient",
    NURSE: "nurse",
    RECEPTIONIST: "receptionist",
    DOCTOR: "doctor",
    ADMIN: "admin",
    LAB_TECHNICIAN: undefined,
    EMERGENCY_STAFF: undefined,
  };
  assert.deepEqual(Object.keys(WORKSPACES), ["patient", "receptionist", "nurse", "doctor", "admin"]);
  for (const [role, expected] of Object.entries(roles)) {
    assert.equal(workspaceForRole(role), expected);
    for (const workspace of Object.keys(WORKSPACES))
      assert.equal(
        canAccessWorkspace(role, workspace),
        workspace === expected,
        `${role} → ${workspace}`
      );
  }
  for (const role of ["INVALID", "admin", "__proto__", "constructor"]) {
    assert.equal(workspaceForRole(role), undefined);
    assert.equal(canAccessWorkspace(role, "admin"), false);
  }
});

test("the navigation table is also the exact server section allowlist", () => {
  for (const [workspace, config] of Object.entries(WORKSPACES)) {
    assert.equal(isWorkspace(workspace), true);
    for (const [section] of config.navigation)
      assert.equal(isWorkspaceSection(workspace, section), true);
    for (const section of ["unknown", "settings/extra", "__proto__", "constructor"])
      assert.equal(isWorkspaceSection(workspace, section), false);
  }
  for (const workspace of ["unknown", "__proto__", "constructor", "ADMIN"])
    assert.equal(isWorkspace(workspace), false);
  assert.deepEqual(WORKSPACES.receptionist.navigation.map(([key]) => key), ["", "queue", "appointments", "records"]);
  assert.deepEqual(WORKSPACES.nurse.navigation.map(([key]) => key), [""]);
  assert.equal(
    WORKSPACES.doctor.navigation.some(([, label]) => label === "Hồ sơ bệnh nhân"),
    false
  );
});
