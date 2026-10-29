import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HttpError } from "../lib/api/http.ts";
import { clinicalErrorMessage } from "../lib/clinical-error.ts";
import { news2Preview } from "../lib/news2-preview.ts";
import { FAST_RED_FLAG_REASON, NURSE_CASES } from "../lib/constants/nurse.ts";
import { http } from "../lib/api/http.ts";
import { clinicalService } from "../services/clinical.service.ts";
import { isClinicalProxyPath } from "../services/clinical-proxy.server.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("patient UI uses the live queue contract without symptom self-declaration", async () => {
  const [patient, service] = await Promise.all([
    read("components/patient/patient-dashboard.tsx"),
    read("services/clinical.service.ts"),
  ]);
  assert.match(service, /visits\/hall-ticket/);
  assert.match(service, /visits\/me\/current/);
  assert.match(patient, /Tạo yêu cầu tiếp nhận/);
  assert.match(patient, /PATIENT_RECEPTION_REQUEST/);
});

test("nurse triage endpoint passes the BFF and requires intake before assignment", async () => {
  assert.equal(isClinicalProxyPath("visits/triage/queue"), true);
  assert.equal(isClinicalProxyPath("visits/triage/queue/extra"), false);
  const [panel, service, patient] = await Promise.all([
    read("components/clinical/staff-clinical-panel.tsx"),
    read("services/clinical.service.ts"),
    read("components/patient/patient-dashboard.tsx"),
  ]);
  assert.match(service, /visits\/triage\/queue/);
  assert.match(panel, /useClinicalData\(clinicalActions.triageQueue\)/);
  assert.doesNotMatch(panel, /clinicalActions.verify/);
  assert.match(panel, /disabled=\{!row.intakeCompleted\}/);
  assert.match(
    patient.replace(/\s+/g, " "),
    /Vui lòng chờ điều dưỡng gọi vào phòng sàng lọc đo sinh hiệu/
  );
  assert.match(patient, /Vui lòng di chuyển đến trước cửa phòng khám/);
  assert.match(patient, /visit.data.room.name/);
});

test("NEWS2 preview covers incomplete inputs, risk thresholds, and red flags", () => {
  const normal = {
    respiratoryRate: 16,
    spo2: 98,
    bloodPressureSystolic: 120,
    heartRate: 75,
    temperature: 37,
  };
  assert.deepEqual(news2Preview({}), { score: null, risk: null });
  assert.deepEqual(news2Preview({ spo2: null }), { score: null, risk: null });
  assert.deepEqual(news2Preview({ spo2: 85 }), { score: null, risk: "HIGH" });
  assert.deepEqual(news2Preview(normal), { score: 0, risk: "LOW" });
  assert.deepEqual(news2Preview({ ...normal, respiratoryRate: 24, heartRate: 120 }), {
    score: 4,
    risk: "LOW",
  });
  assert.deepEqual(news2Preview({ ...normal, respiratoryRate: 25, heartRate: 120 }), {
    score: 5,
    risk: "MEDIUM",
  });
  assert.deepEqual(news2Preview({ ...normal, respiratoryRate: 25, heartRate: 135 }), {
    score: 6,
    risk: "MEDIUM",
  });
  assert.deepEqual(
    news2Preview({ ...normal, respiratoryRate: 25, heartRate: 135, temperature: 38.5 }),
    { score: 7, risk: "HIGH" }
  );
  assert.deepEqual(news2Preview({ ...normal, spo2: 85 }), { score: 3, risk: "HIGH" });
  assert.deepEqual(news2Preview({ ...normal, bloodPressureSystolic: 80 }), {
    score: 3,
    risk: "HIGH",
  });
  assert.deepEqual(news2Preview({ ...normal, spo2: 90 }), { score: 3, risk: "LOW" });
  assert.deepEqual(news2Preview({ ...normal, bloodPressureSystolic: 90 }), {
    score: 3,
    risk: "LOW",
  });
});

