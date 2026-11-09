import type { VisitDossier } from "./types/doctor";
import type { CurrentVisit, VisitStatus } from "./types/clinical";
import { isFinalVisit, visitStatusLabel } from "@/lib/visit-status";

type Guidance = { title: string; description: string; tone: "info" | "warning" | "success" };
const guidance: Record<VisitStatus, Guidance> = {
  HALL_WAITING: {
    title: "Chờ gọi đến quầy tiếp nhận",
    description: "Theo dõi số tiếp nhận và chuẩn bị CCCD/BHYT để đối chiếu tại quầy.",
    tone: "info",
  },
  RECEPTION_VERIFIED: {
    title: "Chờ hướng dẫn sàng lọc",
    description:
      "Thông tin đã được xác minh. Vui lòng chờ nhân viên y tế hướng dẫn bước tiếp theo.",
    tone: "info",
  },
  TRIAGE_PENDING: {
    title: "Chờ điều dưỡng gọi sàng lọc",
    description: "Điều dưỡng sẽ gọi bạn để đo sinh hiệu và sàng lọc trước khi khám.",
    tone: "info",
  },
  CLINIC_WAITING: {
    title: "Đến khu vực chờ trước phòng khám",
    description: "Theo dõi số khám và chờ bác sĩ gọi vào phòng. Bạn chưa được vào khám ngay.",
    tone: "info",
  },
  CLINIC_CALLED: {
    title: "Bạn đã được gọi vào phòng khám",
    description: "Vui lòng đến phòng khám được phân và làm theo hướng dẫn của nhân viên y tế.",
    tone: "info",
  },
  TEMPORARILY_ABSENT: {
    title: "Báo có mặt khi bạn quay lại",
    description:
      "Nếu đã trở lại trước phòng khám, hãy báo bác sĩ qua nút bên dưới và chờ xác nhận xếp lại lượt.",
    tone: "warning",
  },
  IN_EXAMINATION: {
    title: "Bạn đang trong lượt khám",
    description:
      "Làm theo hướng dẫn của bác sĩ. Các chỉ định và bước tiếp theo sẽ được cập nhật tại đây.",
    tone: "info",
  },
  PARACLINICAL_PENDING: {
    title: "Thực hiện chỉ định và chờ kết quả",
    description:
      "Vui lòng thực hiện các chỉ định CLS. Khi đủ kết quả, bạn sẽ quay lại phòng khám để tái khám.",
    tone: "info",
  },
  RE_EXAM_CALLING: {
    title: "Quay lại phòng khám để tái khám",
    description:
      "Đã có đủ kết quả CLS. Vui lòng quay lại phòng khám và chờ bác sĩ tiếp nhận tái khám.",
    tone: "info",
  },
  COMPLETED: {
    title: "Lượt khám của bạn đã hoàn tất",
    description:
      "Bác sĩ đã lưu kết luận và đơn thuốc. Xem lại lời dặn và lịch tái khám trong hồ sơ của bạn.",
    tone: "success",
  },
  CANCELLED: {
    title: "Lượt khám đã được hủy",
    description: "Lộ trình này đã dừng. Vui lòng liên hệ quầy tiếp nhận nếu bạn cần được hỗ trợ.",
    tone: "warning",
  },
  EMERGENCY_DISPATCHED: {
    title: "Bạn đã được chuyển cấp cứu",
    description:
      "Làm theo hướng dẫn trực tiếp của nhân viên y tế. Không tiếp tục lộ trình khám thông thường.",
    tone: "warning",
  },
};

export function patientGuidance(visit: CurrentVisit): Guidance {
  if (visit.ticketStatus === "EXPIRED" && !isFinalVisit(visit.status)) {
    return {
      title: "Lượt đã hết hiệu lực",
      description: "Bạn không thể tự cấp lại. Vui lòng liên hệ lễ tân để được cấp số mới.",
      tone: "warning",
    };
  }
  if (visit.status === "HALL_WAITING" && visit.ticketStatus === "CALLED") {
    return {
      title: "Mời bạn đến quầy tiếp nhận",
      description: "Bạn đã được gọi. Vui lòng mang CCCD/BHYT đến quầy để xác minh thông tin.",
      tone: "info",
    };
  }
  if (visit.status === "HALL_WAITING" && visit.ticketStatus === "PAUSED") {
    return {
      title: "Lượt tiếp nhận đang tạm bỏ qua",
      description: "Vui lòng liên hệ lễ tân tại quầy để được hướng dẫn gọi lại số tiếp nhận.",
      tone: "warning",
    };
  }
  return (
    guidance[visit.status] || {
      title: "Đang cập nhật lượt khám",
      description: "Vui lòng theo dõi thông báo hoặc liên hệ quầy tiếp nhận để được hướng dẫn.",
      tone: "info",
    }
  );
}

