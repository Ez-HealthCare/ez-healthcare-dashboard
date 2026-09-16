export type Role = "ADMIN" | "PHYSICIAN" | "NURSE" | "PATIENT";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  phone?: string | null;
  allergies?: string[] | null;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export const AUTH_KEYS = {
  ACCESS_TOKEN: "ez_access_token",
  REFRESH_TOKEN: "ez_refresh_token",
  USER: "ez_user",
};

export function getStoredAuth(): { token: string | null; user: UserProfile | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const userStr = localStorage.getItem(AUTH_KEYS.USER);
    const user = userStr ? (JSON.parse(userStr) as UserProfile) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function saveAuth(data: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, data.accessToken);
  localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, data.refreshToken);
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_KEYS.USER);
}
