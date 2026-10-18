export const ROUTES = {
  LOGIN: "/",
  DASHBOARD: "/dashboard",
  PATIENT: "/dashboard/patient",
  NURSE: "/dashboard/nurse",
  DOCTOR: "/dashboard/doctor",
  ADMIN: "/dashboard/admin",
  LEGACY_DOCTOR: "/doctor",
  LEGACY_NURSE: "/nurse",
  LEGACY_PATIENT: "/patient",
} as const;

export const PATIENT_NAVIGATION = [
  ["", "Trang chủ"],
  ["visits", "Lượt khám của tôi"],
  ["records", "Hồ sơ khám bệnh"],
] as const;

export type DashboardMenu = "dashboard" | "doctor" | "nurse" | "patient" | "users";

// Existing prototype links; this refactor does not enable new workspaces.
export const DASHBOARD_NAVIGATION = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: "grid", menu: "dashboard" },
  { label: "Khoa Khám Bệnh", href: "#organizations", icon: "building", menu: undefined },
  { label: "Phòng Khám Lâm Sàng", href: "#sites", icon: "clinic", menu: undefined },
  { label: "Bàn Khám Bác Sĩ S5", href: ROUTES.LEGACY_DOCTOR, icon: "chat", menu: "doctor" },
  { label: "Tiếp Nhận Khám S0", href: ROUTES.LEGACY_NURSE, icon: "calendar", menu: "nurse" },
  { label: "Lộ Trình Bệnh Nhân S3", href: ROUTES.LEGACY_PATIENT, icon: "chart", menu: "patient" },
  { label: "Người Dùng & Hồ Sơ", href: "#users", icon: "users", menu: "users" },
] as const;
