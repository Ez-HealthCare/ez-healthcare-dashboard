"use client";

import { useState } from "react";
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
import { AVAILABLE_ORDERS } from "@/lib/constants/doctor";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ClinicQueueItem, IntakeInput, ReceptionVisit } from "@/lib/types/clinical";
import styles from "./staff-clinical-panel.module.css";

function NursePanel() {
  const queue = useClinicalData(clinicalActions.receptionQueue);
  const expired = useClinicalData(clinicalActions.expiredReceptionQueue, 30_000);
  const departments = useClinicalData(clinicalActions.departments, 30_000);
  const [selected, setSelected] = useState<ReceptionVisit>();
  const [assigning, setAssigning] = useState<ReceptionVisit>();
  const [reissuing, setReissuing] = useState<ReceptionVisit>();
  const [reissueReason, setReissueReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<IntakeInput>();
  const [toast, context] = message.useMessage();

  const act = async (action: () => Promise<unknown>, success: string) => {
    try {
      setSubmitting(true);
      await action();
      toast.success(success);
      await Promise.all([queue.refresh(), expired.refresh()]);
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      {context}
      {queue.error && (
        <Alert type="error" showIcon title="Không tải được hàng đợi" description={queue.error} />
      )}
      <Table
        rowKey="visitId"
        loading={queue.loading}
        dataSource={queue.data || []}
        pagination={false}
        columns={[
          { title: "Số tiếp nhận", dataIndex: "hallTicketNumber" },
          { title: "Bệnh nhân", render: (_, row) => row.patient.name },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (value) => (
              <Tag color={value === "EMERGENCY_DISPATCHED" ? "red" : undefined}>
                {value === "EMERGENCY_DISPATCHED" ? "Đã chuyển cấp cứu" : value}
              </Tag>
            ),
          },
          {
            title: "Thao tác",
            render: (_, row) => {
              if (row.status === "EMERGENCY_DISPATCHED") {
                return (
                  <Alert
                    type="error"
                    showIcon
                    title="Không phân phòng khám thường"
                    description="Sinh hiệu nguy cơ cao; tiếp tục xử lý theo luồng cấp cứu."
                  />
                );
              }
              return (
                <Space wrap>
                  <Button
                    loading={submitting}
                    disabled={row.status !== "HALL_WAITING"}
                    onClick={() =>
                      act(() => clinicalActions.verify(row.visitId), "Đã xác minh thông tin.")
                    }
                  >
                    Xác minh
                  </Button>
                  <Button
                    type="primary"
                    loading={submitting}
                    disabled={row.status !== "RECEPTION_VERIFIED"}
                    onClick={() => {
                      setSelected(row);
                      form.resetFields();
                    }}
                  >
                    Ghi thông tin bệnh
                  </Button>
                  <Button
                    loading={submitting}
                    disabled={row.status !== "TRIAGE_PENDING"}
                    onClick={() => setAssigning(row)}
                  >
                    Phân phòng
                  </Button>
                  <Button
                    danger
                    loading={submitting}
                    disabled={!row.clinicTicketNumber || row.status === "CLINIC_CALLED"}
                    onClick={() => {
                      setReissuing(row);
                      setReissueReason("");
                    }}
                  >
                    Cấp lại số khám
                  </Button>
                </Space>
              );
            },
          },
        ]}
      />
      <h3 style={{ marginTop: 24 }}>Lượt hết hạn</h3>
      <p>Danh sách lượt hết hiệu lực gần nhất; chỉ nhân viên được cấp lại.</p>
      <Table
        rowKey={(row) => `expired-${row.visitId}`}
        loading={expired.loading}
        dataSource={expired.data || []}
        pagination={false}
        columns={[
          { title: "Số cũ", render: (_, row) => row.clinicTicketNumber || row.hallTicketNumber },
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
      <Modal
        title={`Tiếp nhận ${selected?.patient.name || ""}`}
        open={!!selected}
        okText="Lưu sàng lọc"
        cancelText="Hủy"
        onCancel={() => setSelected(undefined)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            selected &&
            act(
              () => clinicalActions.intake(selected.visitId, values),
              "Đã lưu thông tin bệnh."
            ).then(() => setSelected(undefined))
          }
        >
          <Form.Item name="chiefComplaint" label="Lý do khám" rules={[{ required: true }]}>
            <Input.TextArea />
          </Form.Item>
          <Space wrap>
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
            <Form.Item
              name="heartRate"
              label="Mạch"
              rules={[{ required: true }, { type: "number", min: 30, max: 240 }]}
            >
              <InputNumber min={30} max={240} />
            </Form.Item>
            <Form.Item
              name="temperature"
              label="Nhiệt độ"
              rules={[{ required: true }, { type: "number", min: 34, max: 43 }]}
            >
              <InputNumber min={34} max={43} step={0.1} />
            </Form.Item>
            <Form.Item
              name="spo2"
              label="SpO₂"
              rules={[{ required: true }, { type: "number", min: 50, max: 100 }]}
            >
              <InputNumber min={50} max={100} />
            </Form.Item>
            <Form.Item
              name="respiratoryRate"
              label="Nhịp thở"
              rules={[{ required: true }, { type: "number", min: 8, max: 60 }]}
            >
              <InputNumber min={8} max={60} />
            </Form.Item>
          </Space>
          <Form.Item name="symptomDuration" label="Thời gian triệu chứng">
            <Input />
          </Form.Item>
          <Form.Item name="allergies" label="Dị ứng">
            <Select mode="tags" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Phân phòng và cấp số khám"
        open={!!assigning}
        footer={null}
        onCancel={() => setAssigning(undefined)}
      >
        <p>Số tiếp nhận cũ sẽ hoàn tất; bệnh nhân nhận số khám riêng của phòng đã chọn.</p>
        <Select
          style={{ width: "100%" }}
          placeholder="Chọn phòng khám"
          options={(departments.data || [])
            .filter((item) => item.roomType === "CONSULTATION")
            .map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` }))}
          onChange={(code) =>
            assigning &&
            act(
              () => clinicalActions.assign(assigning.visitId, code),
              "Đã phân phòng và cấp số khám."
            ).then(() => setAssigning(undefined))
          }
        />
      </Modal>
      <Modal
        title={reissuing?.clinicTicketNumber ? "Cấp lại số khám?" : "Cấp lại số tiếp nhận?"}
        open={!!reissuing}
        okText="Cấp số mới"
        confirmLoading={submitting}
        okButtonProps={{ danger: true, disabled: !reissueReason.trim() || submitting }}
        cancelText="Giữ số hiện tại"
        onCancel={() => setReissuing(undefined)}
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
          ).then(() => setReissuing(undefined))
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

function DoctorPanel() {
  const rooms = useClinicalData(clinicalActions.doctorRooms, 30_000);
  const [room, setRoom] = useState("");
  const selectedRoom = room || rooms.data?.[0]?.code || "";
  const queue = useClinicalData(() =>
    selectedRoom
      ? clinicalActions.roomQueue(selectedRoom)
      : Promise.resolve({ departmentCode: "", departmentName: "", queueLength: 0, queue: [] })
  );
  const [toast, context] = message.useMessage();

  // State for Bước 4: Chỉ định Cận lâm sàng (Kahn DAG)
  const [orderingPatient, setOrderingPatient] = useState<ClinicQueueItem | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>(["P.201", "P.104", "P.203"]);
  const [workingDiagnosis, setWorkingDiagnosis] = useState("Đau bụng thượng vị");
  const [pregnancySuspected, setPregnancySuspected] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [dagResult, setDagResult] = useState<{ sortedOrder: string[] } | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // State for Bước 6: Kết luận chẩn đoán ICD-10 & Kê đơn
  const [concludingPatient, setConcludingPatient] = useState<ClinicQueueItem | null>(null);
  const [icd10Code, setIcd10Code] = useState("K29.7");
  const [icd10Name, setIcd10Name] = useState("Viêm dạ dày, không đặc hiệu");
  const [conclusionNotes, setConclusionNotes] = useState(
    "Uống thuốc đúng giờ, hạn chế đồ cay nóng và rượu bia."
  );
  const [revisitDate, setRevisitDate] = useState("2026-10-27");
  const [submittingConclusion, setSubmittingConclusion] = useState(false);

  const act = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await queue.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    }
  };

  return (
    <>
      {context}
      <Select
        value={selectedRoom || undefined}
        placeholder="Phòng được phân công"
        style={{ minWidth: 320, marginBottom: 16 }}
        onChange={setRoom}
        options={(rooms.data || []).map((item) => ({
          value: item.code,
          label: `${item.code} · ${item.name} · ${item.shiftType}`,
        }))}
      />
      {(rooms.error || queue.error) && (
        <Alert type="error" showIcon title="Không tải được hàng đợi" />
      )}
      <Table
        rowKey="visitId"
        loading={rooms.loading || queue.loading}
        dataSource={queue.data?.queue || []}
        pagination={false}
        columns={[
          { title: "Số khám", dataIndex: "clinicTicketNumber" },
          { title: "Bệnh nhân", dataIndex: "patientName" },
          { title: "Lý do khám", dataIndex: "chiefComplaint", render: (value) => value || "—" },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (value) => {
              let color: string | undefined;
              let label = value;
              if (value === "CLINIC_CALLED") {
                color = "blue";
                label = "Đã gọi vào phòng";
              } else if (value === "IN_EXAMINATION") {
                color = "green";
                label = "Đang khám lâm sàng";
              } else if (value === "PARACLINICAL_PENDING") {
                color = "purple";
                label = "Đang làm cận lâm sàng";
              } else if (value === "RE_EXAM_CALLING") {
                color = "gold";
                label = "Đã có KQ - Gọi tái khám";
              } else if (value === "TEMPORARILY_ABSENT") {
                color = "orange";
                label = "Tạm vắng";
              }
              return <Tag color={color}>{label}</Tag>;
            },
          },
          {
            title: "Dấu hiệu sinh tồn",
            render: (_, row) =>
              row.vitals
                ? `${row.vitals.bp} · ${row.vitals.hr} bpm · SpO₂ ${row.vitals.spo2}%`
                : "—",
          },
          {
            title: "Thao tác",
            render: (_, row) => (
              <Space wrap>
                <Button
                  disabled={!["CLINIC_WAITING", "CLINIC_CALLED"].includes(row.status)}
                  onClick={() => act(() => clinicalActions.call(row.visitId))}
                >
                  Gọi ({row.callAttempts}/3)
                </Button>
                <Button
                  type="primary"
                  disabled={!["CLINIC_CALLED", "RE_EXAM_CALLING"].includes(row.status)}
                  onClick={() => act(() => clinicalActions.startExam(row.visitId))}
                >
                  {row.status === "RE_EXAM_CALLING" ? "Tiếp nhận tái khám" : "Tiếp nhận khám"}
                </Button>
                <Button
                  type="primary"
                  style={{ background: "#006c63", borderColor: "#006c63" }}
                  disabled={!["IN_EXAMINATION", "RE_EXAM_CALLING"].includes(row.status)}
                  onClick={() => {
                    setOrderingPatient(row);
                    setSelectedOrders(["P.201", "P.104", "P.203"]);
                    setWorkingDiagnosis(row.chiefComplaint || "Đau bụng");
                    setPregnancySuspected(false);
                    setDagResult(null);
                  }}
                >
                  Chỉ định CLS (Bước 4)
                </Button>
                <Button
                  disabled={!["IN_EXAMINATION", "RE_EXAM_CALLING"].includes(row.status)}
                  onClick={() => {
                    setConcludingPatient(row);
                    setIcd10Code("K29.7");
                    setIcd10Name("Viêm dạ dày, không đặc hiệu");
                  }}
                >
                  Kết luận & Kê đơn
                </Button>
                <Button
                  disabled={row.status !== "TEMPORARILY_ABSENT"}
                  onClick={() =>
                    act(() => clinicalActions.requeue(row.visitId, "Bệnh nhân đã quay lại"))
                  }
                >
                  Đưa về cuối hàng
                </Button>
              </Space>
            ),
          },
        ]}
      />

      {/* Modal Bước 4: Chỉ định Cận lâm sàng (Kahn DAG) */}
      <Modal
        title={`Chỉ định Cận Lâm Sàng & Điều phối Kahn DAG — ${orderingPatient?.patientName || ""}`}
        open={!!orderingPatient}
        okText="Gửi y lệnh điều phối Kahn DAG"
        cancelText="Đóng"
        confirmLoading={submittingOrder}
        width={680}
        onCancel={() => setOrderingPatient(null)}
        onOk={async () => {
          if (!orderingPatient || selectedOrders.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 trạm cận lâm sàng.");
            return;
          }
          setSubmittingOrder(true);
          try {
            const res = await clinicalActions.createOrders(orderingPatient.visitId, {
              orders: selectedOrders,
              workingDiagnosis,
              pregnancySuspected,
              doctorNotes,
            });
            setDagResult(res);
            toast.success("Đã kích hoạt điều phối Kahn DAG thành công!");
            await queue.refresh();
          } catch (err) {
            toast.error(clinicalErrorMessage(err));
          } finally {
            setSubmittingOrder(false);
          }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dagResult && (
            <Alert
              type="success"
              showIcon
              title="Khởi tạo đồ thị Kahn DAG thành công!"
              description={
                <div>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Thứ tự lộ trình tối ưu (Topological Order):</strong>
                  </p>
                  <Space wrap>
                    {dagResult.sortedOrder.map((code: string, idx: number) => (
                      <Tag color="cyan" key={code} style={{ fontSize: 13, padding: "4px 8px" }}>
                        Bước {idx + 1}: <strong>{code}</strong>
                      </Tag>
                    ))}
                  </Space>
                  <p style={{ margin: "8px 0 0", color: "#555" }}>
                    Bệnh nhân đã chuyển sang trạng thái <strong>PARACLINICAL_PENDING</strong>.
                  </p>
                </div>
              }
            />
          )}

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Chẩn đoán sơ bộ:
            </label>
            <Input
              value={workingDiagnosis}
              onChange={(e) => setWorkingDiagnosis(e.target.value)}
              placeholder="Ví dụ: Đau thượng vị cấp theo dõi viêm dạ dày"
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Chọn các trạm cận lâm sàng (Kahn DAG):
            </label>
            <Checkbox.Group
              value={selectedOrders}
              onChange={(values) => setSelectedOrders(values as string[])}
              style={{ width: "100%" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {AVAILABLE_ORDERS.map((order) => (
                  <div
                    key={order.code}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "8px 12px",
                      background: selectedOrders.includes(order.code) ? "#f0fdfa" : "#fff",
                    }}
                  >
                    <Checkbox value={order.code}>
                      <strong>[{order.code}]</strong> {order.name}
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Tầng {order.floor} · {order.badge}
                      </div>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
            }}
          >
            <Checkbox
              checked={pregnancySuspected}
              onChange={(e) => setPregnancySuspected(e.target.checked)}
            >
              <span style={{ color: "#92400e", fontWeight: 600 }}>
                Nghi ngờ có thai (Kích hoạt bộ lọc chống chỉ định bức xạ X-Quang P.302)
              </span>
            </Checkbox>
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Ghi chú cho kỹ thuật viên:
            </label>
            <Input.TextArea
              rows={2}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Ví dụ: Đánh giá kỹ thành dạ dày và túi mật"
            />
          </div>
        </div>
      </Modal>

      {/* Modal Bước 6: Kết luận chẩn đoán & Kê đơn */}
      <Modal
        title={`Kết luận chẩn đoán & Kê đơn thuốc — ${concludingPatient?.patientName || ""}`}
        open={!!concludingPatient}
        okText="Ký số & Hoàn tất khám"
        cancelText="Đóng"
        confirmLoading={submittingConclusion}
        width={600}
        onCancel={() => setConcludingPatient(null)}
        onOk={async () => {
          if (!concludingPatient) return;
          setSubmittingConclusion(true);
          try {
            await clinicalActions.conclude(concludingPatient.visitId, {
              icd10Code,
              icd10Name,
              doctorNotes: conclusionNotes,
              revisitDate,
              items: [
                {
                  medicationName: "Esomeprazole 40mg",
                  dosage: "40mg",
                  route: "ORAL",
                  frequency: "1 viên/ngày trước ăn sáng",
                  durationDays: 14,
                  quantity: 14,
                  instructions: "Uống trước bữa ăn sáng 30 phút",
                },
              ],
            });
            toast.success("Đã hoàn tất lượt khám và ký đơn thuốc thành công!");
            setConcludingPatient(null);
            await queue.refresh();
          } catch (err) {
            toast.error(clinicalErrorMessage(err));
          } finally {
            setSubmittingConclusion(false);
          }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
              Mã ICD-10 & Tên bệnh:
            </label>
            <Input
              value={`${icd10Code} - ${icd10Name}`}
              onChange={(e) => {
                const parts = e.target.value.split("-");
                setIcd10Code(parts[0]?.trim() || "K29.7");
                setIcd10Name(parts[1]?.trim() || "Viêm dạ dày, không đặc hiệu");
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
              Lời dặn bác sĩ:
            </label>
            <Input.TextArea
              rows={2}
              value={conclusionNotes}
              onChange={(e) => setConclusionNotes(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
              Ngày hẹn tái khám:
            </label>
            <Input
              type="date"
              value={revisitDate}
              onChange={(e) => setRevisitDate(e.target.value)}
            />
          </div>
          <Alert
            type="info"
            showIcon
            title="Đơn thuốc mẫu đi kèm"
            description="Esomeprazole 40mg x 14 viên (Uống 1 viên trước ăn sáng 30 phút). Hệ thống sẽ tự động kiểm tra tương tác dị ứng thuốc."
          />
        </div>
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
        {workspace === "nurse" ? <NursePanel /> : <DoctorPanel />}
      </div>
    </section>
  );
}
