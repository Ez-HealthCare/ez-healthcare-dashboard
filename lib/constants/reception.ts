import type { ReceptionVisit } from "@/lib/types/clinical";

export const RECEPTION_STATUS: Record<ReceptionVisit["status"], string> = {
  HALL_WAITING: "Chờ tiếp nhận",
  RECEPTION_VERIFIED: "Đã xác minh",
  TRIAGE_PENDING: "Chờ sàng lọc",
  CLINIC_WAITING: "Đã cấp số khám",
  CLINIC_CALLED: "Đã gọi vào phòng",
  TEMPORARILY_ABSENT: "Tạm vắng",
  IN_EXAMINATION: "Đang khám",
  PARACLINICAL_PENDING: "Chờ cận lâm sàng",
  RE_EXAM_CALLING: "Chờ tái khám",
  COMPLETED: "Hoàn tất",
  EMERGENCY_DISPATCHED: "Đã chuyển cấp cứu",
  CANCELLED: "Đã hủy",
};
