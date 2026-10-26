import { ROLE_LABELS } from "@/lib/constants/auth";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: keyof typeof ROLE_LABELS;
  profileComplete: boolean;
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    (user.name === null || typeof user.name === "string") &&
    typeof user.role === "string" &&
    typeof user.profileComplete === "boolean" &&
    Object.hasOwn(ROLE_LABELS, user.role)
  );
}

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
