import { HttpError } from "./api/http";

const messages: Record<string, string> = {
  ROOM_BUSY:
    "Phòng đang khám một bệnh nhân. Hãy hoàn tất hoặc chuyển bước lượt hiện tại trước khi gọi hay tiếp nhận lượt khác.",
  ROOM_SCHEDULE_CONFLICT:
    "Phòng khám đang bị trùng lịch bác sĩ. Vui lòng liên hệ quản trị để phân lại lịch trước khi tiếp nhận khám.",
  QUEUE_CLOSED: "Đã ngoài giờ cấp số. Vui lòng quay lại trong giờ tiếp nhận.",
  TICKET_EXPIRED: "Lượt đã hết hiệu lực. Vui lòng liên hệ lễ tân để được cấp lại.",
  ROOM_QUOTA_REACHED: "Phòng khám đã đủ chỉ tiêu trong ngày. Vui lòng chọn phòng phù hợp khác.",
  VISIT_STATE_CONFLICT: "Trạng thái lượt khám vừa thay đổi. Vui lòng tải lại và thử lại.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu này trùng khóa với một thao tác khác. Vui lòng thử lại.",
  ROOM_ACCESS_DENIED: "Bạn không được phân công phụ trách phòng khám này.",
};

export function clinicalErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError) || !error.data || typeof error.data !== "object") {
    return "Không thể kết nối dịch vụ lâm sàng. Vui lòng thử lại.";
  }
  const data = error.data as { code?: unknown; message?: unknown };
  const detail = Array.isArray(data.message)
    ? data.message.filter((item): item is string => typeof item === "string").join("; ")
    : typeof data.message === "string"
      ? data.message
      : "";
  return (
    (typeof data.code === "string" && messages[data.code]) || detail || "Thao tác không thành công."
  );
}
