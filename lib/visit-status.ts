import type { VisitStatus } from "./types/clinical";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  HALL_WAITING: "Chờ tiếp nhận",
  RECEPTION_VERIFIED: "Đã xác minh thông tin",
  TRIAGE_PENDING: "Chờ sàng lọc",
  CLINIC_WAITING: "Chờ khám",
  CLINIC_CALLED: "Đã gọi vào phòng",
  TEMPORARILY_ABSENT: "Tạm vắng",
  IN_EXAMINATION: "Đang khám",
  PARACLINICAL_PENDING: "Chờ kết quả CLS",
  RE_EXAM_CALLING: "Có kết quả · Chờ tái khám",
  COMPLETED: "Đã hoàn tất khám",
  EMERGENCY_DISPATCHED: "Đã chuyển cấp cứu",
  CANCELLED: "Đã hủy",
};

export const visitStatusLabel = (status: string) =>
  VISIT_STATUS_LABELS[status as VisitStatus] || "Đang cập nhật trạng thái";

export const isFinalVisit = (status: string) =>
  ["COMPLETED", "CANCELLED", "EMERGENCY_DISPATCHED"].includes(status);

export const patientRecordLink = (visitId: string) =>
  `/dashboard/patient/records?visitId=${encodeURIComponent(visitId)}`;
