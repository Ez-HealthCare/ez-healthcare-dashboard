"use client";

import { VISIT_STATUS_LABELS } from "@/lib/visit-status";
import { formatDate } from "@/lib/display-format";
import { RecordIdentifier } from "@/components/clinical/record-identifier";

import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Skeleton,
  Tag,
} from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { canWriteDoctorVisit } from "@/lib/doctor-access";
import { AVAILABLE_ORDERS } from "@/lib/constants/doctor";
import type { ClinicQueueItem } from "@/lib/types/clinical";
import type { DoctorCompletion, VisitDossier } from "@/lib/types/doctor";
import type { DoctorAction, DoctorView } from "./doctor-workspace";
import { DoctorResults } from "./doctor-results";
import styles from "./doctor-workspace.module.css";

type ConclusionInput = Parameters<typeof clinicalActions.conclude>[1];
type TransferInput = Parameters<typeof clinicalActions.transferClinic>[1] & { explained: boolean };

export function DoctorVitals({
  patient,
  dossier,
  extended = false,
}: {
  patient: ClinicQueueItem;
  dossier?: VisitDossier;
  extended?: boolean;
}) {
  const v = dossier?.vital;
  const bp =
    v?.bloodPressureSystolic != null && v.bloodPressureDiastolic != null
      ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
      : patient.vitals?.bp;
  const values: Array<[string, string | number | undefined, string]> = [
    ["Huyết áp", bp, "mmHg"],
    ["Mạch", v?.heartRate ?? patient.vitals?.hr, "lần/phút"],
    ["SpO₂", v?.spo2 ?? patient.vitals?.spo2, "%"],
    ["Thân nhiệt", v?.temperature ?? patient.vitals?.temp, "°C"],
  ];
  if (extended) values.push(["Nhịp thở", v?.respiratoryRate, "lần/phút"]);
  return (
    <div className={styles.vitals}>
      {values.map(([label, value, unit]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value ?? "—"}</strong>
          <small>{unit}</small>
        </div>
      ))}
    </div>
  );
}

function PatientBanner({ patient, dossier }: { patient: ClinicQueueItem; dossier?: VisitDossier }) {
  const name = dossier?.patient.name || patient.patientName;
  return (
    <div className={styles.patientBanner}>
      <span className={styles.avatar}>
        {name
          .split(/\s+/)
          .slice(-2)
          .map((part) => part[0])
          .join("")}
      </span>
      <div className={styles.patientInfo}>
        <h2>{name}</h2>
        <RecordIdentifier label="Mã lượt" value={patient.visitId} />
        <p>
          {dossier?.patient.dateOfBirth
            ? `Ngày sinh: ${formatDate(dossier.patient.dateOfBirth)}`
            : "Hồ sơ khám ngoại trú"}{" "}
          · Số tiếp nhận: {patient.hallTicketNumber}
        </p>
      </div>
      <div className={styles.patientTicket}>
        <small>Số khám</small>
        <strong>{patient.clinicTicketNumber}</strong>
      </div>
    </div>
  );
}

