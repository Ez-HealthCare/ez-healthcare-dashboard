"use client";

import { useRef, useState } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { Alert, Button, Form, Input, Select, message } from "antd";
import { useRouter } from "next/navigation";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { ROUTES } from "@/lib/constants/routes";
import type { ReceptionRequestDraft } from "@/lib/types/clinical";
import styles from "./patient-dashboard.module.css";

const symptoms = [
  "Ho",
  "Sốt",
  "Đau họng",
  "Đau bụng",
  "Buồn nôn",
  "Tiêu chảy",
  "Đau lưng",
  "Đau khớp",
  "Chóng mặt",
  "Mệt mỏi",
  "Phát ban",
];

function RequestForm({ initial }: { initial?: ReceptionRequestDraft }) {
  const router = useRouter();
  const [toast, context] = message.useMessage();
  const [form] = Form.useForm<ReceptionRequestDraft>();
  const changes = useUnsavedChanges();
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name: string[]; errors: string[] }[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const save = async (submit: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setError("");
    setFieldErrors([]);
    try {
      await form.validateFields(
        submit ? ["chiefComplaint", "symptomCodes", "symptomOnset", "symptomSeverity"] : []
      );
      setSaving(true);
      await clinicalActions.saveReceptionRequestDraft(form.getFieldsValue());
      if (submit) await clinicalActions.submitReceptionRequest();
      changes.markSaved();
      toast.success(submit ? "Yêu cầu đã gửi đến quầy tiếp nhận." : "Đã lưu nháp.");
      router.replace(ROUTES.PATIENT);
      router.refresh();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
        const fields = (error as { errorFields: { name: string[]; errors: string[] }[] })
          .errorFields;
        setFieldErrors(fields);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <section className={styles.profileCard}>
      {context}
      <span className={styles.visitBadge}>Yêu cầu tiếp nhận</span>
      <h1>Khai triệu chứng</h1>
      <p className={styles.profileIntro}>
        Thông tin này giúp lễ tân chuẩn bị tiếp nhận; không thay thế đánh giá của điều dưỡng.
      </p>
      {changes.dirty && <p role="status">Có nội dung chưa lưu.</p>}
      {error && <Alert type="error" showIcon title="Chưa hoàn tất yêu cầu" description={error} />}
      {fieldErrors.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="request-errors-title"
          className={styles.formErrorSummary}
        >
          <h2 id="request-errors-title">Vui lòng kiểm tra thông tin</h2>
          <ul>
            {fieldErrors.map((field) => (
              <li key={field.name.join(".")}>
                <a
                  href={`#reception-request_${field.name.join("_")}`}
                  onClick={(event) => {
                    event.preventDefault();
                    form.scrollToField(field.name, { focus: true });
                  }}
                >
                  {field.errors[0]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Form
        name="reception-request"
        form={form}
        disabled={saving}
        onValuesChange={changes.markDirty}
        layout="vertical"
        initialValues={initial}
        className={styles.profileForm}
      >
        <Form.Item
          label="Lý do đến khám"
          name="chiefComplaint"
          rules={[{ required: true, whitespace: true, message: "Vui lòng mô tả lý do khám." }]}
        >
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
        <Form.Item
          label="Triệu chứng"
          name="symptomCodes"
          rules={[{ required: true, message: "Chọn ít nhất một triệu chứng." }]}
        >
          <Select mode="multiple" options={symptoms.map((value) => ({ value, label: value }))} />
        </Form.Item>
        <Form.Item
          label="Thời điểm khởi phát"
          name="symptomOnset"
          rules={[{ required: true, message: "Vui lòng chọn thời điểm khởi phát." }]}
        >
          <Select
            options={[
              { value: "TODAY", label: "Hôm nay" },
              { value: "FEW_DAYS", label: "Vài ngày" },
              { value: "WEEKS", label: "Vài tuần" },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Mức độ khó chịu"
          name="symptomSeverity"
          rules={[{ required: true, message: "Vui lòng chọn mức độ khó chịu." }]}
        >
          <Select
            options={[
              { value: "MILD", label: "Nhẹ" },
              { value: "MODERATE", label: "Vừa" },
              { value: "SEVERE", label: "Nhiều" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Ghi chú thêm" name="patientNote">
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
        <Form.Item label="Nhu cầu mong muốn" name="requestedServiceNote">
          <Input maxLength={500} placeholder="Ví dụ: muốn khám nội tổng quát" />
        </Form.Item>
        <div className={styles.profileActions}>
          <Button loading={saving} onClick={() => void save(false)}>
            Lưu nháp
          </Button>
          <Button type="primary" loading={saving} onClick={() => void save(true)}>
            Gửi yêu cầu tiếp nhận
          </Button>
        </div>
      </Form>
    </section>
  );
}

export function ReceptionRequestFormPage() {
  const request = useClinicalData(clinicalActions.currentReceptionRequest, 30_000);
  if (request.loading)
    return (
      <section className={styles.profileCard}>
        <h1>Khai triệu chứng</h1>
        <p role="status">Đang tải yêu cầu…</p>
      </section>
    );
  if (request.error && !request.data)
    return (
      <section className={styles.profileCard}>
        <h1>Khai triệu chứng</h1>
        <Alert
          type="error"
          showIcon
          title="Không tải được yêu cầu"
          description="Chưa thể tải thông tin. Vui lòng thử lại sau ít phút."
          action={<Button onClick={() => void request.refresh()}>Thử lại</Button>}
        />
      </section>
    );
  if (request.data?.status === "RECEPTION_PENDING")
    return (
      <section className={styles.profileCard}>
        <h1>Khai triệu chứng</h1>
        <Alert
          type="info"
          showIcon
          message="Yêu cầu đang chờ lễ tân xác minh"
          description="Vui lòng đến quầy tiếp nhận để đối chiếu CCCD/BHYT."
        />
      </section>
    );
  return <RequestForm key="request-form" initial={request.data || undefined} />;
}
