import assert from "node:assert/strict";
import { test } from "node:test";
import {
  patientGuidance,
  patientStepState,
  patientVisitStatus,
  patientJourneyFocus,
  patientStepDescription,
  patientJourneyStepState,
} from "../lib/patient-journey.ts";

const visit = (status, ticketStatus = "ACTIVE") => ({ status, ticketStatus });
test("patient guidance distinguishes a reception call, a paused ticket and an expired ticket", () => {
  assert.match(patientGuidance(visit("HALL_WAITING", "CALLED")).title, /Mời bạn đến/);
  assert.match(patientGuidance(visit("HALL_WAITING", "PAUSED")).title, /tạm bỏ qua/);
  assert.match(patientGuidance(visit("CLINIC_WAITING", "EXPIRED")).title, /hết hiệu lực/);
});
test("final visits keep their outcome even when an old ticket expired", () => {
  assert.equal(patientGuidance(visit("COMPLETED", "EXPIRED")).tone, "success");
  assert.match(patientGuidance(visit("CANCELLED", "EXPIRED")).title, /hủy/);
  assert.match(patientGuidance(visit("EMERGENCY_DISPATCHED")).title, /cấp cứu/);
});
test("diagnostic waiting does not claim that the patient has been called back", () => {
  assert.match(patientGuidance(visit("PARACLINICAL_PENDING")).title, /chờ kết quả/);
  assert.match(patientGuidance(visit("RE_EXAM_CALLING")).title, /Quay lại/);
  assert.equal(patientVisitStatus(visit("PARACLINICAL_PENDING")), "Chưa đủ kết quả CLS");
});
test("only completed steps are complete; skipped and unknown states remain distinct", () => {
  assert.equal(patientStepState("COMPLETED").tone, "done");
  assert.equal(patientStepState("SKIPPED").tone, "skipped");
  assert.equal(patientStepState("IN_PROGRESS").tone, "current");
  assert.equal(patientStepState("WAITING").tone, "waiting");
  assert.equal(patientStepState("PENDING").tone, "pending");
  assert.equal(patientStepState("FUTURE_STATUS").label, "Đang cập nhật");
});

test("ticket badges agree with expired or paused guidance, without overriding final outcomes", () => {
  assert.equal(patientVisitStatus(visit("CLINIC_WAITING", "EXPIRED")), "Vé hết hiệu lực");
  assert.equal(patientVisitStatus(visit("HALL_WAITING", "PAUSED")), "Tạm bỏ qua tại quầy");
  assert.equal(patientVisitStatus(visit("COMPLETED", "EXPIRED")), "Đã hoàn tất khám");
});

const flowVisit = (status = "PARACLINICAL_PENDING", ticketStatus = "ACTIVE") => ({
  ...visit(status, ticketStatus),
  visitId: "visit-a",
  room: { code: "P.101", name: "Nội tổng quát" },
});
const step = (id, status, isReExam = false, code = "P.203") => ({
  stepId: id,
  status,
  isReExam,
  sequenceOrder: Number(id.slice(1)) || 1,
  department: {
    code,
    name: isReExam ? "Nội tổng quát" : "Xét nghiệm",
    floor: 2,
    roomType: isReExam ? "CONSULTATION" : "LABORATORY",
  },
});
const snapshot = (v, steps) => ({ visitId: v.visitId, status: v.status, steps });

test("working diagnostic step replaces the consultation room as the tracking focus", () => {
  const v = flowVisit();
  const s = step("s1", "IN_PROGRESS");
  const focus = patientJourneyFocus(v, snapshot(v, [s, step("s2", "PENDING", true)]));
  assert.equal(focus.stepId, "s1");
  assert.equal(focus.destination.code, "P.203");
  assert.equal(focus.destination.floor, 2);
  assert.match(focus.title, /Đang thực hiện/);
});
test("waiting is distinct from pending and pending alone never identifies a ready destination", () => {
  const v = flowVisit();
  assert.match(patientJourneyFocus(v, snapshot(v, [step("s1", "WAITING")])).title, /Chờ thực hiện/);
  const pending = patientJourneyFocus(v, snapshot(v, [step("s1", "PENDING")]));
  assert.equal(pending.stepId, undefined);
  assert.equal(pending.destination.code, "P.101");
  assert.match(pending.title, /Chờ hướng dẫn/);
});
test("parallel diagnostic steps do not arbitrarily choose a room", () => {
  const v = flowVisit();
  const focus = patientJourneyFocus(
    v,
    snapshot(v, [step("s1", "IN_PROGRESS"), step("s2", "IN_PROGRESS", false, "P.204")])
  );
  assert.equal(focus.stepId, undefined);
  assert.match(focus.title, /2 chỉ định/);
});
test("completed diagnostics still wait for authoritative return status", () => {
  const v = flowVisit();
  const focus = patientJourneyFocus(
    v,
    snapshot(v, [step("s1", "COMPLETED"), step("s2", "PENDING", true)])
  );
  assert.equal(focus.stepId, undefined);
  assert.match(focus.title, /Chờ thông báo/);
});
test("skipped diagnostics do not count as ready for return", () => {
  const v = flowVisit();
  const focus = patientJourneyFocus(
    v,
    snapshot(v, [step("s1", "COMPLETED"), step("s2", "SKIPPED"), step("s3", "PENDING", true)])
  );
  assert.doesNotMatch(focus.title, /Chờ thông báo quay lại/);
  assert.equal(focus.stepId, undefined);
});
test("dossier status or identity mismatches never supply a step destination", () => {
  const v = flowVisit();
  const data = snapshot(v, [step("s1", "IN_PROGRESS")]);
  assert.equal(patientJourneyFocus(v, { ...data, status: "IN_EXAMINATION" }).stepId, undefined);
  assert.equal(patientJourneyFocus(v, { ...data, visitId: "foreign" }).stepId, undefined);
});
test("return and in-progress re-examination preserve a separate step at the same clinic", () => {
  const v = flowVisit("RE_EXAM_CALLING");
  const s = step("s2", "PENDING", true, "P.101");
  assert.equal(patientJourneyFocus(v, snapshot(v, [step("s1", "COMPLETED"), s])).stepId, "s2");
  assert.equal(patientJourneyStepState(s, v).label, "Chờ bác sĩ tiếp nhận");
  assert.equal(patientJourneyStepState(s, v, false).label, "Chưa thực hiện");
  const active = flowVisit("IN_EXAMINATION");
  assert.match(
    patientJourneyFocus(active, snapshot(active, [{ ...s, status: "IN_PROGRESS" }])).title,
    /đọc kết quả và tái khám/
  );
});
test("ended and expired visits never highlight an unfinished step", () => {
  for (const v of [
    flowVisit("CANCELLED"),
    flowVisit("COMPLETED"),
    flowVisit("EMERGENCY_DISPATCHED"),
    flowVisit("PARACLINICAL_PENDING", "EXPIRED"),
  ]) {
    assert.equal(
      patientJourneyFocus(v, snapshot(v, [step("s1", "IN_PROGRESS")])).stepId,
      undefined
    );
  }
});
test("stale or stopped step details never instruct the patient to continue", () => {
  const s = step("s1", "WAITING", true);
  assert.match(
    patientStepDescription(s, flowVisit("RE_EXAM_CALLING"), false),
    /đang được cập nhật/
  );
  assert.match(patientStepDescription(s, flowVisit("CANCELLED")), /không phải hướng dẫn/);
});