export function DoctorWorkbench({
  patient,
  room,
  view,
  busy,
  canReceive,
  act,
  onView,
  onComplete,
  onEdit,
}: {
  onEdit: (patient: ClinicQueueItem) => void;
  patient: ClinicQueueItem;
  room: { code: string; name: string };
  view: DoctorView;
  busy: boolean;
  canReceive: boolean;
  act: DoctorAction;
  onView: (view: DoctorView) => void;
  onComplete: (completion: DoctorCompletion) => void;
}) {
  const changes = useUnsavedChanges();
  const markDirty = () => {
    changes.markDirty();
    onEdit(patient);
  };
  const changeView = (target: DoctorView) => {
    onView(target);
  };
  const dossier = useClinicalData(() => clinicalActions.visitDossier(patient.visitId));
  const departments = useClinicalData(clinicalActions.departments, 30_000);
  const user = useIdentity();
  const canWrite = canWriteDoctorVisit(user.id, patient, dossier.data);
  const otherDoctor =
    dossier.data?.status === "IN_EXAMINATION" && dossier.data.currentDoctor?.id !== user.id
      ? dossier.data.currentDoctor
      : undefined;
  const { refresh: refreshDossier } = dossier;
  useEffect(() => {
    void refreshDossier();
  }, [patient.status, refreshDossier]);
  const [notes, setNotes] = useState({ history: "", examination: "", assessment: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [pregnancy, setPregnancy] = useState(false);
  const [orderConfirm, setOrderConfirm] = useState(false);
  const [dag, setDag] = useState<{ sortedOrder: string[] }>();
  const [pendingTransfer, setPendingTransfer] = useState<TransferInput>();
  const [pendingConclusion, setPendingConclusion] = useState<ConclusionInput>();
  const [conclusionForm] = Form.useForm<ConclusionInput>();
  const [transferForm] = Form.useForm<TransferInput>();
  const revisitDate = Form.useWatch("revisitDate", conclusionForm);
  const clinicalSummary = [
    notes.history && `Bệnh sử: ${notes.history}`,
    notes.examination && `Khám thực thể: ${notes.examination}`,
    notes.assessment && `Nhận định: ${notes.assessment}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const titleByView = {
    clinical: "Khám lâm sàng",
    orders: "Chỉ định CLS",
    results: "Kết quả CLS",
    transfer: "Chuyển chuyên khoa",
    conclusion: "Kết luận & Kê đơn",
  } as const;
  const openViews = Object.entries(titleByView) as Array<
    [Exclude<DoctorView, "dashboard">, string]
  >;
  const steps = dossier.data?.steps || [];
  const visitStatus = dossier.data?.status || patient.status;
  const waitingForResults = visitStatus === "PARACLINICAL_PENDING";
  const readyForReExam = visitStatus === "RE_EXAM_CALLING";
  const consultationWarning =
    !canWrite && view !== "dashboard" ? (
      <Alert
        type="info"
        showIcon
        title={
          otherDoctor
            ? "Lượt khám do bác sĩ khác phụ trách"
            : waitingForResults
              ? "Đã gửi chỉ định · Đang chờ kết quả CLS"
              : readyForReExam
                ? "Đã có kết quả · Chờ tiếp nhận tái khám"
                : "Hồ sơ đang ở chế độ xem"
        }
        description={
          otherDoctor
            ? `${otherDoctor.name} đang khám lượt này. Bạn có thể xem hồ sơ; chỉ bác sĩ đang phụ trách được gửi chỉ định, chuyển chuyên khoa và kê đơn. Vui lòng chọn lượt do bạn tiếp nhận để thực hiện y lệnh.`
            : waitingForResults
              ? "Các biểu mẫu y lệnh đang ở chế độ xem trong khi người bệnh thực hiện CLS. Theo dõi tại Kết quả CLS; khi hoàn tất, tiếp nhận tái khám để tiếp tục chỉ định hoặc kê đơn."
              : readyForReExam
                ? "Tiếp nhận tái khám để tiếp tục ghi nhận, chỉ định hoặc kết luận và kê đơn."
                : "Tiếp nhận bệnh nhân vào khám trước khi gửi chỉ định, chuyển chuyên khoa hoặc hoàn tất kết luận."
        }
        action={
          ["CLINIC_CALLED", "RE_EXAM_CALLING"].includes(patient.status) ? (
            <Button
              disabled={busy || !canReceive}
              onClick={async () => {
                if (
                  await act(() => clinicalActions.startExam(patient.visitId), "Đã tiếp nhận khám.")
                )
                  await dossier.refresh();
              }}
            >
              Tiếp nhận khám
            </Button>
          ) : waitingForResults && view !== "results" ? (
            <Button onClick={() => changeView("results")}>Theo dõi kết quả CLS</Button>
          ) : undefined
        }
      />
    ) : null;
  const orderSummary = (
    <section className={styles.card}>
      <h2>
        Chỉ định đang tạo <span className={styles.pill}>{selectedOrders.length} dịch vụ</span>
      </h2>
      {selectedOrders.length ? (
        selectedOrders.map((code) => (
          <div className={styles.selectedOrder} key={code}>
            <span>{AVAILABLE_ORDERS.find((order) => order.code === code)?.name || code}</span>
            <Button
              type="text"
              disabled={busy || !canWrite}
              aria-label={`Bỏ dịch vụ ${code}`}
              onClick={() => {
                markDirty();
                setSelectedOrders((old) => old.filter((value) => value !== code));
              }}
            >
              ×
            </Button>
          </div>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chọn dịch vụ" />
      )}
      <Button
        type="primary"
        block
        disabled={busy || !canWrite || !selectedOrders.length || !diagnosis.trim()}
        onClick={() => setOrderConfirm(true)}
      >
        Xác nhận gửi chỉ định
      </Button>
      {dag && (
        <Alert
          type="success"
          showIcon
          title="Đã gửi chỉ định cận lâm sàng"
          description={
            <div className={styles.tags}>
              {dag.sortedOrder.map((code, index) => (
                <Tag color="cyan" key={code}>
                  {index + 1}. {code}
                </Tag>
              ))}
            </div>
          }
        />
      )}
    </section>
  );
  const sidebar = (
    <aside className={`${styles.stack} ${styles.contextSidebar}`}>
      {view === "orders" && orderSummary}
      <section className={styles.card}>
        <h2>Tiến trình lượt khám</h2>
        <ol className={styles.progress}>
          <li>
            Tiếp nhận & Sàng lọc <span>Đã chuyển vào phòng khám</span>
          </li>
          <li>
            Khám lâm sàng{" "}
            <span>
              {patient.status === "IN_EXAMINATION" ? "Đang khám" : "Theo trạng thái lượt khám"}
            </span>
          </li>
          <li>
            Chỉ định cận lâm sàng{" "}
            <span>
              {steps.length
                ? `${steps.filter((step) => step.status === "COMPLETED").length}/${steps.length} bước đã hoàn tất`
                : "Chưa ghi nhận chỉ định"}
            </span>
          </li>
          <li>
            Kết luận & Đơn thuốc{" "}
            <span>{dossier.data?.prescription ? "Đã ghi nhận đơn thuốc" : "Chưa hoàn tất"}</span>
          </li>
        </ol>
      </section>
      <section className={styles.notice}>
        <h2>Đối chiếu trước y lệnh</h2>
        <p className={styles.meta}>
          {room.code} · {room.name}
        </p>
        <p>Đối chiếu hồ sơ, dị ứng và kết quả đã duyệt trước khi xác nhận y lệnh.</p>
        <p className={styles.meta}>
          Dị ứng đã ghi nhận: {dossier.data?.patient.allergies?.join(", ") || "Chưa có thông tin"}
        </p>
      </section>
    </aside>
  );
  return (
    <section
      className={styles.stack}
      data-view={view}
      aria-label="Hồ sơ khám bệnh"
      onChangeCapture={(event) => {
        if (!(
          event.target instanceof HTMLInputElement &&
          event.target.placeholder === "Tìm dịch vụ, mã phòng xét nghiệm…"
        ))
          markDirty();
      }}
    >
      {changes.dirty && (
        <Alert
          type="warning"
          showIcon
          title="Có nội dung chưa lưu"
          description="Ghi chép và biểu mẫu đang nhập chưa được lưu đầy đủ. Kiểm tra trước khi đổi bước, bệnh nhân hoặc rời trang."
        />
      )}
      {dossier.error && (
        <Alert
          type="error"
          showIcon
          title="Không tải được hồ sơ lượt khám"
          description={dossier.error}
          action={<Button onClick={() => void dossier.refresh()}>Thử lại</Button>}
        />
      )}
      {view === "dashboard" ? (
        <>
          <div className={styles.activePatientCard}>
            <div className={styles.cardHeading}>
              <span className={styles.eyebrow}>Hồ sơ đang chọn</span>
              <Tag color="cyan">{VISIT_STATUS_LABELS[visitStatus] || visitStatus}</Tag>
            </div>
            <PatientBanner patient={patient} dossier={dossier.data} />
            <h3>Chỉ số sinh hiệu lúc tiếp nhận</h3>
            <DoctorVitals patient={patient} dossier={dossier.data} />
            <div className={styles.soft}>
              <small>Lý do khám & triệu chứng</small>
              <h3>{patient.chiefComplaint || "Chưa ghi nhận lý do khám"}</h3>
              <p>
                {dossier.data?.vital?.notes ||
                  "Đối chiếu trực tiếp với người bệnh trong buồng khám."}
              </p>
            </div>
            <div className={styles.primaryWorkflow}>
              <div>
                <strong>Tiếp tục lượt khám</strong>
                <p className={styles.meta}>Mở hồ sơ để ghi nhận khám và thực hiện y lệnh.</p>
              </div>
              <Button type="primary" onClick={() => changeView("clinical")} disabled={busy}>
                Mở hồ sơ khám bệnh
              </Button>
            </div>
            <nav className={styles.secondaryWorkflow} aria-label="Mở nhanh hồ sơ khám">
              <Button type="text" onClick={() => changeView("orders")} disabled={busy}>
                Chỉ định CLS →
              </Button>
              <Button type="text" onClick={() => changeView("results")} disabled={busy}>
                Kết quả CLS →
              </Button>
              <Button type="text" onClick={() => changeView("transfer")} disabled={busy}>
                Chuyển chuyên khoa
              </Button>
              <Button type="text" onClick={() => changeView("conclusion")} disabled={busy}>
                Kết luận & Kê đơn
              </Button>
            </nav>
          </div>
        </>
      ) : (
        <>
          <div className={styles.card}>
            <PatientBanner patient={patient} dossier={dossier.data} />
          </div>
          <nav className={styles.flowTabs} aria-label="Các bước khám bệnh">
            {openViews.map(([target, label]) => (
              <button
                key={target}
                aria-current={view === target ? "step" : undefined}
                disabled={busy}
                onClick={() => changeView(target)}
              >
                {label}
              </button>
            ))}
          </nav>
          {consultationWarning}
          {view === "results" ? (
            <DoctorResults
              patient={patient}
              dossier={dossier.data}
              loading={dossier.loading}
              onRefresh={dossier.refresh}
              busy={busy}
              act={act}
              onView={changeView}
              assessment={notes.assessment}
              onAssessment={(value) => setNotes((old) => ({ ...old, assessment: value }))}
              canWrite={canWrite}
              canReceive={canReceive}
            />
          ) : (
            <div className={styles.twoColumns}>
              <div className={styles.stack}>
                {view === "clinical" && (
                  <>
                    <section className={styles.card}>
                      <h2>Chỉ số sinh tồn từ trạm sàng lọc</h2>
                      {dossier.loading && !dossier.data ? (
                        <Skeleton active />
                      ) : (
                        <DoctorVitals patient={patient} dossier={dossier.data} extended />
                      )}
                      <p className={styles.meta}>Dữ liệu tiếp nhận · Chỉ đọc</p>
                      {dossier.data?.vital?.isRedFlag && (
                        <Alert
                          type="error"
                          showIcon
                          title="Có dấu hiệu cảnh báo đã ghi nhận"
                          description={dossier.data.vital.redFlagReason}
                        />
                      )}
                    </section>
                    <section className={styles.card}>
                      <h2>Lý do khám & Triệu chứng bệnh nhân</h2>
                      <div className={styles.soft}>
                        <strong>
                          {dossier.data?.chiefComplaint ||
                            patient.chiefComplaint ||
                            "Chưa ghi nhận"}
                        </strong>
                      </div>
                      <div className={styles.tags}>
                        {[
                          dossier.data?.symptomOnset,
                          dossier.data?.symptomDuration,
                          dossier.data?.symptomSeverity,
                        ]
                          .filter((value) => value !== undefined && value !== "")
                          .map((value, i) => (
                            <Tag key={i}>{String(value)}</Tag>
                          ))}
                      </div>
                      <p className={styles.meta}>
                        {dossier.data?.vital?.notes || "Chưa có ghi chú điều dưỡng."}
                      </p>
                    </section>
                    <section className={styles.card}>
                      <h2>Ghi chép khám bệnh lâm sàng của Bác sĩ</h2>
                      <div className={styles.notesGrid}>
                        {[
                          ["history", "1. Bệnh sử hiện tại"],
                          ["examination", "2. Khám thực thể"],
                          ["assessment", "3. Nhận định lâm sàng ban đầu"],
                        ].map(([key, label]) => (
                          <label className={styles.field} key={key}>
                            <span>{label}</span>
                            <Input.TextArea
                              disabled={busy || !canWrite}
                              autoSize={{ minRows: 3, maxRows: 10 }}
                              showCount
                              maxLength={2000}
                              value={notes[key as keyof typeof notes]}
                              onChange={(event) =>
                                setNotes((old) => ({ ...old, [key]: event.target.value }))
                              }
                              placeholder="Nhập ghi nhận khám bệnh…"
                            />
                          </label>
                        ))}
                      </div>
                      <p className={styles.meta}>
                        Ghi chú được dùng khi gửi chỉ định, chuyển chuyên khoa hoặc hoàn tất khám.
                      </p>
                      <div className={styles.actions}>
                        <Button
                          type="primary"
                          disabled={busy || !canWrite}
                          onClick={() => onView("orders")}
                        >
                          Tiếp tục tạo chỉ định CLS →
                        </Button>
                        <Button
                          disabled={busy || !canWrite}
                          onClick={() => changeView("conclusion")}
                        >
                          Kết luận không cần CLS
                        </Button>
                      </div>
                    </section>
                  </>
                )}
                {view === "orders" && (
                  <>
                    <section className={styles.card}>
                      <h2>Thông tin lâm sàng liên quan</h2>
                      <div className={styles.soft}>
                        <small>Lý do khám</small>
                        <p>{patient.chiefComplaint || "Chưa ghi nhận"}</p>
                      </div>
                      <DoctorVitals patient={patient} dossier={dossier.data} />
                      <label className={styles.field}>
                        <span>Chẩn đoán sơ bộ / Lý do chỉ định *</span>
                        <Input
                          disabled={busy || !canWrite}
                          value={diagnosis}
                          onChange={(event) => setDiagnosis(event.target.value)}
                          placeholder="Nhập chẩn đoán sơ bộ"
                          maxLength={500}
                        />
                      </label>
                    </section>
                    <section className={styles.card}>
                      <h2>Danh mục dịch vụ cận lâm sàng</h2>
                      <Input
                        allowClear
                        aria-label="Tìm dịch vụ CLS"
                        value={orderSearch}
                        onChange={(event) => setOrderSearch(event.target.value)}
                        placeholder="Tìm dịch vụ, mã phòng xét nghiệm…"
                      />
                      <div className={styles.orderList}>
                        {AVAILABLE_ORDERS.filter((order) =>
                          `${order.code} ${order.name}`
                            .toLocaleLowerCase("vi-VN")
                            .includes(orderSearch.toLocaleLowerCase("vi-VN"))
                        ).map((order) => (
                          <label className={styles.orderOption} key={order.code}>
                            <Checkbox
                              disabled={busy || !canWrite}
                              checked={selectedOrders.includes(order.code)}
                              onChange={(event) =>
                                setSelectedOrders((old) =>
                                  event.target.checked
                                    ? [...old, order.code]
                                    : old.filter((code) => code !== order.code)
                                )
                              }
                            />
                            <div>
                              <strong>{order.name}</strong>
                              <p>
                                {order.code} · Tầng {order.floor} · {order.badge}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </section>
                    <section className={styles.card}>
                      <h2>Ghi chú cho nơi thực hiện</h2>
                      <Input.TextArea
                        aria-label="Ghi chú chỉ định"
                        disabled={busy || !canWrite}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        placeholder="Thông tin cần lưu ý khi thực hiện dịch vụ…"
                        value={orderNotes}
                        onChange={(event) => setOrderNotes(event.target.value)}
                      />
                      <div className={styles.soft}>
                        <Checkbox
                          checked={pregnancy}
                          disabled={busy || !canWrite}
                          onChange={(event) => setPregnancy(event.target.checked)}
                        >
                          Nghi ngờ có thai
                        </Checkbox>
                      </div>
                    </section>
                  </>
                )}
                {view === "transfer" && (
                  <Form<TransferInput>
                    form={transferForm}
                    layout="vertical"
                    onValuesChange={markDirty}
                    scrollToFirstError={{ focus: true }}
                    disabled={busy || !canWrite}
                    onFinish={setPendingTransfer}
                  >
                    <section className={styles.card}>
                      <h2>Tóm tắt thông tin bàn giao lâm sàng</h2>
                      <div className={styles.soft}>
                        <strong>{patient.chiefComplaint || "Chưa ghi nhận lý do khám"}</strong>
                        <p>
                          {clinicalSummary || "Bổ sung nhận định lâm sàng ở nội dung chuyển giao."}
                        </p>
                      </div>
                      <DoctorVitals patient={patient} dossier={dossier.data} />
                    </section>
                    <section className={styles.card}>
                      <h2>Chọn điểm tiếp nhận</h2>
                      {departments.error && (
                        <Alert
                          type="error"
                          title="Không tải được chuyên khoa"
                          description={departments.error}
                        />
                      )}
                      <Form.Item
                        name="targetDepartmentCode"
                        label="Chuyên khoa / Phòng khám"
                        rules={[{ required: true, message: "Chọn phòng khám tiếp nhận." }]}
                      >
                        <Radio.Group className={styles.departmentList}>
                          {(departments.data || [])
                            .filter(
                              (department) =>
                                department.roomType === "CONSULTATION" &&
                                department.code !== room.code
                            )
                            .map((department) => (
                              <Radio
                                key={department.code}
                                value={department.code}
                                className={styles.departmentOption}
                              >
                                <strong>{department.name}</strong>
                                <span>{department.code}</span>
                              </Radio>
                            ))}
                        </Radio.Group>
                      </Form.Item>
                      {!departments.loading &&
                        !departments.error &&
                        !(departments.data || []).some(
                          (department) =>
                            department.roomType === "CONSULTATION" && department.code !== room.code
                        ) && <Empty description="Không có phòng khám khác khả dụng" />}
                    </section>
                    <section className={styles.card}>
                      <h2>Lý do & Hướng dẫn chuyển giao</h2>
                      <Form.Item
                        name="transferReason"
                        label="Lý do chuyển chuyên khoa"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: "Nhập lý do chuyển chuyên khoa.",
                          },
                        ]}
                      >
                        <Input.TextArea rows={4} maxLength={2000} />
                      </Form.Item>
                      <Form.Item name="clinicalSummary" label="Nội dung bác sĩ tiếp nhận cần lưu ý">
                        <Input.TextArea rows={4} maxLength={4000} />
                      </Form.Item>
                      <Form.Item
                        name="explained"
                        valuePropName="checked"
                        rules={[
                          {
                            validator: (_, value) =>
                              value
                                ? Promise.resolve()
                                : Promise.reject(new Error("Xác nhận đã trao đổi với người bệnh.")),
                          },
                        ]}
                      >
                        <Checkbox>Đã trao đổi với người bệnh về việc chuyển khám</Checkbox>
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={busy}>
                        Xác nhận chuyển chuyên khoa
                      </Button>
                    </section>
                  </Form>
                )}
                {view === "conclusion" && (
                  <Form<ConclusionInput>
                    onValuesChange={markDirty}
                    scrollToFirstError={{ focus: true }}
                    form={conclusionForm}
                    layout="vertical"
                    initialValues={{ items: [] }}
                    disabled={busy || !canWrite}
                    onFinish={setPendingConclusion}
                  >
                    <section className={styles.card}>
                      <h2>Kết luận chẩn đoán</h2>
                      <div className={styles.formGrid}>
                        <Form.Item
                          name="icd10Code"
                          label="Mã ICD-10"
                          rules={[{ required: true, whitespace: true, message: "Nhập mã ICD-10." }]}
                        >
                          <Input placeholder="Mã ICD-10" maxLength={30} />
                        </Form.Item>
                        <Form.Item
                          name="icd10Name"
                          label="Tên chẩn đoán"
                          rules={[
                            { required: true, whitespace: true, message: "Nhập tên chẩn đoán." },
                          ]}
                        >
                          <Input placeholder="Tên chẩn đoán xác định" maxLength={500} />
                        </Form.Item>
                      </div>
                      <Form.Item name="doctorNotes" label="Kết luận lâm sàng & Lời dặn người bệnh">
                        <Input.TextArea rows={5} maxLength={4000} />
                      </Form.Item>
                    </section>
                    <section className={styles.card}>
                      <h2>Toa thuốc điện tử</h2>
                      <p className={styles.allergyNote}>
                        <strong>Dị ứng đã ghi nhận: </strong>
                        {dossier.data?.patient.allergies?.join(", ") || "Chưa có thông tin"}
                      </p>
                      <Form.List name="items">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map((field, index) => (
                              <div key={field.key} className={styles.medication}>
                                <div className={styles.cardHeading}>
                                  <strong>Thuốc {index + 1}</strong>
                                  <Button
                                    danger
                                    type="text"
                                    disabled={busy || !canWrite}
                                    onClick={() => remove(field.name)}
                                  >
                                    Xóa
                                  </Button>
                                </div>
                                <Form.Item
                                  name={[field.name, "medicationName"]}
                                  label="Tên thuốc"
                                  rules={[
                                    {
                                      required: true,
                                      whitespace: true,
                                      message: "Nhập tên thuốc.",
                                    },
                                  ]}
                                >
                                  <Input />
                                </Form.Item>
                                <div className={styles.formGrid}>
                                  <Form.Item
                                    name={[field.name, "dosage"]}
                                    label="Hàm lượng / Liều dùng"
                                    rules={[
                                      {
                                        required: true,
                                        whitespace: true,
                                        message: "Nhập liều dùng.",
                                      },
                                    ]}
                                  >
                                    <Input />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, "route"]}
                                    label="Đường dùng"
                                    rules={[{ required: true }]}
                                  >
                                    <Select
                                      options={[
                                        { value: "ORAL", label: "Đường uống" },
                                        { value: "TOPICAL", label: "Dùng ngoài" },
                                        { value: "INJECTION", label: "Đường tiêm" },
                                      ]}
                                    />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, "frequency"]}
                                    label="Tần suất sử dụng"
                                    rules={[
                                      {
                                        required: true,
                                        whitespace: true,
                                        message: "Nhập tần suất sử dụng.",
                                      },
                                    ]}
                                  >
                                    <Input />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, "durationDays"]}
                                    label="Số ngày"
                                    rules={[{ required: true, type: "number", min: 1 }]}
                                  >
                                    <InputNumber min={1} precision={0} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, "quantity"]}
                                    label="Số lượng"
                                    rules={[{ required: true, type: "number", min: 1 }]}
                                  >
                                    <InputNumber min={1} precision={0} />
                                  </Form.Item>
                                  <Form.Item
                                    name={[field.name, "instructions"]}
                                    label="Hướng dẫn dùng"
                                  >
                                    <Input />
                                  </Form.Item>
                                </div>
                              </div>
                            ))}
                            {!fields.length && (
                              <p className={styles.meta}>Chưa kê thuốc cho lượt khám này.</p>
                            )}
                            <Button
                              disabled={busy || !canWrite}
                              onClick={() => {
                                markDirty();
                                add({ route: "ORAL", durationDays: 1, quantity: 1 });
                              }}
                            >
                              + Thêm thuốc
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </section>
                    <section className={styles.card}>
                      <h2>Hẹn tái khám</h2>
                      <Form.Item
                        name="revisitDate"
                        label="Ngày tái khám (tùy chọn)"
                        extra={revisitDate ? `Ngày đã chọn: ${formatDate(revisitDate)}` : undefined}
                      >
                        <Input type="date" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block loading={busy}>
                        Xem lại & Hoàn tất khám
                      </Button>
                    </section>
                  </Form>
                )}
              </div>
              {sidebar}
            </div>
          )}
        </>
      )}
      <Modal
        title="Xác nhận chỉ định cận lâm sàng"
        open={orderConfirm}
        okText="Gửi chỉ định"
        cancelText="Quay lại chỉnh sửa"
        confirmLoading={busy}
        okButtonProps={{
          disabled: busy || !canWrite || !selectedOrders.length || !diagnosis.trim(),
        }}
        onCancel={() => !busy && setOrderConfirm(false)}
        onOk={async () => {
          if (!canWrite || !selectedOrders.length || !diagnosis.trim()) return;
          let result: Awaited<ReturnType<typeof clinicalActions.createOrders>> | undefined;
          const saved = await act(async () => {
            result = await clinicalActions.createOrders(patient.visitId, {
              orders: selectedOrders,
              workingDiagnosis: diagnosis.trim(),
              pregnancySuspected: pregnancy,
              doctorNotes: [clinicalSummary, orderNotes].filter(Boolean).join("\n\n"),
            });
          }, "Đã gửi chỉ định cận lâm sàng.");
          if (saved && result) {
            setOrderConfirm(false);
            setDag(result);
            setSelectedOrders([]);
            setDiagnosis("");
            setOrderNotes("");
            setPregnancy(false);
            // Clinical notes are included in the submitted order. Keep guards
            // for independent, unsent transfer/conclusion drafts.
            if (!transferForm.isFieldsTouched() && !conclusionForm.isFieldsTouched()) {
              changes.markSaved();
            }
            await dossier.refresh();
            if (!result.isStatEmergency) changeView("results");
            if (result.isStatEmergency)
              onComplete({
                patient,
                title: "Đã điều phối cấp cứu",
                description: "Hệ thống đã điều phối theo đánh giá an toàn của lượt khám.",
              });
          }
        }}
      >
        <p>
          <strong>{patient.patientName}</strong> · {patient.clinicTicketNumber}
        </p>
        <p>Chẩn đoán sơ bộ: {diagnosis}</p>
        <ul>
          {selectedOrders.map((code) => (
            <li key={code}>
              {code} · {AVAILABLE_ORDERS.find((order) => order.code === code)?.name}
            </li>
          ))}
        </ul>
        {pregnancy && <Alert type="warning" showIcon title="Đã ghi nhận nghi ngờ có thai" />}
      </Modal>
      <Modal
        title="Xác nhận chuyển chuyên khoa"
        open={!!pendingTransfer}
        okText="Chuyển chuyên khoa"
        cancelText="Quay lại chỉnh sửa"
        confirmLoading={busy}
        okButtonProps={{ disabled: busy || !canWrite }}
        onCancel={() => !busy && setPendingTransfer(undefined)}
        onOk={async () => {
          if (!pendingTransfer || !canWrite) return;
          const input = pendingTransfer;
          if (
            await act(
              () =>
                clinicalActions.transferClinic(patient.visitId, {
                  targetDepartmentCode: input.targetDepartmentCode,
                  transferReason: input.transferReason.trim(),
                  clinicalSummary: [clinicalSummary, input.clinicalSummary]
                    .filter(Boolean)
                    .join("\n\n"),
                }),
              "Đã chuyển chuyên khoa."
            )
          ) {
            changes.markSaved();
            setPendingTransfer(undefined);
            onComplete({
              patient,
              title: "Chuyển chuyên khoa thành công",
              description: `Đã chuyển lượt khám đến ${input.targetDepartmentCode}. Thông tin bàn giao được lưu cùng lượt khám.`,
            });
          }
        }}
      >
        <p>
          <strong>{patient.patientName}</strong> · {patient.clinicTicketNumber}
        </p>
        <p>Điểm tiếp nhận: {pendingTransfer?.targetDepartmentCode}</p>
        <p>Lý do: {pendingTransfer?.transferReason}</p>
      </Modal>
      <Modal
        title="Xem lại kết luận & Đơn thuốc"
        className={styles.prescriptionReviewModal}
        width={800}
        centered
        open={!!pendingConclusion}
        okText="Ký đơn & Hoàn tất khám"
        cancelText="Quay lại chỉnh sửa"
        confirmLoading={busy}
        okButtonProps={{ disabled: busy || !canWrite }}
        onCancel={() => !busy && setPendingConclusion(undefined)}
        onOk={async () => {
          if (!pendingConclusion || !canWrite) return;
          const input = pendingConclusion;
          if (
            await act(
              () =>
                clinicalActions.conclude(patient.visitId, {
                  ...input,
                  icd10Code: input.icd10Code.trim(),
                  icd10Name: input.icd10Name.trim(),
                  doctorNotes: [clinicalSummary, input.doctorNotes].filter(Boolean).join("\n\n"),
                  revisitDate: input.revisitDate || undefined,
                  items: input.items || [],
                }),
              "Đã hoàn tất khám."
            )
          ) {
            changes.markSaved();
            setPendingConclusion(undefined);
            onComplete({
              patient,
              title: "Hoàn tất khám thành công",
              description: "Kết luận và đơn thuốc đã được hệ thống ghi nhận.",
            });
          }
        }}
      >
        <div className={styles.prescriptionReview}>
          <div className={styles.reviewPatient}>
            <div>
              <span>Người bệnh</span>
              <strong>{patient.patientName}</strong>
              {dossier.data?.patient.dateOfBirth && (
                <span>Ngày sinh: {formatDate(dossier.data.patient.dateOfBirth)}</span>
              )}
            </div>
            <div>
              <span>Số khám</span>
              <strong>{patient.clinicTicketNumber}</strong>
            </div>
          </div>
          <section className={styles.reviewSection}>
            <h3>Chẩn đoán</h3>
            <p>
              <Tag>{pendingConclusion?.icd10Code}</Tag> {pendingConclusion?.icd10Name}
            </p>
            <p className={styles.reviewAllergies}>
              <strong>Dị ứng đã ghi nhận: </strong>
              {dossier.data?.patient.allergies?.length
                ? dossier.data.patient.allergies.join(", ")
                : "Chưa có thông tin"}
            </p>
          </section>
          <section className={styles.reviewSection}>
            <h3>
              Đơn thuốc <span>({pendingConclusion?.items?.length || 0} thuốc)</span>
            </h3>
            {pendingConclusion?.items?.length ? (
              <ol className={styles.reviewMedications}>
                {pendingConclusion.items.map((item, index) => (
                  <li key={index}>
                    <h4>
                      <span>{index + 1}.</span> {item.medicationName}
                    </h4>
                    <dl className={styles.reviewDetails}>
                      <div>
                        <dt>Hàm lượng / Liều dùng</dt>
                        <dd>{item.dosage}</dd>
                      </div>
                      <div>
                        <dt>Đường dùng</dt>
                        <dd>
                          {{ ORAL: "Đường uống", TOPICAL: "Dùng ngoài", INJECTION: "Đường tiêm" }[
                            item.route
                          ] ||
                            item.route ||
                            "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Tần suất</dt>
                        <dd>{item.frequency}</dd>
                      </div>
                      <div>
                        <dt>Thời gian dùng</dt>
                        <dd>{item.durationDays} ngày</dd>
                      </div>
                      <div>
                        <dt>Số lượng</dt>
                        <dd>{item.quantity} đơn vị</dd>
                      </div>
                    </dl>
                    {item.instructions && (
                      <p className={styles.reviewInstructions}>
                        <strong>Hướng dẫn dùng: </strong>
                        {item.instructions}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Không kê thuốc cho lượt khám này.</p>
            )}
          </section>
          {pendingConclusion?.doctorNotes && (
            <section className={styles.reviewSection}>
              <h3>Kết luận & Lời dặn</h3>
              <p className={styles.preformatted}>{pendingConclusion.doctorNotes}</p>
            </section>
          )}
          <section className={styles.reviewSection}>
            <h3>Hẹn tái khám</h3>
            <p>
              {pendingConclusion?.revisitDate
                ? formatDate(pendingConclusion.revisitDate)
                : "Không hẹn tái khám"}
            </p>
          </section>
        </div>
      </Modal>
    </section>
  );
}
