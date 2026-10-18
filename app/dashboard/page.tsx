import { redirect } from "next/navigation";
import { getDashboardSession } from "@/services/auth-session.server";
import { WORKSPACES, workspaceForRole } from "@/lib/constants/workspaces";
import { ROUTES } from "@/lib/constants/routes";
import {
  SessionError,
  SessionRecovery,
  UnsupportedWorkspace,
} from "@/components/auth/workspace-state";

export default async function DashboardPage() {
  const session = await getDashboardSession();
  if (session.state === "unauthenticated") redirect(ROUTES.LOGIN);
  if (session.state === "refresh-required") return <SessionRecovery />;
  if (session.state === "unavailable") return <SessionError />;
  const workspace = workspaceForRole(session.user.role);
  if (!workspace) return <UnsupportedWorkspace />;
  redirect(WORKSPACES[workspace].path);
}