export function patientStepState(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Đã hoàn thành", tone: "done" };
    case "IN_PROGRESS":
      return { label: "Đang thực hiện", tone: "current" };
    case "WAITING":
      return { label: "Chờ thực hiện", tone: "waiting" };
    case "PENDING":
      return { label: "Chưa thực hiện", tone: "pending" };
    case "SKIPPED":
      return { label: "Đã bỏ qua", tone: "skipped" };
    default:
      return { label: "Đang cập nhật", tone: "pending" };
  }
}

export function patientVisitStatus(visit: CurrentVisit) {
  if (!isFinalVisit(visit.status) && visit.ticketStatus === "EXPIRED") return "Vé hết hiệu lực";
  if (visit.status === "HALL_WAITING" && visit.ticketStatus === "CALLED")
    return "Đã được gọi đến quầy tiếp nhận";
  if (visit.status === "HALL_WAITING" && visit.ticketStatus === "PAUSED")
    return "Tạm bỏ qua tại quầy";
  if (visit.status === "PARACLINICAL_PENDING") return "Chưa đủ kết quả CLS";
  return visitStatusLabel(visit.status);
}

export type PatientJourneyStep = NonNullable<VisitDossier["steps"]>[number];
export type JourneyFocus = Guidance & {
  destination?: { code: string; name: string; floor?: number };
  destinationLabel: string;
  stepId?: string;
};

