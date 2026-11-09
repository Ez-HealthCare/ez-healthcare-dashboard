"use client";

import { useSearchParams } from "next/navigation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { DoctorWorkspace } from "@/components/doctor/doctor-workspace";
import { FAST_RED_FLAG_REASON, NURSE_CASES } from "@/lib/constants/nurse";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { news2Preview } from "@/lib/news2-preview";
import type { IntakeInput, ReceptionVisit } from "@/lib/types/clinical";
import styles from "./staff-clinical-panel.module.css";
import nurseStyles from "./nurse-workspace.module.css";
import { NurseOverview, PatientIdentity, VitalSummary } from "./nurse-overview";

export function NursePanel({ section = "" }: { section?: string }) {
  const visitId = useSearchParams().get("visitId") || "";
  return <NursePanelContent key={section + visitId} section={section} requestedVisit={visitId} />;
}

function NursePanelContent({
  section,
  requestedVisit,
}: {
  section: string;
  requestedVisit: string;
}) {
  const queue = useClinicalData(clinicalActions.triageQueue);
  const expired = useClinicalData(clinicalActions.expiredReceptionQueue, 30_000);
  const departments = useClinicalData(clinicalActions.departments, 30_000);
  const [selected, setSelected] = useState<ReceptionVisit>();
  const [intakes, setIntakes] = useState<Record<string, IntakeInput>>({});
  const [completed, setCompleted] = useState<ReceptionVisit>();
  const [completedRoom, setCompletedRoom] = useState("");
  const [handoffs, setHandoffs] = useState<ReceptionVisit[]>([]);
  const [assigning, setAssigning] = useState<ReceptionVisit>();
  const [departmentCode, setDepartmentCode] = useState<string>();
  const [suggestedDepartmentCode, setSuggestedDepartmentCode] = useState<string>();
  const [suggestedDepartments, setSuggestedDepartments] = useState<
    Record<string, string | undefined>
  >({});
  const [reissuing, setReissuing] = useState<ReceptionVisit>();
  const [reissueReason, setReissueReason] = useState("");
  const changes = useUnsavedChanges();
  const lock = useRef(false);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<IntakeInput>();
  const values = Form.useWatch([], form);
  const preview = news2Preview(values || {});
  const [toast, context] = message.useMessage();

  const act = async (action: () => Promise<unknown>, success: string) => {
    if (lock.current) return false;
    lock.current = true;
    setActionError("");
    try {
      setSubmitting(true);
      await action();
      toast.success(success);
      await Promise.all([queue.refresh(), expired.refresh()]);
      return true;
    } catch (error) {
      setActionError(clinicalErrorMessage(error));
      return false;
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  };
  const linkedVisit = (queue.data || []).find((row) => row.visitId === requestedVisit);
  const openVisit = (row: ReceptionVisit) => {
    setSelected(row);
    setSuggestedDepartmentCode(suggestedDepartments[row.visitId]);
    form.resetFields();
    form.setFieldsValue(
      intakes[row.visitId] || {
        chiefComplaint: row.chiefComplaint,
        symptomOnset: row.symptomOnset,
        symptomDuration: row.symptomDuration,
        symptomSeverity: row.symptomSeverity,
        allergies: row.patient.allergies,
      }
    );
  };
  return (
    <>
      {context}
      {requestedVisit && !queue.loading && !selected && (
        <Alert
          type="info"
          showIcon
          title={
            linkedVisit
              ? `Lượt từ thông báo: ${linkedVisit.patient.name} · ${linkedVisit.hallTicketNumber}`
              : "Lượt từ thông báo không còn trong hàng đợi sàng lọc"
          }
          description={
            linkedVisit
              ? "Kiểm tra định danh trước khi mở phiếu sàng lọc."
              : "Lượt có thể đã được bàn giao hoặc hoàn tất; hệ thống không tự mở người bệnh khác."
          }
          action={
            linkedVisit ? (
              <Button onClick={() => openVisit(linkedVisit)}>Mở phiếu sàng lọc liên quan</Button>
            ) : undefined
          }
        />
      )}
      {actionError && (
        <Alert type="error" showIcon title="Chưa lưu được thao tác" description={actionError} />
      )}
      {changes.dirty && <p role="status">Phiếu sàng lọc có nội dung chưa lưu.</p>}
      {queue.error && (
        <Alert type="error" showIcon title="Không tải được hàng đợi" description={queue.error} />
      )}
      {!selected && !completed && (
        <NurseOverview
          section={section}
          rows={section === "history" ? handoffs : queue.data || []}
          loading={queue.loading}
          busy={submitting}
          intakes={intakes}
          onRefresh={() => {
            void queue.refresh();
            void expired.refresh();
          }}
          onOpen={openVisit}
          onAssign={(row) => {
            setAssigning(row);
            setDepartmentCode(suggestedDepartments[row.visitId]);
          }}
          onReissue={(row) => {
            setReissuing(row);
            setReissueReason("");
          }}
        />
      )}
      {!selected && completed && (
        <section className={nurseStyles.completion}>
          <div className={nurseStyles.breadcrumb}>
            Bàn làm việc sàng lọc › Phiếu sàng lọc › Đã hoàn tất
          </div>
          <div className={nurseStyles.pageHeading}>
            <div>
              <h1>Đã hoàn tất sàng lọc</h1>
              <p>Lượt khám đã được chuyển thành công đến phòng khám chuyên khoa.</p>
            </div>
          </div>
          <div className={nurseStyles.successBanner}>
            <span>✓</span>
            <div>
              <h2>Hoàn tất sàng lọc & Điều chuyển thành công</h2>
              <p>Dữ liệu đã được xác nhận bởi hệ thống.</p>
            </div>
          </div>
          <div className={nurseStyles.card}>
            <h2>Chỉ định điều chuyển tiếp theo</h2>
            <div className={nurseStyles.soft}>
              <h3>{completedRoom}</h3>
              <p>Số khám mới sẽ được hệ thống cập nhật trong hàng đợi và tài khoản bệnh nhân.</p>
            </div>
          </div>
          <div className={nurseStyles.card}>
            <PatientIdentity visit={completed} />
            <h2>Thông số sinh hiệu tiếp nhận</h2>
            <VitalSummary values={intakes[completed.visitId]} />
          </div>
          <div className={nurseStyles.actions}>
            <Button type="primary" onClick={() => setCompleted(undefined)}>
              Tiếp tục sàng lọc
            </Button>
            <Button onClick={() => setCompleted(undefined)}>Xem hàng đợi sàng lọc</Button>
          </div>
        </section>
      )}
      {!selected && !completed && (
        <section className={nurseStyles.expired}>
          <h3 style={{ marginTop: 24 }}>Lượt hết hạn</h3>
          <p>Danh sách lượt hết hiệu lực gần nhất; chỉ nhân viên được cấp lại.</p>
          <Table
            rowKey={(row) => `expired-${row.visitId}`}
            loading={expired.loading}
            dataSource={expired.data || []}
            pagination={false}
            columns={[
              {
                title: "Số cũ",
                render: (_, row) => row.clinicTicketNumber || row.hallTicketNumber,
              },
              { title: "Bệnh nhân", render: (_, row) => row.patient.name },
              { title: "Trạng thái", render: () => <Tag color="red">Hết hiệu lực</Tag> },
              {
                title: "Thao tác",
                render: (_, row) => (
                  <Button
                    danger
                    loading={submitting}
                    onClick={() => {
                      setReissuing(row);
                      setReissueReason("");
                    }}
                  >
                    Cấp lại
                  </Button>
                ),
              },
            ]}
          />
        </section>
      )}
      {selected && (
        <section className={nurseStyles.formPage}>
          <div className={nurseStyles.breadcrumb}>
            Bàn làm việc sàng lọc › Phiếu sàng lọc › Triệu chứng & sinh hiệu
          </div>
          <div className={nurseStyles.pageHeading}>
            <div>
              <h1>Phiếu sàng lọc</h1>
              <p>
                Đối chiếu thông tin và ghi nhận số đo trước khi chuyển bệnh nhân đến phòng khám.
              </p>
            </div>
            <Button
              disabled={submitting}
              onClick={() => {
                if (changes.confirmDiscard()) setSelected(undefined);
              }}
            >
              Quay lại hàng đợi
            </Button>
          </div>
          <div className={nurseStyles.card}>
            <PatientIdentity visit={selected} />
          </div>
          <div className={nurseStyles.stepTabs}>
            <span data-active="true" aria-current="step">
              1. Triệu chứng & sinh hiệu
            </span>
            <span>2. Xác nhận phân phòng</span>
          </div>
          <div className={nurseStyles.formColumns}>
            <div className={nurseStyles.card}>
              <Form
                form={form}
                className={nurseStyles.intakeForm}
                layout="vertical"
                onValuesChange={changes.markDirty}
                scrollToFirstError={{ focus: true }}
                initialValues={{ isRedFlag: false }}
                disabled={submitting}
                onFinish={async (values) => {
                  if (!selected || submitting) return;
                  let emergency = false;
                  const saved = await act(async () => {
                    const result = await clinicalActions.intake(selected.visitId, {
                      ...values,
                      isRedFlag: !!values.isRedFlag,
                      redFlagReason: values.isRedFlag ? FAST_RED_FLAG_REASON : undefined,
                    });
                    emergency = result.status === "EMERGENCY_DISPATCHED";
                    setIntakes((previous) => ({ ...previous, [selected.visitId]: values }));
                    setSuggestedDepartments((previous) => ({
                      ...previous,
                      [selected.visitId]:
                        result.status === "EMERGENCY_DISPATCHED"
                          ? undefined
                          : suggestedDepartmentCode,
                    }));
                    if (result.status === "EMERGENCY_DISPATCHED") {
                      toast.warning(
                        "Đã chuyển cấp cứu STAT P.001. Không phân phòng khám thường.",
                        8
                      );
                    }
                  }, "Đã lưu thông tin bệnh.");
                  if (saved) {
                    changes.markSaved();
                    setSelected(undefined);
                    if (!emergency) {
                      setAssigning({ ...selected, intakeCompleted: true });
                      setDepartmentCode(suggestedDepartmentCode);
                    }
                  }
                }}
              >
                <details className={nurseStyles.samples}>
                  <summary id="nurse-cases-label">Ca bệnh mẫu chuẩn (Y Hà Nội 2020)</summary>
                  <Space wrap role="group" aria-labelledby="nurse-cases-label">
                    {NURSE_CASES.map((sample) => (
                      <Button
                        key={sample.label}
                        size="small"
                        shape="round"
                        danger={sample.intake.isRedFlag}
                        onClick={() => {
                          changes.markDirty();
                          form.setFieldsValue(sample.intake);
                          setSuggestedDepartmentCode(sample.departmentCode);
                        }}
                      >
                        {sample.label}
                      </Button>
                    ))}
                  </Space>
                  {suggestedDepartmentCode && !values?.isRedFlag && (
                    <p>
                      Gợi ý phòng khám chuyên khoa: <strong>{suggestedDepartmentCode}</strong>
                    </p>
                  )}
                </details>
                <div aria-live="polite" className={nurseStyles.clinicalPreview}>
                  <Tag
                    color={
                      preview.risk === "HIGH"
                        ? "red"
                        : preview.risk === "MEDIUM"
                          ? "orange"
                          : preview.risk === "LOW"
                            ? "green"
                            : "default"
                    }
                  >
                    NEWS2 xem trước: {preview.score ?? "chưa đủ dữ liệu"}
                    {preview.risk &&
                      ` · ${preview.risk === "HIGH" ? "Nguy cơ cao" : preview.risk === "MEDIUM" ? "Trung bình" : "Thấp"}`}
                  </Tag>
                  <p>Ước tính từ 5 sinh hiệu; chưa tính oxy bổ sung và mức độ ý thức.</p>
                  <Form.Item name="isRedFlag" valuePropName="checked">
                    <Checkbox>Dấu hiệu F.A.S.T (Đột quỵ não cấp)</Checkbox>
                  </Form.Item>
                  {values?.isRedFlag && (
                    <Alert
                      type="error"
                      showIcon
                      role="alert"
                      title="Dấu hiệu F.A.S.T tích cực: Hệ thống sẽ chuyển ngay sang Cấp cứu STAT P.001 khi Lưu"
                    />
                  )}
                  {preview.risk === "HIGH" && (
                    <Alert
                      type="error"
                      showIcon
                      title="Nguy cơ cao — điều phối cấp cứu STAT P.001 khi lưu"
                    />
                  )}
                </div>
                <Form.Item name="chiefComplaint" label="Lý do khám" rules={[{ required: true }]}>
                  <Input.TextArea />
                </Form.Item>
                <div className={nurseStyles.vitalFields}>
                  <div className={nurseStyles.measurementCard}>
                    <h3>Huyết áp</h3>
                    <div className={nurseStyles.inputPair}>
                      <Form.Item
                        name="bloodPressureSystolic"
                        label="HA tâm thu"
                        rules={[{ required: true }, { type: "number", min: 40, max: 260 }]}
                      >
                        <InputNumber min={40} max={260} />
                      </Form.Item>
                      <Form.Item
                        name="bloodPressureDiastolic"
                        label="HA tâm trương"
                        rules={[{ required: true }, { type: "number", min: 30, max: 160 }]}
                      >
                        <InputNumber min={30} max={160} />
                      </Form.Item>
                    </div>
                    <small>mmHg</small>
                  </div>
                  <div className={nurseStyles.measurementCard}>
                    <Form.Item
                      name="heartRate"
                      label="Mạch"
                      rules={[{ required: true }, { type: "number", min: 30, max: 240 }]}
                    >
                      <InputNumber min={30} max={240} />
                    </Form.Item>
                    <small>lần/phút</small>
                  </div>
                  <div className={nurseStyles.measurementCard}>
                    <Form.Item
                      name="spo2"
                      label="SpO₂"
                      rules={[{ required: true }, { type: "number", min: 50, max: 100 }]}
                    >
                      <InputNumber min={50} max={100} />
                    </Form.Item>
                    <small>%</small>
                  </div>
                  <div className={nurseStyles.measurementCard}>
                    <Form.Item
                      name="temperature"
                      label="Nhiệt độ"
                      rules={[{ required: true }, { type: "number", min: 34, max: 43 }]}
                    >
                      <InputNumber min={34} max={43} step={0.1} />
                    </Form.Item>
                    <small>°C</small>
                  </div>
                  <div className={nurseStyles.measurementCard}>
                    <Form.Item
                      name="respiratoryRate"
                      label="Nhịp thở"
                      rules={[{ required: true }, { type: "number", min: 8, max: 60 }]}
                    >
                      <InputNumber min={8} max={60} />
                    </Form.Item>
                    <small>lần/phút</small>
                  </div>
                  <div className={nurseStyles.measurementCard}>
                    <h3>Thể trạng & BMI</h3>
                    <div className={nurseStyles.inputPair}>
                      <Form.Item
                        name="weightKg"
                        label="Cân nặng (kg)"
                        rules={[{ type: "number", min: 0.5, max: 500 }]}
                      >
                        <InputNumber min={0.5} max={500} step={0.1} />
                      </Form.Item>
                      <Form.Item
                        name="heightCm"
                        label="Chiều cao (cm)"
                        rules={[{ type: "number", min: 20, max: 280 }]}
                      >
                        <InputNumber min={20} max={280} />
                      </Form.Item>
                    </div>
                    <small>
                      {values?.heightCm && values?.weightKg
                        ? "BMI: " + (values.weightKg / (values.heightCm / 100) ** 2).toFixed(1)
                        : "Nhập chiều cao và cân nặng"}
                    </small>
                  </div>
                </div>
                <Form.Item name="symptomOnset" label="Thời điểm khởi phát">
                  <Input maxLength={100} placeholder="Ví dụ: sáng nay, lúc 7 giờ" />
                </Form.Item>
                <Form.Item name="symptomSeverity" label="Mức độ triệu chứng">
                  <Select
                    allowClear
                    options={[
                      { value: "Nhẹ", label: "Nhẹ" },
                      { value: "Vừa", label: "Vừa" },
                      { value: "Nặng", label: "Nặng" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="symptomDuration" label="Thời gian triệu chứng">
                  <Input />
                </Form.Item>
                <Form.Item name="allergies" label="Dị ứng">
                  <Select mode="tags" />
                </Form.Item>
                <Form.Item name="notes" label="Ghi chú">
                  <Input.TextArea />
                </Form.Item>
                <div className={nurseStyles.formActions}>
                  <Button
                    disabled={submitting}
                    onClick={() => {
                      if (changes.confirmDiscard()) setSelected(undefined);
                    }}
                  >
                    Quay lại hàng đợi
                  </Button>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    Lưu sàng lọc
                  </Button>
                </div>
              </Form>
            </div>
            <aside className={nurseStyles.stack}>
              <div className={nurseStyles.card}>
                <h2>Thông tin tiếp đón tại quầy</h2>
                <div className={nurseStyles.soft}>
                  <strong>{selected.hallTicketNumber}</strong>
                  <p>
                    {selected.patient.insuranceCardNumber
                      ? "BHYT: " + selected.patient.insuranceCardNumber
                      : "Chưa có thông tin BHYT"}
                  </p>
                  <p>{selected.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
                </div>
              </div>
              <div className={nurseStyles.safety}>
                <h2>An toàn phân luồng</h2>
                <p>
                  Đối chiếu trực tiếp với người bệnh. Xem cảnh báo NEWS2 và dấu hiệu F.A.S.T trước
                  khi lưu. Hệ thống quyết định luồng cấp cứu từ dữ liệu đã xác nhận.
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}
      <Modal
        className={nurseStyles.confirmModal}
        width={672}
        title="Xác nhận hoàn tất sàng lọc"

        open={!!assigning}
        okText="Xác nhận phân phòng"
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{ disabled: !departmentCode || !assigning?.intakeCompleted || submitting }}
        onOk={async () => {
          if (!assigning?.intakeCompleted || !departmentCode || submitting) return;
          const saved = await act(
            () => clinicalActions.assign(assigning.visitId, departmentCode),
            "Đã phân phòng và cấp số khám."
          );
          if (saved) {
            setCompleted(assigning);
            setHandoffs((previous) => [
              assigning,
              ...previous.filter((row) => row.visitId !== assigning.visitId),
            ]);
            const room = departments.data?.find((item) => item.code === departmentCode);
            setCompletedRoom(room ? room.code + " · " + room.name : departmentCode);
            setAssigning(undefined);
          }
        }}
        onCancel={() => !submitting && setAssigning(undefined)}
      >
        {assigning && (
          <div className={nurseStyles.confirmSummary}>
            <PatientIdentity visit={assigning} />
            <VitalSummary values={intakes[assigning.visitId]} />
          </div>
        )}
        <p>
          Bệnh nhân nhận số khám riêng của phòng đã chọn. Chỉ chuyển hàng đợi sau khi xác nhận thành
          công.
        </p>
        {departments.error && (
          <Alert
            type="error"
            title="Không tải được danh sách phòng khám"
            description={departments.error}
          />
        )}
        <Select
          style={{ width: "100%" }}
          aria-label="Phòng khám chuyên khoa"
          loading={departments.loading}
          disabled={submitting}
          value={departmentCode}
          placeholder="Chọn phòng khám"
          options={(departments.data || [])
            .filter((item) => item.roomType === "CONSULTATION")
            .map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` }))}
          onChange={setDepartmentCode}
        />
      </Modal>
      <Modal
        title={reissuing?.clinicTicketNumber ? "Cấp lại số khám?" : "Cấp lại số tiếp nhận?"}
        open={!!reissuing}
        okText="Cấp số mới"
        confirmLoading={submitting}
        okButtonProps={{ danger: true, disabled: !reissueReason.trim() || submitting }}
        cancelText="Giữ số hiện tại"
        onCancel={() => !submitting && setReissuing(undefined)}
        onOk={() =>
          reissuing &&
          act(
            () =>
              reissuing.ticketStatus === "EXPIRED"
                ? clinicalActions.reissueExpiredTicket(
                    reissuing.visitId,
                    reissuing.clinicTicketNumber ? "CLINIC" : "HALL",
                    reissueReason
                  )
                : clinicalActions.reissueClinicTicket(reissuing.visitId, reissueReason),
            "Đã cấp lại số."
          ).then((saved) => saved && setReissuing(undefined))
        }
      >
        <Alert
          type="warning"
          showIcon
          title={`Số ${reissuing?.clinicTicketNumber || reissuing?.hallTicketNumber || ""} sẽ mất hiệu lực; bệnh nhân chuyển xuống cuối hàng.`}
        />
        <Input.TextArea
          style={{ marginTop: 16 }}
          value={reissueReason}
          onChange={(event) => setReissueReason(event.target.value)}
          placeholder="Lý do cấp lại (bắt buộc)"
        />
      </Modal>
    </>
  );
}

export function StaffClinicalPanel({ workspace }: { workspace: "nurse" | "doctor" }) {
  return (
    <section
      className={styles.panel}
      aria-label={workspace === "nurse" ? "Bàn làm việc điều dưỡng" : "Bàn làm việc bác sĩ"}
    >
      <div className={styles.intro}>
        <span className={styles.live}>Đồng bộ trực tiếp</span>
        <div>
          <h2>{workspace === "nurse" ? "Bàn làm việc sàng lọc" : "Bàn làm việc khám lâm sàng"}</h2>
          <p>
            {workspace === "nurse"
              ? "Tiếp nhận, ghi nhận dấu hiệu sinh tồn và điều phối bệnh nhân an toàn."
              : "Theo dõi hàng đợi, tiếp nhận người bệnh và hoàn tất y lệnh trong một không gian làm việc."}
          </p>
        </div>
      </div>
      <div className={styles.content}>
        {workspace === "nurse" ? <NursePanel /> : <DoctorWorkspace />}
      </div>
    </section>
  );
}
