import "server-only";
import { AUTH_PATHS, REFRESH_COOKIE } from "@/lib/constants/auth";
import { cookies } from "next/headers";
import { isUserProfile } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/constants/workspaces";
import type { Workspace } from "@/lib/constants/workspaces";
import { authCookieHeader, requestUpstreamAuth } from "@/services/auth-proxy.server";

type WorkspaceAccess =
  "allowed" | "forbidden" | "unauthenticated" | "refresh-required" | "unavailable";

type DashboardSession =
  | { state: "authenticated"; user: UserProfile }
  | { state: "unauthenticated" }
  | { state: "refresh-required" }
  | { state: "unavailable" };

export async function getDashboardSession(): Promise<DashboardSession> {
  const jar = await cookies();
  const cookie = authCookieHeader(jar);
  if (!cookie) return { state: "unauthenticated" };
  try {
    const response = await requestUpstreamAuth(AUTH_PATHS.ME, "GET", cookie);
    if (response.status === 401)
      return { state: jar.has(REFRESH_COOKIE) ? "refresh-required" : "unauthenticated" };
    if (response.status !== 200 || !isUserProfile(response.data)) return { state: "unavailable" };
    return { state: "authenticated", user: response.data };
  } catch {
    return { state: "unavailable" };
  }
}

export async function getWorkspaceAccess(workspace: Workspace): Promise<WorkspaceAccess> {
  const session = await getDashboardSession();
  if (session.state !== "authenticated") return session.state;
  return canAccessWorkspace(session.user.role, workspace) ? "allowed" : "forbidden";
}

export async function getPatientAccess(): Promise<WorkspaceAccess> {
  return getWorkspaceAccess("patient");
}