/** Only matching, current dossier snapshots may refine the visit-level guidance. */
export function patientJourneyFocus(
  visit: CurrentVisit,
  dossier?: VisitDossier | null
): JourneyFocus {
  const fresh =
    dossier?.visitId === visit.visitId && dossier.status === visit.status ? dossier : undefined;
  const final = isFinalVisit(visit.status);
  const assigned =
    fresh?.currentDepartment?.code === visit.room?.code
      ? fresh?.currentDepartment
      : visit.room || undefined;
  const base: JourneyFocus = {
    ...patientGuidance(visit),
    destination: assigned,
    destinationLabel: final
      ? "Phòng khám được ghi nhận"
      : visit.status === "PARACLINICAL_PENDING"
        ? "Phòng khám phụ trách"
        : "Phòng khám được phân",
  };
  if (final || visit.ticketStatus === "EXPIRED" || !fresh) return base;
  const steps = [...(fresh.steps || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const returnStep = steps.find(
    (step) => step.isReExam && ["PENDING", "WAITING", "IN_PROGRESS"].includes(step.status)
  );
  if (visit.status === "RE_EXAM_CALLING") {
    return {
      ...base,
      destination: returnStep?.department || assigned,
      destinationLabel: "Phòng cần quay lại",
      stepId: returnStep?.stepId,
    };
  }
  if (visit.status === "IN_EXAMINATION" && returnStep?.status === "IN_PROGRESS") {
    return {
      ...base,
      title: "Bác sĩ đang đọc kết quả và tái khám",
      description:
        "Bạn đã được tiếp nhận tái khám. Làm theo hướng dẫn trực tiếp của bác sĩ tại phòng khám.",
      destination: returnStep.department || assigned,
      destinationLabel: "Phòng đang tái khám",
      stepId: returnStep.stepId,
    };
  }
  if (visit.status !== "PARACLINICAL_PENDING") return base;
  const diagnostics = steps.filter(
    (step) =>
      !step.isReExam &&
      (!step.department?.roomType || ["LABORATORY", "IMAGING"].includes(step.department.roomType))
  );
  const working = diagnostics.filter((step) => step.status === "IN_PROGRESS");
  const waiting = diagnostics.filter((step) => step.status === "WAITING");
  if (working.length === 1) {
    const step = working[0];
    return {
      ...base,
      title: `Đang thực hiện: ${step.department?.name || "Chỉ định cận lâm sàng"}`,
      description:
        "Chỉ định đang được nhân viên y tế thực hiện hoặc xử lý. Chưa có xác nhận hoàn tất kết quả cho bước này.",
      destination: step.department,
      destinationLabel: "Phòng đang thực hiện chỉ định",
      stepId: step.stepId,
    };
  }
  if (working.length > 1)
    return {
      ...base,
      title: `Có ${working.length} chỉ định đang thực hiện`,
      description:
        "Theo dõi từng bước bên dưới và làm theo hướng dẫn của nhân viên y tế. Kết quả của các bước này chưa được xác nhận hoàn tất.",
      destinationLabel: "Phòng khám phụ trách",
    };
  if (waiting.length === 1) {
    const step = waiting[0];
    return {
      ...base,
      title: `Chờ thực hiện: ${step.department?.name || "Chỉ định cận lâm sàng"}`,
      description:
        "Bạn đang chờ thực hiện chỉ định này. Theo dõi hướng dẫn của nhân viên y tế tại phòng liên quan.",
      destination: step.department,
      destinationLabel: "Phòng chờ thực hiện chỉ định",
      stepId: step.stepId,
    };
  }
  if (waiting.length > 1)
    return {
      ...base,
      title: `Có ${waiting.length} chỉ định chờ thực hiện`,
      description:
        "Xem các bước chờ bên dưới. Nhân viên y tế sẽ hướng dẫn thứ tự thực hiện phù hợp.",
      destinationLabel: "Phòng khám phụ trách",
    };
  if (diagnostics.length && diagnostics.every((step) => step.status === "COMPLETED"))
    return {
      ...base,
      title: "Chờ thông báo quay lại bác sĩ",
      description:
        "Các bước cận lâm sàng trong hồ sơ đã hoàn tất. Vui lòng chờ hệ thống xác nhận đủ kết quả và thông báo tái khám trước khi quay lại phòng.",
      destinationLabel: "Phòng khám phụ trách",
    };
  if (diagnostics.some((step) => step.status === "PENDING"))
    return {
      ...base,
      title: "Chờ hướng dẫn thực hiện chỉ định",
      description:
        "Các chỉ định chưa thực hiện có thể cần theo thứ tự hoặc điều kiện riêng. Liên hệ nhân viên y tế để được hướng dẫn; chưa có phòng tiếp theo được xác nhận.",
      destinationLabel: "Phòng khám phụ trách",
    };
  return base;
}

export function patientStepDescription(
  step: PatientJourneyStep,
  visit: CurrentVisit,
  current = true
) {
  if (step.status === "COMPLETED")
    return step.isReExam
      ? "Bước tái khám đã được ghi nhận hoàn tất."
      : "Nhân viên y tế đã xác nhận hoàn tất bước này trong hồ sơ.";
  if (step.status === "SKIPPED")
    return "Bước này đã được ghi nhận bỏ qua, không tính là đã hoàn thành.";
  if (isFinalVisit(visit.status) || visit.ticketStatus === "EXPIRED")
    return "Lượt khám đã kết thúc hoặc hết hiệu lực. Đây là trạng thái được ghi nhận của bước, không phải hướng dẫn tiếp tục di chuyển.";
  if (!current)
    return "Thông tin bước đang được cập nhật. Vui lòng chờ hướng dẫn mới nhất trước khi di chuyển.";
  if (step.isReExam) {
    if (visit.status === "RE_EXAM_CALLING")
      return "Hệ thống đã xác nhận đủ kết quả. Quay lại phòng này và chờ bác sĩ tiếp nhận tái khám.";
    if (step.status === "IN_PROGRESS" && visit.status === "IN_EXAMINATION")
      return "Bác sĩ đã tiếp nhận bạn để đọc kết quả và tái khám.";
    return "Bước quay lại bác sĩ sau cận lâm sàng. Chờ thông báo đủ kết quả và hướng dẫn tái khám.";
  }
  if (step.status === "WAITING")
    return "Bạn đang chờ nhân viên y tế thực hiện chỉ định. Theo dõi hướng dẫn tại phòng liên quan.";
  if (step.status === "IN_PROGRESS")
    return "Chỉ định đang được thực hiện hoặc xử lý. Chờ nhân viên y tế thông báo khi hoàn tất.";
  if (step.status === "PENDING")
    return "Chưa thực hiện. Bước này có thể cần hoàn tất bước trước hoặc được nhân viên y tế hướng dẫn thêm.";
  return "Trạng thái đang được cập nhật. Vui lòng liên hệ nhân viên y tế nếu bạn cần hướng dẫn.";
}

export function patientJourneyStepState(
  step: PatientJourneyStep,
  visit: CurrentVisit,
  current = true
) {
  if (
    current &&
    step.isReExam &&
    !["COMPLETED", "SKIPPED"].includes(step.status) &&
    visit.ticketStatus !== "EXPIRED"
  ) {
    if (visit.status === "RE_EXAM_CALLING")
      return { label: "Chờ bác sĩ tiếp nhận", tone: "waiting" };
    if (visit.status === "IN_EXAMINATION" && step.status === "IN_PROGRESS")
      return { label: "Đang tái khám", tone: "current" };
  }
  return patientStepState(step.status);
}
