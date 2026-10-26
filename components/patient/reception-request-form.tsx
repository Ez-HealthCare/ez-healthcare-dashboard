"use client";

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
  const save = async (submit: boolean) => {
    try {
      await form.validateFields(
        submit ? ["chiefComplaint", "symptomCodes", "symptomOnset", "symptomSeverity"] : []
      );
      await clinicalActions.saveReceptionRequestDraft(form.getFieldsValue());
      if (submit) await clinicalActions.submitReceptionRequest();
      toast.success(submit ? "Yêu cầu đã gửi đến quầy tiếp nhận." : "Đã lưu nháp.");
      router.replace(ROUTES.PATIENT);
      router.refresh();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) return;
      toast.error(error instanceof Error ? error.message : "Không thể lưu yêu cầu.");
    }
  };
  return (
    <section className={styles.profileCard}>
      {context}
      <span className={styles.visitBadge}>Yêu cầu tiếp nhận</span>
      <h2>Khai triệu chứng</h2>
      <p className={styles.profileIntro}>
        Thông tin này giúp lễ tân chuẩn bị tiếp nhận; không thay thế đánh giá của điều dưỡng.
      </p>
      <Form form={form} layout="vertical" initialValues={initial} className={styles.profileForm}>
        <Form.Item
          label="Lý do đến khám"
          name="chiefComplaint"
          rules={[{ required: true, message: "Vui lòng mô tả lý do khám." }]}
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
        <Form.Item label="Thời điểm khởi phát" name="symptomOnset" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "TODAY", label: "Hôm nay" },
              { value: "FEW_DAYS", label: "Vài ngày" },
              { value: "WEEKS", label: "Vài tuần" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Mức độ khó chịu" name="symptomSeverity" rules={[{ required: true }]}>
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
          <Button onClick={() => void save(false)}>Lưu nháp</Button>
          <Button type="primary" onClick={() => void save(true)}>
            Gửi yêu cầu tiếp nhận
          </Button>
        </div>
      </Form>
    </section>
  );
}

export function ReceptionRequestFormPage() {
  const request = useClinicalData(clinicalActions.currentReceptionRequest, 30_000);
  if (request.data?.status === "RECEPTION_PENDING")
    return (
      <Alert
        type="info"
        showIcon
        message="Yêu cầu đang chờ lễ tân xác minh"
        description="Vui lòng đến quầy tiếp nhận để đối chiếu CCCD/BHYT."
      />
    );
  return <RequestForm key={request.data?.id || "new"} initial={request.data || undefined} />;
}
