import "client-only";
import { AUTH_PATHS, OTP_RESEND_DELAY_MS, SESSION_LOCK_NAME } from "@/lib/constants/auth";
import { AUTH_BASE_PATH } from "@/lib/constants/api";
import { http, HttpError } from "@/lib/api/http";
import { AuthError, isUserProfile, type UserProfile } from "@/lib/auth";

type AuthPath = Exclude<
  (typeof AUTH_PATHS)[keyof typeof AUTH_PATHS],
  typeof AUTH_PATHS.REFRESH | typeof AUTH_PATHS.ME
>;

function authError(error: unknown, path: AuthPath): AuthError {
  const status = error instanceof HttpError ? error.status : 0;
  const data = error instanceof HttpError ? error.data : undefined;
  const raw = data && typeof data === "object" && "message" in data ? String(data.message) : "";
  if (!status)
    return new AuthError("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.", status);
  if (status >= 500)
    return new AuthError("Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.", status);
  if (status === 429) {
    return new AuthError(
      raw.includes(`${OTP_RESEND_DELAY_MS / 1000} seconds`)
        ? `Vui lòng đợi ${OTP_RESEND_DELAY_MS / 1000} giây trước khi gửi lại mã.`
        : "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
      status
    );
  }
  if (status === 401) {
    return new AuthError(
      path === AUTH_PATHS.STAFF_LOGIN
        ? "Email hoặc mật khẩu không đúng, hoặc tài khoản không hoạt động."
        : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      status
    );
  }
  if (/expired/i.test(raw))
    return new AuthError("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", status);
  if (/OTP/i.test(raw)) return new AuthError("Mã OTP không đúng hoặc đã được sử dụng.", status);
  return new AuthError("Thông tin chưa hợp lệ. Vui lòng kiểm tra và thử lại.", status);
}

async function request<T>(path: AuthPath, body: object = {}): Promise<T> {
  try {
    const { data } = await http.post<T>(AUTH_BASE_PATH + path, body);
    return data;
  } catch (error) {
    throw authError(error, path);
  }
}

let sessionRequest: Promise<UserProfile> | undefined;

function getCurrentUser(): Promise<UserProfile> {
  const verify = async () => {
    const user = await request<unknown>(AUTH_PATHS.SESSION);
    if (!isUserProfile(user)) throw new AuthError("Không thể xác minh thông tin tài khoản.", 503);
    return user;
  };
  // Deduplicate Strict Mode checks and serialize refresh rotation across tabs.
  sessionRequest ??= Promise.resolve(
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(SESSION_LOCK_NAME, verify)
      : verify()
  ).finally(() => {
    sessionRequest = undefined;
  });
  return sessionRequest;
}

export const authService = {
  getCurrentUser,
  loginStaff: (body: { email: string; password: string; rememberMe: boolean }) =>
    request(AUTH_PATHS.STAFF_LOGIN, body),
  requestPatientOtp: (email: string) => request(AUTH_PATHS.REQUEST_OTP, { email }),
  verifyPatientOtp: (body: { email: string; otpCode: string; rememberMe: boolean }) =>
    request(AUTH_PATHS.VERIFY_OTP, body),
  logout: () => request(AUTH_PATHS.LOGOUT),
};
