export const ROLE_LABELS = {
  PATIENT: "Bệnh nhân",
  RECEPTIONIST: "Lễ tân",
  NURSE: "Điều dưỡng",
  DOCTOR: "Bác sĩ",
  LAB_TECHNICIAN: "Kỹ thuật viên xét nghiệm",
  EMERGENCY_STAFF: "Nhân viên cấp cứu",
  ADMIN: "Quản trị viên",
} as const;

export const AUTH_COOKIE_NAMES = ["ez_access", "ez_refresh"] as const;

export const AUTH_PATHS = {
  STAFF_LOGIN: "staff/login",
  REQUEST_OTP: "patient/request-otp",
  VERIFY_OTP: "patient/verify-otp",
  SESSION: "session",
  LOGOUT: "logout",
  REFRESH: "refresh",
  ME: "me",
} as const;

export const AUTH_POST_PATHS = [
  AUTH_PATHS.STAFF_LOGIN,
  AUTH_PATHS.REQUEST_OTP,
  AUTH_PATHS.VERIFY_OTP,
  AUTH_PATHS.REFRESH,
  AUTH_PATHS.LOGOUT,
  AUTH_PATHS.SESSION,
] as const;

export const ACCESS_COOKIE = AUTH_COOKIE_NAMES[0];
export const REFRESH_COOKIE = AUTH_COOKIE_NAMES[1];
export const OTP_RESEND_DELAY_MS = 60_000;
export const OTP_LIFETIME_MINUTES = 5;
export const OTP_LENGTH = 6;
export const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`);
export const STAFF_PASSWORD_MIN_LENGTH = 6;
export const SESSION_CHECK_INTERVAL_MS = 60_000;
export const SESSION_LOCK_NAME = "ez-auth-session";