test("N08: five sample cases fill the requested vitals, symptoms and specialty suggestions", () => {
  assert.equal(NURSE_CASES.length, 5);
  const expected = [
    ["P.105", 120, 80, 84, 38, 96, 20, "3 ngày trước", "Vừa", "3 ngày"],
    ["P.105", 115, 75, 82, 37.8, 95, 19, "hơn 3 tuần trước", "Nặng", "1 tháng"],
    ["P.103", 165, 100, 88, 36.8, 98, 16, "sáng nay", "Vừa", "vài ngày"],
    ["P.106", 135, 85, 90, 37.2, 98, 18, "đột ngột 2 giờ trước", "Nặng", "2 giờ"],
    [undefined, 170, 95, 92, 37, 97, 18, "", "", ""],
  ];
  const complaints = [
    "Ho khạc đờm vàng, sốt, thở rít bỏng rát sau xương ức",
    "Ho khạc đờm lẫn máu kéo dài > 3 tuần, sốt nhẹ về chiều, gầy sút cân",
    "Đau đầu vùng chẩm gáy vào buổi sáng, hoa mắt, chóng mặt, hồi hộp",
    "Cơn đau quặn thận thắt lưng lan bẹn, buồn nôn, đái buốt đái máu",
    "Khởi phát đột ngột méo miệng, liệt yếu nửa người trái, nói ngọng khó hiểu",
  ];
  NURSE_CASES.forEach(({ departmentCode, intake }, index) => {
    assert.deepEqual(
      [
        departmentCode,
        ...[
          "bloodPressureSystolic",
          "bloodPressureDiastolic",
          "heartRate",
          "temperature",
          "spo2",
          "respiratoryRate",
          "symptomOnset",
          "symptomSeverity",
          "symptomDuration",
        ].map((key) => intake[key]),
      ],
      expected[index]
    );
    assert.equal(intake.chiefComplaint, complaints[index]);
    assert.equal(intake.isRedFlag, index === 4);
    assert.ok(news2Preview(intake).score < 7);
  });
  assert.equal(NURSE_CASES[4].intake.redFlagReason, FAST_RED_FLAG_REASON);
});

test("N07: intake transport preserves the F.A.S.T flag and reason without a contract change", async () => {
  const previousAdapter = http.defaults.adapter;
  const requests = [];
  http.defaults.adapter = async (config) => {
    requests.push({ url: config.url, method: config.method, body: JSON.parse(config.data) });
    return {
      data: { status: "EMERGENCY_DISPATCHED", isRedFlag: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  try {
    const intake = NURSE_CASES[4].intake;
    const result = await clinicalService.intake("fast-visit", intake);
    assert.equal(result.status, "EMERGENCY_DISPATCHED");
    assert.deepEqual(requests[0], {
      url: "/clinical/visits/fast-visit/intake",
      method: "put",
      body: intake,
    });
    await clinicalService.intake("non-fast-visit", { ...NURSE_CASES[0].intake, isRedFlag: false });
    assert.equal(requests[1].body.isRedFlag, false);
    assert.equal(requests[1].body.redFlagReason, undefined);
  } finally {
    http.defaults.adapter = previousAdapter;
  }
});

test("nurse UI wires quick chips, F.A.S.T alert and suggestions scoped to the saved visit", async () => {
  const panel = await read("components/clinical/staff-clinical-panel.tsx");
  assert.match(panel, /NURSE_CASES.map/);
  assert.match(panel, /form.setFieldsValue\(sample.intake\)/);
  assert.match(panel, /setSuggestedDepartmentCode\(sample.departmentCode\)/);
  assert.match(panel, /name="isRedFlag" valuePropName="checked"/);
  assert.match(panel, /isRedFlag: !!values.isRedFlag/);
  assert.match(panel, /redFlagReason: values.isRedFlag \? FAST_RED_FLAG_REASON : undefined/);
  assert.match(
    panel,
    /Dấu hiệu F.A.S.T tích cực: Hệ thống sẽ chuyển ngay sang Cấp cứu STAT P.001 khi Lưu/
  );
  assert.match(panel, /setDepartmentCode\(suggestedDepartments\[row.visitId\]\)/);
  assert.match(
    panel,
    /\[selected.visitId\]:[\s\S]*?result.status === "EMERGENCY_DISPATCHED" \? undefined : suggestedDepartmentCode/
  );
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
  assert.equal(isClinicalProxyPath("users"), false);
  assert.equal(isClinicalProxyPath("users/me/profile"), true);
  assert.equal(isClinicalProxyPath("admin"), false);
  assert.equal(isClinicalProxyPath("visits/reception/queue"), true);
  assert.equal(isClinicalProxyPath("visits/reception/expired"), true);
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
