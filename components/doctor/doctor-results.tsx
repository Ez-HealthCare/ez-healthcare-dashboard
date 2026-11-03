"use client";

import { formatDateTime } from "@/lib/display-format";

import { useState } from "react";
import { Alert, Button, Empty, Input, Skeleton, Table, Tag } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { AVAILABLE_ORDERS } from "@/lib/constants/doctor";
import type { ClinicQueueItem } from "@/lib/types/clinical";
import type { VisitDossier } from "@/lib/types/doctor";
import type { DoctorAction, DoctorView } from "./doctor-workspace";
import styles from "./doctor-workspace.module.css";

function displayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function imageLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function ResultDetail({ stepId }: { stepId: string }) {
  const result = useClinicalData(() => clinicalActions.diagnosticResult(stepId), 15_000);
  if (result.error)
    return (
      <Alert
        type="error"
        showIcon
        title="Không tải được kết quả"
        description={result.error}
        action={<Button onClick={() => void result.refresh()}>Thử lại</Button>}
      />
    );
  if (!result.data) return <Skeleton active />;
  const data = result.data;
  const values = Object.entries(data.quantitativeValues || {}).map(([name, raw]) => {
    const item =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : undefined;
    return {
      key: name,
      name,
      value: displayValue(item && "value" in item ? item.value : raw),
      unit: displayValue(item?.unit),
      reference: displayValue(item?.referenceRange ?? item?.normalRange),
      flag: displayValue(item?.flag),
    };
  });
  const images = (data.dicomImageUrls || []).map(imageLink).filter((url): url is string => !!url);
  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>{data.serviceName}</h2>
          <Tag color="cyan">
            {data.stepStatus === "COMPLETED" ? "Đã hoàn tất" : data.stepStatus || "Kết quả"}
          </Tag>
        </div>
        <p className={styles.meta}>
          {data.approvedAt
            ? `Thời gian duyệt: ${formatDateTime(data.approvedAt)}`
            : "Chưa có thời gian duyệt"}
          {data.technician?.name ? ` · ${data.technician.name}` : ""}
        </p>
        {data.isPanicValue && (
          <Alert
            type="error"
            showIcon
            title="Cảnh báo giá trị nguy cấp"
            description={data.panicAlertDetails}
          />
        )}
        {values.length ? (
          <Table
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={values}
            scroll={{ x: 480 }}
            columns={[
              { title: "Thông số", dataIndex: "name" },
              { title: "Kết quả", dataIndex: "value" },
              { title: "Đơn vị", dataIndex: "unit" },
              { title: "Khoảng tham chiếu", dataIndex: "reference" },
              { title: "Cờ", dataIndex: "flag" },
            ]}
          />
        ) : (
          <p className={styles.meta}>Kết quả này không kèm bảng chỉ số định lượng.</p>
        )}
      </section>
      <section className={styles.card}>
        <h2>Mô tả & Kết luận chuyên môn</h2>
        <div className={styles.soft}>
          <p className={styles.preformatted}>{data.findings || "Chưa có nội dung kết luận."}</p>
        </div>
      </section>
      {images.length > 0 && (
        <section className={styles.card}>
          <h2>Hình ảnh chẩn đoán</h2>
          <div className={styles.imageLinks}>
            {images.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                Mở hình ảnh / PACS {index + 1} ↗
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function DoctorResults({
  patient,
  dossier,
  loading,
  busy,
  canReceive,
  act,
  onView,
  onRefresh,
  assessment,
  onAssessment,
  canWrite,
}: {
  patient: ClinicQueueItem;
  dossier?: VisitDossier;
  loading: boolean;
  busy: boolean;
  canReceive: boolean;
  act: DoctorAction;
  onView: (view: DoctorView) => void;
  onRefresh: () => Promise<void>;
  assessment: string;
  onAssessment: (value: string) => void;
  canWrite: boolean;
}) {
  const [stepId, setStepId] = useState("");
  const steps = (dossier?.steps || [])
    .filter(
      (step) =>
        !step.isReExam &&
        (AVAILABLE_ORDERS.some((order) => order.code === step.department?.code) ||
          (!!step.department?.roomType &&
            !["CONSULTATION", "TRIAGE"].includes(step.department.roomType)))
    )
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const selected =
    steps.find((step) => step.stepId === stepId) ||
    steps.find((step) => step.status === "COMPLETED") ||
    steps[0];
  const done = steps.filter((step) => step.status === "COMPLETED").length;
  return (
    <div className={styles.resultsGrid}>
      <aside className={styles.stack}>
        <section className={styles.card}>
          <h2>
            Danh sách chỉ định <span className={styles.pill}>{steps.length}</span>
          </h2>
          {steps.length ? (
            steps.map((step) => (
              <button
                className={`${styles.resultLink} ${selected?.stepId === step.stepId ? styles.activeResult : ""}`}
                key={step.stepId}
                onClick={() => setStepId(step.stepId)}
              >
                <strong>
                  {step.department?.name || step.department?.code || "Dịch vụ cận lâm sàng"}
                </strong>
                <span>
                  {step.status === "COMPLETED"
                    ? "✓ Đã hoàn tất"
                    : step.status === "IN_PROGRESS"
                      ? "Đang thực hiện"
                      : "Đang chờ"}
                </span>
              </button>
            ))
          ) : (
            <p className={styles.meta}>Chưa có chỉ định cận lâm sàng.</p>
          )}
        </section>
      </aside>
      {loading && !dossier ? (
        <Skeleton active />
      ) : selected ? (
        selected.status === "COMPLETED" ? (
          <ResultDetail key={selected.stepId} stepId={selected.stepId} />
        ) : (
          <div className={styles.card}>
            <Empty description="Chỉ định chưa hoàn tất. Kết quả sẽ được cập nhật sau khi có xác nhận." />
          </div>
        )
      ) : (
        <div className={styles.card}>
          <Empty description="Chưa có kết quả cận lâm sàng cho lượt khám này" />
        </div>
      )}
      <aside className={styles.stack}>
        <section className={styles.card}>
          <h2>Tổng quan lâm sàng</h2>
          <div className={styles.soft}>
            <strong>
              {done}/{steps.length} dịch vụ đã hoàn tất
            </strong>
          </div>
          <p>{patient.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
          <Button block onClick={() => void onRefresh()} disabled={busy || !canReceive}>
            Làm mới chỉ định
          </Button>
        </section>
        <section className={styles.card}>
          <h2>Biện luận của Bác sĩ</h2>
          <Input.TextArea
            aria-label="Biện luận kết quả CLS"
            rows={6}
            value={assessment}
            disabled={busy || !canWrite}
            onChange={(event) => onAssessment(event.target.value)}
            placeholder="Ghi nhận để đính kèm khi hoàn tất khám…"
          />
          <div className={styles.quickActions}>
            {patient.status === "RE_EXAM_CALLING" && (
              <Button
                type="primary"
                disabled={busy || !canReceive}
                onClick={async () => {
                  if (
                    await act(
                      () => clinicalActions.startExam(patient.visitId),
                      "Đã tiếp nhận tái khám."
                    )
                  ) {
                    await onRefresh();
                    onView("clinical");
                  }
                }}
              >
                Tiếp nhận tái khám
              </Button>
            )}
            <Button
              type="primary"
              disabled={busy || !canWrite}
              onClick={() => onView("conclusion")}
            >
              Tiếp tục kết luận →
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}
