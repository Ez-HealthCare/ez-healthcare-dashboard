import { notFound, redirect } from "next/navigation";
import { RoleWorkspace } from "@/components/dashboard/role-workspace";
import {
  SessionError,
  SessionRecovery,
  WorkspaceAccessDenied,
} from "@/components/auth/workspace-state";
import { isWorkspace, isWorkspaceSection } from "@/lib/constants/workspaces";
import { ROUTES } from "@/lib/constants/routes";
import { getWorkspaceAccess } from "@/services/auth-session.server";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string; section?: string[] }>;
}) {
  const { workspace, section = [] } = await params;
  if (!isWorkspace(workspace) || workspace === "patient") notFound();
  const tab = section.join("/");
  if (!isWorkspaceSection(workspace, tab)) notFound();
  const access = await getWorkspaceAccess(workspace);
  if (access === "unauthenticated") redirect(ROUTES.LOGIN);
  if (access === "refresh-required") return <SessionRecovery />;
  if (access === "unavailable") return <SessionError />;
  if (access === "forbidden") return <WorkspaceAccessDenied />;
  return <RoleWorkspace workspace={workspace} section={tab} />;
}
