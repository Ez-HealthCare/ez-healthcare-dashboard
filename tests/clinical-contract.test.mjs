import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HttpError } from "../lib/api/http.ts";
import { clinicalErrorMessage } from "../lib/clinical-error.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("patient UI uses the live queue contract without symptom self-declaration", async () => {
  const [patient, service] = await Promise.all([
    read("components/patient/patient-dashboard.tsx"),
    read("services/clinical.service.ts"),
  ]);
  assert.match(service, /visits\/hall-ticket/);
  assert.match(service, /visits\/me\/current/);
  assert.match(patient, /Cấp lại số tiếp nhận/);
  assert.doesNotMatch(patient, /Khai triệu chứng/);
});

test("staff UI exposes intake, assignment, scheduled-room queue and examination start", async () => {
  const [panel, service] = await Promise.all([
    read("components/clinical/staff-clinical-panel.tsx"),
    read("services/clinical.service.ts"),
  ]);
  for (const label of ["Ghi thông tin bệnh", "Phân phòng", "Tiếp nhận khám"]) {
    assert.match(panel, new RegExp(label));
  }
  for (const endpoint of ["/intake", "/assign-clinic", "/doctor/rooms", "/start-exam"]) {
    assert.ok(service.includes(endpoint));
  }
});

test("clinical BFF is allowlisted and preserves idempotency keys", async () => {
  const proxy = await read("services/clinical-proxy.server.ts");
  assert.match(proxy, /const ALLOWED/);
  assert.match(proxy, /Idempotency-Key/);
  assert.doesNotMatch(proxy, /\^users/);
  assert.doesNotMatch(proxy, /\^admin/);
  assert.match(proxy, /reception\\\/\(queue\|expired\)/);
  assert.match(proxy, /path \+ query/);
});

test("Phase C presents structured clinical failures and expired-ticket recovery", async () => {
  const [messages, patient, staff, service] = await Promise.all([
    read("lib/clinical-error.ts"),
    read("components/patient/patient-dashboard.tsx"),
    read("components/clinical/staff-clinical-panel.tsx"),
    read("services/clinical.service.ts"),
  ]);
  for (const code of [
    "QUEUE_CLOSED",
    "TICKET_EXPIRED",
    "ROOM_QUOTA_REACHED",
    "VISIT_STATE_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "ROOM_ACCESS_DENIED",
  ]) {
    assert.match(messages, new RegExp(code));
  }
  assert.match(patient, /Lượt đã hết hiệu lực/);
  assert.match(staff, /Lượt hết hạn/);
  assert.match(service, /visits\/reception\/expired/);
  assert.match(service, /reissueExpiredTicket/);
});

test("clinical validation errors stay readable and intake ranges match the API", async () => {
  assert.equal(
    clinicalErrorMessage(new HttpError(400, { message: ["first failure", "second failure"] })),
    "first failure; second failure"
  );

  const staff = await read("components/clinical/staff-clinical-panel.tsx");
  for (const range of [
    /bloodPressureDiastolic[\s\S]*?min: 30, max: 160/,
    /heartRate[\s\S]*?min: 30, max: 240/,
    /temperature[\s\S]*?min: 34, max: 43/,
    /respiratoryRate[\s\S]*?min: 8, max: 60/,
  ]) {
    assert.match(staff, range);
  }
  assert.match(staff, /Đã chuyển cấp cứu/);
  assert.match(staff, /Không phân phòng khám thường/);
});
