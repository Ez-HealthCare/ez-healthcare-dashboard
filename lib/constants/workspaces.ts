import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";

export const WORKSPACES = {
  patient: {
    label: "Bệnh nhân",
    path: ROUTES.PATIENT,
    description: "Theo dõi lượt khám và hồ sơ của bạn.",
    navigation: PATIENT_NAVIGATION,
  },
  nurse: {
    label: "Điều dưỡng / Tiếp nhận",
    path: ROUTES.NURSE,
    description: "Tiếp nhận hành chính và sàng lọc trước khám trong cùng một không gian làm việc.",
    navigation: [
      ["", "Bàn làm việc"],
      ["reception", "Tiếp nhận"],
      ["screening", "Sàng lọc"],
    ],
  },
  doctor: {
    label: "Bác sĩ",
    path: ROUTES.DOCTOR,
    description: "Hàng đợi và bàn khám. Hồ sơ bệnh nhân sẽ nằm trong ngữ cảnh lượt khám được chọn.",
    navigation: [
      ["", "Bàn làm việc"],
      ["queue", "Hàng đợi khám"],
      ["consultation", "Bàn khám"],
    ],
  },
  admin: {
    label: "Quản trị viên",
    path: ROUTES.ADMIN,
    description:
      "Quản lý tài khoản, danh mục, lịch trực và cấu hình. Không thực hiện thay nghiệp vụ lâm sàng.",
    navigation: [
      ["", "Tổng quan"],
      ["users", "Tài khoản"],
      ["departments", "Khoa / Phòng"],
      ["schedules", "Lịch trực"],
      ["settings", "Cấu hình"],
    ],
  },
} as const;

export type Workspace = keyof typeof WORKSPACES;

export function isWorkspace(value: string): value is Workspace {
  return Object.hasOwn(WORKSPACES, value);
}

export function workspaceForRole(role: string): Workspace | undefined {
  switch (role) {
    case "PATIENT":
      return "patient";
    case "NURSE":
    case "RECEPTIONIST":
      return "nurse"; // Legacy account alias; new accounts use NURSE.
    case "DOCTOR":
      return "doctor";
    case "ADMIN":
      return "admin";
    default:
      return undefined;
  }
}

export function canAccessWorkspace(role: string, workspace: Workspace): boolean {
  return workspaceForRole(role) === workspace;
}

export function isWorkspaceSection(workspace: Workspace, section: string): boolean {
  return WORKSPACES[workspace].navigation.some(([key]) => key === section);
}
