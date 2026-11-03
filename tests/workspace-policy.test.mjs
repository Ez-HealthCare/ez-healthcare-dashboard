import assert from "node:assert/strict";
import { test } from "node:test";
import {
  doctorLegacyDestination,
  doctorInitialView,
  doctorResultVisits,
  selectDoctorVisit,
} from "../lib/doctor-navigation.ts";
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
  assert.deepEqual(Object.keys(WORKSPACES), [
    "patient",
    "receptionist",
    "nurse",
    "doctor",
    "admin",
  ]);
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

test("navigation defines visible sections with explicit Doctor legacy aliases", () => {
  for (const [workspace, config] of Object.entries(WORKSPACES)) {
    assert.equal(isWorkspace(workspace), true);
    for (const [section] of config.navigation)
      assert.equal(isWorkspaceSection(workspace, section), true);
    for (const section of ["unknown", "settings/extra", "__proto__", "constructor"])
      assert.equal(isWorkspaceSection(workspace, section), false);
  }
  for (const workspace of ["unknown", "__proto__", "constructor", "ADMIN"])
    assert.equal(isWorkspace(workspace), false);
  assert.deepEqual(
    WORKSPACES.receptionist.navigation.map(([key]) => key),
    ["", "queue", "appointments", "requests", "records"]
  );
  assert.deepEqual(
    WORKSPACES.nurse.navigation.map(([key]) => key),
    ["", "queue", "history", "records"]
  );
  assert.deepEqual(WORKSPACES.doctor.navigation, [
    ["", "Bàn khám"],
    ["results", "Kết quả CLS"],
    ["history", "Lịch sử khám bệnh"],
  ]);
  assert.equal(isWorkspaceSection("doctor", "queue"), true);
  assert.equal(isWorkspaceSection("doctor", "consultation"), true);
  assert.equal(isWorkspaceSection("doctor", "history"), true);
  assert.equal(
    WORKSPACES.doctor.navigation.some(([, label]) => label === "Hồ sơ bệnh nhân"),
    false
  );
});

test("Doctor legacy routes preserve the visit and open only valid workflow views", () => {
  assert.equal(
    doctorLegacyDestination("queue", { visitId: "visit-a" }),
    "/dashboard/doctor?visitId=visit-a"
  );
  assert.equal(
    doctorLegacyDestination("consultation", { visitId: "visit-a" }),
    "/dashboard/doctor?visitId=visit-a&view=clinical"
  );
  assert.equal(doctorLegacyDestination("results", {}), undefined);
  assert.equal(doctorInitialView("results", "clinical"), "results");
  assert.equal(doctorInitialView("", "clinical"), "clinical");
  assert.equal(doctorInitialView("", "constructor"), "dashboard");
});

test("CLS navigation never selects a waiting consultation or substitutes a missing requested visit", () => {
  const rows = [
    { visitId: "waiting", status: "CLINIC_WAITING" },
    { visitId: "exam", status: "IN_EXAMINATION", currentDoctor: { id: "doctor" } },
    { visitId: "pending", status: "PARACLINICAL_PENDING" },
    { visitId: "ready", status: "RE_EXAM_CALLING" },
  ];
  assert.deepEqual(
    doctorResultVisits(rows).map((row) => row.visitId),
    ["pending", "ready"]
  );
  assert.equal(selectDoctorVisit(rows, "doctor", "", "", undefined, true).visitId, "ready");
  assert.equal(selectDoctorVisit(rows.slice(0, 2), "doctor", "", "", undefined, true), undefined);
  assert.equal(selectDoctorVisit(rows, "doctor", "missing", "missing", undefined, true), undefined);
  assert.equal(selectDoctorVisit(rows, "doctor", "", "").visitId, "exam");
  assert.equal(selectDoctorVisit([], "doctor", "exam", "", rows[1]).visitId, "exam");
});
